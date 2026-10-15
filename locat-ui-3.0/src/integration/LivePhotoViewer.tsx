import { safeMediaUrl } from "./mediaSource";
import { useEffect, useReducer, useRef, useState, type SetStateAction } from "react";
import { defaultPhotoEdit, renderPhotoEdit } from "../lib/photoEditing";
import { editedImageFile } from "../lib/imageEditing";
import { Button, Slider, TextField } from "../ui";
import type { LocalMediaItem } from "./localMediaStore";
import {createPhotoEditHistory,photoEditHistory,PHOTO_UNDO_LIMIT} from '../lib/photoEditHistory';
import type {PhotoEdit} from '../lib/photoEditing';
export function LivePhotoViewer({ item, onClose }: { item: LocalMediaItem; onClose(): void }) {
  const image = useRef<HTMLImageElement>(null);
  const preview = useRef<HTMLCanvasElement>(null);
  const [decoded, setDecoded] = useState(false);
  const [caption, setCaption] = useState("");
  const [captionColor, setCaptionColor] = useState("#ffffff");
  const [tool, setTool] = useState("crop");
  const [url, setUrl] = useState("");
  const [history,dispatch]=useReducer(photoEditHistory,undefined,createPhotoEditHistory);
  const edit=history.present;
  const setEdit=(update:SetStateAction<PhotoEdit>)=>dispatch({type:'edit',update});
  const [error, setError] = useState("");
  const [zoom, setZoom] = useState(1);
  const direct = safeMediaUrl(item);
  useEffect(() => { const url = direct ?? URL.createObjectURL(item.file); const timer = setTimeout(() => setUrl(url), 0); return () => { clearTimeout(timer); if (!direct) URL.revokeObjectURL(url); }; }, [item.file, direct]);
  useEffect(() => {
    if (!decoded || !image.current || !preview.current) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const canvas = renderPhotoEdit({ image: image.current, width: image.current.naturalWidth, height: image.current.naturalHeight }, edit);
      preview.current.width = canvas.width; preview.current.height = canvas.height;
      const context = preview.current.getContext("2d"); if (!context) throw new Error("Photo preview is unavailable in this browser.");
      context.drawImage(canvas, 0, 0);
    } catch (error) { timer = setTimeout(() => setError(error instanceof Error ? error.message : "Photo preview failed"), 0); }
    return () => { if (timer) clearTimeout(timer); };
  }, [decoded, edit]);
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
    <img ref={image} src={url || undefined} alt="" className="hidden" onLoad={() => { setDecoded(true); setError(""); }} onError={() => setError("This image format cannot be decoded.")} />
    <div className="flex h-96 items-center justify-center overflow-auto rounded-xl bg-black">{!decoded && <p role="status" className="text-white/70">Loading photo…</p>}<canvas ref={preview} role="img" aria-label={`Edited preview of ${item.name}`} className="max-h-full max-w-full object-contain" style={{ display: decoded ? undefined : "none", transform: `scale(${zoom})` }} /></div>
    <div className="flex flex-wrap gap-2"><Button variant="ghost" onClick={() => setEdit(old => ({ ...old, geometry: { ...old.geometry, turns: (old.geometry.turns + 1) % 4 } }))}>Rotate</Button><Button variant="ghost" onClick={() => setEdit(old => ({ ...old, flipX: !old.flipX }))}>Flip horizontal</Button><Button variant="ghost" onClick={() => setEdit(old => ({ ...old, flipY: !old.flipY }))}>Flip vertical</Button><Button variant="ghost" onClick={() => { setEdit(defaultPhotoEdit()); setCaption(""); setError(""); }}>Reset edits</Button><Button onClick={() => void exportCopy()}>Download edited copy</Button></div>
    <Slider label="Viewer zoom" min={1} max={3} step={0.1} value={zoom} onChange={setZoom} />
    <div className="flex flex-wrap gap-2" role="group" aria-label="Photo edit history"><Button variant="ghost" disabled={!history.past.length} onClick={()=>{dispatch({type:'undo'});setError('');}}>Undo edit</Button><Button variant="ghost" disabled={!history.future.length} onClick={()=>{dispatch({type:'redo'});setError('');}}>Redo edit</Button></div>
    {(["brightness", "contrast", "saturation"] as const).map(key => <Slider key={key} label={key} min={0} max={200} value={edit[key]} onChange={value => setEdit(old => ({ ...old, [key]: value }))} />)}
    <div className="flex flex-wrap gap-2" role="group" aria-label="Photo tools">{["crop", "text"].map(value => <Button key={value} variant="ghost" aria-pressed={tool === value} onClick={() => setTool(value)}>{value === "crop" ? "Crop" : "Text annotations"}</Button>)}</div>
    {tool === "crop" ? <div className="space-y-4 rounded-xl bg-s1 p-4 hairline">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Crop shape">{(["original", "square", "portrait", "wide"] as const).map(crop => <Button key={crop} variant="ghost" aria-pressed={edit.geometry.crop === crop} onClick={() => setEdit(old => ({ ...old, geometry: { ...old.geometry, crop } }))}>{crop}</Button>)}</div>
      <Slider label="Crop zoom" min={1} max={3} step={0.1} value={edit.geometry.zoom} onChange={zoom => setEdit(old => ({ ...old, geometry: { ...old.geometry, zoom } }))} />
      <Slider label="Crop horizontal position" min={0} max={1} step={0.01} value={edit.geometry.x} onChange={x => setEdit(old => ({ ...old, geometry: { ...old.geometry, x } }))} />
      <Slider label="Crop vertical position" min={0} max={1} step={0.01} value={edit.geometry.y} onChange={y => setEdit(old => ({ ...old, geometry: { ...old.geometry, y } }))} />
    </div> : <div className="space-y-4 rounded-xl bg-s1 p-4 hairline">
      <form className="space-y-3" onSubmit={event => { event.preventDefault(); if (caption.trim() && edit.texts.length < 30) { setEdit(old => ({ ...old, texts: [...old.texts, { text: caption.trim(), color: captionColor, size: 5, x: 0.05, y: 0.15 }] })); setCaption(""); } }}><TextField label="Annotation text" value={caption} required maxLength={200} onChange={event => setCaption(event.target.value)} /><TextField label="Annotation color" type="color" value={captionColor} onChange={event => setCaptionColor(event.target.value)} /><Button type="submit" disabled={!caption.trim() || edit.texts.length >= 30}>Add text</Button></form>
      {edit.texts.map((text, index) => <div key={index} className="space-y-3 rounded-xl bg-s2 p-3"><p className="break-words text-sm font-semibold">{text.text}</p>{(["x", "y", "size"] as const).map(key => <Slider key={key} label={`Text ${index + 1} ${key === "x" ? "horizontal position" : key === "y" ? "vertical position" : "size"}`} min={key === "size" ? 1 : 0} max={key === "size" ? 20 : 1} step={key === "size" ? 1 : 0.01} value={text[key]} onChange={value => setEdit(old => ({ ...old, texts: old.texts.map((row, i) => i === index ? { ...row, [key]: value } : row) }))} />)}<Button variant="ghost" aria-label={`Remove text ${index + 1}`} onClick={() => setEdit(old => ({ ...old, texts: old.texts.filter((_, i) => i !== index) }))}>Remove text</Button></div>)}
    </div>}
    <p className="text-xs text-ink-3">Your original stays unchanged. JPEG copies use a maximum 1600px edge; crop and text appear in the edited preview and export. Viewer zoom changes only the view. Undo keeps up to {PHOTO_UNDO_LIMIT} recent edit steps while this photo is open; closing it discards that history.</p>
    {error && <p role="alert" className="text-danger">{error}</p>}
  </section>;
}
