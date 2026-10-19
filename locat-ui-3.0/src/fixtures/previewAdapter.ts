/**
 * PREVIEW ADAPTER — implements LocatUiAdapter without any network, crypto or storage.
 * Every server/crypto operation returns `integration-pending`. It must never be
 * mounted in a production Locat build (see docs/LOCAT_INTEGRATION_HANDOFF.md §Stop conditions).
 */
import { pending, type LocatUiAdapter, type PasswordGuidance, type ServerProbeView } from "@/contracts";
import type { ModuleId } from "@/app/registry";
import { moduleById } from "@/app/registry";
import { FIXTURE_ACCOUNTS } from "./data";

const P = (what: string) => Promise.resolve(pending(`${what} is owned by the existing Locat implementation and is not connected in this UI preview.`));
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Presentation-only mirror of contracts/password.ts (15 Unicode chars). Production must call the real function. */
function passwordGuidance(password: string, username: string): PasswordGuidance {
  const chars = [...password].length;
  let message: string | null = null;
  if (chars < 15) message = `Use at least 15 characters (${chars}/15). A short sentence works well.`;
  else if (username && password.toLowerCase().includes(username.toLowerCase())) message = "Don't include your username.";
  const variety = [/[a-z]/, /[A-Z]/, /\d/, /[^\w\s]/, /\s/].filter((r) => r.test(password)).length;
  const strength = (chars === 0 ? 0 : Math.min(4, Math.floor(chars / 8) + (variety >= 3 ? 1 : 0))) as PasswordGuidance["strength"];
  return { minCharacters: 15, ok: message === null, message, strength };
}

async function probeServer(origin: string): Promise<ServerProbeView> {
  await wait(700);
  if (!/^https:\/\//i.test(origin)) return { state: "insecure-rejected", origin };
  return { state: "unreachable", origin, detail: "Preview build: no network probe is performed. The Locat native server setup performs the real strict-HTTPS check." };
}

function moduleAvailability(id: ModuleId, ctx: Parameters<LocatUiAdapter["moduleAvailability"]>[1]) {
  const m = moduleById(id);
  if (m.implementation === "planned") return { availability: "planned" as const, reason: "Planned — preview design only" };
  if (m.implementation === "scaffolded") return { availability: "planned" as const, reason: "Registry scaffold only — runtime not implemented" };
  if (m.adminOnly && !ctx.isAdmin) return { availability: "admin-only" as const, reason: "Administrator access required" };
  if (!m.localCapable && (ctx.connection.mode === "local-only" || ctx.connection.server !== "connected"))
    return { availability: "offline" as const, reason: ctx.connection.mode === "local-only" ? "Requires a Locat server account" : "Connect to your server" };
  if (m.implementation === "experimental") return { availability: "beta" as const };
  return { availability: "available" as const };
}

export const previewAdapter: LocatUiAdapter = {
  mode: "preview",
  auth: {
    signIn: () => wait(600).then(() => P("Sign-in and identity-key unlock")),
    register: () => wait(600).then(() => P("Registration and key generation")),
    probeServer, passwordGuidance,
    enterLocalMode: () => Promise.resolve({ status: "ok", value: undefined }),
    switchAccount: () => P("Account switching"),
    signOut: () => P("Sign-out and session revocation"),
    savedAccounts: () => FIXTURE_ACCOUNTS,
  },
  appLock: { unlock: () => P("App lock verification"), setPasscode: () => P("App lock passcode setup"), removeLock: () => P("App lock removal") },
  messaging: {
    send: () => P("Encrypted sending"), attachFiles: () => P("Encrypted attachment upload"), schedule: () => P("Scheduled encrypted relay"), cancelScheduled: () => P("Scheduled message cancellation"),
    messageAction: (_id, action) => P(`Message action "${action}"`), saveDraft: () => undefined,
    friendAction: (_id, action) => P(`Contact action "${action}"`), findByUsernameOrCode: () => P("Contact lookup"),
    conversationAction: (_id, action) => P(`Conversation action "${action}"`), createGroup: () => P("Group creation and key distribution"),
    shareLocation: () => P("Encrypted location sharing"),
  },
  link: {
    requestPairing: () => P("Device pairing"), approvePairing: () => P("Pairing approval"), renameDevice: () => P("Device rename"),
    revokeDevice: () => P("Device revocation"), sendFile: () => P("Encrypted chunked transfer"), sendClipboard: () => P("Encrypted clipboard transfer"),
  },
  privateStore: {
    unlock: () => wait(500).then(() => P("Private store unlock (PBKDF2/AES-GCM)")), lock: () => undefined,
    reveal: () => P("Secret reveal"), copyField: () => P("Clipboard copy"), upload: () => P("Encrypted upload"),
    download: () => P("Encrypted download"), remove: () => P("Entry deletion"), exportBackup: () => P("Encrypted backup export"),
  },
  admin: { setUserDisabled: () => P("Account disable"), revokeSessions: () => P("Session revocation"), createUser: () => P("Admin user creation (#29 not in API)") },
  moduleAvailability,
};
