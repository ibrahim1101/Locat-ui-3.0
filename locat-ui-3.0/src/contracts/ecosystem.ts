import type { Id, OperationResult, Timestamp } from "./common";

/* ── Link / Devices (M2) ─────────────────────────────────────────── */
export type DeviceView = {
  id: Id; alias: string; platform: "android" | "windows" | "linux" | "macos" | "web"; current: boolean;
  state: "paired" | "pending-approval" | "needs-reproof" | "revoked"; online: boolean; lastSeenAt?: Timestamp;
  /** Short authentication string shown for human pairing comparison (Locat pairingSas). */
  sas?: string;
};
export type TransferView = {
  id: Id; kind: "file" | "clipboard" | "text" | "url"; name: string; sizeBytes?: number; direction: "sent" | "received";
  peer: string; progress: number; state: "queued" | "transferring" | "complete" | "failed" | "cancelled"; at: Timestamp; error?: string;
};
export interface LinkAdapter {
  requestPairing(): Promise<OperationResult>;
  approvePairing(deviceId: Id, approve: boolean): Promise<OperationResult>;
  renameDevice(deviceId: Id, alias: string): Promise<OperationResult>;
  revokeDevice(deviceId: Id): Promise<OperationResult>;
  sendFile(deviceId: Id, file: File): Promise<OperationResult>;
  /** Requires explicit user consent each time; the UI never reads clipboard silently. */
  sendClipboard(deviceId: Id, text: string, kind: "clipboard" | "text" | "url"): Promise<OperationResult>;
}

/* ── Remote ──────────────────────────────────────────────────────── */
export type RemoteHostView = { id: Id; name: string; os: "windows" | "linux" | "macos"; approved: boolean; inputSupported: boolean; reachable: boolean };
export type RemoteSessionView = {
  state: "idle" | "awaiting-consent" | "connecting" | "streaming" | "reconnecting" | "failed" | "ended";
  inputEnabled: boolean; stats?: { fps: number; bitrateKbps: number; rttMs: number; packetLossPct: number; codec: string; resolution: string };
};
export interface RemoteAdapter { connect(hostId: Id): Promise<OperationResult>; disconnect(): Promise<OperationResult>; setInput(enabled: boolean): Promise<OperationResult> }

/* ── Sentinel (M1) ───────────────────────────────────────────────── */
export type Severity = "critical" | "high" | "medium" | "low" | "info";
export type AlertView = { id: Id; title: string; source: string; severity: Severity; state: "open" | "acknowledged" | "resolved"; at: Timestamp; summary: string; fields: Record<string, string> };
export type SentinelTokenView = { id: Id; label: string; scope: string; createdAt: Timestamp; lastUsedAt?: Timestamp; revoked: boolean; prefix: string };
export type SentinelSourceView = { id: Id; name: string; kind: "nScout" | "PipelineGuard" | "generic-webhook"; health: "receiving" | "silent" | "never-connected" | "error"; lastEventAt?: Timestamp };
export interface SentinelAdapter {
  setAlertState(id: Id, state: "acknowledged" | "resolved"): Promise<OperationResult>;
  createToken(label: string, scope: string): Promise<OperationResult<{ secretShownOnce: string }>>;
  revokeToken(id: Id): Promise<OperationResult>;
}

/* ── Vault (M3) & Secrets (M6): shared privateStore ──────────────── */
export type PrivateStoreKind = "vault" | "secrets";
export type PrivateStoreState = { kind: PrivateStoreKind; lock: "uninitialized" | "locked" | "unlocking" | "unlocked" | "wrong-passphrase" | "integrity-error"; autoLockMin: number };
export type VaultEntryView = { id: Id; name: string; folder: string; sizeBytes: number; mime: string; updatedAt: Timestamp };
export type SecretEntryView = { id: Id; kind: "credential" | "note"; title: string; folder: string; username?: string; url?: string; updatedAt: Timestamp };
export type QuotaView = { usedBytes: number; quotaBytes: number; entries: number; maxEntries: number; maxFileBytes: number };
export interface PrivateStoreAdapter {
  /** PBKDF2/AES-GCM unlock owned by Locat privateStoreCrypto. Passphrase never stored by UI. */
  unlock(kind: PrivateStoreKind, passphrase: string): Promise<OperationResult>;
  lock(kind: PrivateStoreKind): void;
  reveal(entryId: Id, field: "password" | "note"): Promise<OperationResult<string>>;
  copyField(entryId: Id, field: "username" | "password"): Promise<OperationResult>;
  upload(file: File, folder: string): Promise<OperationResult>;
  download(entryId: Id): Promise<OperationResult>;
  remove(entryId: Id): Promise<OperationResult>;
  exportBackup(kind: PrivateStoreKind): Promise<OperationResult>;
}

/* ── Hub / Admin (M5) ────────────────────────────────────────────── */
export type MetricView = { label: string; value: string | null; caveat?: string; source: "admin-stats" | "os-container" | "unavailable" };
export type ServiceView = { name: string; state: "up" | "degraded" | "down" | "unknown" };
export type AdminUserView = { id: Id; username: string; lcCode: string; role: "admin" | "user"; disabled: boolean; sessions: number; createdAt: Timestamp };
export interface AdminAdapter {
  /** Existing api/adminRouter.ts: disable + revoke sessions. Requires password re-auth. */
  setUserDisabled(userId: Id, disabled: boolean, reauthPassword: string): Promise<OperationResult>;
  revokeSessions(userId: Id, reauthPassword: string): Promise<OperationResult>;
  createUser(): Promise<OperationResult>; // Locat #29 partial: not implemented in API
}

/* ── Search (M4) ─────────────────────────────────────────────────── */
export type SearchScope = "messages" | "attachments" | "contacts" | "modules" | "media" | "settings";
export type SearchResultView = { id: Id; scope: SearchScope; title: string; subtitle: string; route: string };
