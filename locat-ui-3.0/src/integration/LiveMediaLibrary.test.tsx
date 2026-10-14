import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { beforeEach, expect, it, vi } from "vitest";
import { LiveMediaLibrary } from "./LiveMediaLibrary";
const { state } = vi.hoisted(() => ({ state: { items: [] as unknown[], loading: false, error: "", importFiles: vi.fn(), update: vi.fn(), remove: vi.fn() } }));
vi.mock("../app/session", () => ({ useSession: () => ({ user: { id: "test-media-account" }, connection: { mode: "server" } }) }));
vi.mock("./liveMedia", () => ({ useLiveMedia: () => state }));
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
