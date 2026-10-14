import { useState } from "react";
import { useSearchParams } from "react-router";
import { ArrowDownLeft, ArrowUpRight, ClipboardCopy, FileUp, Laptop, Link2, Monitor, MoreHorizontal, Pencil, Plus, RefreshCw, ShieldCheck, Smartphone, Trash2, Wifi, X, Globe, ShieldAlert, Radar } from "lucide-react";
import type { DeviceView, TransferView } from "@/contracts/ecosystem";
import { useSession } from "@/app/session";
import { useDropTarget } from "@/app/drop";
import { useReport } from "@/app/feedback";
import { FIXTURE_DEVICES, FIXTURE_TRANSFERS } from "@/fixtures/data";
import { Screen } from "@/layouts/Screen";
import { ActionMenu, Badge, Banner, Button, IconButton, Meter, Section, SectionTitle, Segmented, Sheet, TextField, ChipRow, cn, formatBytes, relTime } from "@/ui";

const PI = { android: Smartphone, windows: Monitor, linux: Laptop, macos: Laptop, web: Globe };

function DeviceCard({ d, onMenu, onSend }: { d: DeviceView; onMenu(): void; onSend(): void }) {
  const I = PI[d.platform];
  return (
    <div className={cn("relative rounded-3xl bg-s1 p-4 hairline", d.state === "pending-approval" && "shadow-[inset_0_0_0_1.5px_rgb(var(--ember))]")} data-testid={`device-${d.id}`}>
      <div className="flex items-start gap-3">
        <span className="relative grid size-12 shrink-0 place-items-center rounded-2xl bg-s2 hairline"><I className="size-6 text-ink-2" />{d.online && <span className="absolute -right-0.5 -top-0.5 size-3 rounded-full bg-ok ring-2 ring-s1" aria-label="Online" />}</span>
        <div className="min-w-0 flex-1"><p className="truncate font-bold">{d.alias}{d.current && <span className="ml-2 text-xs font-semibold text-ember">This device</span>}</p>
          <p className="text-xs capitalize text-ink-3">{d.platform} · {d.online ? "online" : (d.lastSeenAt ? `seen ${relTime(d.lastSeenAt)}` : "offline")}</p></div>
        {!d.current && <IconButton icon={MoreHorizontal} label={`${d.alias} options`} onClick={onMenu} size="sm" data-testid={`device-menu-${d.id}`} />}
      </div>
      <div className="mt-4 flex items-center gap-2">
        {d.state === "paired" && <Badge tone="ok" dot>Paired</Badge>}
        {d.state === "needs-reproof" && <Badge tone="warn" dot>Re-confirm pairing</Badge>}
        {d.state === "pending-approval" && <Badge tone="ember" dot>Wants to pair</Badge>}
        <span className="flex-1" />
        {!d.current && d.state === "paired" && <Button size="sm" icon={ArrowUpRight} onClick={onSend} disabledReason={d.online ? null : "Device is offline"} data-testid={`device-send-${d.id}`}>Send</Button>}
      </div>
    </div>
  );
}

function TransferRow({ t }: { t: TransferView }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3" data-testid={`transfer-${t.id}`}>
      <span className={cn("grid size-9 shrink-0 place-items-center rounded-xl", t.direction === "sent" ? "bg-ember/12 text-ember" : "bg-info/12 text-info")}>{t.direction === "sent" ? <ArrowUpRight className="size-4" /> : <ArrowDownLeft className="size-4" />}</span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{t.name}</p>
        <p className="text-xs text-ink-3">{t.direction === "sent" ? "To" : "From"} {t.peer}{t.sizeBytes ? ` · ${formatBytes(t.sizeBytes)}` : ""} · {t.kind}</p>
        {t.state === "transferring" && <Meter className="mt-2" label={`${t.name} progress`} value={t.progress} />}
        {t.state === "failed" && <p className="mt-0.5 text-xs text-danger">{t.error}</p>}
      </div>
      {t.state === "transferring" ? <span className="font-mono text-xs tabular text-ink-2">{Math.round(t.progress * 100)}%</span> : t.state === "failed" ? <IconButton icon={RefreshCw} label="Retry transfer" size="sm" /> : <span className="text-2xs text-ink-3">{relTime(t.at)}</span>}
    </div>
  );
}

