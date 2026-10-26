import {randomUUID} from 'node:crypto';
import {createRateLimiter} from './rateLimit.mjs';

const owns=(value,keys)=>value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).every(key=>keys.includes(key));
const uuid=value=>typeof value==='string'&&/^[a-f0-9-]{36}$/i.test(value);
const name=value=>typeof value==='string'&&value.trim().length>0&&value.trim().length<=100;
const content=value=>typeof value==='string'&&value.length<=20_000;
const states=new Set(['open','in-progress','done']);

export function createWorkspaceHandler({store,sessionUser,body,json}){
 const searchLimit=createRateLimiter(30,60_000);
 return async function workspaceHandler(req,res,url,trustedOrigin){
  if(url.pathname==='/api/workspaces'){
   const user=sessionUser(req);if(!user){json(res,401,{error:'Not authenticated'});return true;}
   if(req.method==='GET'){json(res,200,{workspaces:store.list(user.id)});return true;}
   if(req.method!=='POST'){json(res,405,{error:'Method not allowed'},{Allow:'GET, POST'});return true;}
   if(req.headers.origin!==trustedOrigin){json(res,403,{error:'Origin mismatch'});return true;}
   let input;try{input=await body(req,2048);}catch(error){json(res,error.status??400,{error:error.message});return true;}
   if(req.aborted||sessionUser(req)?.id!==user.id){json(res,401,{error:'Session changed during workspace creation'});return true;}
   if(!owns(input,['name'])||!name(input.name)){json(res,400,{error:'Choose a workspace name up to 100 characters'});return true;}
   json(res,201,{workspace:store.create({id:randomUUID(),userId:user.id,name:input.name.trim()})});return true;
  }
  if(url.pathname==='/api/workspaces/search'){
   const user=sessionUser(req);if(!user){json(res,401,{error:'Not authenticated'});return true;}
   if(req.method!=='GET'){json(res,405,{error:'Method not allowed'},{Allow:'GET'});return true;}
   const terms=url.searchParams.getAll('q');if(terms.length!==1||terms[0].trim().length<2||terms[0].trim().length>100){json(res,400,{error:'Search needs between 2 and 100 characters'});return true;}
   const retryAfter=searchLimit(user.id);if(retryAfter){json(res,429,{error:'Workspace search is temporarily rate limited'},{'Retry-After':String(retryAfter)});return true;}
   json(res,200,{results:store.search(user.id,terms[0].trim())});return true;
  }
  if(url.pathname==='/api/workspaces/invitations'){
   const user=sessionUser(req);if(!user){json(res,401,{error:'Not authenticated'});return true;}
   if(req.method==='GET'){json(res,200,{invitations:store.pending(user.id)});return true;}
   if(req.method!=='POST'){json(res,405,{error:'Method not allowed'},{Allow:'GET, POST'});return true;}
   if(req.headers.origin!==trustedOrigin){json(res,403,{error:'Origin mismatch'});return true;}
   let input;try{input=await body(req,2048);}catch(error){json(res,error.status??400,{error:error.message});return true;}
   if(req.aborted||sessionUser(req)?.id!==user.id){json(res,401,{error:'Session changed during invitation response'});return true;}
   if(!owns(input,['workspaceId','accept'])||!uuid(input.workspaceId)||typeof input.accept!=='boolean'){json(res,400,{error:'Invalid workspace invitation response'});return true;}
   if(!store.respond(input.workspaceId,user.id,input.accept)){json(res,404,{error:'Invitation is unavailable'});return true;}
   json(res,200,{ok:true});return true;
  }
  const match=/^\/api\/workspaces\/([a-f0-9-]{36})(?:\/(members(?:\/([a-f0-9-]{32,36}))?|invite|invitations|items(?:\/([a-f0-9-]{36}))?|files(?:\/([a-f0-9-]{36}))?|owner|export|activity(?:\/read)?))?$/i.exec(url.pathname);
  if(!match)return false;
  const user=sessionUser(req);if(!user){json(res,401,{error:'Not authenticated'});return true;}
  const workspaceId=match[1],section=match[2]??'',resource=section.split('/')[0],targetId=match[3],itemId=match[4]??match[5];
  if(req.method==='GET'){
   if(section===''){const workspace=store.list(user.id).find(row=>row.id===workspaceId);if(!workspace){json(res,404,{error:'Workspace is unavailable'});return true;}json(res,200,{workspace});return true;}
   if(resource==='members'&&!targetId){const members=store.members(workspaceId,user.id);if(!members){json(res,404,{error:'Workspace is unavailable'});return true;}json(res,200,{members});return true;}
   if(section==='invitations'){json(res,400,{error:'Use the account invitations endpoint'});return true;}
   if(resource==='items'&&!itemId){const items=store.items(workspaceId,user.id);if(!items){json(res,404,{error:'Workspace is unavailable'});return true;}json(res,200,{items});return true;}
   if(resource==='files'&&!itemId){const files=store.files(workspaceId,user.id);if(!files){json(res,404,{error:'Workspace is unavailable'});return true;}json(res,200,{files});return true;}
   if(resource==='files'&&itemId){const file=store.getFile(workspaceId,user.id,itemId);if(!file){json(res,404,{error:'File is unavailable'});return true;}json(res,200,{file});return true;}
   if(section==='activity'){const activity=store.activity(workspaceId,user.id);if(!activity){json(res,404,{error:'Workspace is unavailable'});return true;}json(res,200,activity);return true;}
   json(res,405,{error:'Method not allowed'});return true;
  }
  if(req.method==='POST'&&section==='activity/read'){
   if(req.headers.origin!==trustedOrigin){json(res,403,{error:'Origin mismatch'});return true;}
   let input;try{input=await body(req,1024);}catch(error){json(res,error.status??400,{error:error.message});return true;}
   if(!owns(input,[])){json(res,400,{error:'Activity acknowledgement must be empty'});return true;}
   if(req.aborted||sessionUser(req)?.id!==user.id){json(res,401,{error:'Session changed during activity acknowledgement'});return true;}
   const result=store.markActivityRead(workspaceId,user.id);if(!result){json(res,404,{error:'Workspace is unavailable'});return true;}json(res,200,result);return true;
  }
  if(req.method==='POST'&&section==='export'){
   if(req.headers.origin!==trustedOrigin){json(res,403,{error:'Origin mismatch'});return true;}
   let input;try{input=await body(req,1024);}catch(error){json(res,error.status??400,{error:error.message});return true;}
   if(!owns(input,[])){json(res,400,{error:'Workspace export request must be empty'});return true;}
   if(req.aborted||sessionUser(req)?.id!==user.id){json(res,401,{error:'Session changed during workspace export'});return true;}
   const data=store.exportData(workspaceId,user.id);if(!data){json(res,404,{error:'Workspace is unavailable'});return true;}json(res,200,{export:data});return true;
  }
  if(req.method==='DELETE'&&resource==='members'&&targetId){
   if(req.headers.origin!==trustedOrigin){json(res,403,{error:'Origin mismatch'});return true;}
   let input;try{input=await body(req,1024);}catch(error){json(res,error.status??400,{error:error.message});return true;}
   if(!owns(input,['expected'])||input.expected!==true){json(res,400,{error:'Confirm member removal'});return true;}
   if(req.aborted||sessionUser(req)?.id!==user.id){json(res,401,{error:'Session changed during member removal'});return true;}
   if(!store.remove(workspaceId,user.id,targetId)){json(res,404,{error:'Member cannot be removed'});return true;}json(res,200,{ok:true});return true;
  }
  if(req.method==='DELETE'&&section===''){
   if(req.headers.origin!==trustedOrigin){json(res,403,{error:'Origin mismatch'});return true;}
   let input;try{input=await body(req,1024);}catch(error){json(res,error.status??400,{error:error.message});return true;}
   if(!owns(input,['expected'])||input.expected!==true){json(res,400,{error:'Confirm workspace deletion'});return true;}
   if(req.aborted||sessionUser(req)?.id!==user.id){json(res,401,{error:'Session changed during workspace deletion'});return true;}
   if(!store.deleteWorkspace(workspaceId,user.id)){json(res,403,{error:'Only the workspace owner can delete it'});return true;}json(res,200,{ok:true});return true;
  }
  if(req.method==='PATCH'&&section==='owner'){
   if(req.headers.origin!==trustedOrigin){json(res,403,{error:'Origin mismatch'});return true;}
   let input;try{input=await body(req,1024);}catch(error){json(res,error.status??400,{error:error.message});return true;}
   if(!owns(input,['userId'])||typeof input.userId!=='string'||input.userId.length<1||input.userId.length>100){json(res,400,{error:'Choose an active workspace member'});return true;}
   if(req.aborted||sessionUser(req)?.id!==user.id){json(res,401,{error:'Session changed during ownership transfer'});return true;}
   if(!store.transferOwner(workspaceId,user.id,input.userId)){json(res,403,{error:'Only the owner can transfer ownership to an active member'});return true;}json(res,200,{ok:true});return true;
  }
  if(req.method==='DELETE'&&resource==='files'&&itemId){
   if(req.headers.origin!==trustedOrigin){json(res,403,{error:'Origin mismatch'});return true;}
   let input;try{input=await body(req,1024);}catch(error){json(res,error.status??400,{error:error.message});return true;}
   if(!owns(input,['expected'])||input.expected!==true){json(res,400,{error:'Confirm file removal'});return true;}
   if(req.aborted||sessionUser(req)?.id!==user.id){json(res,401,{error:'Session changed during Workspace file removal'});return true;}
   if(!store.deleteFile({id:itemId,workspaceId,userId:user.id})){json(res,404,{error:'File cannot be removed'});return true;}json(res,200,{ok:true});return true;
  }
  if(req.method==='DELETE'&&resource==='items'&&itemId){
   if(req.headers.origin!==trustedOrigin){json(res,403,{error:'Origin mismatch'});return true;}
   let input;try{input=await body(req,1024);}catch(error){json(res,error.status??400,{error:error.message});return true;}
   if(!owns(input,['expectedRevision'])||!Number.isSafeInteger(input.expectedRevision)||input.expectedRevision<1){json(res,400,{error:'Invalid item revision'});return true;}
   if(req.aborted||sessionUser(req)?.id!==user.id){json(res,401,{error:'Session changed during workspace update'});return true;}
   if(!store.deleteItem({id:itemId,workspaceId,userId:user.id,expectedRevision:input.expectedRevision})){json(res,409,{error:'Item changed or is unavailable'});return true;}json(res,200,{ok:true});return true;
  }
  if(!['POST','PATCH'].includes(req.method)){json(res,405,{error:'Method not allowed'});return true;}
  if(req.headers.origin!==trustedOrigin){json(res,403,{error:'Origin mismatch'});return true;}
  let input;try{input=await body(req,resource==='files'&&req.method==='POST'?12*1024*1024:24_576);}catch(error){json(res,error.status??400,{error:error.message});return true;}
  if(req.aborted||sessionUser(req)?.id!==user.id){json(res,401,{error:'Session changed during workspace operation'});return true;}
  if(section==='invite'&&req.method==='POST'){
   if(!owns(input,['userId'])||typeof input.userId!=='string'||input.userId.length>100){json(res,400,{error:'Choose a Locat account to invite'});return true;}
   const result=store.invite(workspaceId,user.id,input.userId);if(result===null){json(res,404,{error:'Workspace unavailable or invite permission required'});return true;}if(result===false){json(res,404,{error:'Account is unavailable'});return true;}if(result!=='pending'){json(res,409,{error:result==='active'?'That account is already a member':'An invitation is already pending'});return true;}json(res,201,{ok:true});return true;
  }
  if(section==='invitations'&&req.method==='POST'){
   if(!owns(input,['accept'])||typeof input.accept!=='boolean'){json(res,400,{error:'Choose whether to accept this invitation'});return true;}
   if(!store.respond(workspaceId,user.id,input.accept)){json(res,404,{error:'Invitation is unavailable'});return true;}json(res,200,{ok:true});return true;
  }
  if(resource==='members'&&targetId&&req.method==='PATCH'){
   if(!owns(input,['role'])||!['admin','member'].includes(input.role)){json(res,400,{error:'Choose member or admin role'});return true;}
   if(!store.setRole(workspaceId,user.id,targetId,input.role)){json(res,403,{error:'Only the owner can change active member roles'});return true;}json(res,200,{ok:true});return true;
  }
  if(resource==='items'&&!itemId&&req.method==='POST'){
   if(!owns(input,['kind','title','content','state'])||!['note','task'].includes(input.kind)||!name(input.title)||!content(input.content)||!(input.state===undefined||states.has(input.state))){json(res,400,{error:'Invalid workspace note or task'});return true;}
   const item=store.createItem({id:randomUUID(),workspaceId,userId:user.id,kind:input.kind,title:input.title.trim(),content:input.content,state:input.kind==='note'?'open':input.state??'open'});if(!item){json(res,404,{error:'Workspace is unavailable'});return true;}json(res,201,{item});return true;
  }
  if(resource==='files'&&!itemId&&req.method==='POST'){
   if(!owns(input,['name','mime','data'])||typeof input.name!=='string'||!input.name.trim()||input.name.length>255||/[\\/\x00-\x1f\x7f]/.test(input.name)||typeof input.mime!=='string'||input.mime.length>100||!(/^[a-z0-9!#$&^_.+-]+\/[a-z0-9!#$&^_.+-]+$/i.test(input.mime))||typeof input.data!=='string'||input.data.length>11_184_812||!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(input.data)){json(res,400,{error:'Choose a file up to 8 MiB with a valid name and media type'});return true;}
   const bytes=Buffer.from(input.data,'base64');if(bytes.toString('base64')!==input.data||bytes.length>8*1024*1024){json(res,400,{error:'Invalid Workspace file data'});return true;}
   const file=store.createFile({id:randomUUID(),workspaceId,userId:user.id,name:input.name.trim(),mime:input.mime||'application/octet-stream',content:bytes});if(!file){json(res,404,{error:'Workspace is unavailable'});return true;}json(res,201,{file});return true;
  }
  if(resource==='items'&&itemId&&req.method==='PATCH'){
   if(!owns(input,['expectedRevision','title','content','state'])||!Number.isSafeInteger(input.expectedRevision)||input.expectedRevision<1||!name(input.title)||!content(input.content)||!states.has(input.state)){json(res,400,{error:'Invalid workspace item update'});return true;}
   const updated=store.updateItem({id:itemId,workspaceId,userId:user.id,expectedRevision:input.expectedRevision,title:input.title.trim(),content:input.content,state:input.state});if(updated===false){json(res,409,{error:'Item changed or is unavailable'});return true;}if(!updated){json(res,404,{error:'Workspace is unavailable'});return true;}json(res,200,{item:updated});return true;
  }
  json(res,405,{error:'Method not allowed'});return true;
 };
}
