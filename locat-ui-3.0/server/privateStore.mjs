import {samePrivateConfig,validateConfig,validateEnvelope,isPrivateId,PRIVATE_QUOTA,PRIVATE_MAX_OBJECTS,PRIVATE_CIPHER_LIMIT} from '../shared/privateStore.mjs';
import {createHash} from 'node:crypto';
import {createRateLimiter} from './rateLimit.mjs';
const fail=(status,message)=>{throw Object.assign(new Error(message),{status});};
export function privateStore(sql){
 function write(userId,module,action,sessionHash,task){
  sql.exec('BEGIN IMMEDIATE');
  try{
   // HTTP callers always provide a digest. Internal database users may omit it.
   if(sessionHash!==undefined&&(typeof sessionHash!=='string'||!/^[a-f0-9]{64}$/.test(sessionHash)||!sql.prepare('SELECT 1 FROM sessions WHERE hash=? AND userId=? AND expiresAt>?').get(sessionHash,userId,Date.now())))fail(401,'Session changed; sign in again');
   const result=task();
   sql.prepare('INSERT INTO audit(userId,event,severity,createdAt) VALUES (?,?,?,?)').run(userId,'private.'+module+'.'+action,action==='passphrase.changed'?'warn':'info',Date.now());
   sql.exec('COMMIT');return result;
  }catch(error){sql.exec('ROLLBACK');throw error;}
 }
 return {
 status(userId,module){return {config:JSON.parse(sql.prepare('SELECT config FROM privateStores WHERE userId=? AND module=?').get(userId,module)?.config??'null'),objects:sql.prepare('SELECT id,revision,bytes,updatedAt FROM privateObjects WHERE userId=? AND module=? ORDER BY updatedAt DESC').all(userId,module),quota:PRIVATE_QUOTA,maxObjects:PRIVATE_MAX_OBJECTS};},
 initialize(userId,module,input,sessionHash){
  const config=JSON.stringify(validateConfig(input));
  return write(userId,module,'initialized',sessionHash,()=>{
   if(sql.prepare('SELECT 1 FROM privateStores WHERE userId=? AND module=?').get(userId,module))fail(409,'Store already exists. Unlock it instead.');
   sql.prepare('INSERT INTO privateStores VALUES (?,?,?)').run(userId,module,config);
  });
 },
 rewrap(userId,module,expectedInput,newInput,sessionHash){
  const expected=validateConfig(expectedInput),next=validateConfig(newInput);
  if(expected.storeId!==next.storeId||expected.salt===next.salt||expected.wrappedKey.iv===next.wrappedKey.iv||expected.wrappedKey.data===next.wrappedKey.data)fail(400,'Passphrase change requires the same store identity and fresh wrapping data');
  if(sessionHash===undefined)fail(401,'Session changed; sign in again');
  return write(userId,module,'passphrase.changed',sessionHash,()=>{
   const row=sql.prepare('SELECT config FROM privateStores WHERE userId=? AND module=?').get(userId,module);
   if(!row||!samePrivateConfig(JSON.parse(row.config),expected))fail(409,'Store changed. Lock and unlock to refresh before changing its passphrase.');
   sql.prepare('UPDATE privateStores SET config=? WHERE userId=? AND module=?').run(JSON.stringify(next),userId,module);
   return {ok:true};
  });
 },
 get(userId,module,id){const row=sql.prepare('SELECT revision,envelope FROM privateObjects WHERE userId=? AND module=? AND id=?').get(userId,module,id);if(!row)fail(404,'Private entry not found');return {revision:row.revision,envelope:JSON.parse(row.envelope)};},
 put(userId,module,id,expectedRevision,input,sessionHash){
  const encoded=JSON.stringify(validateEnvelope(input));
  return write(userId,module,'written',sessionHash,()=>{
   if(!sql.prepare('SELECT 1 FROM privateStores WHERE userId=? AND module=?').get(userId,module))fail(409,'Initialize this store first');
   const current=sql.prepare('SELECT revision,bytes FROM privateObjects WHERE userId=? AND module=? AND id=?').get(userId,module,id);
   if((current?.revision??0)!==expectedRevision)fail(409,'Entry changed. Lock and unlock to refresh before saving.');
   const totals=sql.prepare('SELECT COUNT(*) AS count,COALESCE(SUM(bytes),0) AS bytes FROM privateObjects WHERE userId=? AND module=?').get(userId,module);
   if(totals.bytes-(current?.bytes??0)+encoded.length>PRIVATE_QUOTA||(!current&&totals.count>=PRIVATE_MAX_OBJECTS))fail(413,'Encrypted store quota exceeded');
   const revision=expectedRevision+1;
   sql.prepare('INSERT INTO privateObjects VALUES (?,?,?,?,?,?,?) ON CONFLICT(userId,module,id) DO UPDATE SET revision=excluded.revision,envelope=excluded.envelope,bytes=excluded.bytes,updatedAt=excluded.updatedAt').run(userId,module,id,revision,encoded,encoded.length,Date.now());
   return {revision};
  });
 },
 remove(userId,module,id,expectedRevision,sessionHash){
  return write(userId,module,'removed',sessionHash,()=>{
   const result=sql.prepare('DELETE FROM privateObjects WHERE userId=? AND module=? AND id=? AND revision=?').run(userId,module,id,expectedRevision);
   if(!result.changes)fail(409,'Entry changed or unavailable. Refresh before deleting.');
  });
 },
 };}