/** Devices & Link (M2): pairing, encrypted transfers, explicit-consent clipboard, revocation. */
export default function Devices() {
  const { adapter } = useSession(); const report = useReport();
  const [params, setParams] = useSearchParams();
  const [pairState, setPairOpen] = useState(false);
  const pairOpen = pairState || params.has("pair");
  const closePair = () => { setPairOpen(false); if (params.has("pair")) setParams({}, { replace: true }); };
  const [menu, setMenu] = useState<DeviceView | null>(null);
  const [send, setSend] = useState<DeviceView | null>(null);
  const [rename, setRename] = useState<DeviceView | null>(null);
  const [kind, setKind] = useState<"file" | "text" | "url" | "clipboard">("file");
  const [text, setText] = useState("");
  const [hist, setHist] = useState<"all" | "sent" | "received">("all");
  const pending = FIXTURE_DEVICES.filter((d) => d.state === "pending-approval");
  const target = FIXTURE_DEVICES.find((d) => !d.current && d.state === "paired" && d.online);
  useDropTarget(target ? { id: "devices", label: `Send to ${target.alias}`, detail: "End-to-end encrypted, chunked transfer via your server", onDrop: (files) => adapter.link.sendFile(target.id, files[0]) } : null);

  return (
    <Screen title="Devices" subtitle="Link · end-to-end encrypted, relayed by your server" testId="devices-screen" actions={<Button variant="primary" size="sm" icon={Plus} onClick={() => setPairOpen(true)} data-testid="pair-device-button">Pair</Button>}>
      <div className="mx-auto max-w-6xl">
        {pending.map((d) => (
          <div key={d.id} className="mb-5 rounded-3xl bg-ember/10 p-4 animate-rise" data-testid="pairing-request">
            <p className="flex items-center gap-2 font-bold"><ShieldCheck className="size-5 text-ember" />{d.alias} ({d.platform}) wants to pair</p>
            <p className="mt-1 text-sm text-ink-2">Confirm both screens show the same code before approving.</p>
            <p className="my-3 font-mono text-3xl font-bold tracking-[.2em]">{d.sas}</p>
            <div className="flex gap-2"><Button variant="primary" onClick={async () => report(await adapter.link.approvePairing(d.id, true), "Paired")} data-testid="approve-pairing">Codes match — approve</Button><Button onClick={async () => report(await adapter.link.approvePairing(d.id, false), "Rejected")} data-testid="reject-pairing">Reject</Button></div>
          </div>))}
        <SectionTitle>Your devices</SectionTitle>
        <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{FIXTURE_DEVICES.filter((d) => d.state !== "pending-approval").map((d) => <DeviceCard key={d.id} d={d} onMenu={() => setMenu(d)} onSend={() => setSend(d)} />)}</div>
        <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
          <section>
            <SectionTitle action={<ChipRow className="h-auto" label="History filter" value={hist} onChange={setHist} options={[{ value: "all", label: "All" }, { value: "sent", label: "Sent" }, { value: "received", label: "Received" }]} />}>Transfers</SectionTitle>
            <Section>{FIXTURE_TRANSFERS.filter((t) => hist === "all" || t.direction === hist).map((t) => <TransferRow key={t.id} t={t} />)}</Section>
          </section>
          <section>
            <SectionTitle>Coming to Link</SectionTitle>
            <div className="space-y-2">{[[Radar, "Nearby discovery (LAN / mDNS)", "Find devices on your network without the server"], [Wifi, "Peer-to-peer transfer", "Direct device-to-device paths"], [Link2, "Cross-device media browsing", "Opt-in libraries from your other devices"]].map(([I, t, d]) => { const Icon = I as typeof Radar; return (
              <div key={t as string} className="flex items-center gap-3 rounded-2xl border border-dashed border-line-strong p-3"><Icon className="size-5 shrink-0 text-planned" /><div className="min-w-0 flex-1"><p className="text-sm font-semibold">{t as string}</p><p className="text-xs text-ink-3">{d as string}</p></div><Badge tone="planned">Planned</Badge></div>); })}</div>
            <p className="mt-3 text-xs text-ink-3">Locat never shows "discovered" devices it hasn't actually paired.</p>
          </section>
        </div>
      </div>

      <Sheet open={pairOpen} onClose={closePair} title="Pair a new device" description="Both devices must be signed in to the same Locat account." size="sm" testId="pair-sheet"
        footer={<Button variant="primary" onClick={async () => report(await adapter.link.requestPairing(), "Pairing requested")} data-testid="pair-start">Start pairing</Button>}>
        <ol className="space-y-3 text-sm text-ink-2">{["Open Locat → Devices on the other device.", "Tap Pair on either device. A short code appears on both.", "Approve only if the codes match exactly."].map((s, i) => <li key={i} className="flex gap-3"><span className="grid size-6 shrink-0 place-items-center rounded-full bg-s3 text-xs font-bold text-ink">{i + 1}</span>{s}</li>)}</ol>
      </Sheet>

      <Sheet open={!!send} onClose={() => setSend(null)} title={`Send to ${send?.alias ?? ""}`} size="sm" testId="send-sheet"
        footer={<Button variant="primary" icon={ArrowUpRight} disabledReason={kind !== "file" && !text.trim() ? "Enter something to send" : null} onClick={async () => { if (send) report(kind === "file" ? await adapter.link.sendFile(send.id, new File([], "preview")) : await adapter.link.sendClipboard(send.id, text, kind), "Sent"); setSend(null); }} data-testid="send-submit">Send encrypted</Button>}>
        <Segmented label="What to send" value={kind} onChange={setKind} size="sm" options={[{ value: "file", label: "File", icon: FileUp }, { value: "text", label: "Text" }, { value: "url", label: "Link" }, { value: "clipboard", label: "Clipboard", icon: ClipboardCopy }]} />
        <div className="mt-4">
          {kind === "file" ? <label className="flex h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-line-strong text-sm text-ink-2 hover:bg-s2"><FileUp className="size-6" />Choose or drop a file<input type="file" className="sr-only" /></label>
            : kind === "clipboard" ? <Banner tone="info" icon={ClipboardCopy} title="Locat reads your clipboard only when you tap Paste">Nothing is read in the background. <Button size="sm" className="mt-2" onClick={async () => setText((await navigator.clipboard?.readText().catch(() => "")) ?? "")}>Paste clipboard</Button></Banner>
            : <TextField label={kind === "url" ? "Link" : "Text"} value={text} onChange={(e) => setText(e.target.value)} inputMode={kind === "url" ? "url" : "text"} />}
          {kind === "clipboard" && text && <p className="mt-3 truncate rounded-xl bg-s2 p-3 font-mono text-xs">{text}</p>}
        </div>
      </Sheet>
      <Sheet open={!!rename} onClose={() => setRename(null)} title="Rename device" size="sm" footer={<Button variant="primary" onClick={async () => { if (rename) report(await adapter.link.renameDevice(rename.id, text), "Renamed"); setRename(null); }}>Save</Button>}>
        <TextField label="Device name" defaultValue={rename?.alias} onChange={(e) => setText(e.target.value)} />
      </Sheet>
      <ActionMenu open={!!menu} onClose={() => setMenu(null)} title={menu?.alias ?? ""} actions={menu ? [
        { id: "rename", label: "Rename", icon: Pencil, onSelect: () => { setText(menu.alias); setRename(menu); } },
        ...(menu.state === "needs-reproof" ? [{ id: "reproof", label: "Re-confirm pairing", icon: ShieldAlert, onSelect: async () => report(await adapter.link.requestPairing(), "Requested") }] : []),
        { id: "revoke", label: "Revoke device", icon: Trash2, tone: "danger" as const, onSelect: async () => report(await adapter.link.revokeDevice(menu.id), "Revoked") },
      ] : []} />
      <span className="hidden"><X /></span>
    </Screen>
  );
}
