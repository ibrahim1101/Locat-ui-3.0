import {test} from 'node:test';
import assert from 'node:assert/strict';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {mkdtemp,readFile,readdir,rm,stat,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {openDatabase} from './database.mjs';
import {createServerBackup} from './createBackup.mjs';

test('read-only operator backup includes committed live WAL data and validates before publication',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'locat-create-backup-'));let db;
 try{
  const file=join(dir,'live.sqlite'),target=join(dir,'backup.sqlite');db=openDatabase(file);
  db.addUser({id:'a',username:'alice',displayName:'Alice',salt:'salt',hash:'hash'});
  assert.ok((await stat(file+'-wal')).size>0);
  const before=await readFile(file),report=await createServerBackup(file,target);
  assert.equal(report.ok,true);assert.equal(report.operation,'create-server-backup');
  assert.equal(report.counts.users,1);assert.equal(report.destination,target);
  const snapshot=new DatabaseSync(target,{readOnly:true});
  try{assert.equal(snapshot.prepare('SELECT username FROM users').get().username,'alice');}
  finally{snapshot.close();}
  assert.deepEqual(await readFile(file),before);
  assert.equal((await readdir(dir)).some(name=>name.startsWith('.locat-backup-')),false);
  const bytes=await readFile(target);
  await assert.rejects(createServerBackup(file,target),/already exists/);
  assert.deepEqual(await readFile(target),bytes);
 }finally{db?.close();await rm(dir,{recursive:true,force:true});}
});

test('operator backup does not create missing sources or publish malformed and unsupported databases',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'locat-create-reject-'));
 try{
  const missing=join(dir,'missing.sqlite'),target=join(dir,'backup.sqlite');
  await assert.rejects(createServerBackup(missing,target),/could not be read or written/);
  await assert.rejects(stat(missing),{code:'ENOENT'});
  await assert.rejects(stat(target),{code:'ENOENT'});
  const source=join(dir,'source.sqlite');await writeFile(source,'not a sqlite database');
  await assert.rejects(createServerBackup(source,target));
  await assert.rejects(stat(target),{code:'ENOENT'});
  await rm(source);const raw=new DatabaseSync(source);raw.exec('CREATE TABLE unrelated(id TEXT);PRAGMA user_version=999;');raw.close();
  const before=await readFile(source);
  await assert.rejects(createServerBackup(source,target),/unsupported/);
  assert.deepEqual(await readFile(source),before);await assert.rejects(stat(target),{code:'ENOENT'});
  assert.equal((await readdir(dir)).some(name=>name.startsWith('.locat-backup-')),false);
 }finally{await rm(dir,{recursive:true,force:true});}
});

test('operator backup leaves supported older source schemas unmigrated',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'locat-create-old-'));
 try{
  const file=join(dir,'v1.sqlite'),target=join(dir,'backup.sqlite'),raw=new DatabaseSync(file);
  raw.exec('CREATE TABLE users(id TEXT PRIMARY KEY,username TEXT,displayName TEXT,salt TEXT,hash TEXT);CREATE TABLE sessions(hash TEXT,userId TEXT,expiresAt INTEGER);CREATE TABLE envelopes(sequence INTEGER,id TEXT,senderId TEXT,recipientId TEXT,ciphertext TEXT,nonce TEXT,algorithm TEXT,createdAt INTEGER);PRAGMA user_version=1;');raw.close();
  const bytes=await readFile(file),report=await createServerBackup(file,target);
  assert.equal(report.schemaVersion,1);assert.deepEqual(await readFile(file),bytes);
  const snapshot=new DatabaseSync(target,{readOnly:true});
  try{assert.equal(snapshot.prepare('PRAGMA user_version').get().user_version,1);assert.equal(snapshot.prepare("SELECT 1 FROM sqlite_schema WHERE name='serverMetadata'").get(),undefined);}
  finally{snapshot.close();}
 }finally{await rm(dir,{recursive:true,force:true});}
});

test('backup CLI preserves path-only success output and rejects extra arguments before opening the source',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'locat-create-cli-'));let db;
 try{
  const file=join(dir,'source.sqlite'),target=join(dir,'backup.sqlite');db=openDatabase(file);
  const run=promisify(execFile),options={env:{...process.env,LOCAT_DATABASE_FILE:file}};
  const result=await run(process.execPath,['server/backup.mjs',target],options);
  assert.equal(result.stdout.trim(),target);
  await assert.rejects(run(process.execPath,['server/backup.mjs',target],options),error=>error.code===1&&error.stderr.includes('already exists'));
  const missing=join(dir,'missing.sqlite');
  await assert.rejects(run(process.execPath,['server/backup.mjs',join(dir,'unused.sqlite'),'extra'],{env:{...process.env,LOCAT_DATABASE_FILE:missing}}),error=>error.code===1&&error.stderr.includes('Usage:'));
  await assert.rejects(stat(missing),{code:'ENOENT'});
 }finally{db?.close();await rm(dir,{recursive:true,force:true});}
});

 test('backup destination sidecars are rejected even when empty and are never altered',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'locat-backup-sidecars-'));let db;
 try{
  const source=join(dir,'source.sqlite'),target=join(dir,'backup.sqlite');db=openDatabase(source);
  for(const suffix of ['-wal','-shm','-journal']){
   await writeFile(target+suffix,'');
   await assert.rejects(createServerBackup(source,target),/already exists/);
   await assert.rejects(stat(target),{code:'ENOENT'});
   assert.equal((await stat(target+suffix)).size,0);
   await rm(target+suffix);
  }
 }finally{db?.close();await rm(dir,{recursive:true,force:true});}
});
