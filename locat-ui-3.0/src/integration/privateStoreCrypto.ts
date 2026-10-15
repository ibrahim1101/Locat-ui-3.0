/** Adapted from original Locat privateStoreCrypto.ts. UI3 identity scope differs. */
import {validateConfig,validateEnvelope,validateEntry,PRIVATE_KDF_ITERATIONS,type PrivateConfig,type PrivateEnvelope,type PrivateEntry,type PrivateModule} from '../../shared/privateStore.mjs';
export type PrivateScope={userId:string;module:PrivateModule};
const encoder=new TextEncoder();
export function encodeBase64(bytes:Uint8Array):string { let text="";for(let i=0;i<bytes.length;i+=8192)text+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(text); }
export function decodeBase64(value:string):Uint8Array<ArrayBuffer>{return Uint8Array.from(atob(value),char=>char.charCodeAt(0));}
const aad=(scope:PrivateScope,storeId:string,id:string)=>encoder.encode(JSON.stringify(['Locat UI3 private store',1,scope.userId,scope.module,storeId,id]));
function validatePassphrase(value:string){if([...value].length<15 || value.length>1024)throw new Error('Use a separate passphrase of 15–1024 characters.');if(!crypto.subtle)throw new Error('Web Crypto requires a supported secure browser context.');}
async function wrappingKey(passphrase:string,config:PrivateConfig){validatePassphrase(passphrase);const base=await crypto.subtle.importKey('raw',encoder.encode(passphrase),'PBKDF2',false,['deriveKey']);return crypto.subtle.deriveKey({name:'PBKDF2',hash:'SHA-256',salt:decodeBase64(config.salt),iterations:config.iterations},base,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);}
async function seal(key:CryptoKey,bytes:Uint8Array<ArrayBuffer>,additionalData:Uint8Array<ArrayBuffer>):Promise<PrivateEnvelope>{const iv=crypto.getRandomValues(new Uint8Array(12));const cipher=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData,tagLength:128},key,bytes);return {v:1,iv:encodeBase64(iv),data:encodeBase64(new Uint8Array(cipher))};}
async function open(key:CryptoKey,input:PrivateEnvelope,additionalData:Uint8Array<ArrayBuffer>){const value=validateEnvelope(input);return crypto.subtle.decrypt({name:'AES-GCM',iv:decodeBase64(value.iv),additionalData,tagLength:128},key,decodeBase64(value.data));}
export async function createPrivateStore(passphrase:string,scope:PrivateScope){validatePassphrase(passphrase);const raw=crypto.getRandomValues(new Uint8Array(32));try{const config:PrivateConfig={v:1,storeId:crypto.randomUUID(),salt:encodeBase64(crypto.getRandomValues(new Uint8Array(16))),iterations:PRIVATE_KDF_ITERATIONS,wrappedKey:{v:1,iv:'',data:''}};config.wrappedKey=await seal(await wrappingKey(passphrase,config),raw,aad(scope,config.storeId,'master-key'));const key=await crypto.subtle.importKey('raw',raw,'AES-GCM',false,['encrypt','decrypt']);return {config,key};}finally{raw.fill(0);}}
export async function unlockPrivateStore(passphrase:string,input:PrivateConfig,scope:PrivateScope){const config=validateConfig(input);const raw=new Uint8Array(await open(await wrappingKey(passphrase,config),config.wrappedKey,aad(scope,config.storeId,'master-key')));try{if(raw.length!==32)throw new Error('Invalid master key');return await crypto.subtle.importKey('raw',raw,'AES-GCM',false,['encrypt','decrypt']);}finally{raw.fill(0);}}
export async function encryptPrivateEntry(key:CryptoKey,config:PrivateConfig,scope:PrivateScope,id:string,entry:PrivateEntry){const valid=validateEntry(entry);if((scope.module==='vault')!==(valid.kind==='file'))throw new Error('Wrong private module');return seal(key,encoder.encode(JSON.stringify(valid)),aad(scope,config.storeId,id));}
export async function decryptPrivateEntry(key:CryptoKey,config:PrivateConfig,scope:PrivateScope,id:string,envelope:PrivateEnvelope){const valid=validateEntry(JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(await open(key,envelope,aad(scope,config.storeId,id)))));if((scope.module==='vault')!==(valid.kind==='file') || (valid.kind==='file' && decodeBase64(valid.data).length!==valid.bytes))throw new Error('Invalid decrypted entry');return valid;}
export function generatePrivatePassword(length=24){if(!Number.isInteger(length)||length<15||length>128)throw new Error('Invalid password length');const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*+-_=?.';const limit=256-(256%alphabet.length);let value='';while(value.length<length)for(const byte of crypto.getRandomValues(new Uint8Array(64)))if(byte<limit&&value.length<length)value+=alphabet[byte%alphabet.length];return value;}

/** Rewrap the same master key; entries and their account/store AAD do not change. */
export async function changePrivatePassphrase(currentPassphrase:string,newPassphrase:string,input:PrivateConfig,scope:PrivateScope){
 const current=validateConfig(input);validatePassphrase(newPassphrase);
 if(currentPassphrase===newPassphrase)throw new Error('Choose a different private-store passphrase.');
 const raw=new Uint8Array(await open(await wrappingKey(currentPassphrase,current),current.wrappedKey,aad(scope,current.storeId,'master-key')));
 try{
  if(raw.length!==32)throw new Error('Invalid master key');
  const config:PrivateConfig={...current,salt:encodeBase64(crypto.getRandomValues(new Uint8Array(16))),iterations:PRIVATE_KDF_ITERATIONS};
  config.wrappedKey=await seal(await wrappingKey(newPassphrase,config),raw,aad(scope,current.storeId,'master-key'));
  return validateConfig(config);
 }finally{raw.fill(0);}
}
