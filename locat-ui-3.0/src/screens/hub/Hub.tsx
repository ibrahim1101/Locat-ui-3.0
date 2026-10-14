import { Archive, Database, HardDrive, Info, MemoryStick, Network, Server, Timer, Users } from "lucide-react";
import type { MetricView, ServiceView } from "@/contracts/ecosystem";
import { Screen } from "@/layouts/Screen";
import { Badge, Banner, Section, ListRow, SectionTitle } from "@/ui";

/**
 * Hub (M5). Values below are `null` in preview: the UI renders "—" with the
 * source caveat rather than inventing numbers. Live data comes from admin stats.
 */
const METRICS: MetricView[] = [
  { label: "Users", value: null, source: "admin-stats" }, { label: "Active sessions", value: null, source: "admin-stats" },
  { label: "Message queue", value: null, source: "admin-stats" }, { label: "Database size", value: null, source: "admin-stats" },
  { label: "Memory (container)", value: null, source: "os-container", caveat: "Reflects the container, not the host" }, { label: "Uptime", value: null, source: "os-container" },
  { label: "CPU", value: null, source: "unavailable", caveat: "No host agent — not collected" }, { label: "Media activity", value: null, source: "unavailable", caveat: "Not collected" },
];
const SERVICES: ServiceView[] = [{ name: "API (Hono/tRPC)", state: "unknown" }, { name: "MariaDB", state: "unknown" }, { name: "Realtime (SSE)", state: "unknown" }, { name: "Media (FFmpeg)", state: "unknown" }, { name: "Web push", state: "unknown" }];
const ICONS = [Users, Network, Timer, Database, MemoryStick, Timer, Server, HardDrive];

export default function Hub() {
  return (
    <Screen title="Hub" subtitle="Server health · administrator only · beta" testId="hub-screen">
      <div className="mx-auto max-w-6xl">
        <Banner className="mb-5" tone="planned" icon={Info} title="No live telemetry in preview">Hub shows only what the unprivileged Locat backend can honestly report. It never has unrestricted host or Docker access.</Banner>
        <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-4">{METRICS.map((m, i) => { const I = ICONS[i]; return (
          <div key={m.label} className="rounded-2xl bg-s1 p-4 hairline" data-testid={`metric-${i}`}>
            <I className="size-4 text-ink-3" /><p className="mt-4 font-mono text-2xl font-bold">{m.value ?? "—"}</p><p className="text-xs font-semibold text-ink-2">{m.label}</p>
            <p className="mt-1 text-2xs text-ink-3">{m.source === "unavailable" ? m.caveat : m.caveat ?? (m.source === "admin-stats" ? "From admin stats" : "OS / container")}</p>
          </div>); })}</div>
        <div className="grid gap-6 lg:grid-cols-2">
          <section><SectionTitle>Services</SectionTitle><Section>{SERVICES.map((s) => <ListRow key={s.name} icon={Server} title={s.name} trailing={<Badge tone={s.state === "up" ? "ok" : s.state === "down" ? "danger" : "neutral"} dot>{s.state}</Badge>} />)}</Section></section>
          <section><SectionTitle>Backup & updates</SectionTitle><Section footer="Backup status and update checks aren't reported by the server yet.">
            <ListRow icon={Archive} title="Last database backup" subtitle="Not reported" trailing={<Badge tone="planned">Planned</Badge>} />
            <ListRow icon={Server} title="Server version" subtitle="Not reported" />
          </Section></section>
        </div>
      </div>
    </Screen>
  );
}
