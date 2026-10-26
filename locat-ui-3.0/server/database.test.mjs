import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile, readdir, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from "node:sqlite";
import { openDatabase } from './database.mjs';

test('SQLite durability, constraints, recipient cursors and consistent backup', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'locat-db-'));
  let db;
  let restored;
  try {
    const file = join(dir, 'app.sqlite');
    db = openDatabase(file);
    const serverId=db.serverId;
    db.addUser({ id: 'a', username: 'alice', displayName: 'Alice', salt: 'salt', hash: 'hash' });
    db.addUser({ id: 'b', username: 'bob', displayName: 'Bob', salt: 'salt', hash: 'hash' });
    assert.throws(() => db.addUser({ id: 'c', username: 'alice', displayName: 'Duplicate', salt: 'salt', hash: 'hash' }));
    assert.throws(() => db.addSession('invalid', 'missing', Date.now() + 10000));
    db.addSession('valid', 'a', Date.now() + 10000);
    const message = { id: 'one', senderId: 'a', recipientId: 'b', ciphertext: 'opaque', nonce: 'nonce', algorithm: 'client-e2ee-v1', createdAt: Date.now() };
    assert.equal(db.addEnvelope(message), 1);
    db.close();
    db = openDatabase(file);
    assert.equal(db.serverId,serverId);
    assert.equal(db.sessionUser('valid', Date.now()).username, 'alice');
    assert.equal(db.sessionUser('valid', Date.now() + 20000), undefined);
    assert.equal(db.inbox('a', 0).length, 0);
    assert.equal(db.inbox('b', 0)[0].id, 'one');
    assert.equal(db.inbox('b', 1).length, 0);
    const target = join(dir, 'backup.sqlite');
    await db.backupTo(target);
    await assert.rejects(db.backupTo(target), /already exists/);
    restored = openDatabase(target);
    assert.equal(restored.inbox('b', 0).length, 1);
    db.revokeSession('valid');
    assert.equal(db.sessionUser('valid', Date.now()), undefined);
    assert.equal(db.addEnvelope({ ...message, id: 'two' }), 2);
  } finally {
    db?.close(); restored?.close();
    await rm(dir, { recursive: true, force: true });
  }
});

test('schema v1 upgrades preserve accounts and reject unknown future versions', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'locat-upgrade-'));
  const file = join(dir, 'app.sqlite');
  let db;
  try {
    let raw = new DatabaseSync(file);
    raw.exec(`CREATE TABLE users (id TEXT PRIMARY KEY, username TEXT NOT NULL UNIQUE, displayName TEXT NOT NULL, salt TEXT NOT NULL, hash TEXT NOT NULL);
      CREATE TABLE sessions (hash TEXT PRIMARY KEY, userId TEXT NOT NULL REFERENCES users(id), expiresAt INTEGER NOT NULL);
      CREATE TABLE envelopes (sequence INTEGER PRIMARY KEY AUTOINCREMENT, id TEXT NOT NULL UNIQUE, senderId TEXT NOT NULL REFERENCES users(id), recipientId TEXT NOT NULL REFERENCES users(id), ciphertext TEXT NOT NULL, nonce TEXT NOT NULL, algorithm TEXT NOT NULL, createdAt INTEGER NOT NULL);
      INSERT INTO users VALUES ('a', 'alice', 'Alice', 'salt', 'hash'); PRAGMA user_version = 1;`);
    raw.close();
    db = openDatabase(file);
    assert.equal(db.userById('a').username, 'alice');
    const identity = db.userById('a').lcCode; assert.match(identity, /^[1-9][0-9]{3}$/);
    assert.equal(db.userByCode(identity).id, 'a');
    db.close(); db = openDatabase(file); assert.equal(db.userById('a').lcCode, identity);
    db.savePreferences('a', { theme: 'graphite' });
    assert.equal(db.preferences('a').theme, 'graphite');
    db.audit('a', 'test.event');
    assert.equal(db.events('a')[0].event, 'test.event');
    db.close(); db = null;
    raw = new DatabaseSync(file); raw.exec('PRAGMA user_version = 999;'); raw.close();
    assert.throws(() => openDatabase(file), /newer/);
  } finally { db?.close(); await rm(dir, { recursive: true, force: true }); }
});

