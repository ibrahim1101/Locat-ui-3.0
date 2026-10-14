import { DatabaseSync, backup } from 'node:sqlite';
import { mkdirSync, chmodSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

/** Versioned relational store. Each write is durable before the API responds. */
export function openDatabase(filename) {
  const file = resolve(filename);
  mkdirSync(dirname(file), { recursive: true, mode: 0o700 });
  const sql = new DatabaseSync(file);
  chmodSync(file, 0o600);
  sql.exec('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL; PRAGMA synchronous = FULL; PRAGMA busy_timeout = 5000;');
  const version = sql.prepare('PRAGMA user_version').get().user_version;
  if (version > 1) { sql.close(); throw new Error('Database schema is newer than this application'); }
  if (version === 0) {
    sql.exec(`BEGIN IMMEDIATE;
      CREATE TABLE users (id TEXT PRIMARY KEY, username TEXT NOT NULL UNIQUE,
        displayName TEXT NOT NULL, salt TEXT NOT NULL, hash TEXT NOT NULL);
      CREATE TABLE sessions (hash TEXT PRIMARY KEY, userId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        expiresAt INTEGER NOT NULL);
      CREATE INDEX sessions_expiry ON sessions(expiresAt);
      CREATE TABLE envelopes (sequence INTEGER PRIMARY KEY AUTOINCREMENT, id TEXT NOT NULL UNIQUE,
        senderId TEXT NOT NULL REFERENCES users(id), recipientId TEXT NOT NULL REFERENCES users(id),
        ciphertext TEXT NOT NULL, nonce TEXT NOT NULL, algorithm TEXT NOT NULL, createdAt INTEGER NOT NULL);
      CREATE INDEX envelopes_inbox ON envelopes(recipientId, sequence);
      PRAGMA user_version = 1;
      COMMIT;`);
  }
  const userById = sql.prepare('SELECT * FROM users WHERE id = ?');
  const userByName = sql.prepare('SELECT * FROM users WHERE username = ?');
  return {
    userById: id => userById.get(id),
    userByName: name => userByName.get(name),
    addUser: u => sql.prepare('INSERT INTO users VALUES (?, ?, ?, ?, ?)').run(u.id, u.username, u.displayName, u.salt, u.hash),
    sessionUser: (hash, now) => sql.prepare('SELECT users.* FROM users JOIN sessions ON users.id = sessions.userId WHERE sessions.hash = ? AND sessions.expiresAt > ?').get(hash, now),
    addSession(hash, userId, expiresAt) {
      sql.exec('BEGIN IMMEDIATE');
      try {
        sql.prepare('DELETE FROM sessions WHERE expiresAt <= ?').run(Date.now());
        sql.prepare('INSERT INTO sessions VALUES (?, ?, ?)').run(hash, userId, expiresAt);
        sql.exec('COMMIT');
      } catch (error) { sql.exec('ROLLBACK'); throw error; }
    },
    sessions: (userId, now) => sql.prepare('SELECT hash AS id, expiresAt FROM sessions WHERE userId = ? AND expiresAt > ? ORDER BY expiresAt DESC').all(userId, now),
    revokeOwnedSession: (hash, userId) => sql.prepare('DELETE FROM sessions WHERE hash = ? AND userId = ?').run(hash, userId),
    changePassword(userId, salt, hash) {
      sql.exec('BEGIN IMMEDIATE');
      try {
        sql.prepare('UPDATE users SET salt = ?, hash = ? WHERE id = ?').run(salt, hash, userId);
        sql.prepare('DELETE FROM sessions WHERE userId = ?').run(userId);
        sql.exec('COMMIT');
      } catch (error) { sql.exec('ROLLBACK'); throw error; }
    },
    updateProfile: (userId, displayName) => sql.prepare('UPDATE users SET displayName = ? WHERE id = ?').run(displayName, userId),
    revokeSession: hash => sql.prepare('DELETE FROM sessions WHERE hash = ?').run(hash),
    inbox: (id, cursor) => sql.prepare('SELECT * FROM envelopes WHERE recipientId = ? AND sequence > ? ORDER BY sequence LIMIT 100').all(id, cursor),
    addEnvelope(m) {
      const result = sql.prepare('INSERT INTO envelopes (id, senderId, recipientId, ciphertext, nonce, algorithm, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)').run(m.id, m.senderId, m.recipientId, m.ciphertext, m.nonce, m.algorithm, m.createdAt);
      return Number(result.lastInsertRowid);
    },
    async backupTo(destination) {
      const target = resolve(destination);
      if (existsSync(target)) throw new Error('Backup destination already exists');
      mkdirSync(dirname(target), { recursive: true, mode: 0o700 });
      await backup(sql, target);
      chmodSync(target, 0o600);
      return target;
    },
    close: () => sql.close(),
  };
}
