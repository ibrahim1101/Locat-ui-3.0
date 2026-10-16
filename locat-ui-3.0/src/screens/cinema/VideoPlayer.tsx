import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowLeft, Captions, FlaskConical, Gauge, Maximize, Pause, PictureInPicture2, Play, RectangleHorizontal, RotateCcw, RotateCw, Settings, Volume2, VolumeX, WifiOff, AlertTriangle } from "lucide-react";
import type { PlaybackView, PlayerCallbacks, VideoItemView } from "@/contracts/media";
import { useBackLayer } from "@/app/back";
import { ActionMenu, IconButton, Slider, Sheet, Button, cn, formatDuration, hueGradient } from "@/ui";

/**
 * Presentational video player chrome. The live adapter mounts Locat's
 * LocalCinemaPlayer / CinemaHlsPlayer <video> into `surface` and maps its
 * events into PlaybackView; this component never decodes media.
 */
export function PlayerChrome({ video, state: s, cb, onClose, surface, onLoadSubtitle, onInspect, inspectionError }: { inspectionError?:string; onInspect?: () => void; onLoadSubtitle?: () => void; surface?: ReactNode; video: VideoItemView; state: PlaybackView; cb: PlayerCallbacks; onClose(): void }) {
  const [shown, setShown] = useState(true);
  const [menu, setMenu] = useState<"speed" | "subs" | "quality" | "fit" | "info" | null>(null);
  const hide = useRef<number>(0);
  const [shownFor, setShownFor] = useState(s.state);
  if (shownFor !== s.state) { setShownFor(s.state); setShown(true); }
  const poke = () => { setShown(true); clearTimeout(hide.current); if (s.state === "playing") hide.current = window.setTimeout(() => setShown(false), 2800); };
  useEffect(() => {
    clearTimeout(hide.current);
    if (s.state === "playing") hide.current = window.setTimeout(() => setShown(false), 2800);
    return () => clearTimeout(hide.current);
  }, [s.state]);
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey || menu || document.querySelector('[role="dialog"][aria-modal="true"]')
        || (e.target instanceof Element && e.target.closest('input,textarea,select,button,a,[role="slider"],[contenteditable="true"]'))) return;
      if (e.key === " " || e.key === "k") { e.preventDefault(); cb.onTogglePlay(); }
      if (s.seekable !== false && e.key === "ArrowRight") cb.onSeek(s.positionSec + 10);
      if (s.seekable !== false && e.key === "ArrowLeft") cb.onSeek(s.positionSec - 10);
      if (e.key === "f") cb.onFullscreen();
      if (e.key === "m") cb.onMute();
      poke();
    };
    window.addEventListener("keydown", on); return () => window.removeEventListener("keydown", on);
  });
  const quality = s.qualities.find((q) => q.id === s.activeQuality);
  return (
    <div className="fixed inset-0 z-30 bg-black text-white md:relative md:z-auto md:h-full" onMouseMove={poke} onClick={poke} data-testid="video-player">
      <div className="absolute inset-0 grid place-items-center" style={{ background: hueGradient(video.posterHue) }}>
        {surface ? <div className="absolute inset-0">{surface}</div> : <div className={cn("absolute inset-0 bg-black/30", s.fit === "cover" && "scale-110")} />}
        {s.state === "buffering" && <span className="relative size-12 animate-spin rounded-full border-2 border-white/20 border-t-white" role="status" aria-label="Buffering" />}
        {s.state === "reconnecting" && <div className="relative flex items-center gap-2 rounded-full bg-black/60 px-4 py-2 text-sm"><WifiOff className="size-4" />Reconnecting…</div>}
        {!surface && <p className="pointer-events-none absolute bottom-28 flex items-center gap-1.5 rounded-full bg-black/50 px-3 py-1 text-2xs font-semibold text-white/80"><FlaskConical className="size-3" />Preview surface — Locat's player engine mounts here</p>}
      </div>

      <div className={cn("absolute inset-0 flex flex-col justify-between bg-gradient-to-b from-black/70 via-transparent to-black/80 transition-opacity duration-300", shown ? "opacity-100" : "pointer-events-none opacity-0")}>
        <div className="flex items-center gap-2 px-3 pt-safe md:px-5 md:pt-4">
          <IconButton icon={ArrowLeft} label="Close player" onClick={onClose} className="text-white hover:bg-white/10" data-testid="player-close" />
          <div className="min-w-0 flex-1"><p className="truncate text-[15px] font-bold">{video.title}</p><p className="text-xs text-white/60">{video.source === "server" ? `Server · ${video.delivery === "hls" ? "HLS (experimental)" : video.delivery === "remux" ? "Remuxed stream" : video.delivery === "transcode" ? "Converted stream" : "Direct · byte-range"}` : "This device · direct"}</p></div>
          {quality && <Button size="sm" variant="ghost" className="bg-white/15 text-white hover:bg-white/25" data-testid="player-playback-options" onClick={()=>quality.id==="options"?cb.onQuality(quality.id):setMenu("quality")}>{quality.label}</Button>}
          <IconButton icon={Settings} label="Stream info" onClick={() => {onInspect?.();setMenu("info");}} className="text-white hover:bg-white/10" />
        </div>
        {s.state==="loading"&&<p role="status" className="pointer-events-none absolute left-5 top-20 rounded-xl bg-black/70 p-2 text-sm text-white/80">{video.delivery==="transcode"?"Preparing H.264/AAC conversion…":video.delivery==="remux"?"Preparing remuxed MP4…":"Loading direct playback…"}</p>}
        <div className="flex items-center justify-center gap-6">
          {s.state === "error" && s.error && (
          <div className="relative mx-6 max-w-md rounded-2xl bg-black/70 p-5 text-center backdrop-blur" role="alert" data-testid="player-error">
            <AlertTriangle className="mx-auto mb-3 size-7 text-warn" />
            <p className="font-bold">{s.error.code === "codec" ? "This video's format can't be played here" : s.error.code === "network" ? "Connection to your server dropped" : "Playback stopped"}</p>
            <p className="mt-1.5 text-sm text-white/70">{s.error.message}</p>
            {quality?.id==="options"&&<Button className="mt-3" onClick={()=>cb.onQuality(quality.id)}>Choose compatible playback</Button>}
          </div>)}
          {s.state!=="error"&&<>
          <IconButton icon={RotateCcw} label="Back 10 seconds" disabledReason={s.seekable === false ? "Progressive conversion cannot seek" : undefined} size="lg" onClick={() => cb.onSeek(s.positionSec - 10)} className="text-white hover:bg-white/10" />
          <button onClick={cb.onTogglePlay} aria-label={s.state === "playing" ? "Pause" : "Play"} data-testid="player-play-toggle" className="grid size-[76px] place-items-center rounded-full bg-white/95 text-black shadow-xl active:scale-95">{s.state === "playing" ? <Pause className="size-8 fill-current" /> : <Play className="ml-1 size-8 fill-current" />}</button>
          <IconButton icon={RotateCw} label="Forward 10 seconds" disabledReason={s.seekable === false ? "Progressive conversion cannot seek" : undefined} size="lg" onClick={() => cb.onSeek(s.positionSec + 10)} className="text-white hover:bg-white/10" />
          </>}
        </div>
        <div className="px-4 pb-safe md:px-6 md:pb-5" style={{ paddingBottom: "max(16px, env(safe-area-inset-bottom))" }}>
          <div className="relative mb-2">
            <div className="pointer-events-none absolute left-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-white/25" style={{ width: `${(s.bufferedSec / s.durationSec) * 100}%` }} />
            <Slider disabled={s.seekable === false} label="Seek" min={0} max={s.durationSec} value={s.positionSec} onChange={cb.onSeek} format={formatDuration} className="relative" />
          </div>
          <div className="flex items-center gap-1">
            <span className="mr-2 font-mono text-xs tabular text-white/80">{formatDuration(s.positionSec)} / {formatDuration(s.durationSec)}</span>
            <IconButton icon={s.muted ? VolumeX : Volume2} label={s.muted ? "Unmute" : "Mute"} onClick={cb.onMute} className="text-white hover:bg-white/10" />
            <div className="hidden w-24 md:block"><Slider label="Volume" min={0} max={1} step={0.05} value={s.muted ? 0 : s.volume} onChange={cb.onVolume} /></div>
            <span className="flex-1" />
            <IconButton icon={Gauge} label={`Speed ${s.rate}×`} onClick={() => setMenu("speed")} className="text-white hover:bg-white/10" data-testid="player-speed" />
            <IconButton icon={Captions} label="Subtitles" active={!!s.activeSubtitle} onClick={() => setMenu("subs")} className="text-white hover:bg-white/10" />
            <IconButton icon={RectangleHorizontal} label="Aspect / fit" onClick={() => setMenu("fit")} className="text-white hover:bg-white/10" />
            <IconButton icon={Settings} label="Quality" onClick={() => setMenu("quality")} className="text-white hover:bg-white/10" data-testid="player-quality" />
            <IconButton icon={PictureInPicture2} label="Picture in picture" onClick={cb.onPip} disabledReason={s.pip === "unsupported" ? "Picture-in-picture isn't supported here" : null} className="text-white hover:bg-white/10" />
            <IconButton icon={Maximize} label="Full screen (F)" onClick={cb.onFullscreen} className="text-white hover:bg-white/10" />
          </div>
        </div>
      </div>
      <ActionMenu open={menu === "speed"} onClose={() => setMenu(null)} title="Playback speed" actions={[0.5, 0.75, 1, 1.25, 1.5, 2].map((r) => ({ id: `rate-${r}`, label: `${r}×${r === s.rate ? "  ✓" : ""}`, onSelect: () => cb.onRate(r) }))} />
      <ActionMenu open={menu === "subs"} onClose={() => setMenu(null)} title="Subtitles" actions={[{ id: "sub-off", label: `Off${!s.activeSubtitle ? "  ✓" : ""}`, onSelect: () => cb.onSubtitle(undefined) }, ...s.subtitles.map((t) => ({ id: t.id, label: `${t.label}${t.id === s.activeSubtitle ? "  ✓" : ""}`, onSelect: () => cb.onSubtitle(t.id) })), { id: "sub-load", label: "Load WebVTT file…", onSelect: () => onLoadSubtitle?.(), disabledReason: onLoadSubtitle ? undefined : "Preview" }, { id: "sub-host", label: "Hosted subtitle & audio tracks", onSelect: () => undefined, disabledReason: "Planned" }]} />
      <ActionMenu open={menu === "fit"} onClose={() => setMenu(null)} title="Fit" actions={(["contain", "cover", "fill"] as const).map((f) => ({ id: f, label: `${{ contain: "Fit to screen", cover: "Fill (crop)", fill: "Stretch" }[f]}${f === s.fit ? "  ✓" : ""}`, onSelect: () => cb.onFit(f) }))} />
      <ActionMenu open={menu === "quality"} onClose={() => setMenu(null)} title="Quality" actions={s.qualities.map((q) => ({ id: q.id, label: `${q.label}${q.experimental ? " · experimental" : ""}${q.id === s.activeQuality ? "  ✓" : ""}`, onSelect: () => cb.onQuality(q.id) }))} />
      <Sheet open={menu === "info"} onClose={() => setMenu(null)} title="Stream details" size="sm">
        {inspectionError&&<p role="alert" className="mb-3 text-danger">{inspectionError}</p>}
        <dl className="grid grid-cols-2 gap-y-2 text-sm">{[["Container", video.container || "Unknown"], ["Video", `${video.videoCodec || "Unknown codec"} · ${video.width && video.height ? `${video.width}×${video.height}` : "Resolution unavailable"}`], ["Audio", video.audioCodec || "Unknown or no audio"], ["Delivery", video.delivery || "direct"], ["Source", video.source]].map(([k, v]) => <div key={k} className="contents"><dt className="text-ink-3">{k}</dt><dd className="font-mono text-xs">{v}</dd></div>)}</dl>
        <p className="mt-4 text-xs text-ink-3">4K and HEVC/AV1 playback depend on this device's decoder, network and server CPU. Locat doesn't guarantee every codec. Changing quality restarts the stream.</p>
        <Button className="mt-4" size="sm" onClick={() => setMenu(null)}>Close</Button>
      </Sheet>
    </div>
  );
}

