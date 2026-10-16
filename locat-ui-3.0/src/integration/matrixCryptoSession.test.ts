import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {openMatrixCryptoSession} from './matrixCryptoSession';
const {create,init,stop,crypto,linkRequest,linkClose,decryptHistory}=vi.hoisted(()=>({decryptHistory:vi.fn(),create:vi.fn(),init:vi.fn(),stop:vi.fn(),linkRequest:vi.fn().mockResolvedValue({}),linkClose:vi.fn(),crypto:{importRoomKeysAsJson:vi.fn(),globalBlacklistUnverifiedDevices:false,getOwnDeviceKeys:vi.fn(async()=>({ed25519:'synthetic-public-signing',curve25519:'synthetic-public-identity'}))}}));
vi.mock('./linkClient',()=>({BrowserLinkClient:class{connect=async()=>({token:'synthetic-proof'});renewRejectedProof=async()=>({token:'renewed-proof'});request=linkRequest;close=linkClose;}}));
vi.mock('./matrixHistory',()=>({decryptHistoryFile:decryptHistory,encryptHistoryExport:vi.fn()}));
vi.mock('matrix-js-sdk',()=>({createClient:create,ClientEvent:{Sync:'sync'}}));
const binding={accountId:'a'.repeat(32),userId:'@alice:locat.test',deviceId:'DEVICE',accessToken:'synthetic-test-token'};
beforeEach(()=>{vi.clearAllMocks();linkRequest.mockReset().mockResolvedValue({});init.mockResolvedValue(undefined);create.mockReturnValue({initRustCrypto:init,getCrypto:()=>crypto,stopClient:stop});vi.stubGlobal('isSecureContext',true);vi.stubGlobal('indexedDB',{});});
afterEach(()=>vi.unstubAllGlobals());
it('holds an exclusive lock for a persistent account/device crypto store and releases on close',async()=>{
 let locked=false;const request=vi.fn(async(_name:string,_options:unknown,callback:(lock:object|null)=>Promise<void>)=>{if(locked)return callback(null);locked=true;try{return await callback({});}finally{locked=false;}});vi.stubGlobal('navigator',{locks:{request}});
 const value=await openMatrixCryptoSession(binding);expect(locked).toBe(true);expect(create.mock.calls[0][0].baseUrl).toBe(window.location.origin);expect(init.mock.calls[0][0]).toMatchObject({useIndexedDB:true});expect(init.mock.calls[0][0].cryptoDatabasePrefix).toContain(binding.accountId);expect(crypto.globalBlacklistUnverifiedDevices).toBe(true);
 await expect(openMatrixCryptoSession(binding)).rejects.toThrow('another tab');expect(create).toHaveBeenCalledTimes(1);expect(JSON.stringify(value)).not.toContain(binding.accessToken);await value.close();expect(locked).toBe(false);expect(value.closed).toBe(true);expect(stop).toHaveBeenCalledOnce();
});
it('fails closed without locking support, and releases the lock on initialization failure',async()=>{
 vi.stubGlobal('navigator',{});await expect(openMatrixCryptoSession(binding)).rejects.toThrow('exclusive');expect(create).not.toHaveBeenCalled();
 const release=vi.fn();vi.stubGlobal('navigator',{locks:{request:async(_name:string,_options:unknown,callback:(lock:object)=>Promise<void>)=>{try{return await callback({});}finally{release();}}}});init.mockRejectedValue(new Error('Storage unavailable'));await expect(openMatrixCryptoSession(binding)).rejects.toThrow('Storage unavailable');expect(release).toHaveBeenCalledOnce();expect(stop).toHaveBeenCalledOnce();
});

it('sends SDK requests only through the same-origin proved gateway and binds only public keys and session token',async()=>{
 vi.stubGlobal('navigator',{locks:{request:async(_name:string,_options:unknown,callback:(lock:object)=>Promise<void>)=>callback({})}});
 const fetch=vi.fn().mockResolvedValue(new Response('{}'));vi.stubGlobal('fetch',fetch);const value=await openMatrixCryptoSession(binding);
 const transport=create.mock.calls[0][0].fetchFn as typeof globalThis.fetch;
 await expect(transport('https://other.test/_matrix/client/v3/sync')).rejects.toThrow('same-origin');expect(fetch).not.toHaveBeenCalled();
 await transport(window.location.origin+'/_matrix/client/v3/account/whoami',{headers:{Authorization:'Bearer synthetic-token'}});expect(fetch.mock.calls[0][1].credentials).toBe('same-origin');expect(fetch.mock.calls[0][1].headers.get('X-Locat-Device-Proof')).toBe('synthetic-proof');
 await value.bind();expect(linkRequest).toHaveBeenCalledWith('matrix/bind',{userId:binding.userId,deviceId:binding.deviceId,accessToken:binding.accessToken,publicKeys:value.publicKeys});await value.revoke();expect(linkRequest).toHaveBeenCalledWith('matrix/logout',{accessToken:binding.accessToken});await value.close();expect(linkClose).toHaveBeenCalled();
});

