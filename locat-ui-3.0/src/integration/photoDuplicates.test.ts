import {webcrypto} from 'node:crypto';
import {Blob as NodeBlob} from 'node:buffer';
import {afterEach,expect,it,vi} from 'vitest';
import {findPhotoDuplicates,PHOTO_SCAN_FILE_BYTES} from './photoDuplicates';
import type {LocalMediaItem} from './localMediaStore';
afterEach(()=>vi.unstubAllGlobals());
function photo(id:string,bytes:string):LocalMediaItem{return {id,kind:'photo',name:id+'.png',file:new NodeBlob([bytes]) as unknown as Blob,size:bytes.length,addedAt:0,album:'Imported',favorite:false,position:0};}
it('finds matching bytes across filenames without comparing server files or mutating sources',async()=>{
 vi.stubGlobal('crypto',webcrypto);const a=photo('a','identical'),b=photo('b','identical'),c=photo('c','different'),server={...photo('server','identical'),source:'server' as const};
 const result=await findPhotoDuplicates([a,b,c,server],new AbortController().signal);expect(result.groups.map(group=>group.map(item=>item.id))).toEqual([['a','b']]);expect(result.scanned).toBe(3);expect(result.skipped).toBe(0);expect(await a.file.text()).toBe('identical');
});
it('bounds file count and total bytes before reading and reports oversized exclusions',async()=>{
 vi.stubGlobal('crypto',webcrypto);const read=vi.fn();const large={...photo('large',''),file:{size:PHOTO_SCAN_FILE_BYTES+1,arrayBuffer:read} as unknown as Blob};
 expect(await findPhotoDuplicates([large],new AbortController().signal)).toEqual({groups:[],scanned:0,skipped:1});expect(read).not.toHaveBeenCalled();
 await expect(findPhotoDuplicates(Array.from({length:501},(_,i)=>photo(String(i),'')),new AbortController().signal)).rejects.toThrow('500');
 await expect(findPhotoDuplicates(Array.from({length:9},(_,i)=>({...photo(String(i),''),file:{size:PHOTO_SCAN_FILE_BYTES,arrayBuffer:read} as unknown as Blob})),new AbortController().signal)).rejects.toThrow('256 MiB');expect(read).not.toHaveBeenCalled();
});
it('refuses pre-cancelled scans and checks cancellation after an in-flight file read',async()=>{
 vi.stubGlobal('crypto',webcrypto);const control=new AbortController();control.abort();await expect(findPhotoDuplicates([photo('a','a')],control.signal)).rejects.toMatchObject({name:'AbortError'});
 const active=new AbortController(),read=vi.fn(async()=>{active.abort();return new Uint8Array([1]).buffer;});await expect(findPhotoDuplicates([{...photo('b',''),file:{size:1,arrayBuffer:read} as unknown as Blob}],active.signal)).rejects.toMatchObject({name:'AbortError'});expect(read).toHaveBeenCalledOnce();
});
