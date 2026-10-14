import { useEffect, useMemo, useState } from "react";
import { LiveMediaProvider } from "./LiveMediaProvider";
import { App } from "../App";
import { SessionProvider, type LiveSessionSnapshot } from "../app/SessionProvider";
import { PlayerProvider } from "../app/PlayerProvider";
import { previewAdapter } from "../fixtures/previewAdapter";
import { liveAuthApi, type AuthenticatedAccount } from "./liveAuthApi";
import { liveModuleAvailability } from "./liveModuleAvailability";
import type { LocatUiAdapter, PlatformInfo, SessionUserView } from "../contracts";

const origin = window.location.origin;
const disconnected = { mode: "server" as const, server: "disconnected" as const, origin, pendingOutbox: 0 };

function view(account: AuthenticatedAccount): SessionUserView {
  return { id: account.id, username: account.username, displayName: account.displayName, lcCode: "", isAdmin: false, serverOrigin: origin };
}

async function loadSession(): Promise<LiveSessionSnapshot> {
  const account = await liveAuthApi.currentAccount();
  const reachable = await fetch("/api/ready", { cache: "no-store", credentials: "omit" })
    .then(async (response) => response.ok && (await response.json()).app === "Locat")
    .catch(() => false);
  const connection = { ...disconnected, server: reachable ? "connected" as const : "unreachable" as const };
  return { authStatus: account ? "ready" : "signedOut", user: account ? view(account) : null, connection };
}

export function LiveLocatRoot({ platform }: { platform: PlatformInfo }) {
  const [session, setSession] = useState<LiveSessionSnapshot>({ authStatus: "loading", user: null, connection: disconnected });
  const refresh = async () => { setSession(await loadSession()); };
  useEffect(() => {
    let active = true;
    void loadSession().then(snapshot => { if (active) setSession(snapshot); });
    return () => { active = false; };
  }, []);

  const adapter = useMemo<LocatUiAdapter>(() => ({
    ...previewAdapter,
    mode: "live",
    moduleAvailability: (id, ctx) => {
      if (id === "messages") return { availability: "beta", reason: "Live contacts; private messaging awaits verified E2EE" };
      if (id === "sentinel") return { availability: "beta", reason: "Account audit events; device monitoring pending" };
      if (["cinema", "music", "photos", "search", "modules"].includes(id)) return { availability: "available" };
      if (id !== "settings" && id !== "profile" && id !== "home") return { availability: "planned", reason: "Live backend module not yet implemented" };
      return liveModuleAvailability(id, ctx);
    },
    auth: {
      ...previewAdapter.auth,
      signIn: async (input) => {
        const result = await liveAuthApi.signIn(input);
        if (result.status === "ok") await refresh();
        return result;
      },
      register: async (input) => {
        const created = await liveAuthApi.register(input);
        if (created.status !== "ok") return created;
        const signedIn = await liveAuthApi.signIn({ username: input.username, password: input.password });
        if (signedIn.status === "ok") await refresh();
        return signedIn;
      },
      signOut: async () => {
        const result = await liveAuthApi.signOut();
        if (result.status === "ok") await refresh();
        return result;
      },
      savedAccounts: () => [],
    },
  }), []);

  return <SessionProvider adapter={adapter} initialUser={null} initialConnection={disconnected} platform={platform} liveSession={session}>
    <LiveMediaProvider key={session.user?.id ?? "signed-out"}><PlayerProvider><App /></PlayerProvider></LiveMediaProvider>
  </SessionProvider>;
}
