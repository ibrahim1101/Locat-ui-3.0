import { Play, Pause, Volume2, VolumeX } from "lucide-react";
import { safeMediaUrl } from "./mediaSource";
import { useEffect, useRef, useState, useMemo } from "react";
import { useSession } from "../app/session";
import { parseMusicPresets, upsertMusicPreset } from "../lib/musicPresets";
import { nextMusicIndex } from "../lib/musicQueue";
import { connectEqGraph, parametricPreset, type EqPoint } from "../lib/musicEq";
import { Button, Slider, Switch, Sheet, TextField, formatDuration } from "../ui";
import type { LocalMediaItem } from "./localMediaStore";
export function LiveAudioPlayer({ items, initialId, onClose }: { items: LocalMediaItem[]; initialId: string; onClose(): void }) {
  const { user } = useSession();
  const presetKey = `locat-ui3-eq:${user?.id}`;
  const [presetSheet, setPresetSheet] = useState(false);
  const [presetName, setPresetName] = useState("");
  const [playback, setPlayback] = useState({ playing: false, position: 0, duration: 0, volume: 1, muted: false });
  const [saved, setSaved] = useState(() => parseMusicPresets(localStorage.getItem(presetKey)));
  const [mode, setMode] = useState<"graphic" | "parametric">("parametric");
  const [bands, setBands] = useState<5 | 10 | 15 | 31>(10);
  const [gains, setGains] = useState<number[]>(Array(10).fill(0));
  const [id, setId] = useState(initialId);
  const item = items.find(item => item.id === id);
  const audio = useRef<HTMLAudioElement>(null);
  const graph = useRef<{ context: AudioContext; source: MediaElementAudioSourceNode; filters: BiquadFilterNode[]; gain: GainNode } | null>(null);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState<"off" | "all" | "one">("off");
  const [points, setPoints] = useState<EqPoint[]>([]);
  const [preamp, setPreamp] = useState(0);
  const [bypass, setBypass] = useState(true);
  const [error, setError] = useState("");
  const [url, setUrl] = useState("");
  const frequencies = useMemo(() => Array.from({ length: bands }, (_, i) => Math.round(31.5 * (16000 / 31.5) ** (i / (bands - 1)))), [bands]);
  const dspPoints = useMemo(() => mode === "parametric" ? points : frequencies.map((frequency, i) => ({ type: "peaking" as const, frequency, gain: gains[i] ?? 0, q: 1 })), [mode, points, frequencies, gains]);
  const file = item?.file;
  const streamUrl = item ? safeMediaUrl(item) : null;
  useEffect(() => { if (!file) return; const url = streamUrl ?? URL.createObjectURL(file); const timer = setTimeout(() => setUrl(url), 0); return () => { clearTimeout(timer); if (!streamUrl) URL.revokeObjectURL(url); }; }, [file, streamUrl]);
  useEffect(() => { const current = graph.current; if (current) connectEqGraph(current.source, current.context, current.filters, current.gain, dspPoints, preamp, bypass); }, [dspPoints, preamp, bypass]);
  useEffect(() => { const element = audio.current; return () => { element?.pause(); element?.removeAttribute("src"); element?.load(); void graph.current?.context.close(); }; }, []);
  async function activateEq() {
    try {
      if (!audio.current) return;
      if (!graph.current) {
        const context = new AudioContext();
        graph.current = { context, source: context.createMediaElementSource(audio.current), filters: Array.from({ length: 31 }, () => context.createBiquadFilter()), gain: context.createGain() };
      }
      await graph.current.context.resume();
      connectEqGraph(graph.current.source, graph.current.context, graph.current.filters, graph.current.gain, dspPoints, preamp, false);
      setBypass(false); setError("");
    } catch (error) { setError(error instanceof Error ? error.message : "EQ unavailable"); }
  }
  function next() { const index = items.findIndex(item => item.id === id); const target = nextMusicIndex(index, items.length, repeat, shuffle); if (target !== null) { if (target === index && audio.current) { audio.current.currentTime = 0; void audio.current.play().catch(error => setError(error.message)); } else setId(items[target].id); } }
  if (!item) return null;
  return <section className="mb-6 space-y-4 rounded-2xl bg-s2 p-5 hairline" aria-label="Music player">
    <div className="flex items-center justify-between gap-3"><h2 className="font-semibold">{item.name}</h2><Button variant="ghost" onClick={onClose}>Close player</Button></div>
    <audio ref={audio} src={url || undefined} autoPlay className="hidden" onPlay={() => setPlayback(old => ({ ...old, playing: true }))} onPause={() => setPlayback(old => ({ ...old, playing: false }))} onTimeUpdate={event => { const position = event.currentTarget.currentTime; setPlayback(old => ({ ...old, position })); }} onLoadedMetadata={event => { const duration = event.currentTarget.duration; setPlayback(old => ({ ...old, position: 0, duration: Number.isFinite(duration) ? duration : 0 })); }} onEnded={next} onError={() => setError("This audio format cannot be decoded by this browser.")} />
    <div className="flex items-center gap-3"><Button icon={playback.playing ? Pause : Play} onClick={() => { const element = audio.current; if (!element) return; if (element.paused) void element.play().catch(error => setError(error.message)); else element.pause(); }}>{playback.playing ? "Pause" : "Play"}</Button><div className="min-w-0 flex-1"><Slider disabled={playback.duration <= 0} label="Audio seek" min={0} max={Math.max(1, playback.duration)} value={playback.position} onChange={position => { if (audio.current) audio.current.currentTime = position; }} /><p className="mt-2 text-xs text-ink-3">{formatDuration(playback.position)} / {formatDuration(playback.duration)}</p></div><Button icon={playback.muted ? VolumeX : Volume2} variant="ghost" onClick={() => { if (audio.current) { audio.current.muted = !audio.current.muted; setPlayback(old => ({ ...old, muted: audio.current!.muted })); } }}>{playback.muted ? "Unmute" : "Mute"}</Button></div>
    <Slider label="Music volume" min={0} max={1} step={0.05} value={playback.volume} onChange={volume => { if (audio.current) audio.current.volume = volume; setPlayback(old => ({ ...old, volume })); }} />
    <div className="flex flex-wrap items-center gap-3"><Button onClick={next}>Next</Button><Switch label="Shuffle" checked={shuffle} onChange={setShuffle} /><Button variant="ghost" onClick={() => setRepeat(old => old === "off" ? "all" : old === "all" ? "one" : "off")}>Repeat: {repeat}</Button><Button onClick={() => void activateEq()}>Enable equalizer</Button><Switch label="Bypass EQ" checked={bypass} onChange={setBypass} /></div>
    <div className="flex flex-wrap gap-2">{["Flat", "Warm", "Bass Boost", "Clarity", "Vocal"].map(name => <Button key={name} variant="ghost" onClick={() => { setMode("parametric"); setPoints(parametricPreset(name)); }}>{name}</Button>)}</div>
    <div className="flex flex-wrap items-center gap-3"><select aria-label="EQ mode" value={mode} onChange={event => setMode(event.target.value as typeof mode)} className="rounded-lg bg-s1 p-2"><option value="parametric">Parametric presets</option><option value="graphic">Graphic equalizer</option></select>{mode === "graphic" && <select aria-label="EQ bands" value={bands} onChange={event => { const count = Number(event.target.value) as typeof bands; setBands(count); setGains(Array(count).fill(0)); }} className="rounded-lg bg-s1 p-2">{[5, 10, 15, 31].map(count => <option key={count} value={count}>{count} bands</option>)}</select>}
      <Button variant="ghost" onClick={() => setPresetSheet(true)}>Save EQ preset</Button>
      {saved.map(preset => <Button key={preset.name} variant="ghost" onClick={() => { setMode(preset.kind); setBands(preset.bands); setGains(preset.gains); setPoints(preset.points); setPreamp(preset.preamp); }}>{preset.name}</Button>)}
    </div>
    {mode === "graphic" && <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">{frequencies.map((frequency, i) => <Slider key={frequency} label={`${frequency} Hz`} min={-12} max={12} step={0.5} value={gains[i] ?? 0} onChange={value => setGains(old => old.map((gain, index) => index === i ? value : gain))} />)}</div>}
    <Slider label="Preamp (dB)" min={-18} max={0} step={0.5} value={preamp} onChange={setPreamp} />
    <p className="text-xs text-ink-3">EQ applies conservative headroom attenuation. Navigating away closes this local player.</p>
    {error && <p role="alert" className="text-danger">{error}</p>}
    <Sheet open={presetSheet} onClose={() => setPresetSheet(false)} title="Save equalizer preset" size="sm">
      <form className="space-y-4" onSubmit={event => { event.preventDefault(); try { const next = upsertMusicPreset(saved, { name: presetName, bands, gains, preamp, kind: mode, points }); localStorage.setItem(presetKey, JSON.stringify(next)); setSaved(next); setPresetSheet(false); setPresetName(""); setError(""); } catch (error) { setError(error instanceof Error ? error.message : "Could not save preset"); } }}>
        <TextField label="Preset name" value={presetName} onChange={event => setPresetName(event.target.value)} maxLength={60} required />
        <Button type="submit" block disabled={!presetName.trim()}>Save preset</Button>
        {saved.length > 0 && <div className="space-y-2"><p className="text-xs text-ink-3">Saved presets</p>{saved.map(preset => <div key={preset.name} className="flex items-center justify-between gap-3 rounded-xl bg-s2 p-3 hairline"><span className="text-sm">{preset.name}</span><Button size="sm" variant="ghost" onClick={() => { try { const next = saved.filter(row => row.name !== preset.name); localStorage.setItem(presetKey, JSON.stringify(next)); setSaved(next); setError(""); } catch { setError("Could not remove the preset"); } }}>Remove {preset.name}</Button></div>)}</div>}
        {error && <p role="alert" className="text-danger">{error}</p>}
      </form>
    </Sheet>
  </section>;
}
