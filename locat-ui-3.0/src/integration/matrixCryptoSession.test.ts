import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {openMatrixCryptoSession} from './matrixCryptoSession';
const {create,init,stop,crypto}=vi.hoisted(()=>({create:vi.fn(),init:vi.fn(),stop:vi.fn(),crypto:{globalBlacklistUnverifiedDevices:false,getOwnDeviceKeys:vi.fn(async()=>({ed25519:'synthetic-public-signing',curve25519:'synthetic-public-identity'}))}}));
vi.mock('matrix-js-sdk',()=>({createClient:create}));
const binding={accountId:'a'.repeat(32),userId:'@alice:locat.test',deviceId:'DEVICE',accessToken:'synthetic-test-token'};
beforeEach(()=>{vi.clearAllMocks();init.mockResolvedValue(undefined);create.mockReturnValue({initRustCrypto:init,getCrypto:()=>crypto,stopClient:stop});vi.stubGlobal('isSecureContext',true);vi.stubGlobal('indexedDB',{});});
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
