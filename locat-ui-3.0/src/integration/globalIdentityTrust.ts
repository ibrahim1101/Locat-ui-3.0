import type { QualifiedAccountIdentity } from '../contracts/auth';
import { discoverHomeserver,type IdentityKeyRotation } from './serverDiscovery';

export type AuthorityPin={origin:string;serverId:string;keyId:string;publicKey:string;pinnedAt:string};
export type IdentityVerification={status:'valid';pin:Omit<AuthorityPin,'pinnedAt'>;rotationValid:boolean}|{status:'unsigned'|'invalid'|'unavailable'|'checking'};
const pinPrefix='locat-ui3:authority-pin:v1:';

function decodeBase64Url(value:string){
 if(!/^[A-Za-z0-9_-]+$/.test(value))throw new Error('Invalid base64url');
 const binary=atob(value.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-value.length%4)%4));
 const bytes=new Uint8Array(binary.length);for(let index=0;index<binary.length;index++)bytes[index]=binary.charCodeAt(index);
 if(encodeBase64Url(bytes)!==value)throw new Error('Non-canonical base64url');
 return bytes;
}
function encodeBase64Url(bytes:Uint8Array){
 let binary='';for(const byte of bytes)binary+=String.fromCharCode(byte);
 return btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}
function pinKey(accountId:string,origin:string){return pinPrefix+encodeURIComponent(accountId)+':'+encodeURIComponent(origin);}
function samePin(pin:AuthorityPin,verified:Omit<AuthorityPin,'pinnedAt'>){return pin.origin===verified.origin&&pin.serverId===verified.serverId&&pin.keyId===verified.keyId&&pin.publicKey===verified.publicKey;}
function isAuthorityPin(value:unknown):value is AuthorityPin{
 if(!value||typeof value!=='object')return false;
 const pin=value as Partial<AuthorityPin>;
 return typeof pin.origin==='string'&&typeof pin.serverId==='string'&&typeof pin.keyId==='string'&&typeof pin.publicKey==='string'&&typeof pin.pinnedAt==='string';
}
export function readAuthorityPin(accountId:string,origin:string,storage:Storage=localStorage):AuthorityPin|null{
 const raw=storage.getItem(pinKey(accountId,origin));if(raw===null)return null;
 let pin:AuthorityPin;try{pin=JSON.parse(raw) as AuthorityPin;}catch{throw new Error('The saved authority pin is unreadable. Remove it before trusting this authority again.');}
 if(!isAuthorityPin(pin)||pin.origin!==origin)throw new Error('The saved authority pin is invalid. Remove it before trusting this authority again.');
 return pin;
}
export function writeAuthorityPin(accountId:string,pin:Omit<AuthorityPin,'pinnedAt'>,storage:Storage=localStorage){
 storage.setItem(pinKey(accountId,pin.origin),JSON.stringify({...pin,pinnedAt:new Date().toISOString()}));
}
export function removeAuthorityPin(accountId:string,origin:string,storage:Storage=localStorage){storage.removeItem(pinKey(accountId,origin));}
/** Return only malformed entries owned by this feature; valid trust pins are never included. */
export function findInvalidAuthorityPinKeys(storage:Storage=localStorage):string[]{
 const invalid:string[]=[];
 for(let index=0;index<storage.length;index++){
  const key=storage.key(index);if(!key?.startsWith(pinPrefix))continue;
  const encoded=key.slice(pinPrefix.length),separator=encoded.indexOf(':');
  let accountId='',origin='';
  try{if(separator<0)throw new Error('Invalid pin key');accountId=decodeURIComponent(encoded.slice(0,separator));origin=decodeURIComponent(encoded.slice(separator+1));}catch{invalid.push(key);continue;}
  const raw=storage.getItem(key);if(raw===null){invalid.push(key);continue;}
  let pin:unknown;try{pin=JSON.parse(raw);}catch{invalid.push(key);continue;}
  if(!isAuthorityPin(pin)||pin.origin!==origin||key!==pinKey(accountId,origin))invalid.push(key);
 }
 return invalid;
}
export function removeInvalidAuthorityPins(storage:Storage=localStorage):number{
 const keys=findInvalidAuthorityPinKeys(storage);for(const key of keys)storage.removeItem(key);return keys.length;
}
/** Detect a server UUID already trusted at another origin in this browser profile. */
export function findPinnedAuthorityClones(serverId:string,origin:string,storage:Storage=localStorage):string[]{
 const origins=new Set<string>();
 for(let index=0;index<storage.length;index++){
  const key=storage.key(index);if(!key?.startsWith(pinPrefix))continue;
  const raw=storage.getItem(key);if(raw===null)continue;
  let pin:AuthorityPin;
  try{pin=JSON.parse(raw) as AuthorityPin;}catch{throw new Error('A saved authority pin is unreadable. Clear the invalid pin before checking for cloned server identities.');}
  if(!isAuthorityPin(pin))throw new Error('A saved authority pin is invalid. Clear the invalid pin before checking for cloned server identities.');
  if(pin.serverId===serverId&&pin.origin!==origin)origins.add(pin.origin);
 }
 return [...origins].sort();
}
export function compareAuthorityPin(pin:AuthorityPin|null,verified:Omit<AuthorityPin,'pinnedAt'>):'first-contact'|'matches'|'changed'{
 return pin===null?'first-contact':samePin(pin,verified)?'matches':'changed';
}

