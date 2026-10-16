import {validConversationRoomId} from './matrixConversationTransport.mjs';
import {randomUUID} from 'node:crypto';
import {matrixTokenHash} from './matrixBinding.mjs';
const fail=(status,message)=>{throw Object.assign(new Error(message),{status});};
/** Durable pair reservation: an interrupted upstream create is never blindly replayed. */
export function matrixConversationStore(sql,bindings){
 const pair=(a,b)=>[a,b].sort();
 const contact=(a,b)=>{if(a===b||!bindings.permitsMatrixPeer(a,sql.prepare('SELECT matrixUserId FROM matrixAccounts WHERE userId=?').get(b)?.matrixUserId))fail(403,'An accepted, unblocked messaging contact is required');};
 return {
  reserve(userId,actor,peerId){bindings.peer(userId,actor,peerId);contact(userId,peerId);const [low,high]=pair(userId,peerId);const existing=sql.prepare('SELECT * FROM matrixConversations WHERE lowId=? AND highId=?').get(low,high);if(existing)return {...existing,created:false};const operationId=randomUUID();const inserted=sql.prepare("INSERT INTO matrixConversations(lowId,highId,operationId,status,createdAt) VALUES(?,?,?,'pending',?) ON CONFLICT(lowId,highId) DO NOTHING").run(low,high,operationId,Date.now());if(!inserted.changes)return {...sql.prepare('SELECT * FROM matrixConversations WHERE lowId=? AND highId=?').get(low,high),created:false};return {lowId:low,highId:high,operationId,status:'pending',created:true};},
  complete(operationId,roomId){if(typeof roomId!=='string'||!validConversationRoomId(roomId))fail(502,'Invalid encrypted room response');const result=sql.prepare("UPDATE matrixConversations SET roomId=?,status='ready' WHERE operationId=? AND status='pending'").run(roomId,operationId);if(result.changes!==1)fail(409,'Conversation reservation changed');},
  permits(userId,roomId){const row=sql.prepare("SELECT lowId,highId FROM matrixConversations WHERE roomId=? AND status='ready' AND (lowId=? OR highId=?)").get(roomId,userId,userId);if(!row)return false;try{contact(userId,row.lowId===userId?row.highId:row.lowId);return true;}catch{return false;}},
 };
}
export async function createPrivateMatrixConversation({provider,store,bindings,userId,actor,session,input,recheck}){
 if(!provider)fail(503,'Matrix sidecar is not configured');
 if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(key=>!['accountId','accessToken'].includes(key))||typeof input.accountId!=='string'||!/^[a-f0-9]{32}$/.test(input.accountId)||typeof input.accessToken!=='string'||!/^[A-Za-z0-9._~+/=-]{16,8192}$/.test(input.accessToken))fail(400,'Choose one messaging contact and a bound Matrix session');
 const authorize=()=>{recheck();return bindings.authorize(userId,actor,matrixTokenHash(session),input.accessToken);};
 authorize();const peer=bindings.peer(userId,actor,input.accountId),reservation=store.reserve(userId,actor,input.accountId);
 if(!reservation.created){if(reservation.status!=='ready')fail(409,'Conversation setup is pending reconciliation; it was not replayed');authorize();return {roomId:reservation.roomId,created:false};}
 // Only the server chooses membership, encryption and power levels. No browser room state is accepted.
 const payload={room_version:'12',visibility:'private',preset:'private_chat',is_direct:true,invite:[peer.matrixUserId],creation_content:{'m.federate':false},initial_state:[{type:'m.room.encryption',state_key:'',content:{algorithm:'m.megolm.v1.aes-sha2',rotation_period_msgs:100,rotation_period_ms:3600000}},{type:'m.room.history_visibility',state_key:'',content:{history_visibility:'joined'}}],power_level_content_override:{users:{[peer.matrixUserId]:0},users_default:0,events_default:0,state_default:100,invite:100,kick:100,ban:100,redact:100,events:{'m.room.encryption':100,'m.room.power_levels':100,'m.room.history_visibility':100}}};
 let response;try{response=await fetch(provider.origin+'/_matrix/client/v3/createRoom',{method:'POST',headers:{Authorization:'Bearer '+input.accessToken,'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify(payload),redirect:'error',signal:AbortSignal.timeout(15000)});}catch{fail(502,'Encrypted conversation setup was not confirmed; retry will not create another room');}
 const reader=response.body?.getReader();if(!reader)fail(502,'Encrypted conversation setup returned no result');let size=0;const chunks=[];
 try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>32768)fail(502,'Encrypted conversation response exceeds the limit');chunks.push(value);}}catch(error){if(error.status)throw error;fail(502,'Encrypted conversation response was interrupted');}finally{await reader.cancel();}
 if(!response.ok){let code;try{code=JSON.parse(Buffer.concat(chunks).toString('utf8')).errcode;}catch{}fail(502,'Encrypted conversation setup was not confirmed ('+response.status+(typeof code==='string'&&/^M_[A-Z_]{1,64}$/.test(code)?', '+code:'')+')');}let value;try{value=JSON.parse(new TextDecoder('utf8',{fatal:true}).decode(Buffer.concat(chunks)));}catch{fail(502,'Invalid encrypted conversation response');}
 // Save a confirmed room even if authorization changed while upstream was running. It remains inaccessible.
 store.complete(reservation.operationId,value?.room_id);authorize();bindings.peer(userId,actor,input.accountId);
 return {roomId:value.room_id,created:true};
}
