import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { ArrowDownUp, Folder, HardDrive, Play, RefreshCw, Server, AlertTriangle, ListVideo, Star } from "lucide-react";
import type { PermissionState } from "@/contracts/common";
import type { VideoItemView } from "@/contracts/media";
import { useSession } from "@/app/session";
import { useReport } from "@/app/feedback";
import { FIXTURE_VIDEOS } from "@/fixtures/data";
import { Screen } from "@/layouts/Screen";
import { VirtualGrid } from "@/ui/Virtual";
import { useContextMenu } from "@/ui/ContextMenu";
import { LARGE, makeVideos } from "@/fixtures/large";
import { Info } from "lucide-react";
import { Badge, ChipRow, IconButton, SearchField, SectionTitle, StateView, ActionMenu, Button, cn, formatBytes, formatDuration, hueGradient } from "@/ui";
import { MediaPermission, MediaSwitcher } from "../shared/Media";
import { VideoPlayer } from "./VideoPlayer";

type Src = "all" | "device" | "server";
type Sort = "recent" | "name" | "duration" | "size";

function Poster({ v, onOpen, onMenu }: { v: VideoItemView; onOpen(): void; onMenu?: (e: React.MouseEvent) => void }) {
  const res = (v.height ?? 0) >= 2160 ? "4K" : (v.height ?? 0) >= 1080 ? "1080p" : (v.height ?? 0) >= 720 ? "720p" : "SD";
  return (
    <button onClick={onOpen} onContextMenu={onMenu} className="group w-full min-w-0 text-left" data-testid={`video-${v.id}`}>
      <div className="relative aspect-video overflow-hidden rounded-2xl hairline" style={{ background: hueGradient(v.posterHue) }}>
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent" />
        <span className="absolute left-2 top-2 flex gap-1"><Badge className="bg-black/50 text-white backdrop-blur">{res}</Badge>{v.delivery === "unsupported" && <Badge tone="danger">Codec</Badge>}</span>
        <span className="absolute bottom-2 right-2 rounded-md bg-black/60 px-1.5 py-0.5 font-mono text-2xs text-white">{formatDuration(v.durationSec)}</span>
        <span className="absolute inset-0 grid place-items-center opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"><span className="grid size-12 place-items-center rounded-full bg-white/90 text-black"><Play className="ml-0.5 size-5 fill-current" /></span></span>
        {v.progressSec ? <div className="absolute inset-x-0 bottom-0 h-1 bg-white/15"><div className="h-full bg-ember" style={{ width: `${(v.progressSec / v.durationSec) * 100}%` }} /></div> : null}
      </div>
      <p className="mt-2 line-clamp-2 break-words text-sm font-semibold leading-snug">{v.title}</p>
      <p className="mt-0.5 flex items-center gap-1.5 text-xs text-ink-3">{v.source === "server" ? <Server className="size-3" /> : <HardDrive className="size-3" />}{v.folder} · {formatBytes(v.sizeBytes)}</p>
    </button>
  );
}

