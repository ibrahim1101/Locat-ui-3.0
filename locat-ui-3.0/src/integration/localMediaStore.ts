export type LocalMediaKind = "video" | "audio" | "photo";
export type LocalMediaItem = { id: string; kind: LocalMediaKind; name: string; file: Blob; size: number; addedAt: number; album: string; favorite: boolean; position: number; tags?: string[]; thumbnail?: Blob; source?: "device" | "server"; streamUrl?: string };
export function mediaKind(file: Pick<File, "type" | "name">): LocalMediaKind | null {
  if (file.type.startsWith("video/")) return "video";
  if (file.type.startsWith("audio/")) return "audio";
  if (["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif", "image/bmp"].includes(file.type)) return "photo";
  const extension = file.name.split(".").at(-1)?.toLowerCase();
  if (["mp4", "webm", "mkv", "mov", "m4v", "avi"].includes(extension ?? "")) return "video";
  if (["mp3", "flac", "wav", "ogg", "m4a", "aac", "opus"].includes(extension ?? "")) return "audio";
  if (["jpg", "jpeg", "png", "webp", "gif", "avif", "bmp"].includes(extension ?? "")) return "photo";
  return null;
}
function openStore(accountId: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(`locat-ui3-media:${accountId}`, 1);
    request.onupgradeneeded = () => request.result.createObjectStore("items", { keyPath: "id" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error("Close other Locat tabs to open the media library."));
  });
}
export async function readMedia(accountId: string): Promise<LocalMediaItem[]> {
  const db = await openStore(accountId);
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction("items", "readonly");
      const request = tx.objectStore("items").getAll();
      tx.oncomplete = () => resolve(request.result);
      tx.onabort = () => reject(tx.error);
      tx.onerror = () => reject(tx.error);
    });
  } finally { db.close(); }
}
export async function writeMedia(accountId: string, items: LocalMediaItem[], removeId?: string): Promise<void> {
  const db = await openStore(accountId);
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("items", "readwrite");
      const store = tx.objectStore("items");
      let failure:unknown;
      tx.oncomplete = () => resolve();
      tx.onabort = () => reject(failure ?? tx.error ?? new Error("Media save aborted; browser storage may be full."));
      // Request errors abort by default; wait for that outcome before reporting failure.
      tx.onerror = () => {};
      try {
        items.forEach(item => store.put(item));
        if (removeId) store.delete(removeId);
      } catch(error) {
        failure=error;tx.abort();
      }
    });
  } finally { db.close(); }
}
