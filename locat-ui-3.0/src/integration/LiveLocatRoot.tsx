import { useEffect, useMemo, useState } from "react";
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

export function LiveLocatRoot({ platform }: { platform: PlatformInfo }) {
  const [session, setSession] = useState<LiveSessionSnapshot>({ authStatus: "loading", user: null, connection: disconnected });
  const refresh = async () => {
    const account = await liveAuthApi.currentAccount();
    setSession({ authStatus: account ? "ready" : "signedOut", user: account ? view(account) : null, connection: disconnected });
  };
  useEffect(() => { void refresh(); }, []);

  const adapter = useMemo<LocatUiAdapter>(() => ({
    ...previewAdapter,
    mode: "live",
    moduleAvailability: (id, ctx) => {
      if (id !== "settings" && id !== "profile") return { availability: "planned", reason: "Live backend module not yet implemented" };
      return liveModuleAvailability(id, ctx);
    },
    auth: {
      ...previewAdapter.auth,
      signIn: async (input) => {
        const result = await liveAuthApi.signIn(input);
        if (result.status === "ok") await refresh();
        return result;
      },
      register: async (input) => liveAuthApi.register(input),
      signOut: async () => {
        const result = await liveAuthApi.signOut();
        if (result.status === "ok") await refresh();
        return result;
      },
      savedAccounts: () => [],
    },
  }), []);

  return <SessionProvider adapter={adapter} initialUser={null} initialConnection={disconnected} platform={platform} liveSession={session}>
    <PlayerProvider><App /></PlayerProvider>
  </SessionProvider>;
}
