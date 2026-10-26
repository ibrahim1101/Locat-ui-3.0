import {randomUUID} from 'node:crypto';

const MAX_DELAY=365*24*60*60_000,MIN_DELAY=60_000;
const owns=(value,keys)=>value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).every(key=>keys.includes(key));
function fields(input,now=Date.now()){
 if(!owns(input,['title','details','runAt','enabled']))return null;
 const title=typeof input.title==='string'?input.title.trim():'';
 if(!title||title.length>120||typeof input.details!=='string'||input.details.length>2000||!Number.isSafeInteger(input.runAt)||input.runAt<now+MIN_DELAY||input.runAt>now+MAX_DELAY||!(input.enabled===undefined||typeof input.enabled==='boolean'))return null;
 return{title,details:input.details,runAt:input.runAt,enabled:input.enabled??true};
}

export function createAutomationHandler({store,sessionUser,body,json}){
 return async function automationHandler(req,res,url,trustedOrigin){
  if(url.pathname==='/api/automate/dispatch'){
   const user=sessionUser(req);if(!user){json(res,401,{error:'Not authenticated'});return true;}
   if(req.method!=='POST'){json(res,405,{error:'Method not allowed'},{Allow:'POST'});return true;}
   if(req.headers.origin!==trustedOrigin){json(res,403,{error:'Origin mismatch'});return true;}
   let input;try{input=await body(req,1024);}catch(error){json(res,error.status??400,{error:error.message});return true;}
   if(!owns(input,[])){json(res,400,{error:'Dispatch request must be empty'});return true;}
   if(req.aborted||sessionUser(req)?.id!==user.id){json(res,401,{error:'Session changed during reminder dispatch'});return true;}
   json(res,200,{due:store.dispatch(user.id)});return true;
  }
  if(url.pathname==='/api/automate/rules'){
   const user=sessionUser(req);if(!user){json(res,401,{error:'Not authenticated'});return true;}
   if(req.method==='GET'){json(res,200,{rules:store.list(user.id)});return true;}
   if(req.method!=='POST'){json(res,405,{error:'Method not allowed'},{Allow:'GET, POST'});return true;}
   if(req.headers.origin!==trustedOrigin){json(res,403,{error:'Origin mismatch'});return true;}
   let input;try{input=await body(req,8192);}catch(error){json(res,error.status??400,{error:error.message});return true;}
   if(req.aborted||sessionUser(req)?.id!==user.id){json(res,401,{error:'Session changed during automation creation'});return true;}
   const normalized=fields(input);if(!normalized){json(res,400,{error:'Schedule a reminder at least one minute from now and within one year'});return true;}
   json(res,201,{rule:store.create({id:randomUUID(),userId:user.id,...normalized})});return true;
  }
  const match=/^\/api\/automate\/rules\/([a-f0-9-]{36})$/i.exec(url.pathname);if(!match)return false;
  const user=sessionUser(req);if(!user){json(res,401,{error:'Not authenticated'});return true;}
  if(!['PATCH','DELETE'].includes(req.method)){json(res,405,{error:'Method not allowed'},{Allow:'PATCH, DELETE'});return true;}
  if(req.headers.origin!==trustedOrigin){json(res,403,{error:'Origin mismatch'});return true;}
  let input;try{input=await body(req,8192);}catch(error){json(res,error.status??400,{error:error.message});return true;}
  if(req.aborted||sessionUser(req)?.id!==user.id){json(res,401,{error:'Session changed during automation update'});return true;}
  if(req.method==='DELETE'){
   if(!owns(input,['expectedRevision'])||!Number.isSafeInteger(input.expectedRevision)||input.expectedRevision<1){json(res,400,{error:'Invalid reminder revision'});return true;}
   if(!store.remove({id:match[1],userId:user.id,expectedRevision:input.expectedRevision})){json(res,409,{error:'Reminder changed or is unavailable'});return true;}
   json(res,200,{ok:true});return true;
  }
  if(!owns(input,['expectedRevision','title','details','runAt','enabled'])||!Number.isSafeInteger(input.expectedRevision)||input.expectedRevision<1){json(res,400,{error:'Invalid reminder update'});return true;}
  const normalized=fields({title:input.title,details:input.details,runAt:input.runAt,enabled:input.enabled});if(!normalized){json(res,400,{error:'Choose a valid reminder time within one year'});return true;}
  const rule=store.update({id:match[1],userId:user.id,expectedRevision:input.expectedRevision,...normalized});if(!rule){json(res,409,{error:'Reminder changed or is unavailable'});return true;}
  json(res,200,{rule});return true;
 };
}
