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
  const raw=new DatabaseSync(file);raw.exec('DROP TABLE linkProofTokens;DROP TABLE linkProofChallenges;PRAGMA user_version=16;');raw.close();db=openDatabase(file);
  assert.equal(db.health().schemaVersion,18);assert.equal(db.userById('alice').username,'alice');assert.equal(db.preferences('alice').theme,'ember');assert.equal(db.link.owned('alice',device).publicKey,publicKey);
  const check=new DatabaseSync(file,{readOnly:true}),tables=new Set(check.prepare("SELECT name FROM sqlite_schema WHERE type='table'").all().map(row=>row.name));check.close();assert.ok(tables.has('linkProofChallenges'));assert.ok(tables.has('linkProofTokens'));
 }finally{db?.close();await rm(dir,{recursive:true,force:true});}
});

test('schema v18 removes only retired media, Remote, and Sentinel tables',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'locat-retired-schema-')),file=join(dir,'app.sqlite');let db;
 try{
  db=openDatabase(file);db.addUser({id:'alice',username:'alice',displayName:'Alice',salt:'s',hash:'h'});db.savePreferences('alice',{theme:'ember'});db.addEnvelope({id:'message',senderId:'alice',recipientId:'alice',ciphertext:'ciphertext',nonce:'nonce',algorithm:'client-e2ee-v1',createdAt:1});db.close();db=null;
  const raw=new DatabaseSync(file);raw.exec(`CREATE TABLE sentinelTokens(id TEXT);CREATE TABLE sentinelIncidents(id TEXT);CREATE TABLE sentinelEvents(id INTEGER,incidentId TEXT REFERENCES sentinelIncidents(id));CREATE TABLE remoteSessions(id TEXT);CREATE TABLE remoteSignals(id INTEGER,sessionId TEXT REFERENCES remoteSessions(id));CREATE TABLE mediaShareOverrides(id TEXT);PRAGMA user_version=17;`);raw.close();
  db=openDatabase(file);assert.equal(db.health().schemaVersion,18);assert.equal(db.userById('alice').username,'alice');assert.equal(db.preferences('alice').theme,'ember');assert.equal(db.inbox('alice',0)[0].id,'message');
  const inspect=new DatabaseSync(file,{readOnly:true}),tables=new Set(inspect.prepare("SELECT name FROM sqlite_schema WHERE type='table'").all().map(row=>row.name));inspect.close();for(const name of ['sentinelTokens','sentinelIncidents','sentinelEvents','remoteSessions','remoteSignals','mediaShareOverrides'])assert.ok(!tables.has(name),name);
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
