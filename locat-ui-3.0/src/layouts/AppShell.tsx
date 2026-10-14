import { Suspense, useEffect, useState, type ReactNode } from "react";
import { Outlet, useLocation, useNavigate } from "react-router";
import { CloudOff, HardDrive, Pause, Play, ShieldAlert, SkipForward, X } from "lucide-react";
import { useSession, useViewport } from "@/app/session";
import { usePlayer } from "@/app/player";
import { moduleForPath } from "@/app/registry";
import { Button, IconButton, Kbd, Sheet, Skeleton, cn, hueGradient } from "@/ui";

const SHORTCUTS = [["Ctrl K", "Jump to module or action"], ["Ctrl ,", "Settings"], ["Alt 1–5", "Home · Messages · Cinema · Music · Devices"], ["↑ ↓ Home End", "Move through any list"], ["Shift F10", "Context menu for focused item"], ["Enter", "Send message / open"], ["Esc", "Close menu or sheet"], ["Space · ← → · F · M", "Player: play · seek · fullscreen · mute"], ["?", "This sheet"]];
import { MobileNav, Sidebar } from "./Navigation";
import { CommandPalette } from "./CommandPalette";
import { PreviewLab } from "./PreviewLab";
import { ModuleGate } from "@/screens/shared/ModuleGate";

/** Screens that own the full viewport on phones (bottom nav hidden). */
const IMMERSIVE = [/^\/messages\/.+/, /^\/cinema\/play\/.+/, /^\/photos\/.+/, /^\/remote\/session/];

function ConnectionStrip() {
  const { connection } = useSession();
  const nav = useNavigate();
  if (connection.mode === "local-only")
    return <Strip icon={HardDrive} tone="neutral" text="Local device mode — account and server features are unavailable" action={<Button size="sm" variant="ghost" onClick={() => nav("/offline")}>Details</Button>} />;
  if (connection.server === "connected") return null;
  if (connection.server === "tls-error")
    return <Strip icon={ShieldAlert} tone="danger" text="Server certificate is not trusted. Locat will not connect over an untrusted HTTPS link." action={<Button size="sm" variant="ghost" onClick={() => nav("/offline")}>Diagnose</Button>} />;
  return <Strip icon={CloudOff} tone="warn" text={`Server unreachable${connection.pendingOutbox ? ` · ${connection.pendingOutbox} encrypted messages waiting in outbox` : ""}`} action={<Button size="sm" variant="ghost" onClick={() => nav("/offline")}>Details</Button>} />;
}
function Strip({ icon: I, text, tone, action }: { icon: typeof CloudOff; text: string; tone: "warn" | "danger" | "neutral"; action?: ReactNode }) {
  return (
    <div role="status" data-testid="connection-strip" className={cn("flex shrink-0 items-center gap-2 px-4 py-1.5 text-xs font-semibold", tone === "warn" ? "bg-warn/12 text-warn" : tone === "danger" ? "bg-danger/12 text-danger" : "bg-s2 text-ink-2")}>
      <I className="size-4 shrink-0" aria-hidden /><span className="min-w-0 flex-1 truncate">{text}</span>{action}
    </div>
  );
}

function MiniPlayer() {
  const p = usePlayer();
  const nav = useNavigate();
  if (!p.current) return null;
  const t = p.current;
  return (
    <div data-testid="mini-player" className="mx-2 mb-2 flex shrink-0 items-center gap-3 rounded-2xl bg-s2 p-2 pr-1 shadow-lift hairline md:mx-3">
      <button onClick={() => nav("/music?now=1")} className="flex min-w-0 flex-1 items-center gap-3 text-left" aria-label={`Now playing ${t.title}. Open player`}>
        <span className="size-11 shrink-0 rounded-xl" style={{ background: hueGradient(t.hue) }} />
        <span className="min-w-0"><span className="block truncate text-sm font-bold">{t.title}</span><span className="block truncate text-xs text-ink-3">{t.artist} · Preview playhead</span></span>
      </button>
      <IconButton icon={p.playing ? Pause : Play} label={p.playing ? "Pause" : "Play"} onClick={p.toggle} data-testid="mini-player-toggle" />
      <IconButton icon={SkipForward} label="Next" onClick={p.next} className="hidden sm:grid" />
      <IconButton icon={X} label="Close player" onClick={p.close} size="sm" />
    </div>
  );
}

const Loading = () => <div className="space-y-3 p-6" role="status" aria-label="Loading"><Skeleton className="h-8 w-48" /><Skeleton className="h-24" /><Skeleton className="h-24" /></div>;

export function AppShell() {
  const { compact, medium } = useViewport();
  const { pathname } = useLocation();
  const [railPref, setRail] = useState<boolean | null>(null);
  const [cmd, setCmd] = useState(false);
  const [keys, setKeys] = useState(false);
  const { prefs } = useSession();
  const [lastMedia, setLastMedia] = useState("/cinema");
  const nav = useNavigate();
  const mediaRoute = /^\/(cinema|music|photos)/.test(pathname) ? "/" + pathname.split("/")[1] : null;
  if (mediaRoute && mediaRoute !== lastMedia) setLastMedia(mediaRoute);
  const rail = railPref ?? medium;
  const immersive = compact && IMMERSIVE.some((r) => r.test(pathname));
  const mod = moduleForPath(pathname);

  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === "k") { e.preventDefault(); setCmd((v) => !v); }
      if (mod && e.key === ",") { e.preventDefault(); nav("/settings"); }
      const typing = /^(INPUT|TEXTAREA)$/.test((e.target as HTMLElement).tagName);
      if (!typing && e.key === "?") { e.preventDefault(); setKeys(true); }
      if (e.altKey && /^[1-5]$/.test(e.key)) { e.preventDefault(); nav(["/home", "/messages", "/cinema", "/music", "/devices"][Number(e.key) - 1]); }
    };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, [nav]);

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-canvas" data-testid="app-shell">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-ember focus:px-3 focus:py-2 focus:text-ember-ink">Skip to content</a>
      {!compact && <Sidebar rail={rail} onToggle={() => setRail(!rail)} onCommand={() => setCmd(true)} />}
      <div className="flex min-w-0 flex-1 flex-col">
        <ConnectionStrip />
        <main id="main" className="min-h-0 flex-1" key={`${mod?.id}:${prefs.largeLibraries}`}>
          <Suspense fallback={<Loading />}>
            {mod ? <ModuleGate id={mod.id}><Outlet /></ModuleGate> : <Outlet />}
          </Suspense>
        </main>
        {!immersive && <MiniPlayer />}
        {compact && !immersive && <MobileNav lastMedia={lastMedia} />}
      </div>
      <CommandPalette open={cmd} onClose={() => setCmd(false)} />
      <PreviewLab />
      <Sheet open={keys} onClose={() => setKeys(false)} title="Keyboard shortcuts" size="sm" testId="shortcuts-sheet">
        <dl className="grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-2.5 text-sm">{SHORTCUTS.map(([k, d]) => <div key={k} className="contents"><dt><Kbd>{k}</Kbd></dt><dd className="text-ink-2">{d}</dd></div>)}</dl>
      </Sheet>
    </div>
  );
}
