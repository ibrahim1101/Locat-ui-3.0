import { memo, useRef } from "react";
import { AlertCircle, Check, CheckCheck, Clock, CloudOff, CornerUpRight, Download, FileText, Image as ImageIcon, MapPin, Pin, Play, RotateCw, FlaskConical } from "lucide-react";
import type { MessageView } from "@/contracts/messaging";
import { cn, clockTime, formatBytes, formatDuration } from "@/ui";

function DeliveryIcon({ d }: { d: MessageView["delivery"] }) {
  const map = {
    "queued-offline": [CloudOff, "Waiting for connection", "text-warn"], sending: [Clock, "Sending", "text-ink-3"], sent: [Check, "Sent", "text-ink-3"],
    delivered: [CheckCheck, "Delivered", "text-ink-3"], read: [CheckCheck, "Read", "text-ember"], failed: [AlertCircle, "Failed", "text-danger"],
    scheduled: [Clock, "Scheduled", "text-info"], "preview-local": [FlaskConical, "Preview only — not sent", "text-planned"],
  } as const;
  const [I, label, tone] = map[d];
  return <I className={cn("size-3.5", tone)} aria-label={label} />;
}

function Attachment({ a, mine, onDownload }: { a: NonNullable<MessageView["attachment"]>; mine: boolean; onDownload?:()=>void }) {
  switch (a.kind) {
    case "image": return (
      <div className="relative -mx-1 -mt-1 mb-1 overflow-hidden rounded-xl">
        <div className="grid aspect-[4/3] w-[min(68vw,300px)] place-items-center" style={{ background: "linear-gradient(135deg,hsl(28 30% 30%),hsl(220 20% 14%))" }}><ImageIcon className="size-8 text-white/40" /></div>
        <span className="absolute bottom-2 left-2 rounded-md bg-black/55 px-1.5 py-0.5 text-2xs font-semibold text-white backdrop-blur">{a.original ? "Original" : "Compressed"} · {a.width}×{a.height}</span>
      </div>);
    case "file": return (
      <div className={cn("flex min-w-[220px] max-w-[300px] items-center gap-3 rounded-xl p-2.5", mine ? "bg-black/15" : "bg-s3")}>
        <span className={cn("grid size-10 shrink-0 place-items-center rounded-lg", mine ? "bg-black/15 text-ember-ink" : "bg-ember/15 text-ember")}><FileText className="size-5" /></span>
        <span className="min-w-0 flex-1"><span className="block break-all text-[13px] font-semibold leading-snug line-clamp-2">{a.name}</span><span className="text-2xs opacity-70">{formatBytes(a.size)} · encrypted</span></span>
        {onDownload?<button type="button" onClick={onDownload} className="grid size-9 shrink-0 place-items-center rounded-lg hover:bg-black/10 focus-visible:outline focus-visible:outline-2" aria-label={`Download ${a.name}`}><Download className="size-4 opacity-80" /></button>:<Download className="size-4 shrink-0 opacity-70" aria-label="Download" />}
      </div>);
    case "voice": return (
      <div className="flex w-[min(64vw,260px)] items-center gap-3">
        <span className={cn("grid size-9 shrink-0 place-items-center rounded-full", mine ? "bg-ember-ink/20" : "bg-ember text-ember-ink")}><Play className="size-4 fill-current" /></span>
        <span className="flex h-8 flex-1 items-center gap-[3px]" aria-label="Voice message waveform">{a.waveform.map((h, i) => <span key={i} className="w-[3px] flex-1 rounded-full bg-current opacity-60" style={{ height: `${(h / 12) * 100}%` }} />)}</span>
        <span className="text-2xs tabular opacity-80">{formatDuration(a.durationSec)}</span>
      </div>);
    case "location": return (
      <div className="-mx-1 -mt-1 mb-1 w-[min(64vw,260px)] overflow-hidden rounded-xl">
        <div className="mesh relative grid h-28 place-items-center bg-s3"><MapPin className="size-7 text-ember" /></div>
        <p className="px-1 pt-2 text-[13px] font-semibold">Location · ±{a.accuracyM} m</p><p className="px-1 text-2xs opacity-70">{a.label} · not live tracking</p>
      </div>);
    case "gif": return <div className="grid h-36 w-48 place-items-center rounded-xl bg-s3 text-xs font-bold">GIF</div>;
    case "video": return <div className="rounded-xl bg-s3 p-3 text-xs">Video · {formatBytes(a.size)} — {a.state === "unsupported-in-messaging" ? "encrypted video sharing not yet available" : "ready"}</div>;
  }
}

