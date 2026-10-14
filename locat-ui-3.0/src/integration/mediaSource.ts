import type { LocalMediaItem } from "./localMediaStore";
/** Server media may only point to the application's authenticated streaming route. */
export function safeMediaUrl(item: Pick<LocalMediaItem, "streamUrl">): string | null {
  return item.streamUrl && /^\/api\/media\/stream\/[a-f0-9]{64}$/.test(item.streamUrl) ? item.streamUrl : null;
}
export function mergeMedia(local: LocalMediaItem[], server: LocalMediaItem[]): LocalMediaItem[] {
  const metadata = new Map(local.filter(item => item.source === "server").map(item => [item.id, item]));
  return [...local.filter(item => item.source !== "server"), ...server.map(item => {
    const saved = metadata.get(item.id);
    return saved ? { ...item, favorite: saved.favorite, position: saved.position, album: saved.album } : item;
  })];
}
