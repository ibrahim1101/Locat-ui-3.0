const encoder=new TextEncoder(),decoder=new TextDecoder('utf-8',{fatal:true});
const toBase64=(bytes:Uint8Array)=>{let binary='';for(let offset=0;offset<bytes.length;offset+=0x8000)binary+=String.fromCharCode(...bytes.subarray(offset,offset+0x8000));return btoa(binary);};
const fromBase64=(value:string)=>{if(!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value))throw new Error('This share key is invalid.');return Uint8Array.from(atob(value),char=>char.charCodeAt(0));};
const toUrl=(bytes:Uint8Array)=>toBase64(bytes).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
const fromUrl=(value:string)=>fromBase64(value.replaceAll('-','+').replaceAll('_','/')+'='.repeat((4-value.length%4)%4));

export async function encryptShare(text:string){
 const data=encoder.encode(text);if(!data.length||data.byteLength>1_500_000)throw new Error('Write a message up to 1.5 MB.');
 const raw=crypto.getRandomValues(new Uint8Array(32)),iv=crypto.getRandomValues(new Uint8Array(12)),key=await crypto.subtle.importKey('raw',raw,'AES-GCM',false,['encrypt']);
 const ciphertext=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv},key,data));
 return{iv:toBase64(iv),ciphertext:toBase64(ciphertext),secret:toUrl(raw)};
}

export async function decryptShare(ivText:string,ciphertextText:string,secret:string){
 const iv=fromBase64(ivText),raw=fromUrl(secret);if(iv.length!==12||raw.length!==32)throw new Error('This share key is invalid.');
 const key=await crypto.subtle.importKey('raw',raw,'AES-GCM',false,['decrypt']);
 try{return decoder.decode(await crypto.subtle.decrypt({name:'AES-GCM',iv},key,fromBase64(ciphertextText)));}
 catch{throw new Error('This link is expired, incomplete or has been changed.');}
}
