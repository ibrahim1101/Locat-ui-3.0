import type {LocalMediaItem} from './localMediaStore';
export const PHOTO_SCAN_LIMIT=500,PHOTO_SCAN_FILE_BYTES=32*1024*1024,PHOTO_SCAN_TOTAL_BYTES=256*1024*1024;
export type PhotoDuplicateResult={groups:LocalMediaItem[][];scanned:number;skipped:number};
/** Hash only browser-local files; never fetch server media or mutate the library. */
export async function findPhotoDuplicates(items:LocalMediaItem[],signal:AbortSignal):Promise<PhotoDuplicateResult>{
 const check=()=>{if(signal.aborted)throw new DOMException('Photo scan cancelled','AbortError');};check();
 const local=items.filter(item=>item.kind==='photo'&&item.source!=='server');
 if(local.length>PHOTO_SCAN_LIMIT)throw new Error('Narrow your filters to at most 500 imported photos.');
 const candidates=local.filter(item=>item.file.size<=PHOTO_SCAN_FILE_BYTES);
 if(candidates.reduce((sum,item)=>sum+item.file.size,0)>PHOTO_SCAN_TOTAL_BYTES)throw new Error('Narrow your filters to at most 256 MiB of imported photos.');
 if(!globalThis.crypto?.subtle)throw new Error('Photo comparison requires Web Crypto in a secure browser context.');
 const hashes=new Map<string,LocalMediaItem[]>();
 for(const item of candidates){check();const bytes=await item.file.arrayBuffer();check();const digest=await crypto.subtle.digest('SHA-256',bytes);check();const key=Array.from(new Uint8Array(digest),byte=>byte.toString(16).padStart(2,'0')).join('');const group=hashes.get(key)??[];group.push(item);hashes.set(key,group);}
 return {groups:[...hashes.values()].filter(group=>group.length>1),scanned:candidates.length,skipped:local.length-candidates.length};
}
