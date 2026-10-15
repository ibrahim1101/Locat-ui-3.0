import {test} from 'node:test';
import assert from 'node:assert/strict';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {mkdtemp,readFile,readdir,rm,stat,writeFile,symlink} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {openDatabase} from './database.mjs';
import {verifyServerBackup,withVerifiedServerBackup} from './verifyBackup.mjs';
import {restoreServerBackup} from './restoreBackup.mjs';

async function fixture(run){
 const dir=await mkdtemp(join(tmpdir(),'locat-restore-test-'));
 const db=openDatabase(join(dir,'live.sqlite'));
 try{
  db.addUser({id:'alice',username:'alice',displayName:'Alice',salt:'salt',hash:'hash'});
  const file=join(dir,'backup.sqlite');await db.backupTo(file);
  const report=await verifyServerBackup(file);
  await run({dir,db,file,expectedSha256:report.sha256});
 }finally{db.close();await rm(dir,{recursive:true,force:true});}
}

test('verified restore preserves identity, accounts and opaque records when reopened independently',async()=>{
 await fixture(async({dir,db})=>{
  const envelope={v:1,iv:Buffer.alloc(12).toString('base64'),data:Buffer.alloc(48,7).toString('base64')};
  const config={v:1,storeId:randomUUID(),salt:Buffer.alloc(16).toString('base64'),iterations:600000,wrappedKey:envelope};
  const id=randomUUID();db.privateStore.initialize('alice','vault',config);db.privateStore.put('alice','vault',id,0,envelope);
  db.addSession('synthetic-hash','alice',Date.now()+60000);
  const source=join(dir,'opaque-backup.sqlite');await db.backupTo(source);
  const bytes=await readFile(source),report=await verifyServerBackup(source),target=join(dir,'restored.sqlite');
  const restored=await restoreServerBackup(source,target,{expectedSha256:report.sha256.toUpperCase()});
  assert.equal(restored.activated,false);assert.equal(restored.operation,'restore-to-new-file');
  assert.equal(restored.destination,target);assert.equal(restored.expectedHashMatched,true);
  assert.deepEqual(await readFile(target),bytes);assert.deepEqual(await readFile(source),bytes);
  if(process.platform!=='win32')assert.equal((await stat(target)).mode&0o777,0o600);
  const recovered=openDatabase(target);
  try{
   assert.equal(recovered.serverId,db.serverId);
   assert.equal(recovered.sessionUser('synthetic-hash',Date.now()).username,'alice');
   assert.deepEqual(recovered.privateStore.get('alice','vault',id),{revision:1,envelope});
   assert.deepEqual(recovered.privateStore.status('alice','vault').config,config);
   recovered.addUser({id:'bob',username:'bob',displayName:'Bob',salt:'s',hash:'h'});
   assert.equal(db.userByName('bob'),undefined);
  }finally{recovered.close();}
  assert.deepEqual(await readFile(source),bytes);
  assert.equal((await readdir(dir)).some(name=>name.startsWith('.locat-restore-')),false);
 });
});

test('restore rejects wrong hashes, occupied paths and every destination journal without changing data',async()=>{
 await fixture(async({dir,file,expectedSha256})=>{
  const bytes=await readFile(file),target=join(dir,'new.sqlite');
  await assert.rejects(restoreServerBackup(file,target),/requires an expected SHA-256/);
  await assert.rejects(restoreServerBackup(file,target,{expectedSha256:'f'.repeat(64)}),/does not match/);
  await assert.rejects(stat(target),{code:'ENOENT'});
  for(const suffix of ['', '-wal','-shm','-journal']){
   await writeFile(target+suffix,'');
   await assert.rejects(restoreServerBackup(file,target,{expectedSha256}),/already exists/);
   assert.equal((await stat(target+suffix)).size,0);
   await rm(target+suffix);
  }
  await assert.rejects(restoreServerBackup(file,file,{expectedSha256}),/already exists/);
  await assert.rejects(restoreServerBackup(file,join(dir,'missing','new.sqlite'),{expectedSha256}),/could not be written/);
  assert.deepEqual(await readFile(file),bytes);
  assert.equal((await readdir(dir)).some(name=>name.startsWith('.locat-restore-')),false);
 });
});

