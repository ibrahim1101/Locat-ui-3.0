import {
  Activity, Bot, CalendarDays, Cpu, Fingerprint, Home, LayoutGrid, MessageCircle,
  Puzzle, Search, Palette, Server, Settings, Share2, Smartphone, UserRound, Users, Vault, WifiOff,
  type LucideIcon,
} from "lucide-react";
import type { ImplementationStatus } from "@/contracts/common";

export type ModuleId =
  | "home" | "messages" | "devices" | "files"
  | "search" | "hub" | "admin" | "diagnostics" | "workspace" | "calendar" | "automate" | "share" | "extensions"
  | "offline" | "settings" | "profile" | "modules" | "gallery";

export type ModuleCategory = "core" | "connect" | "protect" | "organize" | "system";

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
  core: "Locat", connect: "Link & sharing", protect: "Files & privacy", organize: "Productivity", system: "App & server",
};

export const MODULES: ModuleDef[] = [
  { id: "home", name: "Home", tagline: "Your Locat at a glance", icon: Home, route: "/home", category: "core", milestone: "M4", implementation: "partial", locatSource: ["src/pages/Dashboard.tsx"], localCapable: true, keywords: "dashboard launcher" },
  { id: "messages", name: "Chat", tagline: "Private conversations and groups", icon: MessageCircle, route: "/messages", category: "core", milestone: "M0", implementation: "implemented-unverified", locatSource: ["src/pages/Chat.tsx", "src/components/chat/ChatWindow.tsx", "src/lib/crypto.ts", "src/lib/localdb.ts"], keywords: "chat dm group friends contacts" },
  { id: "search", name: "Search", tagline: "Scoped local search", icon: Search, route: "/search", category: "core", milestone: "M4", implementation: "partial", locatSource: ["src/pages/Search.tsx", "src/lib/globalSearch.ts"], localCapable: true },
  { id: "devices", name: "Link", tagline: "Pair trusted devices and transfer files", icon: Smartphone, route: "/devices", category: "connect", milestone: "M2", implementation: "implemented-unverified", locatSource: ["src/pages/Link.tsx", "src/lib/link.ts", "api/linkRouter.ts"], keywords: "link pairing transfer clipboard" },
  { id: "share", name: "Share", tagline: "Expiring encrypted links", icon: Share2, route: "/share", category: "connect", milestone: "M8", implementation: "partial", locatSource: ["src/integration/LiveShare.tsx", "src/integration/shareCrypto.ts", "server/share.mjs", "server/database.mjs"] },
  { id: "offline", name: "Offline & LAN", tagline: "Connection modes and sync", icon: WifiOff, route: "/offline", category: "connect", milestone: "M11", implementation: "partial", locatSource: ["src/components/NativeOfflineHome.tsx", "src/state/connection.tsx", "docs/LAN_AND_TAILSCALE.md"], localCapable: true },
  { id: "files", name: "Files & Vault", tagline: "Private files, credentials and secure notes", icon: Vault, route: "/files", category: "protect", milestone: "M3 · M6", implementation: "experimental", locatSource: ["src/pages/PrivateStore.tsx", "src/lib/privateStoreCrypto.ts", "api/privateStoreRouter.ts"], keywords: "files vault documents secrets credentials" },
  { id: "calendar", name: "Calendar", tagline: "Events and reminders", icon: CalendarDays, route: "/calendar", category: "organize", milestone: "M7", implementation: "partial", locatSource: ["src/integration/LiveCalendar.tsx", "server/calendar.mjs", "server/database.mjs"] },
  { id: "automate", name: "Automate", tagline: "Scheduled reminders", icon: Bot, route: "/automate", category: "organize", milestone: "M7", implementation: "partial", locatSource: ["src/integration/LiveAutomate.tsx", "src/integration/LiveAutomationMonitor.tsx", "server/automate.mjs", "server/database.mjs"] },
  { id: "workspace", name: "Workspace", tagline: "Teams, boards and notes", icon: Users, route: "/workspace", category: "organize", milestone: "M9", implementation: "partial", locatSource: ["src/integration/LiveWorkspace.tsx", "server/workspace.mjs", "server/database.mjs"] },
  { id: "extensions", name: "Extensions", tagline: "Permission-scoped add-ons", icon: Puzzle, route: "/extensions", category: "system", milestone: "M10", implementation: "scaffolded", locatSource: ["src/modules/registry.tsx"] },
  { id: "diagnostics", name: "Diagnostics", tagline: "Connection and app health", icon: Activity, route: "/diagnostics", category: "system", milestone: "M5", implementation: "partial", locatSource: ["src/pages/Performance.tsx"], localCapable: true, keywords: "performance health" },
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
