import type { LocalMediaKind } from "./localMediaStore";
export type MediaPlaylist = { id: string; name: string; kind: LocalMediaKind; itemIds: string[] };
export function parsePlaylists(raw: string | null): MediaPlaylist[] {
  try {
    if (!raw || raw.length > 512000) return [];
    const value: unknown = JSON.parse(raw); if (!Array.isArray(value)) return [];
    const valid: MediaPlaylist[] = [];
    for (const row of value.slice(0, 30)) {
      if (!row || typeof row !== "object") continue;
      const item = row as Partial<MediaPlaylist>;
      if (typeof item.id !== "string" || item.id.length > 80 || !item.id || typeof item.name !== "string" || !item.name.trim() || item.name.length > 80 || !["audio", "video", "photo"].includes(item.kind ?? "") || !Array.isArray(item.itemIds)) continue;
      valid.push({ id: item.id, name: item.name.trim(), kind: item.kind!, itemIds: [...new Set(item.itemIds.filter((id): id is string => typeof id === "string" && id.length > 0 && id.length <= 120))].slice(0, 1000) });
    }
    return [...new Map(valid.map(row => [row.id, row])).values()];
  } catch { return []; }
}
export function addPlaylist(existing: MediaPlaylist[], name: string, kind: LocalMediaKind, itemIds: string[]): MediaPlaylist[] {
  if (!name.trim() || name.trim().length > 80) throw new Error("Use a playlist name of 1–80 characters");
  if (existing.length >= 30) throw new Error("Up to 30 playlists can be stored on this device");
  if (existing.some(row => row.kind === kind && row.name.toLowerCase() === name.trim().toLowerCase())) throw new Error("That playlist name already exists");
  if (!itemIds.length || itemIds.length > 1000) throw new Error("Choose 1–1000 media items for a playlist");
  return [...existing, { id: crypto.randomUUID(), name: name.trim(), kind, itemIds: [...new Set(itemIds)] }];
}
