import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {openDatabase} from './database.mjs';
import {createLinkHandler} from './link.mjs';
import {issueLinkChallenge,answerLinkChallenge,revokeLinkProofs} from './linkProof.mjs';
async function identity(){const keys=await crypto.subtle.generateKey({name:'ECDH',namedCurve:'P-256'},false,['deriveBits']);return {...keys,publicKeyB64:Buffer.from(await crypto.subtle.exportKey('spki',keys.publicKey)).toString('base64')};}
async function proof(identity,userId,deviceId,session){
 const challenge=await issueLinkChallenge(userId,deviceId,session,identity.publicKeyB64);
 const publicKey=await crypto.subtle.importKey('spki',Buffer.from(challenge.publicKey,'base64'),{name:'ECDH',namedCurve:'P-256'},false,[]);
 const bits=await crypto.subtle.deriveBits({name:'ECDH',public:publicKey},identity.privateKey,256),base=await crypto.subtle.importKey('raw',bits,'HKDF',false,['deriveKey']);
 const context=new TextEncoder().encode(`locat-link-device-proof:ui3-v1:${userId}:${deviceId}:${challenge.id}`);
 const key=await crypto.subtle.deriveKey({name:'HKDF',hash:'SHA-256',salt:context,info:new TextEncoder().encode('challenge-response')},base,{name:'AES-GCM',length:256},false,['decrypt']);
 const answer=Buffer.from(await crypto.subtle.decrypt({name:'AES-GCM',iv:Buffer.from(challenge.iv,'base64'),additionalData:context},key,Buffer.from(challenge.data,'base64'))).toString('base64');
 return answerLinkChallenge(userId,session,challenge.id,answer).token;
}
async function fixture(run){const dir=await mkdtemp(join(tmpdir(),'locat-link-auth-'));let db;try{db=openDatabase(join(dir,'db.sqlite'));db.addUser({id:'a',username:'owner',displayName:'Owner',salt:'s',hash:'h'});const session='synthetic-link-session',hash=createHash('sha256').update(session).digest('hex');db.addSession(hash,'a',Date.now()+60000);const keys=await Promise.all([identity(),identity()]),ids=keys.map((key,index)=>db.link.register('a','Device '+index,'web',key.publicKeyB64).id),token=await proof(keys[0],'a',ids[0],session);await run({db,session,hash,ids,token});}finally{db?.close();await rm(dir,{recursive:true,force:true});}}
async function paused({db,session,hash,token},action,input,change){
 let release,entered;const gate=new Promise(resolve=>{release=resolve;}),reading=new Promise(resolve=>{entered=resolve;});let responded=false;
 const handler=createLinkHandler({store:db.link,sessionUser:()=>db.sessionUser(hash,Date.now()),sessionToken:()=>session,body:async()=>{entered();await gate;return input;},json(){responded=true;},audit(){}});
 const request={method:'POST',headers:{origin:'https://locat.test','x-locat-device-proof':token}};
 const operation=handler(request,{},new URL('https://locat.test/api/link/'+action),'https://locat.test');await reading;change();release();await assert.rejects(operation,error=>[401,403].includes(error.status));assert.equal(responded,false);
}
test('Link registration and device mutations recheck a session revoked during body reading',async()=>{
 for(const action of ['register','rename','pair','revoke','confirm','heartbeat'])await fixture(async value=>{
  const {db,hash,ids}=value,initial=db.link.list('a',ids[0]);
  const input=action==='register'?{name:'Late browser',platform:'web',publicKey:(await identity()).publicKeyB64}:action==='rename'?{name:'Late name'}:action==='pair'?{peer:ids[1]}:action==='revoke'?{id:ids[1]}:action==='confirm'?{id:'not-used',approved:true}:{};
  await paused(value,action,input,()=>db.revokeSession(hash));assert.deepEqual(db.link.list('a',ids[0]).devices,initial.devices);assert.deepEqual(db.link.list('a',ids[0]).pairs,initial.pairs);
 });
});
test('Link payload bodies retain the fresh session check',async()=>{
 for(const action of ['payload/create','payload/chunk','payload/finish'])await fixture(async value=>{
  await paused(value,action,{},()=>value.db.revokeSession(value.hash));assert.equal(value.db.link.payloads.list('a',value.ids[0]).length,0);
 });
});
test('an independently revoked proof or device cannot rename after a paused body',async()=>{
 for(const revokeDevice of [false,true])await fixture(async value=>{
  await paused(value,'rename',{name:'Late name'},()=>revokeDevice?value.db.link.revoke('a',value.ids[1],value.ids[0]):revokeLinkProofs('a',value.ids[0]));assert.equal(value.db.link.list('a',value.ids[1]).devices.find(row=>row.id===value.ids[0]).name,'Device 0');
 });
});

test('an old tab expected-account guard rejects a new cookie owner before registration or proof setup',async()=>{
 await fixture(async({db,session,hash,ids,token})=>{
  let read=false,response;
  const handler=createLinkHandler({store:db.link,sessionUser:()=>db.sessionUser(hash,Date.now()),sessionToken:()=>session,body:async()=>{read=true;return {};},json(_res,status,value){response={status,value};},audit(){}});
  for(const action of ['register','challenge','prove','rename','payload/create']){
   await assert.rejects(handler({method:'POST',headers:{origin:'https://locat.test','x-locat-account':'another-owner','x-locat-device-proof':token}},{},new URL('https://locat.test/api/link/'+action),'https://locat.test'),error=>error.status===403&&/account changed/.test(error.message));
  }
  assert.equal(read,false);assert.equal(db.link.list('a',ids[0]).devices.length,2);
  await handler({method:'GET',headers:{'x-locat-account':'a','x-locat-device-proof':token}},{},new URL('https://locat.test/api/link/devices'),'https://locat.test');assert.equal(response.status,200);assert.equal(response.value.currentDeviceId,ids[0]);
 });
});

test('ordinary Link command exhaustion cannot starve bounded proved cleanup or device revocation',async()=>{
 await fixture(async({db,session,hash,ids,token})=>{
  let input={},cleanups=0;const origin='https://locat.test';const handler=createLinkHandler({store:db.link,sessionUser:()=>db.sessionUser(hash,Date.now()),sessionToken:()=>session,body:async()=>input,json(){},audit(){},matrixBinding:async({actor,recheck})=>{recheck();assert.equal(actor,ids[0]);cleanups++;return true;}});
  const command=(action,proof=token)=>handler({method:'POST',headers:{origin,'x-locat-account':'a','x-locat-device-proof':proof}},{},new URL(origin+'/api/link/'+action),origin);
  for(let i=0;i<60;i++)await command('heartbeat');await assert.rejects(command('heartbeat'),{status:429});
  await assert.rejects(command('matrix/cancel-provision','invalid-proof'));assert.equal(cleanups,0);
  for(const action of ['cancel-provision','logout','disconnect','revoke-managed-device'])await command('matrix/'+action);assert.equal(cleanups,4);
  input={id:ids[1]};await command('revoke');assert.throws(()=>db.link.owned('a',ids[1]),/revoked/);
  for(let i=0;i<24;i++)await command('matrix/cancel-provision');await assert.rejects(command('matrix/cancel-provision'),{status:429});await assert.rejects(command('heartbeat'),{status:429});
 });
});
