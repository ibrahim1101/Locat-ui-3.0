import {trackAuthorizedMatrixPeer} from './matrixTrackedPeer.mjs';
import {CryptoEvent} from 'matrix-js-sdk/lib/crypto-api/CryptoEvent.js';
import {VerificationRequestEvent} from 'matrix-js-sdk/lib/crypto-api/verification.js';
import {ClientEvent,Filter,type MatrixClient} from 'matrix-js-sdk';
import type {VerificationRequest,Verifier} from 'matrix-js-sdk/lib/crypto-api/verification.js';
import {verificationSyncFilter} from '../../shared/matrixVerificationProfile.mjs';
export type VerificationPeer={accountId:string;matrixUserId:string;devices:{deviceId:string}[]};
export type VerificationState={transport:'connecting'|'ready'|'error';phase:'idle'|'requested'|'waiting'|'comparing'|'checking'|'verified'|'cancelled'|'error';incoming?:boolean;peer?:VerificationPeer;deviceId?:string;fingerprint?:string;decimal?:[number,number,number];emoji?:[string,string][];error?:string};
export function createMatrixVerificationSession(client:MatrixClient,resolvePeer:(query:{accountId:string}|{matrixUserId:string})=>Promise<VerificationPeer>){
 let state:VerificationState={transport:'connecting',phase:'idle'},closed=false,resolving=false,polling=false,starting=false,confirming=false,request:VerificationRequest|null=null,verifier:Verifier|null=null,deadline=0,epoch=0;
 let closing:Promise<void>|null=null;
 let rejectStart:((reason:Error)=>void)|null=null;const pending=new Set<Promise<unknown>>();
 function track<T>(operation:()=>Promise<T>){const task=operation();pending.add(task);void task.finally(()=>pending.delete(task)).catch(()=>{});return task;}
 let selectedPeer:string|null=null;
 const listeners=new Set<(value:VerificationState)=>void>();
 const publish=(update:Partial<VerificationState>)=>{if(closed)return;state={...state,...update};for(const listener of listeners)listener(state);};
 const error=(value:unknown)=>{const current=request;clearRequest();void current?.cancel().catch(()=>{});publish({phase:'error',decimal:undefined,emoji:undefined,error:value instanceof Error?value.message:'Verification failed.'});};
 const allowed=async(peer:VerificationPeer,deviceId:string)=>{const current=await resolvePeer({accountId:peer.accountId});if(current.matrixUserId!==peer.matrixUserId||!current.devices.some(device=>device.deviceId===deviceId))throw new Error('Contact or device authorization changed.');return current;};
 const fingerprint=async(userId:string,deviceId:string)=>{await trackAuthorizedMatrixPeer(client,userId);const devices=await client.getCrypto()!.getUserDeviceInfo([userId],true);const value=devices.get(userId)?.get(deviceId)?.getFingerprint();if(!value)throw new Error('This device has not published its signing key yet.');return value;};
 function clearRequest(){epoch++;request?.off(VerificationRequestEvent.Change,changed);request=null;verifier=null;starting=false;confirming=false;}
 async function cancel(mismatch=false){const current=request,callbacks=verifier?.getShowSasCallbacks();clearRequest();publish({phase:'cancelled',decimal:undefined,emoji:undefined});try{if(mismatch&&callbacks)callbacks.mismatch();else await current?.cancel();}catch{publish({error:'Cancelled locally; delivery of cancellation was not confirmed.'});}}
 function changed(){void refresh().catch(error);}
 function refresh(){return track(async()=>{
  if(closed||!request||polling)return;polling=true;const version=epoch,current=request;
  try{
   if(Date.now()>deadline){await cancel();return;}
   if(current.phase===5){clearRequest();publish({phase:'cancelled',decimal:undefined,emoji:undefined});return;}
   if(current.phase===3&&current.initiatedByMe&&!starting){starting=true;verifier=await current.startVerification('m.sas.v1');if(closed||version!==epoch)return;void verifier.verify().catch(reason=>{if(version===epoch&&!closed)error(reason);});}
   if(current.phase===4&&current.verifier&&!verifier){verifier=current.verifier;void verifier.verify().catch(reason=>{if(version===epoch&&!closed)error(reason);});}
   const sas=verifier?.getShowSasCallbacks();if(current.phase===4&&sas&&!confirming)publish({phase:'comparing',decimal:sas.sas.decimal,emoji:sas.sas.emoji});
   if(current.phase===6){publish({phase:'checking',decimal:undefined,emoji:undefined});if(!state.peer||!state.deviceId)return;await allowed(state.peer,state.deviceId);const actual=await fingerprint(state.peer.matrixUserId,state.deviceId),trust=await client.getCrypto()!.getDeviceVerificationStatus(state.peer.matrixUserId,state.deviceId);if(closed||version!==epoch)return;if(actual!==state.fingerprint)throw new Error('The device signing key changed during verification.');if(trust?.isVerified()){clearRequest();publish({phase:'verified',error:undefined});}}
  }finally{polling=false;}
 });}
 async function attach(current:VerificationRequest,peer:VerificationPeer,deviceId:string,incoming:boolean){const key=await fingerprint(peer.matrixUserId,deviceId);if(closed){void current.cancel().catch(()=>{});return;}request=current;deadline=Date.now()+120000;publish({phase:incoming?'requested':'waiting',incoming,peer,deviceId,fingerprint:key,decimal:undefined,emoji:undefined,error:undefined});request.on(VerificationRequestEvent.Change,changed);changed();}
 const incoming=(current:VerificationRequest)=>{if(closed||request||resolving||current.otherUserId!==selectedPeer)return;resolving=true;void track(async()=>{try{if(!current.otherDeviceId)return;const peer=await resolvePeer({matrixUserId:current.otherUserId});if(closed||!peer.devices.some(device=>device.deviceId===current.otherDeviceId))return;await attach(current,peer,current.otherDeviceId,true);}catch{/* Unknown, blocked and unbound senders are not surfaced as trusted contacts. */}finally{resolving=false;}});};
 const sync=(value:string)=>{if(value==='PREPARED'||value==='SYNCING')publish({transport:'ready'});else if(value==='ERROR'||value==='RECONNECTING')publish({transport:'connecting'});};
 client.on(CryptoEvent.VerificationRequestReceived,incoming);client.on(ClientEvent.Sync,sync);const timer=setInterval(()=>{void refresh().catch(error);},500);
 return {
  subscribe(listener:(value:VerificationState)=>void){listeners.add(listener);listener(state);return()=>{listeners.delete(listener);};},
  start(){return track(async()=>{const filter=new Filter(client.getUserId()!);filter.setDefinition(verificationSyncFilter());let stopWaiting:()=>void=()=>{};const ready=new Promise<void>((resolve,reject)=>{rejectStart=reject;const timer=setTimeout(()=>reject(new Error('Verification sync did not become ready. Close setup before retrying.')),20000);const listener=(value:VerificationState)=>{if(value.transport==='ready')resolve();};listeners.add(listener);stopWaiting=()=>{clearTimeout(timer);listeners.delete(listener);};});void ready.catch(()=>{});try{await client.startClient({filter,initialSyncLimit:0,disablePresence:true,lazyLoadMembers:false,resolveInvitesToProfiles:false});if(closed)throw new Error('Verification closed.');sync(client.getSyncState()??'');await ready;}finally{stopWaiting();rejectStart=null;}});},
  devices(accountId:string){return track(async()=>{const peer=await resolvePeer({accountId});if(closed)throw new Error('Verification closed.');await trackAuthorizedMatrixPeer(client,peer.matrixUserId);if(closed)throw new Error('Verification closed.');selectedPeer=peer.matrixUserId;return peer;});},
  request(accountId:string,deviceId:string){return track(async()=>{if(closed||request||resolving||state.transport!=='ready')throw new Error('Wait for verification sync or finish the current request first.');resolving=true;try{const peer=await resolvePeer({accountId});if(!peer.devices.some(device=>device.deviceId===deviceId))throw new Error('Choose an active bound contact device.');selectedPeer=peer.matrixUserId;await fingerprint(peer.matrixUserId,deviceId);if(closed)throw new Error('Verification closed.');const current=await client.getCrypto()!.requestDeviceVerification(peer.matrixUserId,deviceId);try{await attach(current,peer,deviceId,false);}catch(reason){void current.cancel().catch(()=>{});throw reason;}}finally{resolving=false;}});},
  accept(){return track(async()=>{const current=request,version=epoch;if(!request||!state.peer||!state.deviceId||closed)throw new Error('No pending verification request.');await allowed(state.peer,state.deviceId);if(closed||request!==current||version!==epoch)throw new Error('Verification request changed.');await current!.accept();publish({phase:'waiting'});});},
  confirm(){return track(async()=>{if(!request||!state.peer||!state.deviceId||state.phase!=='comparing'||closed||confirming)throw new Error('No SAS comparison is ready.');confirming=true;try{await allowed(state.peer,state.deviceId);const actual=await fingerprint(state.peer.matrixUserId,state.deviceId);if(actual!==state.fingerprint)throw new Error('The device signing key changed.');const callbacks=verifier?.getShowSasCallbacks();if(!callbacks)throw new Error('Comparison is no longer available.');await callbacks.confirm();publish({phase:'checking',decimal:undefined,emoji:undefined});}catch(reason){confirming=false;error(reason);throw reason;}});},
  cancel,
  close(){if(closing)return closing;closed=true;rejectStart?.(new Error('Verification closed.'));clearInterval(timer);client.off(CryptoEvent.VerificationRequestReceived,incoming);client.off(ClientEvent.Sync,sync);listeners.clear();closing=Promise.allSettled([cancel(),...pending]).then(()=>{});return closing;}
 };
}
export type MatrixVerificationSession=ReturnType<typeof createMatrixVerificationSession>;
