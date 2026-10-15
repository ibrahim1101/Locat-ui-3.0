import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { beforeEach, expect, it, vi } from "vitest";
import { LiveMediaLibrary } from "./LiveMediaLibrary";
const { state } = vi.hoisted(() => ({ state: { items: [] as unknown[], loading: false, error: "", importFiles: vi.fn(), update: vi.fn(), remove: vi.fn() } }));
vi.mock("../app/session", () => ({ useSession: () => ({ user: { id: "test-media-account" }, connection: { mode: "server" } }) }));
vi.mock("./liveMedia", () => ({ useLiveMedia: () => state }));
vi.mock("./LiveVideoPlayer", () => ({ LiveVideoPlayer: ({ item, onEnded, autoStart }: { item: { name: string }; onEnded(): void; autoStart: boolean }) => <div><p>{item.name} · {autoStart ? "auto" : "manual"}</p><button onClick={onEnded}>Finish video</button></div> }));
beforeEach(() => { state.items = []; state.error = ""; vi.clearAllMocks(); localStorage.clear(); });
it("renders truthful empty live libraries without preview titles", () => {
  render(<MemoryRouter><LiveMediaLibrary kind="video" /></MemoryRouter>);
  expect(screen.getByText("No media here yet")).toBeVisible();
  expect(screen.getByText(/Imported files stay in this browser/)).toBeVisible();
});
it("imports selected files and operates on actual library items", () => {
  state.items = [{ id: "actual", kind: "audio", name: "My recording.mp3", file: new Blob(["audio"]), size: 5, album: "Imported", favorite: false, position: 0, addedAt: 1 }];
  render(<MemoryRouter><LiveMediaLibrary kind="audio" /></MemoryRouter>);
  const file = new File(["audio"], "song.mp3", { type: "audio/mpeg" });
  fireEvent.change(screen.getByLabelText("Import Music files"), { target: { files: [file] } });
  expect(state.importFiles).toHaveBeenCalledWith([file]);
  fireEvent.click(screen.getByRole("button", { name: /^Favorite$/ }));
  expect(state.update).toHaveBeenCalledWith(expect.objectContaining({ id: "actual", favorite: true }));
  fireEvent.change(screen.getByPlaceholderText("Search music"), { target: { value: "does not exist" } });
  expect(screen.getByText("No media here yet")).toBeVisible();
});

it("edits albums through a themed sheet and confirms removal before touching storage", () => {
  state.items = [{ id: "actual", kind: "audio", name: "My recording.mp3", file: new Blob(["audio"]), size: 5, album: "Imported", favorite: false, position: 0, addedAt: 1 }];
  render(<MemoryRouter><LiveMediaLibrary kind="audio" /></MemoryRouter>);
  fireEvent.click(screen.getByRole("button", { name: "Album" }));
  expect(screen.getByRole("dialog", { name: "Move to album" })).toBeVisible();
  fireEvent.change(screen.getByLabelText("Album name"), { target: { value: "Personal" } });
  fireEvent.click(screen.getByRole("button", { name: "Save album" }));
  expect(state.update).toHaveBeenCalledWith(expect.objectContaining({ album: "Personal" }));
  fireEvent.click(screen.getByRole("button", { name: "Remove copy" }));
  expect(state.remove).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Remove browser copy" }));
  expect(state.remove).toHaveBeenCalledWith("actual");
});
it("creates a per-account playlist from actual filtered results", () => {
  state.items = [{ id: "actual", kind: "audio", name: "My recording.mp3", file: new Blob(), size: 5, album: "Imported", favorite: false, position: 0, addedAt: 1 }];
  render(<MemoryRouter><LiveMediaLibrary kind="audio" /></MemoryRouter>);
  fireEvent.click(screen.getByRole("button", { name: "Save results as playlist" }));
  fireEvent.change(screen.getByLabelText("Playlist name"), { target: { value: "My playlist" } });
  fireEvent.click(screen.getByRole("button", { name: "Save playlist" }));
  const saved = JSON.parse(localStorage.getItem("locat-ui3-playlists:test-media-account")!);
  expect(saved[0]).toMatchObject({ name: "My playlist", itemIds: ["actual"] });
  fireEvent.change(screen.getByLabelText("Playlist filter"), { target: { value: saved[0].id } });
  fireEvent.click(screen.getByRole("button", { name: "Manage playlist" }));
  fireEvent.click(screen.getByRole("button", { name: "Delete playlist" }));
  fireEvent.click(screen.getByRole("button", { name: "Confirm playlist deletion" }));
  expect(JSON.parse(localStorage.getItem("locat-ui3-playlists:test-media-account")!)).toEqual([]);
  expect(state.remove).not.toHaveBeenCalled();
});
it("stages playlist order and membership until save without deleting files", () => {
  state.items = ["a", "b", "c"].map((id, index) => ({ id, kind: "audio", name: id + ".mp3", file: new Blob(), size: 5, album: "Imported", favorite: false, position: 0, addedAt: index }));
  const key = "locat-ui3-playlists:test-media-account";
  localStorage.setItem(key, JSON.stringify([{ id: "queue", name: "My queue", kind: "audio", itemIds: ["a", "b"] }]));
  render(<MemoryRouter><LiveMediaLibrary kind="audio" /></MemoryRouter>);
  fireEvent.change(screen.getByLabelText("Playlist filter"), { target: { value: "queue" } });
  fireEvent.click(screen.getByRole("button", { name: "Manage playlist" }));
  fireEvent.click(screen.getByRole("button", { name: "Move item 2 up" }));
  fireEvent.click(screen.getByRole("button", { name: "Remove item 2 from playlist" }));
  fireEvent.click(screen.getByRole("button", { name: "Add c.mp3 to playlist" }));
  expect(JSON.parse(localStorage.getItem(key)!)[0].itemIds).toEqual(["a", "b"]);
  fireEvent.click(screen.getByRole("button", { name: "Save playlist items" }));
  expect(JSON.parse(localStorage.getItem(key)!)[0].itemIds).toEqual(["b", "c"]);
  expect(state.remove).not.toHaveBeenCalled();
});

