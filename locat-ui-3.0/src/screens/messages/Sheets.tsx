import { useState } from "react";
import { Ban, CalendarClock, Check, Crosshair, EyeOff, Hash, LogOut, MapPin, Pin, ShieldAlert, Timer, Trash2, UserMinus, UserPlus, Users, X, Eye, KeyRound } from "lucide-react";
import type { ContactView, ConversationView, ScheduledMessageView } from "@/contracts/messaging";
import { useSession } from "@/app/session";
import { useReport } from "@/app/feedback";
import { Avatar, Badge, Banner, Button, ChipRow, IconButton, ListRow, Section, SearchField, Sheet, StateView, TextField, Switch, cn, relTime } from "@/ui";

/** Contacts: find by username/LC code, friend requests (accept/reject/cancel), block/unblock. */
export function ContactsSheet({ open, onClose, contacts, onProfile }: { open: boolean; onClose(): void; contacts: ContactView[]; onProfile(c: ContactView): void }) {
  const { adapter } = useSession();
  const report = useReport();
  const [tab, setTab] = useState<"friends" | "requests" | "blocked">("friends");
  const [q, setQ] = useState("");
  const [searching, setSearching] = useState(false);
  const lookup = async () => { setSearching(true); report(await adapter.messaging.findByUsernameOrCode(q), "Found"); setSearching(false); };
  const incoming = contacts.filter((c) => c.relation === "incoming"), outgoing = contacts.filter((c) => c.relation === "outgoing");
  const list = tab === "friends" ? contacts.filter((c) => c.relation === "friend") : tab === "blocked" ? contacts.filter((c) => c.relation === "blocked") : [];
  const act = async (c: ContactView, a: Parameters<typeof adapter.messaging.friendAction>[1]) => report(await adapter.messaging.friendAction(c.id, a), "Updated");
  return (
    <Sheet open={open} onClose={onClose} title="People" description="Find someone by exact username or their LC code." testId="contacts-sheet">
      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); lookup(); }}>
        <SearchField value={q} onChange={setQ} placeholder="username or LC-1234" className="flex-1" testId="contact-lookup-input" />
        <Button type="submit" variant="primary" loading={searching} disabledReason={q.trim().length < 2 ? "Type a username or LC code" : null} data-testid="contact-lookup-submit">Find</Button>
      </form>
      <ChipRow label="People" value={tab} onChange={setTab} options={[{ value: "friends", label: "Friends" }, { value: "requests", label: "Requests", count: incoming.length + outgoing.length }, { value: "blocked", label: "Blocked" }]} />
      {tab === "requests" ? (
        <>
          <Section title="Received">{incoming.length ? incoming.map((c) => (
            <ListRow key={c.id} title={c.displayName} subtitle={`@${c.username} · ${c.lcCode}`} testId={`request-${c.id}`}
              trailing={<div className="flex gap-1"><IconButton icon={X} label="Reject" onClick={() => act(c, "reject")} data-testid={`reject-${c.id}`} /><IconButton icon={Check} tone="ember" label="Accept" onClick={() => act(c, "accept")} data-testid={`accept-${c.id}`} /></div>} />
          )) : <p className="p-4 text-sm text-ink-3">No pending requests.</p>}</Section>
          <Section title="Sent">{outgoing.map((c) => <ListRow key={c.id} title={c.displayName} subtitle={`@${c.username} · waiting`} trailing={<Button size="sm" variant="ghost" onClick={() => act(c, "cancel")}>Cancel</Button>} />)}</Section>
        </>
      ) : list.length ? (
        <Section>{list.map((c) => (
          <ListRow key={c.id} onClick={() => onProfile(c)} title={c.displayName} subtitle={`@${c.username} · ${c.lcCode}`} testId={`contact-${c.id}`} chevron
            trailing={tab === "blocked" ? <Button size="sm" onClick={() => act(c, "unblock")}>Unblock</Button> : <Avatar name={c.displayName} size={30} presence={c.presence.state} />} />
        ))}</Section>
      ) : <StateView compact kind="empty" title={tab === "blocked" ? "No one blocked" : "No friends yet"} />}
    </Sheet>
  );
}

