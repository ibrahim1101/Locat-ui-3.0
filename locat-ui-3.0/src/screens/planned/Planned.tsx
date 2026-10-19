import type { ReactNode } from "react";
import { Bell, Clock, Copy, FileText, KeyRound, Link2, Lock, Play, Plus, QrCode, Repeat, Shield, Share2, Timer, Users, Zap, Puzzle, Download, ChevronRight } from "lucide-react";
import { moduleById, type ModuleId } from "@/app/registry";
import { Screen } from "@/layouts/Screen";
import { Badge, Button, PreviewOnlyBanner, Section, ListRow, SectionTitle, Switch, cn } from "@/ui";

/**
 * Future-ready module previews (M7–M10). Layouts are final-quality designs; every
 * action is disabled with a reason because no implementation exists yet.
 */
const OFF = "Not implemented yet";

function Calendar() {
  const days = Array.from({ length: 35 }, (_, i) => i - 2);
  const ev: Record<number, string> = { 4: "Studio session", 11: "Backup drill", 12: "Dentist", 19: "Release review", 24: "Birthday" };
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="rounded-3xl bg-s1 p-4 hairline">
        <div className="mb-3 flex items-center justify-between"><p className="font-bold">June 2026</p><div className="flex gap-1">{["Month", "Week", "Day", "Agenda"].map((v, i) => <span key={v} className={cn("rounded-lg px-2.5 py-1 text-xs font-semibold", i === 0 ? "bg-s3" : "text-ink-3")}>{v}</span>)}</div></div>
        <div className="grid grid-cols-7 gap-1 text-center text-2xs font-bold uppercase text-ink-3">{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => <span key={d} className="py-1">{d}</span>)}</div>
        <div className="grid grid-cols-7 gap-1">{days.map((d) => <div key={d} className={cn("min-h-[64px] rounded-lg p-1.5 text-left text-xs", d < 1 || d > 30 ? "text-ink-3/50" : "bg-s2/60")}>{d > 0 && d <= 30 && d}{ev[d] && <span className="mt-1 block truncate rounded bg-ember/20 px-1 text-[10px] font-semibold text-ember">{ev[d]}</span>}</div>)}</div>
      </div>
      <div><SectionTitle>Event</SectionTitle><Section>
        <ListRow icon={Clock} title="Studio session" subtitle="Thu 4 Jun · 19:00–22:00" /><ListRow icon={Repeat} title="Repeats" subtitle="Every week" disabledReason="Recurrence — planned" />
        <ListRow icon={Bell} title="Reminder" subtitle="30 minutes before" disabledReason="Native reminder delivery — planned" /><ListRow icon={Users} title="Shared with" subtitle="Studio Night" disabledReason="Shared calendars — planned" />
      </Section></div>
    </div>
  );
}

function Automate() {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div><SectionTitle>Rule builder</SectionTitle>
        {[["When", Zap, "A calendar event is about to start"], ["If", Shield, "Between 23:00 and 07:00"], ["Then", Bell, "Notify me on this device"]].map(([k, I, t]) => { const Icon = I as typeof Zap; return (
          <div key={k as string} className="relative mb-2 flex items-center gap-3 rounded-2xl bg-s1 p-4 hairline"><span className="w-12 text-2xs font-bold uppercase tracking-wider text-ember">{k as string}</span><Icon className="size-5 text-ink-2" /><span className="flex-1 text-sm font-semibold">{t as string}</span><ChevronRight className="size-4 text-ink-3" /></div>); })}
        <Button icon={Plus} disabledReason={OFF} className="mt-2">Add step</Button>
      </div>
      <div><SectionTitle>Execution history</SectionTitle><Section footer="Rules will run with bounded, explicitly authorized actions only.">
        <ListRow icon={Play} title="Night alert escalation" subtitle="Would show runs, failures and permission errors" trailing={<Badge tone="planned">Preview</Badge>} />
        <ListRow icon={Timer} title="Weekly backup reminder" subtitle="Sun 10:00" trailing={<Badge tone="planned">Preview</Badge>} />
      </Section></div>
    </div>
  );
}

