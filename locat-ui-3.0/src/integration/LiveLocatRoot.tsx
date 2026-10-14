import { useEffect, useMemo, useRef, useState } from "react";
import { LiveMediaProvider } from "./LiveMediaProvider";
import { useNavigate } from "react-router";
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
  return { id: account.id, username: account.username, displayName: account.displayName, lcCode: account.lcCode ?? "", bio: account.bio ?? "", isAdmin: false, serverOrigin: origin };
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
  const nav = useNavigate();
  const [session, setSession] = useState<LiveSessionSnapshot>({ authStatus: "loading", user: null, connection: disconnected });
  const sessionMode = useRef(session.authStatus);
  useEffect(() => { sessionMode.current = session.authStatus; }, [session.authStatus]);
  const refresh = async () => { setSession(await loadSession()); };
  useEffect(() => {
    let active = true;
    void loadSession().then(snapshot => { if (active && sessionMode.current !== "local") setSession(snapshot); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (session.authStatus === "local") return;
    let active = true;
    let pending = false;
    const timer = setInterval(() => {
      if (pending) return;
      pending = true;
      void fetch("/api/ready", { cache: "no-store", credentials: "omit" }).then(async response => response.ok && (await response.json()).app === "Locat").catch(() => false).then(reachable => {
        if (active) setSession(old => ({ ...old, connection: { ...old.connection, server: reachable ? "connected" : "unreachable" } }));
      }).finally(() => { pending = false; });
    }, 15000);
    return () => { active = false; clearInterval(timer); };
  }, [session.authStatus]);

  const adapter = useMemo<LocatUiAdapter>(() => ({
    ...previewAdapter,
    mode: "live",
    moduleAvailability: (id, ctx) => {
      if (ctx.connection.mode === "local-only") return ["home", "cinema", "music", "photos", "search", "modules", "settings", "offline", "diagnostics"].includes(id) ? { availability: "available" } : { availability: "offline", reason: "Requires an authenticated account and live backend integration" };
      if (id === "devices") return { availability: "beta", reason: "Browser key proof, pairing and encrypted Link payloads; native acceptance pending" };
      if (id === "messages") return { availability: "beta", reason: "Live contacts; private messaging awaits verified E2EE" };
      if (["vault", "secrets"].includes(id)) return { availability: "beta", reason: "Experimental client-encrypted private storage; native storage and independent review pending" };
      if (id === "sentinel") return { availability: "beta", reason: "Owned incidents, webhook adapters and account audit; device monitoring pending" };
      if (["cinema", "music", "photos", "search", "modules", "diagnostics", "offline"].includes(id)) return { availability: "available" };
      if (id !== "settings" && id !== "profile" && id !== "home") return { availability: "planned", reason: "Live backend module not yet implemented" };
      return liveModuleAvailability(id, ctx);
    },
    auth: {
      ...previewAdapter.auth,
      signIn: async (input) => {
        const result = await liveAuthApi.signIn(input);
        if (result.status === "ok") { await refresh(); nav("/home"); }
        return result;
      },
      register: async (input) => {
        const created = await liveAuthApi.register(input);
        if (created.status !== "ok") return created;
        const signedIn = await liveAuthApi.signIn({ username: input.username, password: input.password });
        if (signedIn.status === "ok") { await refresh(); nav("/home"); }
        return signedIn;
      },
      enterLocalMode: async () => {
        sessionMode.current = "local";
        nav("/home");
        setSession({ authStatus: "local", user: null, connection: { mode: "local-only", server: "not-configured", pendingOutbox: 0 } });
        return { status: "ok", value: undefined };
      },
      signOut: async () => {
        if (sessionMode.current === "local") {
          setSession({ authStatus: "signedOut", user: null, connection: disconnected });
          return { status: "ok", value: undefined };
        }
        const result = await liveAuthApi.signOut();
        if (result.status === "ok") { await refresh(); nav("/home"); }
        return result;
      },
      savedAccounts: () => [],
    },
  }), [nav]);

  return <SessionProvider key={session.authStatus === "local" ? "local-device" : session.user?.id ?? "signed-out"} adapter={adapter} initialUser={null} initialConnection={disconnected} platform={platform} liveSession={session}>
    <LiveMediaProvider key={session.user?.id ?? (session.authStatus === "local" ? "local-device" : "signed-out")}><PlayerProvider><App /></PlayerProvider></LiveMediaProvider>
  </SessionProvider>;
}
