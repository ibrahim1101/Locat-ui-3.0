import {webcrypto} from 'node:crypto';
import {afterEach,expect,it,vi} from 'vitest';
import {decryptMatrixAttachment,encryptMatrixAttachment,isEncryptedMatrixFile} from './matrixEncryptedAttachment';

afterEach(()=>vi.unstubAllGlobals());

it('encrypts bytes into Matrix v2 AES-CTR media and decrypts only after the ciphertext hash matches',async()=>{
 vi.stubGlobal('crypto',webcrypto);
 const original=new TextEncoder().encode('private attachment bytes'),encrypted=await encryptMatrixAttachment(original);
 const metadata={...encrypted.file,url:'mxc://media.example/opaque-id'};
 expect(metadata).toMatchObject({v:'v2',key:{alg:'A256CTR',kty:'oct',key_ops:['encrypt','decrypt'],ext:true},hashes:{sha256:expect.any(String)}});expect(metadata.key.k).toMatch(/^[A-Za-z0-9_-]+$/);
 expect(isEncryptedMatrixFile(metadata)).toBe(true);
 expect(new TextDecoder().decode(await decryptMatrixAttachment(encrypted.ciphertext,metadata))).toBe('private attachment bytes');
 const corrupt=encrypted.ciphertext.slice();corrupt[0]^=1;
 await expect(decryptMatrixAttachment(corrupt,metadata)).rejects.toThrow('integrity check failed');
});

it('rejects invalid and oversized attachment payloads before encrypting',async()=>{
 vi.stubGlobal('crypto',webcrypto);
 await expect(encryptMatrixAttachment(new Uint8Array())).rejects.toThrow('1 byte up to 2.9 MB');
 await expect(encryptMatrixAttachment(new Uint8Array(2_900_001))).rejects.toThrow('1 byte up to 2.9 MB');
 expect(isEncryptedMatrixFile({url:'https://media.example/file',v:'v2'})).toBe(false);
});
