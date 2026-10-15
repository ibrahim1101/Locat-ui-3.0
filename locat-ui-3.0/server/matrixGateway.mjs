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
  if(!['GET','POST'].includes(req.method))fail(405,'Method not enabled in the Matrix bootstrap gateway');
  if(req.method==='POST'&&req.headers.origin!==origin)fail(403,'Origin mismatch');
  if(url.searchParams.has('access_token'))fail(400,'Matrix tokens must not appear in URLs');
  const token=/^Bearer ([A-Za-z0-9._~+/=-]{16,8192})$/.exec(req.headers.authorization??'')?.[1];if(!token)fail(401,'Matrix bearer session required');
  const actor=deviceActor(req,user.id,session),binding=store.authorize(user.id,actor,matrixTokenHash(session),token);
  const path=url.pathname;
  const allowed=req.method==='GET'?['/_matrix/client/versions','/_matrix/client/v3/account/whoami','/_matrix/client/v3/sync','/_matrix/client/v3/keys/changes','/_matrix/client/v3/room_keys/version'].includes(path):['/_matrix/client/v3/keys/upload','/_matrix/client/v3/keys/query','/_matrix/client/v3/keys/claim'].includes(path);
  if(!allowed)fail(501,'This Matrix endpoint is gated until its Locat integration is accepted');
  const retryAfter=limit(user.id);if(retryAfter)throw Object.assign(new Error('Matrix bootstrap rate limit exceeded'),{status:429,retryAfter});
  if((active.get(user.id)??0)>=8)fail(429,'Matrix bootstrap connection limit exceeded');
  const queriedPeers=new Set();
  let input;if(req.method==='POST'){input=await body(req,1024*1024);if(!input||typeof input!=='object'||Array.isArray(input))fail(400,'Invalid Matrix request');
   if(path.endsWith('/keys/query')||path.endsWith('/keys/claim')){
    const users=input[path.endsWith('/keys/query')?'device_keys':'one_time_keys'];if(!users||typeof users!=='object'||Array.isArray(users)||Object.keys(users).length>50)fail(400,'Invalid or oversized Matrix device-key lookup');
    for(const matrixUserId of Object.keys(users)){if(matrixUserId===binding.matrixUserId)continue;if(!store.permitsMatrixPeer?.(user.id,matrixUserId))fail(403,'Matrix key lookup requires an accepted, unblocked Locat contact');queriedPeers.add(matrixUserId);}
   }
   if(path.endsWith('/keys/upload')&&input.device_keys){const device=input.device_keys,keys=JSON.parse(binding.publicKeys);if(device.user_id!==binding.matrixUserId||device.device_id!==binding.matrixDeviceId||(typeof device.keys?.['ed25519:'+binding.matrixDeviceId]==='string'?device.keys['ed25519:'+binding.matrixDeviceId].replace(/=+$/,''):null)!==keys.ed25519||(typeof device.keys?.['curve25519:'+binding.matrixDeviceId]==='string'?device.keys['curve25519:'+binding.matrixDeviceId].replace(/=+$/,''):null)!==keys.curve25519)fail(409,'Matrix device upload differs from the bound public keys');}
  }
  // Body reads and upstream calls can overlap logout/revocation. Recheck before forwarding and returning.
  const check=()=>{for(const peer of queriedPeers)if(!store.permitsMatrixPeer?.(user.id,peer))fail(403,'Messaging contact authorization changed');if(sessionUser(req)?.id!==user.id||deviceActor(req,user.id,session)!==actor)fail(401,'Locat authorization changed');store.authorize(user.id,actor,matrixTokenHash(session),token);};check();
  const controller=new AbortController(),deadline=setTimeout(()=>controller.abort(),65000);const closed=()=>controller.abort();res.once('close',closed);active.set(user.id,(active.get(user.id)??0)+1);
  try{
   let response;try{response=await fetch(provider.origin+path+url.search,{method:req.method,headers:{Authorization:'Bearer '+token,Accept:'application/json',...(input?{'Content-Type':'application/json'}:{})},body:input?JSON.stringify(input):undefined,redirect:'error',signal:controller.signal});}catch{fail(502,'Matrix bootstrap service is unavailable');}
   const reader=response.body?.getReader();if(!reader)fail(502,'Invalid Matrix bootstrap response');let size=0;const chunks=[];
   try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>2*1024*1024)fail(502,'Matrix bootstrap response exceeds the limit');chunks.push(value);}}catch(error){if(error.status)throw error;fail(502,'Matrix bootstrap response interrupted');}finally{await reader.cancel();}
   let value;try{value=JSON.parse(new TextDecoder('utf8',{fatal:true}).decode(Buffer.concat(chunks)));}catch{fail(502,'Invalid Matrix bootstrap JSON');}check();
   json(res,response.status,value);return true;
  }finally{clearTimeout(deadline);res.off('close',closed);const count=(active.get(user.id)??1)-1;if(count)active.set(user.id,count);else active.delete(user.id);}
 };
}
