import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
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
