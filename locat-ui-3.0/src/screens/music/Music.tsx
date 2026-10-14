import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { ArrowDownUp, ChevronDown, Heart, ListMusic, Pause, Play, Repeat, Repeat1, Shuffle, SkipBack, SkipForward, SlidersHorizontal, Volume2, Server, HardDrive } from "lucide-react";
import type { TrackView } from "@/contracts/media";
import { usePlayer } from "@/app/player";
import { useViewport } from "@/app/session";
import { FIXTURE_TRACKS } from "@/fixtures/data";
import { Screen } from "@/layouts/Screen";
import { useSession } from "@/app/session";
import { VirtualList } from "@/ui/Virtual";
import { useContextMenu } from "@/ui/ContextMenu";
import { LARGE, makeTracks } from "@/fixtures/large";
import { Info, ListPlus, Radio } from "lucide-react";
import { ActionMenu, Badge, ChipRow, IconButton, SearchField, Sheet, Slider, cn, formatDuration, hueGradient } from "@/ui";
import { MediaSwitcher } from "../shared/Media";
import { Equalizer } from "./Equalizer";

type View = "songs" | "albums" | "artists" | "folders" | "favorites";

function TrackRow({ t, i, active, playing, onPlay, onMenu }: { t: TrackView; i: number; active: boolean; playing: boolean; onPlay(): void; onMenu?: (e: React.MouseEvent) => void }) {
  return (
    <button onClick={onPlay} onContextMenu={onMenu} className={cn("flex h-16 w-full items-center gap-3 rounded-xl px-2 text-left hover:bg-s1", active && "bg-s1")} data-testid={`track-${t.id}`}>
      <span className="relative size-12 shrink-0 overflow-hidden rounded-lg" style={{ background: hueGradient(t.hue) }}>
        {active && <span className="absolute inset-0 flex items-end justify-center gap-0.5 bg-black/40 pb-2.5">{[0, 1, 2].map((k) => <span key={k} className={cn("w-1 origin-bottom rounded-full bg-ember", playing ? "animate-eq" : "h-1.5")} style={{ height: 14, animationDelay: `${k * 0.15}s` }} />)}</span>}
      </span>
      <span className="min-w-0 flex-1"><span className={cn("block truncate text-[15px] font-semibold md:text-sm", active && "text-ember")}>{t.title}</span><span className="block truncate text-xs text-ink-3">{t.artist} · {t.album}</span></span>
      <span className="hidden shrink-0 sm:block"><Badge>{t.format}{t.bitDepth && t.format !== "MP3" ? ` ${t.bitDepth}/${(t.sampleRate! / 1000).toFixed(t.sampleRate! % 1000 ? 1 : 0)}` : ""}</Badge></span>
      {t.source === "server" ? <Server className="size-3.5 shrink-0 text-ink-3" aria-label="Server" /> : <HardDrive className="size-3.5 shrink-0 text-ink-3" aria-label="This device" />}
      {t.favorite && <Heart className="size-4 shrink-0 fill-ember text-ember" aria-label="Favorite" />}
      <span className="w-10 shrink-0 text-right font-mono text-xs tabular text-ink-3">{formatDuration(t.durationSec)}</span>
      <span className="sr-only">Track {i + 1}</span>
    </button>
  );
}

