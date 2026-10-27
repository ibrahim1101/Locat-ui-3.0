/**
 * Device-local privacy gate. It keeps the UI covered while the server session
 * remains valid; it does not encrypt browser storage or replace account auth.
 * Biometrics stay disabled until Locat can verify WebAuthn assertions.
 */
const CONFIG_KEY = "locat-app-lock-v1";
const UNLOCKED_KEY = "locat-app-lock-unlocked";
const ACTIVITY_KEY = "locat-app-lock-last-activity";
export const LOCK_SIGNAL_KEY = "locat-app-lock-lock-signal";

export const PBKDF2_ITERATIONS = 310_000;
export const MIN_PASSCODE_LENGTH = 6;
export const MAX_PASSCODE_LENGTH = 128;
export const AUTO_LOCK_OPTIONS = [
  { id: "immediate", label: "Immediately", ms: 0 },
  { id: "30s", label: "After 30 seconds", ms: 30_000 },
  { id: "1m", label: "After 1 minute", ms: 60_000 },
  { id: "5m", label: "After 5 minutes", ms: 300_000 },
  { id: "15m", label: "After 15 minutes", ms: 900_000 },
  { id: "1h", label: "After 1 hour", ms: 3_600_000 },
  { id: "never", label: "Only when I lock manually", ms: Number.POSITIVE_INFINITY },
] as const;
export type AutoLockOptionId = (typeof AUTO_LOCK_OPTIONS)[number]["id"];
export type AppLockConfig = { version: 1; salt: string; hash: string; iterations: number; autoLockOption: AutoLockOptionId; lockOnBackground: boolean; createdAt: number };
export type AppLockStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;
export type AppLockErrorCode = "passcode-too-short" | "passcode-too-long" | "passcode-mismatch" | "passcode-missing" | "storage-unavailable";

export class AppLockError extends Error {
  constructor(message: string, readonly code: AppLockErrorCode) { super(message); }
}

