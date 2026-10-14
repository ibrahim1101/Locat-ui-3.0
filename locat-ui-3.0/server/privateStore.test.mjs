import {test} from 'node:test';import assert from 'node:assert/strict';import {mkdtemp,rm} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join} from 'node:path';import {randomUUID} from 'node:crypto';import {openDatabase} from './database.mjs';
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
