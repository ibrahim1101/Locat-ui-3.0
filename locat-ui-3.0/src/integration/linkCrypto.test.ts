import {webcrypto} from 'node:crypto';import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {generateDeviceIdentity,deviceSharedKey,pairingSas} from './linkCrypto';
beforeEach(()=>vi.stubGlobal('crypto',webcrypto));afterEach(()=>vi.unstubAllGlobals());
it('creates nonextractable private keys and reciprocal account/pair-scoped AES keys',async()=>{
 const a=await generateDeviceIdentity(),b=await generateDeviceIdentity();expect(a.privateKey.extractable).toBe(false);await expect(crypto.subtle.exportKey('pkcs8',a.privateKey)).rejects.toThrow();
 const first=await deviceSharedKey(a.privateKey,b.publicKeyB64,'owner','pair'),second=await deviceSharedKey(b.privateKey,a.publicKeyB64,'owner','pair');
 const iv=crypto.getRandomValues(new Uint8Array(12));const bytes=new TextEncoder().encode('payload');const ciphertext=await crypto.subtle.encrypt({name:'AES-GCM',iv},first,bytes);
 expect(new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM',iv},second,ciphertext))).toBe('payload');
 const foreign=await deviceSharedKey(b.privateKey,a.publicKeyB64,'other','pair');await expect(crypto.subtle.decrypt({name:'AES-GCM',iv},foreign,ciphertext)).rejects.toThrow();
 expect(await pairingSas(a.publicKeyB64,b.publicKeyB64,'pair')).toBe(await pairingSas(b.publicKeyB64,a.publicKeyB64,'pair'));expect(await pairingSas(a.publicKeyB64,b.publicKeyB64,'other-pair')).not.toBe(await pairingSas(a.publicKeyB64,b.publicKeyB64,'pair'));
});
