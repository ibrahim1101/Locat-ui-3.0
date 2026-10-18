import { expect, it } from "vitest";
import { deliveryUrl } from "./cinemaDelivery";
import type { LocalMediaItem } from "./localMediaStore";
it("builds only authenticated media delivery URLs and bounded audio indices", () => {
  const item = { streamUrl: "/api/media/stream/" + "a".repeat(64) } as LocalMediaItem;
  expect(deliveryUrl(item, "direct", null)).toBe(item.streamUrl);
  expect(deliveryUrl(item, "remux", 2)).toBe(item.streamUrl + "?mode=remux&audio=2");
  expect(deliveryUrl(item, "transcode", null)).toBe(item.streamUrl + "?mode=transcode");
  expect(deliveryUrl(item, "transcode", 2, 75)).toBe(item.streamUrl + "?mode=transcode&audio=2&start=75");
  expect(deliveryUrl(item, "transcode", null, 86400)).toBe(item.streamUrl + "?mode=transcode&start=86400");
  expect(()=>deliveryUrl(item,"remux",null,2)).toThrow("Remux cannot seek");
  expect(() => deliveryUrl(item, "transcode", null, -1)).toThrow("start position");
  expect(() => deliveryUrl(item, "transcode", null, 86401)).toThrow("start position");
  expect(() => deliveryUrl(item, "transcode", null, 1.5)).toThrow("start position");
  expect(() => deliveryUrl(item, "remux", -1)).toThrow("audio track");
  expect(deliveryUrl({ streamUrl: "https://attacker.test" } as LocalMediaItem, "remux", null)).toBeNull();
});