/** Single message bubble. Long-press (touch) / right-click (desktop) opens the action menu. */
export const MessageBubble = memo(function MessageBubble({ m, grouped, showAuthor, onMenu, onJump, onRetry, onDownload }: { m: MessageView; grouped: boolean; showAuthor: boolean; onMenu(m: MessageView, at?: { x: number; y: number; pointer: "mouse" | "keyboard" }): void; onJump(id: string): void; onRetry(m: MessageView): void; onDownload?(m:MessageView):void }) {
  const timer = useRef<number>(0);
  if (m.system) return <p className="py-3 text-center text-2xs font-semibold text-ink-3" data-testid={`system-${m.id}`}>{m.system}</p>;
  const press = () => { timer.current = window.setTimeout(() => onMenu(m), 450); };
  const release = () => clearTimeout(timer.current);
  return (
    <div id={`msg-${m.id}`} className={cn("flex animate-fade", m.mine ? "justify-end" : "justify-start", grouped ? "pt-0.5" : "pt-3")} data-testid={`message-${m.id}`}>
      <div className={cn("group relative max-w-[82%] md:max-w-[68%]")}>
        {showAuthor && !m.mine && <p className="mb-1 ml-3 text-2xs font-bold text-ember">{m.authorName}</p>}
        <div tabIndex={0} role="article" aria-label={`${m.mine ? "You" : m.authorName}: ${m.text ?? m.attachment?.kind ?? ""}`}
          onContextMenu={(e) => { e.preventDefault(); onMenu(m, { x: e.clientX, y: e.clientY, pointer: "mouse" }); }} onTouchStart={press} onTouchEnd={release} onTouchMove={release}
          onKeyDown={(e) => { if (e.key === "Enter" || (e.shiftKey && e.key === "F10") || e.key === "ContextMenu") { e.preventDefault(); const r = e.currentTarget.getBoundingClientRect(); onMenu(m, { x: r.left + 16, y: r.bottom - 8, pointer: "keyboard" }); } }}
          className={cn("relative rounded-[20px] px-3.5 py-2 text-[15px] leading-snug md:text-sm", m.mine ? "bg-ember text-ember-ink" : "bg-s2 text-ink hairline",
            m.mine ? (grouped ? "rounded-tr-md" : "rounded-br-md") : (grouped ? "rounded-tl-md" : "rounded-bl-md"), m.deletedForEveryone && "bg-transparent italic text-ink-3 hairline")}>
          {m.forwarded && <p className="mb-1 flex items-center gap-1 text-2xs font-semibold opacity-75"><CornerUpRight className="size-3" />Forwarded</p>}
          {m.replyTo && (
            <button onClick={() => onJump(m.replyTo!.id)} className={cn("mb-1.5 block w-full rounded-lg border-l-2 px-2 py-1 text-left text-xs", m.mine ? "border-ember-ink/40 bg-black/10" : "border-ember bg-s3")} data-testid={`reply-ref-${m.id}`}>
              <span className="block font-bold">{m.replyTo.authorName}</span>
              <span className="block truncate opacity-80">{m.replyTo.state === "ok" ? m.replyTo.excerpt : m.replyTo.state === "deleted" ? "Original message was deleted" : m.replyTo.state === "hidden" ? "Original is hidden on this device" : "Original not available on this device"}</span>
            </button>)}
          {m.deletedForEveryone ? <span>This message was deleted</span> : <>
            {m.attachment && <Attachment a={m.attachment} mine={m.mine} onDownload={onDownload?()=>onDownload(m):undefined} />}
            {m.text && <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{m.text}</p>}
          </>}
          <span className={cn("float-right ml-2 mt-1 inline-flex translate-y-0.5 items-center gap-1 text-[10px] tabular", m.mine ? "text-ember-ink/70" : "text-ink-3")}>
            {m.pinned && <Pin className="size-3" aria-label="Pinned" />}{m.editedAt && <span>edited</span>}{clockTime(m.createdAt)}{m.mine && <span className={cn(m.mine && m.delivery === "read" && "[&_svg]:text-ember-ink")}><DeliveryIcon d={m.delivery} /></span>}
          </span>
        </div>
        {m.reactions?.length ? <div className={cn("-mt-1.5 flex gap-1", m.mine ? "justify-end pr-2" : "pl-2")}>{m.reactions.map((r) => <span key={r.emoji} className={cn("rounded-full bg-s3 px-1.5 py-0.5 text-xs hairline", r.mine && "shadow-[inset_0_0_0_1px_rgb(var(--ember))]")}>{r.emoji}{r.count > 1 && <span className="ml-0.5 text-2xs">{r.count}</span>}</span>)}</div> : null}
        {m.delivery === "failed" && <button onClick={() => onRetry(m)} className="mt-1 flex items-center gap-1 text-2xs font-semibold text-danger" data-testid={`retry-${m.id}`}><RotateCw className="size-3" />Not delivered · Retry</button>}
        {m.delivery === "queued-offline" && <p className="mt-1 text-right text-2xs text-warn">Encrypted and waiting in outbox</p>}
        {m.delivery === "preview-local" && <p className="mt-1 text-right text-2xs text-planned">Preview only · not encrypted or sent</p>}
      </div>
    </div>
  );
});