test('schema v16 adds shared Link proof indexes without changing identities or account data',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'locat-link-proof-upgrade-')),file=join(dir,'app.sqlite');let db;
 try{db=openDatabase(file);db.addUser({id:'alice',username:'alice',displayName:'Alice',salt:'s',hash:'h'});const key=await crypto.subtle.generateKey({name:'ECDH',namedCurve:'P-256'},false,['deriveBits']),publicKey=Buffer.from(await crypto.subtle.exportKey('spki',key.publicKey)).toString('base64'),device=db.link.register('alice','Browser','web',publicKey).id;db.savePreferences('alice',{theme:'ember'});db.close();db=null;
  const raw=new DatabaseSync(file);raw.exec('DROP TABLE automationRules;DROP TABLE workspaceItems;DROP TABLE workspaceMembers;DROP TABLE workspaces;DROP TABLE encryptedShares;DROP TABLE calendarEvents;DROP TABLE linkProofTokens;DROP TABLE linkProofChallenges;PRAGMA user_version=16;');raw.close();db=openDatabase(file);
  assert.equal(db.health().schemaVersion,23);assert.equal(db.userById('alice').username,'alice');assert.equal(db.preferences('alice').theme,'ember');assert.equal(db.link.owned('alice',device).publicKey,publicKey);
  const check=new DatabaseSync(file,{readOnly:true}),tables=new Set(check.prepare("SELECT name FROM sqlite_schema WHERE type='table'").all().map(row=>row.name));check.close();assert.ok(tables.has('linkProofChallenges'));assert.ok(tables.has('linkProofTokens'));
 }finally{db?.close();await rm(dir,{recursive:true,force:true});}
});

test('schema v18 removes only retired media, Remote, and Sentinel tables',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'locat-retired-schema-')),file=join(dir,'app.sqlite');let db;
 try{
  db=openDatabase(file);db.addUser({id:'alice',username:'alice',displayName:'Alice',salt:'s',hash:'h'});db.savePreferences('alice',{theme:'ember'});db.addEnvelope({id:'message',senderId:'alice',recipientId:'alice',ciphertext:'ciphertext',nonce:'nonce',algorithm:'client-e2ee-v1',createdAt:1});db.close();db=null;
  const raw=new DatabaseSync(file);raw.exec(`DROP TABLE automationRules;DROP TABLE workspaceItems;DROP TABLE workspaceMembers;DROP TABLE workspaces;DROP TABLE encryptedShares;DROP TABLE calendarEvents;CREATE TABLE sentinelTokens(id TEXT);CREATE TABLE sentinelIncidents(id TEXT);CREATE TABLE sentinelEvents(id INTEGER,incidentId TEXT REFERENCES sentinelIncidents(id));CREATE TABLE remoteSessions(id TEXT);CREATE TABLE remoteSignals(id INTEGER,sessionId TEXT REFERENCES remoteSessions(id));CREATE TABLE mediaShareOverrides(id TEXT);PRAGMA user_version=17;`);raw.close();
  db=openDatabase(file);assert.equal(db.health().schemaVersion,23);assert.equal(db.userById('alice').username,'alice');assert.equal(db.preferences('alice').theme,'ember');assert.equal(db.inbox('alice',0)[0].id,'message');
  const inspect=new DatabaseSync(file,{readOnly:true}),tables=new Set(inspect.prepare("SELECT name FROM sqlite_schema WHERE type='table'").all().map(row=>row.name));inspect.close();for(const name of ['sentinelTokens','sentinelIncidents','sentinelEvents','remoteSessions','remoteSignals','mediaShareOverrides'])assert.ok(!tables.has(name),name);
 }finally{db?.close();await rm(dir,{recursive:true,force:true});}
});

