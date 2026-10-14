import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { ArrowLeft, ChevronLeft, ChevronRight, Crop, Download, FlipHorizontal2, FlipVertical2, Info, PenLine, Redo2, RotateCw, SlidersHorizontal, Type, Undo2, Wand2, ZoomIn, ZoomOut, RefreshCw, ImageOff } from "lucide-react";
import type { PermissionState } from "@/contracts/common";
import type { PhotoEditView, PhotoView } from "@/contracts/media";
import { useSession } from "@/app/session";
import { useReport } from "@/app/feedback";
import { FIXTURE_PHOTOS } from "@/fixtures/data";
import { Screen } from "@/layouts/Screen";
import { VirtualGrid } from "@/ui/Virtual";
import { useContextMenu } from "@/ui/ContextMenu";
import { LARGE, makePhotos } from "@/fixtures/large";
import { Maximize2 } from "lucide-react";
import { Banner, Button, ChipRow, IconButton, SearchField, Segmented, Sheet, Slider, StateView, cn, formatBytes, hueGradient } from "@/ui";
import { MediaPermission, MediaSwitcher } from "../shared/Media";

const DEFAULT_EDIT: PhotoEditView = { rotate: 0, flipX: false, flipY: false, brightness: 100, contrast: 100, saturation: 100, grayscale: 0, blur: 0, filter: "none", strokes: 0, texts: 0 };
const FILTERS = [{ id: "none", label: "Original" }, { id: "mono", label: "Mono", p: { grayscale: 100 } }, { id: "warm", label: "Warm", p: { saturation: 125, brightness: 104 } }, { id: "fade", label: "Fade", p: { contrast: 85, brightness: 108 } }, { id: "punch", label: "Punch", p: { contrast: 125, saturation: 115 } }] as const;
const cssFilter = (e: PhotoEditView) => `brightness(${e.brightness}%) contrast(${e.contrast}%) saturate(${e.saturation}%) grayscale(${e.grayscale}%) blur(${e.blur}px)`;

