import type { AppLockAdapter, AuthAdapter } from "./auth";
import type { Availability } from "./common";
import type { AdminAdapter, LinkAdapter, PrivateStoreAdapter, RemoteAdapter, SentinelAdapter } from "./ecosystem";
import type { MediaAdapter } from "./media";
import type { MessagingAdapter } from "./messaging";
import type { ConnectionState, PlatformInfo } from "./platform";
import type { ModuleId } from "../app/registry";

/** Context the integration supplies so availability is computed, not hardcoded. */
export type AvailabilityContext = { connection: ConnectionState; isAdmin: boolean; authenticated: boolean; platform: PlatformInfo };

/**
 * The single seam between Locat UI 3.0 and the existing Locat application.
 * `src/fixtures/previewAdapter.ts` implements it for standalone preview;
 * production supplies a `LiveLocatAdapter` wrapping useAuth/Chat/tRPC/libs
 * (see docs/LOCAT_INTEGRATION_HANDOFF.md).
 */
export interface LocatUiAdapter {
  readonly mode: "preview" | "live";
  auth: AuthAdapter;
  appLock: AppLockAdapter;
  messaging: MessagingAdapter;
  media: MediaAdapter;
  link: LinkAdapter;
  remote: RemoteAdapter;
  sentinel: SentinelAdapter;
  privateStore: PrivateStoreAdapter;
  admin: AdminAdapter;
  /** Production truth for module availability (port of Locat moduleDisabledReason). */
  moduleAvailability(id: ModuleId, ctx: AvailabilityContext): { availability: Availability; reason?: string };
}