function NowPlaying({ open, onClose, onEq }: { open: boolean; onClose(): void; onEq(): void }) {
  const p = usePlayer();
  const [queueOpen, setQueueOpen] = useState(false);
  useEffect(() => { if (!p.playing || !p.current) return; const t = setInterval(() => p.seek(Math.min(p.current!.durationSec, p.position + 1)), 1000); return () => clearInterval(t); }, [p]);
  const t = p.current;
  if (!t) return null;
  return (
    <Sheet open={open} onClose={onClose} title="Now playing" size="lg" testId="now-playing">
      <div className="mx-auto flex max-w-md flex-col items-center">
        <div className="relative aspect-square w-full max-w-[340px] overflow-hidden rounded-3xl shadow-float" style={{ background: hueGradient(t.hue) }}>
          <div className="mesh absolute inset-0 opacity-40" /><span className="absolute bottom-3 left-3"><Badge className="bg-black/50 text-white">Artwork enrichment planned</Badge></span>
        </div>
        <div className="mt-6 flex w-full items-start gap-3">
          <div className="min-w-0 flex-1"><p className="truncate text-xl font-extrabold">{t.title}</p><p className="truncate text-sm text-ink-2">{t.artist} — {t.album}</p></div>
          <IconButton icon={Heart} label={t.favorite ? "Remove favorite" : "Favorite"} active={t.favorite} />
        </div>
        <div className="mt-5 w-full">
          <Slider label="Seek" min={0} max={t.durationSec} value={p.position} onChange={p.seek} format={formatDuration} />
          <div className="mt-1.5 flex justify-between font-mono text-2xs tabular text-ink-3"><span>{formatDuration(p.position)}</span><span>{t.format} · {t.sampleRate! / 1000} kHz{t.bitrateKbps ? ` · ${t.bitrateKbps} kbps` : ` · ${t.bitDepth}-bit`}</span><span>-{formatDuration(t.durationSec - p.position)}</span></div>
        </div>
        <div className="mt-4 flex w-full items-center justify-between">
          <IconButton icon={Shuffle} label="Shuffle" active={p.queue.shuffle} onClick={() => p.setShuffle(!p.queue.shuffle)} data-testid="np-shuffle" />
          <IconButton icon={SkipBack} label="Previous" size="lg" onClick={p.prev} />
          <button onClick={p.toggle} aria-label={p.playing ? "Pause" : "Play"} className="grid size-[72px] place-items-center rounded-full bg-ember text-ember-ink shadow-ember active:scale-95" data-testid="np-toggle">{p.playing ? <Pause className="size-8 fill-current" /> : <Play className="ml-1 size-8 fill-current" />}</button>
          <IconButton icon={SkipForward} label="Next" size="lg" onClick={p.next} data-testid="np-next" />
          <IconButton icon={p.queue.repeat === "one" ? Repeat1 : Repeat} label={`Repeat ${p.queue.repeat}`} active={p.queue.repeat !== "off"} onClick={p.cycleRepeat} data-testid="np-repeat" />
        </div>
        <div className="mt-5 flex w-full items-center gap-3"><Volume2 className="size-4 text-ink-3" /><Slider label="Volume" min={0} max={1} step={0.05} value={0.8} onChange={() => undefined} /></div>
        <div className="mt-5 flex gap-2"><IconButton icon={SlidersHorizontal} label="Equalizer" onClick={onEq} data-testid="np-eq" /><IconButton icon={ListMusic} label="Queue" onClick={() => setQueueOpen(true)} data-testid="np-queue" /></div>
        <p className="mt-4 text-center text-2xs text-ink-3">Preview playhead only. Background, lock-screen and headset controls need the native audio integration.</p>
      </div>
      <ActionMenu open={queueOpen} onClose={() => setQueueOpen(false)} title="Up next" actions={p.queue.tracks.map((q, i) => ({ id: `q-${q.id}`, label: `${i === p.queue.index ? "▶ " : ""}${q.title} — ${q.artist}`, onSelect: () => p.play(q, p.queue.tracks) }))} />
    </Sheet>
  );
}

