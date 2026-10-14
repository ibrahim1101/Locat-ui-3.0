/**
 * PREVIEW STRESS FIXTURES — deterministic, fictional, generated on demand to
 * exercise virtualization (Preview lab → "Large libraries"). Never imported by
 * production paths; no real data.
 */
import type { MessageView, PhotoView, TrackView, VideoItemView } from "@/contracts";

const WORDS = "signal mix session coast titanium ember studio night stems reel export master tape room quiet glass copper wire north light".split(" ");
const rnd = (seed: number) => { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32); };
const phrase = (r: () => number, n: number) => Array.from({ length: n }, () => WORDS[Math.floor(r() * WORDS.length)]).join(" ");
const now = Date.now();

export function makeMessages(conversationId: string, n: number): MessageView[] {
  const r = rnd(7);
  return Array.from({ length: n }, (_, i) => {
    const mine = r() > 0.5;
    return { id: `${conversationId}-L${i}`, conversationId, authorId: mine ? "u-self" : "u-mira", authorName: mine ? "You" : "Mira", mine,
      text: phrase(r, 2 + Math.floor(r() * (r() > 0.9 ? 60 : 14))), createdAt: now - (n - i) * 90_000, delivery: mine ? "read" : "delivered" };
  });
}
export function makeTracks(n: number): TrackView[] {
  const r = rnd(11);
  return Array.from({ length: n }, (_, i) => { const artist = `Artist ${1 + Math.floor(r() * 400)}`; return {
    id: `LT${i}`, title: phrase(r, 2).replace(/^./, (c) => c.toUpperCase()), artist, album: `Album ${1 + Math.floor(r() * 900)}`, folder: `Music/${artist}`,
    durationSec: 120 + Math.floor(r() * 300), source: r() > 0.5 ? "server" : "device", format: ["FLAC", "MP3", "AAC", "OPUS"][i % 4], sampleRate: 44100, bitDepth: 16, favorite: r() > 0.95, hue: Math.floor(r() * 360) }; });
}
export function makePhotos(n: number): PhotoView[] {
  return Array.from({ length: n }, (_, i) => ({ id: `LP${i}`, name: `IMG_${10000 + i}.jpg`, album: ["Camera", "Screenshots", "Trips", "Studio"][i % 4], width: 4032, height: 3024, sizeBytes: 2_000_000, takenAt: now - i * 3_600_000, mime: "image/jpeg", hue: (i * 37) % 360, supported: true }));
}
export function makeVideos(n: number): VideoItemView[] {
  const r = rnd(5);
  return Array.from({ length: n }, (_, i) => ({ id: `LV${i}`, title: `${phrase(r, 3)} ${i}`, source: r() > 0.5 ? "server" : "device", folder: ["Camera", "Projects", "Family", "Archive"][i % 4], durationSec: 60 + Math.floor(r() * 5400), sizeBytes: 50_000_000 + Math.floor(r() * 4e9), container: "mp4", videoCodec: "h264", width: 1920, height: 1080, posterHue: Math.floor(r() * 360), delivery: "direct" }));
}
export const LARGE = { messages: 5000, tracks: 10000, photos: 20000, videos: 2000 } as const;
