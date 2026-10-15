import {test} from 'node:test';import assert from 'node:assert/strict';import {mkdtemp,rm} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join} from 'node:path';import {randomUUID} from 'node:crypto';import {DatabaseSync} from 'node:sqlite';import {createPrivateHandler} from './privateStore.mjs';import {openDatabase} from './database.mjs';
const envelope={v:1,iv:Buffer.alloc(12).toString('base64'),data:Buffer.alloc(48).toString('base64')};const configuration=()=>({v:1,storeId:randomUUID(),salt:Buffer.alloc(16).toString('base64'),iterations:600000,wrappedKey:envelope});
test('private stores preserve ciphertext, isolate accounts/modules and reject stale revisions and replacement config',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'locat-private-'));const file=join(dir,'db.sqlite');let db;
 try{db=openDatabase(file);for(const id of ['a','b'])db.addUser({id,username:id,displayName:id,salt:'salt',hash:'hash'});
 const config=configuration();db.privateStore.initialize('a','vault',config);db.privateStore.initialize('a','secrets',configuration());db.privateStore.initialize('b','vault',configuration());
 assert.throws(()=>db.privateStore.initialize('a','vault',configuration()),/already exists/);
 const id=randomUUID();assert.equal(db.privateStore.put('a','vault',id,0,envelope).revision,1);assert.throws(()=>db.privateStore.put('a','vault',id,0,envelope),/changed/);
 assert.throws(()=>db.privateStore.get('b','vault',id),/not found/);assert.throws(()=>db.privateStore.get('a','secrets',id),/not found/);
 assert.throws(()=>db.privateStore.remove('a','vault',id,2),/changed/);assert.equal(db.privateStore.put('a','vault',id,1,envelope).revision,2);
 db.close();db=openDatabase(file);assert.deepEqual(db.privateStore.get('a','vault',id),{revision:2,envelope});assert.deepEqual(db.privateStore.status('a','vault').config,config);
 db.privateStore.remove('a','vault',id,2);assert.equal(db.privateStore.status('a','vault').objects.length,0);
 }finally{db?.close();await rm(dir,{recursive:true,force:true});}
});
test('private object count and ciphertext quota are transactional and configuration validates KDF cost',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'locat-private-quota-'));let db;
 try{db=openDatabase(join(dir,'db.sqlite'));db.addUser({id:'a',username:'a',displayName:'a',salt:'s',hash:'h'});
 assert.throws(()=>db.privateStore.initialize('a','vault',{...configuration(),iterations:1}),/Invalid/);db.privateStore.initialize('a','vault',configuration());
 for(let i=0;i<128;i++)db.privateStore.put('a','vault',randomUUID(),0,envelope);
 assert.throws(()=>db.privateStore.put('a','vault',randomUUID(),0,envelope),/quota/);assert.equal(db.privateStore.status('a','vault').objects.length,128);
 db.privateStore.initialize('a','secrets',configuration());const big={...envelope,data:'A'.repeat(4194304)};
 for(let i=0;i<15;i++)db.privateStore.put('a','secrets',randomUUID(),0,big);
 assert.throws(()=>db.privateStore.put('a','secrets',randomUUID(),0,big),/quota/);assert.equal(db.privateStore.status('a','secrets').objects.length,15);
 }finally{db?.close();await rm(dir,{recursive:true,force:true});}
});

