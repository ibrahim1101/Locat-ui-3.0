import "fake-indexeddb/auto";
import { expect, it } from "vitest";
import { mediaKind, readMedia, writeMedia, type LocalMediaItem } from "./localMediaStore";
it("classifies media without accepting HTML or SVG as gallery images", () => {
  expect(mediaKind({ type: "video/mp4", name: "clip.mp4" })).toBe("video");
  expect(mediaKind({ type: "", name: "song.FLAC" })).toBe("audio");
  expect(mediaKind({ type: "image/png", name: "image.png" })).toBe("photo");
  expect(mediaKind({ type: "image/svg+xml", name: "image.svg" })).toBeNull();
  expect(mediaKind({ type: "text/html", name: "page.html" })).toBeNull();
});
it("persists metadata and isolates account libraries", async () => {
  const account = crypto.randomUUID();
  const item: LocalMediaItem = { id: "one", kind: "audio", file: new Blob(["audio"]), name: "one.mp3", size: 5, album: "Imported", favorite: false, addedAt: 1, position: 0 };
  await writeMedia(account, [item]);
  expect((await readMedia(account))[0].name).toBe("one.mp3");
  expect(await readMedia(account + "other")).toEqual([]);
  await writeMedia(account, [{ ...item, favorite: true, position: 12, album: "Favorites" }]);
  expect((await readMedia(account))[0]).toMatchObject({ favorite: true, position: 12, album: "Favorites" });
  await writeMedia(account, [], item.id);
  expect(await readMedia(account)).toEqual([]);
});
