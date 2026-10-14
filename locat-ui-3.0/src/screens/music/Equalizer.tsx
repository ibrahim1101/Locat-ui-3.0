import { useMemo, useState } from "react";
import type { EqBandCount, EqView } from "@/contracts/media";
import { useSession } from "@/app/session";
import { useReport } from "@/app/feedback";
import { Banner, Button, Segmented, Sheet, Slider, Switch, cn } from "@/ui";
import { FlaskConical, Save } from "lucide-react";

/** ISO-style centre frequencies for the selectable band layouts (mirrors Locat MusicEqualizer). */
function bandFreqs(n: EqBandCount): number[] {
  const lo = Math.log10(31.5), hi = Math.log10(16000);
  return Array.from({ length: n }, (_, i) => Math.round(10 ** (lo + ((hi - lo) * i) / (n - 1))));
}
const fmtHz = (f: number) => (f >= 1000 ? `${(f / 1000).toFixed(f >= 10000 ? 0 : 1)}k` : `${f}`);
const PRESETS = [{ id: "flat", name: "Flat", custom: false }, { id: "warm", name: "Warm", custom: false }, { id: "vocal", name: "Vocal", custom: false }, { id: "bass", name: "Bass lift", custom: false }, { id: "my-desk", name: "My desk", custom: true }];
const presetShape = (id: string, n: number) => Array.from({ length: n }, (_, i) => { const x = i / (n - 1); return id === "warm" ? 3 - 5 * x : id === "vocal" ? 4 * Math.exp(-((x - 0.55) ** 2) / 0.03) : id === "bass" ? 6 * Math.max(0, 1 - x * 3) : id === "my-desk" ? Math.sin(x * 6) * 2 : 0; }).map((g) => Math.round(g * 2) / 2);

/** Frequency-response preview curve (display only; real response is computed by Locat's biquad graph). */
function Curve({ gains, bypass }: { gains: number[]; bypass: boolean }) {
  const pts = gains.map((g, i) => `${(i / (gains.length - 1)) * 100},${50 - (bypass ? 0 : g) * 3.5}`).join(" ");
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-28 w-full rounded-xl bg-s2" aria-hidden>
      {[25, 50, 75].map((y) => <line key={y} x1="0" x2="100" y1={y} y2={y} stroke="rgb(var(--line))" strokeWidth=".4" />)}
      <polyline points={pts} fill="none" stroke={bypass ? "rgb(var(--ink-3))" : "rgb(var(--ember))"} strokeWidth="1.4" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
    </svg>
  );
}

