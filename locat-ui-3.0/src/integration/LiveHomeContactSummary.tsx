import { useCallback, useEffect, useState } from "react";
import { Button } from "../ui";
import { accountRequest } from "./accountRequest";

type Contact = { status: "pending" | "accepted"; direction: "incoming" | "outgoing" };
type Counts = { contacts: number; requests: number };

export function LiveHomeContactSummary({ accountId, onOpenMessages }: { accountId: string; onOpenMessages(): void }) {
  const [counts, setCounts] = useState<Counts | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const load = useCallback(async (signal: AbortSignal) => {
    setCounts(null);
    setError("");
    try {
      const data = await accountRequest("/api/contacts", accountId, undefined, signal);
      if (signal.aborted) return;
      const contacts = data.contacts as Contact[];
      setCounts({
        contacts: contacts.filter(contact => contact.status === "accepted").length,
        requests: contacts.filter(contact => contact.status === "pending" && contact.direction === "incoming").length,
      });
    } catch (reason) {
      if (!signal.aborted) setError(reason instanceof Error ? reason.message : "Contact summary is unavailable.");
    }
  }, [accountId]);
  useEffect(() => {
    const control = new AbortController();
    void Promise.resolve().then(() => { if (!control.signal.aborted) void load(control.signal); });
    return () => control.abort();
  }, [attempt, load]);

  return <section className="rounded-3xl border border-line bg-s1/60 p-4 hairline" aria-label="Contact summary">
    <h2 className="text-sm font-bold">Your network</h2>
    {counts ? <>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-2xl bg-s2 p-3"><p className="text-2xl font-extrabold tabular-nums">{counts.contacts}</p><p className="text-xs text-ink-3">Accepted contacts</p></div>
        <div className="rounded-2xl bg-s2 p-3"><p className="text-2xl font-extrabold tabular-nums">{counts.requests}</p><p className="text-xs text-ink-3">Incoming requests</p></div>
      </div>
      <Button className="mt-3" size="sm" variant="ghost" onClick={onOpenMessages}>Open Messages</Button>
    </> : error ? <div className="mt-2 space-y-2"><p role="alert" className="text-xs text-danger">{error}</p><Button size="sm" variant="ghost" onClick={() => setAttempt(value => value + 1)}>Retry</Button></div>
      : <p role="status" className="mt-3 text-xs text-ink-3">Loading contact summary…</p>}
  </section>;
}
