import { createHash, createPublicKey, sign, verify } from 'node:crypto';

function publicKeyDetails(privateKey){
 if(!privateKey)return null;
 if(privateKey.asymmetricKeyType!=='ed25519')throw new TypeError('Identity key must be Ed25519');
 const der=createPublicKey(privateKey).export({type:'spki',format:'der'});
 return {keyId:createHash('sha256').update(der).digest('base64url'),publicKey:der.toString('base64url')};
}
function signedClaims(kind,claims,privateKey){
 const details=publicKeyDetails(privateKey);if(!details)return null;
 const canonical=JSON.stringify([kind,...Object.values(claims)]);
 return {kind,...claims,...details,signature:sign(null,Buffer.from(canonical),privateKey).toString('base64url')};
}
function decodeKey(value){
 if(typeof value!=='string'||!/^[A-Za-z0-9_-]+$/.test(value))return null;
 const bytes=Buffer.from(value,'base64url');return bytes.toString('base64url')===value?bytes:null;
}
/** Verify an explicit handoff signed by the pinned prior key and bound to the current authority key. */
export function verifyIdentityRotation(rotation,{origin,serverId,currentKey}){
 if(!rotation||!origin||!serverId||!currentKey)return false;
 try{
  const canonicalOrigin=new URL(origin).origin,oldDer=decodeKey(rotation.fromPublicKey),signature=decodeKey(rotation.signature);
  if(rotation.kind!=='locat.rotation.v1'||rotation.version!==1||rotation.origin!==canonicalOrigin||rotation.serverId!==serverId||!oldDer||!signature)return false;
  const oldPublicKey=createPublicKey({key:oldDer,format:'der',type:'spki'}),oldKeyId=createHash('sha256').update(oldDer).digest('base64url');
  const current=publicKeyDetails(currentKey);if(rotation.fromKeyId!==oldKeyId||rotation.toKeyId!==current.keyId)return false;
  const claims=JSON.stringify([rotation.kind,rotation.version,rotation.serverId,rotation.origin,rotation.fromKeyId,rotation.toKeyId]);
  return verify(null,Buffer.from(claims),oldPublicKey,signature);
 }catch{return false;}
}
export function createIdentityRotation(origin,serverId,oldPrivateKey,newPrivateKey){
 const old=publicKeyDetails(oldPrivateKey),current=publicKeyDetails(newPrivateKey);
 if(!old||!current||!origin||!serverId)throw new TypeError('Rotation requires two Ed25519 keys, a canonical origin and server ID');
 const rotation={kind:'locat.rotation.v1',version:1,serverId,origin:new URL(origin).origin,fromKeyId:old.keyId,fromPublicKey:old.publicKey,toKeyId:current.keyId};
 const claims=JSON.stringify([rotation.kind,rotation.version,rotation.serverId,rotation.origin,rotation.fromKeyId,rotation.toKeyId]);
 return {...rotation,signature:sign(null,Buffer.from(claims),oldPrivateKey).toString('base64url')};
}
/** Address qualification alone is not authority authentication or federation. */
export function serverIdentityAttestation(origin,serverId,privateKey,rotation){
 if(!origin||!privateKey)return null;
 const attestation=signedClaims('locat.server.v1',{version:1,serverId,origin:new URL(origin).origin},privateKey);
 if(rotation){if(!verifyIdentityRotation(rotation,{origin,serverId,currentKey:privateKey}))throw new Error('Configured identity rotation does not match this server authority key');attestation.rotation=rotation;}
 return attestation;
}
/** The signature binds an account's immutable local ID and LC code to one authority key. */
export function accountIdentity(user,origin,serverId,privateKey){
 if(!origin)return null;
 const authority=new URL(origin).host;
 const result={serverId,authority,address:`LC-${user.lcCode}@${authority}`,accountUri:`locat://${authority}/account/${user.id}`};
 const attestation=signedClaims('locat.account.v1',{version:1,serverId,origin:new URL(origin).origin,accountId:user.id,lcCode:user.lcCode},privateKey);
 return attestation?{...result,attestation}:result;
}
export function localDiscoveryQuery(input,origin){
 const query=input.trim().toLowerCase();
 if(query.length>350)throw Object.assign(new Error('Invalid identity'),{status:400});
 if(!query.includes('@'))return query;
 const parts=query.split('@');
 if(parts.length!==2||!parts[0]||!parts[1])throw Object.assign(new Error('Invalid qualified identity'),{status:400});
 if(!origin||parts[1]!==new URL(origin).host)throw Object.assign(new Error('Cross-server discovery is not enabled. Open the trusted homeserver to find its users.'),{status:501});
 return parts[0];
}