/** Non-destructive editor. Preview applies CSS only; export is delegated to Locat renderPhotoEdit (save as copy). */
function Editor({ photo, onClose }: { photo: PhotoView; onClose(): void }) {
  const { adapter } = useSession(); const report = useReport();
  const [hist, setHist] = useState<PhotoEditView[]>([DEFAULT_EDIT]); const [idx, setIdx] = useState(0);
  const [tool, setTool] = useState<"adjust" | "filters" | "crop" | "draw" | "text">("adjust");
  const e = hist[idx];
  const push = (p: Partial<PhotoEditView>) => { const n = [...hist.slice(0, idx + 1), { ...e, ...p }].slice(-30); setHist(n); setIdx(n.length - 1); };
  return (
    <Sheet open onClose={onClose} title="Edit photo" description="Edits are saved as a new copy. The original is never changed." size="lg" testId="photo-editor"
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" icon={Download} onClick={async () => report(await adapter.media.exportPhoto(photo.id, e, "copy"), "Saved as copy")} data-testid="photo-export">Save as copy</Button></>}>
      <div className="mb-3 flex items-center gap-1">
        <IconButton icon={Undo2} label="Undo" disabledReason={idx === 0 ? "Nothing to undo" : null} onClick={() => setIdx(idx - 1)} data-testid="photo-undo" />
        <IconButton icon={Redo2} label="Redo" disabledReason={idx >= hist.length - 1 ? "Nothing to redo" : null} onClick={() => setIdx(idx + 1)} />
        <span className="flex-1 text-center text-2xs text-ink-3">{idx} edit{idx === 1 ? "" : "s"} · undo history 30</span>
        <IconButton icon={RotateCw} label="Rotate 90°" onClick={() => push({ rotate: ((e.rotate + 90) % 360) as PhotoEditView["rotate"] })} data-testid="photo-rotate" />
        <IconButton icon={FlipHorizontal2} label="Flip horizontal" onClick={() => push({ flipX: !e.flipX })} />
        <IconButton icon={FlipVertical2} label="Flip vertical" onClick={() => push({ flipY: !e.flipY })} />
      </div>
      <div className="grid h-64 place-items-center overflow-hidden rounded-2xl bg-black md:h-80">
        <div className="h-[80%] aspect-[4/3] rounded-md transition-transform duration-300" style={{ background: hueGradient(photo.hue), filter: cssFilter(e), transform: `rotate(${e.rotate}deg) scale(${e.flipX ? -1 : 1}, ${e.flipY ? -1 : 1})` }} />
      </div>
      <Segmented className="mt-4" label="Editing tool" value={tool} onChange={setTool} size="sm" options={[{ value: "adjust", label: "Adjust", icon: SlidersHorizontal }, { value: "filters", label: "Filters", icon: Wand2 }, { value: "crop", label: "Crop", icon: Crop }, { value: "draw", label: "Draw", icon: PenLine }, { value: "text", label: "Text", icon: Type }]} />
      <div className="mt-4">
        {tool === "adjust" && <div className="space-y-4">{(["brightness", "contrast", "saturation"] as const).map((k) => (
          <label key={k} className="block text-sm"><span className="mb-2 flex justify-between capitalize"><span>{k}</span><span className="font-mono text-xs tabular text-ink-3">{e[k]}%</span></span><Slider label={k} min={0} max={200} value={e[k]} onChange={(v) => push({ [k]: v })} /></label>))}
          <label className="block text-sm"><span className="mb-2 flex justify-between"><span>Blur</span><span className="font-mono text-xs text-ink-3">{e.blur}px</span></span><Slider label="Blur" min={0} max={10} step={0.5} value={e.blur} onChange={(v) => push({ blur: v })} /></label></div>}
        {tool === "filters" && <div className="no-scrollbar flex gap-3 overflow-x-auto">{FILTERS.map((f) => (
          <button key={f.id} onClick={() => push({ ...DEFAULT_EDIT, rotate: e.rotate, flipX: e.flipX, flipY: e.flipY, filter: f.id, ...("p" in f ? f.p : {}) })} className="w-20 shrink-0 text-center"><span className={cn("block aspect-square rounded-xl", e.filter === f.id && "ring-2 ring-ember")} style={{ background: hueGradient(photo.hue), filter: cssFilter({ ...DEFAULT_EDIT, ...("p" in f ? f.p : {}) }) }} /><span className="mt-1 block text-xs font-semibold">{f.label}</span></button>))}</div>}
        {tool === "crop" && <div className="flex flex-wrap gap-2">{["Free", "1:1", "4:3", "16:9", "9:16"].map((r) => <Button key={r} size="sm" onClick={() => push({ crop: { x: 0, y: 0, w: 1, h: 1 } })}>{r}</Button>)}</div>}
        {tool === "draw" && <div className="flex items-center gap-2">{["#E86B2C", "#FFFFFF", "#4AC98C", "#60A0F0", "#111111"].map((c) => <button key={c} aria-label={`Brush ${c}`} onClick={() => push({ strokes: e.strokes + 1 })} className="size-9 rounded-full ring-1 ring-line-strong" style={{ background: c }} />)}<span className="ml-2 text-xs text-ink-3">{e.strokes} strokes · draw on the photo above (touch/stylus)</span></div>}
        {tool === "text" && <div className="flex gap-2"><input className="h-11 flex-1 rounded-xl bg-s2 px-3 outline-none hairline" placeholder="Add text annotation" aria-label="Annotation text" /><Button onClick={() => push({ texts: e.texts + 1 })}>Add</Button></div>}
      </div>
      <Banner className="mt-4" tone="planned" title="Full-resolution, layers and RAW editing are planned">Export is JPEG. Physical mobile crop/rotation acceptance is still pending.</Banner>
    </Sheet>
  );
}

