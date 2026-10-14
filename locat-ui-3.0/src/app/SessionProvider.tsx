import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import type { ConnectionState, LocatUiAdapter, PlatformInfo, SessionUserView } from "@/contracts";
import type { ModuleId } from "./registry";
import { SessionContext, type EntryStage, type Preferences } from "./session";

export type LiveSessionSnapshot = { authStatus: "loading" | "signedOut" | "needsKeyRestore" | "ready"; user: SessionUserView | null; connection: ConnectionState };

export function SessionProvider({ adapter, initialUser, initialConnection, platform: initialPlatform, liveSession, children }: {
  adapter: LocatUiAdapter; initialUser: SessionUserView | null; initialConnection: ConnectionState; platform: PlatformInfo; liveSession?: LiveSessionSnapshot; children: ReactNode;
}) {
  // Preview only: remember the entry stage (never credentials) so reloads/deep links keep working.
  const [stage, setStageState] = useState<EntryStage>(() => (adapter.mode === "preview" && sessionStorage.getItem("locat-ui3:stage") === "app" ? "app" : "welcome"));
  const setStage = useCallback((s: EntryStage) => { if (adapter.mode === "preview") { sessionStorage.setItem("locat-ui3:stage", s); setStageState(s); } }, [adapter.mode]);
  const [user, setUser] = useState(initialUser);
  const [connection, setConnection] = useState(initialConnection);
  const [platform, setPlatform] = useState(initialPlatform);
  if (adapter.mode === "live" && !liveSession) throw new Error("Live Locat requires an authoritative session snapshot");
  const effectiveUser = adapter.mode === "live" ? (liveSession!.authStatus === "ready" ? liveSession!.user : null) : user;
  const effectiveConnection = adapter.mode === "live" ? liveSession!.connection : connection;
  const effectiveStage: EntryStage = adapter.mode === "live" ? (liveSession!.authStatus === "ready" && effectiveUser ? "app" : liveSession!.authStatus === "needsKeyRestore" ? "locked" : "login") : stage;
  const [prefs, setPrefsState] = useState<Preferences>({ theme: "obsidian", textScale: "default", motion: "system", startup: "messages", density: "comfortable", largeLibraries: false });
  const setPrefs = useCallback((p: Partial<Preferences>) => setPrefsState((old) => ({ ...old, ...p })), []);

  useEffect(() => {
    const root = document.documentElement;
    const theme = prefs.theme === "system" ? (matchMedia("(prefers-color-scheme: light)").matches ? "daylight" : "obsidian") : prefs.theme;
    root.dataset.theme = theme;
    root.dataset.textScale = prefs.textScale;
    root.dataset.motion = prefs.motion;
  }, [prefs]);

  const availability = useCallback((id: ModuleId) =>
    adapter.moduleAvailability(id, { connection: effectiveConnection, isAdmin: !!effectiveUser?.isAdmin, authenticated: !!effectiveUser, platform }),
  [adapter, effectiveConnection, effectiveUser, platform]);

  const value = useMemo(() => ({ adapter, stage: effectiveStage, setStage, user: effectiveUser, setUser, connection: effectiveConnection, setConnection, platform, setPlatform, prefs, setPrefs, availability }),
    [adapter, effectiveStage, setStage, effectiveUser, effectiveConnection, platform, prefs, setPrefs, availability]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}
