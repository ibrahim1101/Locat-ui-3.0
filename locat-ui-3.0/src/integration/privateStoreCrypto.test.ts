import {webcrypto} from 'node:crypto';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {createPrivateStore,unlockPrivateStore,encryptPrivateEntry,decryptPrivateEntry,generatePrivatePassword,encodeBase64,decodeBase64,changePrivatePassphrase} from './privateStoreCrypto';
import {validateConfig,validateEnvelope,validateEntry,validateBackup} from '../../shared/privateStore.mjs';
beforeEach(()=>vi.stubGlobal('crypto',webcrypto));afterEach(()=>vi.unstubAllGlobals());
const scope={userId:'account-a',module:'secrets' as const};const phrase='a separate test passphrase';
it('uses real Web Crypto for encrypted round-trip without extractable keys or plaintext metadata',async()=>{
 const {key,config}=await createPrivateStore(phrase,scope);expect(key.extractable).toBe(false);expect(config.iterations).toBe(600000);
 const entry={kind:'credential' as const,name:'Private title',folder:'',username:'owner',password:'secret-value',url:'',note:'private note',createdAt:1};
 const envelope=await encryptPrivateEntry(key,config,scope,'record-a',entry);
 expect(JSON.stringify({config,envelope})).not.toContain('Private title');expect(JSON.stringify(envelope)).not.toContain('secret-value');
 const unlocked=await unlockPrivateStore(phrase,config,scope);expect(await decryptPrivateEntry(unlocked,config,scope,'record-a',envelope)).toEqual(entry);
 const again=await encryptPrivateEntry(key,config,scope,'record-a',entry);expect(again.iv).not.toBe(envelope.iv);expect(again.data).not.toBe(envelope.data);
 await expect(crypto.subtle.exportKey('raw',key)).rejects.toThrow();
});
it('encrypts and validates standalone secure notes as their own entry type',async()=>{
 const {key,config}=await createPrivateStore(phrase,scope),entry={kind:'note' as const,name:'Recovery steps',folder:'Personal',note:'Keep this private\nsecond line',createdAt:1};
 const envelope=await encryptPrivateEntry(key,config,scope,'note-record',entry);
 expect(JSON.stringify(envelope)).not.toContain(entry.name);expect(JSON.stringify(envelope)).not.toContain(entry.note);
 expect(await decryptPrivateEntry(key,config,scope,'note-record',envelope)).toEqual(entry);
 expect(()=>validateEntry({...entry,username:''})).toThrow();expect(()=>validateEntry({...entry,note:'x'.repeat(16001)})).toThrow();
});
it('rejects wrong passwords, owners, modules, record IDs, stores and modified ciphertext',async()=>{
 const {key,config}=await createPrivateStore(phrase,scope);
 await expect(unlockPrivateStore('a wrong long passphrase',config,scope)).rejects.toThrow();
 await expect(unlockPrivateStore(phrase,config,{...scope,userId:'other'})).rejects.toThrow();
 await expect(unlockPrivateStore(phrase,config,{...scope,module:'vault'})).rejects.toThrow();
 const entry={kind:'credential' as const,name:'Name',folder:'',username:'',password:'',url:'',note:'',createdAt:1};const envelope=await encryptPrivateEntry(key,config,scope,'record-a',entry);
 await expect(decryptPrivateEntry(key,config,scope,'record-b',envelope)).rejects.toThrow();
 const tampered={...envelope,data:(envelope.data.startsWith('A')?'B':'A')+envelope.data.slice(1)};
 await expect(decryptPrivateEntry(key,config,scope,'record-a',tampered)).rejects.toThrow();
 await expect(decryptPrivateEntry(key,{...config,storeId:crypto.randomUUID()},scope,'record-a',envelope)).rejects.toThrow();
},15000);
it('encrypts bounded file data and rejects mismatched decrypted file lengths',async()=>{
 const fileScope={...scope,module:'vault' as const};const {key,config}=await createPrivateStore(phrase,fileScope);const bytes=new Uint8Array([0,255,4]);
 const entry={kind:'file' as const,name:'file.bin',folder:'',mime:'application/octet-stream',bytes:3,data:encodeBase64(bytes),createdAt:1};
 const envelope=await encryptPrivateEntry(key,config,fileScope,'record',entry);expect(await decryptPrivateEntry(key,config,fileScope,'record',envelope)).toEqual(entry);
 const bad=await encryptPrivateEntry(key,config,fileScope,'record',{...entry,bytes:2});await expect(decryptPrivateEntry(key,config,fileScope,'record',bad)).rejects.toThrow('Invalid decrypted entry');
 expect(decodeBase64(entry.data)).toEqual(bytes);await expect(encryptPrivateEntry(key,config,scope,'record',entry)).rejects.toThrow('Wrong private module');
});
it('validates exact schemas, fixed KDF cost, byte bounds and generator input',()=>{
 expect(()=>validateConfig({v:1})).toThrow();expect(()=>validateEnvelope({v:1,iv:'a'.repeat(16),data:'b'.repeat(24),plaintext:'secret'})).toThrow();
 expect(()=>validateEntry({kind:'credential',name:'',createdAt:1})).toThrow();expect(()=>generatePrivatePassword(14)).toThrow();
 const value=generatePrivatePassword(24);expect(value).toHaveLength(24);expect(value).toMatch(/^[A-Za-z0-9!@#$%&*+_=?.-]+$/);
});

it('bounds backup records and refuses a different owner or module before restore',async()=>{
 const {config}=await createPrivateStore(phrase,scope);const value={format:'locat-ui3-private-backup-v1',scope,config,objects:[]};
 expect(validateBackup(value,scope.userId,scope.module)).toBe(value);
 expect(()=>validateBackup(value,'other',scope.module)).toThrow();expect(()=>validateBackup(value,scope.userId,'vault')).toThrow();
 expect(()=>validateBackup({...value,objects:Array(129).fill({})},scope.userId,scope.module)).toThrow();
});

it('changes the wrapping passphrase while retaining the same key and existing encrypted entries',async()=>{
 const {key,config}=await createPrivateStore(phrase,scope),nextPhrase='a different new passphrase';
 const entry={kind:'credential' as const,name:'Retained entry',folder:'',username:'',password:'retained-secret',url:'',note:'',createdAt:1};
 const envelope=await encryptPrivateEntry(key,config,scope,'record-a',entry);
 const next=await changePrivatePassphrase(phrase,nextPhrase,config,scope);
 expect(next.storeId).toBe(config.storeId);expect(next.salt).not.toBe(config.salt);expect(next.wrappedKey.iv).not.toBe(config.wrappedKey.iv);expect(next.wrappedKey.data).not.toBe(config.wrappedKey.data);
 const unlocked=await unlockPrivateStore(nextPhrase,next,scope);
 expect(unlocked.extractable).toBe(false);expect(await decryptPrivateEntry(unlocked,next,scope,'record-a',envelope)).toEqual(entry);
 await expect(unlockPrivateStore(phrase,next,scope)).rejects.toThrow();
 await expect(unlockPrivateStore(nextPhrase,config,scope)).rejects.toThrow();
 // Older backups and already-unlocked clients intentionally retain access.
 const previous=await unlockPrivateStore(phrase,config,scope);
 expect(await decryptPrivateEntry(previous,config,scope,'record-a',envelope)).toEqual(entry);
 const later=await encryptPrivateEntry(key,config,scope,'record-b',entry);
 expect(await decryptPrivateEntry(unlocked,next,scope,'record-b',later)).toEqual(entry);
});
it('refuses passphrase changes with the wrong original passphrase or authenticated scope',async()=>{
 const {config}=await createPrivateStore(phrase,scope),next='a different new passphrase';
 await expect(changePrivatePassphrase('wrong but sufficiently long',next,config,scope)).rejects.toThrow();
 await expect(changePrivatePassphrase(phrase,next,config,{...scope,userId:'other'})).rejects.toThrow();
 await expect(changePrivatePassphrase(phrase,next,config,{...scope,module:'vault'})).rejects.toThrow();
 await expect(changePrivatePassphrase(phrase,phrase,config,scope)).rejects.toThrow('different');
 await expect(changePrivatePassphrase(phrase,'short',config,scope)).rejects.toThrow();
});
