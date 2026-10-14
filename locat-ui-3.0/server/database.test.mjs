import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openDatabase } from './database.mjs';

test('SQLite durability, constraints, recipient cursors and consistent backup', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'locat-db-'));
  let db;
  let restored;
  try {
    const file = join(dir, 'app.sqlite');
    db = openDatabase(file);
    db.addUser({ id: 'a', username: 'alice', displayName: 'Alice', salt: 'salt', hash: 'hash' });
    db.addUser({ id: 'b', username: 'bob', displayName: 'Bob', salt: 'salt', hash: 'hash' });
    assert.throws(() => db.addUser({ id: 'c', username: 'alice', displayName: 'Duplicate', salt: 'salt', hash: 'hash' }));
    assert.throws(() => db.addSession('invalid', 'missing', Date.now() + 10000));
    db.addSession('valid', 'a', Date.now() + 10000);
    const message = { id: 'one', senderId: 'a', recipientId: 'b', ciphertext: 'opaque', nonce: 'nonce', algorithm: 'client-e2ee-v1', createdAt: Date.now() };
    assert.equal(db.addEnvelope(message), 1);
    db.close();
    db = openDatabase(file);
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
