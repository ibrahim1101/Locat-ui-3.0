import { useEffect, useState } from "react";
import { FlaskConical } from "lucide-react";
import type { ConnectionState, PlatformKind } from "@/contracts/platform";
import { useSession, useViewport } from "@/app/session";
import { Button, Section, Segmented, Sheet, Switch } from "@/ui";

const CONN: Record<string, Partial<ConnectionState>> = {
  connected: { mode: "server", server: "connected", route: "same-lan", pendingOutbox: 0 },
  disconnected: { mode: "server", server: "disconnected", pendingOutbox: 3 },
  tls: { mode: "server", server: "tls-error", pendingOutbox: 0 },
  local: { mode: "local-only", server: "not-configured", pendingOutbox: 0 },
};

/**
 * Reviewer-only control surface to exercise UI states with fixtures.
 * Not part of the product; excluded when adapter.mode === "live".
 */
export function PreviewLab() {
  const s = useSession();
  const [open, setOpen] = useState(false);
  const { compact } = useViewport();
  useEffect(() => { const on = () => setOpen(true); window.addEventListener("locat:preview-lab", on); return () => window.removeEventListener("locat:preview-lab", on); }, []);
  if (s.adapter.mode !== "preview") return null;
  const connKey = s.connection.mode === "local-only" ? "local" : s.connection.server === "connected" ? "connected" : s.connection.server === "tls-error" ? "tls" : "disconnected";
  return (
    <>
      {!compact && <button onClick={() => setOpen(true)} data-testid="preview-lab-button" aria-label="Open preview lab"
        className="fixed left-1/2 z-60 -translate-x-1/2 opacity-80 hover:opacity-100 inline-flex h-[18px] items-center gap-1 rounded-b-lg bg-planned/20 px-2.5 text-[10px] font-bold uppercase tracking-wide text-planned backdrop-blur-sm hover:bg-planned/30"
        style={{ top: "env(safe-area-inset-top)" }}>
        <FlaskConical className="size-3" /> Preview
      </button>}
      <Sheet open={open} onClose={() => setOpen(false)} title="Preview lab" description="Fixture-only controls for reviewing states. Nothing here reaches a server." testId="preview-lab">
        <Section title="Connection">
          <div className="p-3"><Segmented label="Connection" value={connKey} onChange={(k) => s.setConnection({ ...s.connection, ...CONN[k] })}
            options={[{ value: "connected", label: "Server" }, { value: "disconnected", label: "Offline" }, { value: "tls", label: "TLS error" }, { value: "local", label: "Local" }]} size="sm" /></div>
        </Section>
        <Section title="Identity">
          <div className="px-4"><Switch label="Administrator role" checked={!!s.user?.isAdmin} onChange={(v) => s.user && s.setUser({ ...s.user, isAdmin: v })} disabledReason={s.user ? null : "No account in local mode"} /></div>
        </Section>
        <Section title="Conversation scale">
          <div className="px-4"><Switch label="Large conversation" description="5,000 generated messages in Studio Night" checked={s.prefs.largeConversation} onChange={(v) => s.setPrefs({ largeConversation: v })} testId="toggle-large-conversation" /></div>
        </Section>
        <Section title="Platform">
          <div className="p-3"><Segmented<PlatformKind> label="Platform" value={s.platform.kind} onChange={(k) => s.setPlatform({ ...s.platform, kind: k, os: k === "capacitor-android" ? "android" : k === "tauri-desktop" ? "windows" : "unknown" })}
            options={[{ value: "browser", label: "Web" }, { value: "capacitor-android", label: "Android" }, { value: "tauri-desktop", label: "Desktop" }]} size="sm" /></div>
        </Section>
        <Section title="Entry flow">
          <div className="flex flex-wrap gap-2 p-3">
            <Button size="sm" onClick={() => { s.setStage("welcome"); setOpen(false); }}>Show welcome</Button>
            <Button size="sm" onClick={() => { s.setStage("locked"); setOpen(false); }}>Show app lock</Button>
          </div>
        </Section>
      </Sheet>
    </>
  );
}
