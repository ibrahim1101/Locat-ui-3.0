import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {accountRequest} from './accountRequest';
beforeEach(()=>vi.useFakeTimers());
afterEach(()=>{vi.useRealTimers();vi.unstubAllGlobals();});
function stalledFetch(){
 const fetch=vi.fn((_path:string,options:RequestInit)=>new Promise<Response>((_resolve,reject)=>{
  options.signal?.addEventListener('abort',()=>reject(new DOMException('aborted','AbortError')),{once:true});
 }));vi.stubGlobal('fetch',fetch);return fetch;
}
it('bounds stalled reads and distinguishes uncertain timed-out writes',async()=>{
 const fetch=stalledFetch();
 const read=expect(accountRequest('/api/contacts','owner')).rejects.toThrow('Refresh when the server is reachable');
 await vi.advanceTimersByTimeAsync(15000);await read;
 const write=expect(accountRequest('/api/contacts/request','owner',{userId:'peer'})).rejects.toThrow('The change may have completed');
 await vi.advanceTimersByTimeAsync(15000);await write;
 expect(fetch).toHaveBeenCalledTimes(2);expect(vi.getTimerCount()).toBe(0);
});
it('preserves external cancellation and refuses an already-cancelled request without fetching',async()=>{
 const fetch=stalledFetch(),control=new AbortController();
 const result=expect(accountRequest('/api/contacts','owner',undefined,control.signal)).rejects.toMatchObject({name:'AbortError'});
 control.abort();await result;expect(vi.getTimerCount()).toBe(0);
 await expect(accountRequest('/api/contacts','owner',undefined,control.signal)).rejects.toMatchObject({name:'AbortError'});
 expect(fetch).toHaveBeenCalledTimes(1);
});
it('clears deadlines after success and keeps cookie, no-store and exact JSON write behavior',async()=>{
 const fetch=vi.fn(async()=>({ok:true,json:async()=>({ok:true})}));vi.stubGlobal('fetch',fetch);
 const data={expectedRevision:0,envelope:{opaque:true}};
 expect(await accountRequest('/api/preferences','owner',data)).toEqual({ok:true});
 expect(fetch).toHaveBeenCalledWith('/api/preferences',expect.objectContaining({credentials:'same-origin',cache:'no-store',method:'POST',headers:{'Content-Type':'application/json','X-Locat-Account':'owner'},body:JSON.stringify(data)}));
 expect(vi.getTimerCount()).toBe(0);
});
it('keeps the deadline through response body parsing and clears it after HTTP errors',async()=>{
 vi.stubGlobal('fetch',vi.fn(async(_path:string,options:RequestInit)=>({ok:true,json:()=>new Promise((_resolve,reject)=>options.signal?.addEventListener('abort',()=>reject(new DOMException('aborted','AbortError')),{once:true}))})));
 const result=expect(accountRequest('/api/contacts','owner')).rejects.toThrow('timed out');
 await vi.advanceTimersByTimeAsync(15000);await result;expect(vi.getTimerCount()).toBe(0);
 vi.stubGlobal('fetch',vi.fn(async()=>({ok:false,json:async()=>({error:'Store unavailable'})})));
 await expect(accountRequest('/api/contacts','owner')).rejects.toThrow('Store unavailable');expect(vi.getTimerCount()).toBe(0);
});
