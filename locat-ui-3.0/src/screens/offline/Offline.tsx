import { CloudOff, HardDrive, Inbox, Network, RefreshCw, Router, ShieldAlert, Wifi, Radar } from "lucide-react";
import { useSession } from "@/app/session";
import { Screen } from "@/layouts/Screen";
import { Badge, Banner, Button, ListRow, Section, relTime, cn } from "@/ui";

/** Offline & LAN (M11): honest connection modes. Outbox ≠ serverless LAN messaging. */
export default function Offline() {
  const { connection, setStage } = useSession();
  const modes = [
    { id: "server", icon: Wifi, t: "Server connected", d: "Chat, Link, Files, Vault and Secrets available", on: connection.mode === "server" && connection.server === "connected" },
    { id: "disc", icon: CloudOff, t: "Server disconnected", d: "Read local history; new messages wait encrypted in the outbox", on: connection.mode === "server" && connection.server !== "connected" },
    { id: "local", icon: HardDrive, t: "Local device mode", d: "No account. App appearance, accessibility and browser diagnostics are available.", on: connection.mode === "local-only" },
  ];
  return (
    <Screen title="Offline & LAN" subtitle="How this device reaches Locat" testId="offline-screen">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 grid gap-2 sm:grid-cols-3">{modes.map((m) => (
          <div key={m.id} className={cn("rounded-2xl p-4 hairline", m.on ? "bg-ember/10 shadow-[inset_0_0_0_1.5px_rgb(var(--ember))]" : "bg-s1")} data-testid={`mode-${m.id}`}>
            <m.icon className={cn("size-5", m.on ? "text-ember" : "text-ink-3")} /><p className="mt-3 text-sm font-bold">{m.t}</p><p className="mt-1 text-xs text-ink-3">{m.d}</p>{m.on && <Badge tone="ember" className="mt-3">Current</Badge>}
          </div>))}</div>
        {connection.server === "tls-error" && <Banner className="mb-4" tone="danger" icon={ShieldAlert} title="The server's HTTPS certificate isn't trusted">Install your server's certificate on this device or use a trusted name (e.g. Tailscale HTTPS). Locat won't bypass certificate checks.</Banner>}
        <Section title="Connection">
          <ListRow icon={Router} title="Server" subtitle={connection.origin ?? "Not configured"} trailing={<Badge tone={connection.server === "connected" ? "ok" : "warn"} dot>{connection.server.replace("-", " ")}</Badge>} />
          <ListRow icon={Network} title="Route" subtitle={connection.route === "same-lan" ? "Same local network (no internet needed)" : connection.route === "tailscale" ? "Tailscale private network" : "Unknown"} />
          <ListRow icon={Inbox} title="Encrypted outbox" subtitle={connection.pendingOutbox ? `${connection.pendingOutbox} messages will send when the server is reachable` : "Empty"} />
          <ListRow icon={RefreshCw} title="Last sync" subtitle={connection.lastSyncAt ? relTime(connection.lastSyncAt) : "—"} />
        </Section>
        <Section title="Diagnostics" footer="Checks run against your configured server only. Locat never scans your network.">
          <div className="flex flex-wrap gap-2 p-4"><Button icon={RefreshCw}>Test connection</Button><Button variant="ghost" onClick={() => setStage("server")}>Change server</Button></div>
        </Section>
        <Section title="Planned">
          <ListRow icon={Radar} title="LAN-only messaging without a server" disabledReason="Planned (M11) — needs authenticated peer transport" trailing={<Badge tone="planned">Planned</Badge>} />
        </Section>
      </div>
    </Screen>
  );
}
