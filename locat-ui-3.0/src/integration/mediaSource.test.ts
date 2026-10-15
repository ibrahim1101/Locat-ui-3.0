import { expect, it } from "vitest";
import { mergeMedia, safeMediaUrl } from "./mediaSource";
import type { LocalMediaItem } from "./localMediaStore";
it("allows only same-origin authenticated stream URLs", () => {
  expect(safeMediaUrl({ streamUrl: "/api/media/stream/" + "a".repeat(64) })).toBeTruthy();
  for (const streamUrl of ["https://evil.test/file", "//evil.test/file", "javascript:alert(1)", "/api/media/stream/../secrets", "/api/media/stream/" + "a".repeat(64) + "?ticket=secret"]) expect(safeMediaUrl({ streamUrl })).toBeNull();
});
it("merges per-account favorites and history without trusting stale server addresses", () => {
  const base: LocalMediaItem = { id: "server:one", source: "server", file: new Blob(), name: "video", size: 1, kind: "video", addedAt: 1, album: "Library", favorite: false, position: 0 };
  const local = { ...base, favorite: true, position: 40, album: "My album", tags:["Family"], streamUrl: "https://stale.test/file" };
  const url = "/api/media/stream/" + "b".repeat(64);
  expect(mergeMedia([local], [{ ...base, streamUrl: url }])[0]).toMatchObject({ favorite: true, position: 40, album: "My album", tags:["Family"], streamUrl: url });
  expect(mergeMedia([local], [])).toEqual([]);
});