/** Verify both the account claim and the authority's discovery claim before displaying trust state. */
async function verifiesRotation(rotation:IdentityKeyRotation|undefined,previous:AuthorityPin|undefined,current:Omit<AuthorityPin,'pinnedAt'>){
 if(!rotation||!previous||previous.origin!==current.origin||previous.serverId!==current.serverId||previous.keyId===current.keyId)return false;
 try{
  if(rotation.kind!=='locat.rotation.v1'||rotation.version!==1||rotation.origin!==current.origin||rotation.serverId!==current.serverId||rotation.fromKeyId!==previous.keyId||rotation.fromPublicKey!==previous.publicKey||rotation.toKeyId!==current.keyId)return false;
  const oldDer=decodeBase64Url(rotation.fromPublicKey),oldKeyId=encodeBase64Url(new Uint8Array(await crypto.subtle.digest('SHA-256',oldDer)));
  if(oldKeyId!==previous.keyId)return false;
  const oldKey=await crypto.subtle.importKey('spki',oldDer,{name:'Ed25519'} as AlgorithmIdentifier,false,['verify']);
  const claims=JSON.stringify([rotation.kind,rotation.version,rotation.serverId,rotation.origin,rotation.fromKeyId,rotation.toKeyId]);
  return await crypto.subtle.verify({name:'Ed25519'},oldKey,decodeBase64Url(rotation.signature),new TextEncoder().encode(claims));
 }catch{return false;}
}
export async function verifyQualifiedIdentity(identity:QualifiedAccountIdentity|undefined,accountId:string,expectedLcCode?:string,previousPin?:AuthorityPin|null):Promise<IdentityVerification>{
 const account=identity?.attestation;if(!account)return {status:'unsigned'};
 let origin:URL;
 try{
  origin=new URL(account.origin);
  if(origin.origin!==account.origin||origin.username||origin.password||origin.pathname!=='/'||origin.search||origin.hash||!(origin.protocol==='https:'||(origin.protocol==='http:'&&['localhost','127.0.0.1','[::1]'].includes(origin.hostname))))return {status:'invalid'};
  const normalizedLcCode=expectedLcCode?.replace(/^LC-/i,'');
  if(account.kind!=='locat.account.v1'||account.version!==1||account.accountId!==accountId||identity.serverId!==account.serverId||identity.authority!==origin.host||identity.address!==`LC-${account.lcCode}@${origin.host}`||identity.accountUri!==`locat://${origin.host}/account/${accountId}`||(normalizedLcCode!==undefined&&normalizedLcCode!==account.lcCode))return {status:'invalid'};
 }catch{return {status:'invalid'};}
 let discovery;
 try{discovery=await discoverHomeserver(account.origin);}catch{return {status:'unavailable'};}
 const authority=discovery.identity;
 if(!authority||authority.kind!=='locat.server.v1'||authority.version!==1||authority.origin!==account.origin||authority.serverId!==account.serverId||discovery.serverId!==account.serverId||authority.keyId!==account.keyId||authority.publicKey!==account.publicKey)return {status:'invalid'};
 try{
  const der=decodeBase64Url(account.publicKey),keyId=encodeBase64Url(new Uint8Array(await crypto.subtle.digest('SHA-256',der)));
  if(keyId!==account.keyId||encodeBase64Url(decodeBase64Url(account.signature))!==account.signature||encodeBase64Url(decodeBase64Url(authority.signature))!==authority.signature)return {status:'invalid'};
  const key=await crypto.subtle.importKey('spki',der,{name:'Ed25519'} as AlgorithmIdentifier,false,['verify']);
  const serverClaims=JSON.stringify([authority.kind,authority.version,authority.serverId,authority.origin]);
  const accountClaims=JSON.stringify([account.kind,account.version,account.serverId,account.origin,account.accountId,account.lcCode]);
  const serverValid=await crypto.subtle.verify({name:'Ed25519'},key,decodeBase64Url(authority.signature),new TextEncoder().encode(serverClaims));
  const accountValid=await crypto.subtle.verify({name:'Ed25519'},key,decodeBase64Url(account.signature),new TextEncoder().encode(accountClaims));
  if(!serverValid||!accountValid)return {status:'invalid'};
  const pin={origin:account.origin,serverId:account.serverId,keyId:account.keyId,publicKey:account.publicKey};
  const rotationValid=await verifiesRotation(authority.rotation,previousPin??undefined,pin);
  return {status:'valid',pin,rotationValid};
 }catch{return {status:'invalid'};}
}