it('checks returning device keys against existing pins before exposing a bindable session',async()=>{
 vi.stubGlobal('navigator',{locks:{request:async(_name:string,_options:unknown,callback:(lock:object)=>Promise<void>)=>callback({})}});
 const expectedPublicKeys={ed25519:'synthetic-public-signing',curve25519:'synthetic-public-identity'};
 const value=await openMatrixCryptoSession({...binding,expectedPublicKeys});await value.close();
 await expect(openMatrixCryptoSession({...binding,expectedPublicKeys:{...expectedPublicKeys,ed25519:'changed-signing-key'}})).rejects.toThrow('Recovery is required');
 expect(stop).toHaveBeenCalledTimes(2);expect(linkRequest).not.toHaveBeenCalled();
});

it('aborts gateway transport on store close while retaining caller cancellation',async()=>{
 vi.stubGlobal('navigator',{locks:{request:async(_name:string,_options:unknown,callback:(lock:object)=>Promise<void>)=>callback({})}});
 const fetch=vi.fn((_path:unknown,options:RequestInit)=>new Promise<Response>((_resolve,reject)=>options.signal?.addEventListener('abort',()=>reject(new DOMException('aborted','AbortError')),{once:true})));vi.stubGlobal('fetch',fetch);
 const value=await openMatrixCryptoSession(binding),transport=create.mock.calls[0][0].fetchFn as typeof globalThis.fetch,caller=new AbortController();
 const first=expect(transport(window.location.origin+'/_matrix/client/v3/sync',{signal:caller.signal})).rejects.toMatchObject({name:'AbortError'});await vi.waitFor(()=>expect(fetch).toHaveBeenCalledTimes(1));caller.abort();await first;expect(value.closed).toBe(false);
 const second=expect(transport(window.location.origin+'/_matrix/client/v3/sync')).rejects.toMatchObject({name:'AbortError'});await vi.waitFor(()=>expect(fetch).toHaveBeenCalledTimes(2));await value.close();await second;expect(fetch.mock.calls[1][1].signal?.aborted).toBe(true);
});

it('holds the crypto store lock until an in-progress history import settles during close',async()=>{
 vi.stubGlobal('navigator',{locks:{request:async(_name:string,_options:unknown,callback:(lock:object)=>Promise<void>)=>callback({})}});
 decryptHistory.mockResolvedValue({json:'[{}]',entries:1});let finish:()=>void=()=>{};crypto.importRoomKeysAsJson.mockImplementation(()=>new Promise<void>(resolve=>{finish=resolve;}));
 const value=await openMatrixCryptoSession(binding);const importing=value.importHistory('synthetic encrypted file','synthetic-passphrase');const rejected=expect(importing).rejects.toThrow('completed locally');await vi.waitFor(()=>expect(crypto.importRoomKeysAsJson).toHaveBeenCalled());const closing=value.close();expect(stop).not.toHaveBeenCalled();finish();await rejected;await closing;expect(stop).toHaveBeenCalledOnce();
});

