import {webcrypto} from 'node:crypto';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {deviceTransferFingerprintKey,generateDeviceIdentity} from './linkCrypto';
import {fingerprintLinkFile} from './linkFileFingerprint';

beforeEach(()=>vi.stubGlobal('crypto',webcrypto));afterEach(()=>vi.unstubAllGlobals());

it('detects changes in any file chunk without exposing an unkeyed content hash',async()=>{
 const a=await generateDeviceIdentity(),b=await generateDeviceIdentity(),key=await deviceTransferFingerprintKey(a.privateKey,b.publicKeyB64,'owner','pair');
 const bytes=new Uint8Array(256*1024+7);bytes.forEach((_,index)=>{bytes[index]=index%251;});const changed=bytes.slice();changed[256*1024+3]^=1;
 const original=await fingerprintLinkFile(new Blob([bytes]),key),different=await fingerprintLinkFile(new Blob([changed]),key);
 expect(original).not.toBe(different);expect(original).toMatch(/^[A-Za-z0-9+/]{43}=$/);expect(original).not.toBe(Buffer.from(await crypto.subtle.digest('SHA-256',bytes)).toString('base64'));
});

it('fingerprints empty files consistently',async()=>{
 const a=await generateDeviceIdentity(),b=await generateDeviceIdentity(),key=await deviceTransferFingerprintKey(a.privateKey,b.publicKeyB64,'owner','pair'),empty=new Blob([]);
 expect(await fingerprintLinkFile(empty,key)).toBe(await fingerprintLinkFile(empty,key));
});
