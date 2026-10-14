import { useEffect, useRef, useState, useMemo } from "react";
import { useSession } from "../app/session";
import { parseMusicPresets, upsertMusicPreset } from "../lib/musicPresets";
import { nextMusicIndex } from "../lib/musicQueue";
import { connectEqGraph, parametricPreset, type EqPoint } from "../lib/musicEq";
import { Button, Slider, Switch } from "../ui";
import type { LocalMediaItem } from "./localMediaStore";
export function LiveAudioPlayer({ items, initialId, onClose }: { items: LocalMediaItem[]; initialId: string; onClose(): void }) {
  const { user } = useSession();
  const presetKey = `locat-ui3-eq:${user?.id}`;
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
  useEffect(() => { if (!file) return; const url = URL.createObjectURL(file); const timer = setTimeout(() => setUrl(url), 0); return () => { clearTimeout(timer); URL.revokeObjectURL(url); }; }, [file]);
  useEffect(() => { const current = graph.current; if (current) connectEqGraph(current.source, current.context, current.filters, current.gain, dspPoints, preamp, bypass); }, [dspPoints, preamp, bypass]);
  useEffect(() => () => { void graph.current?.context.close(); }, []);
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
    <audio ref={audio} src={url || undefined} controls autoPlay className="w-full" onEnded={next} onError={() => setError("This audio format cannot be decoded by this browser.")} />
    <div className="flex flex-wrap items-center gap-3"><Button onClick={next}>Next</Button><Switch label="Shuffle" checked={shuffle} onChange={setShuffle} /><Button variant="ghost" onClick={() => setRepeat(old => old === "off" ? "all" : old === "all" ? "one" : "off")}>Repeat: {repeat}</Button><Button onClick={() => void activateEq()}>Enable equalizer</Button><Switch label="Bypass EQ" checked={bypass} onChange={setBypass} /></div>
    <div className="flex flex-wrap gap-2">{["Flat", "Warm", "Bass Boost", "Clarity", "Vocal"].map(name => <Button key={name} variant="ghost" onClick={() => { setMode("parametric"); setPoints(parametricPreset(name)); }}>{name}</Button>)}</div>
    <div className="flex flex-wrap items-center gap-3"><select aria-label="EQ mode" value={mode} onChange={event => setMode(event.target.value as typeof mode)} className="rounded-lg bg-s1 p-2"><option value="parametric">Parametric presets</option><option value="graphic">Graphic equalizer</option></select>{mode === "graphic" && <select aria-label="EQ bands" value={bands} onChange={event => { const count = Number(event.target.value) as typeof bands; setBands(count); setGains(Array(count).fill(0)); }} className="rounded-lg bg-s1 p-2">{[5, 10, 15, 31].map(count => <option key={count} value={count}>{count} bands</option>)}</select>}
      <Button variant="ghost" onClick={() => { const name = window.prompt("Preset name"); if (!name) return; try { const next = upsertMusicPreset(saved, { name, bands, gains, preamp, kind: mode, points }); localStorage.setItem(presetKey, JSON.stringify(next)); setSaved(next); setError(""); } catch (error) { setError(error instanceof Error ? error.message : "Could not save preset"); } }}>Save EQ preset</Button>
      {saved.map(preset => <Button key={preset.name} variant="ghost" onClick={() => { setMode(preset.kind); setBands(preset.bands); setGains(preset.gains); setPoints(preset.points); setPreamp(preset.preamp); }}>{preset.name}</Button>)}
    </div>
    {mode === "graphic" && <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">{frequencies.map((frequency, i) => <Slider key={frequency} label={`${frequency} Hz`} min={-12} max={12} step={0.5} value={gains[i] ?? 0} onChange={value => setGains(old => old.map((gain, index) => index === i ? value : gain))} />)}</div>}
    <Slider label="Preamp (dB)" min={-18} max={0} step={0.5} value={preamp} onChange={setPreamp} />
    <p className="text-xs text-ink-3">EQ applies conservative headroom attenuation. Navigating away closes this local player.</p>
    {error && <p role="alert" className="text-danger">{error}</p>}
  </section>;
}