function Viewer({ photo, list, onClose }: { photo: PhotoView; list: PhotoView[]; onClose(): void }) {
  const nav = useNavigate();
  const [zoom, setZoom] = useState(1); const [edit, setEdit] = useState(false); const [info, setInfo] = useState(false);
  const i = list.findIndex((p) => p.id === photo.id);
  const go = (d: number) => { const n = list[(i + d + list.length) % list.length]; setZoom(1); nav(`/photos/${n.id}`, { replace: true }); };
  return (
    <div className="flex h-full flex-col bg-black text-white" data-testid="photo-viewer" tabIndex={-1} onKeyDown={(e) => { if (e.key === "ArrowRight") go(1); if (e.key === "ArrowLeft") go(-1); }}>
      <div className="flex shrink-0 items-center gap-1 px-2 pt-safe md:px-4">
        <IconButton icon={ArrowLeft} label="Back to photos" onClick={onClose} className="text-white hover:bg-white/10" data-testid="viewer-back" />
        <p className="min-w-0 flex-1 truncate text-sm font-semibold">{photo.name}<span className="ml-2 text-xs font-normal text-white/50">{i + 1} / {list.length}</span></p>
        <IconButton icon={ZoomOut} label="Zoom out" onClick={() => setZoom(Math.max(1, zoom - 0.5))} className="text-white hover:bg-white/10" />
        <IconButton icon={ZoomIn} label="Zoom in" onClick={() => setZoom(Math.min(4, zoom + 0.5))} className="text-white hover:bg-white/10" />
        <IconButton icon={Info} label="Details" onClick={() => setInfo(true)} className="text-white hover:bg-white/10" />
        <IconButton icon={SlidersHorizontal} label="Edit" disabledReason={photo.supported ? null : "Format not supported for editing"} onClick={() => setEdit(true)} className="text-white hover:bg-white/10" data-testid="viewer-edit" />
      </div>
      <div className="relative grid min-h-0 flex-1 place-items-center overflow-hidden" onDoubleClick={() => setZoom(zoom > 1 ? 1 : 2)}>
        {photo.supported ? <div className="max-h-full max-w-full rounded-sm transition-transform duration-200" style={{ background: hueGradient(photo.hue), aspectRatio: `${photo.width}/${photo.height}`, height: photo.height > photo.width ? "88%" : undefined, width: photo.width >= photo.height ? "min(92%, 1100px)" : undefined, transform: `scale(${zoom})` }} />
          : <StateView kind="unsupported" title="Can't preview this format" body={`${photo.mime} isn't decodable on this device. You can still share or download the original.`} className="text-white" />}
        <button onClick={() => go(-1)} aria-label="Previous photo" className="absolute left-2 grid size-11 place-items-center rounded-full bg-white/10 backdrop-blur hover:bg-white/20"><ChevronLeft /></button>
        <button onClick={() => go(1)} aria-label="Next photo" className="absolute right-2 grid size-11 place-items-center rounded-full bg-white/10 backdrop-blur hover:bg-white/20" data-testid="viewer-next"><ChevronRight /></button>
      </div>
      {edit && <Editor photo={photo} onClose={() => setEdit(false)} />}
      <Sheet open={info} onClose={() => setInfo(false)} title="Photo details" size="sm">
        <dl className="grid grid-cols-2 gap-y-2 text-sm">{[["Name", photo.name], ["Album", photo.album], ["Dimensions", `${photo.width} × ${photo.height}`], ["Size", formatBytes(photo.sizeBytes)], ["Type", photo.mime], ["Taken", new Date(photo.takenAt).toLocaleString()]].map(([k, v]) => <div key={k} className="contents"><dt className="text-ink-3">{k}</dt><dd className="break-all text-right">{v}</dd></div>)}</dl>
      </Sheet>
    </div>
  );
}