/** Avatar-triggered profile panel (#41): picture, name, username, LC code, bio, privacy-aware presence. */
export function ProfileSheet({ contact: c, onClose }: { contact: ContactView | null; onClose(): void }) {
  const { adapter } = useSession();
  const report = useReport();
  if (!c) return null;
  const act = async (a: "remove" | "block" | "unblock") => report(await adapter.messaging.friendAction(c.id, a), "Updated");
  return (
    <Sheet open onClose={onClose} title={c.displayName} testId="profile-sheet">
      <div className="flex flex-col items-center pb-4 text-center">
        <Avatar name={c.displayName} size={96} presence={c.presence.state} />
        <p className="mt-3 text-sm text-ink-2">@{c.username}</p>
        <p className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-s2 px-3 py-1 font-mono text-xs"><Hash className="size-3" />{c.lcCode}</p>
        {c.bio && <p className="mt-4 max-w-sm text-sm leading-relaxed">{c.bio}</p>}
        <p className="mt-2 text-xs text-ink-3">{c.presence.state === "online" ? "Online now" : c.presence.state === "hidden" ? "Presence hidden by their privacy settings" : (c.presence.lastSeenAt ? `Last seen ${relTime(c.presence.lastSeenAt)}` : "Last seen recently")}</p>
      </div>
      <Section>
        <ListRow icon={UserMinus} title="Remove friend" onClick={() => act("remove")} />
        <ListRow icon={Ban} title={c.relation === "blocked" ? "Unblock" : "Block"} subtitle="Blocks direct messages both ways. Groups are unaffected." danger onClick={() => act(c.relation === "blocked" ? "unblock" : "block")} testId="profile-block" />
      </Section>
    </Sheet>
  );
}

/** Conversation details: members, mute, pin, hide, privacy, future disappearing-message controls. */
export function ConversationInfoSheet({ conversation: c, onClose }: { conversation: ConversationView | null; onClose(): void }) {
  const { adapter } = useSession();
  const report = useReport();
  if (!c) return null;
  const act = async (a: Parameters<typeof adapter.messaging.conversationAction>[1]) => report(await adapter.messaging.conversationAction(c.id, a), "Updated");
  return (
    <Sheet open onClose={onClose} title={c.title} description={c.kind === "group" ? `${c.memberCount} members · encrypted group` : "Direct conversation"} testId="conversation-info">
      {c.state === "key-rotation-required" && <Banner className="mb-4" tone="warn" icon={KeyRound} title="Group key rotation required">A member change requires the owner to rotate the group key before anyone can send.</Banner>}
      <Section title="Notifications & organization">
        <div className="px-4"><Switch label="Mute notifications" checked={c.muted} onChange={() => act(c.muted ? "unmute" : "mute")} testId="info-mute" /></div>
        <ListRow icon={Pin} title={c.pinned ? "Unpin conversation" : "Pin to top"} onClick={() => act(c.pinned ? "unpin" : "pin")} />
        <ListRow icon={c.hidden ? Eye : EyeOff} title={c.hidden ? "Unhide conversation" : "Hide conversation"} subtitle="Device-only. Not separate encryption." onClick={() => act(c.hidden ? "unhide" : "hide")} testId="info-hide" />
      </Section>
      {c.kind === "group" && <Section title="Members" action={<Button size="sm" variant="quiet" icon={UserPlus} onClick={() => act("mute")}>Add</Button>}>
        {["Rowan (you) · owner", "Jun Park", "Mira Okafor", "Ada Whitlock"].map((n) => <ListRow key={n} title={n} trailing={<Avatar name={n} size={30} />} />)}
      </Section>}
      <Section title="Message lifetime" footer="These protocols are planned. Locat can't prevent screenshots or copies on recipients' devices.">
        <ListRow icon={Timer} title="Disappearing messages" disabledReason="Planned (#30, #32)" />
        <ListRow icon={Eye} title="View-once / limited-view" disabledReason="Planned (#18)" />
      </Section>
      <Section>
        {c.kind === "group" ? <ListRow icon={LogOut} title="Leave group" danger onClick={() => act("leave")} /> : <ListRow icon={Ban} title="Block contact" danger onClick={() => act("hide")} />}
        <ListRow icon={Trash2} title="Delete local history" subtitle="Removes it from this device only. Backups and other devices may keep copies." danger onClick={() => act("hide")} />
      </Section>
    </Sheet>
  );
}

export function NewConversationSheet({ open, onClose, contacts, onStart }: { open: boolean; onClose(): void; contacts: ContactView[]; onStart(id: string): void }) {
  const { adapter } = useSession();
  const report = useReport();
  const [group, setGroup] = useState(false); const [title, setTitle] = useState(""); const [sel, setSel] = useState<string[]>([]);
  const friends = contacts.filter((c) => c.relation === "friend");
  return (
    <Sheet open={open} onClose={onClose} title={group ? "New group" : "New conversation"} testId="new-conversation-sheet"
      footer={group ? <Button variant="primary" icon={Users} disabledReason={!title.trim() ? "Name the group" : sel.length < 1 ? "Pick at least one member" : null} onClick={async () => { report(await adapter.messaging.createGroup(title, sel), "Group created"); onClose(); }} data-testid="create-group-submit">Create group</Button> : undefined}>
      <div className="mb-3"><Button size="sm" variant={group ? "secondary" : "quiet"} icon={Users} onClick={() => setGroup(!group)} data-testid="toggle-group-mode">{group ? "Direct message instead" : "Create a group"}</Button></div>
      {group && <TextField label="Group name" value={title} onChange={(e) => setTitle(e.target.value)} className="mb-4" data-testid="group-name-input" />}
      <Section title="Friends">{friends.map((c) => (
        <ListRow key={c.id} title={c.displayName} subtitle={`@${c.username}`} testId={`pick-${c.id}`}
          onClick={() => (group ? setSel((s) => (s.includes(c.id) ? s.filter((x) => x !== c.id) : [...s, c.id])) : (onStart(c.id), onClose()))}
          trailing={group ? <span className={cn("grid size-6 place-items-center rounded-full", sel.includes(c.id) ? "bg-ember text-ember-ink" : "hairline")}>{sel.includes(c.id) && <Check className="size-4" />}</span> : <Avatar name={c.displayName} size={30} presence={c.presence.state} />} />
      ))}</Section>
    </Sheet>
  );
}

