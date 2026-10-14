import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import type { ConnectionState, LocatUiAdapter, PlatformInfo, SessionUserView } from "@/contracts";
import type { ModuleId } from "./registry";
import { SessionContext, type EntryStage, type Preferences } from "./session";

export function SessionProvider({ adapter, initialUser, initialConnection, platform: initialPlatform, children }: {
  adapter: LocatUiAdapter; initialUser: SessionUserView | null; initialConnection: ConnectionState; platform: PlatformInfo; children: ReactNode;
}) {
  // Preview only: remember the entry stage (never credentials) so reloads/deep links keep working.
  const [stage, setStageState] = useState<EntryStage>(() => (adapter.mode === "preview" && sessionStorage.getItem("locat-ui3:stage") === "app" ? "app" : "welcome"));
  const setStage = useCallback((s: EntryStage) => { if (adapter.mode === "preview") sessionStorage.setItem("locat-ui3:stage", s); setStageState(s); }, [adapter.mode]);
  const [user, setUser] = useState(initialUser);
  const [connection, setConnection] = useState(initialConnection);
  const [platform, setPlatform] = useState(initialPlatform);
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
    adapter.moduleAvailability(id, { connection, isAdmin: !!user?.isAdmin, authenticated: !!user, platform }),
  [adapter, connection, user, platform]);

  const value = useMemo(() => ({ adapter, stage, setStage, user, setUser, connection, setConnection, platform, setPlatform, prefs, setPrefs, availability }),
    [adapter, stage, setStage, user, connection, platform, prefs, setPrefs, availability]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}
