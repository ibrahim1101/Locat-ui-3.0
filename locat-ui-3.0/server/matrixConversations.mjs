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
  rooms(userId){const rows=sql.prepare("SELECT roomId FROM matrixConversations WHERE status='ready' AND (lowId=? OR highId=?) ORDER BY createdAt LIMIT 101").all(userId,userId);if(rows.length>100)fail(429,'Conversation sync limit exceeded');return rows.map(row=>row.roomId).filter(roomId=>this.permits(userId,roomId));},
  list(userId){const rows=sql.prepare("SELECT lowId,highId,roomId FROM matrixConversations WHERE status='ready' AND (lowId=? OR highId=?) ORDER BY createdAt DESC LIMIT 101").all(userId,userId);if(rows.length>100)fail(429,'Conversation list limit exceeded');return rows.flatMap(row=>{const accountId=row.lowId===userId?row.highId:row.lowId;try{contact(userId,accountId);const matrixUserId=sql.prepare('SELECT matrixUserId FROM matrixAccounts WHERE userId=?').get(accountId)?.matrixUserId;return typeof matrixUserId==='string'?[{accountId,roomId:row.roomId,matrixUserId}]:[];}catch{return [];}});},
  permits(userId,roomId){const row=sql.prepare("SELECT lowId,highId FROM matrixConversations WHERE roomId=? AND status='ready' AND (lowId=? OR highId=?)").get(roomId,userId,userId);if(!row)return false;try{contact(userId,row.lowId===userId?row.highId:row.lowId);return true;}catch{return false;}},
 };
}
/** Read-only reconciliation. The alias and operation marker never authorize access by themselves. */
async function inspectPendingRoom({provider,reservation,token,ownUserId,peerUserId,authorize}){
 if(typeof provider.serverName!=='string'||!provider.serverName)fail(503,'Configured Matrix server identity is required for reconciliation');
 const alias='#locat_'+reservation.operationId+':'+provider.serverName;
 async function request(path){
  authorize();let response;
  try{response=await fetch(provider.origin+path,{headers:{Authorization:'Bearer '+token,Accept:'application/json'},redirect:'error',signal:AbortSignal.timeout(10000)});}
  catch{fail(502,'Conversation reconciliation is unavailable; room creation was not replayed');}
  authorize();
  if(!response.ok){await response.body?.cancel();fail(409,'Original encrypted room could not be confirmed; room creation was not replayed');}
  const reader=response.body?.getReader();if(!reader)fail(502,'Invalid room reconciliation response');
  let size=0;const chunks=[];
  try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>32768)fail(502,'Room reconciliation response exceeds the limit');chunks.push(value);}}
  finally{await reader.cancel();}
  authorize();
  try{return JSON.parse(new TextDecoder('utf8',{fatal:true}).decode(Buffer.concat(chunks)));}
  catch{fail(502,'Invalid room reconciliation response');}
 }
 const directory=await request('/_matrix/client/v3/directory/room/'+encodeURIComponent(alias));
 if(!validConversationRoomId(directory?.room_id))fail(502,'Invalid original room identity');
 const state=await request('/_matrix/client/v3/rooms/'+encodeURIComponent(directory.room_id)+'/state');
 if(!Array.isArray(state)||state.length>100)fail(409,'Original encrypted room state could not be confirmed');
 const get=type=>{
  const events=state.filter(event=>event?.type===type&&event.state_key==='');
  if(events.length!==1)fail(409,'Original room has missing or ambiguous protected state');return events[0];
 };
 const create=get('m.room.create'),operation=get('org.locat.conversation'),encryption=get('m.room.encryption');
 const history=get('m.room.history_visibility'),join=get('m.room.join_rules'),power=get('m.room.power_levels');
 const users=new Set([ownUserId,peerUserId]),members=state.filter(event=>event?.type==='m.room.member');
 const privateState=create.content?.room_version==='12'&&create.content?.['m.federate']===false&&users.has(create.sender)
  &&operation.content?.operationId===reservation.operationId&&encryption.content?.algorithm==='m.megolm.v1.aes-sha2'
  &&history.content?.history_visibility==='joined'&&join.content?.join_rule==='invite';
 const privateMembers=members.length===2&&new Set(members.map(event=>event.state_key)).size===2
  &&members.every(event=>users.has(event.state_key)&&['join','invite'].includes(event.content?.membership))
  &&members.some(event=>event.state_key===create.sender&&event.content.membership==='join');
 if(!privateState||!privateMembers)fail(409,'Original room does not match the authorized private encrypted conversation');
 const levels=power.content,otherUser=[...users].find(id=>id!==create.sender);
 const additionalCreators=create.content.additional_creators;
 const privatePermissions=(additionalCreators===undefined||Array.isArray(additionalCreators)&&additionalCreators.length===0)
  &&[operation,encryption,history,join,power].every(event=>event.sender===create.sender)
  &&levels?.users_default===0&&levels.events_default===0&&levels.state_default===100
  &&['invite','kick','ban','redact'].every(key=>levels[key]===100)
  &&Object.keys(levels.events??{}).length===3
  &&['m.room.encryption','m.room.power_levels','m.room.history_visibility'].every(key=>levels.events?.[key]===100)
  &&Object.keys(levels.users??{}).length===1&&levels.users?.[otherUser]===0;
 if(!privatePermissions)fail(409,'Original room permissions could not be confirmed');
 authorize();return directory.room_id;
}
export async function createPrivateMatrixConversation({provider,store,bindings,userId,actor,session,input,recheck}){
 if(!provider)fail(503,'Matrix sidecar is not configured');
 if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(key=>!['accountId','accessToken'].includes(key))||typeof input.accountId!=='string'||!/^[a-f0-9]{32}$/.test(input.accountId)||typeof input.accessToken!=='string'||!/^[A-Za-z0-9._~+/=-]{16,8192}$/.test(input.accessToken))fail(400,'Choose one messaging contact and a bound Matrix session');
 const authorize=()=>{recheck();return bindings.authorize(userId,actor,matrixTokenHash(session),input.accessToken);};
 authorize();const peer=bindings.peer(userId,actor,input.accountId),reservation=store.reserve(userId,actor,input.accountId);
 if(!reservation.created){
  if(reservation.status==='ready'){authorize();return {roomId:reservation.roomId,created:false};}
  const binding=authorize();
  const roomId=await inspectPendingRoom({provider,reservation,token:input.accessToken,ownUserId:binding.matrixUserId,peerUserId:peer.matrixUserId,authorize});
  authorize();bindings.peer(userId,actor,input.accountId);store.complete(reservation.operationId,roomId);
  return {roomId,created:false};
 }
 // Only the server chooses membership, encryption and power levels. No browser room state is accepted.
 const payload={room_alias_name:'locat_'+reservation.operationId,room_version:'12',visibility:'private',preset:'private_chat',is_direct:true,invite:[peer.matrixUserId],creation_content:{'m.federate':false},initial_state:[{type:'m.room.encryption',state_key:'',content:{algorithm:'m.megolm.v1.aes-sha2',rotation_period_msgs:100,rotation_period_ms:3600000}},{type:'m.room.history_visibility',state_key:'',content:{history_visibility:'joined'}},{type:'org.locat.conversation',state_key:'',content:{operationId:reservation.operationId}}],power_level_content_override:{users:{[peer.matrixUserId]:0},users_default:0,events_default:0,state_default:100,invite:100,kick:100,ban:100,redact:100,events:{'m.room.encryption':100,'m.room.power_levels':100,'m.room.history_visibility':100}}};
 let response;try{response=await fetch(provider.origin+'/_matrix/client/v3/createRoom',{method:'POST',headers:{Authorization:'Bearer '+input.accessToken,'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify(payload),redirect:'error',signal:AbortSignal.timeout(15000)});}catch{fail(502,'Encrypted conversation setup was not confirmed; retry will not create another room');}
 const reader=response.body?.getReader();if(!reader)fail(502,'Encrypted conversation setup returned no result');let size=0;const chunks=[];
 try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>32768)fail(502,'Encrypted conversation response exceeds the limit');chunks.push(value);}}catch(error){if(error.status)throw error;fail(502,'Encrypted conversation response was interrupted');}finally{await reader.cancel();}
 if(!response.ok){let code;try{code=JSON.parse(Buffer.concat(chunks).toString('utf8')).errcode;}catch{}fail(502,'Encrypted conversation setup was not confirmed ('+response.status+(typeof code==='string'&&/^M_[A-Z_]{1,64}$/.test(code)?', '+code:'')+')');}let value;try{value=JSON.parse(new TextDecoder('utf8',{fatal:true}).decode(Buffer.concat(chunks)));}catch{fail(502,'Invalid encrypted conversation response');}
 // Save a confirmed room even if authorization changed while upstream was running. It remains inaccessible.
 store.complete(reservation.operationId,value?.room_id);authorize();bindings.peer(userId,actor,input.accountId);
 return {roomId:value.room_id,created:true};
}
