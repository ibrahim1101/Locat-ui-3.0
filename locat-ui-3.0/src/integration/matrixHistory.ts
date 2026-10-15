/** Encrypt Matrix's standard Megolm key-file format off the UI thread. No custom encryption format. */
export function encryptHistoryExport(roomKeys:string,passphrase:string,signal?:AbortSignal):Promise<string>{
 if(passphrase.length<12||passphrase.length>1024)return Promise.reject(new Error('Use a history export passphrase between 12 and 1024 characters.'));
 if(roomKeys.length>16*1024*1024||new TextEncoder().encode(roomKeys).byteLength>16*1024*1024)return Promise.reject(new Error('History key export exceeds the 16 MiB limit.'));
 if(signal?.aborted)return Promise.reject(new Error('History export cancelled.'));
 return new Promise((resolve,reject)=>{
  const worker=new Worker(new URL('./matrixHistory.worker.ts',import.meta.url),{type:'module'});
  const finish=(error:Error|null,value?:string)=>{clearTimeout(timer);signal?.removeEventListener('abort',cancel);worker.terminate();if(error)reject(error);else resolve(value!);};
  const cancel=()=>finish(new Error('History export cancelled.'));
  const timer=setTimeout(()=>finish(new Error('History key encryption timed out.')),60000);
  signal?.addEventListener('abort',cancel,{once:true});
  worker.onerror=()=>finish(new Error('History key encryption is unavailable in this browser.'));
  worker.onmessage=event=>{const value=event.data?.encrypted;if(typeof value!=='string'||value.length>32*1024*1024||!value.startsWith('-----BEGIN MEGOLM SESSION DATA-----'))finish(new Error('History keys could not be encrypted.'));else finish(null,value);};
  worker.postMessage({roomKeys,passphrase});
 });
}

/** Plaintext is returned only to the local SDK importer; never to a server or a download. */
export async function decryptHistoryFile(encrypted:string,passphrase:string,signal?:AbortSignal):Promise<{json:string;entries:number}>{
 const {inspectHistoryFile,inspectHistoryKeys}=await import('../../shared/matrixHistoryFormat.mjs');inspectHistoryFile(encrypted);
 if(!passphrase||passphrase.length>1024)throw new Error('Enter the history file passphrase (up to 1024 characters).');
 if(signal?.aborted)throw new Error('History import cancelled.');
 return new Promise((resolve,reject)=>{
  const worker=new Worker(new URL('./matrixHistoryImport.worker.ts',import.meta.url),{type:'module'});let settled=false;
  const finish=(error:Error|null,value?:{json:string;entries:number})=>{if(settled)return;settled=true;clearTimeout(timer);signal?.removeEventListener('abort',cancel);worker.terminate();if(error)reject(error);else resolve(value!);};
  const cancel=()=>finish(new Error('History import cancelled.'));const timer=setTimeout(()=>finish(new Error('History decryption timed out.')),60000);
  signal?.addEventListener('abort',cancel,{once:true});worker.onerror=()=>finish(new Error('History decryption is unavailable in this browser.'));
  worker.onmessage=event=>{try{const json=event.data?.json;const {entries}=inspectHistoryKeys(json);finish(null,{json,entries});}catch{finish(new Error('The history file could not be decrypted or validated. Check the passphrase and file.'));}};
  try{worker.postMessage({encrypted,passphrase});}catch{finish(new Error('History decryption could not start.'));}
 });
}