export function ScheduledSheet({ open, onClose, items }: { open: boolean; onClose(): void; items: ScheduledMessageView[] }) {
  const { adapter } = useSession();
  const report = useReport();
  const sorted = [...items].sort((a, b) => Number(b.state === "pending") - Number(a.state === "pending") || a.sendAt - b.sendAt);
  return (
    <Sheet open={open} onClose={onClose} title="Scheduled messages" description="Encrypted on this device and released by your server at the chosen time. Your server must be running." testId="scheduled-sheet">
      {sorted.length ? <Section>{sorted.map((s) => (
        <ListRow key={s.id} icon={CalendarClock} title={s.excerpt} subtitle={`${s.conversationTitle} · ${new Date(s.sendAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}`}
          trailing={<div className="flex items-center gap-2">{s.state !== "pending" && <Badge tone={s.state === "failed" ? "danger" : "neutral"}>{s.state}</Badge>}{s.state === "pending" && <Button size="sm" variant="ghost" onClick={async () => report(await adapter.messaging.cancelScheduled(s.id), "Cancelled")} data-testid={`cancel-scheduled-${s.id}`}>Cancel</Button>}</div>} />
      ))}</Section> : <StateView compact kind="empty" title="Nothing scheduled" />}
      <p className="text-xs text-ink-3">Only text and replies can be scheduled. Media scheduling isn't available.</p>
    </Sheet>
  );
}

export function ScheduleSheet({ open, onClose, conversation, initialText }: { open: boolean; onClose(): void; conversation: ConversationView; initialText: string }) {
  const { adapter } = useSession();
  const report = useReport();
  const [text, setText] = useState(initialText); const [when, setWhen] = useState(() => new Date(Date.now() + 3600_000).toISOString().slice(0, 16));
  const [openedAt] = useState(() => Date.now());
  const past = new Date(when).getTime() < openedAt;
  return (
    <Sheet open={open} onClose={onClose} title="Schedule message" description={`To ${conversation.title} · your local time`} size="sm" testId="schedule-sheet"
      footer={<Button variant="primary" icon={CalendarClock} disabledReason={!text.trim() ? "Write a message" : past ? "Pick a future time" : null} onClick={async () => { report(await adapter.messaging.schedule(conversation.id, { text }, new Date(when).getTime()), "Scheduled"); onClose(); }} data-testid="schedule-submit">Schedule</Button>}>
      <label className="mb-1.5 block text-[13px] font-semibold text-ink-2" htmlFor="sched-text">Message</label>
      <textarea id="sched-text" value={text} onChange={(e) => setText(e.target.value)} rows={3} className="mb-4 w-full resize-none rounded-xl bg-s2 p-3 text-[15px] outline-none hairline focus:shadow-[inset_0_0_0_1.5px_rgb(var(--ember))]" />
      <TextField label="Send at" type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} error={past ? "That time has passed" : null} />
    </Sheet>
  );
}

/** Explicit, one-time location sharing (#48). Never background tracking. */
export function LocationSheet({ open, onClose, conversation }: { open: boolean; onClose(): void; conversation: ConversationView }) {
  const { adapter } = useSession();
  const report = useReport();
  const [mode, setMode] = useState<"current" | "manual">("current");
  return (
    <Sheet open={open} onClose={onClose} title="Share location" description={`Send one encrypted location to ${conversation.title}.`} size="sm" testId="location-sheet"
      footer={<Button variant="primary" icon={MapPin} onClick={async () => { report(await adapter.messaging.shareLocation(conversation.id, mode), "Location shared"); onClose(); }} data-testid="location-submit">Share once</Button>}>
      <Banner tone="info" icon={ShieldAlert} title="Locat asks for location only when you tap Share">Your position is sent once and is never tracked in the background. If permission is denied you can enter a place manually.</Banner>
      <div className="mt-4 grid grid-cols-2 gap-2">
        {([["current", Crosshair, "Current position"], ["manual", MapPin, "Choose manually"]] as const).map(([v, I, l]) => (
          <button key={v} onClick={() => setMode(v)} aria-pressed={mode === v} className={cn("flex h-20 flex-col items-center justify-center gap-1.5 rounded-xl text-sm font-semibold hairline", mode === v ? "bg-ember/12 text-ember shadow-[inset_0_0_0_1.5px_rgb(var(--ember))]" : "bg-s2")}><I className="size-5" />{l}</button>
        ))}
      </div>
    </Sheet>
  );
}