test('schema v19 calendar data is account scoped and enforces update revisions',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'locat-calendar-upgrade-')),file=join(dir,'app.sqlite');let db;
 try{
  db=openDatabase(file);db.addUser({id:'alice',username:'alice',displayName:'Alice',salt:'s',hash:'h'});db.addUser({id:'bob',username:'bob',displayName:'Bob',salt:'s',hash:'h'});db.savePreferences('alice',{theme:'ember'});
  const now=Date.now(),created=db.calendar.create({id:'event-a',userId:'alice',title:'Review',notes:'Private details',startsAt:now+60_000,endsAt:now+120_000,reminderAt:now});
  assert.equal(created.title,'Review');assert.equal(db.calendar.list('alice',now,now+300_000).length,1);assert.equal(db.calendar.list('bob',now,now+300_000).length,0);assert.equal(db.calendar.get('bob','event-a'),undefined);assert.equal(db.calendar.dueReminders('alice',now).length,1);
  const edited=db.calendar.update('alice','event-a',created.updatedAt,{title:'Review updated',notes:'',startsAt:now+120_000,endsAt:now+180_000,reminderAt:null});assert.equal(edited.title,'Review updated');assert.equal(db.calendar.update('alice','event-a',created.updatedAt,{title:'stale',notes:'',startsAt:now+120_000,endsAt:now+180_000,reminderAt:null}),null);assert.equal(db.calendar.remove('bob','event-a',edited.updatedAt),false);assert.equal(db.calendar.remove('alice','event-a',edited.updatedAt),true);assert.equal(db.preferences('alice').theme,'ember');assert.equal(db.health().schemaVersion,23);
 }finally{db?.close();await rm(dir,{recursive:true,force:true});}
});

test('workspace roles, invitations, shared item revisions and automation delivery stay account scoped',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'locat-workspace-automation-')),file=join(dir,'app.sqlite');let db;
 try{
  db=openDatabase(file);for(const [id,username] of [['alice','alice'],['bob','bob']])db.addUser({id,username,displayName:username,salt:'s',hash:'h'});
  const now=Date.now(),workspace=db.workspaces.create({id:'workspace-a',userId:'alice',name:'Team'},now);assert.equal(workspace.role,'owner');assert.equal(db.workspaces.items(workspace.id,'bob'),null);
  assert.equal(db.workspaces.invite(workspace.id,'alice','bob',now),'pending');assert.equal(db.workspaces.pending('bob').length,1);assert.equal(db.workspaces.respond(workspace.id,'bob',true,now+1),true);assert.equal(db.workspaces.members(workspace.id,'bob').length,2);assert.equal(db.workspaces.setRole(workspace.id,'bob','alice','admin',now+2),false);assert.equal(db.workspaces.setRole(workspace.id,'alice','bob','admin',now+3),true);
  const item=db.workspaces.createItem({id:'item-a',workspaceId:workspace.id,userId:'alice',kind:'task',title:'Ship',content:'Release'},now+4);assert.equal(item.state,'open');const updated=db.workspaces.updateItem({id:item.id,workspaceId:workspace.id,userId:'bob',expectedRevision:1,title:'Ship',content:'Release',state:'done'},now+5);assert.equal(updated.state,'done');assert.equal(db.workspaces.updateItem({id:item.id,workspaceId:workspace.id,userId:'alice',expectedRevision:1,title:'stale',content:'',state:'open'},now+6),false);assert.equal(db.workspaces.remove(workspace.id,'bob','alice',now+7),false);assert.equal(db.workspaces.remove(workspace.id,'alice','bob',now+8),true);assert.equal(db.workspaces.members(workspace.id,'bob'),null);
  const rule=db.automations.create({id:'rule-a',userId:'alice',title:'Break',details:'Stretch',runAt:now+10_000},now);assert.equal(db.automations.list('bob').length,0);assert.deepEqual(db.automations.dispatch('alice',now+9_999),[]);assert.equal(db.automations.dispatch('alice',now+10_000).length,1);assert.deepEqual(db.automations.dispatch('alice',now+20_000),[]);assert.equal(db.automations.update({id:rule.id,userId:'alice',expectedRevision:rule.revision,title:'Water',details:'',runAt:now+30_000,enabled:false},now+21_000).enabled,false);assert.equal(db.automations.remove({id:rule.id,userId:'bob',expectedRevision:2},now+22_000),false);assert.equal(db.automations.remove({id:rule.id,userId:'alice',expectedRevision:2},now+23_000),true);assert.equal(db.health().schemaVersion,23);
 }finally{db?.close();await rm(dir,{recursive:true,force:true});}
});

