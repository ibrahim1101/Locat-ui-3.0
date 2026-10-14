import {webcrypto} from 'node:crypto';import {afterEach,beforeEach,expect,it,vi} from 'vitest';import {generateDeviceIdentity,deviceSharedKey} from './linkCrypto';import {encryptLinkPayload,decryptLinkPayload,type LinkPayload,LINK_CHUNK_SIZE} from './linkPayloadCrypto';
beforeEach(()=>vi.stubGlobal('crypto',webcrypto));afterEach(()=>vi.unstubAllGlobals());
it('authenticates file metadata, account/pair/direction, transfer ID and chunk position',async()=>{
 const a=await generateDeviceIdentity(),b=await generateDeviceIdentity();const key=await deviceSharedKey(a.privateKey,b.publicKeyB64,'owner','pair');const peer=await deviceSharedKey(b.privateKey,a.publicKeyB64,'owner','pair');
 const job={id:'transfer',userId:'owner',pairId:'pair',fromDevice:1,toDevice:2,kind:'file',name:'file.bin',mime:'application/octet-stream',size:LINK_CHUNK_SIZE+3,chunkCount:2,status:'uploading',receivedChunks:0,createdAt:1} as LinkPayload;
 const bytes=new Uint8Array([0,255,4]);const sealed=await encryptLinkPayload(key,job,1,bytes);expect(await decryptLinkPayload(peer,job,1,sealed)).toEqual(bytes);
 for(const patch of [{id:'other'},{userId:'other'},{pairId:'other'},{fromDevice:2,toDevice:1},{name:'other.bin'},{mime:'text/plain'}])await expect(decryptLinkPayload(peer,{...job,...patch},1,sealed)).rejects.toThrow();
 await expect(decryptLinkPayload(peer,job,0,sealed)).rejects.toThrow();await expect(encryptLinkPayload(key,job,1,new Uint8Array(2))).rejects.toThrow('length');
});
it('round-trips UTF-8 text and a zero-byte file with fresh random IVs',async()=>{
 const keys=await crypto.subtle.generateKey({name:'AES-GCM',length:256},false,['encrypt','decrypt']);const bytes=new TextEncoder().encode('Hello 🌍');const job={id:'text',userId:'owner',pairId:'pair',fromDevice:1,toDevice:2,kind:'text',name:'Encrypted text',mime:'text/plain',size:bytes.length,chunkCount:1,status:'uploading',receivedChunks:0,createdAt:1} as LinkPayload;
 const sealed=await encryptLinkPayload(keys,job,0,bytes);expect(new TextDecoder().decode(await decryptLinkPayload(keys,job,0,sealed))).toBe('Hello 🌍');expect((await encryptLinkPayload(keys,job,0,bytes)).iv).not.toBe(sealed.iv);
 const empty={...job,kind:'file' as const,size:0};expect(await decryptLinkPayload(keys,empty,0,await encryptLinkPayload(keys,empty,0,new Uint8Array()))).toHaveLength(0);
});
