const fail=(status,message)=>{throw Object.assign(new Error(message),{status});};
export const validConversationRoomId=value=>typeof value==='string'&&(/^![A-Za-z0-9_-]{43}$/.test(value)||/^![^\s/:]{1,254}:[^\s/]{1,255}$/.test(value));
/** Canonical room paths only; aliases, state writes, invites and plaintext sends are excluded. */
export function conversationRoute(path,method){
 const redact=/^\/_matrix\/client\/v3\/rooms\/([^/]+)\/redact\/([^/]+)\/([A-Za-z0-9_][A-Za-z0-9_.-]{0,127})$/.exec(path);
 if(redact&&method==='PUT'){
  let roomId,eventId;try{roomId=decodeURIComponent(redact[1]);eventId=decodeURIComponent(redact[2]);}catch{return null;}
  if(encodeURIComponent(roomId)!==redact[1]||!validConversationRoomId(roomId)||encodeURIComponent(eventId)!==redact[2]||!/^\$[A-Za-z0-9._~+=/-]{1,255}$/.test(eventId))return null;
  return {roomId,action:'redact',eventId};
 }
 const typing=/^\/_matrix\/client\/v3\/rooms\/([^/]+)\/typing\/([^/]+)$/.exec(path);
 if(typing&&method==='PUT'){
  let roomId,userId;try{roomId=decodeURIComponent(typing[1]);userId=decodeURIComponent(typing[2]);}catch{return null;}
  if(encodeURIComponent(roomId)!==typing[1]||!validConversationRoomId(roomId)||encodeURIComponent(userId)!==typing[2]||!/^@[^\s/:]{1,255}:[^\s/]{1,255}$/.test(userId))return null;
  return {roomId,action:'typing',userId};
 }
 const receipt=/^\/_matrix\/client\/v3\/rooms\/([^/]+)\/receipt\/m\.read\/([^/]+)$/.exec(path);
 if(receipt&&method==='POST'){
  let roomId,eventId;try{roomId=decodeURIComponent(receipt[1]);eventId=decodeURIComponent(receipt[2]);}catch{return null;}
  if(encodeURIComponent(roomId)!==receipt[1]||!validConversationRoomId(roomId)||encodeURIComponent(eventId)!==receipt[2]||!/^\$[A-Za-z0-9._~+=/-]{1,255}$/.test(eventId))return null;
  return {roomId,action:'receipt',eventId};
 }
 const match=/^\/_matrix\/client\/v3\/(?:rooms\/([^/]+)\/(join|state|members|joined_members|messages|send\/m\.room\.encrypted\/([A-Za-z0-9_][A-Za-z0-9_.-]{0,127}))|join\/([^/]+))$/.exec(path);if(!match)return null;
 let roomId;const encoded=match[1]??match[4];try{roomId=decodeURIComponent(encoded);}catch{return null;}
 if(encodeURIComponent(roomId)!==encoded||!validConversationRoomId(roomId))return null;
 const action=match[4]?'join':match[2];
 if(action==='join'&&method==='POST'||action.startsWith('send/')&&method==='PUT'||['state','members','joined_members','messages'].includes(action)&&method==='GET')return {roomId,action};
 return null;
}
export function validateConversationRequest(route,input,query){
 if(route.action==='redact'){if(query.size||Object.keys(input).length)fail(400,'Message deletion does not accept extra fields');return;}
 if(route.action==='typing'){if(query.size||Object.keys(input).some(key=>!['typing','timeout'].includes(key))||typeof input.typing!=='boolean'||input.typing&&( !Number.isSafeInteger(input.timeout)||input.timeout<1000||input.timeout>30000)||!input.typing&&input.timeout!==undefined)fail(400,'Invalid typing indicator metadata');return;}
 if(route.action==='receipt'){if(query.size||Object.keys(input).some(key=>key!=='thread_id')||input.thread_id!==undefined&&(typeof input.thread_id!=='string'||input.thread_id!=='main'&&!/^\$[A-Za-z0-9._~+=/:!-]{1,255}$/.test(input.thread_id)))fail(400,'Invalid read receipt metadata');return;}
 if(route.action==='members'){
  for(const key of query.keys())if(!['at','membership','not_membership'].includes(key)||query.getAll(key).length!==1)fail(400,'Invalid room membership query');
  if(query.has('at')&&(query.get('at').length>2048||/[\x00-\x1f\x7f]/.test(query.get('at'))))fail(400,'Invalid membership cursor');
  for(const key of ['membership','not_membership'])if(query.has(key)&&!['join','invite','leave','ban','knock'].includes(query.get(key)))fail(400,'Invalid membership selection');return;
 }
 if(route.action==='messages'){
  const allowed=new Set(['from','to','dir','limit','filter']);for(const key of query.keys())if(!allowed.has(key)||query.getAll(key).length!==1)fail(400,'Invalid encrypted history query');
  if(!['b','f'].includes(query.get('dir')??''))fail(400,'Choose a history direction');
  if(query.has('limit')&&!/^(?:[1-9]|[1-4][0-9]|50)$/.test(query.get('limit')))fail(400,'History page limit is 50');
  for(const key of ['from','to'])if(query.has(key)&&(query.get(key).length>2048||/[\x00-\x1f\x7f]/.test(query.get(key))))fail(400,'Invalid history cursor');
  // Do not forward a caller-provided plaintext/event filter.
  query.set('limit',query.get('limit')??'50');query.set('filter',JSON.stringify({types:['m.room.encrypted']}));return;
 }
 if(query.size)fail(400,'Conversation operation does not accept query parameters');
 if(route.action==='join'){if(Object.keys(input).length)fail(400,'Join does not accept caller-chosen membership fields');return;}
 if(!route.action.startsWith('send/'))return;
 if(Object.keys(input).some(key=>!['algorithm','sender_key','ciphertext','session_id','device_id'].includes(key))||input.algorithm!=='m.megolm.v1.aes-sha2')fail(400,'Only standard encrypted Megolm room events are accepted');
 for(const key of ['sender_key','ciphertext','session_id','device_id'])if(typeof input[key]!=='string'||!input[key]||input[key].length>(key==='ciphertext'?65536:255))fail(400,'Invalid encrypted room event');
 for(const key of ['sender_key','ciphertext','session_id'])if(!/^[A-Za-z0-9+/]+={0,2}$/.test(input[key]))fail(400,'Invalid encrypted room event encoding');
}
