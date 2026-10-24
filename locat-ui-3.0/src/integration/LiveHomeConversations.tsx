import { useEffect, useState } from "react";
import { Avatar, Button } from "@/ui";
import { accountRequest } from "./accountRequest";
import { useMatrixOwner } from "./matrixOwnerContext";

type ContactList = { contacts: Array<{ status: string; user: { id: string; displayName: string } }> };
type RecentConversation = { accountId: string; preview: string; updatedAt: number };
type LoadResult = { handle: NonNullable<ReturnType<typeof useMatrixOwner>>["handle"]; generation: number; state: "ready" | "error"; items: Array<RecentConversation & { displayName: string }>; error: string };

export function LiveHomeConversations({ accountId, onOpen }: { accountId: string; onOpen(accountId: string): void }) {
  const handle = useMatrixOwner()?.handle ?? null;
  const [generation, setGeneration] = useState(0);
  const [result, setResult] = useState<LoadResult | null>(null);
  const activeHandle = handle && !handle.closed && handle.accountId === accountId ? handle : null;

  useEffect(() => {
    if (!activeHandle) return;
    const controller = new AbortController();
    let active = true;
    void Promise.all([
      accountRequest("/api/contacts", accountId, undefined, controller.signal) as Promise<ContactList>,
      activeHandle.recentConversations(),
    ]).then(([data, summaries]) => {
      if (!active || controller.signal.aborted || activeHandle.closed) return;
      const contacts = new Map(data.contacts.filter(contact => contact.status === "accepted").map(contact => [contact.user.id, contact.user.displayName]));
      const items = summaries.flatMap(summary => {
        const displayName = contacts.get(summary.accountId);
        return displayName ? [{ ...summary, displayName }] : [];
      });
      setResult({ handle: activeHandle, generation, state: "ready", items, error: "" });
    }).catch(reason => {
      if (!active || controller.signal.aborted || activeHandle.closed) return;
      setResult({ handle: activeHandle, generation, state: "error", items: [], error: reason instanceof Error ? reason.message : "Recent conversations are unavailable." });
    });
    return () => { active = false; controller.abort(); };
  }, [accountId, generation, activeHandle]);

  if (!activeHandle) return <p className="rounded-2xl bg-s1 p-4 text-sm text-ink-3 hairline">Keep messaging active in Settings to show locally decrypted conversations here.</p>;
  const current = result?.handle === activeHandle && result.generation === generation ? result : null;
  if (!current) return <p role="status" className="rounded-2xl bg-s1 p-4 text-sm text-ink-3 hairline">Loading encrypted conversation summaries from this device…</p>;
  if (current.state === "error") return <div className="rounded-2xl bg-s1 p-4 hairline"><p role="alert" className="text-sm text-danger">{current.error}</p><Button className="mt-3" size="sm" variant="ghost" onClick={() => setGeneration(value => value + 1)}>Retry summaries</Button></div>;
  if (!current.items.length) return <p className="rounded-2xl bg-s1 p-4 text-sm text-ink-3 hairline">No decrypted conversation messages are available on this device yet.</p>;
  return <div className="divide-y divide-line overflow-hidden rounded-2xl bg-s1 hairline">{current.items.map(item => (
    <button key={item.accountId} type="button" onClick={() => onOpen(item.accountId)} className="flex w-full items-center gap-3 p-3 text-left hover:bg-s2" data-testid={`home-conversation-${item.accountId}`}>
      <Avatar name={item.displayName} />
      <span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold">{item.displayName}</span><span className="block truncate text-[13px] text-ink-2">{item.preview}</span></span>
      <time className="shrink-0 text-2xs text-ink-3" dateTime={new Date(item.updatedAt).toISOString()}>{new Date(item.updatedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</time>
    </button>
  ))}</div>;
}