test('concurrent restore attempts publish exactly one complete file and preserve an existing symlink',async()=>{
 await fixture(async({dir,file,expectedSha256})=>{
  const target=join(dir,'winner.sqlite');
  const results=await Promise.allSettled([restoreServerBackup(file,target,{expectedSha256}),restoreServerBackup(file,target,{expectedSha256})]);
  assert.equal(results.filter(result=>result.status==='fulfilled').length,1);
  assert.match(results.find(result=>result.status==='rejected').reason.message,/already exists/);
  assert.deepEqual(await readFile(target),await readFile(file));
  const alias=join(dir,'alias.sqlite');
  try{await symlink(target,alias);}catch(error){if(!['EPERM','EACCES','ENOTSUP'].includes(error.code))throw error;return;}
  await assert.rejects(restoreServerBackup(file,alias,{expectedSha256}),/already exists/);
  assert.deepEqual(await readFile(alias),await readFile(file));
  assert.equal((await readdir(dir)).some(name=>name.startsWith('.locat-restore-')),false);
 });
});

test('restore CLI reports success only after publication and returns nonzero on repeated destinations or bad usage',async()=>{
 await fixture(async({dir,file,expectedSha256})=>{
  const args=['server/restore-backup.mjs',file,join(dir,'cli.sqlite'),expectedSha256];
  const run=promisify(execFile);
  const result=await run(process.execPath,args);
  assert.equal(JSON.parse(result.stdout).activated,false);
  assert.deepEqual(await readFile(args[2]),await readFile(file));
  await assert.rejects(run(process.execPath,args),error=>error.code===1&&error.stderr.includes('already exists'));
  await assert.rejects(run(process.execPath,['server/restore-backup.mjs']),error=>error.code===1&&error.stderr.includes('Usage:'));
 });
});

test('verified snapshot remains stable if the original is replaced before consumption and is removed after failure',async()=>{
 await fixture(async({dir,file,expectedSha256})=>{
  const before=await readFile(file);let working;
  await assert.rejects(withVerifiedServerBackup(file,{expectedSha256},async(_report,snapshot)=>{
   working=snapshot;
   await writeFile(file,'changed after verification');
   assert.deepEqual(await readFile(snapshot),before);
   throw new Error('synthetic publication failure');
  }),/synthetic publication failure/);
  await assert.rejects(stat(working),{code:'ENOENT'});
  assert.equal((await readdir(dir)).some(name=>name.startsWith('.locat-restore-')),false);
 });
});

test('restoring an older snapshot does not migrate either file',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'locat-old-restore-'));
 try{
  const file=join(dir,'v1.sqlite'),target=join(dir,'restored.sqlite'),raw=new DatabaseSync(file);
  raw.exec('CREATE TABLE users(id TEXT PRIMARY KEY,username TEXT,displayName TEXT,salt TEXT,hash TEXT);CREATE TABLE sessions(hash TEXT,userId TEXT,expiresAt INTEGER);CREATE TABLE envelopes(sequence INTEGER,id TEXT,senderId TEXT,recipientId TEXT,ciphertext TEXT,nonce TEXT,algorithm TEXT,createdAt INTEGER);PRAGMA user_version=1;');raw.close();
  const report=await verifyServerBackup(file),bytes=await readFile(file);
  assert.equal((await restoreServerBackup(file,target,{expectedSha256:report.sha256})).schemaVersion,1);
  assert.deepEqual(await readFile(target),bytes);assert.deepEqual(await readFile(file),bytes);
 }finally{await rm(dir,{recursive:true,force:true});}
});
