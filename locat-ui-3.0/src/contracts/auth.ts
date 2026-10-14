import type { OperationResult } from "./common";

/** Display-only projection of Locat `SessionUser` (src/state/auth.tsx). */
export type SessionUserView = {
  id: string;
  username: string;
  displayName: string;
  lcCode: string; // "LC-1234" formatted by contracts/userCode.ts in Locat
  avatarUrl?: string;
  isAdmin: boolean;
  serverOrigin: string;
};

export type SavedAccountView = { id: string; username: string; displayName: string; serverOrigin: string; avatarUrl?: string; lastUsedAt: number };

export type ServerProbeView =
  | { state: "idle" }
  | { state: "checking"; origin: string }
  | { state: "trusted"; origin: string; version?: string; route: "same-lan" | "tailscale" | "internet" | "unknown" }
  | { state: "tls-error"; origin: string; detail: string }
  | { state: "insecure-rejected"; origin: string }
  | { state: "unreachable"; origin: string; detail: string };

export type PasswordGuidance = { minCharacters: number; ok: boolean; message: string | null; strength: 0 | 1 | 2 | 3 | 4 };

export interface AuthAdapter {
  /** Delegates to Locat `useAuth().login` which also unlocks the identity key. */
  signIn(input: { username: string; password: string; serverOrigin: string }): Promise<OperationResult>;
  /** Delegates to Locat registration + key generation/wrapping. */
  register(input: { username: string; displayName: string; password: string; serverOrigin: string }): Promise<OperationResult>;
  /** Strict HTTPS probe performed by NativeServerSetup in Locat. */
  probeServer(origin: string): Promise<ServerProbeView>;
  /** Uses contracts/password.ts registrationPasswordError (15 Unicode chars). */
  passwordGuidance(password: string, username: string): PasswordGuidance;
  enterLocalMode(): Promise<OperationResult>;
  switchAccount(accountId: string): Promise<OperationResult>;
  signOut(): Promise<OperationResult>;
  savedAccounts(): SavedAccountView[];
}

export type AppLockView = { configured: boolean; locked: boolean; autoLock: "immediate" | "1m" | "5m" | "15m" | "1h" | "never"; biometric: "disabled-pending-verification" };
export interface AppLockAdapter {
  /** Locat src/lib/appLock.ts verifyPasscode — UI barrier only, not storage encryption. */
  unlock(passcode: string): Promise<OperationResult>;
  setPasscode(passcode: string): Promise<OperationResult>;
  removeLock(passcode: string): Promise<OperationResult>;
}
