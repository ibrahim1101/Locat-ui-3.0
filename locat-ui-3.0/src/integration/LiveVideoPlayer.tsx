import { deliveryUrl, type DeliveryMode, type MediaProbe } from "./cinemaDelivery";
import { Button, Sheet } from "../ui";
import { readWebVtt } from "./subtitles";
import { safeMediaUrl } from "./mediaSource";
import { useCallback, useEffect, useRef, useState } from "react";
import type { PlaybackView, VideoItemView } from "../contracts";
import { PlayerChrome } from "../screens/cinema/VideoPlayer";
import { useLiveMedia } from "./liveMedia";
import type { LocalMediaItem } from "./localMediaStore";
export function LiveVideoPlayer({ item, onClose, onEnded, autoStart = false }: { item: LocalMediaItem; onClose(): void; onEnded?(): void; autoStart?: boolean }) {
  const playAfterLoad=useRef<boolean|null>(null);
  const loadedPlayback=useRef(false);
  const [nativeSize,setNativeSize]=useState({width:0,height:0});
  const inspectControl=useRef<AbortController|null>(null);
  useEffect(()=>()=>inspectControl.current?.abort(),[]);
  const [delivery, setDelivery] = useState<DeliveryMode>("direct");
  const [startSeconds,setStartSeconds]=useState(0);
  const switchingSource=useRef(false);
  const loadedPosition=useRef(false);
  const directPosition=useRef<number|null>(null);
  const startRef=useRef(0);
  const [selectedAudioIndex, setSelectedAudioIndex] = useState<number | null>(null);
  const [audioIndex, setAudioIndex] = useState<number | null>(null);
  const [probe, setProbe] = useState<MediaProbe | null>(null);
  const [compatibility, setCompatibility] = useState(false);
  const [compatibilityError, setCompatibilityError] = useState("");
  const { update } = useLiveMedia();
  const video = useRef<HTMLVideoElement|null>(null);
  const [sourceVersion,setSourceVersion]=useState(0);
  const lastProgress=useRef<number|null>(null);
  const bindVideo=useCallback((element:HTMLVideoElement|null)=>{
    const previous=video.current;video.current=element;
    // React development StrictMode detaches and immediately reattaches this ref.
    // Cancel only after confirming the old element was actually replaced/unmounted.
    if(previous&&previous!==element)queueMicrotask(()=>{if(video.current!==previous){previous.pause();previous.removeAttribute('src');previous.load();}});
  },[]);
  const latestItem = useRef(item);
  const saveProgress = useRef(update);
  useEffect(() => { latestItem.current = item; saveProgress.current = update; }, [item, update]);
  useEffect(() => () => {
    if(lastProgress.current!==null)void saveProgress.current({...latestItem.current,position:lastProgress.current});
  }, []);
  const subtitleInput = useRef<HTMLInputElement>(null);
  const [subtitle, setSubtitle] = useState<{ url: string; name: string } | null>(null);
  useEffect(() => () => { if (subtitle) URL.revokeObjectURL(subtitle.url); }, [subtitle]);
  const container = useRef<HTMLDivElement>(null);
  const [url, setUrl] = useState("");
  const [state, setState] = useState<PlaybackView>({ state: "loading", positionSec: 0, durationSec: 1, bufferedSec: 0, rate: 1, muted: false, volume: 1, fit: "contain", subtitles: [], qualities: [{ id: "options", label: "Playback options" }], activeQuality: "options", pip: document.pictureInPictureEnabled ? "available" : "unsupported" });
  const set = (patch: Partial<PlaybackView>) => setState(old => ({ ...old, ...patch }));
  const knownDuration=typeof probe?.durationSeconds==='number'&&Number.isFinite(probe.durationSeconds)&&probe.durationSeconds>0?probe.durationSeconds:null;
  const absolutePosition=(element:HTMLVideoElement)=>Math.max(0,Math.min(element.currentTime+startRef.current,knownDuration??Infinity));
  const direct = safeMediaUrl(item);
  const deliverySource = deliveryUrl(item, delivery, audioIndex, startSeconds);
  useEffect(() => { if(deliverySource)return;const next = URL.createObjectURL(item.file); const timer = setTimeout(() => setUrl(next), 0); return () => { clearTimeout(timer); URL.revokeObjectURL(next); }; }, [item.file, deliverySource]);
  const metadata: VideoItemView = { id: item.id, title: item.name, source: item.source ?? "device", folder: item.album, durationSec: state.durationSec, sizeBytes: item.size, container: delivery!=="direct"?"MP4":probe?.container ?? item.name.split(".").at(-1) ?? "", videoCodec: delivery==="transcode"?"h264":probe?.videoCodec ?? undefined, audioCodec: delivery==="transcode"?"aac":probe?.audioCodec ?? undefined, width: nativeSize.width || (delivery!=="transcode"?probe?.width:undefined) || undefined, height: nativeSize.height || (delivery!=="transcode"?probe?.height:undefined) || undefined, posterHue: 0, delivery };
  async function perform(operation: () => Promise<void>,element?:HTMLVideoElement) { try { await operation(); } catch (error) { if(element&&video.current!==element)return;set({ state: "error", error: { code: "unknown", message: error instanceof Error ? error.message : "Playback failed" } }); } }
  async function inspect(showDialog=true) {
    if(showDialog)setCompatibility(true); setCompatibilityError("");
    if (!direct) { if(showDialog)setCompatibilityError("This file is open from your device. Firefox cannot decode every MKV/HEVC video, and browser-local files cannot use the server FFmpeg converter. To convert without changing the original, make the file available in an authorized server media folder, refresh Server Library, and select Convert to H.264/AAC. Alternatively open a compatible H.264/AAC MP4 copy."); return; }
    inspectControl.current?.abort();const control=new AbortController();inspectControl.current=control;
    try {
      const response = await fetch(direct.replace("/stream/", "/probe/"), { credentials: "same-origin", cache: "no-store", signal:control.signal });
      const data = await response.json(); if (!response.ok) throw new Error(data.error ?? "Inspection failed");
      if(!data||!Array.isArray(data.audioTracks)||typeof data.container!=="string"||!["direct","remux","transcode","unsupported"].includes(data.strategy))throw new Error("The server returned invalid media details. Retry inspection.");
      setProbe(data);
    } catch (error) { if(!control.signal.aborted)setCompatibilityError(error instanceof Error ? error.message : "Inspection failed"); }
  }
  function selectDelivery(mode: DeliveryMode) {
    const current=video.current;
    const wanted=current&&current.readyState>=1?absolutePosition(current):lastProgress.current??item.position;
    const resume=mode==='transcode'&&knownDuration!==null&&Number.isFinite(wanted)?Math.max(0,Math.min(Math.floor(wanted),Math.floor(knownDuration-1),86400)):0;
    if(mode==='direct')directPosition.current=wanted;
    switchingSource.current=true;current?.pause();setNativeSize({width:0,height:0});playAfterLoad.current=true;
    setSourceVersion(value=>value+1);
    loadedPosition.current=false;loadedPlayback.current=false;startRef.current=resume;setStartSeconds(resume);setAudioIndex(mode === "direct" ? null : selectedAudioIndex); setDelivery(mode); setCompatibility(false);
    set({ state: "loading", positionSec: resume,bufferedSec:resume, seekable: mode === "direct" || (mode === "transcode" && !!direct && knownDuration!==null), error: undefined, activeQuality: "options" });
  }
  function checkpoint() { const element=video.current;if(element&&element.readyState>=1&&Number.isFinite(element.currentTime))lastProgress.current=element.ended?0:absolutePosition(element);if(lastProgress.current!==null)void update({...item,position:lastProgress.current}); }
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
    <PlayerChrome inspectionError={compatibilityError} onInspect={()=>void inspect(false)} onLoadSubtitle={() => subtitleInput.current?.click()} video={metadata} state={state} onClose={() => { checkpoint(); onClose(); }} surface={<video key={sourceVersion} ref={bindVideo} src={deliverySource??(url || undefined)} className="h-full w-full" style={{ objectFit: state.fit }} playsInline
      onLoadedMetadata={event => { const element = event.currentTarget;if(element!==video.current)return;element.volume=state.volume;element.muted=state.muted;element.playbackRate=state.rate;setNativeSize({width:element.videoWidth,height:element.videoHeight}); switchingSource.current=false; if (delivery === "direct" && !loadedPosition.current) { loadedPosition.current=true; const wanted=directPosition.current??item.position;directPosition.current=null;element.currentTime=Number.isFinite(wanted)&&wanted>=0&&wanted<element.duration-0.1?wanted:0; } set({ state: element.paused?"paused":"playing", seekable: delivery === "direct" || (delivery === "transcode" && !!direct && knownDuration!==null), durationSec: delivery !== "direct" && knownDuration!==null ? knownDuration : Number.isFinite(element.duration)&&element.duration>0 ? element.duration : probe?.durationSeconds ?? 1 }); const first=!loadedPlayback.current;loadedPlayback.current=true;const shouldPlay=playAfterLoad.current??autoStart;playAfterLoad.current=false;if (first&&shouldPlay)void perform(() => element.play(),element); }}
      onLoadStart={event=>{if(event.currentTarget===video.current)set({state:"loading",error:undefined});}}
      onTimeUpdate={event => { const element = event.currentTarget;if(element!==video.current||switchingSource.current||element.readyState<1)return;lastProgress.current=element.ended?0:absolutePosition(element); set({ positionSec: absolutePosition(element), bufferedSec: element.buffered.length ? Math.min(element.buffered.end(element.buffered.length - 1) + startRef.current,knownDuration??Infinity) : 0 }); }}
      onPlay={event => {if(event.currentTarget===video.current)set({ state: "playing", error: undefined });}} onPause={event => { if(event.currentTarget===video.current&&!event.currentTarget.error&&!switchingSource.current){set({ state: "paused" }); checkpoint();} }} onEnded={event => { if(event.currentTarget!==video.current)return;set({ state: "ended" }); checkpoint(); onEnded?.(); }} onWaiting={event => {if(event.currentTarget===video.current)set({ state: "buffering" });}} onPlaying={event => {if(event.currentTarget===video.current)set({ state: "playing",error:undefined });}}
      onError={event => { if(event.currentTarget!==video.current)return;switchingSource.current=false;const mediaCode = event.currentTarget.error?.code ?? 0; const sourceKind = item.source === "server" ? "server" : "device"; const diagnostic = ` [Cinema diagnostic: source=${sourceKind}, mode=${delivery}, mediaError=${mediaCode || "unknown"}]`; set({ state: "error", error: { code: "codec", message: (delivery!=="direct" ? "Server conversion could not be played. Check FFmpeg/FFprobe, available conversion slots and source-file compatibility. Retry Playback options or preconvert an MP4/H.264/AAC copy on the host; progressive conversion cannot read every container." : "This browser could not play the original format. For server files, open Playback options and choose Convert to H.264/AAC. Remux does not change HEVC. Local files need a compatible MP4/H.264 copy or an authorized server media folder.") + diagnostic } }); }}>{subtitle && <track key={subtitle.url} src={subtitle.url} kind="subtitles" label={subtitle.name} default onLoad={() => { if (video.current?.textTracks[0]) video.current.textTracks[0].mode = "showing"; }} />}</video>}
      cb={{ onTogglePlay: () => { const element = video.current; if (element) { if (element.paused) void perform(() => element.play(),element); else element.pause(); } },
        onSeek: sec => {
          if(!Number.isFinite(sec))return;
          const element=video.current;
          if(delivery==='direct'){if(element){element.currentTime=Math.max(0,Math.min(sec,state.durationSec));lastProgress.current=element.currentTime;}return;}
          if(delivery!=='transcode'||!direct||knownDuration===null)return;
          const target=Math.max(0,Math.min(Math.floor(sec),Math.floor(knownDuration-1),86400));
          // A pending replacement is naturally paused; retain the original user intent.
          if(!switchingSource.current)playAfterLoad.current=!!element&&!element.paused&&!element.ended;
          switchingSource.current=true;element?.pause();loadedPlayback.current=false;startRef.current=target;setStartSeconds(target);setSourceVersion(value=>value+1);
          set({state:'loading',positionSec:target,bufferedSec:target,error:undefined});
        },
        onRate: rate => { if (video.current) video.current.playbackRate = rate; set({ rate }); }, onFit: fit => set({ fit }), onSubtitle: id => { if (video.current?.textTracks[0]) video.current.textTracks[0].mode = id ? "showing" : "disabled"; set({ activeSubtitle: id }); }, onQuality: () => { void inspect(); },
        onPip: () => { if (video.current) void perform(async () => { if (document.pictureInPictureElement) await document.exitPictureInPicture(); else await video.current!.requestPictureInPicture(); }); },
        onFullscreen: () => void perform(async () => { if (document.fullscreenElement) await document.exitFullscreen(); else await container.current?.requestFullscreen(); }),
        onVolume: volume => { if (video.current) video.current.volume = volume; set({ volume }); },
        onMute: () => { if (video.current) { video.current.muted = !video.current.muted; set({ muted: video.current.muted }); } },
      }} />
    <Sheet open={compatibility} onClose={() => setCompatibility(false)} title="Playback compatibility" description={direct ? "Select how your server delivers this video." : "Local file playback uses your browser’s built-in decoders."} size="md">
      <div className="space-y-4">
        {compatibilityError && <p role="alert" className="text-danger">{compatibilityError}</p>}
        {probe && <><p className="text-sm text-ink-2">{probe.videoCodec ?? "No video"} / {probe.audioCodec ?? "No audio"} · {probe.container}</p><p className="text-sm text-ink-3">{probe.reason}</p>{probe.strategy==="transcode"&&<p className="text-sm text-warn">Remux keeps the original codec and cannot make HEVC compatible. Choose Convert to H.264/AAC.</p>}</>}
        <Button block aria-pressed={delivery==="direct"} onClick={() => selectDelivery("direct")}>{direct ? "Direct playback · supports seeking" : "Retry direct playback · uses browser decoder"}</Button>
        {probe && probe.strategy !== "unsupported" && <><Button block disabledReason={!['direct', 'remux'].includes(probe.strategy)?"Remux cannot change HEVC or other unsupported codecs. Choose Convert to H.264/AAC.":undefined} onClick={() => selectDelivery("remux")}>Remux · copy streams into MP4</Button><Button block aria-pressed={delivery==="transcode"} onClick={() => selectDelivery("transcode")}>Convert to H.264/AAC · up to 1080p</Button></>}
        {probe && probe.audioTracks.length > 1 && <label className="block text-sm font-semibold">Audio for converted playback<select className="mt-2 w-full rounded-xl bg-s2 p-3 hairline" value={selectedAudioIndex ?? ""} onChange={event => setSelectedAudioIndex(event.target.value === "" ? null : Number(event.target.value))}><option value="">First audio track</option>{probe.audioTracks.map(track => <option key={track.index} value={track.index}>{track.title || `Track ${track.index}`} · {track.language} · {track.codec}</option>)}</select></label>}
        <p className="text-xs text-ink-3">{direct ? "Remux plays from the beginning. Choose Convert to H.264/AAC for timeline seeking; each seek restarts conversion. The host shares two conversion slots. Linux uses the authorized file for fast seeking; other hosts may read from the beginning and time out." : "Opening a large video without copying avoids IndexedDB limits, but does not add HEVC support to Firefox. The original file is never modified by this player."}</p>
      </div>
    </Sheet>
  </div>;
}
