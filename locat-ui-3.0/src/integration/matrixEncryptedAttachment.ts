import type {EncryptedFile} from 'matrix-js-sdk/lib/@types/media';

const MAX_ATTACHMENT_BYTES=2_900_000;
const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
function encode(bytes:Uint8Array){let result='';for(let i=0;i<bytes.length;i+=3){const a=bytes[i],b=bytes[i+1],c=bytes[i+2];result+=alphabet[a>>2]+alphabet[((a&3)<<4)|(b===undefined?0:b>>4)]+(b===undefined?'':alphabet[((b&15)<<2)|(c===undefined?0:c>>6)])+(c===undefined?'':alphabet[c&63]);}return result;}
function decode(value:string){if(!/^[A-Za-z0-9+/_-]+={0,2}$/.test(value)||value.length%4===1)throw new Error('Encrypted file metadata is invalid.');const clean=value.replace(/-/g,'+').replace(/_/g,'/').replace(/=+$/,'');const output=new Uint8Array(Math.floor(clean.length*3/4));let bits=0,count=0,index=0;for(const char of clean){const n=alphabet.indexOf(char);if(n<0)throw new Error('Encrypted file metadata is invalid.');bits=(bits<<6)|n;count+=6;if(count>=8){count-=8;output[index++]=(bits>>count)&255;}}return output.slice(0,index);}
function subtle(){if(!globalThis.crypto?.subtle)throw new Error('Secure attachment encryption is unavailable in this browser.');return globalThis.crypto.subtle;}
export async function encryptMatrixAttachment(plain:Uint8Array<ArrayBuffer>):Promise<{ciphertext:Uint8Array<ArrayBuffer>;file:Omit<EncryptedFile,'url'>}>{
 if(!plain.length||plain.length>MAX_ATTACHMENT_BYTES)throw new Error('Choose a file from 1 byte up to 2.9 MB.');
 const api=subtle(),rawKey=crypto.getRandomValues(new Uint8Array(32)),iv=crypto.getRandomValues(new Uint8Array(16));
 const key=await api.importKey('raw',rawKey,{name:'AES-CTR'},false,['encrypt']);
 const ciphertext=new Uint8Array(await api.encrypt({name:'AES-CTR',counter:iv,length:64},key,plain));
 const digest=new Uint8Array(await api.digest('SHA-256',ciphertext));
 return {ciphertext,file:{v:'v2',key:{alg:'A256CTR',kty:'oct',key_ops:['encrypt','decrypt'],k:encode(rawKey).replace(/\+/g,'-').replace(/\//g,'_'),ext:true},iv:encode(iv),hashes:{sha256:encode(digest)}}};
}
export async function decryptMatrixAttachment(ciphertext:Uint8Array<ArrayBuffer>,file:EncryptedFile,maxBytes=MAX_ATTACHMENT_BYTES){
 if(!Number.isSafeInteger(maxBytes)||maxBytes<1||ciphertext.length<1||ciphertext.length>maxBytes||file?.v!=='v2'||file.key?.alg!=='A256CTR'||file.key?.kty!=='oct'||!file.key.ext||!file.key.key_ops.includes('decrypt'))throw new Error('Encrypted attachment is invalid or exceeds the local size limit.');
 const keyBytes=decode(file.key.k),iv=decode(file.iv),expected=decode(file.hashes?.sha256??'');if(keyBytes.length!==32||iv.length!==16||expected.length!==32)throw new Error('Encrypted file key or integrity metadata is invalid.');
 const actual=new Uint8Array(await subtle().digest('SHA-256',ciphertext));let mismatch=0;for(let i=0;i<actual.length;i++)mismatch|=actual[i]^expected[i];if(mismatch)throw new Error('Encrypted file integrity check failed.');
 const key=await subtle().importKey('raw',keyBytes,{name:'AES-CTR'},false,['decrypt']);return new Uint8Array(await subtle().decrypt({name:'AES-CTR',counter:iv,length:64},key,ciphertext));
}
export function isEncryptedMatrixFile(value:unknown):value is EncryptedFile {if(!value||typeof value!=='object')return false;const file=value as Partial<EncryptedFile>;return file.v==='v2'&&typeof file.url==='string'&&/^mxc:\/\/[^/]+\/.+/.test(file.url)&&file.key?.alg==='A256CTR'&&file.key.kty==='oct'&&file.key.ext===true&&Array.isArray(file.key.key_ops)&&file.key.key_ops.includes('decrypt')&&typeof file.key.k==='string'&&typeof file.iv==='string'&&typeof file.hashes?.sha256==='string';}
