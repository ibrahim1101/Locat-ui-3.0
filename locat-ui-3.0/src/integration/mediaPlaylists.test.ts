import { expect, it } from "vitest";
import { addPlaylist, movePlaylistItem, parsePlaylists, replacePlaylistItems } from "./mediaPlaylists";
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

it("edits membership without mutating old collections and bounds reordering", () => {
  const rows = addPlaylist([], "Queue", "audio", ["a", "b"]);
  expect(movePlaylistItem(rows[0].itemIds, 1, -1)).toEqual(["b", "a"]);
  expect(movePlaylistItem(rows[0].itemIds, 0, -1)).toEqual(["a", "b"]);
  const next = replacePlaylistItems(rows, rows[0].id, ["c", "a", "c"]);
  expect(next[0].itemIds).toEqual(["c", "a"]); expect(rows[0].itemIds).toEqual(["a", "b"]);
  expect(replacePlaylistItems(rows, rows[0].id, [])[0].itemIds).toEqual([]);
  expect(() => replacePlaylistItems(rows, "missing", [])).toThrow("unavailable");
  expect(() => replacePlaylistItems(rows, rows[0].id, Array(1001).fill("a"))).toThrow("1000");
});
