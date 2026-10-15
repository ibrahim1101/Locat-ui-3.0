import {AccountActivityPanel} from './AccountActivityPanel';
import { useCallback, useEffect, useState } from "react";
import { Screen } from "../layouts/Screen";
import { Badge, Button, Sheet, StateView, TextField } from "../ui";
type Incident = { id: string; title: string; description: string; source: string; severity: string; status: string; occurrences: number; updatedAt: number };
type Token = { id: string; name: string; prefix: string; revokedAt: number | null };
type History = { id: number; action: string; note: string; createdAt: number };
async function request(path: string, input?: unknown) {
  const response = await fetch(path, { credentials: "same-origin", cache: "no-store", ...(input === undefined ? {} : { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) }) });
  const data = await response.json(); if (!response.ok) throw new Error(data.error ?? "Sentinel request failed"); return data;
}
export function LiveSentinel() {
  const [activityRefresh,setActivityRefresh]=useState(0);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [tokens, setTokens] = useState<Token[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState("incidents");
  const [filter, setFilter] = useState("");
  const [selected, setSelected] = useState<Incident | null>(null);
  const [history, setHistory] = useState<History[]>([]);
  const [note, setNote] = useState("");
  const [tokenSheet, setTokenSheet] = useState(false);
  const [name, setName] = useState("");
  const [secret, setSecret] = useState("");
  const [revoke, setRevoke] = useState<Token | null>(null);
  async function load() {
    const [alerts, keys] = await Promise.all([request("/api/sentinel/incidents"), request("/api/sentinel/tokens")]);
    return { incidents: alerts.incidents as Incident[], tokens: keys.tokens as Token[] };
  }
  const apply = useCallback((data: Awaited<ReturnType<typeof load>>) => { setIncidents(data.incidents); setTokens(data.tokens); }, []);
  useEffect(() => { let active = true; void load().then(data => { if (active) apply(data); }).catch(error => { if (active) setError(error.message); }).finally(() => { if (active) setLoading(false); }); return () => { active = false; }; }, [apply]);
  async function run(task: () => Promise<void>) { setBusy(true); setError(""); try { await task(); } catch (error) { setError(error instanceof Error ? error.message : "Sentinel request failed"); } finally { setBusy(false); } }
  async function openIncident(id: string) { const detail = await request("/api/sentinel/incidents/" + id); setSelected(detail.incident); setHistory(detail.events); setNote(""); }
  async function action(value: string) { if (!selected) return; await request("/api/sentinel/incidents/" + selected.id, { action: value, ...(value === "note" ? { note } : {}) }); await openIncident(selected.id); apply(await load()); }
  const visible = incidents.filter(item => !filter || item.status === filter);
  return <Screen title="Sentinel" subtitle="Incidents, integrations and account security" actions={<Button disabled={busy} onClick={() => tab==='account activity'?setActivityRefresh(value=>value+1):void run(async () => apply(await load()))}>Refresh</Button>}>
    <div className="mx-auto max-w-5xl space-y-4">
      <p className="text-sm text-ink-3">Account-owned alerts from generic, nScout and PipelineGuard webhooks. Incident text is readable by this server. Device monitoring and external notification delivery are pending.</p>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Sentinel sections">{["incidents", "integrations", "account activity"].map(value => <Button key={value} aria-pressed={tab === value} onClick={() => setTab(value)}>{value}</Button>)}</div>
      {error && <p role="alert" className="text-danger">{error}</p>}
      {loading ? <p role="status">Loading Sentinel…</p> : tab === "incidents" ? <>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Incident status">{["", "open", "acknowledged", "resolved"].map(value => <Button key={value} aria-pressed={filter === value} onClick={() => setFilter(value)}>{value || "All statuses"}</Button>)}</div>
        <p className="text-xs text-ink-3">Latest 100 incidents. Repeated source and fingerprint pairs update the existing alert.</p>
        {visible.length ? visible.map(item => <article key={item.id} className="rounded-xl bg-s1 p-4 hairline"><div className="flex flex-wrap items-center gap-3"><Badge tone={["high", "critical"].includes(item.severity) ? "warn" : "neutral"}>{item.severity}</Badge><h2 className="flex-1 font-semibold">{item.title}</h2><Button disabled={busy} onClick={() => void run(() => openIncident(item.id))}>View incident</Button></div><p className="mt-2 text-sm text-ink-3">{item.source} · {item.status} · {item.occurrences} occurrences · {new Date(item.updatedAt).toLocaleString()}</p></article>) : <StateView kind="empty" title="No incidents in this view" />}
      </> : tab === "integrations" ? <>
        <Button disabled={busy} onClick={() => { setName(""); setSecret(""); setTokenSheet(true); }}>Create integration token</Button>
        <p className="text-sm text-ink-3">POST JSON with a Bearer token to <code>/api/sentinel/webhook?format=generic</code>. Required field: title. Optional: description, severity, source, fingerprint, status. Tokens can only submit incidents for your account. The nscout and pipelineguard format parameters accept the original Locat adapter payloads; real vendor acceptance remains pending.</p>
        {tokens.map(token => <article key={token.id} className="flex flex-wrap items-center gap-3 rounded-xl bg-s1 p-4 hairline"><h2 className="flex-1 font-semibold">{token.name}</h2><code className="text-xs text-ink-3">{token.prefix}…</code>{token.revokedAt ? <Badge>Revoked</Badge> : <Button disabled={busy} onClick={() => setRevoke(token)}>Revoke</Button>}</article>)}
        {!tokens.length && <StateView kind="empty" title="No integrations configured" />}
      </> : <AccountActivityPanel refreshToken={activityRefresh}/>}
    </div>
    <Sheet open={!!selected} onClose={() => { setSelected(null); setNote(""); }} title={selected?.title ?? "Incident"}>
      {selected && <div className="space-y-4"><p className="whitespace-pre-wrap break-words text-sm text-ink-3">{selected.description || "No description"}</p><p className="text-sm">{selected.severity} · {selected.status} · {selected.occurrences} occurrences</p>
        <div className="flex flex-wrap gap-2">{selected.status === "resolved" ? <Button disabled={busy} onClick={() => void run(() => action("reopen"))}>Reopen</Button> : <><Button disabled={busy || selected.status === "acknowledged"} onClick={() => void run(() => action("acknowledge"))}>Acknowledge</Button><Button disabled={busy} onClick={() => void run(() => action("resolve"))}>Resolve</Button></>}</div>
        <form onSubmit={event => { event.preventDefault(); void run(() => action("note")); }} className="space-y-3"><TextField label="Incident note" value={note} maxLength={500} required onChange={event => setNote(event.target.value)} /><Button type="submit" disabled={busy}>Add note</Button></form>
        <h3 className="font-semibold">Latest 200 history entries</h3>{history.map(event => <article key={event.id} className="rounded-xl bg-s2 p-3"><p className="text-sm">{event.action.replaceAll(".", " ")}</p>{event.note && <p className="whitespace-pre-wrap break-words text-sm text-ink-3">{event.note}</p>}<time className="text-xs text-ink-3">{new Date(event.createdAt).toLocaleString()}</time></article>)}
      </div>}
    </Sheet>
    <Sheet open={tokenSheet} onClose={() => { setTokenSheet(false); setSecret(""); }} title="Integration token" size="sm">
      {secret ? <div className="space-y-4"><p className="text-sm text-ink-3">Copy this token now. It is shown once and cleared when this dialog closes. Keep it in your integration's secret store.</p><TextField label="New token" value={secret} readOnly /><Button onClick={() => void run(async () => { await navigator.clipboard.writeText(secret); })}>Copy token</Button></div> : <form className="space-y-4" onSubmit={event => { event.preventDefault(); void run(async () => { const result = await request("/api/sentinel/tokens", { name }); setSecret(result.token); apply(await load()); }); }}><TextField label="Integration name" value={name} maxLength={80} required onChange={event => setName(event.target.value)} /><Button type="submit" disabled={busy}>Create token</Button></form>}
    </Sheet>
    <Sheet open={!!revoke} onClose={() => setRevoke(null)} title="Revoke integration token?" size="sm"><p className="mb-4 text-sm text-ink-3">{revoke?.name} will no longer be able to submit alerts. Existing incidents remain available.</p><Button disabled={busy} onClick={() => void run(async () => { await request("/api/sentinel/tokens/revoke", { id: revoke?.id }); setRevoke(null); apply(await load()); })}>Revoke token</Button></Sheet>
  </Screen>;
}
