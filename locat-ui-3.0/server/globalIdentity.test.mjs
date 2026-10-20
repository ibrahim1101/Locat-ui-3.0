import {test} from 'node:test';
import assert from 'node:assert/strict';
import {accountIdentity,createIdentityRotation,localDiscoveryQuery,serverIdentityAttestation,verifyIdentityRotation} from './globalIdentity.mjs';
import {createHash,createPublicKey,generateKeyPairSync,verify} from 'node:crypto';
test('qualified addresses preserve LC/account IDs, avoid server collisions and do no remote discovery',()=>{
 const user={id:'a'.repeat(32),lcCode:'1234'};
 const a=accountIdentity(user,'https://a.test','server-a'),b=accountIdentity(user,'https://b.test','server-b');
 assert.equal(a.address,'LC-1234@a.test');assert.notEqual(a.accountUri,b.accountUri);assert.equal(user.lcCode,'1234');
 assert.equal(accountIdentity(user,undefined,'server-a'),null);
 assert.equal(localDiscoveryQuery(' LC-1234@A.TEST ','https://a.test'),'lc-1234');
 assert.equal(localDiscoveryQuery('alice','https://a.test'),'alice');
 assert.throws(()=>localDiscoveryQuery('alice@b.test','https://a.test'),{status:501});
 assert.throws(()=>localDiscoveryQuery('alice@a.test@b.test','https://a.test'),{status:400});
 assert.throws(()=>localDiscoveryQuery('a'.repeat(351),'https://a.test'),{status:400});
});

test('signed server and account identity claims bind canonical authority, immutable ID and LC code',()=>{
 const {privateKey}=generateKeyPairSync('ed25519'),user={id:'a'.repeat(32),lcCode:'1234'},origin='https://locat.example:8443';
 const server=serverIdentityAttestation(origin,'server-a',privateKey),account=accountIdentity(user,origin,'server-a',privateKey).attestation;
 const publicKey=createPublicKey({key:Buffer.from(server.publicKey,'base64url'),format:'der',type:'spki'});
 const canonical=value=>JSON.stringify(value);
 const check=(claims,signature)=>verify(null,Buffer.from(canonical(claims)),publicKey,Buffer.from(signature,'base64url'));
 assert.equal(server.keyId,createHash('sha256').update(Buffer.from(server.publicKey,'base64url')).digest('base64url'));
 assert.equal(check([server.kind,server.version,server.serverId,server.origin],server.signature),true);
 assert.equal(check([account.kind,account.version,account.serverId,account.origin,account.accountId,account.lcCode],account.signature),true);
 assert.equal(check([account.kind,account.version,account.serverId,'https://attacker.example:8443',account.accountId,account.lcCode],account.signature),false);
 assert.equal(check([account.kind,account.version,account.serverId,account.origin,'b'.repeat(32),account.lcCode],account.signature),false);
 assert.equal(account.accountId,user.id);assert.equal(account.lcCode,user.lcCode);
 const withoutKey=accountIdentity(user,origin,'server-a');assert.equal('attestation' in withoutKey,false);
 assert.equal(serverIdentityAttestation(origin,'server-a'),null);
});

test('signed key rotation binds an old signing key to the exact current authority key',()=>{
 const oldPair=generateKeyPairSync('ed25519'),nextPair=generateKeyPairSync('ed25519'),origin='https://locat.example:8443',serverId='server-a';
 const rotation=createIdentityRotation(origin,serverId,oldPair.privateKey,nextPair.privateKey);
 assert.equal(verifyIdentityRotation(rotation,{origin,serverId,currentKey:nextPair.privateKey}),true);
 assert.equal(verifyIdentityRotation(rotation,{origin:'https://attacker.example:8443',serverId,currentKey:nextPair.privateKey}),false);
 assert.equal(verifyIdentityRotation(rotation,{origin,serverId,currentKey:oldPair.privateKey}),false);
 assert.equal(verifyIdentityRotation({...rotation,toKeyId:'wrong'},{origin,serverId,currentKey:nextPair.privateKey}),false);
 assert.deepEqual(serverIdentityAttestation(origin,serverId,nextPair.privateKey,rotation).rotation,rotation);
 assert.throws(()=>serverIdentityAttestation(origin,serverId,nextPair.privateKey,{...rotation,signature:'AA'}),/rotation/);
});
