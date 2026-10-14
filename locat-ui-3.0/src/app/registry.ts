import {
  Activity, Bot, CalendarDays, Clapperboard, Cpu, Fingerprint, Home, KeyRound, LayoutGrid, MessageCircle, Monitor,
  Music2, Puzzle, Search, Palette, Server, Settings, Share2, ShieldAlert, Smartphone, UserRound, Users, Vault, WifiOff, Image,
  type LucideIcon,
} from "lucide-react";
import type { ImplementationStatus } from "@/contracts/common";

export type ModuleId =
  | "home" | "messages" | "cinema" | "music" | "photos" | "devices" | "remote" | "sentinel" | "vault" | "secrets"
  | "search" | "hub" | "admin" | "diagnostics" | "workspace" | "calendar" | "automate" | "share" | "extensions"
  | "offline" | "settings" | "profile" | "modules" | "gallery";

export type ModuleCategory = "core" | "media" | "connect" | "protect" | "organize" | "system";

export type ModuleDef = {
  id: ModuleId;
  name: string;
  tagline: string;
  icon: LucideIcon;
  route: string;
  category: ModuleCategory;
  /** Locat roadmap milestone (docs/LOCAT_COMPLETE_FEATURE_MATRIX.md). */
  milestone: string;
  /** Audit classification of the existing implementation, NOT runtime availability. */
  implementation: ImplementationStatus;
  /** Existing Locat source that owns the real behavior. */
  locatSource: string[];
  adminOnly?: boolean;
  /** Works without a server connection (port of Locat moduleDisabledReason allow-list). */
  localCapable?: boolean;
  keywords?: string;
};

export const CATEGORY_LABEL: Record<ModuleCategory, string> = {
  core: "Locat", media: "Media", connect: "Connect", protect: "Protect", organize: "Organize", system: "System",
};

