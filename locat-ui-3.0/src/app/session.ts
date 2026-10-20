import { createContext, useContext, useEffect, useRef, useState } from "react";
import type { Availability, ConnectionState, LocatUiAdapter, PlatformInfo, SessionUserView } from "@/contracts";
import type { ModuleId } from "./registry";
import type { ThemeId } from "@/theme/tokens";

export type EntryStage = "welcome" | "login" | "register" | "server" | "local-intro" | "locked" | "app";

export type Preferences = {
  theme: ThemeId; textScale: "default" | "large" | "xl"; motion: "system" | "reduced";
  startup: "messages" | "home"; density: "comfortable" | "compact";
  sendReadReceipts: boolean;
  typingIndicators: boolean;
  /** Preview only: swap in generated stress fixtures (5k messages, 10k songs, 20k photos, 2k videos). */
  largeLibraries: boolean;
};

export type SessionValue = {
  adapter: LocatUiAdapter;
  stage: EntryStage; setStage(s: EntryStage): void;
  /** In preview this is the fixture identity; it is labelled and never a real sign-in. */
  user: SessionUserView | null; setUser(u: SessionUserView | null): void;
  connection: ConnectionState; setConnection(c: ConnectionState): void;
  platform: PlatformInfo; setPlatform(p: PlatformInfo): void;
  prefs: Preferences; setPrefs(p: Partial<Preferences>): void;
  availability(id: ModuleId): { availability: Availability; reason?: string };
};

export const SessionContext = createContext<SessionValue | null>(null);

export function useSession() {
  const v = useContext(SessionContext);
  if (!v) throw new Error("useSession outside SessionProvider");
  return v;
}

/** Viewport class used by layouts. compact <768, medium <1100, expanded ≥1100. */
export function useViewport() {
  const get = () => (typeof window === "undefined" ? 1280 : window.innerWidth);
  const [w, setW] = useState(get);
  const raf = useRef(0);
  useEffect(() => {
    const on = () => { cancelAnimationFrame(raf.current); raf.current = requestAnimationFrame(() => setW(get())); };
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);
  return { width: w, compact: w < 768, medium: w >= 768 && w < 1100, expanded: w >= 1100 };
}
