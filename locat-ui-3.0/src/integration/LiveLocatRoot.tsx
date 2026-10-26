import {MatrixOwnerProvider} from './matrixOwner';
import { connectRealtime } from './realtimeConnection';
import { monitorConnection } from './connectionMonitor';
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { App } from "../App";
import { SessionProvider, type LiveSessionSnapshot } from "../app/SessionProvider";
import { previewAdapter } from "../fixtures/previewAdapter";
import { liveAuthApi, type AuthenticatedAccount } from "./liveAuthApi";
import { liveModuleAvailability } from "./liveModuleAvailability";
import { PublicShareViewer } from "./PublicShareViewer";
import type { LocatUiAdapter, PlatformInfo, SessionUserView } from "../contracts";

const origin = window.location.origin;
const disconnected = { mode: "server" as const, server: "disconnected" as const, origin, pendingOutbox: 0 };
function afterAuthRoute(): string {
  const handoff = new URLSearchParams(window.location.search).get("handoff");
  if (window.location.pathname !== "/share") return "/home";
  if (handoff && /^[a-f0-9-]{36}$/i.test(handoff)) return `/share?handoff=${encodeURIComponent(handoff)}`;
  return /^#([a-f0-9-]{36})\.([A-Za-z0-9_-]{43})$/i.test(window.location.hash) ? `/share${window.location.hash}` : "/home";
}

function view(account: AuthenticatedAccount): SessionUserView {
  return { id: account.id, username: account.username, displayName: account.displayName, lcCode: account.lcCode ?? "", bio: account.bio ?? "", globalIdentity:account.globalIdentity, isAdmin: false, serverOrigin: origin };
}

async function loadSession(): Promise<LiveSessionSnapshot|null> {
  const result=await liveAuthApi.inspectSession();
  if(result.status==='unavailable')return null;
  return {authStatus:result.status,user:result.status==='ready'?view(result.user):null,connection:{...disconnected,server:'connected'}};
}

export function LiveLocatRoot({ platform }: { platform: PlatformInfo }) {
  const nav = useNavigate();
  const [session, setSession] = useState<LiveSessionSnapshot>({ authStatus: "loading", user: null, connection: disconnected });
  const sessionMode = useRef(session.authStatus);
  useEffect(() => { sessionMode.current = session.authStatus; }, [session.authStatus]);
  const refresh = useCallback(async () => { const snapshot=await loadSession();if(snapshot)setSession(snapshot);else setSession(old=>({...old,connection:{...old.connection,server:'unreachable'}})); }, []);
  useEffect(() => {
    let active = true;
    void loadSession().then(snapshot => { if (active && sessionMode.current !== "local") setSession(snapshot??{authStatus:"signedOut",user:null,connection:{...disconnected,server:"unreachable"}}); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (session.authStatus === "local") return;
    return monitorConnection(server => setSession(old => ({...old,connection:{...old.connection,server}})));
  }, [session.authStatus]);

  useEffect(() => {
    if(session.authStatus!=='ready')return;
    let active=true,pending=false;
    const stop=connectRealtime(realtime=>{
      setSession(old=>({...old,connection:{...old.connection,realtime}}));
      if(!pending&&(realtime==='connected'||realtime==='reconnecting')){
        pending=true;
        void loadSession().then(snapshot=>{if(active&&snapshot)setSession(old=>({...snapshot,connection:{...old.connection,server:'connected'}}));}).finally(()=>{pending=false;});
      }
    },()=>{
      if(active){active=false;setSession({authStatus:'signedOut',user:null,connection:{...disconnected,realtime:'session-expired'}});}
    });
    return()=>{active=false;stop();};
  },[session.authStatus,session.user?.id]);

  useEffect(() => {
    let active=true;
    const update=()=>{if(sessionMode.current==='ready')void loadSession().then(snapshot=>{if(active&&snapshot&&sessionMode.current==='ready')setSession(snapshot);});};
    window.addEventListener('locat-account-profile-updated',update);
    return()=>{active=false;window.removeEventListener('locat-account-profile-updated',update);};
  }, []);

  const adapter = useMemo<LocatUiAdapter>(() => ({
    ...previewAdapter,
    mode: "live",
    moduleAvailability: (id, ctx) => {
      if (ctx.connection.mode === "local-only") return ["home", "search", "modules", "settings", "offline", "diagnostics"].includes(id) ? { availability: "available" } : { availability: "offline", reason: "Requires an authenticated account and live backend integration" };
      if (id === "devices") return { availability: "beta", reason: "Browser key proof, pairing and encrypted Link payloads; native acceptance pending" };
      if (id === "messages") return { availability: "beta", reason: "Verified one-to-one encrypted messaging; cross-device and physical-device acceptance remains open" };
      if (id === "files") return { availability: "beta", reason: "Experimental client-encrypted private storage; native storage and independent review pending" };
      if (["search", "modules", "diagnostics", "offline"].includes(id)) return { availability: "available" };
      if (id === "calendar" || id === "share" || id === "workspace" || id === "automate") return liveModuleAvailability(id, ctx);
      if (id !== "settings" && id !== "profile" && id !== "home") return { availability: "planned", reason: "Live backend module not yet implemented" };
      return liveModuleAvailability(id, ctx);
    },
    auth: {
      ...previewAdapter.auth,
      signIn: async (input) => {
        const result = await liveAuthApi.signIn(input);
        if (result.status === "ok") { await refresh(); nav(afterAuthRoute()); }
        return result;
      },
      register: async (input) => {
        const created = await liveAuthApi.register(input);
        if (created.status !== "ok") return created;
        const signedIn = await liveAuthApi.signIn({ username: input.username, password: input.password });
        if (signedIn.status === "ok") { await refresh(); nav(afterAuthRoute()); }
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
  }), [nav, refresh]);

  const publicShare=/^#([a-f0-9-]{36})\.([A-Za-z0-9_-]{43})$/i.test(window.location.hash);
  if(session.authStatus==='signedOut'&&window.location.pathname==='/share'&&publicShare)return <PublicShareViewer/>;
  return <SessionProvider key={session.authStatus === "local" ? "local-device" : session.user?.id ?? "signed-out"} adapter={adapter} initialUser={null} initialConnection={disconnected} platform={platform} liveSession={session}>
    <MatrixOwnerProvider accountId={session.user?.id??''}><App /></MatrixOwnerProvider>
  </SessionProvider>;
}
