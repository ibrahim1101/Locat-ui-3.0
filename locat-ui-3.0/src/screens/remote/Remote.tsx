import { useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { ArrowLeft, Gamepad2, Keyboard, Maximize, Monitor, MonitorOff, MousePointer2, PlugZap, ShieldCheck, Volume2, Activity } from "lucide-react";
import type { RemoteHostView } from "@/contracts/ecosystem";
import { useSession } from "@/app/session";
import { useReport } from "@/app/feedback";
import { FIXTURE_REMOTE_HOSTS } from "@/fixtures/data";
import { Screen } from "@/layouts/Screen";
import { Badge, Banner, Button, IconButton, Section, Sheet, StateView, Switch, ListRow } from "@/ui";

/** Remote viewing + experimental Remote Play (preview chrome; WebRTC owned by Locat remote/). */
function Session({ host, onEnd }: { host: RemoteHostView; onEnd(): void }) {
  const { adapter } = useSession(); const report = useReport();
  const [input, setInput] = useState(false); const [stats, setStats] = useState(true);
  return (
    <div className="flex h-full flex-col bg-black text-white" data-testid="remote-session">
      <div className="flex items-center gap-2 px-3 pt-safe md:px-4 md:pt-2">
        <IconButton icon={ArrowLeft} label="Leave session" onClick={onEnd} className="text-white hover:bg-white/10" />
        <p className="flex-1 truncate text-sm font-bold">{host.name}<span className="ml-2 text-xs font-normal text-white/50">Awaiting live stream</span></p>
        <IconButton icon={Activity} label="Stream statistics" active={stats} onClick={() => setStats(!stats)} className="text-white hover:bg-white/10" />
        <IconButton icon={Maximize} label="Full screen" onClick={() => document.documentElement.requestFullscreen?.().catch(() => undefined)} className="text-white hover:bg-white/10" />
      </div>
      <div className="relative m-2 grid flex-1 place-items-center rounded-2xl bg-[#111] md:m-4">
        <StateView kind="offline" title="No stream in preview" body="Locat's WebRTC client attaches the host's display here after the host approves the session." className="text-white" />
        {stats && <dl className="absolute left-3 top-3 grid grid-cols-2 gap-x-4 gap-y-1 rounded-xl bg-black/70 p-3 font-mono text-2xs text-white/80 backdrop-blur">{["FPS", "Bitrate", "RTT", "Loss", "Codec", "Size"].map((k) => <div key={k} className="contents"><dt className="text-white/50">{k}</dt><dd>—</dd></div>)}</dl>}
      </div>
      <div className="flex flex-wrap items-center gap-3 px-4 pb-4" style={{ paddingBottom: "max(16px, env(safe-area-inset-bottom))" }}>
        <div className="w-60"><Switch label="Allow my input" description={host.inputSupported ? "Mouse and keyboard to Windows host" : "Not supported by this host"} checked={input} disabledReason={host.inputSupported ? null : "Input supported on Windows hosts only"} onChange={async (v) => { setInput(v); report(await adapter.remote.setInput(v), v ? "Input enabled" : "Input disabled"); }} testId="remote-input-toggle" /></div>
        <span className="flex-1" />
        <IconButton icon={Gamepad2} label="Controller" disabledReason="Controller support planned" className="text-white" />
        <IconButton icon={Volume2} label="Audio" disabledReason="Audio streaming planned" className="text-white" />
        <Button variant="danger" icon={MonitorOff} onClick={async () => { report(await adapter.remote.disconnect(), "Disconnected"); onEnd(); }} data-testid="remote-disconnect">Disconnect</Button>
      </div>
    </div>
  );
}

export default function Remote() {
  const { pathname } = useLocation(); const nav = useNavigate();
  const { adapter } = useSession(); const report = useReport();
  const [consent, setConsent] = useState<RemoteHostView | null>(null);
  const sessionHost = pathname.startsWith("/remote/session/") ? FIXTURE_REMOTE_HOSTS.find((h) => h.id === pathname.split("/")[3]) : undefined;
  if (sessionHost) return <Session host={sessionHost} onEnd={() => nav("/remote")} />;
  return (
    <Screen title="Remote" subtitle="Experimental · approved hosts only" testId="remote-screen">
      <div className="mx-auto max-w-3xl">
        <Banner className="mb-5" tone="warn" icon={PlugZap} title="Remote Play is a prototype">Viewing works with an approved, manually launched host. Input is Windows-only. Controller, audio, hardware encoding and bitrate controls are planned.</Banner>
        <Section title="Hosts">{FIXTURE_REMOTE_HOSTS.map((h) => (
          <ListRow key={h.id} icon={Monitor} title={h.name} subtitle={`${h.os} · ${h.reachable ? "reachable" : "unreachable"}${h.inputSupported ? " · input capable" : ""}`} testId={`remote-host-${h.id}`}
            trailing={h.reachable ? <Button size="sm" variant="primary" onClick={() => setConsent(h)} data-testid={`remote-connect-${h.id}`}>Connect</Button> : <Badge>Offline</Badge>} />))}</Section>
        <Section title="Set up a host" footer="The host app runs separately on your desktop (see remote/ in Locat). Hosts must approve each viewer.">
          <ListRow icon={Keyboard} title="Windows host" subtitle="Display capture + optional input" />
          <ListRow icon={MousePointer2} title="Linux / macOS host" subtitle="Viewing only, limited" />
        </Section>
      </div>
      <Sheet open={!!consent} onClose={() => setConsent(null)} title={`Connect to ${consent?.name}`} size="sm" testId="remote-consent"
        footer={<Button variant="primary" icon={ShieldCheck} onClick={async () => { const r = await adapter.remote.connect(consent!.id); report(r, "Connected"); const id = consent!.id; setConsent(null); nav(`/remote/session/${id}`); }} data-testid="remote-consent-continue">Request access</Button>}>
        <p className="text-sm leading-relaxed text-ink-2">The host must approve this request on its screen. You'll see its display; input stays off until you turn it on. Either side can end the session at any time.</p>
      </Sheet>
    </Screen>
  );
}