export default function Music() {
  const p = usePlayer();
  const { prefs } = useSession();
  const ctx = useContextMenu();
  const library = useMemo(() => (prefs.largeLibraries ? makeTracks(LARGE.tracks) : FIXTURE_TRACKS), [prefs.largeLibraries]);
  const [params, setParams] = useSearchParams();
  const { expanded } = useViewport();
  const nav = useNavigate();
  const [view, setView] = useState<View>("songs");
  const [q, setQ] = useState(""); const [sort, setSort] = useState<"title" | "artist" | "duration">("title"); const [sortOpen, setSortOpen] = useState(false);
  const [eq, setEq] = useState(params.get("eq") === "1");
  const [np, setNp] = useState(params.get("now") === "1");
  useEffect(() => { if (params.size) setParams({}, { replace: true }); }, [params, setParams]);
  const tracks = useMemo(() => library.filter((t) => (view !== "favorites" || t.favorite) && (!q || `${t.title} ${t.artist} ${t.album}`.toLowerCase().includes(q.toLowerCase())))
    .sort((a, b) => (sort === "duration" ? a.durationSec - b.durationSec : a[sort].localeCompare(b[sort]))), [library, view, q, sort]);
  const groups = useMemo(() => {
    const key = view === "albums" ? "album" : view === "artists" ? "artist" : "folder";
    const m = new Map<string, TrackView[]>(); for (const t of tracks) m.set(t[key], [...(m.get(t[key]) ?? []), t]); return [...m.entries()];
  }, [tracks, view]);

  return (
    <Screen title="Music" testId="music-screen" subtitle="Beta · local & server playback through the Locat EQ"
      actions={<><IconButton icon={ArrowDownUp} label="Sort" onClick={() => setSortOpen(true)} /><IconButton icon={SlidersHorizontal} label="Equalizer" onClick={() => setEq(true)} data-testid="open-eq" /></>}
      toolbar={<div className="space-y-2"><div className="flex flex-wrap items-center gap-2"><MediaSwitcher /><SearchField value={q} onChange={setQ} placeholder="Songs, albums, artists" className="min-w-[180px] flex-1" testId="music-search" /></div>
        <ChipRow label="Library view" value={view} onChange={setView} options={[{ value: "songs", label: "Songs" }, { value: "albums", label: "Albums" }, { value: "artists", label: "Artists" }, { value: "folders", label: "Folders" }, { value: "favorites", label: "Favorites" }]} /></div>}>
      <div className={cn("mx-auto max-w-6xl", expanded && "grid grid-cols-[1fr_320px] gap-8")}>
        <div>
          {view === "songs" || view === "favorites" ? (
            <VirtualList scroll="parent" items={tracks} getKey={(t) => t.id} estimateSize={64} ariaLabel={`${tracks.length} songs`} testId="song-list"
              renderItem={(t, i) => <TrackRow t={t} i={i} active={p.current?.id === t.id} playing={p.playing} onPlay={() => p.play(t, tracks)}
                onMenu={ctx.onContextMenu(t.title, [{ id: "play", label: "Play", icon: Play, onSelect: () => p.play(t, tracks) }, { id: "next", label: "Play next", icon: ListPlus, onSelect: () => p.play(t, tracks), disabledReason: "Queue editing — integration" }, { id: "fav", label: t.favorite ? "Remove favorite" : "Favorite", icon: Heart, onSelect: () => undefined, disabledReason: "Preview" }, { id: "radio", label: "Start radio", icon: Radio, onSelect: () => undefined, disabledReason: "Planned" }, { id: "info", label: `${t.format} · ${t.source}`, icon: Info, separatorBefore: true, onSelect: () => undefined }])} />} />
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">{groups.map(([name, list]) => (
              <button key={name} onClick={() => p.play(list[0], list)} className="group text-left" data-testid={`group-${name}`}>
                <div className={cn("relative aspect-square overflow-hidden shadow-lift", view === "artists" ? "rounded-full" : "rounded-2xl")} style={{ background: hueGradient(list[0].hue) }}>
                  <span className="absolute bottom-2 right-2 grid size-10 place-items-center rounded-full bg-ember text-ember-ink opacity-0 transition-opacity group-hover:opacity-100"><Play className="ml-0.5 size-4 fill-current" /></span>
                </div>
                <p className={cn("mt-2 truncate text-sm font-bold", view === "artists" && "text-center")}>{name}</p><p className={cn("text-xs text-ink-3", view === "artists" && "text-center")}>{list.length} tracks</p>
              </button>))}</div>
          )}
          {!tracks.length && <p className="py-12 text-center text-sm text-ink-3">No music matches.</p>}
        </div>
        {expanded && (
          <aside className="sticky top-0 h-fit rounded-3xl bg-s1 p-5 hairline">
            {p.current ? (<>
              <div className="aspect-square rounded-2xl" style={{ background: hueGradient(p.current.hue) }} />
              <p className="mt-4 truncate font-bold">{p.current.title}</p><p className="truncate text-sm text-ink-3">{p.current.artist}</p>
              <div className="mt-4 flex items-center justify-center gap-2"><IconButton icon={SkipBack} label="Previous" onClick={p.prev} /><IconButton icon={p.playing ? Pause : Play} tone="ember" label={p.playing ? "Pause" : "Play"} onClick={p.toggle} size="lg" /><IconButton icon={SkipForward} label="Next" onClick={p.next} /></div>
              <button onClick={() => setNp(true)} className="mt-3 flex w-full items-center justify-center gap-1 text-xs font-semibold text-ember"><ChevronDown className="size-3 rotate-180" />Expand player</button>
            </>) : <p className="text-sm text-ink-3">Pick a song to start. Your queue and EQ follow you across Locat.</p>}
          </aside>)}
      </div>
      <Equalizer open={eq} onClose={() => setEq(false)} />
      <NowPlaying open={np} onClose={() => setNp(false)} onEq={() => { setNp(false); setEq(true); }} />
      <ActionMenu open={sortOpen} onClose={() => setSortOpen(false)} title="Sort" actions={(["title", "artist", "duration"] as const).map((s) => ({ id: s, label: `${s}${s === sort ? "  ✓" : ""}`, onSelect: () => setSort(s) }))} />
      <span className="hidden" onClick={() => nav("/music")} />
    </Screen>
  );
}
