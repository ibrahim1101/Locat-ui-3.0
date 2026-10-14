import type { PermissionState } from "./common";

/** Mirrors existing `src/lib/platform/index.ts` PlatformKind in Locat. */
export type PlatformKind = "browser" | "web-installed" | "capacitor-android" | "tauri-desktop";
export type DesktopOS = "windows" | "linux" | "macos";

export type PlatformInfo = {
  kind: PlatformKind;
  os?: DesktopOS | "android" | "unknown";
  capabilities: {
    nativeSaveDialog: boolean;
    notifications: boolean;
    pictureInPicture: boolean;
    biometric: false; // intentionally false until signed verification exists (Locat #22)
    shareTarget: false; // Locat #49 planned
    widgets: false; // Locat #37 planned
    mediaStore: boolean; // Android MediaStore device library
    backgroundAudio: false; // native audio focus/background not integrated
  };
};

export type PermissionKind = "camera" | "microphone" | "photos" | "videos" | "audio" | "location" | "notifications" | "clipboard";
export type PermissionMap = Partial<Record<PermissionKind, PermissionState>>;

/**
 * Android Back contract (docs/LOCAT_PLATFORM_BEHAVIOR.md).
 * The native wrapper calls `handleBack()`; it returns what was consumed.
 * Order: keyboard → topmost overlay → detail view → router history → root confirm-exit.
 */
export type BackOutcome = "keyboard" | "overlay" | "navigated" | "exit-armed" | "exit";
export interface BackController {
  handleBack(): BackOutcome;
}

export type ConnectionMode = "server" | "local-only";
export type ConnectionState = {
  mode: ConnectionMode;
  server: "connected" | "connecting" | "disconnected" | "tls-error" | "unreachable" | "not-configured";
  origin?: string; // canonical HTTPS origin (display only)
  route?: "same-lan" | "tailscale" | "internet" | "unknown";
  pendingOutbox: number; // durable encrypted outbox count — NOT LAN messaging
  lastSyncAt?: number;
};