export default function Cinema() {
  const { pathname } = useLocation();
  const nav = useNavigate();
  const { adapter, availability, connection } = useSession();
  const report = useReport();
  const ctx = useContextMenu();
  const { prefs } = useSession();
  const ALL = useMemo(() => (prefs.largeLibraries ? [...FIXTURE_VIDEOS, ...makeVideos(LARGE.videos)] : FIXTURE_VIDEOS), [prefs.largeLibraries]);
  const [src, setSrc] = useState<Src>("all");
  const [q, setQ] = useState(""); const [sort, setSort] = useState<Sort>("recent"); const [sortOpen, setSortOpen] = useState(false);
  const [folder, setFolder] = useState<string | null>(null);
  const [perm, setPerm] = useState<PermissionState>("granted");
  const [refreshing, setRefreshing] = useState(false);
  const playId = pathname.match(/^\/cinema\/play\/(.+)/)?.[1];
  const serverOk = connection.mode === "server" && connection.server === "connected";

  const list = useMemo(() => {
    const l = ALL.filter((v) => (src === "all" || v.source === src) && (!folder || v.folder === folder) && (!q || v.title.toLowerCase().includes(q.toLowerCase())));
    const by: Record<Sort, (a: VideoItemView, b: VideoItemView) => number> = { recent: (a, b) => (b.lastPlayedAt ?? 0) - (a.lastPlayedAt ?? 0), name: (a, b) => a.title.localeCompare(b.title), duration: (a, b) => b.durationSec - a.durationSec, size: (a, b) => b.sizeBytes - a.sizeBytes };
    return [...l].sort(by[sort]);
  }, [ALL, src, folder, q, sort]);
  const folders = [...new Set(ALL.filter((v) => src === "all" || v.source === src).map((v) => v.folder))];
  const recent = FIXTURE_VIDEOS.filter((v) => v.lastPlayedAt).sort((a, b) => b.lastPlayedAt! - a.lastPlayedAt!);

  if (playId) { const v = FIXTURE_VIDEOS.find((x) => x.id === playId); return v ? <VideoPlayer video={v} onClose={() => nav("/cinema")} /> : <StateView kind="empty" title="Video not found" />; }

  const refresh = async () => { setRefreshing(true); report(await adapter.media.refreshLibrary("video", src === "server" ? "server" : "device"), "Library refreshed"); setRefreshing(false); };

  return (
    <Screen title="Cinema" testId="cinema-screen" subtitle={availability("cinema").availability === "beta" ? "Beta · local playback, server streaming in integration" : undefined}
      actions={<><IconButton icon={ArrowDownUp} label="Sort" onClick={() => setSortOpen(true)} data-testid="cinema-sort" /><IconButton icon={RefreshCw} label="Refresh library" onClick={refresh} className={cn(refreshing && "[&_svg]:animate-spin")} data-testid="cinema-refresh" /></>}
      toolbar={<div className="space-y-2"><div className="flex flex-wrap items-center gap-2"><MediaSwitcher /><SearchField value={q} onChange={setQ} placeholder="Search videos" className="min-w-[180px] flex-1" testId="cinema-search" /></div>
        <ChipRow label="Source" value={src} onChange={(v) => { setSrc(v); setFolder(null); }} options={[{ value: "all", label: "All" }, { value: "device", label: "This device" }, { value: "server", label: "Server" }]} /></div>}>
      <div className="mx-auto max-w-7xl">
        {src !== "server" && perm !== "granted" ? <MediaPermission kind="Videos" state={perm} onRequest={async () => setPerm(await adapter.media.requestAccess("video") === "prompt" ? "denied" : "granted")} /> :
          src === "server" && !serverOk ? <StateView kind="offline" title="Server library unavailable" body="Device videos still play. Reconnect to stream from your Locat server." /> : (<>
          {!q && !folder && recent.length > 0 && <section className="mb-8">
            <SectionTitle>Recently played</SectionTitle>
            <div className="no-scrollbar -mx-4 flex gap-4 overflow-x-auto px-4 md:-mx-6 md:px-6">{recent.map((v) => <div key={v.id} className="w-[280px] shrink-0 md:w-[340px]"><Poster v={v} onOpen={() => nav(`/cinema/play/${v.id}`)} /></div>)}</div>
          </section>}
          <section className="mb-6">
            <SectionTitle>Folders</SectionTitle>
            <div className="no-scrollbar flex gap-2 overflow-x-auto">{folders.map((f) => (
              <button key={f} onClick={() => setFolder(folder === f ? null : f)} aria-pressed={folder === f} className={cn("flex h-12 shrink-0 items-center gap-2 rounded-xl px-4 text-sm font-semibold hairline", folder === f ? "bg-ember/12 text-ember" : "bg-s1 hover:bg-s2")} data-testid={`folder-${f}`}><Folder className="size-4" />{f}</button>))}</div>
          </section>
          <SectionTitle action={<span className="text-xs text-ink-3">{list.length} videos · sorted by {sort}</span>}>{folder ?? "Library"}</SectionTitle>
          {list.length ? <VirtualGrid items={list} getKey={(v) => v.id} minItemWidth={160} gap={16} rowHeight={(w) => (w * 9) / 16 + 64} ariaLabel={`${list.length} videos`} testId="video-grid"
            renderItem={(v) => <Poster v={v} onOpen={() => nav(`/cinema/play/${v.id}`)} onMenu={ctx.onContextMenu(v.title, [{ id: "play", label: v.progressSec ? "Resume" : "Play", icon: Play, onSelect: () => nav(`/cinema/play/${v.id}`) }, { id: "folder", label: `Show folder ${v.folder}`, icon: Folder, onSelect: () => setFolder(v.folder) }, { id: "fav", label: "Add to favorites", icon: Star, onSelect: () => undefined, disabledReason: "Planned" }, { id: "info", label: `${v.videoCodec} · ${v.width}×${v.height}`, icon: Info, separatorBefore: true, onSelect: () => undefined }])} />} />
            : <StateView compact kind="empty" title="No videos match" body="Try another folder or clear the search." />}
          <div className="mt-10 grid gap-3 md:grid-cols-3">
            {[[ListVideo, "Series & seasons", "Episode grouping and next-episode"], [Star, "Favorites & playlists", "Collections across devices"], [AlertTriangle, "Audio & subtitle tracks", "Hosted track selection, HDR"]].map(([I, t, d]) => {
              const Icon = I as typeof Star; return <div key={t as string} className="flex items-center gap-3 rounded-2xl border border-dashed border-line-strong p-4"><Icon className="size-5 text-planned" /><div className="min-w-0 flex-1"><p className="text-sm font-semibold">{t as string}</p><p className="text-xs text-ink-3">{d as string}</p></div><Badge tone="planned">Planned</Badge></div>;
            })}
          </div>
          <div className="mt-4 text-center"><Button size="sm" variant="ghost" onClick={() => setPerm("denied")}>Preview: show permission state</Button></div>
        </>)}
      </div>
      <ActionMenu open={sortOpen} onClose={() => setSortOpen(false)} title="Sort videos" actions={(["recent", "name", "duration", "size"] as Sort[]).map((s) => ({ id: s, label: `${s[0].toUpperCase()}${s.slice(1)}${s === sort ? "  ✓" : ""}`, onSelect: () => setSort(s) }))} />
    </Screen>
  );
}
