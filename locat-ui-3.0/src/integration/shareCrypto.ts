const encoder=new TextEncoder(),decoder=new TextDecoder('utf-8',{fatal:true});
const PASSWORD_FORMAT='locat-share-password-v1',PASSWORD_ITERATIONS=600_000;
const toBase64=(bytes:Uint8Array)=>{let binary='';for(let offset=0;offset<bytes.length;offset+=0x8000)binary+=String.fromCharCode(...bytes.subarray(offset,offset+0x8000));return btoa(binary);};
const fromBase64=(value:string)=>{if(!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value))throw new Error('This share key is invalid.');return Uint8Array.from(atob(value),char=>char.charCodeAt(0));};
const toUrl=(bytes:Uint8Array)=>toBase64(bytes).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
const fromUrl=(value:string)=>fromBase64(value.replaceAll('-','+').replaceAll('_','/')+'='.repeat((4-value.length%4)%4));
const source=(value:Uint8Array)=>value as unknown as BufferSource;

async function passwordKey(passphrase:string,salt:Uint8Array){
 const material=await crypto.subtle.importKey('raw',encoder.encode(passphrase),'PBKDF2',false,['deriveKey']);
 return crypto.subtle.deriveKey({name:'PBKDF2',salt:source(salt),iterations:PASSWORD_ITERATIONS,hash:'SHA-256'},material,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
}

export async function encryptShare(text:string,passphrase=''){
 const data=encoder.encode(text);if(!data.length||data.byteLength>1_500_000)throw new Error('Write a message up to 1.5 MB.');
 if(passphrase&&(passphrase.length<8||passphrase.length>256))throw new Error('Use a share passphrase between 8 and 256 characters.');
 const raw=crypto.getRandomValues(new Uint8Array(32)),iv=crypto.getRandomValues(new Uint8Array(12)),key=await crypto.subtle.importKey('raw',raw,'AES-GCM',false,['encrypt']);let payload=data;
 if(passphrase){const contentKeyBytes=crypto.getRandomValues(new Uint8Array(32)),salt=crypto.getRandomValues(new Uint8Array(16)),wrapIv=crypto.getRandomValues(new Uint8Array(12)),contentIv=crypto.getRandomValues(new Uint8Array(12)),contentKey=await crypto.subtle.importKey('raw',source(contentKeyBytes),'AES-GCM',false,['encrypt']);const wrappingKey=await passwordKey(passphrase,salt),wrappedKey=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv:wrapIv},wrappingKey,contentKeyBytes)),content=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv:contentIv},contentKey,data));payload=encoder.encode(JSON.stringify({format:PASSWORD_FORMAT,salt:toBase64(salt),wrapIv:toBase64(wrapIv),wrappedKey:toBase64(wrappedKey),contentIv:toBase64(contentIv),content:toBase64(content)}));}
 const ciphertext=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv},key,payload));
 return{iv:toBase64(iv),ciphertext:toBase64(ciphertext),secret:toUrl(raw)};
}

export async function decryptShare(ivText:string,ciphertextText:string,secret:string,passphrase=''){
 const iv=fromBase64(ivText),raw=fromUrl(secret);if(iv.length!==12||raw.length!==32)throw new Error('This share key is invalid.');
 const key=await crypto.subtle.importKey('raw',raw,'AES-GCM',false,['decrypt']);
 try{const plaintext=await crypto.subtle.decrypt({name:'AES-GCM',iv},key,fromBase64(ciphertextText)),decoded=decoder.decode(plaintext);if(!decoded.startsWith('{'))return decoded;let envelope:unknown;try{envelope=JSON.parse(decoded);}catch{return decoded;}if(!envelope||typeof envelope!=='object'||(envelope as {format?:unknown}).format!==PASSWORD_FORMAT)return decoded;const fields=envelope as Record<string,unknown>;if(typeof fields.salt!=='string'||typeof fields.wrapIv!=='string'||typeof fields.wrappedKey!=='string'||typeof fields.contentIv!=='string'||typeof fields.content!=='string')throw new Error('This password-protected share is malformed.');if(!passphrase){const error=new Error('Enter the share passphrase to decrypt this message.');error.name='SharePassphraseRequiredError';throw error;}const salt=fromBase64(fields.salt),wrapIv=fromBase64(fields.wrapIv),wrappedKey=fromBase64(fields.wrappedKey),contentIv=fromBase64(fields.contentIv);if(salt.length!==16||wrapIv.length!==12||wrappedKey.length!==48||contentIv.length!==12)throw new Error('This password-protected share is malformed.');let contentKeyBytes:Uint8Array;try{contentKeyBytes=new Uint8Array(await crypto.subtle.decrypt({name:'AES-GCM',iv:source(wrapIv)},await passwordKey(passphrase,salt),source(wrappedKey)));}catch{throw new Error('That share passphrase did not unlock this message.');}const contentKey=await crypto.subtle.importKey('raw',source(contentKeyBytes),'AES-GCM',false,['decrypt']);return decoder.decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:source(contentIv)},contentKey,source(fromBase64(fields.content))));}
 catch(error){if(error instanceof Error&&(error.name==='SharePassphraseRequiredError'||error.message==='That share passphrase did not unlock this message.'||error.message==='This password-protected share is malformed.'))throw error;throw new Error('This link is expired, incomplete or has been changed.',{cause:error});}
}