it('waits for processed fresh room state, rejects stale refreshes and cancels setup on close',async()=>{
 vi.stubGlobal('navigator',{locks:{request:async(_name:string,_options:unknown,callback:(lock:object)=>Promise<void>)=>callback({})}});
 const room={oldState:{paginationToken:null},getLiveTimeline:()=>({getEvents:()=>[]}),getMyMembership:()=> 'join',getMember:()=>({membership:'join'}),currentState:{getStateEvents:()=>({getContent:()=>({algorithm:'m.megolm.v1.aes-sha2'})})}};
 const listeners=new Set<(value:string)=>void>(),on=vi.fn((_event:string,listener:(value:string)=>void)=>listeners.add(listener)),off=vi.fn((_event:string,listener:(value:string)=>void)=>listeners.delete(listener)),emit=()=>{for(const listener of listeners)listener('SYNCING');};
 const start=vi.fn();create.mockReturnValue({initRustCrypto:init,getCrypto:()=>crypto,stopClient:stop,getRoom:()=>room,getSyncState:()=> 'SYNCING',getUserId:()=>binding.userId,joinRoom:vi.fn(async()=>{}),startClient:start,on,off});
 linkRequest.mockImplementation(async(path:string)=>path.startsWith('matrix/peer?')?{accountId:'b'.repeat(32),matrixUserId:'@bob:locat.test',devices:[{deviceId:'BOB'}]}:path==='matrix/conversation'?{roomId:'!room:locat.test'}:{});
 const fetch=vi.fn<(input:RequestInfo|URL,init?:RequestInit)=>Promise<Response>>().mockResolvedValue(new Response('{}'));vi.stubGlobal('fetch',fetch);
 const value=await openMatrixCryptoSession(binding),transport=create.mock.calls[0][0].fetchFn as typeof globalThis.fetch;
 const sync=()=>transport(window.location.origin+'/_matrix/client/v3/sync?since=previous'),query=(index:number)=>new URL(String(fetch.mock.calls[index][0])).searchParams;
 try{
  await value.bind();await sync();expect(query(0).has('locat_conversations')).toBe(false);
  const conversations=value.conversations();let opened=false;const first=conversations.open('b'.repeat(32)).then(()=>{opened=true;});await vi.waitFor(()=>expect(on).toHaveBeenCalledOnce());emit();await Promise.resolve();expect(opened).toBe(false);
  await sync();expect(query(1).get('full_state')).toBe('true');expect(query(1).has('since')).toBe(false);expect(opened).toBe(false);emit();await first;
  let finish:(response:Response)=>void=()=>{};fetch.mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve;}));const old=sync();await vi.waitFor(()=>expect(fetch).toHaveBeenCalledTimes(3));
  opened=false;const second=conversations.open('c'.repeat(32)).then(()=>{opened=true;});await vi.waitFor(()=>expect(on).toHaveBeenCalledTimes(2));expect(fetch.mock.calls[2][1]?.signal?.aborted).toBe(true);finish(new Response('{}'));await old;emit();await Promise.resolve();expect(opened).toBe(false);
  fetch.mockResolvedValueOnce(new Response('{}',{status:503}));await sync();emit();expect(query(3).get('full_state')).toBe('true');expect(opened).toBe(false);
  await sync();expect(query(4).get('full_state')).toBe('true');expect(query(4).get('locat_conversations')).toBe('1');emit();await second;
  await sync();expect(query(5).has('full_state')).toBe(false);expect(query(5).get('since')).toBe('previous');
  const third=conversations.open('b'.repeat(32));await vi.waitFor(()=>expect(on).toHaveBeenCalledTimes(3));await sync();expect(query(6).get('full_state')).toBe('true');emit();await third;
  window.dispatchEvent(new Event('online'));await sync();expect(query(7).get('full_state')).toBe('true');expect(query(7).has('since')).toBe(false);await sync();expect(query(8).get('since')).toBe('previous');expect(start).not.toHaveBeenCalled();
  const interrupted=conversations.open('c'.repeat(32)),rejected=expect(interrupted).rejects.toThrow('closed');await vi.waitFor(()=>expect(on).toHaveBeenCalledTimes(4));await value.close();await rejected;expect(listeners.size).toBe(0);
 }finally{await value.close();}
});

it('renews proof once for denied gateway reads but never replays SDK mutations',async()=>{
 vi.stubGlobal('navigator',{locks:{request:async(_name:string,_options:unknown,callback:(lock:object)=>Promise<void>)=>callback({})}});
 const fetch=vi.fn().mockResolvedValue(new Response('{}',{status:403}));vi.stubGlobal('fetch',fetch);const value=await openMatrixCryptoSession(binding),transport=create.mock.calls[0][0].fetchFn as typeof globalThis.fetch;try{const url=window.location.origin+'/_matrix/client/v3/sync';expect((await transport(url)).status).toBe(403);expect(fetch).toHaveBeenCalledTimes(2);expect(fetch.mock.calls[1][1].headers.get('X-Locat-Device-Proof')).toBe('renewed-proof');await transport(window.location.origin+'/_matrix/client/v3/keys/upload',{method:'POST',body:'{}'});expect(fetch).toHaveBeenCalledTimes(3);await transport(window.location.origin+'/_matrix/client/v3/rooms/room/send/m.room.encrypted/transaction',{method:'PUT',body:'{}'});expect(fetch).toHaveBeenCalledTimes(4);}finally{await value.close();}
});
