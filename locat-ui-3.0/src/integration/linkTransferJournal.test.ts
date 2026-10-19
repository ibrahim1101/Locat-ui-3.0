import 'fake-indexeddb/auto';
import {webcrypto} from 'node:crypto';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {decryptLinkPayload,encryptLinkPayload,type LinkPayload} from './linkPayloadCrypto';
import {clearLinkTransferJournal,createLinkTransferJournal,deleteLinkTransferJournal,ensureUploadedLinkChunksAreJournaled,loadLinkTransferJournal,saveLinkTransferChunk} from './linkTransferJournal';

beforeEach(()=>vi.stubGlobal('crypto',webcrypto));
afterEach(()=>vi.unstubAllGlobals());

it('persists only encrypted envelopes and resumes with byte-identical ciphertext per account',async()=>{
 const accountId=crypto.randomUUID(),payload:LinkPayload={id:crypto.randomUUID(),userId:accountId,pairId:'pair-a',fromDevice:1,toDevice:2,kind:'file',name:'sample.txt',mime:'text/plain',size:20,chunkCount:1,status:'uploading',receivedChunks:0,createdAt:Date.now()};
 const key=await crypto.subtle.generateKey({name:'AES-GCM',length:256},false,['encrypt','decrypt']),plain=new TextEncoder().encode('secret file contents'),envelope=await encryptLinkPayload(key,payload,0,plain);
 await createLinkTransferJournal(accountId,{payloadId:payload.id,pairId:payload.pairId,peer:payload.toDevice,name:payload.name,mime:payload.mime,size:payload.size,chunkCount:payload.chunkCount});
 await saveLinkTransferChunk(accountId,payload.id,0,envelope);
 const restored=await loadLinkTransferJournal(accountId,payload.id);
 expect(restored?.chunks).toHaveLength(1);expect(restored?.chunks[0].envelope).toEqual(envelope);expect(JSON.stringify(restored)).not.toContain('secret file contents');
 expect(new TextDecoder().decode(await decryptLinkPayload(key,payload,0,restored!.chunks[0].envelope))).toBe('secret file contents');
 await expect(saveLinkTransferChunk(accountId,payload.id,0,await encryptLinkPayload(key,payload,0,plain))).rejects.toThrow();
 expect(await loadLinkTransferJournal(accountId+'-other',payload.id)).toBeUndefined();
 await deleteLinkTransferJournal(accountId,payload.id);expect(await loadLinkTransferJournal(accountId,payload.id)).toBeUndefined();
});

it('refuses a different transfer definition for an existing journal and clears journals on reset',async()=>{
 const accountId=crypto.randomUUID(),meta={payloadId:crypto.randomUUID(),pairId:'pair-b',peer:3,name:'archive.bin',mime:'application/octet-stream',size:0,chunkCount:1};
 await createLinkTransferJournal(accountId,meta);await expect(createLinkTransferJournal(accountId,{...meta,size:1})).rejects.toThrow();
 await clearLinkTransferJournal(accountId);expect(await loadLinkTransferJournal(accountId,meta.payloadId)).toBeUndefined();
});

it('fails clearly when the local journal no longer covers ciphertext already accepted by the server',()=>{
 expect(()=>ensureUploadedLinkChunksAreJournaled([],1)).toThrow('Some saved encrypted chunks are missing');
 expect(()=>ensureUploadedLinkChunksAreJournaled([{seq:0},{seq:1}],2)).not.toThrow();
 expect(()=>ensureUploadedLinkChunksAreJournaled([{seq:0},{seq:2}],2)).toThrow('Some saved encrypted chunks are missing');
});
