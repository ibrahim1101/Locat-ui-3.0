import { useEffect, useMemo, useState } from "react";
import { Film } from "lucide-react";
import { Button, Sheet, formatBytes } from "@/ui";

const MAX_ATTACHMENT_BYTES = 2_900_000;

export function VideoAttachmentReview({ file, onClose, onSend }: { file: File; onClose(): void; onSend(file: File): Promise<void> }) {
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const previewUrl = useMemo(() => URL.createObjectURL(file), [file]);
  useEffect(() => () => URL.revokeObjectURL(previewUrl), [previewUrl]);
  const close = () => { if (!sending) onClose(); };
  const submit = async () => {
    setSending(true);
    setError("");
    try {
      await onSend(file);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The encrypted video could not be sent.");
    } finally {
      setSending(false);
    }
  };
  const tooLarge = file.size > MAX_ATTACHMENT_BYTES;

  return (
    <Sheet open onClose={close} title="Review video" description="Preview locally, then confirm before it is encrypted." size="sm" testId="video-attachment-review">
      <div className="overflow-hidden rounded-2xl bg-black hairline">
        <video src={previewUrl} controls preload="metadata" className="max-h-[42dvh] w-full" aria-label={"Preview of " + file.name} />
      </div>
      <div className="mt-3 flex items-center gap-3 rounded-xl bg-s2 p-3 hairline">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-ember/15 text-ember"><Film className="size-5" /></span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{file.name}</p>
          <p className="text-xs text-ink-3">Original video · {formatBytes(file.size)}</p>
        </div>
      </div>
      {tooLarge ? <p role="status" className="mt-3 rounded-xl bg-warn/10 p-3 text-sm text-warn">This video is above the 2.9 MB encrypted attachment limit. Choose a shorter or smaller video to send.</p> : <p className="mt-3 text-xs leading-relaxed text-ink-3">Video is sent in its original format, up to 2.9 MB. Locat previews it on this device; playback uses the viewer’s browser controls.</p>}
      {error && <p role="alert" className="mt-3 text-sm text-danger">{error}</p>}
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="ghost" disabled={sending} onClick={close}>Cancel</Button>
        <Button variant="primary" loading={sending} disabled={tooLarge} disabledReason={tooLarge ? "This video exceeds 2.9 MB" : null} onClick={() => void submit()}>Send encrypted video</Button>
      </div>
    </Sheet>
  );
}
