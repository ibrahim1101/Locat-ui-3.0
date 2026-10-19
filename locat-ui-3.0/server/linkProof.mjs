/** Session-bound ECDH device proofs. Challenge and token indexes are shared through SQLite. */
import {createHash,randomBytes,timingSafeEqual} from 'node:crypto';
class TRPCError extends Error {constructor({code,message}){super(message??code);this.status={BAD_REQUEST:400,FORBIDDEN:403,TOO_MANY_REQUESTS:429}[code]??500;}}
const te=new TextEncoder();
const CHALLENGE_TTL=60_000;
export const LINK_PROOF_TTL=10*60_000;
function hash(value){return createHash('sha256').update(value).digest('hex');}
function transaction(sql,operation){sql.exec('BEGIN IMMEDIATE');try{const result=operation();sql.exec('COMMIT');return result;}catch(error){sql.exec('ROLLBACK');throw error;}}
export async function canonicalLinkPublicKey(publicKey){try{const key=await crypto.subtle.importKey('spki',Buffer.from(publicKey,'base64'),{name:'ECDH',namedCurve:'P-256'},true,[]);return {key,publicKey:Buffer.from(await crypto.subtle.exportKey('spki',key)).toString('base64')};}catch{throw new TRPCError({code:'BAD_REQUEST',message:'Invalid device encryption key'});}}
export async function validateLinkPublicKey(publicKey){const canonical=await canonicalLinkPublicKey(publicKey);if(canonical.publicKey!==publicKey)throw new TRPCError({code:'BAD_REQUEST',message:'Invalid device encryption key representation'});return canonical.key;}

export function createLinkProofStore(sql){
 const prune=now=>{sql.prepare('DELETE FROM linkProofChallenges WHERE expiresAt<=?').run(now);sql.prepare('DELETE FROM linkProofTokens WHERE expiresAt<=?').run(now);const counts=sql.prepare('SELECT (SELECT COUNT(*) FROM linkProofChallenges) AS challenges,(SELECT COUNT(*) FROM linkProofTokens) AS tokens').get();if(counts.challenges>=2000||counts.tokens>=2000)throw new TRPCError({code:'TOO_MANY_REQUESTS',message:'Device proof service busy'});};
 return {
  async issueChallenge(userId,deviceId,session,publicKey,now=Date.now()){
   const peer=await validateLinkPublicKey(publicKey);
   const ephemeral=await crypto.subtle.generateKey({name:'ECDH',namedCurve:'P-256'},true,['deriveBits']);
   const bits=await crypto.subtle.deriveBits({name:'ECDH',public:peer},ephemeral.privateKey,256);
   const base=await crypto.subtle.importKey('raw',bits,'HKDF',false,['deriveKey']);
   const id=randomBytes(24).toString('base64url'),context=`locat-link-device-proof:ui3-v1:${userId}:${deviceId}:${id}`;
   const key=await crypto.subtle.deriveKey({name:'HKDF',hash:'SHA-256',salt:te.encode(context),info:te.encode('challenge-response')},base,{name:'AES-GCM',length:256},false,['encrypt']);
   const secret=randomBytes(32),iv=randomBytes(12),data=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:te.encode(context)},key,secret),pub=await crypto.subtle.exportKey('spki',ephemeral.publicKey);
   const expiresAt=now+CHALLENGE_TTL;
   transaction(sql,()=>{prune(now);sql.prepare('INSERT INTO linkProofChallenges(id,userId,deviceId,sessionHash,secret,expiresAt) VALUES (?,?,?,?,?,?)').run(id,userId,deviceId,hash(session),secret,expiresAt);});
   return {id,deviceId,userId,publicKey:Buffer.from(pub).toString('base64'),iv:iv.toString('base64'),data:Buffer.from(data).toString('base64'),expiresAt};
  },
  answerChallenge(userId,session,id,answer,now=Date.now()){
   // Delete commits before answer validation so every attempt consumes the challenge across workers.
   const row=transaction(sql,()=>{const current=sql.prepare('SELECT * FROM linkProofChallenges WHERE id=?').get(id);sql.prepare('DELETE FROM linkProofChallenges WHERE id=?').run(id);return current;});
   const received=Buffer.from(answer,'base64');
   if(!row||row.expiresAt<=now||row.userId!==userId||row.sessionHash!==hash(session)||received.length!==row.secret.length||!timingSafeEqual(received,row.secret))throw new TRPCError({code:'FORBIDDEN',message:'Device proof failed or expired'});
   const token=randomBytes(32).toString('base64url'),tokenHash=hash(token),expiresAt=now+LINK_PROOF_TTL;
   transaction(sql,()=>{prune(now);sql.prepare('INSERT INTO linkProofTokens(tokenHash,userId,deviceId,sessionHash,expiresAt) VALUES (?,?,?,?,?)').run(tokenHash,userId,row.deviceId,row.sessionHash,expiresAt);});
   return {token,deviceId:row.deviceId,expiresAt};
  },
  verify(userId,session,token,now=Date.now()){
   const row=token?sql.prepare('SELECT deviceId FROM linkProofTokens WHERE tokenHash=? AND userId=? AND sessionHash=? AND expiresAt>?').get(hash(token),userId,hash(session),now):undefined;
   if(!row)throw new TRPCError({code:'FORBIDDEN',message:"Prove this device's private key before using Locat Link"});return row.deviceId;
  },
  revoke(userId,deviceId){transaction(sql,()=>{sql.prepare('DELETE FROM linkProofTokens WHERE userId=? AND deviceId=?').run(userId,deviceId);sql.prepare('DELETE FROM linkProofChallenges WHERE userId=? AND deviceId=?').run(userId,deviceId);});},
 };
}
