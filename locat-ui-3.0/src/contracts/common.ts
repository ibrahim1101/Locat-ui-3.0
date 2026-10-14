/**
 * Shared UI integration primitives. These types are the ONLY way screens learn
 * about the outside world. Screens never call tRPC, crypto, storage or native APIs.
 */

/** Result of any callback that would touch real Locat business logic. */
export type OperationResult<T = void> =
  | { status: "ok"; value: T }
  /** Standalone preview: no implementation is connected. UI must say so, never fake success. */
  | { status: "integration-pending"; reason: string }
  | { status: "error"; code: string; message: string; retryable?: boolean }
  | { status: "denied"; reason: string }
  | { status: "unsupported"; reason: string };

export const pending = (reason: string): OperationResult<never> => ({ status: "integration-pending", reason });

/** Availability states rendered by every module/control (brief §11). */
export type Availability =
  | "available"
  | "beta"
  | "experimental"
  | "planned"
  | "offline"
  | "locked"
  | "permission-restricted"
  | "admin-only"
  | "unsupported";

/** Evidence classification from the source audit (brief §2). */
export type ImplementationStatus =
  | "implemented"
  | "implemented-unverified"
  | "partial"
  | "experimental"
  | "scaffolded"
  | "planned"
  | "unresolved";

/** A control capability: enabled, or disabled with a human, accessible reason. */
export type Capability = { enabled: true } | { enabled: false; reason: string; state?: Availability };
export const can = (): Capability => ({ enabled: true });
export const cannot = (reason: string, state?: Availability): Capability => ({ enabled: false, reason, state });

export type PermissionState = "granted" | "limited" | "denied" | "blocked" | "prompt" | "unsupported";

export type LoadState<T> =
  | { kind: "loading" }
  | { kind: "ready"; data: T }
  | { kind: "empty" }
  | { kind: "error"; message: string; retry?: () => void }
  | { kind: "offline" }
  | { kind: "permission"; permission: PermissionState; request?: () => void }
  | { kind: "unauthorized"; reason: string };

export type Id = string;
export type Timestamp = number; // epoch ms
