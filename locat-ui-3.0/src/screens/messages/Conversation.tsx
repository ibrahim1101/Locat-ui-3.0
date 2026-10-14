import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Copy, CornerUpRight, Eye, EyeOff, Info, Pencil, Phone, Pin, Reply, RotateCw, Search, SmilePlus, Trash2, Undo2, Video } from "lucide-react";
import type { ComposerDraft, ConversationView, MessageAction, MessageView } from "@/contracts/messaging";
import { useSession, useViewport } from "@/app/session";
import { useDropTarget } from "@/app/drop";
import { VirtualList, type VirtualListHandle } from "@/ui/Virtual";
import { useContextMenu, type MenuItem } from "@/ui/ContextMenu";
import { useReport } from "@/app/feedback";
import { ActionMenu, Avatar, IconButton, SearchField, cn, relTime } from "@/ui";
import { MessageBubble } from "./MessageBubble";
import { Composer } from "./Composer";
import { LIMITS, composerCapabilities } from "./capabilities";
import { LocationSheet, ScheduleSheet } from "./Sheets";

const REACTIONS = ["👍", "❤️", "😂", "🔥", "😮", "🙏"];

export function Conversation({ conversation: c, messages, onBack, onInfo, onLocalMessages }: {
  conversation: ConversationView; messages: MessageView[]; onBack?: () => void; onInfo(): void;
  /** Fixture-only mutation hook (preview). Live integration re-renders from Locat state instead. */
  onLocalMessages(next: MessageView[]): void;
}) {
  const { adapter, connection } = useSession();
  const report = useReport();
  const [draft, setDraft] = useState<ComposerDraft>({ text: "" });
  const [menuFor, setMenuFor] = useState<MessageView | null>(null);
  const [hiddenView, setHiddenView] = useState(false);
  const [find, setFind] = useState<string | null>(null);
  const [sheet, setSheet] = useState<"schedule" | "location" | null>(null);
  const list = useRef<VirtualListHandle>(null);
  const ctx = useContextMenu();
  const { compact } = useViewport();
  const online = connection.mode === "server" && connection.server === "connected";
  const cap = composerCapabilities(c, { hiddenView, online });
  const visible = useMemo(() => messages.filter((m) => (hiddenView ? m.hidden : !m.hidden)).filter((m) => !find || m.text?.toLowerCase().includes(find.toLowerCase())), [messages, hiddenView, find]);
  const replyTo = messages.find((m) => m.id === draft.replyToId);
  const editing = messages.find((m) => m.id === draft.editingId);
  const pinned = messages.filter((m) => m.pinned && !m.hidden);

  useEffect(() => { adapter.messaging.saveDraft(c.id, draft); }, [adapter, c.id, draft]);

  const send = async () => {
    const res = await adapter.messaging.send(c.id, draft);
    if (res.status === "integration-pending") {
      if (editing) onLocalMessages(messages.map((m) => (m.id === editing.id ? { ...m, text: draft.text, editedAt: Date.now() } : m)));
      else onLocalMessages([...messages, { id: "local-" + Date.now(), conversationId: c.id, authorId: "u-self", authorName: "You", mine: true, text: draft.text, createdAt: Date.now(), delivery: "preview-local",
        replyTo: replyTo ? { id: replyTo.id, authorName: replyTo.authorName, excerpt: replyTo.text ?? "Attachment", state: "ok" } : undefined }]);
    }
    report(res, "Sent");
    setDraft({ text: "" });
  };

  const act = async (m: MessageView, action: MessageAction, arg?: string) => {
    if (action === "reply") return setDraft({ ...draft, replyToId: m.id, editingId: undefined });
    if (action === "edit") return setDraft({ text: m.text ?? "", editingId: m.id });
    if (action === "copy") { await navigator.clipboard?.writeText(m.text ?? "").catch(() => undefined); return; }
    const res = await adapter.messaging.messageAction(m.id, action, arg);
    // Preview: reflect device-local organization in fixtures so the flow can be reviewed.
    if (res.status === "integration-pending") {
      const patch: Partial<MessageView> | null = action === "hide" ? { hidden: true } : action === "restore" ? { hidden: false } : action === "pin" ? { pinned: true } : action === "unpin" ? { pinned: false } : action === "delete-everyone" ? { deletedForEveryone: true, text: undefined, attachment: undefined } : null;
      if (action === "delete-self") onLocalMessages(messages.filter((x) => x.id !== m.id));
      else if (patch) onLocalMessages(messages.map((x) => (x.id === m.id ? { ...x, ...patch } : x)));
    }
    report(res, "Done");
  };

  const itemsFor = (m: MessageView): MenuItem[] => [
        ...REACTIONS.slice(0, 1).map(() => ({ id: "react", label: `React  ${REACTIONS.join(" ")}`, icon: SmilePlus, onSelect: () => act(m, "react", "👍"), disabledReason: m.deletedForEveryone ? "Deleted" : undefined })),
        { id: "reply", label: "Reply", icon: Reply, onSelect: () => act(m, "reply"), disabledReason: !cap.text.enabled || cap.replacedBy ? "Can't send here" : undefined },
        { id: "forward", label: "Forward", icon: CornerUpRight, onSelect: () => act(m, "forward") },
        { id: "copy", label: "Copy text", icon: Copy, onSelect: () => act(m, "copy"), disabledReason: m.text ? undefined : "No text" },
        { id: "pin", label: m.pinned ? "Unpin for everyone" : "Pin for everyone", icon: Pin, onSelect: () => act(m, m.pinned ? "unpin" : "pin") },
        { id: "edit", label: "Edit", icon: Pencil, onSelect: () => act(m, "edit"), disabledReason: !m.mine ? "Only your messages" : !m.text ? "Only text can be edited" : undefined },
        { id: "hide", label: m.hidden ? "Restore to conversation" : "Hide on this device", icon: m.hidden ? Undo2 : EyeOff, onSelect: () => act(m, m.hidden ? "restore" : "hide") },
        ...(m.delivery === "failed" ? [{ id: "retry", label: "Retry sending", icon: RotateCw, onSelect: () => act(m, "retry") }] : []),
        { id: "delete-self", label: "Delete for me", icon: Trash2, tone: "danger" as const, onSelect: () => act(m, "delete-self") },
        { id: "delete-everyone", label: "Delete for everyone", icon: Trash2, tone: "danger" as const, onSelect: () => act(m, "delete-everyone"), disabledReason: !m.mine ? "Only your messages" : m.deletedForEveryone ? "Already deleted" : undefined },
      ];
  const jump = (id: string) => {
    const i = visible.findIndex((x) => x.id === id); if (i < 0) return;
    list.current?.scrollToIndex(i);
    setTimeout(() => document.getElementById(`msg-${id}`)?.animate([{ background: "rgb(var(--ember) / .18)" }, { background: "transparent" }], { duration: 1200 }), 80);
  };
  const openMenu = (m: MessageView, at?: { x: number; y: number; pointer: "mouse" | "keyboard" }) => { if (at && !compact) ctx.openAt(at.x, at.y, "Message", itemsFor(m), at.pointer); else setMenuFor(m); };
  useDropTarget(cap.file.enabled && !cap.replacedBy ? { id: `conv-${c.id}`, label: `Attach to ${c.title}`, detail: "Encrypted on this device · up to 2.9 MB per file", maxBytes: LIMITS.maxPayloadBytes, onDrop: (files) => adapter.messaging.attachFiles(c.id, files) } : null);

  const m = menuFor;
  const presence = c.peer ? (c.peer.presence.state === "online" ? "Online" : c.peer.presence.state === "hidden" ? "Last seen hidden" : (c.peer.presence.lastSeenAt ? `Last seen ${relTime(c.peer.presence.lastSeenAt)}` : "Last seen recently")) : `${c.memberCount} members`;

  return (
    <div className="flex h-full min-h-0 flex-col bg-canvas" data-testid="conversation">
      <header className="shrink-0 border-b border-line bg-canvas/90 pt-safe backdrop-blur-xl md:pt-0">
        <div className="flex h-16 items-center gap-1 px-2 md:h-[68px] md:px-4">
          {onBack && <IconButton icon={ArrowLeft} label="Back to conversations" onClick={onBack} data-testid="conversation-back" />}
          <button onClick={onInfo} className="flex min-w-0 flex-1 items-center gap-3 rounded-xl px-1.5 py-1 text-left hover:bg-s1" data-testid="conversation-header" aria-label={`${c.title} details`}>
            <Avatar name={c.title} group={c.kind === "group"} presence={c.peer?.presence.state} size={40} />
            <span className="min-w-0"><span className="block truncate text-[15px] font-bold">{c.title}</span>
              <span className="block truncate text-xs text-ink-3">{c.typing?.length ? <span className="text-ember">{c.typing.join(", ")} is typing…</span> : presence}</span></span>
          </button>
          <IconButton icon={Phone} label="Voice call" disabledReason="Voice calls are planned (#9)" />
          <IconButton icon={Video} label="Video call" disabledReason="Video calls are planned (#9)" className="hidden sm:grid" />
          <IconButton icon={Search} label="Find in conversation" onClick={() => setFind(find === null ? "" : null)} active={find !== null} data-testid="conversation-find" />
          <IconButton icon={hiddenView ? Eye : EyeOff} label={hiddenView ? "Show regular messages" : "Show hidden messages"} active={hiddenView} onClick={() => setHiddenView(!hiddenView)} data-testid="toggle-hidden-messages" />
          <IconButton icon={Info} label="Conversation details" onClick={onInfo} className="hidden md:grid" />
        </div>
        {find !== null && <div className="px-4 pb-3"><SearchField autoFocus value={find} onChange={setFind} placeholder="Find text in this conversation (this device)" /></div>}
        {pinned.length > 0 && !hiddenView && (
          <button onClick={() => jump(pinned[pinned.length - 1].id)} className="flex w-full items-center gap-2 border-t border-line px-4 py-2 text-left text-xs hover:bg-s1" data-testid="pinned-bar">
            <Pin className="size-3.5 text-ember" /><span className="font-bold">Pinned</span><span className="min-w-0 flex-1 truncate text-ink-2">{pinned[pinned.length - 1].text}</span>
          </button>)}
        {hiddenView && <p className="border-t border-line bg-s1 px-4 py-2 text-xs text-ink-2">Hidden messages · stored only on this device and excluded from previews and search.</p>}
      </header>

      <VirtualList ref={list} items={visible} getKey={(m) => m.id} estimateSize={72} stickToBottom role="log" ariaLabel="Messages" testId="message-list"
        className="mesh flex-1 py-3" innerClassName="mx-auto max-w-3xl"
        header={<><p className="mx-auto mb-4 w-fit rounded-full bg-s1 px-3 py-1 text-2xs font-semibold text-ink-3 hairline">🔒 End-to-end encrypted · keys never leave your devices</p>
          {visible.length === 0 && <p className="py-10 text-center text-sm text-ink-3">{hiddenView ? "No hidden messages." : find ? "No messages match." : "Say hello — your first message starts the encrypted session."}</p>}</>}
        renderItem={(msg, i) => {
          const prev = visible[i - 1];
          const grouped = !!prev && !prev.system && prev.mine === msg.mine && prev.authorId === msg.authorId && msg.createdAt - prev.createdAt < 5 * 60_000;
          return <div className="px-3 md:px-8"><MessageBubble m={msg} grouped={grouped} showAuthor={c.kind === "group" && !grouped} onMenu={openMenu} onJump={jump} onRetry={(x) => act(x, "retry")} /></div>;
        }} />

      <Composer draft={draft} capabilities={cap} replyTo={replyTo} editing={editing} onDraft={setDraft} onSend={send} onCancelContext={() => setDraft({ text: "" })}
        onSchedule={() => setSheet("schedule")} onVoice={async () => report(await adapter.messaging.send(c.id, { text: "" }), "Voice message sent")}
        onAttach={async (k) => { if (k === "location") setSheet("location"); else report(await adapter.messaging.send(c.id, { text: `[${k}]` }), "Sent"); }} />

      <ActionMenu open={!!m} onClose={() => setMenuFor(null)} title="Message" actions={m ? itemsFor(m) : []} />
      {menuFor && <p className="sr-only" aria-live="polite">Delete for everyone can't recall copies already saved by recipients or older backups.</p>}
      <ScheduleSheet open={sheet === "schedule"} onClose={() => setSheet(null)} conversation={c} initialText={draft.text} />
      <LocationSheet open={sheet === "location"} onClose={() => setSheet(null)} conversation={c} />
      <span className={cn("hidden")} />
    </div>
  );
}
