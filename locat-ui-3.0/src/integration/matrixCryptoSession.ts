import {createMatrixConversationSession,type MatrixConversationSession} from './matrixConversationSession';
import {createMatrixVerificationSession,type MatrixVerificationSession} from './matrixVerificationSession';
import {encryptHistoryExport,decryptHistoryFile} from './matrixHistory';
import {BrowserLinkClient} from './linkClient';
import {createClient,type MatrixClient} from 'matrix-js-sdk';

export type MatrixPublicKeys={ed25519:string;curve25519:string};
export type MatrixSessionBinding={accountId:string;userId:string;deviceId:string;accessToken:string;expectedPublicKeys?:MatrixPublicKeys};
/** Account-owned persistent crypto lifecycle; peer verification starts only by explicit action. */
export async function openMatrixCryptoSession(binding:MatrixSessionBinding,signal?:AbortSignal){
 if(!window.isSecureContext||!navigator.locks||!window.indexedDB)throw new Error('Persistent messaging keys require a secure context, IndexedDB and exclusive browser locks.');
 if(!/^[a-f0-9]{32}$/.test(binding.accountId)||!/^@[^\s:]{1,255}:[^\s]{1,255}$/.test(binding.userId)||!binding.deviceId||binding.deviceId.length>255||!binding.accessToken||binding.accessToken.length>8192)throw new Error('Invalid authorized messaging session binding.');
 if(signal?.aborted)throw new Error('Messaging initialization cancelled.');
 // Matrix tokens are supplied by authorized account mapping; never reuse a Locat password/cookie.
 const scope=JSON.stringify([window.location.origin,binding.accountId,binding.userId,binding.deviceId]);
 const link=new BrowserLinkClient(binding.accountId);
 const lifecycle=new AbortController();
 let client:MatrixClient|null=null,closed=false,release:()=>void=()=>{};
 let verification:MatrixVerificationSession|null=null,bound=false;
 let historyBusy=false,conversationMode=false,conversationGeneration=0,conversationSyncedGeneration=0;let conversations:MatrixConversationSession|null=null;const syncRequests=new Set<AbortController>();
 // Rebuild the authorized recent room window after a real network transition; keep SDK keys and identity.
 const recoverSync=()=>{if(closed||!conversationMode)return;conversationGeneration++;for(const control of syncRequests)control.abort();};
 window.addEventListener('online',recoverSync);
 async function history<T>(operation:()=>Promise<T>){if(closed)throw new Error('Messaging device closed');if(historyBusy)throw new Error('Another history-key operation is running.');historyBusy=true;try{return await operation();}finally{historyBusy=false;}}
 const pendingCrypto=new Set<Promise<unknown>>();
 async function runCrypto<T>(operation:()=>Promise<T>){if(closed)throw new Error('Messaging device closed');const task=Promise.resolve().then(()=>{if(closed)throw new Error('Messaging device closed');return operation();});pendingCrypto.add(task);try{return await task;}finally{pendingCrypto.delete(task);}}
 const held=new Promise<void>(resolve=>{release=resolve;});
 type Result={accountId:string;userId:string;deviceId:string;publicKeys:{ed25519:string;curve25519:string};readonly closed:boolean;bind():Promise<void>;revoke():Promise<void>;exportHistory(passphrase:string):Promise<string>;importHistory(encrypted:string,passphrase:string):Promise<number>;verification():MatrixVerificationSession;conversations():MatrixConversationSession;close():Promise<void>};
 let ready:(result:Result)=>void=()=>{},failed:(error:unknown)=>void=()=>{};
 const initialized=new Promise<Result>((resolve,reject)=>{ready=resolve;failed=reject;});
 const cancel=()=>{closed=true;window.removeEventListener('online',recoverSync);lifecycle.abort();release();};signal?.addEventListener('abort',cancel,{once:true});
 const task=navigator.locks.request('locat-ui3-matrix:'+scope,{ifAvailable:true},async lock=>{
  if(!lock)throw new Error('This messaging device is already open in another tab.');
  try{
   if(closed)throw new Error('Messaging initialization cancelled.');
   const quiet={trace(){},debug(){},info(){},warn(){},error(){},getChild(){return this;}};
   const fetchFn:typeof fetch=async(input,init)=>{
    const target=new URL(input instanceof Request?input.url:String(input),window.location.origin);
    if(target.origin!==window.location.origin||!target.pathname.startsWith('/_matrix/'))throw new Error('Matrix transport must stay on the protected same-origin gateway.');
    if(closed)throw new Error('Messaging device closed');const proof=await link.connect();if(closed)throw new Error('Messaging device closed');
    const headers=new Headers(init?.headers??(input instanceof Request?input.headers:undefined));headers.set('X-Locat-Device-Proof',proof.token);headers.set('Authorization','Bearer '+binding.accessToken);
    const callerSignal=init?.signal??(input instanceof Request?input.signal:undefined);
    const isSync=target.pathname==='/_matrix/client/v3/sync',control=new AbortController();
    // A room added after an earlier filtered sync needs its state even if no state changed since.
    const generation=conversationGeneration,initial=conversationMode&&conversationSyncedGeneration<generation&&isSync;
    if(conversationMode&&isSync){target.searchParams.set('locat_conversations','1');if(initial){target.searchParams.delete('since');target.searchParams.set('full_state','true');}}
    if(isSync)syncRequests.add(control);
    try{const response=await fetch(input instanceof Request?new Request(target.href,input):target.href,{...init,headers,signal:AbortSignal.any([lifecycle.signal,control.signal,...(callerSignal?[callerSignal]:[])]),credentials:'same-origin',cache:'no-store'});if(response.ok&&initial&&!control.signal.aborted&&generation===conversationGeneration)conversationSyncedGeneration=generation;return response;}finally{syncRequests.delete(control);}
   };
   client=createClient({fetchFn,baseUrl:window.location.origin,userId:binding.userId,deviceId:binding.deviceId,accessToken:binding.accessToken,verificationMethods:['m.sas.v1'],logger:quiet});
   await client.initRustCrypto({useIndexedDB:true,cryptoDatabasePrefix:'locat-ui3-matrix:'+scope});
   if(closed)throw new Error('Messaging initialization cancelled.');
   const crypto=client.getCrypto();if(!crypto)throw new Error('Reviewed messaging encryption is unavailable.');
   crypto.globalBlacklistUnverifiedDevices=true;
   const publicKeys=await crypto.getOwnDeviceKeys();if(closed)throw new Error('Messaging initialization cancelled.');
   if(binding.expectedPublicKeys&&(publicKeys.ed25519!==binding.expectedPublicKeys.ed25519||publicKeys.curve25519!==binding.expectedPublicKeys.curve25519))throw new Error('Stored messaging keys do not match this device binding. Recovery is required; existing keys were not replaced.');
   ready({accountId:binding.accountId,userId:binding.userId,deviceId:binding.deviceId,publicKeys,get closed(){return closed;},async bind(){if(closed)throw new Error('Messaging device closed');await link.request('matrix/bind',{userId:binding.userId,deviceId:binding.deviceId,accessToken:binding.accessToken,publicKeys});if(closed)throw new Error('Messaging device closed');bound=true;},verification(){if(closed||!bound||!client)throw new Error('Bind this device before enabling verification.');return verification??=createMatrixVerificationSession(client,query=>link.request('matrix/peer?'+new URLSearchParams(query)));},conversations(){if(closed||!bound||!client)throw new Error('Bind this device before opening conversations.');const active=client;return conversations??=createMatrixConversationSession(active,accountId=>link.request('matrix/peer?'+new URLSearchParams({accountId})),accountId=>link.request('matrix/conversation',{accountId,accessToken:binding.accessToken}),async()=>{if(!conversationMode)await verification?.close();if(closed)throw new Error('Messaging device closed');conversationMode=true;recoverSync();if(!active.getSyncState())await active.startClient({initialSyncLimit:50,disablePresence:true,lazyLoadMembers:false,resolveInvitesToProfiles:false});});},async exportHistory(passphrase){return history(async()=>{if(closed)throw new Error('Messaging device closed');const keys=await runCrypto(()=>crypto.exportRoomKeysAsJson());if(closed)throw new Error('Messaging device closed');if(keys==='[]')throw new Error('There are no room history keys to export yet.');return encryptHistoryExport(keys,passphrase,lifecycle.signal);});},async importHistory(encrypted,passphrase){return history(async()=>{if(closed)throw new Error('Messaging device closed');const value=await decryptHistoryFile(encrypted,passphrase,lifecycle.signal);if(closed)throw new Error('History import cancelled');await runCrypto(()=>crypto.importRoomKeysAsJson(value.json));if(closed)throw new Error('History import completed locally while the device was closing; reopen setup to check its state.');return value.entries;});},async revoke(){if(closed)throw new Error('Messaging device closed');await link.request('matrix/logout',{accessToken:binding.accessToken});},async close(){cancel();await task;}});
   await held;
  }finally{await verification?.close();await conversations?.close();closed=true;await Promise.allSettled([...pendingCrypto]);client?.stopClient();window.removeEventListener('online',recoverSync);link.close();signal?.removeEventListener('abort',cancel);}
 });
 void task.catch(error=>{closed=true;window.removeEventListener('online',recoverSync);lifecycle.abort();link.close();signal?.removeEventListener('abort',cancel);failed(error);});
 return initialized;
}
