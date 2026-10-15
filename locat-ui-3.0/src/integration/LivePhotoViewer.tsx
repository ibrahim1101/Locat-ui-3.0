import { safeMediaUrl } from "./mediaSource";
import { useCallback, useEffect, useReducer, useRef, useState, type PointerEvent, type SetStateAction } from "react";
import { defaultPhotoEdit, renderPhotoEdit } from "../lib/photoEditing";
import { editedImageFile } from "../lib/imageEditing";
import { Button, Slider, TextField, formatBytes } from "../ui";
import type { LocalMediaItem } from "./localMediaStore";
import {createPhotoEditHistory,photoEditHistory,PHOTO_UNDO_LIMIT} from '../lib/photoEditHistory';
import type {PhotoEdit,PhotoStroke} from '../lib/photoEditing';
import {photoPointerPoint,PHOTO_POINT_LIMIT,PHOTO_STROKE_LIMIT} from '../lib/photoDrawing';
export function LivePhotoViewer({ item, onClose }: { item: LocalMediaItem; onClose(): void }) {
  const image = useRef<HTMLImageElement>(null);
  const preview = useRef<HTMLCanvasElement>(null);
  const [decoded, setDecoded] = useState(false);
  const [sourceDimensions,setSourceDimensions]=useState<{width:number;height:number}|null>(null);
  const [caption, setCaption] = useState("");
  const [captionColor, setCaptionColor] = useState("#ffffff");
  const [tool, setTool] = useState("crop");
  const [url, setUrl] = useState("");
  const [history,dispatch]=useReducer(photoEditHistory,undefined,createPhotoEditHistory);
  const edit=history.present;
  const [brushColor,setBrushColor]=useState('#E86B2C'),[brushSize,setBrushSize]=useState(2),[draftStroke,setDraftStroke]=useState<PhotoStroke|null>(null);
  const drawing=useRef<{pointerId:number;stroke:PhotoStroke}|null>(null),paintFrame=useRef<number|null>(null);
  const disposeDrawing=useCallback(()=>{if(paintFrame.current!==null)cancelAnimationFrame(paintFrame.current);paintFrame.current=null;drawing.current=null;},[]);
  useEffect(()=>()=>disposeDrawing(),[disposeDrawing]);
  function cancelDrawing(){disposeDrawing();setDraftStroke(null);}
  const setEdit=(update:SetStateAction<PhotoEdit>)=>{cancelDrawing();dispatch({type:'edit',update});};
  function paintDrawing(){if(paintFrame.current!==null)return;paintFrame.current=requestAnimationFrame(()=>{paintFrame.current=null;setDraftStroke(drawing.current?.stroke??null);});}
  function startDrawing(event:PointerEvent<HTMLCanvasElement>){if(tool!=='draw'||!decoded||drawing.current||event.button!==0)return;if(edit.strokes.length>=PHOTO_STROKE_LIMIT){setError('This photo has reached the 100-stroke limit. Undo or clear drawing before adding more.');return;}const point=photoPointerPoint(event.clientX,event.clientY,event.currentTarget.getBoundingClientRect());if(!point)return;try{event.currentTarget.setPointerCapture(event.pointerId);}catch{setError('Pointer capture is unavailable in this browser.');return;}event.preventDefault();setError('');drawing.current={pointerId:event.pointerId,stroke:{color:brushColor,size:brushSize,points:[point]}};setDraftStroke(drawing.current.stroke);}
  function moveDrawing(event:PointerEvent<HTMLCanvasElement>){const current=drawing.current;if(!current||current.pointerId!==event.pointerId||current.stroke.points.length>=PHOTO_POINT_LIMIT)return;const point=photoPointerPoint(event.clientX,event.clientY,event.currentTarget.getBoundingClientRect());if(!point)return;const previous=current.stroke.points.at(-1)!;if(Math.hypot(previous.x-point.x,previous.y-point.y)<0.001)return;current.stroke={...current.stroke,points:[...current.stroke.points,point]};paintDrawing();}
  function finishDrawing(event:PointerEvent<HTMLCanvasElement>){const current=drawing.current;if(!current||current.pointerId!==event.pointerId)return;moveDrawing(event);const stroke=current.stroke;cancelDrawing();dispatch({type:'edit',update:old=>old.strokes.length<PHOTO_STROKE_LIMIT?{...old,strokes:[...old.strokes,stroke]}:old});if(event.currentTarget.hasPointerCapture(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId);}
  function cancelPointer(event:PointerEvent<HTMLCanvasElement>){if(drawing.current?.pointerId===event.pointerId)cancelDrawing();}
  const [error, setError] = useState("");
  const [zoom, setZoom] = useState(1);
  const direct = safeMediaUrl(item);
  useEffect(() => { const url = direct ?? URL.createObjectURL(item.file); const timer = setTimeout(() => setUrl(url), 0); return () => { clearTimeout(timer); if (!direct) URL.revokeObjectURL(url); }; }, [item.file, direct]);
  useEffect(() => {
    if (!decoded || !image.current || !preview.current) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const visibleEdit=draftStroke?{...edit,strokes:[...edit.strokes,draftStroke]}:edit;
      const canvas = renderPhotoEdit({ image: image.current, width: image.current.naturalWidth, height: image.current.naturalHeight }, visibleEdit);
      preview.current.width = canvas.width; preview.current.height = canvas.height;
      const context = preview.current.getContext("2d"); if (!context) throw new Error("Photo preview is unavailable in this browser.");
      context.drawImage(canvas, 0, 0);
    } catch (error) { timer = setTimeout(() => setError(error instanceof Error ? error.message : "Photo preview failed"), 0); }
    return () => { if (timer) clearTimeout(timer); };
  }, [decoded, edit,draftStroke]);
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
    <img ref={image} src={url || undefined} alt="" className="hidden" onLoad={event => { setSourceDimensions({width:event.currentTarget.naturalWidth,height:event.currentTarget.naturalHeight});setDecoded(true); setError(""); }} onError={() => setError("This image format cannot be decoded.")} />
    <div className="flex h-96 items-center justify-center overflow-auto rounded-xl bg-black">{!decoded && <p role="status" className="text-white/70">Loading photo…</p>}<canvas ref={preview} onPointerDown={startDrawing} onPointerMove={moveDrawing} onPointerUp={finishDrawing} onPointerCancel={cancelPointer} onLostPointerCapture={cancelPointer} role="img" aria-label={`Edited preview of ${item.name}`} className="max-h-full max-w-full object-contain" style={{ touchAction:tool==='draw'?'none':undefined,cursor:tool==='draw'?'crosshair':undefined, display: decoded ? undefined : "none", transform: `scale(${zoom})` }} /></div>
    <div className="flex flex-wrap gap-2"><Button variant="ghost" onClick={() => setEdit(old => ({ ...old, geometry: { ...old.geometry, turns: (old.geometry.turns + 1) % 4 } }))}>Rotate</Button><Button variant="ghost" onClick={() => setEdit(old => ({ ...old, flipX: !old.flipX }))}>Flip horizontal</Button><Button variant="ghost" onClick={() => setEdit(old => ({ ...old, flipY: !old.flipY }))}>Flip vertical</Button><Button variant="ghost" onClick={() => { setEdit(defaultPhotoEdit()); setCaption(""); setError(""); }}>Reset edits</Button><Button disabled={draftStroke!==null} onClick={() => void exportCopy()}>Download edited copy</Button></div>
    <details className="rounded-xl bg-s1 p-4 hairline"><summary className="cursor-pointer text-sm font-semibold">Photo information</summary><dl className="mt-3 grid grid-cols-2 gap-3 text-sm"><dt className="text-ink-3">Original dimensions</dt><dd>{sourceDimensions?`${sourceDimensions.width} × ${sourceDimensions.height} pixels`:"Waiting for image decode"}</dd><dt className="text-ink-3">File size</dt><dd>{Number.isFinite(item.size)&&item.size>=0?formatBytes(item.size):"Not provided"}</dd><dt className="text-ink-3">Reported file type</dt><dd className="break-words">{item.file.type||"Not provided"}</dd><dt className="text-ink-3">Source</dt><dd>{item.source==='server'?'Authenticated server library':'This browser'}</dd></dl><p className="mt-3 text-xs text-ink-3">Dimensions come from decoding the original image. Camera, capture date and GPS metadata are not extracted.</p></details>
    <Slider label="Viewer zoom" min={1} max={3} step={0.1} value={zoom} onChange={setZoom} />
    <div className="flex flex-wrap gap-2" role="group" aria-label="Photo edit history"><Button variant="ghost" disabled={!history.past.length} onClick={()=>{cancelDrawing();dispatch({type:'undo'});setError('');}}>Undo edit</Button><Button variant="ghost" disabled={!history.future.length} onClick={()=>{cancelDrawing();dispatch({type:'redo'});setError('');}}>Redo edit</Button></div>
    {(["brightness", "contrast", "saturation"] as const).map(key => <Slider key={key} label={key} min={0} max={200} value={edit[key]} onChange={value => setEdit(old => ({ ...old, [key]: value }))} />)}
    <div className="flex flex-wrap gap-2" role="group" aria-label="Photo tools">{["crop", "text", "draw"].map(value => <Button key={value} variant="ghost" aria-pressed={tool === value} disabled={value==='draw'&&!decoded} onClick={() => {cancelDrawing();setTool(value);}}>{value === "crop" ? "Crop" : value === "text" ? "Text annotations" : "Draw"}</Button>)}</div>
    {tool === "crop" ? <div className="space-y-4 rounded-xl bg-s1 p-4 hairline">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Crop shape">{(["original", "square", "portrait", "wide"] as const).map(crop => <Button key={crop} variant="ghost" aria-pressed={edit.geometry.crop === crop} onClick={() => setEdit(old => ({ ...old, geometry: { ...old.geometry, crop } }))}>{crop}</Button>)}</div>
      <Slider label="Crop zoom" min={1} max={3} step={0.1} value={edit.geometry.zoom} onChange={zoom => setEdit(old => ({ ...old, geometry: { ...old.geometry, zoom } }))} />
      <Slider label="Crop horizontal position" min={0} max={1} step={0.01} value={edit.geometry.x} onChange={x => setEdit(old => ({ ...old, geometry: { ...old.geometry, x } }))} />
      <Slider label="Crop vertical position" min={0} max={1} step={0.01} value={edit.geometry.y} onChange={y => setEdit(old => ({ ...old, geometry: { ...old.geometry, y } }))} />
    </div> : tool === "text" ? <div className="space-y-4 rounded-xl bg-s1 p-4 hairline">
      <form className="space-y-3" onSubmit={event => { event.preventDefault(); if (caption.trim() && edit.texts.length < 30) { setEdit(old => ({ ...old, texts: [...old.texts, { text: caption.trim(), color: captionColor, size: 5, x: 0.05, y: 0.15 }] })); setCaption(""); } }}><TextField label="Annotation text" value={caption} required maxLength={200} onChange={event => setCaption(event.target.value)} /><TextField label="Annotation color" type="color" value={captionColor} onChange={event => setCaptionColor(event.target.value)} /><Button type="submit" disabled={!caption.trim() || edit.texts.length >= 30}>Add text</Button></form>
      {edit.texts.map((text, index) => <div key={index} className="space-y-3 rounded-xl bg-s2 p-3"><p className="break-words text-sm font-semibold">{text.text}</p>{(["x", "y", "size"] as const).map(key => <Slider key={key} label={`Text ${index + 1} ${key === "x" ? "horizontal position" : key === "y" ? "vertical position" : "size"}`} min={key === "size" ? 1 : 0} max={key === "size" ? 20 : 1} step={key === "size" ? 1 : 0.01} value={text[key]} onChange={value => setEdit(old => ({ ...old, texts: old.texts.map((row, i) => i === index ? { ...row, [key]: value } : row) }))} />)}<Button variant="ghost" aria-label={`Remove text ${index + 1}`} onClick={() => setEdit(old => ({ ...old, texts: old.texts.filter((_, i) => i !== index) }))}>Remove text</Button></div>)}
    </div> : <div className="space-y-4 rounded-xl bg-s1 p-4 hairline">
      <p className="text-sm text-ink-3">Drag on the photo to draw. Each completed stroke is one undo step. Cancelled gestures are discarded. Up to {PHOTO_STROKE_LIMIT} strokes with {PHOTO_POINT_LIMIT} points each.</p>
      <TextField label="Brush color" type="color" value={brushColor} onChange={event=>{cancelDrawing();setBrushColor(event.target.value);}} />
      <Slider label="Brush width (% of image)" min={0.2} max={10} step={0.2} value={brushSize} onChange={value=>{cancelDrawing();setBrushSize(value);}} />
      <Button variant="ghost" disabled={!edit.strokes.length} onClick={()=>setEdit(old=>({...old,strokes:[]}))}>Clear drawing</Button>
    </div>}
    <p className="text-xs text-ink-3">Your original stays unchanged. JPEG copies use a maximum 1600px edge; crop, text and drawing appear in the edited preview and export. Viewer zoom changes only the view. Undo keeps up to {PHOTO_UNDO_LIMIT} recent edit steps while this photo is open; closing it discards that history.</p>
    {error && <p role="alert" className="text-danger">{error}</p>}
  </section>;
}
