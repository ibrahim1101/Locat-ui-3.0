import type {MatrixClient,MatrixEvent} from 'matrix-js-sdk';
import type {VerificationPeer} from './matrixVerificationSession';
import {trackAuthorizedMatrixPeer} from './matrixTrackedPeer.mjs';
export type ConversationMessage={id:string;text?:string;mine:boolean;createdAt:number;failed:boolean};
export type ConversationSnapshot={roomId?:string;peer?:VerificationPeer;transport:string;busy:boolean;roomReady?:boolean;error?:string;messages:ConversationMessage[]};
/** Account-owned controller. Plaintext is projected only from successfully decrypted SDK events. */
export function createMatrixConversationSession(client:MatrixClient,resolvePeer:(accountId:string)=>Promise<VerificationPeer>,bootstrap:(accountId:string)=>Promise<{roomId:string}>,enableSync:()=>Promise<void>){
 let retry:{roomId:string;text:string;transaction:string;attempts:number;devices:string;event?:MatrixEvent}|null=null;
 let closed=false,busy=false,version=0,state:ConversationSnapshot={transport:'connecting',busy:false,messages:[]};
 const listeners=new Set<(state:ConversationSnapshot)=>void>(),pending=new Set<Promise<unknown>>();
 const publish=(patch:Partial<ConversationSnapshot>)=>{if(closed)return;state={...state,...patch};for(const listener of listeners)listener(state);};
 const requireCurrent=(epoch:number)=>{if(closed||version!==epoch)throw new Error('Conversation changed or messaging closed.');};
 const track=<T,>(operation:()=>Promise<T>)=>{const task=operation();pending.add(task);void task.finally(()=>pending.delete(task)).catch(()=>{});return task;};
 function project(){
  if(closed)return;const room=state.roomId?client.getRoom(state.roomId):null;
  const messages:ConversationMessage[]=[];
  for(const event of room?.getLiveTimeline().getEvents().slice(-200)??[]){
   if(event.getWireType()!=='m.room.encrypted'||!event.getId()?.startsWith('$')||![client.getUserId(),state.peer?.matrixUserId].includes(event.getSender()))continue;
   if(event.isBeingDecrypted()||event.shouldAttemptDecryption()){void track(()=>client.decryptEventIfNeeded(event)).catch(()=>{});continue;}
   const content=event.getContent();if(event.isDecryptionFailure()){messages.push({id:event.getId()!,mine:event.getSender()===client.getUserId(),createdAt:event.getTs(),failed:true});continue;}
   if(event.getType()!=='m.room.message'||content.msgtype!=='m.text'||typeof content.body!=='string'||new TextEncoder().encode(content.body).length>16384)continue;
   messages.push({id:event.getId()!,text:content.body,mine:event.getSender()===client.getUserId(),createdAt:event.getTs(),failed:false});
  }
  const unique=[...new Map(messages.map(message=>[message.id,message])).values()];
  const transport=client.getSyncState()??'connecting',roomReady=room?.getMyMembership()==='join'&&room?.getMember(state.peer?.matrixUserId??'')?.membership==='join'&&room?.currentState.getStateEvents('m.room.encryption','')?.getContent().algorithm==='m.megolm.v1.aes-sha2';if(JSON.stringify(unique)!==JSON.stringify(state.messages)||transport!==state.transport||roomReady!==state.roomReady)publish({messages:unique,transport,roomReady});
 }
 const timer=setInterval(project,300);
 async function guard(epoch:number){
  const selected=state.peer,roomId=state.roomId;if(!selected||!roomId)throw new Error('Open a contact conversation first.');
  const peer=await resolvePeer(selected.accountId);requireCurrent(epoch);if(peer.matrixUserId!==selected.matrixUserId||!peer.devices.length)throw new Error('Contact or device authorization changed.');
  await trackAuthorizedMatrixPeer(client,peer.matrixUserId,true);requireCurrent(epoch);
  const crypto=client.getCrypto();if(!crypto)throw new Error('Messaging encryption is unavailable.');
  const devices=await crypto.getUserDeviceInfo([peer.matrixUserId],true);requireCurrent(epoch);
  for(const {deviceId} of peer.devices){if(!devices.get(peer.matrixUserId)?.has(deviceId)||(await crypto.getDeviceVerificationStatus(peer.matrixUserId,deviceId))?.isVerified()!==true)throw new Error('Verify every active contact device before sending.');requireCurrent(epoch);}
  const room=client.getRoom(roomId),encryption=room?.currentState.getStateEvents('m.room.encryption','')?.getContent();
  if(!room||encryption?.algorithm!=='m.megolm.v1.aes-sha2'||!await crypto.isEncryptionEnabledInRoom(roomId))throw new Error('This conversation has no confirmed encrypted room state.');requireCurrent(epoch);
  const members=room.getMembers().filter(member=>['join','invite'].includes(member.membership??''));
  if(room.getMyMembership()!=='join'||room.getMember(peer.matrixUserId)?.membership!=='join'||members.length!==2||members.some(member=>![client.getUserId(),peer.matrixUserId].includes(member.userId)))throw new Error('Wait for both contacts to join the private room.');
  // Recheck authorization after SDK/network waits. Every send gets a fresh outbound session.
  const latest=await resolvePeer(peer.accountId);requireCurrent(epoch);
  if(latest.matrixUserId!==peer.matrixUserId||JSON.stringify(latest.devices.map(d=>d.deviceId).sort())!==JSON.stringify(peer.devices.map(d=>d.deviceId).sort()))throw new Error('Contact devices changed. Verify the current devices before retrying.');
  return {roomId,crypto,devices:JSON.stringify(peer.devices.map(device=>device.deviceId).sort())};
 }
 return {
  subscribe(listener:(state:ConversationSnapshot)=>void){listeners.add(listener);listener(state);return()=>{listeners.delete(listener);};},
  open(accountId:string){return track(async()=>{if(closed||busy)throw new Error('Wait for the current messaging operation.');busy=true;const epoch=++version;publish({busy:true,error:undefined,messages:[],roomId:undefined,peer:undefined});try{const peer=await resolvePeer(accountId);requireCurrent(epoch);const {roomId}=await bootstrap(accountId);requireCurrent(epoch);await client.joinRoom(roomId);requireCurrent(epoch);publish({peer,roomId});await enableSync();requireCurrent(epoch);project();}catch(reason){if(!closed&&version===epoch)publish({error:reason instanceof Error?reason.message:'Conversation setup failed.'});throw reason;}finally{busy=false;if(!closed&&version===epoch)publish({busy:false});}});},
  send(text:string){return track(async()=>{if(closed||busy)throw new Error('Wait for the current messaging operation.');if(!text.trim()||new TextEncoder().encode(text).length>16384)throw new Error('Enter a message of at most 16 KiB.');busy=true;const epoch=version;publish({busy:true,error:undefined});try{if(!['PREPARED','SYNCING'].includes(client.getSyncState()??''))throw new Error('Messaging is reconnecting. Your draft was not sent.');const {roomId,crypto,devices}=await guard(epoch);
   if(retry&&(retry.roomId!==roomId||retry.text!==text||retry.devices!==devices))throw new Error('An uncertain send is pending. Keep the same draft and devices, or stop messaging and inspect history before sending anything else.');
   if(retry&&retry.attempts>=3)throw new Error('The three-attempt retry limit was reached. Stop messaging and inspect history before another send.');
   if(!retry){await crypto.forceDiscardSession(roomId);requireCurrent(epoch);const checked=await guard(epoch);if(checked.devices!==devices)throw new Error('Contact devices changed while rotating encryption.');retry={roomId,text,devices,transaction:'locat_'+globalThis.crypto.randomUUID(),attempts:0};}
   const pendingSend=retry;pendingSend.attempts++;let result;
   try{if(pendingSend.attempts>1){if(!pendingSend.event)throw new Error('The original SDK event is unavailable; automatic replay is blocked.');result=pendingSend.event.getId()?.startsWith('$')?{event_id:pendingSend.event.getId()!}:await client.resendEvent(pendingSend.event,client.getRoom(roomId)!);}else result=await client.sendTextMessage(roomId,text,pendingSend.transaction);}
   catch(reason){const room=client.getRoom(roomId);const pendingEvents:MatrixEvent[]=[];try{pendingEvents.push(...(room?.getPendingEvents()??[]));}catch{/* Chronological rooms keep pending events on their timeline. */}pendingEvents.push(...(room?.getLiveTimeline().getEvents()??[]));pendingSend.event=pendingEvents.find(event=>event.getTxnId()===pendingSend.transaction);if(pendingSend.event?.getId()?.startsWith('$'))result={event_id:pendingSend.event.getId()!};else throw reason;}
   requireCurrent(epoch);retry=null;project();return {eventId:result.event_id};}catch(reason){if(!closed&&version===epoch)publish({error:'Send was not confirmed. Check the conversation before retrying; a server-accepted message may still arrive. '+(reason instanceof Error?reason.message:'Encryption failed.')});throw reason;}finally{busy=false;if(!closed&&version===epoch)publish({busy:false});}});},
  async close(){if(closed)return;closed=true;version++;clearInterval(timer);retry=null;listeners.clear();await Promise.allSettled([...pending]);},
 };
}
export type MatrixConversationSession=ReturnType<typeof createMatrixConversationSession>;
