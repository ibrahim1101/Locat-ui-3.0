import { useEffect, useRef, useState } from "react";
import { defaultPhotoEdit, photoFilter, renderPhotoEdit } from "../lib/photoEditing";
import { editedImageFile } from "../lib/imageEditing";
import { Button, Slider } from "../ui";
import type { LocalMediaItem } from "./localMediaStore";
export function LivePhotoViewer({ item, onClose }: { item: LocalMediaItem; onClose(): void }) {
  const image = useRef<HTMLImageElement>(null);
  const [url, setUrl] = useState("");
  const [edit, setEdit] = useState(defaultPhotoEdit);
  const [error, setError] = useState("");
  const [zoom, setZoom] = useState(1);
  useEffect(() => { const url = URL.createObjectURL(item.file); const timer = setTimeout(() => setUrl(url), 0); return () => { clearTimeout(timer); URL.revokeObjectURL(url); }; }, [item.file]);
  async function exportCopy() {
    try {
      if (!image.current?.complete || !image.current.naturalWidth) throw new Error("Wait for the image to load.");
      const canvas = renderPhotoEdit({ image: image.current, width: image.current.naturalWidth, height: image.current.naturalHeight }, edit);
      const file = await editedImageFile(canvas, item.name);
      const download = URL.createObjectURL(file);
      const link = document.createElement("a"); link.href = download; link.download = file.name; link.click(); setTimeout(() => URL.revokeObjectURL(download), 30000);
      setError("");
    } catch (error) { setError(error instanceof Error ? error.message : "Export failed"); }
  }
  return <section className="mb-6 space-y-4 rounded-2xl bg-s2 p-5 hairline" aria-label="Photo editor">
    <div className="flex items-center justify-between"><h2 className="font-semibold">{item.name}</h2><Button variant="ghost" onClick={onClose}>Close photo</Button></div>
    <div className="flex h-96 items-center justify-center overflow-auto rounded-xl bg-black"><img ref={image} src={url || undefined} alt={item.name} className="max-h-full max-w-full object-contain" style={{ filter: photoFilter(edit), transform: `rotate(${edit.geometry.turns * 90}deg) scale(${(edit.flipX ? -1 : 1) * zoom}, ${(edit.flipY ? -1 : 1) * zoom})` }} onError={() => setError("This image format cannot be decoded.")} /></div>
    <div className="flex flex-wrap gap-2"><Button variant="ghost" onClick={() => setEdit(old => ({ ...old, geometry: { ...old.geometry, turns: (old.geometry.turns + 1) % 4 } }))}>Rotate</Button><Button variant="ghost" onClick={() => setEdit(old => ({ ...old, flipX: !old.flipX }))}>Flip horizontal</Button><Button variant="ghost" onClick={() => setEdit(defaultPhotoEdit())}>Reset edits</Button><Button onClick={() => void exportCopy()}>Download edited copy</Button></div>
    <Slider label="Viewer zoom" min={1} max={3} step={0.1} value={zoom} onChange={setZoom} />
    {(["brightness", "contrast", "saturation"] as const).map(key => <Slider key={key} label={key} min={0} max={200} value={edit[key]} onChange={value => setEdit(old => ({ ...old, [key]: value }))} />)}
    <p className="text-xs text-ink-3">Your original stays unchanged. JPEG copies use a maximum 1600px edge; viewer zoom does not crop the export.</p>
    {error && <p role="alert" className="text-danger">{error}</p>}
  </section>;
}
