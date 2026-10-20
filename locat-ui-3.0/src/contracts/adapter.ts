import type { AppLockAdapter, AuthAdapter } from "./auth";
import type { Availability } from "./common";
import type { AdminAdapter, LinkAdapter, PrivateStoreAdapter } from "./ecosystem";
import type { MessagingAdapter } from "./messaging";
import type { ConnectionState, PlatformInfo } from "./platform";
import type { ModuleId } from "../app/registry";

/** Context the integration supplies so availability is computed, not hardcoded. */
export type AvailabilityContext = { connection: ConnectionState; isAdmin: boolean; authenticated: boolean; platform: PlatformInfo };

/**
 * Shared contract used by the standalone preview and the live app composition.
 * `src/fixtures/previewAdapter.ts` supplies preview-only behavior; the live
 * root composes authenticated server, Matrix, Link and private-store APIs
 * (see docs/LOCAT_INTEGRATION_HANDOFF.md).
 */
export interface LocatUiAdapter {
  readonly mode: "preview" | "live";
  auth: AuthAdapter;
  appLock: AppLockAdapter;
  messaging: MessagingAdapter;
  link: LinkAdapter;
  privateStore: PrivateStoreAdapter;
  admin: AdminAdapter;
  /** Production truth for module availability (port of Locat moduleDisabledReason). */
  moduleAvailability(id: ModuleId, ctx: AvailabilityContext): { availability: Availability; reason?: string };
}
