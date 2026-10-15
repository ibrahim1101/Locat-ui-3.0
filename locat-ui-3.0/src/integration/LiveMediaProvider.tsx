import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useSession } from "../app/session";
import { LiveMediaContext } from "./liveMedia";
import { mediaKind, readMedia, writeMedia, type LocalMediaItem } from "./localMediaStore";
import { mergeMedia, safeMediaUrl } from "./mediaSource";
import {accountRequest} from "./accountRequest";
type ServerSnapshot = { items: LocalMediaItem[]; libraries: { name: string; count: number; available: boolean }[] };
async function fetchServer(account:string,signal:AbortSignal): Promise<ServerSnapshot> {
  const data = await accountRequest("/api/media",account,undefined,signal);
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
  const serverGeneration=useRef(0),serverRequest=useRef<AbortController|null>(null);
  const loadServer=useCallback(async()=>{
    if(!authenticated)return;
    const generation=++serverGeneration.current;serverRequest.current?.abort();const control=new AbortController();serverRequest.current=control;
    try{const snapshot=await fetchServer(account,control.signal);if(generation===serverGeneration.current&&!control.signal.aborted){setServer(snapshot);setServerError("");}}
    catch(error){if(generation===serverGeneration.current&&!control.signal.aborted)setServerError(error instanceof Error?error.message:"Server library unavailable");}
    finally{if(serverRequest.current===control)serverRequest.current=null;}
  },[account,authenticated]);
  const disposeServer=useCallback(()=>{serverGeneration.current++;serverRequest.current?.abort();serverRequest.current=null;},[]);
  useEffect(() => {
    let active = true;
    const device = readMedia(account).then(rows => { if (active) setLocal(rows); }).catch(error => { if (active) setError(error.message); });
    const remote = authenticated ? Promise.resolve().then(()=>{if(active)return loadServer();}) : Promise.resolve();
    void Promise.all([device, remote]).finally(() => { if (active) setLoading(false); });
    return () => { active = false;disposeServer(); };
  }, [account, authenticated,loadServer,disposeServer]);
  async function run(operation: () => Promise<void>) {
    setError("");
    try { await operation(); } catch (error) { setError(error instanceof Error ? error.message : "Media operation failed"); }
  }
  return <LiveMediaContext.Provider value={{ items, loading, error, serverError, serverLibraries: server.libraries,
    refreshServer: async()=>{if(!authenticated){setServerError("Sign in to read server media");return;}await loadServer();},
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
