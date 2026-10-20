import { useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router";
import { MessageCircle } from "lucide-react";
import type { ContactView, ConversationView, MessageView } from "@/contracts/messaging";
import { useSession, useViewport } from "@/app/session";
import { useReport } from "@/app/feedback";
import { FIXTURE_CONTACTS, FIXTURE_CONVERSATIONS, FIXTURE_MESSAGES, FIXTURE_SCHEDULED } from "@/fixtures/data";
import { ActionMenu, StateView } from "@/ui";
import { useContextMenu, type MenuItem } from "@/ui/ContextMenu";
import { LARGE, makeMessages } from "@/fixtures/large";
import { Inbox } from "./Inbox";
import { Conversation } from "./Conversation";
import { ContactsSheet, ConversationInfoSheet, NewConversationSheet, ProfileSheet, ScheduledSheet } from "./Sheets";
import { BellOff, EyeOff, Pin, Eye } from "lucide-react";

/**
 * Messenger container. Phone: list → full-screen conversation route.
 * Tablet/desktop: persistent two-pane layout. Data comes from fixtures here;
 * live integration replaces these with Locat Chat.tsx state projections.
 */
export default function Messages() {
  const { pathname } = useLocation();
  const [params, setParams] = useSearchParams();
  const nav = useNavigate();
  const { compact } = useViewport();
  const { adapter, prefs } = useSession();
  const ctx = useContextMenu();
  const report = useReport();
  const id = pathname.split("/")[2];
  const [conversations, setConversations] = useState<ConversationView[]>(FIXTURE_CONVERSATIONS);
  const [messages, setMessages] = useState<MessageView[]>(() => (prefs.largeConversation ? [...FIXTURE_MESSAGES.filter((m) => m.conversationId !== "c-studio"), ...makeMessages("c-studio", LARGE.messages)] : FIXTURE_MESSAGES));
  const [sheetState, setSheetState] = useState<"contacts" | "new" | "scheduled" | "info" | null>(null);
  const sheet = params.has("compose") ? "new" : sheetState;
  const setSheet = (s: typeof sheetState) => { setSheetState(s); if (params.has("compose")) setParams({}, { replace: true }); };
  const [profile, setProfile] = useState<ContactView | null>(null);
  const [menu, setMenu] = useState<ConversationView | null>(null);
  const active = conversations.find((c) => c.id === id);

  // Opening a conversation marks it read (state adjusted during render, no effect cascade).
  if (active?.unread) setConversations((l) => l.map((c) => (c.id === active.id ? { ...c, unread: 0 } : c)));

  const convAction = async (c: ConversationView, action: "mute" | "unmute" | "pin" | "unpin" | "hide" | "unhide") => {
    const res = await adapter.messaging.conversationAction(c.id, action);
    if (res.status === "integration-pending") {
      const patch = { mute: { muted: true }, unmute: { muted: false }, pin: { pinned: true }, unpin: { pinned: false }, hide: { hidden: true }, unhide: { hidden: false } }[action];
      setConversations((l) => l.map((x) => (x.id === c.id ? { ...x, ...patch } : x)));
    }
    report(res, "Updated");
  };

  const convItems = (c: ConversationView): MenuItem[] => [
        { id: "pin-conv", label: c.pinned ? "Unpin" : "Pin", icon: Pin, onSelect: () => convAction(c, c.pinned ? "unpin" : "pin") },
        { id: "mute-conv", label: c.muted ? "Unmute" : "Mute", icon: BellOff, onSelect: () => convAction(c, c.muted ? "unmute" : "mute") },
        { id: "hide-conv", label: c.hidden ? "Unhide" : "Hide on this device", icon: c.hidden ? Eye : EyeOff, onSelect: () => convAction(c, c.hidden ? "unhide" : "hide") },
      ];
  const inbox = <Inbox conversations={conversations} activeId={id} requests={FIXTURE_CONTACTS.filter((c) => c.relation === "incoming").length}
    onOpen={(cid) => nav(`/messages/${cid}`)} onCompose={() => setSheet("new")} onContacts={() => setSheet("contacts")} onScheduled={() => setSheet("scheduled")} onLongPress={(c, at) => (at && !compact ? ctx.openAt(at.x, at.y, c.title, convItems(c)) : setMenu(c))} />;
  const convo = active ? <Conversation key={active.id} conversation={active} messages={messages.filter((m) => m.conversationId === active.id)} onBack={compact ? () => nav("/messages") : undefined}
    onInfo={() => setSheet("info")} onLocalMessages={(next) => setMessages((all) => [...all.filter((m) => m.conversationId !== active.id), ...next])} /> : null;

  return (
    <div className="flex h-full min-h-0" data-testid="messages-screen">
      {compact ? (id ? convo ?? <StateView kind="empty" title="Conversation not found" /> : <div className="min-w-0 flex-1">{inbox}</div>) : (
        <>
          <div className="w-[340px] shrink-0 border-r border-line lg:w-[380px]">{inbox}</div>
          <div className="min-w-0 flex-1">{convo ?? <StateView kind="empty" title="Choose a conversation" body="Messages are decrypted only on your devices. Press Ctrl+K to jump anywhere." className="h-full justify-center" action={<MessageCircle className="hidden" />} />}</div>
        </>
      )}
      <ContactsSheet open={sheet === "contacts"} onClose={() => setSheet(null)} contacts={FIXTURE_CONTACTS} onProfile={(c) => { setSheet(null); setProfile(c); }} />
      <NewConversationSheet open={sheet === "new"} onClose={() => setSheet(null)} contacts={FIXTURE_CONTACTS} onStart={(cid) => { const c = conversations.find((x) => x.peer?.id === cid); if (c) nav(`/messages/${c.id}`); }} />
      <ScheduledSheet open={sheet === "scheduled"} onClose={() => setSheet(null)} items={FIXTURE_SCHEDULED} />
      <ConversationInfoSheet conversation={sheet === "info" ? active ?? null : null} onClose={() => setSheet(null)} />
      <ProfileSheet contact={profile} onClose={() => setProfile(null)} />
      <ActionMenu open={!!menu} onClose={() => setMenu(null)} title={menu?.title ?? ""} actions={menu ? convItems(menu) : []} />
    </div>
  );
}
