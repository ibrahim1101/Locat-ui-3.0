import { useMemo, useState } from "react";
import { BellOff, EyeOff, Pin, SquarePen, UserPlus, Users, CalendarClock, Lock } from "lucide-react";
import type { ConversationView } from "@/contracts/messaging";
import { Avatar, Badge, ChipRow, IconButton, SearchField, StateView, Button, cn, relTime } from "@/ui";

type Filter = "all" | "unread" | "groups" | "hidden";

export function Inbox({ conversations, activeId, requests, onOpen, onCompose, onContacts, onScheduled, onLongPress }: {
  conversations: ConversationView[]; activeId?: string; requests: number;
  onOpen(id: string): void; onCompose(): void; onContacts(): void; onScheduled(): void; onLongPress(c: ConversationView, at?: { x: number; y: number }): void;
}) {
  const [q, setQ] = useState("");
  const [f, setF] = useState<Filter>("all");
  const list = useMemo(() => conversations
    .filter((c) => (f === "hidden" ? c.hidden : !c.hidden))
    .filter((c) => f !== "unread" || c.unread > 0).filter((c) => f !== "groups" || c.kind === "group")
    .filter((c) => !q || c.title.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => Number(b.pinned) - Number(a.pinned) || (b.lastAt ?? 0) - (a.lastAt ?? 0)), [conversations, f, q]);
  const hiddenCount = conversations.filter((c) => c.hidden).length;

  return (
    <div className="flex h-full min-h-0 flex-col" data-testid="inbox">
      <header className="shrink-0 pt-safe md:pt-0">
        <div className="flex h-16 items-center gap-1 px-4 md:h-[68px]">
          <h1 className="flex-1 text-xl font-extrabold tracking-tight md:text-[22px]">Messages</h1>
          <IconButton icon={CalendarClock} label="Scheduled messages" onClick={onScheduled} data-testid="open-scheduled" />
          <span className="relative"><IconButton icon={UserPlus} label="Contacts and requests" onClick={onContacts} data-testid="open-contacts" />{requests > 0 && <span className="pointer-events-none absolute right-1.5 top-1.5 grid size-4 place-items-center rounded-full bg-ember text-[10px] font-bold text-ember-ink">{requests}</span>}</span>
          <IconButton icon={SquarePen} label="New conversation" tone="ember" onClick={onCompose} data-testid="new-conversation" />
        </div>
        <div className="px-4"><SearchField value={q} onChange={setQ} placeholder="Search conversations" testId="inbox-search" /></div>
        <ChipRow className="px-4" label="Filter conversations" value={f} onChange={setF} options={[{ value: "all", label: "All" }, { value: "unread", label: "Unread" }, { value: "groups", label: "Groups" }, { value: "hidden", label: "Hidden", count: hiddenCount }]} />
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-4" role="list" aria-label="Conversations">
        {f === "hidden" && <p className="mx-2 mb-2 flex items-center gap-2 rounded-xl bg-s1 p-3 text-xs text-ink-2 hairline"><Lock className="size-4 shrink-0" />Hidden chats are a device-only organization choice. They aren't encrypted separately and still receive notifications.</p>}
        {list.length === 0 && (q ? <StateView compact kind="empty" title="No matches" body="Conversation search only checks titles here. Message search is in Search." /> :
          <StateView compact kind="empty" title={f === "hidden" ? "Nothing hidden" : "No conversations yet"} body={f === "hidden" ? undefined : "Find people by username or their LC code to start an encrypted chat."} action={f === "all" ? <Button variant="primary" onClick={onContacts} icon={UserPlus}>Find people</Button> : undefined} />)}
        {list.map((c) => (
          <button key={c.id} role="listitem" onClick={() => onOpen(c.id)} onContextMenu={(e) => { e.preventDefault(); onLongPress(c, e.clientX || e.clientY ? { x: e.clientX, y: e.clientY } : undefined); }} data-testid={`conversation-${c.id}`}
            className={cn("flex w-full items-center gap-3 rounded-2xl px-2.5 py-2.5 text-left transition-colors", activeId === c.id ? "bg-s2" : "hover:bg-s1")}>
            <Avatar name={c.title} group={c.kind === "group"} presence={c.peer?.presence.state} size={50} />
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5">
                <span className="truncate text-[15px] font-bold">{c.title}</span>
                {c.kind === "group" && <Users className="size-3.5 shrink-0 text-ink-3" aria-label="Group" />}
                {c.muted && <BellOff className="size-3.5 shrink-0 text-ink-3" aria-label="Muted" />}
                {c.hidden && <EyeOff className="size-3.5 shrink-0 text-ink-3" aria-label="Hidden" />}
                <span className="ml-auto shrink-0 pl-2 text-2xs text-ink-3 tabular">{c.lastAt ? relTime(c.lastAt) : ""}</span>
              </span>
              <span className="mt-0.5 flex items-center gap-2">
                <span className={cn("min-w-0 flex-1 truncate text-[13px]", c.unread ? "text-ink" : "text-ink-3", c.state !== "active" && "italic")}>
                  {c.typing?.length ? <span className="text-ember">typing…</span> : c.lastPreview}
                </span>
                {c.pinned && <Pin className="size-3.5 shrink-0 text-ink-3" aria-label="Pinned" />}
                {c.unread > 0 && <Badge tone="ember" className="h-5 min-w-5 justify-center px-1.5">{c.unread}</Badge>}
              </span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