function Workspace() {
  const cols = { "To do": ["Draft release notes", "Pick cover art"], "In progress": ["Mix episode 4"], Done: ["Book studio"] };
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2"><Badge>Studio team</Badge><Badge tone="info">Owner</Badge><span className="text-xs text-ink-3">4 members · roles: owner, editor, viewer</span></div>
      <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-2 md:mx-0 md:px-0">{Object.entries(cols).map(([c, items]) => (
        <div key={c} className="w-72 shrink-0 rounded-3xl bg-s1 p-3 hairline"><p className="mb-2 px-1 text-xs font-bold uppercase tracking-wider text-ink-3">{c} · {items.length}</p>
          {items.map((t) => <div key={t} className="mb-2 rounded-xl bg-s2 p-3 text-sm font-semibold hairline">{t}<p className="mt-2 text-2xs font-normal text-ink-3">Assignee · due date · comments</p></div>)}
          <button disabled title={OFF} className="flex h-10 w-full items-center justify-center gap-1 rounded-xl text-xs text-ink-3 opacity-50"><Plus className="size-4" />Add task</button></div>))}</div>
      <div className="mt-6 grid gap-3 sm:grid-cols-3">{[[FileText, "Notes"], [Share2, "Shared files"], [Bell, "Activity"]].map(([I, t]) => { const Icon = I as typeof FileText; return <div key={t as string} className="rounded-2xl border border-dashed border-line-strong p-4"><Icon className="size-5 text-planned" /><p className="mt-3 text-sm font-semibold">{t as string}</p><p className="text-xs text-ink-3">Planned · encryption model to be defined</p></div>; })}</div>
    </div>
  );
}

function ShareM() {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div><SectionTitle>New share link</SectionTitle>
        <div className="rounded-3xl bg-s1 p-4 hairline">
          <div className="flex items-center gap-3 rounded-xl bg-s2 p-3"><FileText className="size-5 text-ember" /><span className="flex-1 truncate text-sm font-semibold">Studio_Session_04_stems.zip</span></div>
          <div className="mt-2 divide-y divide-line">
            <ListRow icon={Timer} title="Expires" subtitle="In 7 days" disabledReason="Server-enforced expiry — planned" /><ListRow icon={Download} title="Download limit" subtitle="5 downloads" disabledReason="Server-enforced limits — planned" />
            <ListRow icon={KeyRound} title="Password" subtitle="Optional" disabledReason="Planned" /><ListRow icon={QrCode} title="QR code" disabledReason="Planned" />
          </div>
          <Button variant="primary" block icon={Link2} disabledReason={OFF} className="mt-3">Create link</Button>
        </div>
      </div>
      <div><SectionTitle>Share history</SectionTitle><Section footer="Will also receive files from the Android share sheet and OS share menus (#49).">
        <ListRow icon={Link2} title="stems.zip" subtitle="2 of 5 downloads · expires in 3d" trailing={<Button size="sm" variant="danger" disabledReason={OFF}>Revoke</Button>} />
        <ListRow icon={Copy} title="reference.pdf" subtitle="Expired" trailing={<Badge>Expired</Badge>} />
      </Section></div>
    </div>
  );
}

function Extensions() {
  const ext = [["Weather widget", "Reads: location (once)", "1.2.0"], ["Backup to NAS", "Reads: Vault metadata · Writes: network share", "0.4.1"], ["Calendar handoff", "Reads: selected event details", "0.3.0"]];
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <Section title="Discover">{ext.map(([n, p, v]) => <ListRow key={n} icon={Puzzle} title={n} subtitle={`${p} · v${v}`} trailing={<Button size="sm" disabledReason={OFF}>Review</Button>} />)}</Section>
      <div className="rounded-3xl bg-s1 p-4 hairline"><p className="font-bold">Permission review</p><p className="mt-1 text-xs text-ink-3">Before install you'll see every capability an extension requests.</p>
        <div className="mt-3 space-y-1">{["Read selected files", "Network access to your LAN", "Show notifications"].map((c) => <div key={c} className="flex items-center gap-2 rounded-lg bg-s2 p-2.5 text-sm"><Lock className="size-4 text-warn" />{c}</div>)}</div>
        <div className="mt-2"><Switch label="Enabled" checked={false} onChange={() => undefined} disabledReason="No sandbox runtime — extensions receive no privileges" /></div>
      </div>
    </div>
  );
}

const BODY: Partial<Record<ModuleId, () => ReactNode>> = { calendar: Calendar, automate: Automate, workspace: Workspace, share: ShareM, extensions: Extensions };

export default function Planned({ id }: { id: ModuleId }) {
  const m = moduleById(id); const Body = BODY[id]!;
  return (
    <Screen title={m.name} subtitle={`${m.tagline} · milestone ${m.milestone}`} actions={<Badge tone="planned">{m.implementation === "scaffolded" ? "Scaffolded" : "Planned"}</Badge>} testId={`planned-${id}`}>
      <div className="mx-auto max-w-6xl">
        <PreviewOnlyBanner className="mb-6" what={`${m.name} is a design preview of the future Locat module.`} />
        <div className="pointer-events-auto opacity-95"><Body /></div>
      </div>
    </Screen>
  );
}
