import { useEffect, useState, type ReactNode } from "react";
import { useSession } from "../app/session";
import { LiveMediaContext } from "./liveMedia";
import { mediaKind, readMedia, writeMedia, type LocalMediaItem } from "./localMediaStore";
export function LiveMediaProvider({ children }: { children: ReactNode }) {
  const { user } = useSession();
  const account = user?.id ?? "signed-out";
  const [items, setItems] = useState<LocalMediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    void readMedia(account).then(rows => { if (active) setItems(rows); }).catch(error => { if (active) setError(error.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [account]);
  async function run(operation: () => Promise<void>) {
    setError("");
    try { await operation(); } catch (error) { setError(error instanceof Error ? error.message : "Media operation failed"); }
  }
  return <LiveMediaContext.Provider value={{ items, loading, error,
    importFiles: files => run(async () => {
      const additions: LocalMediaItem[] = [];
      for (const file of Array.from(files)) {
        const kind = mediaKind(file);
        if (!kind) throw new Error(`Unsupported media file: ${file.name}`);
        additions.push({ id: crypto.randomUUID(), kind, name: file.name, file, size: file.size, addedAt: Date.now(), album: "Imported", favorite: false, position: 0 });
      }
      await writeMedia(account, additions);
      setItems(old => [...old, ...additions]);
    }),
    update: item => run(async () => { await writeMedia(account, [item]); setItems(old => old.map(row => row.id === item.id ? item : row)); }),
    remove: id => run(async () => { await writeMedia(account, [], id); setItems(old => old.filter(row => row.id !== id)); }),
  }}>{children}</LiveMediaContext.Provider>;
}
