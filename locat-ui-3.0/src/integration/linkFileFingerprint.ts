import {encodeBase64} from './privateStoreCrypto';
import {LINK_CHUNK_SIZE} from './linkPayloadCrypto';

/** Keyed digest of every file chunk; raw file hashes are never persisted. */
export async function fingerprintLinkFile(file:Blob,key:CryptoKey):Promise<string>{
 const hashes:Uint8Array[]=[];
 for(let offset=0;offset<file.size;offset+=LINK_CHUNK_SIZE){
  const chunk=new Uint8Array(await file.slice(offset,Math.min(file.size,offset+LINK_CHUNK_SIZE)).arrayBuffer());
  try{hashes.push(new Uint8Array(await crypto.subtle.digest('SHA-256',chunk)));}finally{chunk.fill(0);}
 }
 const header=new TextEncoder().encode(JSON.stringify(['locat-ui3-link-file-fingerprint:v1',file.size,LINK_CHUNK_SIZE,hashes.length]));
 const input=new Uint8Array(header.length+hashes.length*32);input.set(header);
 hashes.forEach((hash,index)=>{input.set(hash,header.length+index*32);hash.fill(0);});
 try{return encodeBase64(new Uint8Array(await crypto.subtle.sign('HMAC',key,input)));}finally{input.fill(0);}
}
