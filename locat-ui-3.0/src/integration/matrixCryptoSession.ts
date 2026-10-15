import type {MatrixClient} from 'matrix-js-sdk';

export type MatrixSessionBinding={accountId:string;userId:string;deviceId:string;accessToken:string};
/** Experimental lifecycle foundation. Not exposed as live messaging; account mapping and verification UI are pending. */
export async function openMatrixCryptoSession(binding:MatrixSessionBinding,signal?:AbortSignal){
 if(!window.isSecureContext||!navigator.locks||!window.indexedDB)throw new Error('Persistent messaging keys require a secure context, IndexedDB and exclusive browser locks.');
 if(!/^[a-f0-9]{32}$/.test(binding.accountId)||!/^@[^\s:]{1,255}:[^\s]{1,255}$/.test(binding.userId)||!binding.deviceId||binding.deviceId.length>255||!binding.accessToken||binding.accessToken.length>8192)throw new Error('Invalid authorized messaging session binding.');
 if(signal?.aborted)throw new Error('Messaging initialization cancelled.');
 // Matrix tokens are supplied by future authorized account mapping; never reuse a Locat password/cookie.
 const scope=JSON.stringify([window.location.origin,binding.accountId,binding.userId,binding.deviceId]);
 let client:MatrixClient|null=null,closed=false,release:()=>void=()=>{};
 const held=new Promise<void>(resolve=>{release=resolve;});
 type Result={accountId:string;userId:string;deviceId:string;publicKeys:{ed25519:string;curve25519:string};readonly closed:boolean;close():Promise<void>};
 let ready:(result:Result)=>void=()=>{},failed:(error:unknown)=>void=()=>{};
 const initialized=new Promise<Result>((resolve,reject)=>{ready=resolve;failed=reject;});
 const cancel=()=>{closed=true;release();};signal?.addEventListener('abort',cancel,{once:true});
 const task=navigator.locks.request('locat-ui3-matrix:'+scope,{ifAvailable:true},async lock=>{
  if(!lock)throw new Error('This messaging device is already open in another tab.');
  try{
   const sdk=await import('matrix-js-sdk');if(closed)throw new Error('Messaging initialization cancelled.');
   const quiet={trace(){},debug(){},info(){},warn(){},error(){},getChild(){return this;}};
   client=sdk.createClient({baseUrl:window.location.origin,userId:binding.userId,deviceId:binding.deviceId,accessToken:binding.accessToken,logger:quiet});
   await client.initRustCrypto({useIndexedDB:true,cryptoDatabasePrefix:'locat-ui3-matrix:'+scope});
   if(closed)throw new Error('Messaging initialization cancelled.');
   const crypto=client.getCrypto();if(!crypto)throw new Error('Reviewed messaging encryption is unavailable.');
   crypto.globalBlacklistUnverifiedDevices=true;
   const publicKeys=await crypto.getOwnDeviceKeys();if(closed)throw new Error('Messaging initialization cancelled.');
   ready({accountId:binding.accountId,userId:binding.userId,deviceId:binding.deviceId,publicKeys,get closed(){return closed;},async close(){cancel();await task;}});
   await held;
  }finally{closed=true;client?.stopClient();signal?.removeEventListener('abort',cancel);}
 });
 void task.catch(error=>{closed=true;signal?.removeEventListener('abort',cancel);failed(error);});
 return initialized;
}
