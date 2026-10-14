import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { beforeEach, expect, it, vi } from "vitest";
import { LiveMediaLibrary } from "./LiveMediaLibrary";
const { state } = vi.hoisted(() => ({ state: { items: [] as unknown[], loading: false, error: "", importFiles: vi.fn(), update: vi.fn(), remove: vi.fn() } }));
vi.mock("./liveMedia", () => ({ useLiveMedia: () => state }));
beforeEach(() => { state.items = []; state.error = ""; vi.clearAllMocks(); });
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