export function createPrivateHandler({store,sessionUser,sessionToken,body,json}){const writeLimit=createRateLimiter(60);return async(req,res,url,origin)=>{
 const match=/^\/api\/private\/(vault|secrets)(?:\/([a-z0-9-]+))?$/.exec(url.pathname);if(!match)return false;
 const user=sessionUser(req);if(!user)fail(401,'Not authenticated');const module=match[1],action=match[2];
 if(req.method==='GET'){if(!action)json(res,200,store.status(user.id,module));else if(isPrivateId(action))json(res,200,store.get(user.id,module,action));else fail(404,'Not found');return true;}
 if(req.method!=='POST')fail(405,'Method not allowed');if(req.headers.origin!==origin)fail(403,'Origin mismatch');
 const retryAfter=writeLimit(user.id);if(retryAfter)throw Object.assign(new Error('Private-store write rate limit exceeded'),{status:429,retryAfter});
 const input=await body(req,action==='rewrap'?4096:PRIVATE_CIPHER_LIMIT+2048);
 const current=sessionUser(req);if(!current||current.id!==user.id)fail(401,'Session changed; sign in again');
 const token=sessionToken?.(req);if(!token)fail(401,'Not authenticated');
 const sessionHash=createHash('sha256').update(token).digest('hex');
 if(action==='initialize'){if(!input||Object.keys(input).some(key=>key!=='config'))fail(400,'Invalid store configuration');store.initialize(user.id,module,input.config,sessionHash);json(res,201,{ok:true});}
 else if(action==='rewrap'){
 if(!input||Array.isArray(input)||Object.keys(input).some(key=>!['expectedConfig','config'].includes(key)))fail(400,'Invalid passphrase change');
 const result=store.rewrap(user.id,module,input.expectedConfig,input.config,sessionHash);json(res,200,result);
 }
 else if(action==='put'||action==='remove'){
 if(!input||Object.keys(input).some(key=>!['id','expectedRevision',...(action==='put'?['envelope']:[])].includes(key))||!isPrivateId(input.id)||!Number.isSafeInteger(input.expectedRevision)||input.expectedRevision<0||input.expectedRevision>=1000000000)fail(400,'Invalid private-store write');
 if(action==='put'){const result=store.put(user.id,module,input.id,input.expectedRevision,input.envelope,sessionHash);json(res,200,result);}else {store.remove(user.id,module,input.id,input.expectedRevision,sessionHash);json(res,200,{ok:true});}
 }else fail(404,'Not found');return true;
};}
