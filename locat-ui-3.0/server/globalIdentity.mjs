import { createHash, createPublicKey, sign } from 'node:crypto';

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
/** Address qualification alone is not authority authentication or federation. */
export function serverIdentityAttestation(origin,serverId,privateKey){
 if(!origin||!privateKey)return null;
 return signedClaims('locat.server.v1',{version:1,serverId,origin:new URL(origin).origin},privateKey);
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
