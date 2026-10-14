import { useMemo, useState } from "react";
import { CheckCheck, Copy, Eye, KeyRound, Plus, Radio, ShieldAlert, Trash2, Webhook } from "lucide-react";
import type { AlertView, Severity } from "@/contracts/ecosystem";
import { useSession, useViewport } from "@/app/session";
import { useReport } from "@/app/feedback";
import { FIXTURE_ALERTS, FIXTURE_SOURCES, FIXTURE_TOKENS } from "@/fixtures/data";
import { Screen } from "@/layouts/Screen";
import { Badge, Banner, Button, ChipRow, IconButton, ListRow, SearchField, Section, Segmented, Sheet, StateView, TextField, cn, relTime } from "@/ui";

const SEV: Record<Severity, { tone: "danger" | "warn" | "ember" | "info" | "neutral"; label: string }> = { critical: { tone: "danger", label: "Critical" }, high: { tone: "ember", label: "High" }, medium: { tone: "warn", label: "Medium" }, low: { tone: "info", label: "Low" }, info: { tone: "neutral", label: "Info" } };
const BAR: Record<Severity, string> = { critical: "bg-danger", high: "bg-ember", medium: "bg-warn", low: "bg-info", info: "bg-ink-3" };

function AlertDetail({ a, onState }: { a: AlertView; onState(s: "acknowledged" | "resolved"): void }) {
  return (
    <div data-testid="alert-detail">
      <div className="flex flex-wrap items-center gap-2"><Badge tone={SEV[a.severity].tone} dot>{SEV[a.severity].label}</Badge><Badge>{a.source}</Badge><Badge tone={a.state === "open" ? "danger" : a.state === "acknowledged" ? "warn" : "ok"}>{a.state}</Badge></div>
      <h2 className="mt-3 text-lg font-bold leading-snug">{a.title}</h2>
      <p className="mt-1 text-xs text-ink-3">{new Date(a.at).toLocaleString()}</p>
      <p className="mt-4 text-sm leading-relaxed text-ink-2">{a.summary}</p>
      {Object.keys(a.fields).length > 0 && <dl className="mt-4 divide-y divide-line overflow-hidden rounded-xl bg-s2 font-mono text-xs hairline">{Object.entries(a.fields).map(([k, v]) => <div key={k} className="flex gap-3 px-3 py-2"><dt className="w-24 shrink-0 text-ink-3">{k}</dt><dd className="break-all">{v}</dd></div>)}</dl>}
      <div className="mt-5 flex gap-2">
        <Button icon={Eye} disabledReason={a.state !== "open" ? "Already acknowledged" : null} onClick={() => onState("acknowledged")} data-testid="alert-ack">Acknowledge</Button>
        <Button variant="primary" icon={CheckCheck} disabledReason={a.state === "resolved" ? "Already resolved" : null} onClick={() => onState("resolved")} data-testid="alert-resolve">Resolve</Button>
      </div>
      <p className="mt-4 text-2xs text-ink-3">Sentinel alert metadata is readable by your server — it isn't end-to-end encrypted like messages.</p>
    </div>
  );
}

