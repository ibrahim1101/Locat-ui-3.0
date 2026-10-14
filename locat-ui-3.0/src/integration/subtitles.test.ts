import { expect, it } from "vitest";
import { readWebVtt } from "./subtitles";
it("accepts WebVTT/BOM headers and rejects HTML, SRT and oversized input", async () => {
  const text = "WEBVTT\n\n00:00.000 --> 00:01.000\nHello\n";
  expect(await readWebVtt({ size: text.length, text: async () => text })).toBe(text);
  expect(await readWebVtt({ size: 9, text: async () => "\uFEFFWEBVTT\n" })).toContain("WEBVTT");
  await expect(readWebVtt({ size: 10, text: async () => "<html></html>" })).rejects.toThrow("WebVTT");
  await expect(readWebVtt({ size: 10, text: async () => "1\n00:00,000 --> 00:01,000" })).rejects.toThrow("WebVTT");
  await expect(readWebVtt({ size: 3 * 1024 * 1024, text: async () => text })).rejects.toThrow("2 MB");
});
