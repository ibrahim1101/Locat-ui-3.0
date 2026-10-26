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
  upstream=createServer(async(req,res)=>{if(req.method==='GET'){res.writeHead(404);res.end('{}');return;}count++;let body='';for await(const chunk of req)body+=chunk;requests.push(JSON.parse(body));if(mode==='hold')await new Promise(resolve=>{release=resolve;});if(mode==='invalid'){res.end('{}');return;}res.end(JSON.stringify({room_id:'!synthetic'+count+':matrix.test'}));});await new Promise(resolve=>upstream.listen(0,'127.0.0.1',resolve));
  let valid=true;const provider={origin:'http://127.0.0.1:'+upstream.address().port,serverName:'matrix.test'};const create=(user,peer,extra={})=>createPrivateMatrixConversation({provider,store:db.matrixConversations,bindings:db.matrixBindings,userId:user,actor:actors[user],session:'session',input:{accountId:peer,accessToken:tokens[user],...extra},recheck(){if(!valid)throw Object.assign(new Error('Revoked'),{status:401});}});
  await assert.rejects(create(alice,eve),{status:404});await assert.rejects(create(alice,bob,{initial_state:[]}),{status:400});await assert.rejects(create(alice,bob,{accessToken:tokens[bob]}),{status:403});assert.equal(count,0);
  const result=await create(alice,bob);assert.equal(result.created,true);assert.equal(count,1);assert.deepEqual(requests[0].invite,['@u1:matrix.test']);assert.equal(requests[0].initial_state[0].content.algorithm,'m.megolm.v1.aes-sha2');assert.equal(requests[0].creation_content['m.federate'],false);assert.equal(requests[0].power_level_content_override.invite,100);assert.equal(db.matrixConversations.permits(alice,result.roomId),true);assert.equal(db.matrixConversations.permits(eve,result.roomId),false);assert.deepEqual(db.matrixConversations.list(alice),[{accountId:bob,roomId:result.roomId,matrixUserId:'@u1:matrix.test'}]);assert.deepEqual(db.matrixConversations.list(eve),[]);
  assert.deepEqual(await create(bob,alice),{roomId:result.roomId,created:false});assert.equal(count,1);db.removeContact(alice,bob);assert.equal(db.matrixConversations.permits(alice,result.roomId),false);assert.deepEqual(db.matrixConversations.list(alice),[]);await assert.rejects(create(alice,bob),{status:404});db.requestContact(alice,bob);db.respondContact(bob,alice,true);db.block(alice,bob,true);assert.equal(db.matrixConversations.permits(bob,result.roomId),false);assert.deepEqual(db.matrixConversations.list(bob),[]);
  db.requestContact(alice,eve);db.respondContact(eve,alice,true);mode='hold';const pending=create(alice,eve);while(!release)await new Promise(resolve=>setTimeout(resolve,5));await assert.rejects(create(eve,alice),{status:409});valid=false;release();await assert.rejects(pending,{status:401});assert.equal(count,2);valid=true;assert.equal((await create(alice,eve)).created,false);assert.equal(count,2);
  db.requestContact(bob,eve);db.respondContact(eve,bob,true);mode='invalid';await assert.rejects(create(bob,eve),{status:502});await assert.rejects(create(eve,bob),{status:409});assert.equal(count,3);
  db.close();db=openDatabase(join(root,'db.sqlite'));assert.equal((await create(alice,eve)).roomId,'!synthetic2:matrix.test');assert.equal(db.health().schemaVersion,28);
 }finally{release?.();if(upstream)await new Promise(resolve=>upstream.close(resolve));db?.close();await rm(root,{recursive:true,force:true});}
});

