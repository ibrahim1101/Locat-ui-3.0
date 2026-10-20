import { Suspense, useEffect, useState, type ReactNode } from "react";
import { Outlet, useLocation, useNavigate } from "react-router";
import { CloudOff, HardDrive, ShieldAlert } from "lucide-react";
import { useSession, useViewport } from "@/app/session";
import { moduleForPath } from "@/app/registry";
import { Button, Kbd, Sheet, Skeleton, cn } from "@/ui";

const SHORTCUTS = [["Ctrl K", "Jump to module or action"], ["Ctrl ,", "Settings"], ["Alt 1–4", "Home · Chat · Link · Files"], ["↑ ↓ Home End", "Move through any list"], ["Shift F10", "Context menu for focused item"], ["Enter", "Send message / open"], ["Esc", "Close menu or sheet"], ["?", "This sheet"]];
import { MobileNav, Sidebar } from "./Navigation";
import { CommandPalette } from "./CommandPalette";
import { PreviewLab } from "./PreviewLab";
import { ModuleGate } from "@/screens/shared/ModuleGate";

/** Screens that own the full viewport on phones (bottom nav hidden). */
const IMMERSIVE = [/^\/messages\/.+/];

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

const Loading = () => <div className="space-y-3 p-6" role="status" aria-label="Loading"><Skeleton className="h-8 w-48" /><Skeleton className="h-24" /><Skeleton className="h-24" /></div>;

export function AppShell() {
  const { compact, medium } = useViewport();
  const { pathname } = useLocation();
  const [railPref, setRail] = useState<boolean | null>(null);
  const [cmd, setCmd] = useState(false);
  const [keys, setKeys] = useState(false);
  const { prefs } = useSession();
  const nav = useNavigate();
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
      if (e.altKey && /^[1-4]$/.test(e.key)) { e.preventDefault(); nav(["/home", "/messages", "/devices", "/files"][Number(e.key) - 1]); }
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
        <main id="main" className="min-h-0 flex-1" key={`${mod?.id}:${prefs.largeConversation}`}>
          <Suspense fallback={<Loading />}>
            {mod ? <ModuleGate id={mod.id}><Outlet /></ModuleGate> : <Outlet />}
          </Suspense>
        </main>
        {compact && !immersive && <MobileNav />}
      </div>
      <CommandPalette open={cmd} onClose={() => setCmd(false)} />
      <PreviewLab />
      <Sheet open={keys} onClose={() => setKeys(false)} title="Keyboard shortcuts" size="sm" testId="shortcuts-sheet">
        <dl className="grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-2.5 text-sm">{SHORTCUTS.map(([k, d]) => <div key={k} className="contents"><dt><Kbd>{k}</Kbd></dt><dd className="text-ink-2">{d}</dd></div>)}</dl>
      </Sheet>
    </div>
  );
}
