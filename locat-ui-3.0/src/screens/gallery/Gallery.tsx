import { useState, type ReactNode } from "react";
import { Bell, Copy, Heart, Pencil, Plus, Settings, Trash2, Upload } from "lucide-react";
import type { Availability, ImplementationStatus } from "@/contracts/common";
import type { MessageView } from "@/contracts/messaging";
import { useSession } from "@/app/session";
import { THEMES } from "@/theme/tokens";
import { Screen } from "@/layouts/Screen";
import { ActionMenu, AvailabilityBadge, Avatar, Badge, Banner, Button, ChipRow, IconButton, ImplBadge, Kbd, ListRow, LocatWordmark, Meter, PreviewOnlyBanner, SearchField, Section, Segmented, Sheet, Skeleton, Slider, StateView, Switch, TextField, useToast, cn } from "@/ui";
import { useContextMenu } from "@/ui/ContextMenu";
import { VirtualList } from "@/ui/Virtual";
import { MessageBubble } from "../messages/MessageBubble";

/**
 * Component gallery (preview builds only: the route isn't registered when adapter.mode === "live").
 * Every reusable primitive is rendered in each documented state from docs/LOCAT_UI_DESIGN_SYSTEM.md.
 */
const GROUPS = ["Foundations", "Actions", "Inputs", "Status", "States", "Lists", "Overlays", "Messaging"] as const;
type Group = (typeof GROUPS)[number];

function Specimen({ title, note, children, className }: { title: string; note?: string; children: ReactNode; className?: string }) {
  return (
    <section className="mb-6 rounded-3xl bg-s1 p-5 hairline" data-testid={`specimen-${title.toLowerCase().replace(/\W+/g, "-")}`}>
      <h3 className="text-sm font-bold">{title}</h3>{note && <p className="mt-0.5 text-xs text-ink-3">{note}</p>}
      <div className={cn("mt-4 flex flex-wrap items-center gap-3", className)}>{children}</div>
    </section>
  );
}

const SWATCHES = ["canvas", "s1", "s2", "s3", "line", "line-strong", "ink", "ink-2", "ink-3", "ember", "ember-soft", "titanium", "ok", "warn", "danger", "info", "planned"];
const VARS: Record<string, string> = { s1: "surface-1", s2: "surface-2", s3: "surface-3" };
const now = Date.now();
const MSG = (id: string, mine: boolean, extra: Partial<MessageView>): MessageView => ({ id, conversationId: "g", authorId: mine ? "me" : "x", authorName: mine ? "You" : "Mira", mine, text: "Specimen message", createdAt: now, delivery: "delivered", ...extra });

