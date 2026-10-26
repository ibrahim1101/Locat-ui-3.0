import {randomUUID} from 'node:crypto';

const TTL=new Set([1,24,168]),MAX_CIPHERTEXT=2*1024*1024;
const DOWNLOAD_LIMITS=new Set([1,5,20,100]);
const owns=(value,keys)=>value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).every(key=>keys.includes(key));
const uuid=value=>typeof value==='string'&&/^[a-f0-9-]{36}$/i.test(value);
const base64=(value,min,max)=>typeof value==='string'&&value.length>=min&&value.length<=max&&/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value);

export function createShareHandler({store,sessionUser,body,json,readLimit=()=>0}){
 return async function shareHandler(req,res,url,trustedOrigin){
  if(url.pathname==='/api/share'){
   if(!['GET','POST'].includes(req.method)){json(res,405,{error:'Method not allowed'},{Allow:'GET, POST'});return true;}
   const user=sessionUser(req);if(!user){json(res,401,{error:'Not authenticated'});return true;}
   if(req.method==='GET'){json(res,200,{shares:store.list(user.id)});return true;}
   if(req.headers.origin!==trustedOrigin){json(res,403,{error:'Origin mismatch'});return true;}
   let input;try{input=await body(req,3*1024*1024);}catch(error){json(res,error.status??400,{error:error.message});return true;}
   if(req.aborted||sessionUser(req)?.id!==user.id){json(res,401,{error:'Session changed during share creation'});return true;}
   const downloadLimit=input.downloadLimit??100;
   if(!owns(input,['iv','ciphertext','ttlHours','downloadLimit'])||!base64(input.iv,16,24)||!base64(input.ciphertext,24,Math.ceil(MAX_CIPHERTEXT/3)*4)||!TTL.has(input.ttlHours)||!DOWNLOAD_LIMITS.has(downloadLimit)){json(res,400,{error:'Invalid encrypted share'});return true;}
   const created=store.create({id:randomUUID(),userId:user.id,iv:input.iv,ciphertext:input.ciphertext,expiresAt:Date.now()+input.ttlHours*60*60_000,downloadLimit});
   json(res,201,{share:created});return true;
  }
  const match=/^\/api\/share\/([a-f0-9-]{36})$/i.exec(url.pathname);if(!match)return false;
  if(req.method==='GET'){
   if(url.search){json(res,400,{error:'Invalid share request'});return true;}
   const retryAfter=readLimit(req);if(retryAfter){json(res,429,{error:'Too many share opens. Try again later.'},{'Retry-After':String(retryAfter)});return true;}
   const share=store.get(match[1]);if(!share){json(res,404,{error:'Share is unavailable or expired'});return true;}
   json(res,200,{share:{id:share.id,iv:share.iv,ciphertext:share.ciphertext,expiresAt:share.expiresAt,downloadLimit:share.downloadLimit,downloadCount:share.downloadCount}},{'Cache-Control':'private, no-store'});return true;
  }
  if(req.method==='DELETE'){
   const user=sessionUser(req);if(!user){json(res,401,{error:'Not authenticated'});return true;}
   if(req.headers.origin!==trustedOrigin){json(res,403,{error:'Origin mismatch'});return true;}
   let input;try{input=await body(req,1024);}catch(error){json(res,error.status??400,{error:error.message});return true;}
   if(!owns(input,['expected'])||input.expected!==true){json(res,400,{error:'Confirm share revocation'});return true;}
   if(req.aborted||sessionUser(req)?.id!==user.id){json(res,401,{error:'Session changed during share revocation'});return true;}
   if(!store.remove(user.id,match[1])){json(res,404,{error:'Share is unavailable'});return true;}
   json(res,200,{ok:true});return true;
  }
  json(res,405,{error:'Method not allowed'},{Allow:'GET, DELETE'});return true;
 };
}
