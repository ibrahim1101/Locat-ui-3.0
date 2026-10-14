import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useSession } from "../app/session";
import { LiveMediaContext } from "./liveMedia";
import { mediaKind, readMedia, writeMedia, type LocalMediaItem } from "./localMediaStore";
import { mergeMedia, safeMediaUrl } from "./mediaSource";
type ServerSnapshot = { items: LocalMediaItem[]; libraries: { name: string; count: number; available: boolean }[] };
async function fetchServer(): Promise<ServerSnapshot> {
  const response = await fetch("/api/media", { credentials: "same-origin", cache: "no-store" });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? "Server library unavailable");
  const items = (data.items as Omit<LocalMediaItem, "file">[]).filter(item => safeMediaUrl(item)).map(item => ({ ...item, file: new Blob() }));
  return { items, libraries: data.libraries };
}
export function LiveMediaProvider({ children }: { children: ReactNode }) {
  const { user, connection } = useSession();
  const account = user?.id ?? (connection.mode === "local-only" ? "local-device" : "signed-out");
  const [local, setLocal] = useState<LocalMediaItem[]>([]);
  const [server, setServer] = useState<ServerSnapshot>({ items: [], libraries: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [serverError, setServerError] = useState("");
  const items = useMemo(() => mergeMedia(local, server.items), [local, server]);
  const authenticated = !!user;
  useEffect(() => {
    let active = true;
    const device = readMedia(account).then(rows => { if (active) setLocal(rows); }).catch(error => { if (active) setError(error.message); });
    const remote = authenticated ? fetchServer().then(snapshot => { if (active) setServer(snapshot); }).catch(error => { if (active) setServerError(error.message); }) : Promise.resolve();
    void Promise.all([device, remote]).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [account, authenticated]);
  async function run(operation: () => Promise<void>) {
    setError("");
    try { await operation(); } catch (error) { setError(error instanceof Error ? error.message : "Media operation failed"); }
  }
  return <LiveMediaContext.Provider value={{ items, loading, error, serverError, serverLibraries: server.libraries,
    refreshServer: async () => { if (!authenticated) { setServerError("Sign in to read server media"); return; } try { setServer(await fetchServer()); setServerError(""); } catch (error) { setServerError(error instanceof Error ? error.message : "Server library unavailable"); } },
    importFiles: files => run(async () => {
      const additions: LocalMediaItem[] = [];
      for (const file of Array.from(files)) {
        const kind = mediaKind(file);
        if (!kind) throw new Error(`Unsupported media file: ${file.name}`);
        additions.push({ id: crypto.randomUUID(), kind, name: file.name, file, size: file.size, addedAt: Date.now(), album: "Imported", favorite: false, position: 0, source: "device" });
      }
      await writeMedia(account, additions); setLocal(old => [...old, ...additions]);
    }),
    update: item => run(async () => {
      const saved = item.source === "server" ? { ...item, file: new Blob() } : item;
      await writeMedia(account, [saved]); setLocal(old => [...old.filter(row => row.id !== item.id), saved]);
    }),
    remove: id => run(async () => { if (id.startsWith("server:")) throw new Error("Server files are read-only"); await writeMedia(account, [], id); setLocal(old => old.filter(row => row.id !== id)); }),
  }}>{children}</LiveMediaContext.Provider>;
}
