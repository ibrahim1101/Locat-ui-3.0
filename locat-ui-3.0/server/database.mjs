import {auditEventPage} from './auditEvents.mjs';
import {managedMatrixDeviceStore} from './matrixManagedDevices.mjs';
import {matrixRevocationStore} from './matrixRevocation.mjs';
import { matrixBindingStore } from './matrixBinding.mjs';
import { linkStore } from './link.mjs';
import { privateStore } from './privateStore.mjs';
import { sentinelStore } from './sentinel.mjs';
import { randomInt, randomUUID } from 'node:crypto';
import { DatabaseSync, backup } from 'node:sqlite';
import { mkdirSync, chmodSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

export const DATABASE_SCHEMA_VERSION=14;

/** Versioned relational store. Each write is durable before the API responds. */
export function openDatabase(filename) {
  const file = resolve(filename);
  mkdirSync(dirname(file), { recursive: true, mode: 0o700 });
  const sql = new DatabaseSync(file);
  chmodSync(file, 0o600);
  sql.exec('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL; PRAGMA synchronous = FULL; PRAGMA busy_timeout = 5000;');
  const version = sql.prepare('PRAGMA user_version').get().user_version;
  if (version > DATABASE_SCHEMA_VERSION) { sql.close(); throw new Error('Database schema is newer than this application'); }
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
  if (version < 2) {
    sql.exec(`BEGIN IMMEDIATE;
      CREATE TABLE preferences (userId TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, value TEXT NOT NULL);
      CREATE TABLE audit (id INTEGER PRIMARY KEY AUTOINCREMENT, userId TEXT REFERENCES users(id), event TEXT NOT NULL, severity TEXT NOT NULL, createdAt INTEGER NOT NULL);
      CREATE INDEX audit_user ON audit(userId, id);
      PRAGMA user_version = 2;
      COMMIT;`);
  }
  if (version < 3) {
    sql.exec(`BEGIN IMMEDIATE;
      CREATE TABLE contacts (lowId TEXT NOT NULL REFERENCES users(id), highId TEXT NOT NULL REFERENCES users(id), requesterId TEXT NOT NULL REFERENCES users(id), status TEXT NOT NULL CHECK(status IN ('pending','accepted')), PRIMARY KEY(lowId,highId), CHECK(lowId < highId));
      CREATE TABLE blocks (blockerId TEXT NOT NULL REFERENCES users(id), blockedId TEXT NOT NULL REFERENCES users(id), PRIMARY KEY(blockerId,blockedId), CHECK(blockerId != blockedId));
      PRAGMA user_version = 3;
      COMMIT;`);
  }
  function allocateCode() {
    const used = new Set(sql.prepare('SELECT lcCode FROM users').all().map(row => row.lcCode));
    const start = randomInt(9000);
    for (let i = 0; i < 9000; i++) {
      const code = String(1000 + (start + i) % 9000);
      if (!used.has(code)) return code;
    }
    throw Object.assign(new Error('This server has reached its 9000 LC identity capacity'), { status: 503 });
  }
  if (version < 4) {
    sql.exec('BEGIN IMMEDIATE');
    try {
      sql.exec("ALTER TABLE users ADD COLUMN lcCode TEXT; ALTER TABLE users ADD COLUMN bio TEXT NOT NULL DEFAULT ''; CREATE UNIQUE INDEX users_code ON users(lcCode);");
      for (const user of sql.prepare('SELECT id FROM users').all()) sql.prepare('UPDATE users SET lcCode = ? WHERE id = ?').run(allocateCode(), user.id);
      sql.exec('PRAGMA user_version = 4; COMMIT;');
    } catch (error) { sql.exec('ROLLBACK'); throw error; }
  }
  if (version < 5) sql.exec(`BEGIN IMMEDIATE;
    CREATE TABLE sentinelTokens (id TEXT PRIMARY KEY, userId TEXT NOT NULL REFERENCES users(id), hash TEXT NOT NULL UNIQUE, name TEXT NOT NULL, prefix TEXT NOT NULL, createdAt INTEGER NOT NULL, lastUsedAt INTEGER, revokedAt INTEGER);
    CREATE TABLE sentinelIncidents (id TEXT PRIMARY KEY, userId TEXT NOT NULL REFERENCES users(id), source TEXT NOT NULL, fingerprint TEXT NOT NULL, title TEXT NOT NULL, description TEXT NOT NULL, severity TEXT NOT NULL, status TEXT NOT NULL, occurrences INTEGER NOT NULL, createdAt INTEGER NOT NULL, updatedAt INTEGER NOT NULL, UNIQUE(userId,source,fingerprint));
    CREATE INDEX sentinel_incidents_owner ON sentinelIncidents(userId,updatedAt);
    CREATE TABLE sentinelEvents (id INTEGER PRIMARY KEY AUTOINCREMENT, incidentId TEXT NOT NULL REFERENCES sentinelIncidents(id), action TEXT NOT NULL, note TEXT NOT NULL, createdAt INTEGER NOT NULL);
    CREATE INDEX sentinel_events_incident ON sentinelEvents(incidentId,id);
    PRAGMA user_version = 5; COMMIT;`);
  if (version < 6) sql.exec(`BEGIN IMMEDIATE;
    CREATE TABLE privateStores (userId TEXT NOT NULL REFERENCES users(id), module TEXT NOT NULL CHECK(module IN ('vault','secrets')), config TEXT NOT NULL, PRIMARY KEY(userId,module));
    CREATE TABLE privateObjects (userId TEXT NOT NULL, module TEXT NOT NULL, id TEXT NOT NULL, revision INTEGER NOT NULL, envelope TEXT NOT NULL, bytes INTEGER NOT NULL, updatedAt INTEGER NOT NULL, PRIMARY KEY(userId,module,id), FOREIGN KEY(userId,module) REFERENCES privateStores(userId,module));
    PRAGMA user_version = 6; COMMIT;`);
  if (version < 7) sql.exec(`BEGIN IMMEDIATE;
    CREATE TABLE linkDevices (id INTEGER PRIMARY KEY AUTOINCREMENT, userId TEXT NOT NULL REFERENCES users(id), name TEXT NOT NULL, platform TEXT NOT NULL, publicKey TEXT NOT NULL, createdAt INTEGER NOT NULL, lastSeenAt INTEGER, revokedAt INTEGER, UNIQUE(userId,publicKey));
    CREATE TABLE linkPairs (id TEXT PRIMARY KEY, userId TEXT NOT NULL REFERENCES users(id), deviceA INTEGER NOT NULL REFERENCES linkDevices(id), deviceB INTEGER NOT NULL REFERENCES linkDevices(id), status TEXT NOT NULL CHECK(status IN ('pending','verified','rejected')), confirmedA INTEGER NOT NULL, confirmedB INTEGER NOT NULL, updatedAt INTEGER NOT NULL, UNIQUE(userId,deviceA,deviceB),CHECK(deviceA<deviceB));
    PRAGMA user_version = 7; COMMIT;`);
  if (version < 8) sql.exec(`BEGIN IMMEDIATE;
    CREATE TABLE linkPayloads (id TEXT PRIMARY KEY, userId TEXT NOT NULL REFERENCES users(id), pairId TEXT NOT NULL, fromDevice INTEGER NOT NULL REFERENCES linkDevices(id), toDevice INTEGER NOT NULL REFERENCES linkDevices(id), kind TEXT NOT NULL CHECK(kind IN ('file','text','url','clipboard')), name TEXT NOT NULL, mime TEXT NOT NULL, size INTEGER NOT NULL, chunkCount INTEGER NOT NULL, status TEXT NOT NULL CHECK(status IN ('uploading','queued','complete','cancelled')), createdAt INTEGER NOT NULL, updatedAt INTEGER NOT NULL,CHECK(fromDevice!=toDevice));
    CREATE INDEX link_payload_owner ON linkPayloads(userId,createdAt);
    CREATE TABLE linkPayloadChunks (payloadId TEXT NOT NULL REFERENCES linkPayloads(id), seq INTEGER NOT NULL, envelope TEXT NOT NULL, PRIMARY KEY(payloadId,seq));
    PRAGMA user_version = 8; COMMIT;`);
  if (version < 9) sql.exec(`BEGIN IMMEDIATE;
    CREATE TABLE remoteSessions (id TEXT PRIMARY KEY,userId TEXT NOT NULL REFERENCES users(id),pairId TEXT NOT NULL,viewer INTEGER NOT NULL REFERENCES linkDevices(id),host INTEGER NOT NULL REFERENCES linkDevices(id),status TEXT NOT NULL CHECK(status IN ('pending','active','denied','closed','expired')),createdAt INTEGER NOT NULL,expiresAt INTEGER NOT NULL,CHECK(viewer!=host));
    CREATE INDEX remote_sessions_owner ON remoteSessions(userId,createdAt);
    CREATE TABLE remoteSignals (sequence INTEGER PRIMARY KEY AUTOINCREMENT,sessionId TEXT NOT NULL REFERENCES remoteSessions(id),signalId TEXT NOT NULL UNIQUE,fromDevice INTEGER NOT NULL REFERENCES linkDevices(id),kind TEXT NOT NULL CHECK(kind IN ('offer','answer','candidate')),envelope TEXT NOT NULL);
    CREATE INDEX remote_signals_session ON remoteSignals(sessionId,sequence);
    PRAGMA user_version = 9; COMMIT;`);
  if (version < 10) sql.exec(`BEGIN IMMEDIATE;
    ALTER TABLE users ADD COLUMN profileVisibility TEXT NOT NULL DEFAULT 'everyone';
    ALTER TABLE users ADD COLUMN usernameVisibility TEXT NOT NULL DEFAULT 'everyone';
    ALTER TABLE users ADD COLUMN allowContactRequests INTEGER NOT NULL DEFAULT 1;
    PRAGMA user_version = 10; COMMIT;`);
  if (version < 11) {
    sql.exec('BEGIN IMMEDIATE; CREATE TABLE serverMetadata (key TEXT PRIMARY KEY,value TEXT NOT NULL);');
    try { sql.prepare('INSERT INTO serverMetadata VALUES (?,?)').run('serverId',randomUUID()); sql.exec('PRAGMA user_version = 11; COMMIT;'); }
    catch(error) { sql.exec('ROLLBACK'); throw error; }
  }
  if(version<12)sql.exec(`BEGIN IMMEDIATE;
    CREATE TABLE matrixAccounts(userId TEXT PRIMARY KEY REFERENCES users(id),matrixUserId TEXT NOT NULL UNIQUE,createdAt INTEGER NOT NULL);
    CREATE TABLE matrixBindings(userId TEXT NOT NULL REFERENCES matrixAccounts(userId),linkDeviceId INTEGER NOT NULL REFERENCES linkDevices(id),matrixUserId TEXT NOT NULL,matrixDeviceId TEXT NOT NULL,publicKeys TEXT NOT NULL,tokenHash TEXT NOT NULL UNIQUE,sessionHash TEXT NOT NULL,expiresAt INTEGER NOT NULL,PRIMARY KEY(userId,linkDeviceId),UNIQUE(matrixUserId,matrixDeviceId));
    PRAGMA user_version=12;COMMIT;`);
  if(version<13)sql.exec(`BEGIN IMMEDIATE;
    CREATE TABLE matrixRevocations(userId TEXT NOT NULL REFERENCES users(id),linkDeviceId INTEGER NOT NULL REFERENCES linkDevices(id),matrixUserId TEXT NOT NULL,matrixDeviceId TEXT NOT NULL,status TEXT NOT NULL CHECK(status IN ('pending','confirmed','manual')),attempts INTEGER NOT NULL DEFAULT 0,nextAttemptAt INTEGER NOT NULL,leaseUntil INTEGER NOT NULL DEFAULT 0,leaseToken TEXT,createdAt INTEGER NOT NULL,updatedAt INTEGER NOT NULL,PRIMARY KEY(userId,linkDeviceId));
    CREATE INDEX matrix_revocations_due ON matrixRevocations(status,nextAttemptAt,leaseUntil);
    INSERT INTO matrixRevocations(userId,linkDeviceId,matrixUserId,matrixDeviceId,status,attempts,nextAttemptAt,leaseUntil,createdAt,updatedAt)
      SELECT b.userId,b.linkDeviceId,b.matrixUserId,b.matrixDeviceId,'pending',0,0,0,d.revokedAt,d.revokedAt FROM matrixBindings b JOIN linkDevices d ON d.userId=b.userId AND d.id=b.linkDeviceId WHERE d.revokedAt IS NOT NULL;
    UPDATE matrixBindings SET expiresAt=0 WHERE linkDeviceId IN (SELECT linkDeviceId FROM matrixRevocations);
    PRAGMA user_version=13;COMMIT;`);
  if(version<14)sql.exec(`BEGIN IMMEDIATE;
    CREATE TABLE matrixManagedDevices(userId TEXT NOT NULL REFERENCES matrixAccounts(userId),linkDeviceId INTEGER NOT NULL REFERENCES linkDevices(id),matrixUserId TEXT NOT NULL,matrixDeviceId TEXT NOT NULL,operationToken TEXT,operationUntil INTEGER NOT NULL DEFAULT 0,createdAt INTEGER NOT NULL,updatedAt INTEGER NOT NULL,PRIMARY KEY(userId,linkDeviceId),UNIQUE(matrixUserId,matrixDeviceId));
    PRAGMA user_version=14;COMMIT;`);
  const matrixRevocations=matrixRevocationStore(sql);
  const matrixManagedDevices=managedMatrixDeviceStore(sql,matrixRevocations);
  const link=linkStore(sql,matrixRevocations);
  const userById = sql.prepare('SELECT * FROM users WHERE id = ?');
  const userByName = sql.prepare('SELECT * FROM users WHERE username = ?');
  return {
    serverId: sql.prepare("SELECT value FROM serverMetadata WHERE key='serverId'").get().value,
    link,
    matrixRevocations,
    matrixManagedDevices,
    matrixBindings:matrixBindingStore(sql,link,matrixManagedDevices),
    sentinel: sentinelStore(sql),
    privateStore: privateStore(sql),
    acceptedContact: (a,b) => { const [low,high]=[a,b].sort(); return !!sql.prepare("SELECT 1 FROM contacts WHERE lowId=? AND highId=? AND status='accepted'").get(low,high); },
    savePrivacy: (id,profile,username,requests) => sql.prepare('UPDATE users SET profileVisibility=?,usernameVisibility=?,allowContactRequests=? WHERE id=?').run(profile,username,Number(requests),id),
    cancelContact: (a,b) => { const [low,high]=[a,b].sort(); return sql.prepare("DELETE FROM contacts WHERE lowId=? AND highId=? AND requesterId=? AND status='pending'").run(low,high,a); },
    removeContact: (a,b) => { const [low,high]=[a,b].sort(); return sql.prepare("DELETE FROM contacts WHERE lowId=? AND highId=? AND status='accepted'").run(low,high); },
    health: () => ({ schemaVersion: sql.prepare("PRAGMA user_version").get().user_version, accessible: sql.prepare("SELECT 1 AS ok").get().ok === 1 }),
    blocked: (a, b) => !!sql.prepare('SELECT 1 FROM blocks WHERE (blockerId = ? AND blockedId = ?) OR (blockerId = ? AND blockedId = ?)').get(a, b, b, a),
    contacts: userId => sql.prepare('SELECT * FROM contacts WHERE lowId = ? OR highId = ?').all(userId, userId),
    blocks: userId => sql.prepare('SELECT blockedId FROM blocks WHERE blockerId = ?').all(userId),
    requestContact(a, b) {
      const [low, high] = [a, b].sort();
      sql.prepare("INSERT INTO contacts VALUES (?, ?, ?, 'pending') ON CONFLICT(lowId,highId) DO NOTHING").run(low, high, a);
    },
    respondContact(a, b, accept) {
      const [low, high] = [a, b].sort();
      return accept ? sql.prepare("UPDATE contacts SET status = 'accepted' WHERE lowId = ? AND highId = ? AND requesterId != ? AND status = 'pending'").run(low, high, a) : sql.prepare("DELETE FROM contacts WHERE lowId = ? AND highId = ? AND requesterId != ? AND status = 'pending'").run(low, high, a);
    },
    block(a, b, enabled) {
      if (!enabled) return sql.prepare('DELETE FROM blocks WHERE blockerId = ? AND blockedId = ?').run(a, b);
      const [low, high] = [a, b].sort();
      sql.exec('BEGIN IMMEDIATE');
      try {
        sql.prepare('INSERT INTO blocks VALUES (?, ?) ON CONFLICT DO NOTHING').run(a, b);
        sql.prepare('DELETE FROM contacts WHERE lowId = ? AND highId = ?').run(low, high);
        sql.exec('COMMIT');
      } catch (error) { sql.exec('ROLLBACK'); throw error; }
    },
    preferences: userId => JSON.parse(sql.prepare('SELECT value FROM preferences WHERE userId = ?').get(userId)?.value ?? '{}'),
    savePreferences: (userId, value) => sql.prepare('INSERT INTO preferences VALUES (?, ?) ON CONFLICT(userId) DO UPDATE SET value = excluded.value').run(userId, JSON.stringify(value)),
    audit: (userId, event, severity = 'info') => sql.prepare('INSERT INTO audit (userId, event, severity, createdAt) VALUES (?, ?, ?, ?)').run(userId, event, severity, Date.now()),
    auditPage: (userId,options) => auditEventPage(sql,userId,options),
    events: userId => sql.prepare('SELECT id, event, severity, createdAt FROM audit WHERE userId = ? ORDER BY id DESC LIMIT 100').all(userId),
    userById: id => userById.get(id),
    userByName: name => userByName.get(name),
    userByCode: code => sql.prepare("SELECT * FROM users WHERE lcCode = ?").get(code),
    addUser: u => sql.prepare('INSERT INTO users (id, username, displayName, salt, hash, lcCode) VALUES (?, ?, ?, ?, ?, ?)').run(u.id, u.username, u.displayName, u.salt, u.hash, allocateCode()),
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
    revokeOtherSessions(userId,currentHash,expectedPasswordHash,now) {
      sql.exec('BEGIN IMMEDIATE');try {
        now??=Date.now();
        const current=sql.prepare('SELECT u.hash FROM users u JOIN sessions s ON s.userId=u.id WHERE u.id=? AND s.hash=? AND s.expiresAt>?').get(userId,currentHash,now);
        if(!current||current.hash!==expectedPasswordHash)throw Object.assign(new Error('Session or credentials changed; sign in again'),{status:401});
        sql.prepare('UPDATE matrixBindings SET expiresAt=0 WHERE userId=? AND sessionHash IN (SELECT hash FROM sessions WHERE userId=? AND hash<>? AND expiresAt>?)').run(userId,userId,currentHash,now);
        const revokedCount=sql.prepare('DELETE FROM sessions WHERE userId=? AND hash<>? AND expiresAt>?').run(userId,currentHash,now).changes;
        sql.prepare('INSERT INTO audit(userId,event,severity,createdAt) VALUES (?,?,?,?)').run(userId,'session.others.revoked','warn',now);
        sql.exec('COMMIT');return revokedCount;
      }catch(error){sql.exec('ROLLBACK');throw error;}
    },
    changePassword(userId, salt, hash, {sessionHash,expectedPasswordHash}, now) {
      sql.exec('BEGIN IMMEDIATE');
      try {
        now??=Date.now();
        const current=sql.prepare('SELECT u.hash FROM users u JOIN sessions s ON s.userId=u.id WHERE u.id=? AND s.hash=? AND s.expiresAt>?').get(userId,sessionHash,now);
        if(!current||current.hash!==expectedPasswordHash)throw Object.assign(new Error('Session or credentials changed; sign in again'),{status:401});
        sql.prepare('UPDATE users SET salt = ?, hash = ? WHERE id = ?').run(salt, hash, userId);
        sql.prepare('UPDATE matrixBindings SET expiresAt=0 WHERE userId=?').run(userId);
        sql.prepare('DELETE FROM sessions WHERE userId = ?').run(userId);
        sql.prepare('INSERT INTO audit(userId,event,severity,createdAt) VALUES (?,?,?,?)').run(userId,'password.changed','warn',now);
        sql.exec('COMMIT');
      } catch (error) { sql.exec('ROLLBACK'); throw error; }
    },
    updateProfile: (userId, displayName, bio) => sql.prepare('UPDATE users SET displayName = ?, bio = ? WHERE id = ?').run(displayName, bio, userId),
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