it("continues an explicitly enabled video playlist and stops at its end", () => {
  state.items = ["a", "b"].map((id, index) => ({ id, kind: "video", name: id + ".mp4", file: new Blob(), size: 5, album: "Imported", favorite: false, position: 0, addedAt: index }));
  localStorage.setItem("locat-ui3-playlists:test-media-account", JSON.stringify([{ id: "series", name: "Series", kind: "video", itemIds: ["a", "b"] }]));
  render(<MemoryRouter><LiveMediaLibrary kind="video" /></MemoryRouter>);
  fireEvent.change(screen.getByLabelText("Playlist filter"), { target: { value: "series" } });
  fireEvent.click(screen.getByRole("switch", { name: "Continue video playlist" }));
  fireEvent.click(screen.getByRole("button", { name: /a.mp4/ }));
  expect(screen.getByText("a.mp4 · manual")).toBeVisible();fireEvent.click(screen.getByRole("button", { name: "Finish video" }));
  expect(screen.getByText("b.mp4 · auto")).toBeVisible();fireEvent.click(screen.getByRole("button", { name: "Finish video" }));
  expect(screen.getByText("b.mp4 · auto")).toBeVisible();
});

it('saves bounded photo tags through the themed sheet and finds existing tags',async()=>{
 state.items=[{id:'tag-photo',kind:'photo',name:'DSC0001.png',file:new Blob(),size:5,album:'Imported',favorite:false,position:0,addedAt:1,tags:['Family']}];vi.spyOn(URL,'createObjectURL').mockReturnValue('blob:test');vi.spyOn(URL,'revokeObjectURL').mockImplementation(()=>{});
 render(<MemoryRouter><LiveMediaLibrary kind="photo"/></MemoryRouter>);fireEvent.change(screen.getByPlaceholderText('Search photos'),{target:{value:'family'}});expect(screen.getByText('DSC0001.png')).toBeVisible();fireEvent.click(screen.getByRole('button',{name:'Tags'}));expect(screen.getByRole('dialog',{name:'Photo tags'})).toBeVisible();fireEvent.change(screen.getByLabelText('Tags (comma-separated)'),{target:{value:' Family, Travel, family '}});fireEvent.click(screen.getByRole('button',{name:'Save tags'}));expect(state.update).toHaveBeenCalledWith(expect.objectContaining({id:'tag-photo',tags:['Family','Travel']}));await waitFor(()=>expect(screen.getByRole('button',{name:'Save tags'})).toBeEnabled());state.update.mockRejectedValueOnce(new Error('Storage full'));fireEvent.click(screen.getByRole('button',{name:'Save tags'}));await screen.findByText('Storage full');expect(screen.getByRole('dialog',{name:'Photo tags'})).toBeVisible();
});

it('groups filtered imported photos by date without using server modification times or reordering a saved playlist',()=>{
 const earlier=new Date(2026,9,14,12).getTime(),later=new Date(2026,9,15,12).getTime();
 state.items=[{id:'older',kind:'photo',name:'Older.png',file:new Blob(),size:0,album:'Imported',favorite:false,position:0,addedAt:earlier,tags:['Family']},{id:'newer',kind:'photo',name:'Newer.png',file:new Blob(),size:0,album:'Imported',favorite:false,position:0,addedAt:later,tags:['Family']},{id:'server:one',kind:'photo',name:'Server.png',file:new Blob(),size:0,album:'Server',favorite:false,position:0,addedAt:later,source:'server'}];
 const key='locat-ui3-playlists:test-media-account',saved=[{id:'photo-order',name:'Photo order',kind:'photo',itemIds:['older','newer']}];localStorage.setItem(key,JSON.stringify(saved));vi.spyOn(URL,'createObjectURL').mockReturnValue('blob:test');vi.spyOn(URL,'revokeObjectURL').mockImplementation(()=>{});
 render(<MemoryRouter><LiveMediaLibrary kind="photo"/></MemoryRouter>);fireEvent.change(screen.getByLabelText('Photo library view'),{target:{value:'timeline'}});expect(screen.queryByText('Server.png')).toBeNull();fireEvent.change(screen.getByLabelText('Playlist filter'),{target:{value:'photo-order'}});
 const names=()=>screen.getAllByRole('button',{name:/Newer.png|Older.png/}).map(button=>button.textContent);expect(names()[0]).toContain('Newer.png');expect(screen.getAllByRole('heading',{level:2})).toHaveLength(2);expect(screen.queryByText('Server.png')).toBeNull();expect(screen.getByLabelText('Sort media')).toBeDisabled();
 fireEvent.change(screen.getByPlaceholderText('Search photos'),{target:{value:'family'}});expect(names()).toHaveLength(2);expect(JSON.parse(localStorage.getItem(key)!)).toEqual(saved);fireEvent.change(screen.getByLabelText('Photo library view'),{target:{value:'grid'}});expect(names()[0]).toContain('Older.png');
 fireEvent.change(screen.getByLabelText('Photo library view'),{target:{value:'timeline'}});fireEvent.change(screen.getByLabelText('Media source'),{target:{value:'server'}});expect(screen.getByText('No imported photos match')).toBeVisible();
});
