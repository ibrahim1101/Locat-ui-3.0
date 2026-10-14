import {linkPayloadStore,handleLinkPayload} from './linkPayloads.mjs';
import {remoteStore,handleRemote} from './remote.mjs';
import {randomUUID} from 'node:crypto';
import {issueLinkChallenge,answerLinkChallenge,verifyLinkProof,validateLinkPublicKey,revokeLinkProofs} from './linkProof.mjs';
import {createRateLimiter} from './rateLimit.mjs';
const fail=(status,message)=>{throw Object.assign(new Error(message),{status});};
export function linkStore(sql){
 const owned=(userId,id)=>{const row=sql.prepare('SELECT * FROM linkDevices WHERE userId=? AND id=?').get(userId,id);if(!row)fail(404,'Device not found');if(row.revokedAt)fail(403,'Device key revoked; reset the local identity before registering again');return row;};
 const pair=(userId,actor,id)=>{const row=sql.prepare('SELECT * FROM linkPairs WHERE userId=? AND id=?').get(userId,id);if(!row)fail(404,'Pairing not found');if(![row.deviceA,row.deviceB].includes(actor))fail(403,'Pairing belongs to another device');owned(userId,row.deviceA);owned(userId,row.deviceB);return row;};
 const store={owned,pair,
 register(userId,name,platform,publicKey){const existing=sql.prepare('SELECT * FROM linkDevices WHERE userId=? AND publicKey=?').get(userId,publicKey);if(existing){if(existing.revokedAt)fail(403,'Device key revoked; reset the local identity');return {id:existing.id};}if(sql.prepare('SELECT COUNT(*) AS n FROM linkDevices WHERE userId=?').get(userId).n>=50)fail(409,'This account has reached the 50-device identity limit');const result=sql.prepare('INSERT INTO linkDevices(userId,name,platform,publicKey,createdAt) VALUES (?,?,?,?,?)').run(userId,name,platform,publicKey,Date.now());return {id:Number(result.lastInsertRowid)};},
 list(userId,actor){owned(userId,actor);return {observedAt:Date.now(),devices:sql.prepare('SELECT * FROM linkDevices WHERE userId=? ORDER BY id DESC LIMIT 50').all(userId),pairs:sql.prepare('SELECT * FROM linkPairs WHERE userId=? AND (deviceA=? OR deviceB=?) ORDER BY updatedAt DESC LIMIT 50').all(userId,actor,actor)};},
 rename(userId,actor,name){owned(userId,actor);sql.prepare('UPDATE linkDevices SET name=? WHERE id=? AND userId=?').run(name,actor,userId);},
 heartbeat(userId,actor){owned(userId,actor);sql.prepare('UPDATE linkDevices SET lastSeenAt=? WHERE id=? AND userId=?').run(Date.now(),actor,userId);},
 startPair(userId,actor,peer){owned(userId,actor);owned(userId,peer);if(actor===peer)fail(400,'Choose another device');const [a,b]=[actor,peer].sort((x,y)=>x-y);const existing=sql.prepare('SELECT * FROM linkPairs WHERE userId=? AND deviceA=? AND deviceB=?').get(userId,a,b);if(existing&&existing.status!=='rejected')return {id:existing.id};if(existing)sql.prepare('DELETE FROM linkPairs WHERE userId=? AND id=?').run(userId,existing.id);const id=randomUUID();sql.prepare("INSERT INTO linkPairs VALUES (?,?,?,?, 'pending',0,0,?)").run(id,userId,a,b,Date.now());return {id};},
 confirm(userId,actor,id,approved){const current=pair(userId,actor,id);if(current.status==='rejected')fail(409,'Pairing rejected; start a new request');const a=approved?Number(current.confirmedA||actor===current.deviceA):0,b=approved?Number(current.confirmedB||actor===current.deviceB):0;sql.exec('BEGIN IMMEDIATE');try{sql.prepare('UPDATE linkPairs SET status=?,confirmedA=?,confirmedB=?,updatedAt=? WHERE userId=? AND id=?').run(approved?(a&&b?'verified':'pending'):'rejected',a,b,Date.now(),userId,id);if(!approved){sql.prepare('DELETE FROM remoteSignals WHERE sessionId IN (SELECT id FROM remoteSessions WHERE userId=? AND pairId=?)').run(userId,id);sql.prepare("UPDATE remoteSessions SET status='closed' WHERE userId=? AND pairId=? AND status IN ('pending','active')").run(userId,id);sql.prepare('DELETE FROM linkPayloadChunks WHERE payloadId IN (SELECT id FROM linkPayloads WHERE userId=? AND pairId=?)').run(userId,id);sql.prepare("UPDATE linkPayloads SET status='cancelled',updatedAt=? WHERE userId=? AND pairId=? AND status IN ('uploading','queued')").run(Date.now(),userId,id);}sql.exec('COMMIT');}catch(error){sql.exec('ROLLBACK');throw error;}return {verified:!!(approved&&a&&b)};},
 revoke(userId,actor,id){owned(userId,actor);owned(userId,id);sql.exec('BEGIN IMMEDIATE');try{sql.prepare('UPDATE linkDevices SET revokedAt=? WHERE userId=? AND id=?').run(Date.now(),userId,id);sql.prepare("UPDATE linkPairs SET status='rejected',confirmedA=0,confirmedB=0,updatedAt=? WHERE userId=? AND (deviceA=? OR deviceB=?)").run(Date.now(),userId,id,id);sql.prepare('DELETE FROM remoteSignals WHERE sessionId IN (SELECT id FROM remoteSessions WHERE userId=? AND (viewer=? OR host=?))').run(userId,id,id);sql.prepare("UPDATE remoteSessions SET status='closed' WHERE userId=? AND (viewer=? OR host=?) AND status IN ('pending','active')").run(userId,id,id);sql.prepare("DELETE FROM linkPayloadChunks WHERE payloadId IN (SELECT id FROM linkPayloads WHERE userId=? AND (fromDevice=? OR toDevice=?))").run(userId,id,id);sql.prepare("UPDATE linkPayloads SET status='cancelled',updatedAt=? WHERE userId=? AND (fromDevice=? OR toDevice=?) AND status IN ('uploading','queued')").run(Date.now(),userId,id,id);sql.exec('COMMIT');}catch(error){sql.exec('ROLLBACK');throw error;}revokeLinkProofs(userId,id);},
 };
 store.payloads=linkPayloadStore(sql,store);store.remote=remoteStore(sql,store);return store;
}
export function createLinkHandler({store,sessionUser,sessionToken,body,json,audit}){
 const limit=createRateLimiter(60),chunkLimit=createRateLimiter(4000);return async(req,res,url,origin)=>{
 if(!url.pathname.startsWith('/api/link/'))return false;
 const user=sessionUser(req);if(!user)fail(401,'Not authenticated');
 const session=sessionToken(req);if(!session)fail(401,'Not authenticated');
 const action=url.pathname.slice('/api/link/'.length);
 if(req.method==='POST'){if(req.headers.origin!==origin)fail(403,'Origin mismatch');const retryAfter=(action==='payload/chunk'||action==='remote/signal'?chunkLimit:limit)(user.id);if(retryAfter)throw Object.assign(new Error('Device command rate limit exceeded'),{status:429,retryAfter});}
 if(!['GET','POST'].includes(req.method))fail(405,'Method not allowed');
 if(req.method==='POST'&&['register','challenge','prove'].includes(action)){
 const input=await body(req);if(!input||typeof input!=='object'||Array.isArray(input))fail(400,'Invalid command');
 if(action==='register'){if(Object.keys(input).some(key=>!['name','platform','publicKey'].includes(key))||typeof input.name!=='string'||!input.name.trim()||input.name.trim().length>80||!['web','android','windows','linux','macos'].includes(input.platform)||typeof input.publicKey!=='string'||input.publicKey.length>200)fail(400,'Invalid device registration');await validateLinkPublicKey(input.publicKey);json(res,201,store.register(user.id,input.name.trim(),input.platform,input.publicKey));}
 else if(action==='challenge'){if(!Number.isSafeInteger(input.id)||input.id<1||Object.keys(input).some(key=>key!=='id'))fail(400,'Invalid device');const device=store.owned(user.id,input.id);json(res,200,await issueLinkChallenge(user.id,device.id,session,device.publicKey));}
 else{if(Object.keys(input).some(key=>!['id','answer'].includes(key))||typeof input.id!=='string'||input.id.length>100||typeof input.answer!=='string'||input.answer.length>100)fail(400,'Invalid proof');const proof=answerLinkChallenge(user.id,session,input.id,input.answer);store.owned(user.id,proof.deviceId);json(res,200,proof);}
 return true;
 }
 const actor=verifyLinkProof(user.id,session,req.headers['x-locat-device-proof']);store.owned(user.id,actor);
 if(action.startsWith('remote/'))return handleRemote({req,res,url,store:store.remote,userId:user.id,actor,body,json});
 if(action.startsWith('payload'))return handleLinkPayload({req,res,url,store:store.payloads,userId:user.id,actor,body,json});
 if(req.method==='GET'&&action==='devices'){json(res,200,{...store.list(user.id,actor),currentDeviceId:actor});return true;}
 if(req.method!=='POST')fail(404,'Not found');const input=await body(req);if(!input||typeof input!=='object'||Array.isArray(input))fail(400,'Invalid command');
 const only=keys=>{if(Object.keys(input).some(key=>!keys.includes(key)))fail(400,'Invalid command fields');};
 if(action==='heartbeat'){only([]);store.heartbeat(user.id,actor);json(res,200,{ok:true});}
 else if(action==='rename'){only(['name']);if(typeof input.name!=='string'||!input.name.trim()||input.name.trim().length>80)fail(400,'Use a device name of 1–80 characters');store.rename(user.id,actor,input.name.trim());json(res,200,{ok:true});}
 else if(action==='revoke'){only(['id']);if(!Number.isSafeInteger(input.id)||input.id<1)fail(400,'Invalid device');store.revoke(user.id,actor,input.id);audit(user.id,'link.device.revoked');json(res,200,{ok:true});}
 else if(action==='pair'){only(['peer']);if(!Number.isSafeInteger(input.peer)||input.peer<1)fail(400,'Invalid peer');json(res,201,store.startPair(user.id,actor,input.peer));}
 else if(action==='confirm'){only(['id','approved']);if(typeof input.id!=='string'||input.id.length>50||typeof input.approved!=='boolean')fail(400,'Invalid pairing confirmation');const result=store.confirm(user.id,actor,input.id,input.approved);audit(user.id,input.approved?'link.pair.confirmed':'link.pair.rejected');json(res,200,result);}
 else fail(404,'Not found');return true;
 };}