/** Fixture-driven wrapper: simulates a playhead only so the chrome can be reviewed. */
export function VideoPlayer({ video, onClose }: { video: VideoItemView; onClose(): void }) {
  useBackLayer(true, onClose);
  const unsupported = video.delivery === "unsupported";
  const [s, setS] = useState<PlaybackView>({
    state: unsupported ? "error" : "paused", positionSec: video.progressSec ?? 0, durationSec: video.durationSec, bufferedSec: Math.min(video.durationSec, (video.progressSec ?? 0) + 120),
    rate: 1, muted: false, volume: 0.8, fit: "contain", subtitles: [{ id: "en", label: "English (WebVTT)" }], pip: "pictureInPictureEnabled" in document ? "available" : "unsupported",
    qualities: video.source === "server" ? [{ id: "direct", label: "Original" }, { id: "1080", label: "1080p HLS", height: 1080, experimental: true }, { id: "2160", label: "4K HLS", height: 2160, experimental: true }] : [{ id: "direct", label: "Original" }],
    activeQuality: "direct", error: unsupported ? { code: "codec", message: `${video.videoCodec} in ${video.container} isn't supported by this device's decoder. A server remux or transcode may help.` } : undefined,
  });
  useEffect(() => { if (s.state !== "playing") return; const t = setInterval(() => setS((x) => ({ ...x, positionSec: Math.min(x.durationSec, x.positionSec + x.rate), bufferedSec: Math.min(x.durationSec, Math.max(x.bufferedSec, x.positionSec + 90)) })), 1000); return () => clearInterval(t); }, [s.state]);
  const set = (p: Partial<PlaybackView>) => setS((x) => ({ ...x, ...p }));
  const cb: PlayerCallbacks = {
    onTogglePlay: () => !unsupported && set({ state: s.state === "playing" ? "paused" : "playing" }), onSeek: (sec) => set({ positionSec: Math.max(0, Math.min(s.durationSec, sec)) }),
    onRate: (rate) => set({ rate }), onFit: (fit) => set({ fit }), onSubtitle: (activeSubtitle) => set({ activeSubtitle }), onQuality: (activeQuality) => set({ activeQuality, state: "buffering" }),
    onPip: () => undefined, onFullscreen: () => { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen?.().catch(() => undefined); }, onVolume: (volume) => set({ volume, muted: false }), onMute: () => set({ muted: !s.muted }),
  };
  useEffect(() => { if (s.state !== "buffering") return; const t = setTimeout(() => set({ state: "playing" }), 1200); return () => clearTimeout(t); }, [s.state]);  
  return <PlayerChrome video={video} state={s} cb={cb} onClose={onClose} />;
}
