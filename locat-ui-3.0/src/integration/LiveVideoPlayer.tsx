import { readWebVtt } from "./subtitles";
import { safeMediaUrl } from "./mediaSource";
import { useEffect, useRef, useState } from "react";
import type { PlaybackView, VideoItemView } from "../contracts";
import { PlayerChrome } from "../screens/cinema/VideoPlayer";
import { useLiveMedia } from "./liveMedia";
import type { LocalMediaItem } from "./localMediaStore";
export function LiveVideoPlayer({ item, onClose }: { item: LocalMediaItem; onClose(): void }) {
  const { update } = useLiveMedia();
  const video = useRef<HTMLVideoElement>(null);
  const subtitleInput = useRef<HTMLInputElement>(null);
  const [subtitle, setSubtitle] = useState<{ url: string; name: string } | null>(null);
  useEffect(() => () => { if (subtitle) URL.revokeObjectURL(subtitle.url); }, [subtitle]);
  const container = useRef<HTMLDivElement>(null);
  const [url, setUrl] = useState("");
  const [state, setState] = useState<PlaybackView>({ state: "loading", positionSec: 0, durationSec: 1, bufferedSec: 0, rate: 1, muted: false, volume: 1, fit: "contain", subtitles: [], qualities: [{ id: "original", label: "Original" }], activeQuality: "original", pip: document.pictureInPictureEnabled ? "available" : "unsupported" });
  const set = (patch: Partial<PlaybackView>) => setState(old => ({ ...old, ...patch }));
  const direct = safeMediaUrl(item);
  useEffect(() => { const next = direct ?? URL.createObjectURL(item.file); const timer = setTimeout(() => setUrl(next), 0); return () => { clearTimeout(timer); if (!direct) URL.revokeObjectURL(next); }; }, [item.file, direct]);
  const metadata: VideoItemView = { id: item.id, title: item.name, source: item.source ?? "device", folder: item.album, durationSec: state.durationSec, sizeBytes: item.size, container: item.name.split(".").at(-1) ?? "", posterHue: 0, delivery: "direct" };
  async function perform(operation: () => Promise<void>) { try { await operation(); } catch (error) { set({ state: "error", error: { code: "unknown", message: error instanceof Error ? error.message : "Playback failed" } }); } }
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
      onLoadedMetadata={event => { const element = event.currentTarget; element.currentTime = item.position < element.duration - 5 ? item.position : 0; set({ state: "paused", durationSec: Number.isFinite(element.duration) ? element.duration : 1 }); }}
      onTimeUpdate={event => { const element = event.currentTarget; set({ positionSec: element.currentTime, bufferedSec: element.buffered.length ? element.buffered.end(element.buffered.length - 1) : 0 }); }}
      onPlay={() => set({ state: "playing", error: undefined })} onPause={() => { set({ state: "paused" }); checkpoint(); }} onEnded={() => { set({ state: "ended" }); checkpoint(); }} onWaiting={() => set({ state: "buffering" })} onPlaying={() => set({ state: "playing" })}
      onError={() => set({ state: "error", error: { code: "codec", message: "This browser cannot decode this file. Try an MP4/H.264 or WebM file." } })}>{subtitle && <track key={subtitle.url} src={subtitle.url} kind="subtitles" label={subtitle.name} default onLoad={() => { if (video.current?.textTracks[0]) video.current.textTracks[0].mode = "showing"; }} />}</video>}
      cb={{ onTogglePlay: () => { const element = video.current; if (element) { if (element.paused) void perform(() => element.play()); else element.pause(); } },
        onSeek: sec => { if (video.current) video.current.currentTime = Math.max(0, Math.min(sec, state.durationSec)); },
        onRate: rate => { if (video.current) video.current.playbackRate = rate; set({ rate }); }, onFit: fit => set({ fit }), onSubtitle: id => { if (video.current?.textTracks[0]) video.current.textTracks[0].mode = id ? "showing" : "disabled"; set({ activeSubtitle: id }); }, onQuality: () => {},
        onPip: () => { if (video.current) void perform(async () => { if (document.pictureInPictureElement) await document.exitPictureInPicture(); else await video.current!.requestPictureInPicture(); }); },
        onFullscreen: () => void perform(async () => { if (document.fullscreenElement) await document.exitFullscreen(); else await container.current?.requestFullscreen(); }),
        onVolume: volume => { if (video.current) video.current.volume = volume; set({ volume }); },
        onMute: () => { if (video.current) { video.current.muted = !video.current.muted; set({ muted: video.current.muted }); } },
      }} />
  </div>;
}
