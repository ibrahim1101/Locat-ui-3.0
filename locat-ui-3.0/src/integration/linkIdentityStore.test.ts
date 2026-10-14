import 'fake-indexeddb/auto';import {webcrypto} from 'node:crypto';import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {loadLinkIdentity,pinLinkPeer,resetLinkIdentity} from './linkIdentityStore';
beforeEach(()=>vi.stubGlobal('crypto',webcrypto));afterEach(()=>vi.unstubAllGlobals());
it('persists nonextractable identities per account and rejects changed peer pins',async()=>{
 const id=crypto.randomUUID();const first=await loadLinkIdentity(id),again=await loadLinkIdentity(id),other=await loadLinkIdentity(id+'-other');expect(first.publicKeyB64).toBe(again.publicKeyB64);expect(first.privateKey.extractable).toBe(false);expect(other.publicKeyB64).not.toBe(first.publicKeyB64);
 await pinLinkPeer(id,'pair','peer-public-key');expect((await loadLinkIdentity(id)).pins.pair).toBe('peer-public-key');await expect(pinLinkPeer(id,'pair','changed-key')).rejects.toThrow();
 await resetLinkIdentity(id);const reset=await loadLinkIdentity(id);expect(reset.publicKeyB64).not.toBe(first.publicKeyB64);expect(reset.pins).toEqual({});
});
it('concurrent first-use tabs share the winning stored identity',async()=>{
 const id=crypto.randomUUID();const [a,b]=await Promise.all([loadLinkIdentity(id),loadLinkIdentity(id)]);expect(a.publicKeyB64).toBe(b.publicKeyB64);
});
