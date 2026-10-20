import {createHash,generateKeyPairSync,sign,type KeyObject} from 'node:crypto';
import {afterEach,expect,it,vi} from 'vitest';
import {fireEvent,render,screen,waitFor} from '@testing-library/react';
import type {QualifiedAccountIdentity} from '../contracts/auth';
import {compareAuthorityPin,findInvalidAuthorityPinKeys,findPinnedAuthorityClones,readAuthorityPin,removeAuthorityPin,removeInvalidAuthorityPins,verifyQualifiedIdentity,writeAuthorityPin,type AuthorityPin} from './globalIdentityTrust';
import {GlobalIdentityTrustDisclosure} from './GlobalIdentityTrustDisclosure';

const origin='https://locat.test',serverId='123e4567-e89b-42d3-a456-426614174000',accountId='a'.repeat(32);
function signedIdentity(previous?:{privateKey:KeyObject;publicKey:KeyObject}){
 const {privateKey,publicKey}=generateKeyPairSync('ed25519'),der=publicKey.export({type:'spki',format:'der'}),encoded=der.toString('base64url'),keyId=createHash('sha256').update(der).digest('base64url');
 const make=(kind:string,claims:unknown[])=>sign(null,Buffer.from(JSON.stringify([kind,...claims])),privateKey).toString('base64url');
 const server:{kind:'locat.server.v1';version:1;serverId:string;origin:string;keyId:string;publicKey:string;signature:string;rotation?:{kind:'locat.rotation.v1';version:1;serverId:string;origin:string;fromKeyId:string;fromPublicKey:string;toKeyId:string;signature:string}}={kind:'locat.server.v1',version:1,serverId,origin,keyId,publicKey:encoded,signature:make('locat.server.v1',[1,serverId,origin])};
 if(previous){const oldDer=previous.publicKey.export({type:'spki',format:'der'}),fromPublicKey=oldDer.toString('base64url'),fromKeyId=createHash('sha256').update(oldDer).digest('base64url'),rotation={kind:'locat.rotation.v1' as const,version:1 as const,serverId,origin,fromKeyId,fromPublicKey,toKeyId:keyId};server.rotation={...rotation,signature:sign(null,Buffer.from(JSON.stringify([rotation.kind,rotation.version,serverId,origin,fromKeyId,keyId])),previous.privateKey).toString('base64url')};}
 const account={kind:'locat.account.v1' as const,version:1 as const,serverId,origin,accountId,lcCode:'1234',keyId,publicKey:encoded,signature:make('locat.account.v1',[1,serverId,origin,accountId,'1234'])};
 const identity:QualifiedAccountIdentity={serverId,authority:'locat.test',address:'LC-1234@locat.test',accountUri:`locat://locat.test/account/${accountId}`,attestation:account};
 return {identity,discovery:{app:'Locat',protocolVersion:1,serverId,origin,identity:server,capabilities:{sameOriginApi:true,privateMessaging:false,federation:false,webSocket:true,authenticatedIdentity:true}},privateKey,publicKey};
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
 const fixture=signedIdentity();vi.stubGlobal('fetch',vi.fn().mockImplementation(()=>new Response(JSON.stringify(fixture.discovery),{status:200})));
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

it('finds the same pinned server UUID at another origin across accounts',()=>{
 writeAuthorityPin('b'.repeat(32),{origin:'https://old-locat.test',serverId,keyId:'key-one',publicKey:'public-one'});
 writeAuthorityPin('c'.repeat(32),{origin:'https://locat.test',serverId:'different-server',keyId:'key-two',publicKey:'public-two'});
 expect(findPinnedAuthorityClones(serverId,origin)).toEqual(['https://old-locat.test']);
 expect(findPinnedAuthorityClones('different-server',origin)).toEqual([]);
});

it('repairs malformed authority records without removing valid pins',()=>{
 const malformedKey='locat-ui3:authority-pin:v1:'+encodeURIComponent('b'.repeat(32))+':'+encodeURIComponent('https://old-locat.test');
 localStorage.setItem(malformedKey,'not-json');writeAuthorityPin('c'.repeat(32),{origin:'https://trusted.test',serverId:'different-server',keyId:'good-key',publicKey:'good-public'});
 expect(findInvalidAuthorityPinKeys()).toEqual([malformedKey]);expect(removeInvalidAuthorityPins()).toBe(1);
 expect(localStorage.getItem(malformedKey)).toBeNull();expect(readAuthorityPin('c'.repeat(32),'https://trusted.test')?.keyId).toBe('good-key');expect(findPinnedAuthorityClones(serverId,origin)).toEqual([]);
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

it('warns about a cloned server UUID and requires operator confirmation before pinning another origin',async()=>{
 const existing:AuthorityPin={origin:'https://old-locat.test',serverId,keyId:'previous-key',publicKey:'previous-public',pinnedAt:new Date(0).toISOString()};writeAuthorityPin('b'.repeat(32),existing);
 const fixture=signedIdentity();vi.stubGlobal('fetch',vi.fn().mockImplementation(()=>new Response(JSON.stringify(fixture.discovery),{status:200})));
 render(<GlobalIdentityTrustDisclosure accountId={accountId} identity={fixture.identity}/>);fireEvent.click(screen.getByText(/Authority signature/));
 await screen.findByRole('alert');expect(screen.getByText(/This server UUID is already pinned at another origin/)).toHaveTextContent('https://old-locat.test');
 const confirmation=screen.getByRole('checkbox',{name:/only active writable owner/}),pin=await screen.findByRole('button',{name:'Pin after comparison'});expect(pin).toBeDisabled();
 fireEvent.click(confirmation);fireEvent.click(pin);await screen.findByText('Authority fingerprint pinned for this account in this browser.');
 expect(readAuthorityPin(accountId,origin)?.keyId).toBe(fixture.identity.attestation?.keyId);
});

it('blocks pinning until malformed records are explicitly removed and trust is rechecked',async()=>{
 const invalidKey='locat-ui3:authority-pin:v1:'+encodeURIComponent('b'.repeat(32))+':'+encodeURIComponent('https://old-locat.test');localStorage.setItem(invalidKey,'not-json');
 writeAuthorityPin('c'.repeat(32),{origin:'https://trusted.test',serverId:'different-server',keyId:'keep-key',publicKey:'keep-public'});
 const fixture=signedIdentity();vi.stubGlobal('fetch',vi.fn().mockImplementation(()=>new Response(JSON.stringify(fixture.discovery),{status:200})));
 render(<GlobalIdentityTrustDisclosure accountId={accountId} identity={fixture.identity}/>);fireEvent.click(screen.getByText(/Authority signature/));
 await screen.findByText(/Clone checks are stopped/);expect(screen.queryByRole('button',{name:'Pin after comparison'})).toBeNull();
 fireEvent.click(screen.getByRole('button',{name:'Remove malformed entries and recheck'}));
 const pin=await screen.findByRole('button',{name:'Pin after comparison'});expect(localStorage.getItem(invalidKey)).toBeNull();expect(readAuthorityPin('c'.repeat(32),'https://trusted.test')?.keyId).toBe('keep-key');expect(pin).toBeDisabled();
 fireEvent.click(screen.getByRole('checkbox'));fireEvent.click(pin);await screen.findByText('Authority fingerprint pinned for this account in this browser.');
});

it('accepts a key only after an explicit signed rotation click from the pinned old key',async()=>{
 const first=signedIdentity(),initial=first.identity.attestation!,previous:AuthorityPin={origin,serverId,keyId:initial.keyId,publicKey:initial.publicKey,pinnedAt:new Date(0).toISOString()};writeAuthorityPin(accountId,previous);
 const rotated=signedIdentity({privateKey:first.privateKey,publicKey:first.publicKey});vi.stubGlobal('fetch',vi.fn().mockImplementation(()=>new Response(JSON.stringify(rotated.discovery),{status:200})));
 const result=await verifyQualifiedIdentity(rotated.identity,accountId,'1234',previous);expect(result).toMatchObject({status:'valid',rotationValid:true});
 render(<GlobalIdentityTrustDisclosure accountId={accountId} identity={rotated.identity} lcCode="1234"/>);fireEvent.click(screen.getByText(/Authority signature/));
 const accept=await screen.findByRole('button',{name:'Accept signed authority-key rotation'});expect(readAuthorityPin(accountId,origin)?.keyId).toBe(initial.keyId);fireEvent.click(accept);
 await screen.findByText('Signed authority-key rotation accepted for this account.');expect(readAuthorityPin(accountId,origin)?.keyId).toBe(rotated.identity.attestation?.keyId);
});
