/** @vitest-environment node */
import {describe,expect,it} from 'vitest';
import {decryptShare,encryptShare} from './shareCrypto';

describe('encrypted Share links',()=>{
 it('round-trips locally and keeps the key URL-safe for a fragment',async()=>{
  const secretText='A private one-time note.';const encrypted=await encryptShare(secretText);
  expect(encrypted.secret).toMatch(/^[A-Za-z0-9_-]{43}$/);expect(encrypted.ciphertext).not.toContain(secretText);
  await expect(decryptShare(encrypted.iv,encrypted.ciphertext,encrypted.secret)).resolves.toBe(secretText);
 });
 it('rejects a wrong key, modified ciphertext and oversize plaintext',async()=>{
  const encrypted=await encryptShare('Check the release gate.');
  const wrong=encrypted.secret.slice(0,-1)+(encrypted.secret.endsWith('A')?'B':'A');
  await expect(decryptShare(encrypted.iv,encrypted.ciphertext,wrong)).rejects.toThrow();
  const tampered=encrypted.ciphertext.slice(0,-4)+'AAAA';
  await expect(decryptShare(encrypted.iv,tampered,encrypted.secret)).rejects.toThrow();
  await expect(encryptShare('x'.repeat(1_500_001))).rejects.toThrow('1.5 MB');
 });
});
