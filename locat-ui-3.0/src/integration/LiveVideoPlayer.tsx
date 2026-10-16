import { deliveryUrl, type DeliveryMode, type MediaProbe } from "./cinemaDelivery";
import { Button, Sheet } from "../ui";
import { readWebVtt } from "./subtitles";
import { safeMediaUrl } from "./mediaSource";
import { useEffect, useRef, useState } from "react";
import type { PlaybackView, VideoItemView } from "../contracts";
import { PlayerChrome } from "../screens/cinema/VideoPlayer";
import { useLiveMedia } from "./liveMedia";
import type { LocalMediaItem } from "./localMediaStore";
export function LiveVideoPlayer({ item, onClose, onEnded, autoStart = false }: { item: LocalMediaItem; onClose(): void; onEnded?(): void; autoStart?: boolean }) {
  const playAfterLoad=useRef(false);
  const [nativeSize,setNativeSize]=useState({width:0,height:0});
  const inspectControl=useRef<AbortController|null>(null);
  useEffect(()=>()=>inspectControl.current?.abort(),[]);
  const [delivery, setDelivery] = useState<DeliveryMode>("direct");
  const [selectedAudioIndex, setSelectedAudioIndex] = useState<number | null>(null);
  const [audioIndex, setAudioIndex] = useState<number | null>(null);
  const [probe, setProbe] = useState<MediaProbe | null>(null);
  const [compatibility, setCompatibility] = useState(false);
  const [compatibilityError, setCompatibilityError] = useState("");
  const { update } = useLiveMedia();
  const video = useRef<HTMLVideoElement>(null);
  const latestItem = useRef(item);
  const saveProgress = useRef(update);
  useEffect(() => { latestItem.current = item; saveProgress.current = update; }, [item, update]);
  useEffect(() => {
    const element = video.current;
    return () => {
      if (!element) return;
      if (Number.isFinite(element.duration)) void saveProgress.current({ ...latestItem.current, position: element.ended ? 0 : element.currentTime });
      element.pause(); element.removeAttribute("src"); element.load();
    };
  }, []);
  const subtitleInput = useRef<HTMLInputElement>(null);
  const [subtitle, setSubtitle] = useState<{ url: string; name: string } | null>(null);
  useEffect(() => () => { if (subtitle) URL.revokeObjectURL(subtitle.url); }, [subtitle]);
  const container = useRef<HTMLDivElement>(null);
  const [url, setUrl] = useState("");
  const [state, setState] = useState<PlaybackView>({ state: "loading", positionSec: 0, durationSec: 1, bufferedSec: 0, rate: 1, muted: false, volume: 1, fit: "contain", subtitles: [], qualities: [{ id: "options", label: "Playback options" }], activeQuality: "options", pip: document.pictureInPictureEnabled ? "available" : "unsupported" });
  const set = (patch: Partial<PlaybackView>) => setState(old => ({ ...old, ...patch }));
  const direct = safeMediaUrl(item);
  const deliverySource = deliveryUrl(item, delivery, audioIndex);
  useEffect(() => { if(deliverySource)return;const next = URL.createObjectURL(item.file); const timer = setTimeout(() => setUrl(next), 0); return () => { clearTimeout(timer); URL.revokeObjectURL(next); }; }, [item.file, deliverySource]);
  const metadata: VideoItemView = { id: item.id, title: item.name, source: item.source ?? "device", folder: item.album, durationSec: state.durationSec, sizeBytes: item.size, container: delivery!=="direct"?"MP4":probe?.container ?? item.name.split(".").at(-1) ?? "", videoCodec: delivery==="transcode"?"h264":probe?.videoCodec ?? undefined, audioCodec: delivery==="transcode"?"aac":probe?.audioCodec ?? undefined, width: nativeSize.width || (delivery!=="transcode"?probe?.width:undefined) || undefined, height: nativeSize.height || (delivery!=="transcode"?probe?.height:undefined) || undefined, posterHue: 0, delivery };
  async function perform(operation: () => Promise<void>) { try { await operation(); } catch (error) { set({ state: "error", error: { code: "unknown", message: error instanceof Error ? error.message : "Playback failed" } }); } }
  async function inspect(showDialog=true) {
    if(showDialog)setCompatibility(true); setCompatibilityError("");
    if (!direct) { if(showDialog)setCompatibilityError("Server conversion is only available for server-library files. Local playback uses this device's decoder."); return; }
    inspectControl.current?.abort();const control=new AbortController();inspectControl.current=control;
    try {
      const response = await fetch(direct.replace("/stream/", "/probe/"), { credentials: "same-origin", cache: "no-store", signal:control.signal });
      const data = await response.json(); if (!response.ok) throw new Error(data.error ?? "Inspection failed");
      if(!data||!Array.isArray(data.audioTracks)||typeof data.container!=="string"||!["direct","remux","transcode","unsupported"].includes(data.strategy))throw new Error("The server returned invalid media details. Retry inspection.");
      setProbe(data);
    } catch (error) { if(!control.signal.aborted)setCompatibilityError(error instanceof Error ? error.message : "Inspection failed"); }
  }
  function selectDelivery(mode: DeliveryMode) {
    video.current?.pause();setNativeSize({width:0,height:0});playAfterLoad.current=true;
    const next=deliveryUrl(item,mode,mode==="direct"?null:selectedAudioIndex);if(video.current&&(next??url)===video.current.getAttribute("src"))video.current.load();
    setAudioIndex(mode === "direct" ? null : selectedAudioIndex); setDelivery(mode); setCompatibility(false);
    set({ state: "loading", positionSec: 0, seekable: mode === "direct", error: undefined, activeQuality: "options" });
  }
  function checkpoint() { const element = video.current; if (element && Number.isFinite(element.duration)) void update({ ...item, position: element.ended ? 0 : element.currentTime }); }
  return <div ref={container} className="h-full min-h-[420px] bg-black">
    <input ref={subtitleInput} type="file" accept=".vtt,text/vtt" aria-label="Load WebVTT subtitles" className="sr-only" onChange={event => {
      const file = event.target.files?.[0]; event.target.value = "";
      if (!file) return;
      void perform(async () => {
        const text = await readWebVtt(file);
        setSubtitle({ url: URL.createObjectURL(new Blob([text], { type: "text/vtt" })), name: file.name });
        set({ subtitles: [{ id: "local", label: file.name }], activeSubtitle: "local", error: undefined, state: video.current?.paused ? "paused" : "playing" });
      });
    }} />
    <PlayerChrome inspectionError={compatibilityError} onInspect={()=>void inspect(false)} onLoadSubtitle={() => subtitleInput.current?.click()} video={metadata} state={state} onClose={() => { checkpoint(); onClose(); }} surface={<video ref={video} src={deliverySource??(url || undefined)} className="h-full w-full" style={{ objectFit: state.fit }} playsInline
      onLoadedMetadata={event => { const element = event.currentTarget;setNativeSize({width:element.videoWidth,height:element.videoHeight}); if (delivery === "direct") element.currentTime = item.position < element.duration - 5 ? item.position : 0; set({ state: "paused", durationSec: Number.isFinite(element.duration)&&element.duration>0 ? element.duration : probe?.durationSeconds ?? 1 }); if (autoStart||playAfterLoad.current) {playAfterLoad.current=false;void perform(() => element.play());} }}
      onLoadStart={()=>set({state:"loading",error:undefined})}
      onTimeUpdate={event => { const element = event.currentTarget; set({ positionSec: element.currentTime, bufferedSec: element.buffered.length ? element.buffered.end(element.buffered.length - 1) : 0 }); }}
      onPlay={() => set({ state: "playing", error: undefined })} onPause={() => { set({ state: "paused" }); checkpoint(); }} onEnded={() => { set({ state: "ended" }); checkpoint(); onEnded?.(); }} onWaiting={() => set({ state: "buffering" })} onPlaying={() => set({ state: "playing" })}
      onError={() => set({ state: "error", error: { code: "codec", message: delivery!=="direct" ? "Server conversion could not be played. Check FFmpeg/FFprobe, available conversion slots and source-file compatibility. Retry Playback options or preconvert an MP4/H.264/AAC copy on the host; progressive conversion cannot read every container." : "This browser could not play the original format. For server files, open Playback options and choose Convert to H.264/AAC. Remux does not change HEVC. Local files need a compatible MP4/H.264 copy or an authorized server media folder." } })}>{subtitle && <track key={subtitle.url} src={subtitle.url} kind="subtitles" label={subtitle.name} default onLoad={() => { if (video.current?.textTracks[0]) video.current.textTracks[0].mode = "showing"; }} />}</video>}
      cb={{ onTogglePlay: () => { const element = video.current; if (element) { if (element.paused) void perform(() => element.play()); else element.pause(); } },
        onSeek: sec => { if (delivery === "direct" && video.current) video.current.currentTime = Math.max(0, Math.min(sec, state.durationSec)); },
        onRate: rate => { if (video.current) video.current.playbackRate = rate; set({ rate }); }, onFit: fit => set({ fit }), onSubtitle: id => { if (video.current?.textTracks[0]) video.current.textTracks[0].mode = id ? "showing" : "disabled"; set({ activeSubtitle: id }); }, onQuality: () => { void inspect(); },
        onPip: () => { if (video.current) void perform(async () => { if (document.pictureInPictureElement) await document.exitPictureInPicture(); else await video.current!.requestPictureInPicture(); }); },
        onFullscreen: () => void perform(async () => { if (document.fullscreenElement) await document.exitFullscreen(); else await container.current?.requestFullscreen(); }),
        onVolume: volume => { if (video.current) video.current.volume = volume; set({ volume }); },
        onMute: () => { if (video.current) { video.current.muted = !video.current.muted; set({ muted: video.current.muted }); } },
      }} />
    <Sheet open={compatibility} onClose={() => setCompatibility(false)} title="Playback compatibility" description="Select how your server delivers this video." size="md">
      <div className="space-y-4">
        {compatibilityError && <p role="alert" className="text-danger">{compatibilityError}</p>}
        {probe && <><p className="text-sm text-ink-2">{probe.videoCodec ?? "No video"} / {probe.audioCodec ?? "No audio"} · {probe.container}</p><p className="text-sm text-ink-3">{probe.reason}</p>{probe.strategy==="transcode"&&<p className="text-sm text-warn">Remux keeps the original codec and cannot make HEVC compatible. Choose Convert to H.264/AAC.</p>}</>}
        <Button block aria-pressed={delivery==="direct"} onClick={() => selectDelivery("direct")}>Direct playback · supports seeking</Button>
        {probe && probe.strategy !== "unsupported" && <><Button block disabledReason={!['direct', 'remux'].includes(probe.strategy)?"Remux cannot change HEVC or other unsupported codecs. Choose Convert to H.264/AAC.":undefined} onClick={() => selectDelivery("remux")}>Remux · copy streams into MP4</Button><Button block aria-pressed={delivery==="transcode"} onClick={() => selectDelivery("transcode")}>Convert to H.264/AAC · up to 1080p</Button></>}
        {probe && probe.audioTracks.length > 1 && <label className="block text-sm font-semibold">Audio for converted playback<select className="mt-2 w-full rounded-xl bg-s2 p-3 hairline" value={selectedAudioIndex ?? ""} onChange={event => setSelectedAudioIndex(event.target.value === "" ? null : Number(event.target.value))}><option value="">First audio track</option>{probe.audioTracks.map(track => <option key={track.index} value={track.index}>{track.title || `Track ${track.index}`} · {track.language} · {track.codec}</option>)}</select></label>}
        <p className="text-xs text-ink-3">Remux and conversion restart from the beginning and cannot seek. They require FFmpeg on the host and share two conversion slots. Browser decoding and native-device compatibility still need verification.</p>
      </div>
    </Sheet>
  </div>;
}