export const MODULES: ModuleDef[] = [
  { id: "home", name: "Home", tagline: "Your Locat at a glance", icon: Home, route: "/home", category: "core", milestone: "M4", implementation: "partial", locatSource: ["src/pages/Dashboard.tsx"], localCapable: true, keywords: "dashboard launcher" },
  { id: "messages", name: "Messages", tagline: "End-to-end encrypted chat", icon: MessageCircle, route: "/messages", category: "core", milestone: "M0", implementation: "implemented-unverified", locatSource: ["src/pages/Chat.tsx", "src/components/chat/ChatWindow.tsx", "src/lib/crypto.ts", "src/lib/localdb.ts"], keywords: "chat dm group friends contacts" },
  { id: "search", name: "Search", tagline: "Scoped local search", icon: Search, route: "/search", category: "core", milestone: "M4", implementation: "partial", locatSource: ["src/pages/Search.tsx", "src/lib/globalSearch.ts"], localCapable: true },
  { id: "cinema", name: "Cinema", tagline: "Your screening room", icon: Clapperboard, route: "/cinema", category: "media", milestone: "Media Hub", implementation: "partial", locatSource: ["src/pages/MediaLocal.tsx", "src/components/media/LocalCinemaPlayer.tsx", "src/components/media/CinemaHlsPlayer.tsx", "api/media*.ts"], localCapable: true, keywords: "video movies player" },
  { id: "music", name: "Music", tagline: "Library, queue and EQ", icon: Music2, route: "/music", category: "media", milestone: "Media Hub", implementation: "partial", locatSource: ["src/pages/MediaLocal.tsx", "src/components/media/MusicEqualizer.tsx", "src/lib/musicEq.ts", "src/lib/musicQueue.ts"], localCapable: true, keywords: "audio songs equalizer" },
  { id: "photos", name: "Photos", tagline: "Viewer and editor", icon: Image, route: "/photos", category: "media", milestone: "Media Hub", implementation: "partial", locatSource: ["src/pages/Photos.tsx", "src/components/media/LocalPhotoEditor.tsx", "src/lib/photoEditing.ts"], localCapable: true, keywords: "pictures gallery edit" },
  { id: "devices", name: "Devices", tagline: "Pair and transfer with Link", icon: Smartphone, route: "/devices", category: "connect", milestone: "M2", implementation: "implemented-unverified", locatSource: ["src/pages/Link.tsx", "src/lib/link.ts", "api/linkRouter.ts"], keywords: "link pairing transfer clipboard" },
  { id: "remote", name: "Remote", tagline: "Desktop viewing, Remote Play", icon: Monitor, route: "/remote", category: "connect", milestone: "Remote", implementation: "experimental", locatSource: ["src/pages/Remote.tsx", "remote/"], localCapable: true },
  { id: "share", name: "Share", tagline: "Expiring encrypted links", icon: Share2, route: "/share", category: "connect", milestone: "M8", implementation: "planned", locatSource: [] },
  { id: "offline", name: "Offline & LAN", tagline: "Connection modes and sync", icon: WifiOff, route: "/offline", category: "connect", milestone: "M11", implementation: "partial", locatSource: ["src/components/NativeOfflineHome.tsx", "src/state/connection.tsx", "docs/LAN_AND_TAILSCALE.md"], localCapable: true },
  { id: "sentinel", name: "Sentinel", tagline: "Security alerts and webhooks", icon: ShieldAlert, route: "/sentinel", category: "protect", milestone: "M1", implementation: "implemented-unverified", locatSource: ["src/pages/Sentinel.tsx", "api/sentinelRouter.ts", "api/sentinel/"] },
  { id: "vault", name: "Vault", tagline: "Client-encrypted files", icon: Vault, route: "/vault", category: "protect", milestone: "M3", implementation: "experimental", locatSource: ["src/pages/PrivateStore.tsx", "src/lib/privateStoreCrypto.ts", "api/privateStoreRouter.ts"] },
  { id: "secrets", name: "Secrets", tagline: "Credentials and secure notes", icon: KeyRound, route: "/secrets", category: "protect", milestone: "M6", implementation: "experimental", locatSource: ["src/pages/PrivateStore.tsx", "src/lib/privateStoreCrypto.ts"] },
  { id: "calendar", name: "Calendar", tagline: "Events and reminders", icon: CalendarDays, route: "/calendar", category: "organize", milestone: "M7", implementation: "planned", locatSource: [] },
  { id: "automate", name: "Automate", tagline: "Rules and workflows", icon: Bot, route: "/automate", category: "organize", milestone: "M7", implementation: "planned", locatSource: [] },
  { id: "workspace", name: "Workspace", tagline: "Teams, boards and notes", icon: Users, route: "/workspace", category: "organize", milestone: "M9", implementation: "planned", locatSource: [] },
  { id: "extensions", name: "Extensions", tagline: "Permission-scoped add-ons", icon: Puzzle, route: "/extensions", category: "system", milestone: "M10", implementation: "scaffolded", locatSource: ["src/modules/registry.tsx"] },
  { id: "diagnostics", name: "Diagnostics", tagline: "Runtime and playback checks", icon: Activity, route: "/diagnostics", category: "system", milestone: "Media Hub", implementation: "partial", locatSource: ["src/pages/Performance.tsx"], localCapable: true, keywords: "performance" },
  { id: "hub", name: "Hub", tagline: "Server health", icon: Cpu, route: "/hub", category: "system", milestone: "M5", implementation: "experimental", locatSource: ["src/pages/Hub.tsx", "api/adminRouter.ts"], adminOnly: true },
  { id: "admin", name: "Administration", tagline: "Users and server controls", icon: Server, route: "/admin", category: "system", milestone: "M0", implementation: "partial", locatSource: ["src/pages/Admin.tsx", "api/adminRouter.ts"], adminOnly: true },
  { id: "settings", name: "Settings", tagline: "Account, privacy, appearance", icon: Settings, route: "/settings", category: "system", milestone: "M0", implementation: "partial", locatSource: ["src/components/chat/Preferences.tsx", "src/components/chat/PrivacyCommandCenter.tsx", "src/components/chat/SecurityDialog.tsx"], localCapable: true },
  { id: "profile", name: "Profile", tagline: "Picture, bio and LC code", icon: UserRound, route: "/profile", category: "system", milestone: "M0", implementation: "implemented-unverified", locatSource: ["src/components/chat/ProfileDialog.tsx"] },
  { id: "gallery", name: "Gallery", tagline: "Design-system components and states", icon: Palette, route: "/gallery", category: "system", milestone: "UI 3.0", implementation: "implemented", locatSource: [], localCapable: true, keywords: "components design system storybook" },
  { id: "modules", name: "All modules", tagline: "Everything in Locat", icon: LayoutGrid, route: "/modules", category: "system", milestone: "—", implementation: "partial", locatSource: ["src/modules/registry.tsx"], localCapable: true },
];

/** Locat M12/M13 identities are historically unresolved; they are intentionally NOT invented here. */
export const UNRESOLVED_MILESTONES = ["M12", "M13"] as const;

export const SECURITY_ICON = Fingerprint;
export const moduleById = (id: ModuleId) => MODULES.find((m) => m.id === id)!;
export const moduleForPath = (path: string) =>
  MODULES.filter((m) => path === m.route || path.startsWith(m.route + "/")).sort((a, b) => b.route.length - a.route.length)[0];
