import { safeMediaUrl } from "./mediaSource";
import type { LocalMediaItem } from "./localMediaStore";
export type DeliveryMode = "direct" | "remux" | "transcode";
export type MediaProbe = { container: string; videoCodec: string | null; audioCodec: string | null; durationSeconds: number | null; width: number | null; height: number | null; strategy: "direct" | "remux" | "transcode" | "unsupported"; reason: string; audioTracks: { index: number; codec: string; language: string; title: string }[] };
export function deliveryUrl(item: LocalMediaItem, mode: DeliveryMode, audioIndex: number | null): string | null {
  const direct = safeMediaUrl(item);
  if (!direct) return null;
  if (mode === "direct") return direct;
  if (audioIndex !== null && (!Number.isSafeInteger(audioIndex) || audioIndex < 0 || audioIndex > 999)) throw new Error("Invalid audio track");
  return direct + `?mode=${mode}${audioIndex === null ? "" : `&audio=${audioIndex}`}`;
}