test('lost room-create acknowledgement reconciles only the original protected room and never repeats creation',async()=>{
 const own='@alice:matrix.test',peer='@bob:matrix.test',operationId='9a5af88d-2360-44db-a3a4-701578507cf1',roomId='!recovered:matrix.test';
 let upstream,posts=0,gets=0,valid=true,contact=true,mode='valid',completed,payload;
 const state=()=>[
  {type:'m.room.create',state_key:'',sender:own,content:{room_version:'12','m.federate':false}},
  ...payload.initial_state.map(event=>({...event,sender:own})),
  {type:'m.room.join_rules',state_key:'',sender:own,content:{join_rule:'invite'}},
  {type:'m.room.power_levels',state_key:'',sender:own,content:payload.power_level_content_override},
  {type:'m.room.member',state_key:own,content:{membership:'join'}},
  {type:'m.room.member',state_key:peer,content:{membership:'invite'}},
 ];
 const bindings={authorize(){if(!valid)throw Object.assign(new Error('Revoked'),{status:403});return {matrixUserId:own};},peer(){if(!contact)throw Object.assign(new Error('Contact removed'),{status:403});return {matrixUserId:peer};}};
 const store={reserve(){return {operationId,status:completed?'ready':'pending',roomId:completed,created:posts===0};},complete(id,room){assert.equal(id,operationId);completed=room;}};
 try{
  upstream=createServer(async(req,res)=>{
   assert.equal(req.headers.authorization,'Bearer synthetic-recovery-token');
   if(req.method==='POST'){posts++;let body='';for await(const chunk of req)body+=chunk;payload=JSON.parse(body);assert.equal(payload.room_alias_name,'locat_'+operationId);res.destroy();return;}
   gets++;
   if(req.url.includes('/directory/room/')){assert.equal(decodeURIComponent(req.url.split('/').at(-1)),'#locat_'+operationId+':matrix.test');if(mode==='missing'){res.writeHead(404);res.end('{}');return;}res.end(JSON.stringify({room_id:mode==='bad-id'?'invalid':roomId}));return;}
   assert.equal(req.url,'/_matrix/client/v3/rooms/'+encodeURIComponent(roomId)+'/state');const events=state(),event=type=>events.find(value=>value.type===type);
   if(mode==='operation')event('org.locat.conversation').content={operationId:'another-operation'};
   if(mode==='plaintext')event('m.room.encryption').content={algorithm:'none'};
   if(mode==='world-history')event('m.room.history_visibility').content={history_visibility:'world_readable'};
   if(mode==='public')event('m.room.join_rules').content={join_rule:'public'};
   if(mode==='federated')event('m.room.create').content['m.federate']=true;
   if(mode==='additional-creator')event('m.room.create').content.additional_creators=['@eve:matrix.test'];
   if(mode==='creator-left')event('m.room.member').content={membership:'leave'};
   if(mode==='third-member')events.push({type:'m.room.member',state_key:'@eve:matrix.test',content:{membership:'join'}});
   if(mode==='weakened-event')event('m.room.power_levels').content={...event('m.room.power_levels').content,events:{...event('m.room.power_levels').content.events,'m.room.join_rules':0}};
   if(mode==='wrong-version')event('m.room.create').content.room_version='11';
   if(mode==='peer-admin')event('m.room.power_levels').content={...event('m.room.power_levels').content,users:{[peer]:100}};
   if(mode==='wrong-state-sender')event('org.locat.conversation').sender=peer;
   if(mode==='duplicate-state')events.push(event('m.room.encryption'));
   if(mode==='oversized'){res.end(JSON.stringify({padding:'x'.repeat(32769)}));return;}
   if(mode==='revoke')valid=false;
   if(mode==='remove-contact')contact=false;
   res.end(JSON.stringify(events));
  });await new Promise(resolve=>upstream.listen(0,'127.0.0.1',resolve));
  const run=()=>createPrivateMatrixConversation({provider:{origin:'http://127.0.0.1:'+upstream.address().port,serverName:'matrix.test'},store,bindings,userId:'a'.repeat(32),actor:1,session:'synthetic-session',input:{accountId:'b'.repeat(32),accessToken:'synthetic-recovery-token'},recheck(){if(!valid)throw Object.assign(new Error('Revoked'),{status:403});}});
  await assert.rejects(run(),{status:502});assert.equal(posts,1);assert.equal(completed,undefined);
  for(mode of ['missing','bad-id','operation','plaintext','world-history','public','federated','additional-creator','creator-left','third-member','peer-admin','weakened-event','wrong-version','wrong-state-sender','duplicate-state','oversized']){await assert.rejects(run(),error=>[409,502].includes(error.status),mode);assert.equal(completed,undefined);assert.equal(posts,1);}
  mode='revoke';await assert.rejects(run(),{status:403});assert.equal(completed,undefined);valid=true;
  valid=true;mode='remove-contact';await assert.rejects(run(),{status:403});assert.equal(completed,undefined);contact=true;
  mode='valid';contact=false;const before=gets;await assert.rejects(run(),{status:403});assert.equal(gets,before);contact=true;
  assert.deepEqual(await run(),{roomId,created:false});assert.equal(completed,roomId);assert.equal(posts,1);
  const reads=gets;assert.deepEqual(await run(),{roomId,created:false});assert.equal(gets,reads);
 }finally{if(upstream){upstream.closeAllConnections();await new Promise(resolve=>upstream.close(resolve));}}
});