function browserStorage(name: "localStorage" | "sessionStorage"): AppLockStorage | undefined {
  try { return typeof window === "undefined" ? undefined : window[name]; } catch { return undefined; }
}
function encode(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}
function decode(value: string): Uint8Array {
  const binary = atob(value); return Uint8Array.from(binary, char => char.charCodeAt(0));
}
function requireStorage(storage: AppLockStorage | undefined): AppLockStorage {
  if (!storage) throw new AppLockError("Locat cannot save the app lock in this browser's storage.", "storage-unavailable");
  return storage;
}
export function readConfig(storage = browserStorage("localStorage")): AppLockConfig | null {
  try {
    const raw = storage?.getItem(CONFIG_KEY); if (!raw) return null;
    const value = JSON.parse(raw) as AppLockConfig;
    if (value.version !== 1 || typeof value.salt !== "string" || typeof value.hash !== "string" || !Number.isSafeInteger(value.iterations) || value.iterations < 100_000 || !AUTO_LOCK_OPTIONS.some(option => option.id === value.autoLockOption) || typeof value.lockOnBackground !== "boolean") return null;
    return value;
  } catch { return null; }
}
function writeConfig(config: AppLockConfig, storage = browserStorage("localStorage")) { requireStorage(storage).setItem(CONFIG_KEY, JSON.stringify(config)); }
async function derive(passcode: string, salt: Uint8Array, iterations: number): Promise<string> {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) throw new AppLockError("WebCrypto is unavailable. Open Locat over trusted HTTPS to enable app lock.", "storage-unavailable");
  const key = await subtle.importKey("raw", new TextEncoder().encode(passcode), "PBKDF2", false, ["deriveBits"]);
  const bits = await subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: salt as BufferSource, iterations }, key, 256);
  return encode(new Uint8Array(bits));
}
function validate(passcode: string) {
  if ([...passcode].length < MIN_PASSCODE_LENGTH) throw new AppLockError(`Use at least ${MIN_PASSCODE_LENGTH} characters.`, "passcode-too-short");
  if ([...passcode].length > MAX_PASSCODE_LENGTH) throw new AppLockError(`Use no more than ${MAX_PASSCODE_LENGTH} characters.`, "passcode-too-long");
}
export async function setPasscode(passcode: string, policy: { autoLockOption?: AutoLockOptionId; lockOnBackground?: boolean } = {}, storage = browserStorage("localStorage")) {
  validate(passcode); requireStorage(storage);
  if (!globalThis.crypto?.getRandomValues) throw new AppLockError("Secure random generation is unavailable.", "storage-unavailable");
  const previous = readConfig(storage), salt = crypto.getRandomValues(new Uint8Array(16));
  const config: AppLockConfig = { version: 1, salt: encode(salt), hash: await derive(passcode, salt, PBKDF2_ITERATIONS), iterations: PBKDF2_ITERATIONS,
    autoLockOption: policy.autoLockOption ?? previous?.autoLockOption ?? "5m", lockOnBackground: policy.lockOnBackground ?? previous?.lockOnBackground ?? true, createdAt: Date.now() };
  writeConfig(config, storage); return config;
}
export async function verifyPasscode(passcode: string, storage = browserStorage("localStorage")) {
  const config = readConfig(storage); if (!config) throw new AppLockError("App lock is not configured.", "passcode-missing");
  const actual = await derive(passcode, decode(config.salt), config.iterations);
  if (actual.length !== config.hash.length) return false;
  let diff = 0; for (let index = 0; index < actual.length; index++) diff |= actual.charCodeAt(index) ^ config.hash.charCodeAt(index);
  return diff === 0;
}
export async function changePasscode(current: string, next: string, storage = browserStorage("localStorage")) {
  if (!readConfig(storage)) throw new AppLockError("App lock is not configured.", "passcode-missing");
  if (!(await verifyPasscode(current, storage))) throw new AppLockError("Current passcode is incorrect.", "passcode-mismatch");
  const previous = readConfig(storage)!;
  return setPasscode(next, { autoLockOption: previous.autoLockOption, lockOnBackground: previous.lockOnBackground }, storage);
}
export async function removeLock(passcode: string, storage = browserStorage("localStorage"), session = browserStorage("sessionStorage")) {
  if (!readConfig(storage)) return;
  if (!(await verifyPasscode(passcode, storage))) throw new AppLockError("Current passcode is incorrect.", "passcode-mismatch");
  requireStorage(storage).removeItem(CONFIG_KEY);
  try { session?.removeItem(UNLOCKED_KEY); session?.removeItem(ACTIVITY_KEY); } catch { /* local removal still succeeds if session storage is blocked */ }
}
export function updatePolicy(patch: Partial<Pick<AppLockConfig, "autoLockOption" | "lockOnBackground">>, storage = browserStorage("localStorage")) {
  const config = readConfig(storage); if (!config) return null;
  const next = { ...config, ...patch }; writeConfig(next, storage); return next;
}
export function markUnlocked(session = browserStorage("sessionStorage")) { try { session?.setItem(UNLOCKED_KEY, "1"); session?.setItem(ACTIVITY_KEY, String(Date.now())); } catch { /* gate keeps its in-memory unlock state for this view */ } }
export function markLocked(session = browserStorage("sessionStorage"), signal: AppLockStorage | null | undefined = browserStorage("localStorage")) {
  try { session?.removeItem(UNLOCKED_KEY); session?.removeItem(ACTIVITY_KEY); } catch { /* gate remains locked in memory */ }
  try { if (signal) signal.setItem(LOCK_SIGNAL_KEY, `${Date.now()}:${Math.random()}`); } catch { /* a blocked storage event cannot prevent the local lock */ }
}
export function recordActivity(session = browserStorage("sessionStorage")) { try { if (session?.getItem(UNLOCKED_KEY) === "1") session.setItem(ACTIVITY_KEY, String(Date.now())); } catch { /* next mount requires an unlock */ } }
export function currentState(storage = browserStorage("localStorage"), session = browserStorage("sessionStorage")) {
  const config = readConfig(storage);
  let unlocked = !config;
  try { unlocked ||= session?.getItem(UNLOCKED_KEY) === "1"; } catch { unlocked = false; }
  return { configured: !!config, unlocked, config };
}
export function shouldAutoLock(now: number, storage = browserStorage("localStorage"), session = browserStorage("sessionStorage")) {
  const state = currentState(storage, session); if (!state.configured || !state.unlocked || !state.config) return false;
  const option = AUTO_LOCK_OPTIONS.find(item => item.id === state.config!.autoLockOption)!; if (!Number.isFinite(option.ms)) return false;
  let raw: string | null; try { raw = session?.getItem(ACTIVITY_KEY) ?? null; } catch { return true; }
  const last = Number(raw); return !raw || !Number.isFinite(last) || now - last >= option.ms;
}