test('passphrase wrapping updates are owner scoped, compare-and-swap guarded and preserve encrypted entries',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'locat-private-rewrap-'));let db,second;
 try{
  const file=join(dir,'db.sqlite');db=openDatabase(file);second=openDatabase(file);
  for(const id of ['a','b'])db.addUser({id,username:id,displayName:id,salt:'s',hash:'h'});
  const sessionHash='f'.repeat(64);db.addSession(sessionHash,'a',Date.now()+60000);db.addSession('e'.repeat(64),'b',Date.now()+60000);
  const original=configuration(),next={...original,salt:Buffer.alloc(16,1).toString('base64'),wrappedKey:{v:1,iv:Buffer.alloc(12,1).toString('base64'),data:Buffer.alloc(48,1).toString('base64')}};
  db.privateStore.initialize('a','vault',original);db.privateStore.initialize('a','secrets',configuration());
  const id=randomUUID();db.privateStore.put('a','vault',id,0,envelope);const before=db.privateStore.status('a','vault').objects;
  assert.throws(()=>db.privateStore.rewrap('b','vault',original,next,'e'.repeat(64)),/Store changed/);
  assert.throws(()=>db.privateStore.rewrap('a','secrets',original,next,sessionHash),/Store changed/);
  assert.throws(()=>db.privateStore.rewrap('a','vault',original,{...next,storeId:randomUUID()},sessionHash),/same store identity/);
  assert.throws(()=>db.privateStore.rewrap('a','vault',original,original,sessionHash),/fresh wrapping/);
  assert.throws(()=>db.privateStore.rewrap('a','vault',original,next,'0'.repeat(64)),error=>error.status===401);
  const reordered={wrappedKey:{data:original.wrappedKey.data,iv:original.wrappedKey.iv,v:1},iterations:original.iterations,salt:original.salt,storeId:original.storeId,v:1};
  assert.deepEqual(db.privateStore.rewrap('a','vault',reordered,next,sessionHash),{ok:true});
  assert.throws(()=>second.privateStore.rewrap('a','vault',original,next,sessionHash),/Store changed/);
  assert.deepEqual(second.privateStore.status('a','vault').config,next);assert.deepEqual(db.privateStore.status('a','vault').objects,before);
  assert.deepEqual(db.privateStore.get('a','vault',id),{revision:1,envelope});
  const newer={...next,salt:Buffer.alloc(16,4).toString('base64'),wrappedKey:{v:1,iv:Buffer.alloc(12,4).toString('base64'),data:Buffer.alloc(48,4).toString('base64')}};
  assert.throws(()=>db.privateStore.rewrap('a','vault',next,newer,'e'.repeat(64)),error=>error.status===401);
  db.addSession('d'.repeat(64),'a',Date.now()-1);
  assert.throws(()=>db.privateStore.rewrap('a','vault',next,newer,'d'.repeat(64)),error=>error.status===401);
  db.revokeSession(sessionHash);
  assert.throws(()=>db.privateStore.rewrap('a','vault',next,newer,sessionHash),error=>error.status===401);
  assert.deepEqual(db.privateStore.status('a','vault').config,next);
  const events=db.auditPage('a',{q:'private.vault.passphrase.changed'}).events;
  assert.equal(events.length,1);assert.equal(events[0].severity,'warn');assert.equal(JSON.stringify(events).includes('wrappedKey'),false);
 }finally{second?.close();db?.close();await rm(dir,{recursive:true,force:true});}
});
test('an audit failure rolls back a private-store wrapping change',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'locat-private-rewrap-'));let db,raw;
 try{
  const file=join(dir,'db.sqlite');db=openDatabase(file);db.addUser({id:'a',username:'a',displayName:'a',salt:'s',hash:'h'});
  const sessionHash='f'.repeat(64);db.addSession(sessionHash,'a',Date.now()+60000);
  const original=configuration(),next={...original,salt:Buffer.alloc(16,2).toString('base64'),wrappedKey:{v:1,iv:Buffer.alloc(12,2).toString('base64'),data:Buffer.alloc(48,2).toString('base64')}};
  db.privateStore.initialize('a','secrets',original);raw=new DatabaseSync(file);
  raw.exec("CREATE TRIGGER reject_private_audit BEFORE INSERT ON audit BEGIN SELECT RAISE(ABORT,'synthetic audit failure');END;");
  assert.throws(()=>db.privateStore.rewrap('a','secrets',original,next,sessionHash),/synthetic audit failure/);
  assert.deepEqual(db.privateStore.status('a','secrets').config,original);
 }finally{raw?.close();db?.close();await rm(dir,{recursive:true,force:true});}
});
test('private writes recheck session after reading the body and passphrase changes have a small body limit',async()=>{
 let actor={id:'a'},release;const pending=new Promise(resolve=>{release=resolve;});let limit,called=false;
 const handler=createPrivateHandler({store:{rewrap(){called=true;}},sessionUser:()=>actor,body:async(_req,max)=>{limit=max;await pending;return {};},json(){},audit(){}});
 const operation=handler({method:'POST',headers:{origin:'https://locat.test'}},{},new URL('https://locat.test/api/private/secrets/rewrap'),'https://locat.test');
 actor=null;release();await assert.rejects(operation,error=>error.status===401);
 assert.equal(called,false);assert.equal(limit,4096);
});

