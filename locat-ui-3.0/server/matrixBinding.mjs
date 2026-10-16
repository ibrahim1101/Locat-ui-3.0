import {createPrivateMatrixConversation} from './matrixConversations.mjs';
import {createHash} from 'node:crypto';
import {createRateLimiter} from './rateLimit.mjs';
const fail=(status,message)=>{throw Object.assign(new Error(message),{status});};
export const matrixTokenHash=token=>createHash('sha256').update(token).digest('hex');
export function matrixProvider(env=process.env){
 if(!env.LOCAT_MATRIX_UPSTREAM){if(env.LOCAT_MATRIX_SERVER_NAME)throw new Error('Matrix server name requires an upstream');return null;}
 let upstream;try{upstream=new URL(env.LOCAT_MATRIX_UPSTREAM);}catch{throw new Error('Invalid Matrix upstream origin');}
 if(upstream.username||upstream.password||upstream.pathname!=='/'||upstream.search||upstream.hash||!['http:','https:'].includes(upstream.protocol)||upstream.protocol==='http:'&&!['127.0.0.1','localhost','[::1]'].includes(upstream.hostname))throw new Error('Matrix upstream must be HTTPS or private loopback HTTP, without paths or credentials');
 const serverName=env.LOCAT_MATRIX_SERVER_NAME;
 let authority;try{authority=new URL('https://'+serverName);}catch{throw new Error('Invalid Matrix server name');}
 if(!serverName||authority.host!==serverName||authority.pathname!=='/'||authority.search||authority.hash||authority.username||authority.password)throw new Error('Configure a canonical LOCAT_MATRIX_SERVER_NAME');
 async function request(path,token,payload,signal){
  let response;try{response=await fetch(upstream.origin+path,{method:payload?'POST':'GET',headers:{Authorization:'Bearer '+token,Accept:'application/json',...(payload?{'Content-Type':'application/json'}:{})},body:payload?JSON.stringify(payload):undefined,redirect:'error',signal});}catch{fail(502,'Matrix service is unavailable');}
  if(response.status===401||response.status===403){await response.body?.cancel();fail(401,'Matrix session is invalid or expired');}
  if(!response.ok){await response.body?.cancel();fail(502,'Matrix service rejected session validation');}
  const reader=response.body?.getReader();if(!reader)fail(502,'Invalid Matrix service response');let size=0;const chunks=[];
  try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>32768)fail(502,'Matrix service response exceeds the validation limit');chunks.push(value);}}catch(error){if(error.status)throw error;fail(502,'Matrix validation response interrupted');}finally{await reader.cancel();}
  try{return JSON.parse(new TextDecoder('utf8',{fatal:true}).decode(Buffer.concat(chunks)));}catch{fail(502,'Invalid Matrix service response');}
 }
 return {serverName,origin:upstream.origin,async logout(token,signal=AbortSignal.timeout(8000)){try{await request('/_matrix/client/v3/logout',token,{},signal);}catch(error){if(error.status!==401)throw error;}},async inspect(token,signal=AbortSignal.timeout(8000)){
  const value=await request('/_matrix/client/v3/account/whoami',token,undefined,signal);
  if(!value||typeof value!=='object'||Array.isArray(value))fail(502,'Invalid Matrix account response');
  if(typeof value.user_id!=='string'||!value.user_id.startsWith('@')||value.user_id.length>512||!value.user_id.endsWith(':'+serverName)||!value.user_id.slice(1,-serverName.length-1)||typeof value.device_id!=='string'||!value.device_id||value.device_id.length>255||value.is_guest===true)fail(400,'A non-guest local Matrix device session is required');
  const keys=await request('/_matrix/client/v3/keys/query',token,{device_keys:{[value.user_id]:[value.device_id]}},signal);
  if(!keys||typeof keys!=='object'||Array.isArray(keys)||!keys.device_keys||typeof keys.device_keys!=='object'||Array.isArray(keys.device_keys))fail(502,'Invalid Matrix device key response');
  if(keys.failures&&Object.keys(keys.failures).length)fail(502,'Matrix device keys could not be validated');
  const device=keys.device_keys?.[value.user_id]?.[value.device_id];
  if(device&&(device.user_id!==value.user_id||device.device_id!==value.device_id||!device.keys||typeof device.keys!=='object'||typeof device.keys['ed25519:'+value.device_id]!=='string'||typeof device.keys['curve25519:'+value.device_id]!=='string'))fail(502,'Invalid Matrix device identity');
  return {userId:value.user_id,deviceId:value.device_id,keys:device?.keys??null};
 }};
}
function publicKeys(input){if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(k=>!['ed25519','curve25519'].includes(k)))fail(400,'Invalid Matrix public keys');for(const key of ['ed25519','curve25519'])if(typeof input[key]!=='string'||!/^[A-Za-z0-9+/]{43}$/.test(input[key])||Buffer.from(input[key],'base64').length!==32||Buffer.from(input[key],'base64').toString('base64').replace(/=+$/,'')!==input[key])fail(400,'Invalid Matrix public key encoding');return input;}
export function matrixBindingStore(sql,devices,managedDevices){
 const current=(userId,actor)=>sql.prepare('SELECT * FROM matrixBindings WHERE userId=? AND linkDeviceId=?').get(userId,actor);
 const acceptedPeer=sql.prepare("SELECT m.userId AS accountId,m.matrixUserId FROM matrixAccounts m JOIN contacts c ON ((c.lowId=? AND c.highId=m.userId) OR (c.highId=? AND c.lowId=m.userId)) WHERE m.userId=? AND c.status='accepted' AND NOT EXISTS (SELECT 1 FROM blocks b WHERE (b.blockerId=? AND b.blockedId=m.userId) OR (b.blockedId=? AND b.blockerId=m.userId))");
 const peer=(userId,peerId)=>acceptedPeer.get(userId,userId,peerId,userId,userId);
 return {current,
 peer(userId,actor,peerId){devices.owned(userId,actor);const value=peer(userId,peerId);if(!value)fail(404,'Messaging contact is unavailable');return {...value,devices:sql.prepare('SELECT b.matrixDeviceId AS deviceId FROM matrixBindings b JOIN linkDevices d ON d.id=b.linkDeviceId AND d.userId=b.userId WHERE b.userId=? AND b.expiresAt>? AND d.revokedAt IS NULL ORDER BY b.linkDeviceId LIMIT 50').all(value.accountId,Date.now()).map(row=>({deviceId:row.deviceId})),verification:'requires-client-verification'};},
 peerByMatrix(userId,actor,matrixUserId){const target=sql.prepare('SELECT userId FROM matrixAccounts WHERE matrixUserId=?').get(matrixUserId);if(!target)fail(404,'Messaging contact is unavailable');return this.peer(userId,actor,target.userId);},
 permitsMatrixSenderKey(userId,matrixUserId,curve25519){const target=sql.prepare("SELECT b.userId FROM matrixBindings b JOIN linkDevices d ON d.id=b.linkDeviceId AND d.userId=b.userId WHERE b.matrixUserId=? AND json_extract(b.publicKeys,'$.curve25519')=? AND b.expiresAt>? AND d.revokedAt IS NULL").get(matrixUserId,curve25519,Date.now());return !!target&&(target.userId===userId||!!peer(userId,target.userId));},
 matrixDeviceKeys(userId,matrixUserId,deviceId){const target=sql.prepare('SELECT b.userId,b.publicKeys FROM matrixBindings b JOIN linkDevices d ON d.id=b.linkDeviceId AND d.userId=b.userId WHERE b.matrixUserId=? AND b.matrixDeviceId=? AND b.expiresAt>? AND d.revokedAt IS NULL').get(matrixUserId,deviceId,Date.now());return target&&(target.userId===userId||!!peer(userId,target.userId))?JSON.parse(target.publicKeys):null;},
 permitsMatrixDevice(userId,matrixUserId,deviceId){const target=sql.prepare('SELECT b.userId FROM matrixBindings b JOIN linkDevices d ON d.id=b.linkDeviceId AND d.userId=b.userId WHERE b.matrixUserId=? AND b.matrixDeviceId=? AND b.expiresAt>? AND d.revokedAt IS NULL').get(matrixUserId,deviceId,Date.now());return !!target&&(target.userId===userId||!!peer(userId,target.userId));},
 permitsMatrixPeer(userId,matrixUserId){const value=sql.prepare('SELECT userId FROM matrixAccounts WHERE matrixUserId=?').get(matrixUserId);return !!value&&!!peer(userId,value.userId);},
 status(userId,actor){devices.owned(userId,actor);const account=sql.prepare('SELECT matrixUserId FROM matrixAccounts WHERE userId=?').get(userId);const binding=current(userId,actor);return {managedDevice:managedDevices.status(userId,actor),matrixUserId:account?.matrixUserId??null,device:binding?{deviceId:binding.matrixDeviceId,publicKeys:JSON.parse(binding.publicKeys),expiresAt:binding.expiresAt}:null};},
 bind(userId,actor,sessionHash,input,remote){
  devices.owned(userId,actor);const keys=publicKeys(input.publicKeys);if(remote.userId!==input.userId||remote.deviceId!==input.deviceId)fail(409,'Matrix session does not match the requested account and device');
  const expiresAt=Date.now()+24*60*60*1000;const encoded=JSON.stringify({ed25519:keys.ed25519,curve25519:keys.curve25519});
  sql.exec('BEGIN IMMEDIATE');try{
  const managed=managedDevices.current(userId,actor);if(managed&&(managed.matrixUserId!==remote.userId||managed.matrixDeviceId!==remote.deviceId))fail(409,'This device has a reserved managed Matrix identity');
  const existing=current(userId,actor);
  if(existing&&(existing.matrixUserId!==remote.userId||existing.matrixDeviceId!==remote.deviceId||existing.publicKeys!==JSON.stringify({ed25519:keys.ed25519,curve25519:keys.curve25519})))fail(409,'This Locat device is already bound to a different Matrix identity');
  if(!existing&&remote.keys)fail(409,'Use a new Matrix device session without published keys; importing an existing device without its private keys is not supported');
  if(remote.keys&&(remote.keys['ed25519:'+remote.deviceId]?.replace(/=+$/,'')!==keys.ed25519||remote.keys['curve25519:'+remote.deviceId]?.replace(/=+$/,'')!==keys.curve25519))fail(409,'Matrix device keys changed; binding was not updated');
   const account=sql.prepare('SELECT matrixUserId FROM matrixAccounts WHERE userId=?').get(userId);
   if(account&&account.matrixUserId!==remote.userId)fail(409,'This Locat account is already bound to another Matrix account');
   const claimed=sql.prepare('SELECT userId FROM matrixAccounts WHERE matrixUserId=?').get(remote.userId);if(claimed&&claimed.userId!==userId)fail(409,'Matrix account is unavailable for binding');
   const device=sql.prepare('SELECT userId,linkDeviceId FROM matrixBindings WHERE matrixUserId=? AND matrixDeviceId=?').get(remote.userId,remote.deviceId);if(device&&(device.userId!==userId||device.linkDeviceId!==actor))fail(409,'Matrix device is already bound to another Locat device');
   sql.prepare('INSERT INTO matrixAccounts VALUES(?,?,?) ON CONFLICT(userId) DO NOTHING').run(userId,remote.userId,Date.now());
   sql.prepare('INSERT INTO matrixBindings VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(userId,linkDeviceId) DO UPDATE SET tokenHash=excluded.tokenHash,sessionHash=excluded.sessionHash,expiresAt=excluded.expiresAt').run(userId,actor,remote.userId,remote.deviceId,encoded,matrixTokenHash(input.accessToken),sessionHash,expiresAt);
   sql.exec('COMMIT');return this.status(userId,actor);
  }catch(error){sql.exec('ROLLBACK');if([2067,1555].includes(error.errcode))fail(409,'Matrix identity is already bound');throw error;}
 },
 authorize(userId,actor,sessionHash,token,allowExpiredForLogout=false){devices.owned(userId,actor);const value=current(userId,actor);if(!value||value.sessionHash!==sessionHash||value.tokenHash!==matrixTokenHash(token)||(!allowExpiredForLogout&&value.expiresAt<=Date.now()))fail(403,'Bind this Matrix device session to the current Locat session first');return value;},
 disconnect(userId,actor){devices.owned(userId,actor);return sql.prepare('UPDATE matrixBindings SET expiresAt=0 WHERE userId=? AND linkDeviceId=?').run(userId,actor);}
 };
}
export function createMatrixBindingHandler({store,provider,provisioner,conversations,body,json,audit}){
 const limit=createRateLimiter(10),cleanupLimit=createRateLimiter(30),peerLimit=createRateLimiter(30);
 return async({req,res,url,userId,actor,session,recheck})=>{
  const action=url.pathname.slice('/api/link/matrix/'.length);
  if(req.method==='GET'&&action==='status'){json(res,200,{configured:!!provider,managedProvisioning:!!provisioner,serverName:provider?.serverName??null,...store.status(userId,actor),authorizedHere:store.current(userId,actor)?.sessionHash===matrixTokenHash(session)&&store.current(userId,actor)?.expiresAt>Date.now()});return true;}
  if(req.method==='GET'&&action==='peer'){
   if(!provider)fail(503,'Matrix sidecar is not configured');const retryAfter=peerLimit(userId);if(retryAfter)throw Object.assign(new Error('Messaging contact lookup rate limit exceeded'),{status:429,retryAfter});
   if([...url.searchParams.keys()].length!==1||url.searchParams.size!==1||(!url.searchParams.has('accountId')&&!url.searchParams.has('matrixUserId'))||url.searchParams.has('accountId')&&!/^[a-f0-9]{32}$/.test(url.searchParams.get('accountId')??'')||url.searchParams.has('matrixUserId')&&!/^@[^\s:]{1,255}:[^\s]{1,255}$/.test(url.searchParams.get('matrixUserId')??''))fail(400,'Choose one local contact account identity');
   const own=store.current(userId,actor);if(!own||own.sessionHash!==matrixTokenHash(session)||own.expiresAt<=Date.now())fail(403,'Bind this messaging device to the current Locat session first');
   recheck();json(res,200,url.searchParams.has('accountId')?store.peer(userId,actor,url.searchParams.get('accountId')):store.peerByMatrix(userId,actor,url.searchParams.get('matrixUserId')));return true;
  }
  if(req.method!=='POST'||!['bind','disconnect','logout','provision','cancel-provision','revoke-managed-device','conversation'].includes(action))fail(404,'Unknown Matrix binding action');
  const retryAfter=(action==='cancel-provision'?cleanupLimit:limit)(userId);if(retryAfter)throw Object.assign(new Error('Matrix binding rate limit exceeded'),{status:429,retryAfter});
  const input=await body(req);if(!input||typeof input!=='object'||Array.isArray(input))fail(400,'Invalid Matrix command');
  if(action==='conversation'){const value=await createPrivateMatrixConversation({provider,store:conversations,bindings:store,userId,actor,session,input,recheck});json(res,200,value);return true;}
  if(action==='revoke-managed-device'){if(Object.keys(input).length)fail(400,'Invalid managed revocation');if(!provisioner)fail(503,'Managed messaging accounts are not configured');try{await provisioner.revokeDevice(userId,actor,recheck);}catch(error){audit(userId,'matrix.device.revocation.unconfirmed','warning');throw error;}audit(userId,'matrix.device.revoked');json(res,200,{ok:true,upstreamDeviceRevocationConfirmed:true});return true;}
  if(action==='cancel-provision'){if(Object.keys(input).some(key=>key!=='accessToken'))fail(400,'Invalid managed cancellation');if(!provisioner)fail(503,'Managed messaging accounts are not configured');await provisioner.cancel(userId,actor,input.accessToken,recheck);audit(userId,'matrix.provision.cancelled');json(res,200,{ok:true,upstreamLogoutConfirmed:true});return true;}
  if(action==='provision'){if(Object.keys(input).length)fail(400,'Managed identity fields cannot be chosen by the browser');if(!provisioner)fail(503,'Managed messaging accounts are not configured');const value=await provisioner.provision(userId,actor,recheck);audit(userId,'matrix.session.provisioned');json(res,200,value);return true;}
  if(action==='disconnect'){if(Object.keys(input).length)fail(400,'Invalid disconnect fields');store.disconnect(userId,actor);audit(userId,'matrix.device.disconnected');json(res,200,{ok:true});return true;}
  if(action==='logout'){
   if(Object.keys(input).some(key=>key!=='accessToken')||typeof input.accessToken!=='string'||!/^[A-Za-z0-9._~+/=-]{16,8192}$/.test(input.accessToken))fail(400,'Invalid Matrix logout');
   store.authorize(userId,actor,matrixTokenHash(session),input.accessToken,true);store.disconnect(userId,actor);
   try{if(!provider)fail(503,'Matrix sidecar is not configured');await provider.logout(input.accessToken);}
   catch{audit(userId,'matrix.session.logout.unconfirmed','warning');fail(502,'Locat gateway access is blocked; Matrix server sign-out was not confirmed. You can retry while this device session remains open.');}
   audit(userId,'matrix.session.logged_out');recheck();json(res,200,{ok:true,upstreamLogoutConfirmed:true});return true;
  }
  if(!provider)fail(503,'Matrix sidecar is not configured');
  if(Object.keys(input).some(k=>!['userId','deviceId','accessToken','publicKeys'].includes(k))||typeof input.userId!=='string'||input.userId.length>512||typeof input.deviceId!=='string'||!input.deviceId||input.deviceId.length>255||typeof input.accessToken!=='string'||!/^[A-Za-z0-9._~+/=-]{16,8192}$/.test(input.accessToken))fail(400,'Invalid Matrix binding');publicKeys(input.publicKeys);
  const remote=await provider.inspect(input.accessToken);recheck();const value=store.bind(userId,actor,matrixTokenHash(session),input,remote);audit(userId,'matrix.device.bound');json(res,200,value);return true;
 };
}