export default function Sentinel() {
  const { adapter } = useSession(); const report = useReport(); const { expanded } = useViewport();
  const [tab, setTab] = useState<"alerts" | "integrations">("alerts");
  const [sev, setSev] = useState<"all" | Severity>("all"); const [state, setState] = useState<"open" | "all">("open"); const [q, setQ] = useState("");
  const [sel, setSel] = useState<AlertView | null>(null); const [newTok, setNewTok] = useState(false); const [label, setLabel] = useState("");
  const alerts = useMemo(() => FIXTURE_ALERTS.filter((a) => (sev === "all" || a.severity === sev) && (state === "all" || a.state !== "resolved") && (!q || `${a.title} ${a.source}`.toLowerCase().includes(q.toLowerCase()))), [sev, state, q]);
  const counts = (["critical", "high", "medium", "low"] as Severity[]).map((s) => [s, FIXTURE_ALERTS.filter((a) => a.severity === s && a.state !== "resolved").length] as const);
  const setAlert = async (s: "acknowledged" | "resolved") => { if (sel) report(await adapter.sentinel.setAlertState(sel.id, s), "Updated"); };

  return (
    <Screen title="Sentinel" subtitle="Security alerts from your tools" testId="sentinel-screen" toolbar={<Segmented label="Sentinel section" value={tab} onChange={setTab} options={[{ value: "alerts", label: "Alerts", icon: ShieldAlert }, { value: "integrations", label: "Integrations", icon: Webhook }]} className="mb-2" />}>
      <div className="mx-auto max-w-7xl">
        {tab === "alerts" ? (<>
          <div className="mb-4 grid grid-cols-4 gap-2">{counts.map(([s, n]) => (
            <button key={s} onClick={() => setSev(sev === s ? "all" : s)} aria-pressed={sev === s} className={cn("rounded-2xl bg-s1 p-3 text-left hairline", sev === s && "shadow-[inset_0_0_0_1.5px_rgb(var(--ember))]")} data-testid={`sev-${s}`}>
              <span className={cn("mb-3 block h-1 w-6 rounded-full", BAR[s])} /><span className="block text-2xl font-extrabold tabular">{n}</span><span className="text-2xs font-semibold uppercase tracking-wide text-ink-3">{SEV[s].label}</span></button>))}</div>
          <div className="mb-1 flex flex-wrap items-center gap-2"><SearchField value={q} onChange={setQ} placeholder="Search alerts" className="min-w-[200px] flex-1" testId="sentinel-search" /><ChipRow className="h-auto" label="State" value={state} onChange={setState} options={[{ value: "open", label: "Unresolved" }, { value: "all", label: "History" }]} /></div>
          <div className={cn("mt-3", expanded && "grid grid-cols-[1fr_420px] gap-6")}>
            <Section>{alerts.length ? alerts.map((a) => (
              <button key={a.id} onClick={() => setSel(a)} className={cn("flex w-full items-stretch gap-3 px-4 py-3 text-left hover:bg-s2", sel?.id === a.id && "bg-s2")} data-testid={`alert-${a.id}`}>
                <span className={cn("w-1 shrink-0 rounded-full", BAR[a.severity])} />
                <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{a.title}</span><span className="block text-xs text-ink-3">{a.source} · {relTime(a.at)} · {a.state}</span></span>
                <Badge tone={SEV[a.severity].tone}>{SEV[a.severity].label}</Badge>
              </button>)) : <StateView compact kind="empty" title="No alerts match" body="Quiet is good." />}</Section>
            {expanded && <div className="sticky top-0 h-fit rounded-3xl bg-s1 p-5 hairline">{sel ? <AlertDetail a={sel} onState={setAlert} /> : <p className="text-sm text-ink-3">Select an alert to see details.</p>}</div>}
          </div>
          {!expanded && <Sheet open={!!sel} onClose={() => setSel(null)} title="Alert">{sel && <AlertDetail a={sel} onState={setAlert} />}</Sheet>}
        </>) : (<>
          <Section title="Sources" footer="Health reflects the last event received. Locat doesn't verify that external tools are configured correctly.">{FIXTURE_SOURCES.map((s) => (
            <ListRow key={s.id} icon={Radio} title={s.name} subtitle={s.lastEventAt ? `Last event ${relTime(s.lastEventAt)}` : "No events received yet"}
              trailing={<Badge tone={s.health === "receiving" ? "ok" : s.health === "error" ? "danger" : s.health === "silent" ? "warn" : "neutral"} dot>{s.health.replace("-", " ")}</Badge>} />))}</Section>
          <Section title="Webhook tokens" action={<Button size="sm" variant="quiet" icon={Plus} onClick={() => setNewTok(true)} data-testid="new-token">New token</Button>} footer="Tokens are scoped to alert ingestion only and are shown once at creation.">{FIXTURE_TOKENS.map((t) => (
            <ListRow key={t.id} icon={KeyRound} title={t.label} subtitle={`${t.prefix} · ${t.scope} · ${t.lastUsedAt ? `used ${relTime(t.lastUsedAt)}` : "never used"}`}
              trailing={t.revoked ? <Badge>Revoked</Badge> : <IconButton icon={Trash2} tone="danger" label={`Revoke ${t.label}`} onClick={async () => report(await adapter.sentinel.revokeToken(t.id), "Revoked")} data-testid={`revoke-${t.id}`} />} />))}</Section>
          <Section title="Endpoint"><ListRow icon={Webhook} title={<span className="font-mono text-xs">POST /api/sentinel/webhook</span>} subtitle="Authorization: Bearer <token>" trailing={<IconButton icon={Copy} label="Copy endpoint" size="sm" onClick={() => navigator.clipboard?.writeText("/api/sentinel/webhook").catch(() => undefined)} />} /></Section>
          <Banner tone="planned" title="Generic outbound automation webhooks are planned">Today's webhooks are inbound Sentinel alert ingestion only (#10).</Banner>
        </>)}
      </div>
      <Sheet open={newTok} onClose={() => setNewTok(false)} title="New integration token" size="sm" footer={<Button variant="primary" disabledReason={!label.trim() ? "Name the token" : null} onClick={async () => { report(await adapter.sentinel.createToken(label, "alerts:write"), "Token created"); setNewTok(false); }} data-testid="create-token">Create</Button>}>
        <TextField label="Label" value={label} onChange={(e) => setLabel(e.target.value)} hint="e.g. nScout edge sensor" />
        <p className="mt-3 text-xs text-ink-3">Scope: alerts:write. The secret is displayed once — store it in your tool's configuration.</p>
      </Sheet>
    </Screen>
  );
}
