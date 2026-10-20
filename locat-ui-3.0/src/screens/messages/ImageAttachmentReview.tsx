import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Image as ImageIcon, Sparkles } from "lucide-react";
import { Button, Sheet, formatBytes } from "@/ui";
import { IMAGE_RESIZE_PRESETS, resizeImageCopy, type ImageResizePreset } from "@/integration/imageAttachmentTransform";

const MAX_ATTACHMENT_BYTES = 2_900_000;

export function ImageAttachmentReview({ file, onClose, onSend }: { file: File; onClose(): void; onSend(file: File): Promise<void> }) {
  const [copy, setCopy] = useState<File | null>(null);
  const [preset, setPreset] = useState<ImageResizePreset | null>(null);
  const [busyPreset, setBusyPreset] = useState<ImageResizePreset | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const displayFile = copy ?? file;
  const previewUrl = useMemo(() => URL.createObjectURL(displayFile), [displayFile]);
  useEffect(() => () => URL.revokeObjectURL(previewUrl), [previewUrl]);

  const makeCopy = async (choice: ImageResizePreset) => {
    setPreset(choice);
    setCopy(null);
    setError("");
    setBusyPreset(choice);
    try {
      setCopy(await resizeImageCopy(file, choice));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The photo could not be resized.");
    } finally {
      setBusyPreset(null);
    }
  };
  const submit = async (outgoing: File) => {
    setSending(true);
    setError("");
    try {
      await onSend(outgoing);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The encrypted photo could not be sent.");
    } finally {
      setSending(false);
    }
  };
  const isGif = file.type === "image/gif";
  const transformable = ["image/jpeg", "image/png", "image/webp"].includes(file.type);

  return (
    <Sheet open onClose={onClose} title="Review photo" description="Choose the original or prepare a smaller copy before encryption." size="sm" testId="image-attachment-review">
      <div className="overflow-hidden rounded-2xl bg-black/20 hairline">
        <img src={previewUrl} alt={"Preview of " + file.name} className="max-h-[42dvh] w-full object-contain" />
      </div>
      <div className="mt-3 flex items-center gap-3 rounded-xl bg-s2 p-3 hairline">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-ember/15 text-ember"><ImageIcon className="size-5" /></span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{file.name}</p>
          <p className="text-xs text-ink-3">{copy ? "Resized copy · " : "Original · "}{formatBytes(displayFile.size)}</p>
        </div>
      </div>
      {displayFile.size > MAX_ATTACHMENT_BYTES && <p role="status" className="mt-3 rounded-xl bg-warn/10 p-3 text-sm text-warn">This version is above the 2.9 MB encrypted attachment limit. Choose a smaller copy below.</p>}
      {isGif && <p className="mt-3 rounded-xl bg-s2 p-3 text-sm text-ink-2">Animated GIFs stay in their original format. You can send the original if it is under the attachment limit.</p>}
      <details className="group mt-3 rounded-xl bg-s2 p-3 hairline" data-testid="image-resize-options">
        <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold marker:hidden">
          <Sparkles className="size-4 text-ember" />
          <span className="flex-1">Resize a copy</span>
          {busyPreset && <span className="text-xs text-ink-3">Preparing…</span>}
          <ChevronDown className="size-4 text-ink-3 transition-transform group-open:rotate-180" />
        </summary>
        <p className="mt-2 text-xs leading-relaxed text-ink-3">Your original stays on this device. Photos are resized locally and encrypted only after you choose Send.</p>
        {transformable ? (
          <div className="mt-3 flex flex-col gap-2">
            {(Object.keys(IMAGE_RESIZE_PRESETS) as ImageResizePreset[]).map((id) => {
              const option = IMAGE_RESIZE_PRESETS[id];
              const selected = preset === id;
              return <button type="button" key={id} onClick={() => void makeCopy(id)} disabled={!!busyPreset || sending}
                aria-pressed={selected} className={"flex min-h-12 items-center gap-3 rounded-xl px-3 text-left hairline " + (selected ? "bg-ember/10 text-ink shadow-[inset_0_0_0_1px_rgb(var(--ember)/.55)]" : "bg-s1 hover:bg-s3")}>
                <span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{option.label}</span><span className="block text-xs text-ink-3">{option.detail}</span></span>
                {selected && copy && <span className="text-xs font-semibold text-ember">{formatBytes(copy.size)}</span>}
              </button>;
            })}
          </div>
        ) : <p className="mt-3 text-sm text-ink-3">This format cannot be resized here. The original remains available.</p>}
      </details>
      {error && <p role="alert" className="mt-3 text-sm text-danger">{error}</p>}
      <div className="mt-4 flex flex-wrap justify-end gap-2">
        <Button variant="ghost" disabled={sending || !!busyPreset} onClick={onClose}>Cancel</Button>
        {!copy && <Button variant="ghost" disabled={sending || !!busyPreset || file.size > MAX_ATTACHMENT_BYTES} onClick={() => void submit(file)}>Send original</Button>}
        {copy && <Button variant="ghost" disabled={sending || !!busyPreset || file.size > MAX_ATTACHMENT_BYTES} onClick={() => void submit(file)}>Send original</Button>}
        {copy && <Button variant="primary" loading={sending} disabled={!!busyPreset || copy.size > MAX_ATTACHMENT_BYTES} disabledReason={copy.size > MAX_ATTACHMENT_BYTES ? "This copy exceeds 2.9 MB" : null} onClick={() => void submit(copy)}>Send resized copy</Button>}
      </div>
    </Sheet>
  );
}
