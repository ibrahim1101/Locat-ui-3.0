import { deliveryUrl, type DeliveryMode, type MediaProbe } from "./cinemaDelivery";
import { Button, Sheet } from "../ui";
import { readWebVtt } from "./subtitles";
import { safeMediaUrl } from "./mediaSource";
import { useEffect, useRef, useState } from "react";
import type { PlaybackView, VideoItemView } from "../contracts";
import { PlayerChrome } from "../screens/cinema/VideoPlayer";
import { useLiveMedia } from "./liveMedia";
import type { LocalMediaItem } from "./localMediaStore";
export function LiveVideoPlayer({ item, onClose }: { item: LocalMediaItem; onClose(): void }) {
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
  useEffect(() => { const next = deliverySource ?? URL.createObjectURL(item.file); const timer = setTimeout(() => setUrl(next), 0); return () => { clearTimeout(timer); if (!deliverySource) URL.revokeObjectURL(next); }; }, [item.file, deliverySource]);
  const metadata: VideoItemView = { id: item.id, title: item.name, source: item.source ?? "device", folder: item.album, durationSec: state.durationSec, sizeBytes: item.size, container: probe?.container ?? item.name.split(".").at(-1) ?? "", videoCodec: probe?.videoCodec ?? undefined, audioCodec: probe?.audioCodec ?? undefined, width: probe?.width ?? undefined, height: probe?.height ?? undefined, posterHue: 0, delivery };
  async function perform(operation: () => Promise<void>) { try { await operation(); } catch (error) { set({ state: "error", error: { code: "unknown", message: error instanceof Error ? error.message : "Playback failed" } }); } }
  async function inspect() {
    setCompatibility(true); setCompatibilityError("");
    if (!direct) { setCompatibilityError("Server conversion is only available for server-library files. Local playback uses this device's decoder."); return; }
    try {
      const response = await fetch(direct.replace("/stream/", "/probe/"), { credentials: "same-origin", cache: "no-store" });
      const data = await response.json(); if (!response.ok) throw new Error(data.error ?? "Inspection failed"); setProbe(data);
    } catch (error) { setCompatibilityError(error instanceof Error ? error.message : "Inspection failed"); }
  }
  function selectDelivery(mode: DeliveryMode) {
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
    <PlayerChrome onLoadSubtitle={() => subtitleInput.current?.click()} video={metadata} state={state} onClose={() => { checkpoint(); onClose(); }} surface={<video ref={video} src={url || undefined} className="h-full w-full" style={{ objectFit: state.fit }} playsInline
      onLoadedMetadata={event => { const element = event.currentTarget; if (delivery === "direct") element.currentTime = item.position < element.duration - 5 ? item.position : 0; set({ state: "paused", durationSec: Number.isFinite(element.duration) ? element.duration : probe?.durationSeconds ?? 1 }); }}
      onTimeUpdate={event => { const element = event.currentTarget; set({ positionSec: element.currentTime, bufferedSec: element.buffered.length ? element.buffered.end(element.buffered.length - 1) : 0 }); }}
      onPlay={() => set({ state: "playing", error: undefined })} onPause={() => { set({ state: "paused" }); checkpoint(); }} onEnded={() => { set({ state: "ended" }); checkpoint(); }} onWaiting={() => set({ state: "buffering" })} onPlaying={() => set({ state: "playing" })}
      onError={() => set({ state: "error", error: { code: "codec", message: "This browser cannot decode this file. Try an MP4/H.264 or WebM file." } })}>{subtitle && <track key={subtitle.url} src={subtitle.url} kind="subtitles" label={subtitle.name} default onLoad={() => { if (video.current?.textTracks[0]) video.current.textTracks[0].mode = "showing"; }} />}</video>}
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
        {probe && <><p className="text-sm text-ink-2">{probe.videoCodec ?? "No video"} / {probe.audioCodec ?? "No audio"} · {probe.container}</p><p className="text-sm text-ink-3">{probe.reason}</p></>}
        <Button block onClick={() => selectDelivery("direct")}>Direct playback · supports seeking</Button>
        {probe && probe.strategy !== "unsupported" && <><Button block disabled={!['direct', 'remux'].includes(probe.strategy)} onClick={() => selectDelivery("remux")}>Remux · copy streams into MP4</Button><Button block onClick={() => selectDelivery("transcode")}>Convert to H.264/AAC · up to 1080p</Button></>}
        {probe && probe.audioTracks.length > 1 && <label className="block text-sm font-semibold">Audio for converted playback<select className="mt-2 w-full rounded-xl bg-s2 p-3 hairline" value={selectedAudioIndex ?? ""} onChange={event => setSelectedAudioIndex(event.target.value === "" ? null : Number(event.target.value))}><option value="">First audio track</option>{probe.audioTracks.map(track => <option key={track.index} value={track.index}>{track.title || `Track ${track.index}`} · {track.language} · {track.codec}</option>)}</select></label>}
        <p className="text-xs text-ink-3">Remux and conversion restart from the beginning and cannot seek. They require FFmpeg on the host and share two conversion slots. Browser decoding and native-device compatibility still need verification.</p>
      </div>
    </Sheet>
  </div>;
}
