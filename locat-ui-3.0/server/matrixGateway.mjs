import {verificationSyncFilter,verificationEventTypes} from '../shared/matrixVerificationProfile.mjs';
import {verificationRoute,validateMatrixVerification} from './matrixVerification.mjs';
import {matrixTokenHash} from './matrixBinding.mjs';
import {createRateLimiter} from './rateLimit.mjs';
const fail=(status,message)=>{throw Object.assign(new Error(message),{status});};
/** Deliberately limited to crypto/session bootstrap. Conversation sending and media are gated. */
export function createMatrixGateway({provider,store,sessionUser,sessionToken,deviceActor,body,json}){
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
  const filterPath='/_matrix/client/v3/user/'+encodeURIComponent(binding.matrixUserId)+'/filter';
  const ownFilter=req.method==='POST'?path===filterPath:req.method==='GET'&&path.startsWith(filterPath+'/')&&/^[A-Za-z0-9_-]{1,128}$/.test(path.slice(filterPath.length+1));
  const allowed=(ownFilter&&['GET','POST'].includes(req.method))||verification|| (req.method==='GET'?['/_matrix/client/v3/capabilities','/_matrix/client/v3/pushrules/','/_matrix/client/versions','/_matrix/client/v3/account/whoami','/_matrix/client/v3/sync','/_matrix/client/v3/keys/changes','/_matrix/client/v3/room_keys/version'].includes(path):['/_matrix/client/v3/keys/upload','/_matrix/client/v3/keys/query','/_matrix/client/v3/keys/claim'].includes(path)&&req.method==='POST');
  if(!allowed)fail(501,'This Matrix endpoint is gated until its Locat integration is accepted');
  const retryAfter=limit(user.id);if(retryAfter)throw Object.assign(new Error('Matrix bootstrap rate limit exceeded'),{status:429,retryAfter});
  if((active.get(user.id)??0)>=8)fail(429,'Matrix bootstrap connection limit exceeded');
  const queriedPeers=new Set();let verificationTarget;
  let input;if(req.method!=='GET'){input=await body(req,verification?16384:ownFilter?4096:1024*1024);if(!input||typeof input!=='object'||Array.isArray(input))fail(400,'Invalid Matrix request');
   if(ownFilter)input=verificationSyncFilter();
   if(verification){if(url.search)fail(400,'Verification transport does not accept query parameters');verificationTarget=validateMatrixVerification(verification.event,input,binding);if(!store.permitsMatrixDevice?.(user.id,verificationTarget.userId,verificationTarget.deviceId))fail(403,'Verification recipient must be an active bound device of this account or an accepted contact');}
   if(path.endsWith('/keys/query')||path.endsWith('/keys/claim')){
    const users=input[path.endsWith('/keys/query')?'device_keys':'one_time_keys'];if(!users||typeof users!=='object'||Array.isArray(users)||Object.keys(users).length>50)fail(400,'Invalid or oversized Matrix device-key lookup');
    for(const matrixUserId of Object.keys(users)){if(matrixUserId===binding.matrixUserId)continue;if(!store.permitsMatrixPeer?.(user.id,matrixUserId))fail(403,'Matrix key lookup requires an accepted, unblocked Locat contact');queriedPeers.add(matrixUserId);}
   }
   if(path.endsWith('/keys/upload')&&input.device_keys){const device=input.device_keys,keys=JSON.parse(binding.publicKeys);if(device.user_id!==binding.matrixUserId||device.device_id!==binding.matrixDeviceId||(typeof device.keys?.['ed25519:'+binding.matrixDeviceId]==='string'?device.keys['ed25519:'+binding.matrixDeviceId].replace(/=+$/,''):null)!==keys.ed25519||(typeof device.keys?.['curve25519:'+binding.matrixDeviceId]==='string'?device.keys['curve25519:'+binding.matrixDeviceId].replace(/=+$/,''):null)!==keys.curve25519)fail(409,'Matrix device upload differs from the bound public keys');}
  }
  // Body reads and upstream calls can overlap logout/revocation. Recheck before forwarding and returning.
  const check=()=>{if(verificationTarget&&!store.permitsMatrixDevice?.(user.id,verificationTarget.userId,verificationTarget.deviceId))fail(403,'Verification recipient authorization changed');for(const peer of queriedPeers)if(!store.permitsMatrixPeer?.(user.id,peer))fail(403,'Messaging contact authorization changed');if(sessionUser(req)?.id!==user.id||deviceActor(req,user.id,session)!==actor)fail(401,'Locat authorization changed');store.authorize(user.id,actor,matrixTokenHash(session),token);};check();
  const controller=new AbortController(),deadline=setTimeout(()=>controller.abort(),verification?10000:65000);const closed=()=>controller.abort();res.once('close',closed);active.set(user.id,(active.get(user.id)??0)+1);
  try{
   const upstreamQuery=new URLSearchParams(url.search);if(path==='/_matrix/client/v3/sync'){upstreamQuery.set('filter',JSON.stringify(verificationSyncFilter()));upstreamQuery.set('set_presence','offline');}
   let response;try{response=await fetch(provider.origin+path+(upstreamQuery.size?'?'+upstreamQuery.toString():''),{method:req.method,headers:{Authorization:'Bearer '+token,Accept:'application/json',...(input?{'Content-Type':'application/json'}:{})},body:input?JSON.stringify(input):undefined,redirect:'error',signal:controller.signal});}catch{fail(502,'Matrix bootstrap service is unavailable');}
   const reader=response.body?.getReader();if(!reader)fail(502,'Invalid Matrix bootstrap response');let size=0;const chunks=[];
   try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>2*1024*1024)fail(502,'Matrix bootstrap response exceeds the limit');chunks.push(value);}}catch(error){if(error.status)throw error;fail(502,'Matrix bootstrap response interrupted');}finally{await reader.cancel();}
   let value;try{value=JSON.parse(new TextDecoder('utf8',{fatal:true}).decode(Buffer.concat(chunks)));}catch{fail(502,'Invalid Matrix bootstrap JSON');}check();
   if(response.ok&&path==='/_matrix/client/v3/sync'){if(!value||typeof value!=='object'||Array.isArray(value))fail(502,'Invalid verification sync response');value.rooms={};value.presence={events:[]};value.account_data={events:[]};const events=value.to_device?.events;if(events!==undefined&&!Array.isArray(events))fail(502,'Invalid verification events');value.to_device={events:(events??[]).filter(event=>event&&verificationEventTypes.has(event.type)&&(event.sender===binding.matrixUserId||store.permitsMatrixPeer?.(user.id,event.sender)))};}
   json(res,response.status,value);return true;
  }finally{clearTimeout(deadline);res.off('close',closed);const count=(active.get(user.id)??1)-1;if(count)active.set(user.id,count);else active.delete(user.id);}
 };
}
