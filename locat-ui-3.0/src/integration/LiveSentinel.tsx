import { useEffect, useState } from "react";
import { Screen } from "../layouts/Screen";
import { Badge, Button, StateView } from "../ui";
type SecurityEvent = { id: number; event: string; severity: string; createdAt: number };
export function LiveSentinel() {
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  async function load() {
    const response = await fetch("/api/security/events", { credentials: "same-origin", cache: "no-store" });
    const data = await response.json(); if (!response.ok) throw new Error(data.error ?? "Could not load events"); return data.events as SecurityEvent[];
  }
  useEffect(() => { let active = true; void load().then(events => { if (active) setEvents(events); }).catch(error => { if (active) setError(error.message); }).finally(() => { if (active) setLoading(false); }); return () => { active = false; }; }, []);
  return <Screen title="Sentinel" subtitle="Real account security events" actions={<Button onClick={() => void load().then(events => { setEvents(events); setError(""); }).catch(error => setError(error.message))}>Refresh</Button>}>
    <div className="mx-auto max-w-5xl space-y-3"><p className="mb-5 text-sm text-ink-3">Latest 100 events for your account. This records login, password and session activity; device monitoring and webhooks are pending.</p>{error && <p role="alert" className="text-danger">{error}</p>}{loading ? <p role="status">Loading events…</p> : events.length ? events.map(event => <article key={event.id} className="flex items-center gap-3 rounded-xl bg-s1 p-4 hairline"><Badge tone={event.severity === "warn" ? "warn" : "neutral"}>{event.severity}</Badge><p className="flex-1 font-semibold">{event.event.replaceAll(".", " ")}</p><time className="text-xs text-ink-3" dateTime={new Date(event.createdAt).toISOString()}>{new Date(event.createdAt).toLocaleString()}</time></article>) : <StateView kind="empty" title="No security events yet" />}</div>
  </Screen>;
}