export default function Photos() {
  const { pathname } = useLocation(); const nav = useNavigate();
  const { adapter, prefs } = useSession(); const report = useReport(); const ctx = useContextMenu();
  const ALL = useMemo(() => (prefs.largeLibraries ? makePhotos(LARGE.photos) : FIXTURE_PHOTOS), [prefs.largeLibraries]);
  const [album, setAlbum] = useState("all"); const [q, setQ] = useState(""); const [sort, setSort] = useState<"newest" | "oldest">("newest");
  const [perm, setPerm] = useState<PermissionState>("limited");
  const id = pathname.split("/")[2];
  const list = useMemo(() => ALL.filter((p) => (album === "all" || p.album === album) && (!q || p.name.toLowerCase().includes(q.toLowerCase()))).sort((a, b) => (sort === "newest" ? b.takenAt - a.takenAt : a.takenAt - b.takenAt)), [ALL, album, q, sort]);
  const open = ALL.find((p) => p.id === id);
  if (open) return <Viewer photo={open} list={list.length ? list : ALL} onClose={() => nav("/photos")} />;
  const albums = [...new Set(ALL.map((p) => p.album))];
  return (
    <Screen title="Photos" testId="photos-screen" subtitle="Beta · this device's photos, edited locally"
      actions={<IconButton icon={RefreshCw} label="Refresh" onClick={async () => report(await adapter.media.refreshLibrary("photo", "device"), "Refreshed")} />}
      toolbar={<div className="space-y-2"><div className="flex flex-wrap items-center gap-2"><MediaSwitcher /><SearchField value={q} onChange={setQ} placeholder="Search photos" className="min-w-[180px] flex-1" testId="photos-search" /><Segmented size="sm" label="Sort" value={sort} onChange={setSort} options={[{ value: "newest", label: "Newest" }, { value: "oldest", label: "Oldest" }]} /></div>
        <ChipRow label="Albums" value={album} onChange={setAlbum} options={[{ value: "all", label: "All photos", count: ALL.length }, ...albums.map((a) => ({ value: a, label: a }))]} /></div>}>
      {perm === "denied" || perm === "blocked" ? <MediaPermission kind="Photos" state={perm} onRequest={() => setPerm("blocked")} /> : <>
        {perm === "limited" && <Banner className="mb-4" tone="info" icon={ImageOff} title="Showing only photos you selected" action={<Button size="sm" onClick={() => setPerm("granted")} data-testid="photos-allow-all">Allow all</Button>}>You gave Locat limited access. Add more photos or allow full access anytime.</Banner>}
        {list.length ? <VirtualGrid items={list} getKey={(p) => p.id} minItemWidth={110} gap={4} rowHeight={(w) => w} ariaLabel={`${list.length} photos`} testId="photo-grid"
          renderItem={(p) => <button onClick={() => nav(`/photos/${p.id}`)} aria-label={`${p.name}, ${p.album}`} data-testid={`photo-${p.id}`} className="relative block aspect-square w-full overflow-hidden rounded-md transition-transform hover:scale-[.98]" style={{ background: hueGradient(p.hue) }}
            onContextMenu={ctx.onContextMenu(p.name, [{ id: "open", label: "Open", icon: Maximize2, onSelect: () => nav(`/photos/${p.id}`) }, { id: "edit", label: "Edit a copy", icon: SlidersHorizontal, onSelect: () => nav(`/photos/${p.id}`), disabledReason: p.supported ? undefined : "Unsupported format" }, { id: "info", label: `${p.width}×${p.height} · ${formatBytes(p.sizeBytes)}`, icon: Info, separatorBefore: true, onSelect: () => undefined }])}>{!p.supported && <span className="absolute inset-x-1 bottom-1 rounded bg-black/60 py-0.5 text-[10px] font-bold text-white">HEIC</span>}</button>} />
          : <StateView kind="empty" title="No photos here" />}
        <div className="mt-6 text-center"><Button size="sm" variant="ghost" onClick={() => setPerm("denied")}>Preview: show denied state</Button></div>
      </>}
    </Screen>
  );
}
