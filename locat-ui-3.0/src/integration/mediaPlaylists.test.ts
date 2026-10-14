import { expect, it } from "vitest";
import { addPlaylist, parsePlaylists } from "./mediaPlaylists";
it("bounds corrupt playlists and deduplicates item references", () => {
  expect(parsePlaylists("broken")).toEqual([]);
  expect(parsePlaylists(JSON.stringify([{ id: "one", name: "Music", kind: "audio", itemIds: ["a", "a", null, 2] }]))[0].itemIds).toEqual(["a"]);
  expect(parsePlaylists(JSON.stringify([{ id: "one", name: "Music", kind: "unknown", itemIds: ["a"] }]))).toEqual([]);
});
it("preserves queue order and rejects empty, duplicate and excessive collections", () => {
  const rows = addPlaylist([], "My queue", "audio", ["b", "a", "b"]);
  expect(rows[0].itemIds).toEqual(["b", "a"]);
  expect(() => addPlaylist(rows, "my queue", "audio", ["c"])).toThrow("already exists");
  expect(() => addPlaylist([], "Empty", "audio", [])).toThrow("1–1000");
  expect(() => addPlaylist(Array(30).fill(rows[0]), "Another", "audio", ["a"])).toThrow("30");
});
