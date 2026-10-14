import { useEffect, useRef, useState } from "react";
import { CalendarClock, FileUp, Image as ImageIcon, MapPin, Mic, Paperclip, Pencil, Plus, Reply, SendHorizontal, Smile, Square, Video, X, Sticker, Brush } from "lucide-react";
import type { ComposerCapabilities, ComposerDraft, MessageView } from "@/contracts/messaging";
import { ActionMenu, IconButton, cn, formatDuration } from "@/ui";

export type ComposerProps = {
  draft: ComposerDraft; capabilities: ComposerCapabilities; replyTo?: MessageView; editing?: MessageView;
  onDraft(d: ComposerDraft): void; onSend(): void; onCancelContext(): void;
  onAttach(kind: "image" | "file" | "location" | "gif" | "video" | "doodle" | "sticker"): void; onSchedule(): void; onVoice(sec: number): void;
};

/**
 * Message composer. Collects input only. Sending hands the draft to
 * `onSend`, which the live adapter routes into Locat's encrypt → outbox pipeline.
 */
export function Composer({ draft, capabilities: cap, replyTo, editing, onDraft, onSend, onCancelContext, onAttach, onSchedule, onVoice }: ComposerProps) {
  const [menu, setMenu] = useState(false);
  const [rec, setRec] = useState<number | null>(null);
  const ta = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { if (rec === null) return; const t = setInterval(() => setRec((s) => (s === null ? s : s >= 60 ? s : s + 1)), 1000); return () => clearInterval(t); }, [rec]);
  useEffect(() => { const el = ta.current; if (el) { el.style.height = "0px"; el.style.height = Math.min(el.scrollHeight, 160) + "px"; } }, [draft.text]);
  useEffect(() => { if (editing || replyTo) ta.current?.focus(); }, [editing, replyTo]);

  if (cap.replacedBy) return <div className="shrink-0 border-t border-line px-4 py-4 pb-safe text-center text-[13px] text-ink-2" role="status" data-testid="composer-replaced">{cap.replacedBy}</div>;
  const textOff = !cap.text.enabled ? cap.text.reason : null;
  const canSend = cap.text.enabled && draft.text.trim().length > 0;
  const r = (c: { enabled: boolean } & { reason?: string }) => (c.enabled ? undefined : c.reason);

  return (
    <div className="shrink-0 border-t border-line bg-canvas px-2 pt-2 md:px-4" style={{ paddingBottom: "max(8px, env(safe-area-inset-bottom))" }} data-testid="composer">
      {(replyTo || editing) && (
        <div className="mx-1 mb-2 flex items-center gap-2 rounded-xl bg-s1 px-3 py-2 hairline">
          {editing ? <Pencil className="size-4 text-ember" /> : <Reply className="size-4 text-ember" />}
          <span className="min-w-0 flex-1 text-xs"><span className="font-bold">{editing ? "Editing message" : `Replying to ${replyTo!.authorName}`}</span><span className="block truncate text-ink-3">{(editing ?? replyTo)!.text ?? "Attachment"}</span></span>
          <IconButton icon={X} label="Cancel" size="sm" onClick={onCancelContext} />
        </div>)}
      {textOff && <p className="mx-2 mb-1.5 text-xs text-ink-3" role="status">{textOff}</p>}
      {rec !== null ? (
        <div className="flex h-12 items-center gap-3 rounded-full bg-danger/10 px-3" data-testid="voice-recorder">
          <span className="size-2.5 animate-pulse2 rounded-full bg-danger" /><span className="flex-1 text-sm font-semibold tabular text-danger">{formatDuration(rec)} / 1:00 · Preview recorder (no audio captured)</span>
          <IconButton icon={X} label="Discard recording" size="sm" onClick={() => setRec(null)} />
          <IconButton icon={Square} label="Stop and send" tone="ember" size="sm" onClick={() => { onVoice(rec); setRec(null); }} />
        </div>
      ) : (
        <div className="flex items-end gap-1">
          <IconButton icon={Plus} label="Attach" onClick={() => setMenu(true)} disabledReason={r(cap.file)} data-testid="composer-attach" />
          <div className={cn("flex min-h-[44px] flex-1 items-end rounded-[22px] bg-s2 px-3.5 hairline focus-within:shadow-[inset_0_0_0_1.5px_rgb(var(--ember))]", textOff && "opacity-50")}>
            <textarea ref={ta} rows={1} value={draft.text} disabled={!!textOff} aria-label="Message" placeholder={editing ? "Edit message" : "Encrypted message"} data-testid="composer-input"
              onChange={(e) => onDraft({ ...draft, text: e.target.value })}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && window.innerWidth >= 768) { e.preventDefault(); if (canSend) onSend(); } }}
              className="max-h-40 min-h-[44px] flex-1 resize-none bg-transparent py-[11px] text-[15px] leading-snug outline-none placeholder:text-ink-3 md:text-sm" />
            <IconButton icon={Smile} label="Emoji and GIF" size="sm" className="mb-1.5 -mr-1.5" onClick={() => onAttach("gif")} disabledReason={r(cap.gif)} />
          </div>
          {canSend ? <IconButton icon={SendHorizontal} label={editing ? "Save edit" : "Send"} tone="ember" onClick={onSend} data-testid="composer-send" />
            : <IconButton icon={Mic} label="Record voice message (max 60s)" onClick={() => setRec(0)} disabledReason={r(cap.voice)} data-testid="composer-voice" />}
        </div>)}
      <ActionMenu open={menu} onClose={() => setMenu(false)} title="Share in conversation" actions={[
        { id: "image", label: "Photo (original quality)", icon: ImageIcon, onSelect: () => onAttach("image"), disabledReason: r(cap.image) },
        { id: "file", label: "Document or file · up to 2.9 MB", icon: FileUp, onSelect: () => onAttach("file"), disabledReason: r(cap.file) },
        { id: "location", label: "Share my location once", icon: MapPin, onSelect: () => onAttach("location"), disabledReason: r(cap.location) },
        { id: "schedule", label: "Schedule a text message", icon: CalendarClock, onSelect: onSchedule, disabledReason: r(cap.schedule) },
        { id: "video", label: "Video", icon: Video, onSelect: () => onAttach("video"), disabledReason: r(cap.video) },
        { id: "doodle", label: "Doodle", icon: Brush, onSelect: () => undefined, disabledReason: "Planned (#35)" },
        { id: "sticker", label: "Sticker packs", icon: Sticker, onSelect: () => undefined, disabledReason: "Planned (#28)" },
        { id: "device-media", label: "Search & select from my devices", icon: Paperclip, onSelect: () => undefined, disabledReason: "Planned — cross-device index" },
      ]} />
    </div>
  );
}
