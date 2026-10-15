import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {linkRequest} from './linkRequest';
beforeEach(()=>vi.useFakeTimers());
afterEach(()=>{vi.useRealTimers();vi.unstubAllGlobals();});
function stalledFetch(){const fetch=vi.fn((_path:string,options:RequestInit)=>new Promise<Response>((_resolve,reject)=>options.signal?.addEventListener('abort',()=>reject(new DOMException('aborted','AbortError')),{once:true})));vi.stubGlobal('fetch',fetch);return fetch;}
it('bounds reads and uncertain writes without retrying',async()=>{
 const fetch=stalledFetch();const read=expect(linkRequest('devices')).rejects.toThrow('Refresh when the server is reachable');await vi.advanceTimersByTimeAsync(15000);await read;
 const write=expect(linkRequest('pair',{peer:2},'proof')).rejects.toThrow('The action may have completed');await vi.advanceTimersByTimeAsync(15000);await write;expect(fetch).toHaveBeenCalledTimes(2);expect(vi.getTimerCount()).toBe(0);
});
it('cancels in flight and excludes already cancelled work',async()=>{
 const fetch=stalledFetch(),control=new AbortController();const pending=expect(linkRequest('devices',undefined,'proof',control.signal)).rejects.toMatchObject({name:'AbortError'});control.abort();await pending;await expect(linkRequest('pair',{peer:2},'proof',control.signal)).rejects.toMatchObject({name:'AbortError'});expect(fetch).toHaveBeenCalledTimes(1);expect(vi.getTimerCount()).toBe(0);
});
it('covers body decoding and retains cookie, proof and exact JSON behavior',async()=>{
 vi.stubGlobal('fetch',vi.fn(async(_path:string,options:RequestInit)=>({ok:true,json:()=>new Promise((_resolve,reject)=>options.signal?.addEventListener('abort',()=>reject(new DOMException('aborted','AbortError')),{once:true}))})));
 const pending=expect(linkRequest('devices')).rejects.toThrow('timed out');await vi.advanceTimersByTimeAsync(15000);await pending;
 const fetch=vi.fn(async()=>({ok:true,json:async()=>({ok:true})}));vi.stubGlobal('fetch',fetch);await expect(linkRequest('rename',{name:'Browser'},'proof')).resolves.toEqual({ok:true});expect(fetch).toHaveBeenCalledWith('/api/link/rename',expect.objectContaining({credentials:'same-origin',cache:'no-store',method:'POST',headers:{'Content-Type':'application/json','X-Locat-Device-Proof':'proof'},body:JSON.stringify({name:'Browser'})}));expect(vi.getTimerCount()).toBe(0);
});
