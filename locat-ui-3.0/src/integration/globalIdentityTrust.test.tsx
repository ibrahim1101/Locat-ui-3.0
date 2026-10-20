import {createHash,generateKeyPairSync,sign} from 'node:crypto';
import {afterEach,expect,it,vi} from 'vitest';
import {fireEvent,render,screen,waitFor} from '@testing-library/react';
import type {QualifiedAccountIdentity} from '../contracts/auth';
import {compareAuthorityPin,readAuthorityPin,removeAuthorityPin,verifyQualifiedIdentity,writeAuthorityPin} from './globalIdentityTrust';
import {GlobalIdentityTrustDisclosure} from './GlobalIdentityTrustDisclosure';

const origin='https://locat.test',serverId='123e4567-e89b-42d3-a456-426614174000',accountId='a'.repeat(32);
function signedIdentity(){
 const {privateKey,publicKey}=generateKeyPairSync('ed25519'),der=publicKey.export({type:'spki',format:'der'}),encoded=der.toString('base64url'),keyId=createHash('sha256').update(der).digest('base64url');
 const make=(kind:string,claims:unknown[])=>sign(null,Buffer.from(JSON.stringify([kind,...claims])),privateKey).toString('base64url');
 const server={kind:'locat.server.v1' as const,version:1 as const,serverId,origin,keyId,publicKey:encoded,signature:make('locat.server.v1',[1,serverId,origin])};
 const account={kind:'locat.account.v1' as const,version:1 as const,serverId,origin,accountId,lcCode:'1234',keyId,publicKey:encoded,signature:make('locat.account.v1',[1,serverId,origin,accountId,'1234'])};
 const identity:QualifiedAccountIdentity={serverId,authority:'locat.test',address:'LC-1234@locat.test',accountUri:`locat://locat.test/account/${accountId}`,attestation:account};
 return {identity,discovery:{app:'Locat',protocolVersion:1,serverId,origin,identity:server,capabilities:{sameOriginApi:true,privateMessaging:false,federation:false,webSocket:true,authenticatedIdentity:true}}};
}

afterEach(()=>{vi.unstubAllGlobals();localStorage.clear();});

it('verifies canonical authority discovery and account signatures before accepting the identity',async()=>{
 const fixture=signedIdentity(),fetch=vi.fn().mockResolvedValue(new Response(JSON.stringify(fixture.discovery),{status:200,headers:{'content-type':'application/json'}}));vi.stubGlobal('fetch',fetch);
 await expect(verifyQualifiedIdentity(fixture.identity,accountId)).resolves.toMatchObject({status:'valid',pin:{origin,serverId}});
 await expect(verifyQualifiedIdentity(fixture.identity,accountId,'LC-9999')).resolves.toEqual({status:'invalid'});
 expect(fetch).toHaveBeenCalledWith(origin+'/.well-known/locat',expect.objectContaining({credentials:'omit',redirect:'error'}));
 const altered={...fixture.identity,attestation:{...fixture.identity.attestation!,accountId:'b'.repeat(32)}};
 await expect(verifyQualifiedIdentity(altered,accountId)).resolves.toEqual({status:'invalid'});
});

it('rejects invalid account and authority signatures and treats network failure as unavailable',async()=>{
 const fixture=signedIdentity();vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response(JSON.stringify(fixture.discovery),{status:200})));
 const invalid={...fixture.identity,attestation:{...fixture.identity.attestation!,signature:'AA'}};
 await expect(verifyQualifiedIdentity(invalid,accountId)).resolves.toEqual({status:'invalid'});
 const invalidDiscovery={...fixture.discovery,identity:{...fixture.discovery.identity,signature:'AA'}};
 vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response(JSON.stringify(invalidDiscovery),{status:200})));
 await expect(verifyQualifiedIdentity(fixture.identity,accountId)).resolves.toEqual({status:'invalid'});
 vi.stubGlobal('fetch',vi.fn().mockRejectedValue(new Error('offline')));
 await expect(verifyQualifiedIdentity(fixture.identity,accountId)).resolves.toEqual({status:'unavailable'});
});

it('keeps authority pins scoped to account and exact origin and never auto-replaces a changed key',()=>{
 const first={origin,serverId,keyId:'key-one',publicKey:'public-one'};
 expect(compareAuthorityPin(null,first)).toBe('first-contact');writeAuthorityPin(accountId,first);
 const pin=readAuthorityPin(accountId,origin)!;expect(pin.keyId).toBe('key-one');expect(compareAuthorityPin(pin,first)).toBe('matches');
 expect(readAuthorityPin('b'.repeat(32),origin)).toBeNull();expect(readAuthorityPin(accountId,'https://other.test')).toBeNull();
 expect(compareAuthorityPin(pin,{...first,keyId:'key-two',publicKey:'public-two'})).toBe('changed');
 expect(readAuthorityPin(accountId,origin)?.keyId).toBe('key-one');removeAuthorityPin(accountId,origin);expect(readAuthorityPin(accountId,origin)).toBeNull();
});

it('requires a separate fingerprint confirmation for first contact and changed keys',async()=>{
 const first=signedIdentity(),fetch=vi.fn().mockResolvedValue(new Response(JSON.stringify(first.discovery),{status:200}));vi.stubGlobal('fetch',fetch);
 const view=render(<GlobalIdentityTrustDisclosure accountId={accountId} identity={first.identity}/>);
 expect(fetch).not.toHaveBeenCalled();fireEvent.click(screen.getByText(/Authority signature/));const pin=await screen.findByRole('button',{name:'Pin after comparison'});expect(pin).toBeDisabled();
 fireEvent.click(screen.getByRole('checkbox'));fireEvent.click(pin);await screen.findByText('Authority fingerprint pinned for this account in this browser.');expect(readAuthorityPin(accountId,origin)?.keyId).toBe(first.identity.attestation?.keyId);
 view.unmount();const changed=signedIdentity();vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response(JSON.stringify(changed.discovery),{status:200})));
 render(<GlobalIdentityTrustDisclosure accountId={accountId} identity={changed.identity}/>);fireEvent.click(screen.getByText(/Authority signature/));const replace=await screen.findByRole('button',{name:'Replace pin after comparison'});expect(readAuthorityPin(accountId,origin)?.keyId).toBe(first.identity.attestation?.keyId);expect(replace).toBeDisabled();
 fireEvent.click(screen.getByRole('checkbox'));fireEvent.click(replace);await screen.findByText('Authority fingerprint pinned for this account in this browser.');await waitFor(()=>expect(readAuthorityPin(accountId,origin)?.keyId).toBe(changed.identity.attestation?.keyId));
});
