import {managedMatrixIdentity} from '../shared/matrixIdentity.mjs';
const fail=(status,message)=>{throw Object.assign(new Error(message),{status});};
/** Server only. The service token never becomes a device token or response field. */
export function createManagedMatrixProvisioner({provider,serviceToken,serverId,store}){
 if(!provider||typeof serviceToken!=='string'||!/^[A-Za-z0-9_-]{64,256}$/.test(serviceToken))throw new Error('Invalid managed Matrix configuration');
 const active=new Set();
 async function request(path,payload,signal){
  let response;try{response=await fetch(provider.origin+path,{method:'POST',headers:{Authorization:'Bearer '+serviceToken,'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify(payload),redirect:'error',signal});}catch{fail(502,'Managed messaging service is unavailable');}
  const reader=response.body?.getReader();if(!reader)fail(502,'Invalid managed messaging response');const chunks=[];let size=0;
  try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>32768)fail(502,'Managed messaging response exceeds the limit');chunks.push(value);}}catch(error){if(error.status)throw error;fail(502,'Managed messaging response interrupted');}finally{await reader.cancel();}
  let value;try{value=JSON.parse(new TextDecoder('utf8',{fatal:true}).decode(Buffer.concat(chunks)));}catch{fail(502,'Invalid managed messaging response');}
  if(!value||typeof value!=='object'||Array.isArray(value))fail(502,'Invalid managed messaging response');return {status:response.status,ok:response.ok,value};
 }
 return {async cancel(userId,actor,token,recheck){
  if(typeof token!=='string'||!/^[A-Za-z0-9._~+/=-]{16,8192}$/.test(token)||token===serviceToken)fail(400,'Invalid managed device token');
  const identity=managedMatrixIdentity(serverId,userId,actor,provider.serverName);recheck();const remote=await provider.inspect(token);recheck();if(remote.userId!==identity.userId||remote.deviceId!==identity.deviceId)fail(403,'Managed device token belongs to another identity');await provider.logout(token);recheck();
 },async provision(userId,actor,recheck){
  const identity=managedMatrixIdentity(serverId,userId,actor,provider.serverName),key=JSON.stringify([userId,actor]);
  recheck();const local=store.status(userId,actor);
  if(local.matrixUserId&&local.matrixUserId!==identity.userId||local.device&&local.device.deviceId!==identity.deviceId)fail(409,'Existing messaging identity requires an explicit migration; managed setup cannot replace it');
  if(active.has(key))fail(409,'Messaging setup is already running for this device');if(active.size>=8)fail(503,'Messaging setup is busy');active.add(key);
  let token;
  try{
   const signal=AbortSignal.timeout(10000);
   const registered=await request('/_matrix/client/v3/register',{type:'m.login.application_service',username:identity.localpart,inhibit_login:true},signal);
   if(!registered.ok&&!(registered.status===400&&registered.value.errcode==='M_USER_IN_USE'))fail(502,'Managed messaging account registration was rejected');
   if(registered.ok&&(registered.value.user_id!==identity.userId||registered.value.access_token!==undefined))fail(502,'Unexpected managed messaging account identity');
   recheck();
   const login=await request('/_matrix/client/v3/login',{type:'m.login.application_service',identifier:{type:'m.id.user',user:identity.userId},device_id:identity.deviceId,initial_device_display_name:'Locat browser'},signal);
   if(!login.ok)fail(502,'Managed messaging device login was rejected');
   if(typeof login.value.access_token==='string'&&/^[A-Za-z0-9._~+/=-]{16,8192}$/.test(login.value.access_token)&&login.value.access_token!==serviceToken)token=login.value.access_token;
   if(!token||login.value.user_id!==identity.userId||login.value.device_id!==identity.deviceId)fail(502,'Unexpected managed messaging device identity');
   recheck();const remote=await provider.inspect(token,signal);recheck();
   if(remote.userId!==identity.userId||remote.deviceId!==identity.deviceId)fail(502,'Managed messaging session identity changed');
   if(remote.keys){const pins=local.device?.publicKeys;if(!pins||remote.keys['ed25519:'+identity.deviceId]!==pins.ed25519||remote.keys['curve25519:'+identity.deviceId]!==pins.curve25519)fail(409,'Existing messaging keys require recovery; setup cannot replace them');}
   // No authorization grant is issued here. Browser Rust keys must still pass the binding endpoint.
   return {userId:identity.userId,deviceId:identity.deviceId,accessToken:token};
  }catch(error){if(token)try{await provider.logout(token);}catch{fail(502,'Messaging setup failed; cleanup of the new upstream session was not confirmed');}throw error;}
  finally{active.delete(key);}
 }};
}
