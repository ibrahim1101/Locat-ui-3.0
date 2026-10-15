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
it('aborts the entire batch when a later item cannot be cloned',async()=>{
 const account=crypto.randomUUID(),valid:LocalMediaItem={id:'valid',kind:'photo',name:'valid.png',file:new Blob(),size:0,addedAt:1,album:'Imported',favorite:false,position:0};
 const existing={...valid,id:'existing',name:'existing.png'};await writeMedia(account,[existing]);
 const invalid={...valid,id:'invalid',uncloneable:()=>{}} as LocalMediaItem;
 await expect(writeMedia(account,[valid,{...existing,name:'changed.png'},invalid])).rejects.toThrow();const rows=await readMedia(account);expect(rows).toHaveLength(1);expect(rows[0]).toMatchObject({id:'existing',name:'existing.png'});
});
