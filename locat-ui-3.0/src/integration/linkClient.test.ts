import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {BrowserLinkClient} from './linkClient';
const {load,solve}=vi.hoisted(()=>({load:vi.fn(),solve:vi.fn()}));
vi.mock('./linkIdentityStore',()=>({loadLinkIdentity:load}));
vi.mock('./linkCrypto',()=>({solveDeviceChallenge:solve,deviceSharedKey:vi.fn()}));
beforeEach(()=>{vi.clearAllMocks();load.mockResolvedValue({publicKeyB64:'synthetic-public',privateKey:{},pins:{}});solve.mockResolvedValue('synthetic-answer');});afterEach(()=>vi.unstubAllGlobals());
function api(){const fetch=vi.fn(async(path:string)=>({ok:true,json:async()=>path.endsWith('/register')?{id:1}:path.endsWith('/challenge')?{id:'challenge'}:path.endsWith('/prove')?{token:'synthetic-proof',deviceId:1,expiresAt:Date.now()+600000}:{ok:true}}));vi.stubGlobal('fetch',fetch);return fetch;}
it('shares concurrent proof setup and attaches the proof to the actual operation',async()=>{
 const fetch=api(),client=new BrowserLinkClient('owner');try{await Promise.all([client.request('devices'),client.request('matrix/status')]);expect(load).toHaveBeenCalledTimes(1);expect(fetch.mock.calls.filter(([path])=>path.endsWith('/register'))).toHaveLength(1);expect(fetch).toHaveBeenCalledWith('/api/link/matrix/status',expect.objectContaining({headers:{'X-Locat-Device-Proof':'synthetic-proof','X-Locat-Account':'owner'},credentials:'same-origin'}));}finally{client.close();}
});
it('aborts an in-flight command and excludes every request after close',async()=>{
 const base=api();let entered!:()=>void;const started=new Promise<void>(resolve=>{entered=resolve;});let pendingSignal:AbortSignal|null|undefined;
 vi.stubGlobal('fetch',vi.fn(async(path:string,options?:RequestInit)=>{if(path.endsWith('/matrix/status')){pendingSignal=options?.signal;entered();return new Promise<Response>((_resolve,reject)=>options?.signal?.addEventListener('abort',()=>reject(new DOMException('aborted','AbortError')),{once:true}));}return base(path);}));
 const client=new BrowserLinkClient('owner'),pending=expect(client.request('matrix/status')).rejects.toMatchObject({name:'AbortError'});await started;client.close();expect(pendingSignal?.aborted).toBe(true);await pending;await expect(client.request('rename',{name:'Late'})).rejects.toThrow('closed');expect(base.mock.calls.some(([path])=>path.endsWith('/rename'))).toBe(false);
});
it('does not register after disposal while local identity loading was pending',async()=>{
 let finish!:(value:unknown)=>void;load.mockImplementation(()=>new Promise(resolve=>{finish=resolve;}));const fetch=api(),client=new BrowserLinkClient('owner'),pending=expect(client.connect()).rejects.toThrow('invalidated');client.close();finish({publicKeyB64:'public',pins:{}});await pending;expect(fetch).not.toHaveBeenCalled();
});
