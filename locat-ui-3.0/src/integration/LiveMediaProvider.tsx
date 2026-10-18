import {checkMediaImport,mediaStorageError} from "./mediaStoragePolicy";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useSession } from "../app/session";
import { LiveMediaContext } from "./liveMedia";
import { mediaKind, readMedia, writeMedia, type LocalMediaItem } from "./localMediaStore";
import { mergeMedia, safeMediaUrl } from "./mediaSource";
import {accountRequest} from "./accountRequest";
import {createPhotoThumbnail,PHOTO_THUMBNAIL_BATCH_MS} from "./photoThumbnail";
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
  const [server, setServer] = useState<ServerSnapshot|null>(null);
  const [loading, setLoading] = useState(true);
  const [imports,setImports]=useState(0);
  const [serverLoading,setServerLoading]=useState(!!user);
  const hydration=useRef<Promise<void>|null>(null);
  const [error, setError] = useState("");
  const [serverError, setServerError] = useState("");
  const items = useMemo(() => mergeMedia(local, server?.items??[]), [local, server]);
  const authenticated = !!user;
  const serverGeneration=useRef(0),serverRequest=useRef<AbortController|null>(null);
  const loadServer=useCallback(async()=>{
    if(!authenticated)return;
    const generation=++serverGeneration.current;serverRequest.current?.abort();const control=new AbortController();serverRequest.current=control;setServerLoading(true);
    try{const snapshot=await fetchServer(account,control.signal);if(generation===serverGeneration.current&&!control.signal.aborted){setServer(snapshot);setServerError("");}}
    catch(error){if(generation===serverGeneration.current&&!control.signal.aborted)setServerError(error instanceof Error?error.message:"Server library unavailable");}
    finally{if(serverRequest.current===control){serverRequest.current=null;setServerLoading(false);}}
  },[account,authenticated]);
  const disposeServer=useCallback(()=>{serverGeneration.current++;serverRequest.current?.abort();serverRequest.current=null;},[]);
  useEffect(() => {
    let active = true;
    const device = readMedia(account).then(rows => { if (active) setLocal(rows); }).catch(error => { if (active) setError(error instanceof Error?error.message:"Device library unavailable"); });
    hydration.current=device;
    void device.finally(()=>{if(active)setLoading(false);});
    if(authenticated)void Promise.resolve().then(()=>{if(active)return loadServer();});
    return () => { active = false;disposeServer(); };
  }, [account, authenticated,loadServer,disposeServer]);
  async function run(operation: () => Promise<void>) {
    setError("");
    try { await operation(); } catch (error) { setError(mediaStorageError(error).message); }
  }
  return <LiveMediaContext.Provider value={{ items, loading, importing:imports>0, serverLoading, error, serverError, serverLibraries: server?.libraries,
    refreshServer: async()=>{if(!authenticated){setServerError("Sign in to read server media");return;}try{await accountRequest("/api/media/refresh",account,{});await loadServer();}catch(error){setServerError(error instanceof Error?error.message:"Could not refresh server media");}},
    openVideo: async file => {
      setError('');
      if(mediaKind(file)!=='video'){setError('Choose a video file to open without copying.');return;}
      await hydration.current;
      const id=crypto.randomUUID();
      setLocal(old=>[...old,{id,kind:'video',name:file.name,file,size:file.size,addedAt:Date.now(),album:'Open this session',favorite:false,position:0,source:'device',temporary:true}]);
      return id;
    },
    importFiles: files => run(async () => {
      setImports(count=>count+1);
      try{
        await hydration.current;
        await checkMediaImport(Array.from(files));
        let additions:LocalMediaItem[]=[];const started=performance.now();
        for(const file of Array.from(files)){
          const kind=mediaKind(file);if(!kind)throw new Error(`Unsupported media file: ${file.name}`);
          const addedAt=Date.now(),remaining=PHOTO_THUMBNAIL_BATCH_MS-(performance.now()-started);
          const thumbnail=kind==='photo'&&remaining>0?await createPhotoThumbnail(file,remaining):null;
          additions.push({id:crypto.randomUUID(),kind,name:file.name,file,size:file.size,addedAt,album:'Imported',favorite:false,position:0,source:'device',...(thumbnail?{thumbnail}:{})});
        }
        try{await writeMedia(account,additions);}
        catch(error){
          if(!additions.some(item=>item.thumbnail))throw error;
          // The first atomic transaction failed. Retry the same IDs once without the optional cache.
          additions=additions.map(item=>{const original={...item};delete original.thumbnail;return original;});
          await writeMedia(account,additions);
        }
        setLocal(old=>[...old,...additions]);
      }finally{setImports(count=>count-1);}
    }),
    update: item => run(async () => {
      const saved = item.source === "server" ? { ...item, file: new Blob() } : item;
      if(!item.temporary)await writeMedia(account, [saved]); setLocal(old => [...old.filter(row => row.id !== item.id), saved]);
    }),
    remove: id => run(async () => { if (id.startsWith("server:")) throw new Error("Server files are read-only"); if(!local.some(item=>item.id===id&&item.temporary))await writeMedia(account, [], id); setLocal(old => old.filter(row => row.id !== id)); }),
  }}>{children}</LiveMediaContext.Provider>;
}
