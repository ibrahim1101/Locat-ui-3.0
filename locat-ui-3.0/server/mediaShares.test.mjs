import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {DatabaseSync} from 'node:sqlite';
import {openDatabase} from './database.mjs';
import {verifyServerBackup} from './verifyBackup.mjs';
test('schema 15 migration preserves accounts; sharing tombstones, audits and backups survive reopen',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'locat-share-store-')),file=join(dir,'db.sqlite');let db;
 try{
  db=openDatabase(file);for(const id of ['owner','friend','other'])db.addUser({id,username:id,displayName:id,salt:'salt',hash:'hash'});const serverId=db.serverId;db.close();db=null;
  const old=new DatabaseSync(file);old.exec('DROP TABLE mediaShareOverrides;PRAGMA user_version=15');old.close();db=openDatabase(file);
  assert.equal(db.userById('owner').username,'owner');assert.equal(db.serverId,serverId);assert.equal(db.health().schemaVersion,16);
  assert.equal(db.mediaShares.decision('lib','owner','friend'),undefined);
  db.mediaShares.set('lib','owner','friend',false);db.mediaShares.set('lib','owner','friend',false);assert.equal(db.events('owner').length,1);
  assert.equal(db.mediaShares.decision('lib','other','friend'),undefined);
  assert.throws(()=>db.mediaShares.set('lib','owner','missing',true));assert.equal(db.events('owner').length,1);
  const backup=join(dir,'snapshot.sqlite');await db.backupTo(backup);const report=await verifyServerBackup(backup);assert.equal(report.counts.mediaShareOverrides,1);
  db.close();db=openDatabase(backup);assert.equal(db.mediaShares.decision('lib','owner','friend'),false);assert.equal(db.events('owner')[0].event,'media.share.revoked');db.close();db=openDatabase(file);
  db.mediaShares.set('lib','owner','friend',true);assert.equal(db.mediaShares.decision('lib','owner','friend'),true);assert.equal(db.events('owner').length,2);
  for(let i=0;i<127;i++){const id='contact'+i;db.addUser({id,username:id,displayName:id,salt:'salt',hash:'hash'});db.mediaShares.set('lib','owner',id,false);}
  assert.throws(()=>db.mediaShares.set('lib','owner','other',true),/decision limit/);assert.equal(db.mediaShares.list('lib','owner').length,128);db.mediaShares.set('lib','owner','friend',false);assert.equal(db.mediaShares.decision('lib','owner','friend'),false);
 }finally{db?.close();await rm(dir,{recursive:true,force:true});}
});