export function Equalizer({ open, onClose }: { open: boolean; onClose(): void }) {
  const { adapter } = useSession();
  const report = useReport();
  const [eq, setEq] = useState<EqView>({ mode: "graphic", bands: 10, gains: presetShape("flat", 10), points: [{ type: "lowshelf", frequency: 100, gain: 2, q: 0.7 }, { type: "peaking", frequency: 2500, gain: -1.5, q: 1.4 }, { type: "highshelf", frequency: 9000, gain: 1, q: 0.7 }], preampDb: 0, bypass: false, presetId: "flat", presets: PRESETS, headroomDb: 0 });
  const freqs = useMemo(() => bandFreqs(eq.bands), [eq.bands]);
  const boost = Math.max(0, ...eq.gains);
  const clipRisk = !eq.bypass && boost + eq.preampDb > 0.5;
  const set = (p: Partial<EqView>) => setEq((e) => ({ ...e, ...p }));
  return (
    <Sheet open={open} onClose={onClose} title="Equalizer" description="Shapes local and server playback through Locat's Web Audio EQ." size="lg" testId="equalizer"
      footer={<><Button variant="ghost" onClick={() => set({ gains: presetShape("flat", eq.bands), preampDb: 0, presetId: "flat" })}>Reset</Button><Button icon={Save} onClick={async () => report(await adapter.media.saveEqPreset("Custom", eq), "Preset saved")} data-testid="eq-save">Save as preset</Button></>}>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Segmented label="EQ mode" value={eq.mode} onChange={(mode) => set({ mode })} options={[{ value: "graphic", label: "Graphic" }, { value: "parametric", label: "Parametric" }]} />
        {eq.mode === "graphic" && <Segmented label="Bands" size="sm" value={String(eq.bands) as `${EqBandCount}`} onChange={(b) => { const n = Number(b) as EqBandCount; set({ bands: n, gains: presetShape(eq.presetId, n) }); }} options={(["5", "10", "15", "31"] as const).map((b) => ({ value: b, label: `${b}` }))} />}
        <span className="flex-1" />
        <div className="w-44"><Switch label="Pure bypass" checked={eq.bypass} onChange={(bypass) => set({ bypass })} testId="eq-bypass" /></div>
      </div>
      <div className="no-scrollbar mb-4 flex gap-2 overflow-x-auto">{eq.presets.map((p) => <button key={p.id} onClick={() => set({ presetId: p.id, gains: presetShape(p.id, eq.bands) })} className={cn("h-9 shrink-0 rounded-full px-3.5 text-[13px] font-semibold hairline", eq.presetId === p.id ? "bg-ember/15 text-ember" : "bg-s2 text-ink-2")}>{p.name}{p.custom && " ·"}</button>)}</div>
      <Curve gains={eq.mode === "graphic" ? eq.gains : eq.points.map((p) => p.gain)} bypass={eq.bypass} />
      {eq.mode === "graphic" ? (
        <div className={cn("no-scrollbar mt-4 flex gap-1 overflow-x-auto pb-1", eq.bypass && "pointer-events-none opacity-40")} role="group" aria-label="Graphic EQ bands">
          {freqs.map((f, i) => (
            <div key={f} className={cn("flex shrink-0 flex-col items-center gap-2", eq.bands > 15 ? "w-8" : "min-w-10 flex-1")}>
              <span className="font-mono text-[10px] tabular text-ink-3">{eq.gains[i] > 0 ? "+" : ""}{eq.gains[i]}</span>
              <Slider vertical label={`${fmtHz(f)} Hz`} min={-12} max={12} step={0.5} value={eq.gains[i]} onChange={(g) => set({ gains: eq.gains.map((x, j) => (j === i ? g : x)), presetId: "custom" })} />
              <span className="font-mono text-[10px] text-ink-3">{fmtHz(f)}</span>
            </div>))}
        </div>
      ) : (
        <div className={cn("mt-4 space-y-2", eq.bypass && "opacity-40")}>
          {eq.points.map((p, i) => (
            <div key={i} className="grid grid-cols-[90px_1fr] items-center gap-3 rounded-xl bg-s2 p-3 hairline sm:grid-cols-[110px_1fr_1fr_1fr]">
              <span className="text-xs font-bold capitalize">{p.type}</span>
              {(["frequency", "gain", "q"] as const).map((k) => (
                <label key={k} className="col-span-2 flex items-center gap-2 text-2xs text-ink-3 sm:col-span-1">{k === "frequency" ? "Hz" : k === "gain" ? "dB" : "Q"}
                  <Slider label={`${p.type} ${k}`} min={k === "frequency" ? 20 : k === "gain" ? -12 : 0.1} max={k === "frequency" ? 20000 : k === "gain" ? 12 : 10} step={k === "frequency" ? 10 : 0.1} value={p[k]} onChange={(v) => set({ points: eq.points.map((x, j) => (j === i ? { ...x, [k]: v } : x)) })} />
                  <span className="w-10 text-right font-mono tabular text-ink-2">{k === "frequency" ? fmtHz(p.frequency) : p[k].toFixed(1)}</span></label>))}
            </div>))}
          <p className="text-xs text-ink-3">Up to 24 filters: peaking, low/high shelf, high/low pass.</p>
        </div>
      )}
      <div className="mt-5 rounded-xl bg-s2 p-3 hairline">
        <div className="flex items-center justify-between text-sm"><span className="font-semibold">Preamp</span><span className="font-mono text-xs tabular">{eq.preampDb.toFixed(1)} dB</span></div>
        <Slider className="mt-3" label="Preamp" min={-12} max={6} step={0.5} value={eq.preampDb} onChange={(preampDb) => set({ preampDb })} />
        {clipRisk && <p className="mt-2 text-xs text-warn">Boost of +{(boost + eq.preampDb).toFixed(1)} dB may clip. Lower the preamp to keep headroom.</p>}
      </div>
      <Banner className="mt-4" tone="planned" icon={FlaskConical} title="Pure bypass isn't verified bit-perfect">Exclusive output, gapless playback and advanced DSP are planned. Native audio focus and background playback need an installed build.</Banner>
    </Sheet>
  );
}