test('private initialization, entry updates and removal roll back if their audit cannot commit',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'locat-private-atomic-'));let db,raw;
 try{
  const file=join(dir,'db.sqlite');db=openDatabase(file);raw=new DatabaseSync(file);
  db.addUser({id:'a',username:'a',displayName:'a',salt:'s',hash:'h'});
  const token='a'.repeat(64);db.addSession(token,'a',Date.now()+60000);
  const reject=()=>raw.exec("CREATE TRIGGER reject_private_write_audit BEFORE INSERT ON audit WHEN NEW.event LIKE 'private.%' BEGIN SELECT RAISE(ABORT,'synthetic audit unavailable');END;");
  const allow=()=>raw.exec('DROP TRIGGER reject_private_write_audit;');
  reject();assert.throws(()=>db.privateStore.initialize('a','secrets',configuration(),token),/synthetic audit unavailable/);
  assert.equal(db.privateStore.status('a','secrets').config,null);
  allow();db.privateStore.initialize('a','secrets',configuration(),token);
  const id=randomUUID();reject();assert.throws(()=>db.privateStore.put('a','secrets',id,0,envelope,token),/synthetic audit unavailable/);
  assert.equal(db.privateStore.status('a','secrets').objects.length,0);
  allow();db.privateStore.put('a','secrets',id,0,envelope,token);
  reject();assert.throws(()=>db.privateStore.put('a','secrets',id,1,{...envelope,iv:Buffer.alloc(12,5).toString('base64')},token),/synthetic audit unavailable/);
  assert.deepEqual(db.privateStore.get('a','secrets',id),{revision:1,envelope});
  assert.throws(()=>db.privateStore.remove('a','secrets',id,1,token),/synthetic audit unavailable/);
  assert.deepEqual(db.privateStore.get('a','secrets',id),{revision:1,envelope});
  allow();db.privateStore.remove('a','secrets',id,1,token);
  const events=db.auditPage('a',{q:'private.secrets.'}).events;
  assert.deepEqual(events.map(row=>row.event),['private.secrets.removed','private.secrets.written','private.secrets.initialized']);
  assert.equal(JSON.stringify(events).includes(id),false);assert.equal(JSON.stringify(events).includes('wrappedKey'),false);
 }finally{raw?.close();db?.close();await rm(dir,{recursive:true,force:true});}
});
test('every HTTP-style private write rejects a revoked, expired or foreign session inside its transaction',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'locat-private-session-'));let db;
 try{
  db=openDatabase(join(dir,'db.sqlite'));
  for(const id of ['a','b'])db.addUser({id,username:id,displayName:id,salt:'s',hash:'h'});
  const own='a'.repeat(64),foreign='b'.repeat(64),expired='c'.repeat(64);
  db.addSession(own,'a',Date.now()+60000);db.addSession(foreign,'b',Date.now()+60000);db.addSession(expired,'a',Date.now()-1);
  for(const hash of [foreign,expired])assert.throws(()=>db.privateStore.initialize('a','secrets',configuration(),hash),error=>error.status===401);
  db.privateStore.initialize('a','secrets',configuration(),own);
  const id=randomUUID();
  for(const hash of [foreign,expired])assert.throws(()=>db.privateStore.put('a','secrets',id,0,envelope,hash),error=>error.status===401);
  db.privateStore.put('a','secrets',id,0,envelope,own);
  db.revokeSession(own);
  for(const hash of [own,foreign,expired]){
   assert.throws(()=>db.privateStore.put('a','secrets',id,1,envelope,hash),error=>error.status===401);
   assert.throws(()=>db.privateStore.remove('a','secrets',id,1,hash),error=>error.status===401);
  }
  assert.throws(()=>db.privateStore.initialize('a','vault',configuration(),own),error=>error.status===401);
  assert.equal(db.privateStore.status('a','vault').config,null);
  assert.deepEqual(db.privateStore.get('a','secrets',id),{revision:1,envelope});
  assert.equal(db.auditPage('a',{q:'private.secrets.'}).events.length,2);
 }finally{db?.close();await rm(dir,{recursive:true,force:true});}
});
