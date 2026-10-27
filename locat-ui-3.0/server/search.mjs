import {createRateLimiter} from './rateLimit.mjs';

/** Authenticated bounded search across content the current account can access. */
const owns=(value,keys)=>value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).every(key=>keys.includes(key));
export function createSearchHandler({workspaces,calendar,sessionUser,body,json}){
 const limit=createRateLimiter(30,60_000);
 return async function searchHandler(req,res,url,trustedOrigin){
  if(url.pathname!=='/api/search')return false;
  const user=sessionUser(req);if(!user){json(res,401,{error:'Not authenticated'});return true;}
  if(req.method!=='POST'){json(res,405,{error:'Method not allowed'},{Allow:'POST'});return true;}
  if(req.headers.origin!==trustedOrigin){json(res,403,{error:'Origin mismatch'});return true;}
  let input;try{input=await body(req,1024);}catch(error){json(res,error.status??400,{error:error.message});return true;}
  if(req.aborted||sessionUser(req)?.id!==user.id){json(res,401,{error:'Session changed during search'});return true;}
  if(!owns(input,['q'])||typeof input.q!=='string'||input.q.trim().length<2||input.q.trim().length>100){json(res,400,{error:'Search needs between 2 and 100 characters'});return true;}
  const retryAfter=limit(user.id);if(retryAfter){json(res,429,{error:'Search is temporarily rate limited'},{'Retry-After':String(retryAfter)});return true;}
  const term=input.q.trim(),results=[...workspaces.search(user.id,term),...calendar.search(user.id,term)].sort((a,b)=>b.updatedAt-a.updatedAt||a.id.localeCompare(b.id)).slice(0,50);
  json(res,200,{results});return true;
 };
}
