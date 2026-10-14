import {randomUUID} from 'node:crypto';
import {validateEnvelope} from '../shared/privateStore.mjs';
const CHUNK=256*1024,MAX_FILE=200*1024*1024,QUOTA=256*1024*1024;
const fail=(status,message)=>{throw Object.assign(new Error(message),{status});};
export function linkPayloadStore(sql,devices){
 const verified=(userId,actor,pairId,peer)=>{const pair=devices.pair(userId,actor,pairId);if(pair.status!=='verified'||!([pair.deviceA,pair.deviceB].includes(peer))||peer===actor)fail(403,'A verified pairing with this peer is required');return pair;};
 const owned=(userId,actor,id)=>{const value=sql.prepare('SELECT * FROM linkPayloads WHERE userId=? AND id=?').get(userId,id);if(!value)fail(404,'Transfer not found');if(![value.fromDevice,value.toDevice].includes(actor))fail(403,'Transfer belongs to another device');verified(userId,actor,value.pairId,value.fromDevice===actor?value.toDevice:value.fromDevice);return value;};
 return {
 create(userId,actor,input){verified(userId,actor,input.pairId,input.peer);const totals=sql.prepare("SELECT COUNT(*) AS count,COALESCE(SUM(size),0) AS size FROM linkPayloads WHERE userId=? AND status IN ('uploading','queued')").get(userId);if(totals.count>=100||totals.size+input.size>QUOTA)fail(413,'Pending Link quota exceeded; finish or cancel transfers');const id=randomUUID(),now=Date.now(),chunkCount=input.kind==='file'?Math.max(1,Math.ceil(input.size/CHUNK)):1;sql.prepare("INSERT INTO linkPayloads VALUES (?,?,?,?,?,?,?,?,?,?, 'uploading',?,?)").run(id,userId,input.pairId,actor,input.peer,input.kind,input.name,input.mime,input.size,chunkCount,now,now);return {...sql.prepare('SELECT * FROM linkPayloads WHERE id=?').get(id),receivedChunks:0};},
 list(userId,actor){devices.owned(userId,actor);return sql.prepare("SELECT p.*, (SELECT COUNT(*) FROM linkPayloadChunks c WHERE c.payloadId=p.id) AS receivedChunks FROM linkPayloads p WHERE userId=? AND (fromDevice=? OR toDevice=?) ORDER BY CASE WHEN status IN ('uploading','queued') THEN 0 ELSE 1 END,createdAt DESC LIMIT 100").all(userId,actor,actor);},
 get(userId,actor,id){return owned(userId,actor,id);},
 upload(userId,actor,id,seq,input){const envelope=validateEnvelope(input);if(envelope.data.length>4*Math.ceil((CHUNK+16)/3))fail(413,'Encrypted chunk too large');const value=owned(userId,actor,id);if(actor!==value.fromDevice)fail(403,'Only the source device can upload');if(!['uploading','queued'].includes(value.status))fail(409,'Transfer is closed');if(seq<0||seq>=value.chunkCount)fail(400,'Chunk out of range');const expected=value.kind==='file'?Math.min(CHUNK,value.size-seq*CHUNK):value.size;if(Buffer.from(envelope.data,'base64').length!==expected+16)fail(400,'Encrypted chunk length mismatch');
 const existing=sql.prepare('SELECT envelope FROM linkPayloadChunks WHERE payloadId=? AND seq=?').get(id,seq),encoded=JSON.stringify(envelope);if(existing){if(existing.envelope!==encoded)fail(409,'Chunk already published');return {ok:true};}
 sql.exec('BEGIN IMMEDIATE');try{sql.prepare('INSERT INTO linkPayloadChunks VALUES (?,?,?)').run(id,seq,encoded);const count=sql.prepare('SELECT COUNT(*) AS n FROM linkPayloadChunks WHERE payloadId=?').get(id).n;sql.prepare('UPDATE linkPayloads SET status=?,updatedAt=? WHERE id=?').run(count===value.chunkCount?'queued':'uploading',Date.now(),id);sql.exec('COMMIT');return {ok:true,receivedChunks:count};}catch(error){sql.exec('ROLLBACK');throw error;}
 },
 chunk(userId,actor,id,seq){const value=owned(userId,actor,id);if(actor!==value.toDevice)fail(403,'Only the destination device can receive');if(value.status!=='queued')fail(409,'Transfer is not ready to receive');const row=sql.prepare('SELECT envelope FROM linkPayloadChunks WHERE payloadId=? AND seq=?').get(id,seq);if(!row)fail(404,'Chunk unavailable');return {envelope:JSON.parse(row.envelope)};},
 finish(userId,actor,id,status){const value=owned(userId,actor,id);if(status==='complete'&&actor!==value.toDevice)fail(403,'Only the destination may acknowledge');if(value.status==='complete'||value.status==='cancelled'){if(value.status!==status)fail(409,'Transfer already closed');return;}
 if(status==='complete'&&value.status!=='queued')fail(409,'Transfer is not complete');sql.exec('BEGIN IMMEDIATE');try{sql.prepare('DELETE FROM linkPayloadChunks WHERE payloadId=?').run(id);sql.prepare('UPDATE linkPayloads SET status=?,updatedAt=? WHERE id=?').run(status,Date.now(),id);sql.exec('COMMIT');}catch(error){sql.exec('ROLLBACK');throw error;}
 },
 };
}
export async function handleLinkPayload({req,res,url,store,userId,actor,body,json}){
 const action=url.pathname.slice('/api/link/'.length);if(req.method==='GET'){
 if(action==='payloads'){json(res,200,{payloads:store.list(userId,actor)});return true;}
 if(action==='payload'){const id=url.searchParams.get('id');if(typeof id!=='string'||id.length>50)fail(400,'Invalid transfer');const seq=url.searchParams.get('seq');if(seq===null)json(res,200,{payload:store.get(userId,actor,id)});else{if(!/^\d{1,4}$/.test(seq))fail(400,'Invalid chunk');json(res,200,store.chunk(userId,actor,id,Number(seq)));}return true;}
 }
 if(req.method!=='POST')fail(404,'Not found');const input=await body(req,400000);if(!input||typeof input!=='object'||Array.isArray(input))fail(400,'Invalid transfer command');
 const only=keys=>{if(Object.keys(input).some(key=>!keys.includes(key)))fail(400,'Invalid transfer fields');};
 if(action==='payload/create'){only(['pairId','peer','kind','name','mime','size']);if(typeof input.pairId!=='string'||input.pairId.length>50||!Number.isSafeInteger(input.peer)||!['file','text','url','clipboard'].includes(input.kind)||typeof input.name!=='string'||!input.name.trim()||input.name.length>255||typeof input.mime!=='string'||input.mime.length>128||!Number.isSafeInteger(input.size)||input.size<0||input.size>(input.kind==='file'?MAX_FILE:65536))fail(400,'Invalid transfer metadata');json(res,201,{payload:store.create(userId,actor,input)});}
 else if(action==='payload/chunk'){only(['id','seq','envelope']);if(typeof input.id!=='string'||input.id.length>50||!Number.isSafeInteger(input.seq))fail(400,'Invalid chunk');json(res,200,store.upload(userId,actor,input.id,input.seq,input.envelope));}
 else if(action==='payload/finish'){only(['id','status']);if(typeof input.id!=='string'||input.id.length>50||!['complete','cancelled'].includes(input.status))fail(400,'Invalid transfer state');store.finish(userId,actor,input.id,input.status);json(res,200,{ok:true});}
 else fail(404,'Not found');return true;
}
