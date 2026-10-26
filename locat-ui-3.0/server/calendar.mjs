import {randomUUID} from 'node:crypto';

const MAX_RANGE=62*24*60*60_000,MAX_DURATION=14*24*60*60_000,MAX_TITLE=120,MAX_NOTES=4000;
const REPEAT_OPTIONS=new Set([null,24*60*60_000,7*24*60*60_000]);
const owns=(value,keys)=>value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).every(key=>keys.includes(key));
const integer=value=>Number.isSafeInteger(value)&&Math.abs(value)<=8.64e15;
function eventFields(input){
 if(!owns(input,['title','notes','startsAt','endsAt','reminderAt','repeatMs']))return null;
 const title=typeof input.title==='string'?input.title.trim():'';
 const notes=typeof input.notes==='string'?input.notes.trim():null;
 const {startsAt,endsAt,reminderAt}=input;
 if(!title||title.length>MAX_TITLE||notes===null||notes.length>MAX_NOTES||!integer(startsAt)||!integer(endsAt)||endsAt<=startsAt||endsAt-startsAt>MAX_DURATION||!(reminderAt===null||integer(reminderAt)&&reminderAt<=startsAt)||Object.hasOwn(input,'repeatMs')&&!REPEAT_OPTIONS.has(input.repeatMs??null))return null;
 return{title,notes,startsAt,endsAt,reminderAt,repeatMs:Object.hasOwn(input,'repeatMs')?input.repeatMs??null:undefined};
}

export function createCalendarHandler({store,sessionUser,body,json}){
 return async function calendarHandler(req,res,url,trustedOrigin){
  if(url.pathname!=='/api/calendar/events')return false;
  if(!['GET','POST','PATCH','DELETE'].includes(req.method)){json(res,405,{error:'Method not allowed'},{Allow:'GET, POST, PATCH, DELETE'});return true;}
  const user=sessionUser(req);if(!user){json(res,401,{error:'Not authenticated'});return true;}
  if(req.method==='GET'){
   const from=Number(url.searchParams.get('from')),to=Number(url.searchParams.get('to'));
   if(!integer(from)||!integer(to)||to<=from||to-from>MAX_RANGE||[...url.searchParams.keys()].some(key=>!['from','to'].includes(key))){json(res,400,{error:'Choose a bounded calendar range'});return true;}
   json(res,200,{events:store.list(user.id,from,to)});return true;
  }
  if(req.headers.origin!==trustedOrigin){json(res,403,{error:'Origin mismatch'});return true;}
  let input;
  try{input=await body(req,12_288);}catch(error){json(res,error.status??400,{error:error.message});return true;}
  if(req.aborted||sessionUser(req)?.id!==user.id){json(res,401,{error:'Session changed during calendar operation'});return true;}
  if(req.method==='POST'){
   const fields=eventFields(input);if(!fields){json(res,400,{error:'Invalid event'});return true;}
   const event=store.create({id:randomUUID(),userId:user.id,...fields});json(res,201,{event});return true;
  }
  if(!owns(input,['id','expectedUpdatedAt','title','notes','startsAt','endsAt','reminderAt','repeatMs'])||typeof input.id!=='string'||!/^[a-f0-9-]{36}$/i.test(input.id)||!Number.isSafeInteger(input.expectedUpdatedAt)){json(res,400,{error:'Invalid event update'});return true;}
  if(req.method==='DELETE'){
   if(Object.keys(input).length!==2){json(res,400,{error:'Invalid event deletion'});return true;}
   const removed=store.remove(user.id,input.id,input.expectedUpdatedAt);
   if(!removed){json(res,409,{error:'Event changed or is unavailable; refresh and try again'});return true;}
   json(res,200,{ok:true});return true;
  }
  const values={title:input.title,notes:input.notes,startsAt:input.startsAt,endsAt:input.endsAt,reminderAt:input.reminderAt};if(Object.hasOwn(input,'repeatMs'))values.repeatMs=input.repeatMs;
  const fields=eventFields(values);
  if(!fields){json(res,400,{error:'Invalid event update'});return true;}
  const event=store.update(user.id,input.id,input.expectedUpdatedAt,fields);
  if(!event){json(res,409,{error:'Event changed or is unavailable; refresh and try again'});return true;}
  json(res,200,{event});return true;
 };
}
