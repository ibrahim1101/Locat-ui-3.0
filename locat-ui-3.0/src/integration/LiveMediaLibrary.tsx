import { addPlaylist, movePlaylistItem, parsePlaylists, replacePlaylistItems } from "./mediaPlaylists";
import { useSession } from "../app/session";
import { safeMediaUrl } from "./mediaSource";
import { useCallback, useEffect, useRef, useState } from "react";
import { Screen } from "../layouts/Screen";
import { Button, SearchField, StateView, Sheet, Switch, TextField, formatBytes } from "../ui";
import { useLiveMedia } from "./liveMedia";
import type { LocalMediaItem, LocalMediaKind } from "./localMediaStore";
import { LiveVideoPlayer } from "./LiveVideoPlayer";
import { LivePhotoViewer } from "./LivePhotoViewer";
import { LiveAudioPlayer } from "./LiveAudioPlayer";
import {matchesMediaSearch,parseMediaTags,readMediaTags} from "./mediaTags";
import {findPhotoDuplicates,type PhotoDuplicateResult} from "./photoDuplicates";
function PhotoThumbnail({ item }: { item: LocalMediaItem }) {
  const [url, setUrl] = useState("");
  const direct = safeMediaUrl(item);
  useEffect(() => { const next = direct ?? URL.createObjectURL(item.file); const timer = setTimeout(() => setUrl(next), 0); return () => { clearTimeout(timer); if (!direct) URL.revokeObjectURL(next); }; }, [item.file, direct]);
  return <img src={url || undefined} alt="" loading="lazy" className="aspect-video w-full rounded-xl object-cover" />;
}
export function LiveMediaLibrary({ kind }: { kind: LocalMediaKind }) {
  const { user, connection } = useSession();
  const playlistKey = `locat-ui3-playlists:${user?.id ?? (connection.mode === "local-only" ? "local-device" : "signed-out")}`;
  const [playlists, setPlaylists] = useState(() => parsePlaylists(localStorage.getItem(playlistKey)));
  const [playlistId, setPlaylistId] = useState("");
  const [managePlaylist, setManagePlaylist] = useState(false);
  const [deletePlaylist, setDeletePlaylist] = useState(false);
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [memberQuery, setMemberQuery] = useState("");
  const [playlistSheet, setPlaylistSheet] = useState(false);
  const [playlistName, setPlaylistName] = useState("");
  const [playlistError, setPlaylistError] = useState("");
  const { items, loading, error, serverError, serverLibraries, refreshServer, importFiles, update, remove } = useLiveMedia();
  const [duplicateOpen,setDuplicateOpen]=useState(false),[duplicateBusy,setDuplicateBusy]=useState(false),[duplicateError,setDuplicateError]=useState(""),[duplicateResult,setDuplicateResult]=useState<PhotoDuplicateResult|null>(null);
  const duplicateControl=useRef<AbortController|null>(null);
  const cancelDuplicateScan=useCallback(()=>{duplicateControl.current?.abort();duplicateControl.current=null;},[]);
  useEffect(()=>()=>cancelDuplicateScan(),[cancelDuplicateScan]);
  const [tagItemId,setTagItemId]=useState<string|null>(null),[tagDraft,setTagDraft]=useState(""),[tagError,setTagError]=useState(""),[tagBusy,setTagBusy]=useState(false);
  const tagSaving=useRef(false);
  const [editingAlbum, setEditingAlbum] = useState<LocalMediaItem | null>(null);
  const [albumName, setAlbumName] = useState("");
  const [removing, setRemoving] = useState<LocalMediaItem | null>(null);
  const [source, setSource] = useState("all");
  const [query, setQuery] = useState("");
  const [favorites, setFavorites] = useState(false);
  const [album, setAlbum] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [sort, setSort] = useState("recent");
  const [autoQueue, setAutoQueue] = useState(false);
  const [autoStart, setAutoStart] = useState(false);
  const title = { video: "Cinema", audio: "Music", photo: "Photos" }[kind];
  const all = items.filter(item => item.kind === kind);
  const playlist = playlists.find(row => row.id === playlistId);
  const list = all.filter(item => (!playlist || playlist.itemIds.includes(item.id)) && (source === "all" || (item.source ?? "device") === source) && (!favorites || item.favorite) && (!album || item.album === album) && matchesMediaSearch(item,query)).sort((a, b) => playlist ? playlist.itemIds.indexOf(a.id) - playlist.itemIds.indexOf(b.id) : sort === "name" ? a.name.localeCompare(b.name) : b.addedAt - a.addedAt);
  const taggedItem=all.find(item=>item.id===tagItemId);
  const current = all.find(item => item.id === selected);
  async function scanDuplicatePhotos(){cancelDuplicateScan();const control=new AbortController();duplicateControl.current=control;setDuplicateOpen(true);setDuplicateBusy(true);setDuplicateError("");setDuplicateResult(null);try{const result=await findPhotoDuplicates(list,control.signal);if(duplicateControl.current===control&&!control.signal.aborted)setDuplicateResult(result);}catch(error){if(duplicateControl.current===control&&!control.signal.aborted)setDuplicateError(error instanceof Error?error.message:"Photo comparison failed");}finally{if(duplicateControl.current===control){duplicateControl.current=null;setDuplicateBusy(false);}}}
  if (current && kind === "video") return <LiveVideoPlayer key={current.id} item={current} autoStart={autoStart} onClose={() => { setSelected(null); setAutoStart(false); }} onEnded={() => { if (!autoQueue || !playlist) return; const index = list.findIndex(item => item.id === current.id); const next = index >= 0 ? list[index + 1] : undefined; if (next) { setAutoStart(true); setSelected(next.id); } }} />;
  return <Screen title={title} subtitle="Device libraries and authenticated server media" actions={<label className="cursor-pointer rounded-xl bg-ember px-4 py-2 text-sm font-semibold text-ember-ink">Import files<input aria-label={`Import ${title} files`} type="file" multiple accept={kind === "video" ? "video/*,.mkv,.mov" : kind === "audio" ? "audio/*,.flac,.opus" : "image/jpeg,image/png,image/webp,image/gif,image/avif,image/bmp"} className="sr-only" onChange={event => { if (event.target.files) void importFiles(Array.from(event.target.files)); event.target.value = ""; }} /></label>}
    toolbar={<div className="flex flex-wrap items-center gap-3"><SearchField value={query} onChange={setQuery} placeholder={`Search ${title.toLowerCase()}`} /><select aria-label="Media source" className="rounded-lg bg-s2 p-2" value={source} onChange={event => setSource(event.target.value)}><option value="all">All sources</option><option value="device">This device</option><option value="server">Server</option></select><Button variant="ghost" onClick={() => void refreshServer?.()}>Refresh server</Button>{kind==="photo"&&<Button variant="ghost" disabled={!list.some(item=>item.source!=="server")} onClick={()=>void scanDuplicatePhotos()}>Find duplicate photos</Button>}<Button variant="ghost" onClick={() => setFavorites(old => !old)}>{favorites ? "Show all" : "Favorites"}</Button><select aria-label="Album filter" className="rounded-lg bg-s2 p-2" value={album} onChange={event => setAlbum(event.target.value)}><option value="">All albums</option>{[...new Set(all.map(item => item.album))].map(album => <option key={album}>{album}</option>)}</select><select aria-label="Playlist filter" className="rounded-lg bg-s2 p-2" value={playlistId} onChange={event => setPlaylistId(event.target.value)}><option value="">All playlists</option>{playlists.filter(row => row.kind === kind).map(row => <option key={row.id} value={row.id}>{row.name}</option>)}</select><Button variant="ghost" disabled={!list.length} onClick={() => setPlaylistSheet(true)}>Save results as playlist</Button>{playlist && <Button variant="ghost" onClick={() => { setPlaylistName(playlist.name); setMemberIds([...playlist.itemIds]); setMemberQuery(""); setPlaylistError(""); setManagePlaylist(true); }}>Manage playlist</Button>}{kind === "audio" && <Button disabled={!list.length} onClick={() => setSelected(list[0].id)}>Play queue</Button>}<select disabled={!!playlist} aria-label="Sort media" className="rounded-lg bg-s2 p-2" value={sort} onChange={event => setSort(event.target.value)}><option value="recent">Recently imported</option><option value="name">Name</option></select></div>}>
    <div className="mx-auto max-w-7xl">
      {kind === "video" && playlist && <div className="mb-4 rounded-xl bg-s1 p-4 hairline"><Switch label="Continue video playlist" checked={autoQueue} onChange={setAutoQueue} description="After a video ends, open and attempt to play the next available item in this filtered playlist. Browser autoplay rules still apply." /></div>}
      <p className="mb-5 text-sm text-ink-3">Imported files stay in this browser, scoped to your account. They are not uploaded or encrypted. Clearing browser storage removes these copies.</p>
      {source !== "device" && serverError && <p role="alert" className="mb-4 text-danger">{serverError}</p>}
      {source === "server" && serverLibraries?.length === 0 && <p className="mb-4 text-ink-3">The host has not configured any shared media folders.</p>}
      {source === "server" && serverLibraries?.some(library => !library.available) && <p className="mb-4 text-warn">One or more shared folders are unavailable.</p>}
      {playlistError && <p role="alert" className="mb-4 text-danger">{playlistError}</p>}
      {error && <p role="alert" className="mb-4 text-danger">{error}</p>}
      {current && kind === "photo" && <LivePhotoViewer key={current.id} item={current} onClose={() => setSelected(null)} />}
      {current && kind === "audio" && <LiveAudioPlayer key={current.id} items={list} initialId={current.id} onClose={() => setSelected(null)} />}
      {loading ? <p role="status">Loading library…</p> : !list.length ? <StateView kind="empty" title="No media here yet" body="Import your own files or change the filters." /> :
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{list.map(item => <article key={item.id} className="space-y-3 rounded-2xl bg-s1 p-4 hairline">
          <button className="w-full text-left" onClick={() => setSelected(item.id)}>{kind === "photo" ? <PhotoThumbnail item={item} /> : <div className="flex aspect-video items-center justify-center rounded-xl bg-s2 text-ember">{kind === "video" ? "Play video" : "Play music"}</div>}<p className="mt-3 break-words font-semibold">{item.name}</p><p className="text-xs text-ink-3">{formatBytes(item.size)} · {item.source === "server" ? "Server" : "Device"} · {item.album}{item.position > 0 ? " · Resume available" : ""}</p></button>
          {kind==="photo"&&readMediaTags(item.tags).length>0&&<p className="break-words text-xs text-ink-3">Tags: {readMediaTags(item.tags).join(", ")}</p>}
          <div className="flex flex-wrap gap-2">{kind==="photo"&&<Button size="sm" variant="ghost" onClick={()=>{setTagItemId(item.id);setTagDraft(readMediaTags(item.tags).join(", "));setTagError("");}}>Tags</Button>}<Button size="sm" variant="ghost" onClick={() => void update({ ...item, favorite: !item.favorite })}>{item.favorite ? "Unfavorite" : "Favorite"}</Button><Button size="sm" variant="ghost" onClick={() => { setEditingAlbum(item); setAlbumName(item.album); }}>Album</Button><Button size="sm" variant="ghost" onClick={() => { const direct = safeMediaUrl(item); const url = direct ?? URL.createObjectURL(item.file); const link = document.createElement("a"); link.href = url; link.download = item.name; link.click(); if (!direct) setTimeout(() => URL.revokeObjectURL(url), 30000); }}>Download</Button>{item.source !== "server" && <Button size="sm" variant="ghost" onClick={() => setRemoving(item)}>Remove copy</Button>}</div>
        </article>)}</div>}
    </div>
    <Sheet open={duplicateOpen} onClose={()=>{cancelDuplicateScan();setDuplicateBusy(false);setDuplicateResult(null);setDuplicateOpen(false);}} title="Duplicate photos" size="sm">
      <p className="mb-4 text-sm text-ink-3">Compares the currently filtered imported photos using SHA-256 locally. Server files are excluded. Nothing is uploaded or removed. Limits: 500 photos, 32 MiB per file and 256 MiB total. Different encodings or edits are not visual duplicates.</p>
      {duplicateBusy&&<p role="status">Comparing imported photos…</p>}
      {duplicateError&&<p role="alert" className="text-danger">{duplicateError}</p>}
      {duplicateResult&&<div className="space-y-3"><p className="text-sm">Compared {duplicateResult.scanned} imported photos. Skipped {duplicateResult.skipped} files larger than 32 MiB.</p>{duplicateResult.groups.length===0?<p>No matching file hashes in this scan.</p>:<><p>{duplicateResult.groups.length} matching groups</p>{duplicateResult.groups.map(group=><article key={group[0].id} className="space-y-2 rounded-xl bg-s2 p-3 hairline"><p className="text-sm font-semibold">{group.length} copies with matching SHA-256</p><ul className="space-y-1 text-sm text-ink-3">{group.map(item=><li className="break-words" key={item.id}>{item.name}</li>)}</ul></article>)}</>}</div>}
    </Sheet>
    <Sheet open={!!taggedItem} onClose={()=>{if(!tagBusy)setTagItemId(null);}} title="Photo tags" description={taggedItem?.name} size="sm">
      <p className="mb-4 text-sm text-ink-3">Tags stay in this browser, scoped to your account. Server files remain unchanged. Up to 20 tags, 40 characters each. Search matches names, albums and tags.</p>
      <p className="mb-4 break-words text-sm">Saved tags: {readMediaTags(taggedItem?.tags).join(", ")||"None"}</p>
      <form className="space-y-4" onSubmit={async event=>{event.preventDefault();if(!taggedItem||tagSaving.current)return;let tags:string[];try{tags=parseMediaTags(tagDraft);}catch(error){setTagError(error instanceof Error?error.message:"Invalid tags");return;}tagSaving.current=true;setTagBusy(true);setTagError("");try{await update({...taggedItem,tags});}catch(error){setTagError(error instanceof Error?error.message:"Could not save tags");}finally{tagSaving.current=false;setTagBusy(false);}}}>
        <TextField label="Tags (comma-separated)" value={tagDraft} maxLength={1000} disabled={tagBusy} onChange={event=>setTagDraft(event.target.value)} />
        <Button type="submit" block disabled={tagBusy}>{tagBusy?"Saving tags…":"Save tags"}</Button>
        {(tagError||error)&&<p role="alert" className="text-danger">{tagError||error}</p>}
      </form>
    </Sheet>
    <Sheet open={managePlaylist} onClose={() => { setManagePlaylist(false); setDeletePlaylist(false); }} title="Manage playlist" size="sm">
      <form className="space-y-4" onSubmit={event => { event.preventDefault(); if (!playlist) return; try {
        const name = playlistName.trim(); if (!name) throw new Error("Use a playlist name");
        if (playlists.some(row => row.id !== playlist.id && row.kind === kind && row.name.toLowerCase() === name.toLowerCase())) throw new Error("That playlist name already exists");
        const next = playlists.map(row => row.id === playlist.id ? { ...row, name } : row); localStorage.setItem(playlistKey, JSON.stringify(next)); setPlaylists(next); setManagePlaylist(false); setPlaylistError("");
      } catch (error) { setPlaylistError(error instanceof Error ? error.message : "Could not rename playlist"); } }}>
        <TextField label="Playlist name" value={playlistName} onChange={event => setPlaylistName(event.target.value)} maxLength={80} required />
        <Button type="submit" block disabled={!playlistName.trim()}>Rename playlist</Button>
        <Button variant="ghost" block onClick={() => setDeletePlaylist(true)}>Delete playlist</Button>
        {deletePlaylist && <div className="space-y-3 rounded-xl bg-s2 p-4 hairline"><p className="text-sm text-ink-2">Only this playlist is removed. Its files remain in your libraries.</p><Button onClick={() => { try { const next = playlists.filter(row => row.id !== playlistId); localStorage.setItem(playlistKey, JSON.stringify(next)); setPlaylists(next); setPlaylistId(""); setManagePlaylist(false); setDeletePlaylist(false); setPlaylistError(""); } catch { setPlaylistError("Could not remove the playlist"); } }}>Confirm playlist deletion</Button></div>}
        {playlistError && <p role="alert" className="text-danger">{playlistError}</p>}
      </form>
      <div className="mt-5 space-y-3">
        <h3 className="font-semibold">Playlist items · {memberIds.length}/1000</h3>
        <p className="text-xs text-ink-3">Changes are staged until you save. Removing an item here keeps its media file.</p>
        <div className="max-h-64 space-y-2 overflow-y-auto">{memberIds.map((id, index) => <article key={id} className="rounded-xl bg-s2 p-3 hairline"><p className="mb-2 break-words text-sm">{index + 1}. {all.find(item => item.id === id)?.name ?? "Unavailable library item"}</p><div className="flex flex-wrap gap-2"><Button size="sm" variant="ghost" aria-label={`Move item ${index + 1} up`} disabled={index === 0} onClick={() => setMemberIds(ids => movePlaylistItem(ids, index, -1))}>Up</Button><Button size="sm" variant="ghost" aria-label={`Move item ${index + 1} down`} disabled={index === memberIds.length - 1} onClick={() => setMemberIds(ids => movePlaylistItem(ids, index, 1))}>Down</Button><Button size="sm" variant="ghost" aria-label={`Remove item ${index + 1} from playlist`} onClick={() => setMemberIds(ids => ids.filter(value => value !== id))}>Remove</Button></div></article>)}</div>
        <SearchField value={memberQuery} onChange={setMemberQuery} placeholder="Find media to add" />
        <div className="max-h-48 space-y-2 overflow-y-auto">{all.filter(item => !memberIds.includes(item.id) && item.name.toLowerCase().includes(memberQuery.toLowerCase())).slice(0, 100).map(item => <div key={item.id} className="flex items-center gap-3 rounded-xl bg-s2 p-3"><p className="min-w-0 flex-1 break-words text-sm">{item.name}</p><Button size="sm" disabled={memberIds.length >= 1000} aria-label={`Add ${item.name} to playlist`} onClick={() => setMemberIds(ids => [...ids, item.id])}>Add</Button></div>)}</div>
        <p className="text-xs text-ink-3">Shows up to 100 matching available items. Search to narrow results.</p>
        <Button block onClick={() => { try { const next = replacePlaylistItems(playlists, playlistId, memberIds); localStorage.setItem(playlistKey, JSON.stringify(next)); setPlaylists(next); setManagePlaylist(false); setPlaylistError(""); } catch (error) { setPlaylistError(error instanceof Error ? error.message : "Could not update playlist"); } }}>Save playlist items</Button>
      </div>
    </Sheet>
    <Sheet open={playlistSheet} onClose={() => setPlaylistSheet(false)} title="Save media playlist" description={`${list.length} items from your current results. No files are copied.`} size="sm">
      <form className="space-y-4" onSubmit={event => { event.preventDefault(); try { const next = addPlaylist(playlists, playlistName, kind, list.map(item => item.id)); localStorage.setItem(playlistKey, JSON.stringify(next)); setPlaylists(next); setPlaylistName(""); setPlaylistSheet(false); setPlaylistError(""); } catch (error) { setPlaylistError(error instanceof Error ? error.message : "Could not save playlist"); } }}>
        <TextField label="Playlist name" value={playlistName} onChange={event => setPlaylistName(event.target.value)} maxLength={80} required />
        <Button type="submit" block disabled={!playlistName.trim() || !list.length}>Save playlist</Button>
        {playlistError && <p role="alert" className="text-danger">{playlistError}</p>}
      </form>
    </Sheet>
    <Sheet open={!!editingAlbum} onClose={() => setEditingAlbum(null)} title="Move to album" description={editingAlbum?.name} size="sm">
      <form className="space-y-4" onSubmit={event => { event.preventDefault(); if (editingAlbum && albumName.trim()) { void update({ ...editingAlbum, album: albumName.trim() }); setEditingAlbum(null); } }}>
        <TextField label="Album name" value={albumName} onChange={event => setAlbumName(event.target.value)} maxLength={80} required />
        <Button type="submit" block disabled={!albumName.trim()}>Save album</Button>
      </form>
    </Sheet>
    <Sheet open={!!removing} onClose={() => setRemoving(null)} title="Remove browser copy?" description={removing?.name} size="sm">
      <p className="mb-5 text-sm text-ink-2">This removes the imported copy from this browser. Your original file is unaffected.</p>
      <div className="flex gap-3"><Button variant="ghost" onClick={() => setRemoving(null)}>Cancel</Button><Button onClick={() => { if (removing) void remove(removing.id); setRemoving(null); }}>Remove browser copy</Button></div>
    </Sheet>
  </Screen>;
}