test('recurring reminders coalesce missed intervals and schedule one next occurrence',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'locat-recurring-automation-')),file=join(dir,'app.sqlite');let db;
 try{
  db=openDatabase(file);db.addUser({id:'alice',username:'alice',displayName:'Alice',salt:'s',hash:'h'});const now=Date.now(),interval=24*60*60_000,first=now+10_000;
  const rule=db.automations.create({id:'daily-a',userId:'alice',title:'Review plan',details:'',runAt:first,repeatMs:interval},now);assert.equal(rule.repeatMs,interval);assert.equal(db.automations.dispatch('alice',first-1).length,0);assert.equal(db.automations.dispatch('alice',first).length,1);
  const afterFirst=db.automations.list('alice')[0];assert.equal(afterFirst.runAt,first+interval);assert.equal(afterFirst.firedAt,null);
  const late=first+3*interval+500;assert.equal(db.automations.dispatch('alice',late).length,1);const afterDowntime=db.automations.list('alice')[0];assert.equal(afterDowntime.runAt,first+4*interval);assert.equal(db.automations.dispatch('alice',late).length,0);
  assert.equal(db.automations.update({id:rule.id,userId:'alice',expectedRevision:rule.revision,title:'Review plan',details:'',runAt:late+60_000,enabled:true,repeatMs:null},late+1).repeatMs,null);
 }finally{db?.close();await rm(dir,{recursive:true,force:true});}
});

test('schema v23 adds recurrence without changing existing one-time reminders',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'locat-automation-v23-')),file=join(dir,'app.sqlite');let db;
 try{
  db=openDatabase(file);db.addUser({id:'alice',username:'alice',displayName:'Alice',salt:'s',hash:'h'});const runAt=Date.now()+60_000,rule=db.automations.create({id:'old-rule',userId:'alice',title:'Old reminder',details:'',runAt});db.close();db=undefined;
  const raw=new DatabaseSync(file);raw.exec('ALTER TABLE automationRules DROP COLUMN repeatMs;PRAGMA user_version=22;');raw.close();db=openDatabase(file);
  assert.equal(db.health().schemaVersion,23);const restored=db.automations.list('alice')[0];assert.equal(restored.id,rule.id);assert.equal(restored.runAt,runAt);assert.equal(restored.repeatMs,null);
 }finally{db?.close();await rm(dir,{recursive:true,force:true});}
});

 test('concurrent backup publication never overwrites a destination and removes staging files', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'locat-backup-race-'));
  const db = openDatabase(join(dir, 'source.sqlite'));
  try {
    const target = join(dir, 'winner.sqlite');
    const results = await Promise.allSettled([db.backupTo(target), db.backupTo(target)]);
    assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
    assert.match(results.find(result => result.status === 'rejected').reason.message, /already exists/);
    const bytes = await readFile(target);
    await assert.rejects(db.backupTo(target), /already exists/);
    assert.deepEqual(await readFile(target), bytes);
    if (process.platform !== 'win32') assert.equal((await stat(target)).mode & 0o777, 0o600);
    assert.equal((await readdir(dir)).some(name => name.startsWith('.locat-backup-')), false);
    const snapshot = new DatabaseSync(target, { readOnly: true });
    try { assert.equal(snapshot.prepare('PRAGMA integrity_check').get().integrity_check, 'ok'); }
    finally { snapshot.close(); }
  } finally { db.close(); await rm(dir, { recursive: true, force: true }); }
});