export default function Gallery() {
  const { prefs, setPrefs } = useSession();
  const toast = useToast(); const ctx = useContextMenu();
  const [g, setG] = useState<Group>("Foundations");
  const [sw, setSw] = useState(true); const [seg, setSeg] = useState("a"); const [chip, setChip] = useState("all"); const [sl, setSl] = useState(40); const [q, setQ] = useState("");
  const [sheet, setSheet] = useState(false); const [menu, setMenu] = useState(false);
  const rows = Array.from({ length: 10000 }, (_, i) => `Row ${i + 1}`);
  const menuItems = [{ id: "edit", label: "Edit", icon: Pencil, shortcut: "E", onSelect: () => undefined }, { id: "copy", label: "Copy", icon: Copy, shortcut: "Ctrl C", onSelect: () => undefined }, { id: "fav", label: "Favorite", icon: Heart, disabledReason: "Planned", onSelect: () => undefined }, { id: "del", label: "Delete", icon: Trash2, tone: "danger" as const, separatorBefore: true, onSelect: () => undefined }];

  return (
    <Screen title="Component gallery" subtitle="Locat UI 3.0 design system · every primitive and state" testId="gallery-screen"
      actions={<Segmented size="sm" label="Theme" value={prefs.theme === "system" ? "obsidian" : prefs.theme} onChange={(t) => setPrefs({ theme: t })} options={THEMES.map((t) => ({ value: t.id, label: t.name }))} />}
      toolbar={<ChipRow label="Gallery section" value={g} onChange={setG} options={GROUPS.map((x) => ({ value: x, label: x }))} />}>
      <div className="mx-auto max-w-5xl">
        {g === "Foundations" && <>
          <Specimen title="Brand"><LocatWordmark /></Specimen>
          <Specimen title="Color tokens" note="All values resolve from src/theme/themes.css for the active theme.">
            {SWATCHES.map((s) => <div key={s} className="w-24"><div className="h-14 rounded-xl hairline" style={{ background: `rgb(var(--${VARS[s] ?? s}))` }} /><p className="mt-1 font-mono text-2xs text-ink-3">{s}</p></div>)}
          </Specimen>
          <Specimen title="Type scale" className="flex-col items-start">
            <p className="text-[22px] font-extrabold tracking-tight">Screen title 22/800</p><p className="text-[15px] font-bold">Section 15/700</p><p className="text-sm">Body 14/400 (15 on phones)</p><p className="text-xs text-ink-3">Caption 12</p><p className="font-mono text-xs">LC-0420 · mono 12</p>
          </Specimen>
          <Specimen title="Radii & elevation">{["rounded-lg", "rounded-xl", "rounded-2xl", "rounded-3xl"].map((r, i) => <div key={r} className={cn("grid size-20 place-items-center text-2xs text-ink-3 hairline", r, ["bg-s1", "bg-s2", "bg-s3", "bg-s2 shadow-float"][i])}>{r.replace("rounded-", "")}</div>)}</Specimen>
        </>}
        {g === "Actions" && <>
          <Specimen title="Button variants">{(["primary", "secondary", "ghost", "danger", "quiet"] as const).map((v) => <Button key={v} variant={v} icon={Plus}>{v}</Button>)}</Specimen>
          <Specimen title="Button sizes & states" note="Disabled buttons always carry an announced reason.">
            <Button size="sm">Small</Button><Button>Medium</Button><Button size="lg" variant="primary">Large</Button><Button loading variant="primary">Loading</Button><Button disabledReason="Connect to your server">Disabled</Button>
          </Specimen>
          <Specimen title="Icon buttons"><IconButton icon={Bell} label="Default" /><IconButton icon={Bell} label="Active" active /><IconButton icon={Upload} label="Ember" tone="ember" /><IconButton icon={Trash2} label="Danger" tone="danger" /><IconButton icon={Settings} label="Disabled" disabledReason="Planned" /><IconButton icon={Bell} label="Small" size="sm" /><IconButton icon={Bell} label="Large" size="lg" /></Specimen>
          <Specimen title="Keyboard hints"><Kbd>Ctrl K</Kbd><Kbd>Esc</Kbd><Kbd>?</Kbd></Specimen>
        </>}
        {g === "Inputs" && <>
          <Specimen title="Text fields" className="grid w-full gap-4 sm:grid-cols-2"><TextField label="Default" placeholder="Type…" /><TextField label="With hint" hint="Helpful guidance" /><TextField label="Error" error="That doesn't look right" defaultValue="oops" /><TextField label="Passphrase" reveal defaultValue="correct horse battery" /></Specimen>
          <Specimen title="Search"><SearchField value={q} onChange={setQ} placeholder="Search" className="w-full max-w-sm" /></Specimen>
          <Specimen title="Switch" className="block"><Switch label="Enabled" checked={sw} onChange={setSw} /><Switch label="Disabled with reason" checked={false} onChange={() => undefined} disabledReason="Requires native build" /></Specimen>
          <Specimen title="Segmented & chips" className="flex-col items-start"><Segmented label="Demo" value={seg} onChange={setSeg} options={[{ value: "a", label: "One" }, { value: "b", label: "Two" }, { value: "c", label: "Disabled", disabledReason: "Planned" }]} />
            <ChipRow label="Chips" value={chip} onChange={setChip} options={[{ value: "all", label: "All", count: 42 }, { value: "u", label: "Unread" }, { value: "g", label: "Groups" }, { value: "h", label: "Hidden" }]} /></Specimen>
          <Specimen title="Slider"><div className="w-64"><Slider label="Demo" min={0} max={100} value={sl} onChange={setSl} /></div><span className="font-mono text-xs">{sl}</span></Specimen>
        </>}
        {g === "Status" && <>
          <Specimen title="Availability" note="Brief §11 states, driven by adapter.moduleAvailability.">{(["available", "beta", "experimental", "planned", "offline", "locked", "permission-restricted", "admin-only", "unsupported"] as Availability[]).map((a) => <AvailabilityBadge key={a} value={a} />)}</Specimen>
          <Specimen title="Implementation evidence">{(["implemented", "implemented-unverified", "partial", "experimental", "scaffolded", "planned", "unresolved"] as ImplementationStatus[]).map((s) => <ImplBadge key={s} value={s} />)}</Specimen>
          <Specimen title="Badges">{(["neutral", "ember", "ok", "warn", "danger", "info", "planned"] as const).map((t) => <Badge key={t} tone={t} dot>{t}</Badge>)}</Specimen>
          <Specimen title="Banners" className="grid w-full gap-2">{(["neutral", "info", "warn", "danger", "ember", "planned"] as const).map((t) => <Banner key={t} tone={t} icon={Bell} title={`${t} banner`}>Supporting copy.</Banner>)}<PreviewOnlyBanner what="Example module." /></Specimen>
          <Specimen title="Progress & loading"><div className="w-48 space-y-2"><Meter label="a" value={0.3} /><Meter label="b" value={0.7} tone="ok" /><Meter label="c" value={0.92} tone="danger" /></div><div className="w-48 space-y-2"><Skeleton className="h-4" /><Skeleton className="h-4 w-2/3" /><Skeleton className="h-10" /></div></Specimen>
          <Specimen title="Toasts">{(["ok", "danger", "warn", "neutral", "pending"] as const).map((t) => <Button key={t} size="sm" onClick={() => toast.show({ title: `${t} toast`, body: t === "pending" ? "Preview only — nothing was sent or saved" : undefined, tone: t })}>{t}</Button>)}</Specimen>
        </>}
        {g === "States" && <div className="grid gap-4 md:grid-cols-2">{(["empty", "error", "offline", "permission", "locked", "unauthorized", "unsupported", "planned"] as const).map((k) => <div key={k} className="rounded-3xl bg-s1 hairline"><StateView compact kind={k} title={`${k} state`} body="Explains what happened and what the user can do." action={<Button size="sm">Action</Button>} /></div>)}</div>}
        {g === "Lists" && <>
          <Specimen title="Avatars"><Avatar name="Mira Okafor" presence="online" /><Avatar name="Jun Park" /><Avatar name="Studio Night" group /><Avatar name="Large" size={72} presence="online" /></Specimen>
          <Section title="Section + rows"><ListRow icon={Bell} title="Default row" subtitle="Subtitle" chevron onClick={() => undefined} /><ListRow icon={Bell} title="Disabled row" disabledReason="Planned (#21)" onClick={() => undefined} /><ListRow icon={Trash2} title="Danger row" danger onClick={() => undefined} /></Section>
          <Specimen title="VirtualList · 10,000 rows" note="Only visible rows are mounted. Focus a row and use ↑ ↓ Home End PgUp PgDn." className="block">
            <VirtualList items={rows} getKey={(r) => r} estimateSize={44} ariaLabel="Virtual demo" className="h-72 rounded-xl bg-s2 hairline" testId="gallery-virtual-list"
              renderItem={(r, i) => <button className="flex h-11 w-full items-center gap-3 border-b border-line px-4 text-left text-sm hover:bg-s3 focus-visible:bg-s3" onContextMenu={ctx.onContextMenu(r, menuItems)}><span className="w-12 font-mono text-2xs text-ink-3">{i + 1}</span>{r}</button>} />
          </Specimen>
        </>}
        {g === "Overlays" && <>
          <Specimen title="Sheet / dialog" note="Bottom sheet below 768 px, centered dialog above."><Button onClick={() => setSheet(true)} data-testid="gallery-open-sheet">Open sheet</Button><Button onClick={() => setMenu(true)}>Open action menu</Button></Specimen>
          <Specimen title="Cursor context menu" note="Right-click, Shift+F10 or the Menu key. Arrows, Home/End, type-ahead, Enter, Esc. Falls back to an action sheet on touch.">
            <div tabIndex={0} onContextMenu={ctx.onContextMenu("Specimen", menuItems)} onKeyDown={(e) => { if (e.key === "ContextMenu" || (e.shiftKey && e.key === "F10")) { e.preventDefault(); ctx.fromElement(e.currentTarget, "Specimen", menuItems); } }} className="grid h-28 w-full place-items-center rounded-2xl border border-dashed border-line-strong text-sm text-ink-3" data-testid="gallery-context-target">Right-click anywhere here</div>
          </Specimen>
          <Specimen title="Drag and drop" note="Drag files over a conversation, Vault or Devices to see the destination overlay; elsewhere the overlay explains files can't be dropped." className="block"><p className="text-sm text-ink-2">Try dragging a file onto this page: no target is registered here.</p></Specimen>
        </>}
        {g === "Messaging" && <div className="rounded-3xl bg-s1 p-4 hairline">
          {([["sending", true], ["sent", true], ["delivered", true], ["read", true], ["queued-offline", true], ["failed", true], ["scheduled", true], ["preview-local", true]] as const).map(([d, mine]) => <MessageBubble key={d} m={MSG(d, mine, { delivery: d, text: `Delivery: ${d}` })} grouped={false} showAuthor={false} onMenu={() => undefined} onJump={() => undefined} onRetry={() => undefined} />)}
          <MessageBubble m={MSG("r", false, { replyTo: { id: "x", authorName: "You", excerpt: "Original", state: "deleted" }, reactions: [{ emoji: "🔥", count: 2, mine: true }], editedAt: now, pinned: true })} grouped={false} showAuthor onMenu={() => undefined} onJump={() => undefined} onRetry={() => undefined} />
          <MessageBubble m={MSG("d", false, { deletedForEveryone: true, text: undefined })} grouped={false} showAuthor={false} onMenu={() => undefined} onJump={() => undefined} onRetry={() => undefined} />
          <MessageBubble m={MSG("v", true, { text: undefined, attachment: { kind: "voice", durationSec: 12, waveform: [3, 7, 10, 5, 8, 4, 9, 6] } })} grouped={false} showAuthor={false} onMenu={() => undefined} onJump={() => undefined} onRetry={() => undefined} />
        </div>}
      </div>
      <Sheet open={sheet} onClose={() => setSheet(false)} title="Sheet title" description="Description text" footer={<Button variant="primary" onClick={() => setSheet(false)}>Done</Button>}><p className="text-sm text-ink-2">Sheet content. Android Back and Escape close it first.</p></Sheet>
      <ActionMenu open={menu} onClose={() => setMenu(false)} title="Action menu" actions={menuItems} />
    </Screen>
  );
}
