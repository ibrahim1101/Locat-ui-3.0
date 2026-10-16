import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {openDatabase} from './database.mjs';
import {createPrivateMatrixConversation} from './matrixConversations.mjs';
import {matrixTokenHash} from './matrixBinding.mjs';
test('private room bootstrap is pair-idempotent, encrypted, bounded to accepted contacts and rechecks authorization',async()=>{
 const root=await mkdtemp(join(tmpdir(),'locat-rooms-'));let db,upstream;let count=0,mode='success',release;const requests=[];
 try{
  db=openDatabase(join(root,'db.sqlite'));const [alice,bob,eve]=['a','b','c'].map(c=>c.repeat(32));const actors={};const tokens={};
  for(const [index,id] of [alice,bob,eve].entries()){db.addUser({id,username:'user'+index,displayName:'Synthetic',salt:'salt',hash:'hash'});actors[id]=db.link.register(id,'Synthetic','web','key-'+id).id;tokens[id]='synthetic-token-'+id;const publicKeys={ed25519:Buffer.alloc(32,index+1).toString('base64').replace(/=+$/,''),curve25519:Buffer.alloc(32,index+4).toString('base64').replace(/=+$/,'')};db.matrixBindings.bind(id,actors[id],matrixTokenHash('session'),{userId:'@u'+index+':matrix.test',deviceId:'D'+index,accessToken:tokens[id],publicKeys},{userId:'@u'+index+':matrix.test',deviceId:'D'+index,keys:null});}
  db.requestContact(alice,bob);db.respondContact(bob,alice,true);
  upstream=createServer(async(req,res)=>{count++;let body='';for await(const chunk of req)body+=chunk;requests.push(JSON.parse(body));if(mode==='hold')await new Promise(resolve=>{release=resolve;});if(mode==='invalid'){res.end('{}');return;}res.end(JSON.stringify({room_id:'!synthetic'+count+':matrix.test'}));});await new Promise(resolve=>upstream.listen(0,'127.0.0.1',resolve));
  let valid=true;const provider={origin:'http://127.0.0.1:'+upstream.address().port};const create=(user,peer,extra={})=>createPrivateMatrixConversation({provider,store:db.matrixConversations,bindings:db.matrixBindings,userId:user,actor:actors[user],session:'session',input:{accountId:peer,accessToken:tokens[user],...extra},recheck(){if(!valid)throw Object.assign(new Error('Revoked'),{status:401});}});
  await assert.rejects(create(alice,eve),{status:404});await assert.rejects(create(alice,bob,{initial_state:[]}),{status:400});await assert.rejects(create(alice,bob,{accessToken:tokens[bob]}),{status:403});assert.equal(count,0);
  const result=await create(alice,bob);assert.equal(result.created,true);assert.equal(count,1);assert.deepEqual(requests[0].invite,['@u1:matrix.test']);assert.equal(requests[0].initial_state[0].content.algorithm,'m.megolm.v1.aes-sha2');assert.equal(requests[0].creation_content['m.federate'],false);assert.equal(requests[0].power_level_content_override.invite,100);assert.equal(db.matrixConversations.permits(alice,result.roomId),true);assert.equal(db.matrixConversations.permits(eve,result.roomId),false);
  assert.deepEqual(await create(bob,alice),{roomId:result.roomId,created:false});assert.equal(count,1);db.removeContact(alice,bob);assert.equal(db.matrixConversations.permits(alice,result.roomId),false);await assert.rejects(create(alice,bob),{status:404});db.requestContact(alice,bob);db.respondContact(bob,alice,true);db.block(alice,bob,true);assert.equal(db.matrixConversations.permits(bob,result.roomId),false);
  db.requestContact(alice,eve);db.respondContact(eve,alice,true);mode='hold';const pending=create(alice,eve);while(!release)await new Promise(resolve=>setTimeout(resolve,5));await assert.rejects(create(eve,alice),{status:409});valid=false;release();await assert.rejects(pending,{status:401});assert.equal(count,2);valid=true;assert.equal((await create(alice,eve)).created,false);assert.equal(count,2);
  db.requestContact(bob,eve);db.respondContact(eve,bob,true);mode='invalid';await assert.rejects(create(bob,eve),{status:502});await assert.rejects(create(eve,bob),{status:409});assert.equal(count,3);
  db.close();db=openDatabase(join(root,'db.sqlite'));assert.equal((await create(alice,eve)).roomId,'!synthetic2:matrix.test');assert.equal(db.health().schemaVersion,15);
 }finally{release?.();if(upstream)await new Promise(resolve=>upstream.close(resolve));db?.close();await rm(root,{recursive:true,force:true});}
});
