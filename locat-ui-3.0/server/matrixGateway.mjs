import {scopedConversationRooms} from './matrixConversationSync.mjs';
import {encryptedToDeviceRoute,validateEncryptedToDevice,withheldToDeviceRoute,validateWithheldToDevice} from './matrixEncryptedToDevice.mjs';
import {conversationRoute,validateConversationRequest} from './matrixConversationTransport.mjs';
import {verificationSyncFilter,verificationEventTypes} from '../shared/matrixVerificationProfile.mjs';
import {verificationRoute,validateMatrixVerification} from './matrixVerification.mjs';
import {matrixTokenHash} from './matrixBinding.mjs';
import {createRateLimiter} from './rateLimit.mjs';
const fail=(status,message)=>{throw Object.assign(new Error(message),{status});};
/** Deliberately limited to crypto/session bootstrap. Conversation sending and media are gated. */
export function createMatrixGateway({provider,store,conversations,sessionUser,sessionToken,deviceActor,body,json}){
 const limit=createRateLimiter(240),active=new Map();
 return async(req,res,url,origin)=>{
  if(!url.pathname.startsWith('/_matrix/'))return false;
  const user=sessionUser(req),session=sessionToken(req);if(!user||!session)fail(401,'Locat authentication required');
  if(!provider)fail(503,'Matrix sidecar is not configured');
  if(!['GET','POST','PUT'].includes(req.method))fail(405,'Method not enabled in the Matrix bootstrap gateway');
  if(req.method!=='GET'&&req.headers.origin!==origin)fail(403,'Origin mismatch');
  if(url.searchParams.has('access_token'))fail(400,'Matrix tokens must not appear in URLs');
  const token=/^Bearer ([A-Za-z0-9._~+/=-]{16,8192})$/.exec(req.headers.authorization??'')?.[1];if(!token)fail(401,'Matrix bearer session required');
  const actor=deviceActor(req,user.id,session),binding=store.authorize(user.id,actor,matrixTokenHash(session),token);
  const path=url.pathname,verification=req.method==='PUT'?verificationRoute(url.pathname):null;
  const conversationSync=url.searchParams.has('locat_conversations');
  if(conversationSync&&(path!=='/_matrix/client/v3/sync'||req.method!=='GET'||url.searchParams.getAll('locat_conversations').length!==1||url.searchParams.get('locat_conversations')!=='1'))fail(400,'Invalid conversation sync selection');
  const syncRooms=conversationSync?conversations?.rooms(user.id):[];if(conversationSync&&!syncRooms)fail(503,'Conversation sync is unavailable');
  const encryptedDelivery=encryptedToDeviceRoute(path,req.method),withheldDelivery=withheldToDeviceRoute(path,req.method);
  const conversation=conversationRoute(path,req.method);
  if(conversation&&!conversations?.permits(user.id,conversation.roomId))fail(403,'Conversation is unavailable to this contact');
  const filterPath='/_matrix/client/v3/user/'+encodeURIComponent(binding.matrixUserId)+'/filter';
  const ownFilter=req.method==='POST'?path===filterPath:req.method==='GET'&&path.startsWith(filterPath+'/')&&/^[A-Za-z0-9_-]{1,128}$/.test(path.slice(filterPath.length+1));
  const allowed=withheldDelivery||encryptedDelivery||conversation||(ownFilter&&['GET','POST'].includes(req.method))||verification|| (req.method==='GET'?['/_matrix/client/v3/capabilities','/_matrix/client/v3/pushrules/','/_matrix/client/versions','/_matrix/client/v3/account/whoami','/_matrix/client/v3/sync','/_matrix/client/v3/keys/changes','/_matrix/client/v3/room_keys/version'].includes(path):['/_matrix/client/v3/keys/upload','/_matrix/client/v3/keys/query','/_matrix/client/v3/keys/claim'].includes(path)&&req.method==='POST');
  if(!allowed)fail(501,'This Matrix endpoint is gated until its Locat integration is accepted');
  const retryAfter=limit(user.id);if(retryAfter)throw Object.assign(new Error('Matrix bootstrap rate limit exceeded'),{status:429,retryAfter});
  if((active.get(user.id)??0)>=8)fail(429,'Matrix bootstrap connection limit exceeded');
  const queriedPeers=new Set();let verificationTarget,encryptedTargets=[];
  let input;if(req.method!=='GET'){input=await body(req,verification?16384:withheldDelivery?65536:encryptedDelivery?524288:conversation?98304:ownFilter?4096:1024*1024);if(!input||typeof input!=='object'||Array.isArray(input))fail(400,'Invalid Matrix request');
   if(withheldDelivery){if(url.search)fail(400,'Withheld notification does not accept query parameters');encryptedTargets=validateWithheldToDevice(input,binding,(target,device)=>store.matrixDeviceKeys?.(user.id,target,device),room=>conversations?.permits(user.id,room));}
   if(encryptedDelivery){if(url.search)fail(400,'Encrypted device delivery does not accept query parameters');encryptedTargets=validateEncryptedToDevice(input,binding,(target,device)=>store.matrixDeviceKeys?.(user.id,target,device));}
   if(conversation?.action.startsWith('send/')&&(input.device_id!==binding.matrixDeviceId||typeof input.sender_key!=='string'||input.sender_key.replace(/=+$/,'')!==JSON.parse(binding.publicKeys).curve25519))fail(409,'Encrypted event device differs from the bound device');
   if(ownFilter)input=verificationSyncFilter();
   if(verification){if(url.search)fail(400,'Verification transport does not accept query parameters');verificationTarget=validateMatrixVerification(verification.event,input,binding);if(!store.permitsMatrixDevice?.(user.id,verificationTarget.userId,verificationTarget.deviceId))fail(403,'Verification recipient must be an active bound device of this account or an accepted contact');}
   if(path.endsWith('/keys/query')||path.endsWith('/keys/claim')){
    const users=input[path.endsWith('/keys/query')?'device_keys':'one_time_keys'];if(!users||typeof users!=='object'||Array.isArray(users)||Object.keys(users).length>50)fail(400,'Invalid or oversized Matrix device-key lookup');
    for(const matrixUserId of Object.keys(users)){if(matrixUserId===binding.matrixUserId)continue;if(!store.permitsMatrixPeer?.(user.id,matrixUserId))fail(403,'Matrix key lookup requires an accepted, unblocked Locat contact');queriedPeers.add(matrixUserId);}
   }
   if(path.endsWith('/keys/upload')&&input.device_keys){const device=input.device_keys,keys=JSON.parse(binding.publicKeys);if(device.user_id!==binding.matrixUserId||device.device_id!==binding.matrixDeviceId||(typeof device.keys?.['ed25519:'+binding.matrixDeviceId]==='string'?device.keys['ed25519:'+binding.matrixDeviceId].replace(/=+$/,''):null)!==keys.ed25519||(typeof device.keys?.['curve25519:'+binding.matrixDeviceId]==='string'?device.keys['curve25519:'+binding.matrixDeviceId].replace(/=+$/,''):null)!==keys.curve25519)fail(409,'Matrix device upload differs from the bound public keys');}
  }
  const upstreamQuery=new URLSearchParams(url.search);if(conversation)validateConversationRequest(conversation,input,upstreamQuery);
  // Body reads and upstream calls can overlap logout/revocation. Recheck before forwarding and returning.
  const check=()=>{if(conversationSync&&syncRooms.some(room=>!conversations.permits(user.id,room)))fail(403,'Conversation sync authorization changed');for(const target of encryptedTargets)if(store.matrixDeviceKeys?.(user.id,target.userId,target.deviceId)?.curve25519!==target.curve25519)fail(403,'Encrypted recipient authorization changed');if(conversation&&!conversations?.permits(user.id,conversation.roomId))fail(403,'Conversation authorization changed');if(verificationTarget&&!store.permitsMatrixDevice?.(user.id,verificationTarget.userId,verificationTarget.deviceId))fail(403,'Verification recipient authorization changed');for(const peer of queriedPeers)if(!store.permitsMatrixPeer?.(user.id,peer))fail(403,'Messaging contact authorization changed');if(sessionUser(req)?.id!==user.id||deviceActor(req,user.id,session)!==actor)fail(401,'Locat authorization changed');store.authorize(user.id,actor,matrixTokenHash(session),token);};check();
  const controller=new AbortController(),deadline=setTimeout(()=>controller.abort(),verification||conversation||encryptedDelivery||withheldDelivery?15000:65000);const closed=()=>controller.abort();res.once('close',closed);active.set(user.id,(active.get(user.id)??0)+1);
  try{
   if(path==='/_matrix/client/v3/sync'){const filter=verificationSyncFilter();if(conversationSync){filter.room={rooms:syncRooms,timeline:{limit:50,types:['m.room.encrypted','m.room.member','m.room.encryption','m.room.create','m.room.power_levels','m.room.join_rules','m.room.history_visibility']},ephemeral:{types:[]},account_data:{types:[]}};upstreamQuery.delete('locat_conversations');}upstreamQuery.set('filter',JSON.stringify(filter));upstreamQuery.set('set_presence','offline');}
   let response;try{response=await fetch(provider.origin+path+(upstreamQuery.size?'?'+upstreamQuery.toString():''),{method:req.method,headers:{Authorization:'Bearer '+token,Accept:'application/json',...(input?{'Content-Type':'application/json'}:{})},body:input?JSON.stringify(input):undefined,redirect:'error',signal:controller.signal});}catch{fail(502,'Matrix bootstrap service is unavailable');}
   const reader=response.body?.getReader();if(!reader)fail(502,'Invalid Matrix bootstrap response');let size=0;const chunks=[];
   try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>2*1024*1024)fail(502,'Matrix bootstrap response exceeds the limit');chunks.push(value);}}catch(error){if(error.status)throw error;fail(502,'Matrix bootstrap response interrupted');}finally{await reader.cancel();}
   let value;try{value=JSON.parse(new TextDecoder('utf8',{fatal:true}).decode(Buffer.concat(chunks)));}catch{fail(502,'Invalid Matrix bootstrap JSON');}check();
   if(response.ok&&path==='/_matrix/client/v3/keys/query'&&store.matrixDeviceKeys){if(!value?.device_keys||typeof value.device_keys!=='object'||Array.isArray(value.device_keys))fail(502,'Invalid device key response');for(const [target,devices] of Object.entries(value.device_keys)){if(!devices||typeof devices!=='object'||Array.isArray(devices))fail(502,'Invalid device key response');value.device_keys[target]=Object.fromEntries(Object.entries(devices).filter(([device,record])=>{const pins=store.matrixDeviceKeys(user.id,target,device);if(!pins)return false;if(record?.user_id!==target||record?.device_id!==device||typeof record.keys?.['ed25519:'+device]!=='string'||typeof record.keys?.['curve25519:'+device]!=='string'||record.keys['ed25519:'+device].replace(/=+$/,'')!==pins.ed25519||record.keys['curve25519:'+device].replace(/=+$/,'')!==pins.curve25519)fail(409,'Matrix recipient keys differ from the bound device');return true;}));}}
   if(response.ok&&path==='/_matrix/client/v3/sync'){if(!value||typeof value!=='object'||Array.isArray(value))fail(502,'Invalid verification sync response');if(conversationSync)value.rooms=scopedConversationRooms(value.rooms,syncRooms);else value.rooms={};value.presence={events:[]};value.account_data={events:[]};const events=value.to_device?.events;if(events!==undefined&&!Array.isArray(events))fail(502,'Invalid verification events');value.to_device={events:(events??[]).filter(event=>event&&(verificationEventTypes.has(event.type)&&(event.sender===binding.matrixUserId||store.permitsMatrixPeer?.(user.id,event.sender))||conversationSync&&(event.type==='m.room.encrypted'&&event.content?.algorithm==='m.olm.v1.curve25519-aes-sha2'||event.type==='m.room_key.withheld'&&event.content?.algorithm==='m.megolm.v1.aes-sha2'&&(!event.content.room_id||conversations.permits(user.id,event.content.room_id)))&&typeof event.content.sender_key==='string'&&store.permitsMatrixSenderKey?.(user.id,event.sender,event.content.sender_key)))};}
   json(res,response.status,value);return true;
  }finally{clearTimeout(deadline);res.off('close',closed);const count=(active.get(user.id)??1)-1;if(count)active.set(user.id,count);else active.delete(user.id);}
 };
}
