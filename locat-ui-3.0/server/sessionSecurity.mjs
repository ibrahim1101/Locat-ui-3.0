import {createHash,timingSafeEqual} from 'node:crypto';
import {createRateLimiter} from './rateLimit.mjs';
/** Password-confirmed local session policy. Upstream Matrix tokens remain separate. */
export function createSessionSecurityHandler({db,sessionUser,sessionToken,body,json,scrypt,serialized}){
 const limit=createRateLimiter(5);
 return async(req,res,url,origin)=>{
  if(url.pathname!=='/api/auth/sessions/revoke-others')return false;
  if(req.method!=='POST'){json(res,405,{error:'Use POST for session revocation'});return true;}
  if(req.headers.origin!==origin){json(res,403,{error:'Origin mismatch'});return true;}
  const user=sessionUser(req),token=sessionToken(req);if(!user||!token){json(res,401,{error:'Not authenticated'});return true;}
  const retryAfter=limit(user.id);if(retryAfter){json(res,429,{error:'Too many session confirmation attempts',retryAfter},{'Retry-After':String(retryAfter)});return true;}
  const input=await body(req);if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(key=>key!=='currentPassword')||typeof input.currentPassword!=='string'||!input.currentPassword.length||input.currentPassword.length>256){json(res,400,{error:'Enter your current password'});return true;}
  const candidate=await scrypt(input.currentPassword,user.salt,64);
  if(!timingSafeEqual(candidate,Buffer.from(user.hash,'hex'))){json(res,401,{error:'Invalid credentials'});return true;}
  const currentHash=createHash('sha256').update(token).digest('hex');
  return serialized(async()=>{
   if(req.aborted||res.destroyed)throw Object.assign(new Error('Session confirmation disconnected'),{status:401});
   const revokedCount=db.revokeOtherSessions(user.id,currentHash,user.hash);
   json(res,200,{ok:true,revokedCount});return true;
  });
 };
}
