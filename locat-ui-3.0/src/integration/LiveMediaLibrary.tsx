import { safeMediaUrl } from "./mediaSource";
import { useEffect, useState } from "react";
import { Screen } from "../layouts/Screen";
import { Button, SearchField, StateView, formatBytes } from "../ui";
import { useLiveMedia } from "./liveMedia";
import type { LocalMediaItem, LocalMediaKind } from "./localMediaStore";
import { LiveVideoPlayer } from "./LiveVideoPlayer";
import { LivePhotoViewer } from "./LivePhotoViewer";
import { LiveAudioPlayer } from "./LiveAudioPlayer";
function PhotoThumbnail({ item }: { item: LocalMediaItem }) {
  const [url, setUrl] = useState("");
  const direct = safeMediaUrl(item);
  useEffect(() => { const next = direct ?? URL.createObjectURL(item.file); const timer = setTimeout(() => setUrl(next), 0); return () => { clearTimeout(timer); if (!direct) URL.revokeObjectURL(next); }; }, [item.file, direct]);
  return <img src={url || undefined} alt="" loading="lazy" className="aspect-video w-full rounded-xl object-cover" />;
}
export function LiveMediaLibrary({ kind }: { kind: LocalMediaKind }) {
  const { items, loading, error, serverError, serverLibraries, refreshServer, importFiles, update, remove } = useLiveMedia();
  const [source, setSource] = useState("all");
  const [query, setQuery] = useState("");
  const [favorites, setFavorites] = useState(false);
  const [album, setAlbum] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [sort, setSort] = useState("recent");
  const title = { video: "Cinema", audio: "Music", photo: "Photos" }[kind];
  const all = items.filter(item => item.kind === kind);
  const list = all.filter(item => (source === "all" || (item.source ?? "device") === source) && (!favorites || item.favorite) && (!album || item.album === album) && item.name.toLowerCase().includes(query.toLowerCase())).sort((a, b) => sort === "name" ? a.name.localeCompare(b.name) : b.addedAt - a.addedAt);
  const current = all.find(item => item.id === selected);
  if (current && kind === "video") return <LiveVideoPlayer key={current.id} item={current} onClose={() => setSelected(null)} />;
  return <Screen title={title} subtitle="Device libraries and authenticated server media" actions={<label className="cursor-pointer rounded-xl bg-ember px-4 py-2 text-sm font-semibold text-ember-ink">Import files<input aria-label={`Import ${title} files`} type="file" multiple accept={kind === "video" ? "video/*,.mkv,.mov" : kind === "audio" ? "audio/*,.flac,.opus" : "image/jpeg,image/png,image/webp,image/gif,image/avif,image/bmp"} className="sr-only" onChange={event => { if (event.target.files) void importFiles(Array.from(event.target.files)); event.target.value = ""; }} /></label>}
    toolbar={<div className="flex flex-wrap items-center gap-3"><SearchField value={query} onChange={setQuery} placeholder={`Search ${title.toLowerCase()}`} /><select aria-label="Media source" className="rounded-lg bg-s2 p-2" value={source} onChange={event => setSource(event.target.value)}><option value="all">All sources</option><option value="device">This device</option><option value="server">Server</option></select><Button variant="ghost" onClick={() => void refreshServer?.()}>Refresh server</Button><Button variant="ghost" onClick={() => setFavorites(old => !old)}>{favorites ? "Show all" : "Favorites"}</Button><select aria-label="Album filter" className="rounded-lg bg-s2 p-2" value={album} onChange={event => setAlbum(event.target.value)}><option value="">All albums</option>{[...new Set(all.map(item => item.album))].map(album => <option key={album}>{album}</option>)}</select><select aria-label="Sort media" className="rounded-lg bg-s2 p-2" value={sort} onChange={event => setSort(event.target.value)}><option value="recent">Recently imported</option><option value="name">Name</option></select></div>}>
    <div className="mx-auto max-w-7xl">
      <p className="mb-5 text-sm text-ink-3">Imported files stay in this browser, scoped to your account. They are not uploaded or encrypted. Clearing browser storage removes these copies.</p>
      {source !== "device" && serverError && <p role="alert" className="mb-4 text-danger">{serverError}</p>}
      {source === "server" && serverLibraries?.length === 0 && <p className="mb-4 text-ink-3">The host has not configured any shared media folders.</p>}
      {source === "server" && serverLibraries?.some(library => !library.available) && <p className="mb-4 text-warn">One or more shared folders are unavailable.</p>}
      {error && <p role="alert" className="mb-4 text-danger">{error}</p>}
      {current && kind === "photo" && <LivePhotoViewer key={current.id} item={current} onClose={() => setSelected(null)} />}
      {current && kind === "audio" && <LiveAudioPlayer key={current.id} items={list} initialId={current.id} onClose={() => setSelected(null)} />}
      {loading ? <p role="status">Loading library…</p> : !list.length ? <StateView kind="empty" title="No media here yet" body="Import your own files or change the filters." /> :
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{list.map(item => <article key={item.id} className="space-y-3 rounded-2xl bg-s1 p-4 hairline">
          <button className="w-full text-left" onClick={() => setSelected(item.id)}>{kind === "photo" ? <PhotoThumbnail item={item} /> : <div className="flex aspect-video items-center justify-center rounded-xl bg-s2 text-ember">{kind === "video" ? "Play video" : "Play music"}</div>}<p className="mt-3 break-words font-semibold">{item.name}</p><p className="text-xs text-ink-3">{formatBytes(item.size)} · {item.source === "server" ? "Server" : "Device"} · {item.album}{item.position > 0 ? " · Resume available" : ""}</p></button>
          <div className="flex flex-wrap gap-2"><Button size="sm" variant="ghost" onClick={() => void update({ ...item, favorite: !item.favorite })}>{item.favorite ? "Unfavorite" : "Favorite"}</Button><Button size="sm" variant="ghost" onClick={() => { const album = window.prompt("Album name", item.album); if (album?.trim()) void update({ ...item, album: album.trim().slice(0, 80) }); }}>Album</Button><Button size="sm" variant="ghost" onClick={() => { const direct = safeMediaUrl(item); const url = direct ?? URL.createObjectURL(item.file); const link = document.createElement("a"); link.href = url; link.download = item.name; link.click(); if (!direct) setTimeout(() => URL.revokeObjectURL(url), 30000); }}>Download</Button>{item.source !== "server" && <Button size="sm" variant="ghost" onClick={() => { if (window.confirm(`Remove the browser copy of ${item.name}? Your original file is unaffected.`)) void remove(item.id); }}>Remove copy</Button>}</div>
        </article>)}</div>}
    </div>
  </Screen>;
}
