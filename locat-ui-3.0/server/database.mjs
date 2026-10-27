import {matrixConversationStore} from './matrixConversations.mjs';
import {auditEventPage} from './auditEvents.mjs';
import {managedMatrixDeviceStore} from './matrixManagedDevices.mjs';
import {matrixRevocationStore} from './matrixRevocation.mjs';
import { matrixBindingStore } from './matrixBinding.mjs';
import { linkStore } from './link.mjs';
import { privateStore } from './privateStore.mjs';
import { randomInt, randomUUID } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import {writeServerSnapshot} from './backupSnapshot.mjs';
import { mkdirSync, chmodSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

export const DATABASE_SCHEMA_VERSION=28;

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
  if(version<15)sql.exec(`BEGIN IMMEDIATE;
    CREATE TABLE matrixConversations(lowId TEXT NOT NULL REFERENCES users(id),highId TEXT NOT NULL REFERENCES users(id),operationId TEXT NOT NULL UNIQUE,status TEXT NOT NULL CHECK(status IN ('pending','ready')),roomId TEXT UNIQUE,createdAt INTEGER NOT NULL,PRIMARY KEY(lowId,highId),CHECK(lowId<highId));
    PRAGMA user_version=15;COMMIT;`);
  if(version<17)sql.exec(`BEGIN IMMEDIATE;
    CREATE TABLE linkProofChallenges(id TEXT PRIMARY KEY,userId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,deviceId INTEGER NOT NULL REFERENCES linkDevices(id) ON DELETE CASCADE,sessionHash TEXT NOT NULL,secret BLOB NOT NULL CHECK(length(secret)=32),expiresAt INTEGER NOT NULL);
    CREATE INDEX link_proof_challenge_expiry ON linkProofChallenges(expiresAt);
    CREATE TABLE linkProofTokens(tokenHash TEXT PRIMARY KEY,userId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,deviceId INTEGER NOT NULL REFERENCES linkDevices(id) ON DELETE CASCADE,sessionHash TEXT NOT NULL,expiresAt INTEGER NOT NULL);
    CREATE INDEX link_proof_token_expiry ON linkProofTokens(expiresAt);
    CREATE INDEX link_proof_token_device ON linkProofTokens(userId,deviceId);
    PRAGMA user_version=17;COMMIT;`);
  if(version<18)sql.exec(`BEGIN IMMEDIATE;
    DROP TABLE IF EXISTS sentinelEvents;
    DROP TABLE IF EXISTS sentinelIncidents;
    DROP TABLE IF EXISTS sentinelTokens;
    DROP TABLE IF EXISTS remoteSignals;
    DROP TABLE IF EXISTS remoteSessions;
    DROP TABLE IF EXISTS mediaShareOverrides;
    PRAGMA user_version=18;COMMIT;`);
  if(version<19)sql.exec(`BEGIN IMMEDIATE;
    CREATE TABLE calendarEvents(id TEXT PRIMARY KEY,userId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,title TEXT NOT NULL,notes TEXT NOT NULL DEFAULT '',startsAt INTEGER NOT NULL,endsAt INTEGER NOT NULL,reminderAt INTEGER,createdAt INTEGER NOT NULL,updatedAt INTEGER NOT NULL,CHECK(endsAt>startsAt));
    CREATE INDEX calendar_events_range ON calendarEvents(userId,startsAt,endsAt);
    CREATE INDEX calendar_events_reminders ON calendarEvents(userId,reminderAt);
    PRAGMA user_version=19;COMMIT;`);
  if(version<20)sql.exec(`BEGIN IMMEDIATE;
    CREATE TABLE encryptedShares(id TEXT PRIMARY KEY,userId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,iv TEXT NOT NULL,ciphertext TEXT NOT NULL,expiresAt INTEGER NOT NULL,createdAt INTEGER NOT NULL);
    CREATE INDEX encrypted_shares_expiry ON encryptedShares(expiresAt);
    CREATE INDEX encrypted_shares_owner ON encryptedShares(userId,createdAt);
    PRAGMA user_version=20;COMMIT;`);
  if(version<21)sql.exec(`BEGIN IMMEDIATE;
    CREATE TABLE workspaces(id TEXT PRIMARY KEY,name TEXT NOT NULL,createdBy TEXT NOT NULL REFERENCES users(id),createdAt INTEGER NOT NULL,updatedAt INTEGER NOT NULL);
    CREATE TABLE workspaceMembers(workspaceId TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,userId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,role TEXT NOT NULL CHECK(role IN ('owner','admin','member')),status TEXT NOT NULL CHECK(status IN ('pending','active')),invitedBy TEXT NOT NULL REFERENCES users(id),createdAt INTEGER NOT NULL,updatedAt INTEGER NOT NULL,PRIMARY KEY(workspaceId,userId));
    CREATE INDEX workspace_members_user ON workspaceMembers(userId,status,updatedAt);
    CREATE TABLE workspaceItems(id TEXT PRIMARY KEY,workspaceId TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,authorId TEXT NOT NULL REFERENCES users(id),kind TEXT NOT NULL CHECK(kind IN ('note','task')),title TEXT NOT NULL,content TEXT NOT NULL,state TEXT NOT NULL CHECK(state IN ('open','in-progress','done')),revision INTEGER NOT NULL,createdAt INTEGER NOT NULL,updatedAt INTEGER NOT NULL);
    CREATE INDEX workspace_items_board ON workspaceItems(workspaceId,kind,state,updatedAt);
    PRAGMA user_version=21;COMMIT;`);
  if(version<22)sql.exec(`BEGIN IMMEDIATE;
    CREATE TABLE automationRules(id TEXT PRIMARY KEY,userId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,title TEXT NOT NULL,details TEXT NOT NULL DEFAULT '',runAt INTEGER NOT NULL,enabled INTEGER NOT NULL CHECK(enabled IN (0,1)),firedAt INTEGER,revision INTEGER NOT NULL,createdAt INTEGER NOT NULL,updatedAt INTEGER NOT NULL);
    CREATE INDEX automation_due ON automationRules(userId,enabled,firedAt,runAt);
    PRAGMA user_version=22;COMMIT;`);
  if(version<23)sql.exec(`BEGIN IMMEDIATE;
    ALTER TABLE automationRules ADD COLUMN repeatMs INTEGER CHECK(repeatMs IS NULL OR repeatMs IN (86400000,604800000));
    PRAGMA user_version=23;COMMIT;`);
  if(version<24)sql.exec(`BEGIN IMMEDIATE;
    ALTER TABLE calendarEvents ADD COLUMN repeatMs INTEGER CHECK(repeatMs IS NULL OR repeatMs IN (86400000,604800000));
    PRAGMA user_version=24;COMMIT;`);
  if(version<25)sql.exec(`BEGIN IMMEDIATE;
    ALTER TABLE calendarEvents ADD COLUMN workspaceId TEXT REFERENCES workspaces(id) ON DELETE CASCADE;
    CREATE INDEX calendar_events_workspace_range ON calendarEvents(workspaceId,startsAt,endsAt);
    PRAGMA user_version=25;COMMIT;`);
  if(version<26)sql.exec(`BEGIN IMMEDIATE;
    ALTER TABLE encryptedShares ADD COLUMN downloadLimit INTEGER NOT NULL DEFAULT 100 CHECK(downloadLimit BETWEEN 1 AND 100);
    ALTER TABLE encryptedShares ADD COLUMN downloadCount INTEGER NOT NULL DEFAULT 0 CHECK(downloadCount BETWEEN 0 AND downloadLimit);
    PRAGMA user_version=26;COMMIT;`);
  if(version<27)sql.exec(`BEGIN IMMEDIATE;
    CREATE TABLE workspaceActivity(sequence INTEGER PRIMARY KEY AUTOINCREMENT,id TEXT NOT NULL UNIQUE,workspaceId TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,actorId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,event TEXT NOT NULL CHECK(event IN ('workspace.created','member.invited','invite.accepted','invite.declined','member.role.changed','owner.transferred','member.removed','item.created','item.updated','item.deleted','file.uploaded','file.deleted')),subjectId TEXT,createdAt INTEGER NOT NULL);
    CREATE INDEX workspace_activity_feed ON workspaceActivity(workspaceId,sequence DESC);
    CREATE TABLE workspaceActivityReads(workspaceId TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,userId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,lastSeenSequence INTEGER NOT NULL DEFAULT 0,PRIMARY KEY(workspaceId,userId));
    PRAGMA user_version=27;COMMIT;`);
  if(version<28)sql.exec(`BEGIN IMMEDIATE;
    ALTER TABLE workspaceActivity RENAME TO workspaceActivity_old;
    CREATE TABLE workspaceActivity(sequence INTEGER PRIMARY KEY AUTOINCREMENT,id TEXT NOT NULL UNIQUE,workspaceId TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,actorId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,event TEXT NOT NULL CHECK(event IN ('workspace.created','member.invited','invite.accepted','invite.declined','member.role.changed','owner.transferred','member.removed','item.created','item.updated','item.deleted','file.uploaded','file.deleted')),subjectId TEXT,createdAt INTEGER NOT NULL);
    INSERT INTO workspaceActivity(sequence,id,workspaceId,actorId,event,subjectId,createdAt) SELECT sequence,id,workspaceId,actorId,event,subjectId,createdAt FROM workspaceActivity_old;
    DROP TABLE workspaceActivity_old;
    CREATE INDEX workspace_activity_feed ON workspaceActivity(workspaceId,sequence DESC);
    CREATE TABLE workspaceFiles(id TEXT PRIMARY KEY,workspaceId TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,authorId TEXT NOT NULL REFERENCES users(id),name TEXT NOT NULL,mime TEXT NOT NULL,size INTEGER NOT NULL CHECK(size BETWEEN 0 AND 8388608),content BLOB NOT NULL,createdAt INTEGER NOT NULL);
    CREATE INDEX workspace_files_list ON workspaceFiles(workspaceId,createdAt DESC,id);
    PRAGMA user_version=28;COMMIT;`);
  const matrixRevocations=matrixRevocationStore(sql);
  const matrixManagedDevices=managedMatrixDeviceStore(sql,matrixRevocations);
  const link=linkStore(sql,matrixRevocations);
  const matrixBindings=matrixBindingStore(sql,link,matrixManagedDevices);
  const userById = sql.prepare('SELECT * FROM users WHERE id = ?');
  const userByName = sql.prepare('SELECT * FROM users WHERE username = ?');
  return {
    serverId: sql.prepare("SELECT value FROM serverMetadata WHERE key='serverId'").get().value,
    link,
    matrixRevocations,
    matrixManagedDevices,
    matrixBindings,
    matrixConversations:matrixConversationStore(sql,matrixBindings),
    calendar: calendarStore(sql),
    encryptedShares: encryptedShareStore(sql),
    workspaces: workspaceStore(sql),
    automations: automationStore(sql),
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
      return (await writeServerSnapshot(sql,destination)).destination;
    },
    close: () => sql.close(),
  };
}

function calendarStore(sql) {
  const byId=sql.prepare('SELECT * FROM calendarEvents WHERE id=?');
  const personalList=sql.prepare('SELECT * FROM calendarEvents WHERE userId=? AND workspaceId IS NULL AND (repeatMs IS NOT NULL OR startsAt<? AND endsAt>=?) ORDER BY startsAt,id LIMIT 5000');
  const sharedList=sql.prepare('SELECT * FROM calendarEvents WHERE workspaceId=? AND (repeatMs IS NOT NULL OR startsAt<? AND endsAt>=?) ORDER BY startsAt,id LIMIT 5000');
  const allList=sql.prepare("SELECT e.* FROM calendarEvents e WHERE (e.workspaceId IS NULL AND e.userId=? OR e.workspaceId IN (SELECT workspaceId FROM workspaceMembers WHERE userId=? AND status='active')) AND (e.repeatMs IS NOT NULL OR e.startsAt<? AND e.endsAt>=?) ORDER BY e.startsAt,e.id LIMIT 5000");
  const activeMember=sql.prepare("SELECT 1 FROM workspaceMembers WHERE workspaceId=? AND userId=? AND status='active'");
  function expand(rows,from,to){
    const events=[];
    for(const event of rows){
      if(event.repeatMs===null){events.push({...event,masterStartsAt:event.startsAt,masterEndsAt:event.endsAt,masterReminderAt:event.reminderAt});continue;}
      const duration=event.endsAt-event.startsAt,reminderOffset=event.reminderAt===null?null:event.startsAt-event.reminderAt;
      const first=Math.max(0,Math.ceil((from-duration-event.startsAt)/event.repeatMs));
      for(let occurrence=first;;occurrence++){
        const startsAt=event.startsAt+occurrence*event.repeatMs;if(startsAt>=to)break;
        const endsAt=startsAt+duration;if(endsAt<from)continue;
        events.push({...event,startsAt,endsAt,reminderAt:reminderOffset===null?null:startsAt-reminderOffset,masterStartsAt:event.startsAt,masterEndsAt:event.endsAt,masterReminderAt:event.reminderAt});
        if(events.length>=1000){events.sort((a,b)=>a.startsAt-b.startsAt||a.id.localeCompare(b.id));events.length=500;}
      }
    }
    return events.sort((a,b)=>a.startsAt-b.startsAt||a.id.localeCompare(b.id)).slice(0,500);
  }
  function inRange(userId,from,to,workspaceId=null){
    if(!workspaceId)return expand(personalList.all(userId,to,from),from,to);
    sql.exec('BEGIN');try{if(!activeMember.get(workspaceId,userId)){sql.exec('ROLLBACK');return null;}const rows=sharedList.all(workspaceId,to,from),events=expand(rows,from,to);sql.exec('COMMIT');return events;}catch(error){sql.exec('ROLLBACK');throw error;}
  }
  const allInRange=(userId,from,to)=>expand(allList.all(userId,userId,to,from),from,to);
  function canAccess(event,userId){return event&&(event.workspaceId?!!activeMember.get(event.workspaceId,userId):event.userId===userId);}
  return {
    list:inRange,
    listAll:allInRange,
    get:(userId,id)=>{const event=byId.get(id);return canAccess(event,userId)?event:undefined;},
    create(event,now=Date.now()) {
      sql.exec('BEGIN IMMEDIATE');
      try {
        if(event.workspaceId){if(!activeMember.get(event.workspaceId,event.userId))throw Object.assign(new Error('Workspace is unavailable'),{status:404});if(sql.prepare('SELECT COUNT(*) AS count FROM calendarEvents WHERE workspaceId=?').get(event.workspaceId).count>=5000)throw Object.assign(new Error('This workspace has reached its calendar event limit'),{status:429});}
        else if(sql.prepare('SELECT COUNT(*) AS count FROM calendarEvents WHERE userId=? AND workspaceId IS NULL').get(event.userId).count>=5000)throw Object.assign(new Error('This account has reached its calendar event limit'),{status:429});
        sql.prepare('INSERT INTO calendarEvents(id,userId,title,notes,startsAt,endsAt,reminderAt,createdAt,updatedAt,repeatMs,workspaceId) VALUES(?,?,?,?,?,?,?,?,?,?,?)').run(event.id,event.userId,event.title,event.notes,event.startsAt,event.endsAt,event.reminderAt,now,now,event.repeatMs??null,event.workspaceId??null);
        sql.prepare('INSERT INTO audit(userId,event,severity,createdAt) VALUES(?,?,?,?)').run(event.userId,'calendar.event.created','info',now);
        const saved=byId.get(event.id);sql.exec('COMMIT');return saved;
      } catch(error) { sql.exec('ROLLBACK');throw error; }
    },
    update(userId,id,expectedUpdatedAt,fields,now=Date.now()) {
      sql.exec('BEGIN IMMEDIATE');
      try {
        const current=byId.get(id);if(!canAccess(current,userId)||current.updatedAt!==expectedUpdatedAt){sql.exec('ROLLBACK');return null;}
        const updatedAt=Math.max(now,current.updatedAt+1);
        sql.prepare('UPDATE calendarEvents SET title=?,notes=?,startsAt=?,endsAt=?,reminderAt=?,repeatMs=?,updatedAt=? WHERE id=? AND updatedAt=?').run(fields.title,fields.notes,fields.startsAt,fields.endsAt,fields.reminderAt,fields.repeatMs===undefined?current.repeatMs:fields.repeatMs,updatedAt,id,expectedUpdatedAt);
        sql.prepare('INSERT INTO audit(userId,event,severity,createdAt) VALUES(?,?,?,?)').run(userId,'calendar.event.updated','info',updatedAt);
        const saved=byId.get(id);sql.exec('COMMIT');return saved;
      } catch(error) { sql.exec('ROLLBACK');throw error; }
    },
    remove(userId,id,expectedUpdatedAt,now=Date.now()) {
      sql.exec('BEGIN IMMEDIATE');
      try {
        const current=byId.get(id);if(!canAccess(current,userId)||current.updatedAt!==expectedUpdatedAt){sql.exec('ROLLBACK');return false;}
        sql.prepare('DELETE FROM calendarEvents WHERE id=? AND updatedAt=?').run(id,expectedUpdatedAt);
        sql.prepare('INSERT INTO audit(userId,event,severity,createdAt) VALUES(?,?,?,?)').run(userId,'calendar.event.deleted','warn',now);
        sql.exec('COMMIT');return true;
      } catch(error) { sql.exec('ROLLBACK');throw error; }
    },
    search(userId,query){const term=query.trim();if(term.length<2)return[];return sql.prepare(`SELECT e.id,e.workspaceId,COALESCE(w.name,'Personal calendar') AS workspaceName,'calendar' AS type,e.title,CASE WHEN instr(lower(e.notes),lower(?))>0 THEN substr(e.notes,max(1,instr(lower(e.notes),lower(?))-80),160) ELSE '' END AS snippet,e.startsAt AS updatedAt,e.startsAt FROM calendarEvents e LEFT JOIN workspaces w ON w.id=e.workspaceId WHERE ((e.workspaceId IS NULL AND e.userId=?) OR (e.workspaceId IS NOT NULL AND EXISTS(SELECT 1 FROM workspaceMembers m WHERE m.workspaceId=e.workspaceId AND m.userId=? AND m.status='active'))) AND (instr(lower(e.title),lower(?))>0 OR instr(lower(e.notes),lower(?))>0) ORDER BY e.startsAt DESC,e.id LIMIT 50`).all(term,term,userId,userId,term,term);},
    dueReminders:(userId,now)=>sql.prepare('SELECT id,title,startsAt,reminderAt FROM calendarEvents WHERE userId=? AND workspaceId IS NULL AND reminderAt IS NOT NULL AND reminderAt<=? AND startsAt>? ORDER BY reminderAt,id LIMIT 100').all(userId,now,now),
  };
}

function encryptedShareStore(sql) {
  return {
    list:(userId,now=Date.now())=>sql.prepare('SELECT id,expiresAt,createdAt,downloadLimit,downloadCount FROM encryptedShares WHERE userId=? AND expiresAt>? ORDER BY createdAt DESC LIMIT 20').all(userId,now),
    create({id,userId,iv,ciphertext,expiresAt,downloadLimit},now=Date.now()) {
      sql.exec('BEGIN IMMEDIATE');
      try { sql.prepare('DELETE FROM encryptedShares WHERE expiresAt<=?').run(now);if(sql.prepare('SELECT COUNT(*) AS count FROM encryptedShares WHERE userId=?').get(userId).count>=20)throw Object.assign(new Error('This account has reached its active encrypted-share limit'),{status:429,retryAfter:3600});sql.prepare('INSERT INTO encryptedShares(id,userId,iv,ciphertext,expiresAt,createdAt,downloadLimit,downloadCount) VALUES(?,?,?,?,?,?,?,0)').run(id,userId,iv,ciphertext,expiresAt,now,downloadLimit??100);sql.prepare('INSERT INTO audit(userId,event,severity,createdAt) VALUES(?,?,?,?)').run(userId,'share.link.created','info',now);const saved=sql.prepare('SELECT id,iv,ciphertext,expiresAt,createdAt,downloadLimit,downloadCount FROM encryptedShares WHERE id=? AND expiresAt>?').get(id,now);sql.exec('COMMIT');return saved; }
      catch(error) { sql.exec('ROLLBACK');throw error; }
    },
    get(id,now=Date.now()) {sql.exec('BEGIN IMMEDIATE');try{const consumed=sql.prepare('UPDATE encryptedShares SET downloadCount=downloadCount+1 WHERE id=? AND expiresAt>? AND downloadCount<downloadLimit').run(id,now).changes;if(!consumed){sql.exec('COMMIT');return undefined;}const share=sql.prepare('SELECT id,iv,ciphertext,expiresAt,createdAt,downloadLimit,downloadCount FROM encryptedShares WHERE id=?').get(id);sql.exec('COMMIT');return share;}catch(error){sql.exec('ROLLBACK');throw error;}},
    remove(userId,id,now=Date.now()) {
      sql.exec('BEGIN IMMEDIATE');try { const result=sql.prepare('DELETE FROM encryptedShares WHERE id=? AND userId=? AND expiresAt>?').run(id,userId,now);if(result.changes)sql.prepare('INSERT INTO audit(userId,event,severity,createdAt) VALUES(?,?,?,?)').run(userId,'share.link.revoked','warn',now);sql.exec('COMMIT');return result.changes===1; }
      catch(error) { sql.exec('ROLLBACK');throw error; }
    },
    purgeExpired:(now=Date.now())=>sql.prepare('DELETE FROM encryptedShares WHERE expiresAt<=?').run(now).changes,
  };
}

function workspaceStore(sql) {
 const active=sql.prepare("SELECT role FROM workspaceMembers WHERE workspaceId=? AND userId=? AND status='active'");
 const workspace=sql.prepare('SELECT id,name,createdBy,createdAt,updatedAt FROM workspaces WHERE id=?');
 const item=sql.prepare('SELECT id,workspaceId,authorId,kind,title,content,state,revision,createdAt,updatedAt FROM workspaceItems WHERE id=? AND workspaceId=?');
 const audit=(userId,event,now)=>sql.prepare('INSERT INTO audit(userId,event,severity,createdAt) VALUES(?,?,?,?)').run(userId,event,'info',now);
 const activityWrite=sql.prepare('INSERT INTO workspaceActivity(id,workspaceId,actorId,event,subjectId,createdAt) VALUES(?,?,?,?,?,?)');
 const fileMetadata=sql.prepare('SELECT id,workspaceId,authorId,name,mime,size,createdAt FROM workspaceFiles WHERE id=? AND workspaceId=?');
 const recordActivity=(workspaceId,actorId,event,subjectId,now)=>activityWrite.run(randomUUID(),workspaceId,actorId,event,subjectId??null,now);
 return {
  list:userId=>sql.prepare("SELECT w.id,w.name,m.role,m.status,w.createdAt,w.updatedAt,(SELECT COUNT(*) FROM workspaceActivity a LEFT JOIN workspaceActivityReads r ON r.workspaceId=a.workspaceId AND r.userId=m.userId WHERE a.workspaceId=w.id AND a.actorId!=m.userId AND a.sequence>COALESCE(r.lastSeenSequence,0)) AS unreadCount FROM workspaceMembers m JOIN workspaces w ON w.id=m.workspaceId WHERE m.userId=? AND m.status='active' ORDER BY w.name,w.id").all(userId),
  pending:userId=>sql.prepare("SELECT w.id,w.name,m.role,m.invitedBy,m.createdAt FROM workspaceMembers m JOIN workspaces w ON w.id=m.workspaceId WHERE m.userId=? AND m.status='pending' ORDER BY m.createdAt DESC").all(userId),
  create({id,userId,name},now=Date.now()){sql.exec('BEGIN IMMEDIATE');try{if(sql.prepare('SELECT COUNT(*) AS count FROM workspaces WHERE createdBy=?').get(userId).count>=20)throw Object.assign(new Error('This account has reached its workspace limit'),{status:429});sql.prepare('INSERT INTO workspaces VALUES(?,?,?,?,?)').run(id,name,userId,now,now);sql.prepare("INSERT INTO workspaceMembers VALUES(?,?,?,'active',?,?,?)").run(id,userId,'owner',userId,now,now);audit(userId,'workspace.created',now);recordActivity(id,userId,'workspace.created',null,now);sql.exec('COMMIT');return{id,name,role:'owner',status:'active',createdAt:now,updatedAt:now};}catch(error){sql.exec('ROLLBACK');throw error;}},
  members(workspaceId,userId){if(!active.get(workspaceId,userId))return null;return sql.prepare('SELECT m.userId,u.username,u.displayName,m.role,m.status,m.invitedBy,m.createdAt,m.updatedAt FROM workspaceMembers m JOIN users u ON u.id=m.userId WHERE m.workspaceId=? ORDER BY CASE m.role WHEN \'owner\' THEN 0 WHEN \'admin\' THEN 1 ELSE 2 END,u.username').all(workspaceId);},
  exportData(workspaceId,userId,now=Date.now()){sql.exec('BEGIN IMMEDIATE');try{if(!active.get(workspaceId,userId)){sql.exec('ROLLBACK');return null;}const data={format:'locat-workspace-export-v1',exportedAt:now,workspace:workspace.get(workspaceId),members:sql.prepare('SELECT m.userId,u.username,u.displayName,m.role,m.status,m.invitedBy,m.createdAt,m.updatedAt FROM workspaceMembers m JOIN users u ON u.id=m.userId WHERE m.workspaceId=? ORDER BY CASE m.role WHEN \'owner\' THEN 0 WHEN \'admin\' THEN 1 ELSE 2 END,u.username').all(workspaceId),items:sql.prepare('SELECT id,authorId,kind,title,content,state,revision,createdAt,updatedAt FROM workspaceItems WHERE workspaceId=? ORDER BY kind,state,updatedAt DESC,id LIMIT 500').all(workspaceId),files:sql.prepare('SELECT id,authorId,name,mime,size,createdAt FROM workspaceFiles WHERE workspaceId=? ORDER BY createdAt DESC,id LIMIT 500').all(workspaceId),activity:sql.prepare('SELECT a.id,a.actorId,u.displayName AS actorName,a.event,a.subjectId,a.createdAt FROM workspaceActivity a JOIN users u ON u.id=a.actorId WHERE a.workspaceId=? ORDER BY a.sequence DESC LIMIT 500').all(workspaceId)};audit(userId,'workspace.exported',now);sql.exec('COMMIT');return data;}catch(error){sql.exec('ROLLBACK');throw error;}},
  invite(workspaceId,actorId,targetId,now=Date.now()){sql.exec('BEGIN IMMEDIATE');try{const role=active.get(workspaceId,actorId)?.role;if(!['owner','admin'].includes(role)){sql.exec('ROLLBACK');return null;}if(!workspace.get(workspaceId)||!sql.prepare('SELECT 1 FROM users WHERE id=?').get(targetId)){sql.exec('ROLLBACK');return false;}const existing=sql.prepare('SELECT status FROM workspaceMembers WHERE workspaceId=? AND userId=?').get(workspaceId,targetId);if(existing){sql.exec('ROLLBACK');return existing.status==='active'?'active':'pending';}if(sql.prepare('SELECT COUNT(*) AS count FROM workspaceMembers WHERE workspaceId=?').get(workspaceId).count>=200)throw Object.assign(new Error('This workspace has reached its member and invitation limit'),{status:429});sql.prepare("INSERT INTO workspaceMembers VALUES(?,?, 'member','pending',?,?,?)").run(workspaceId,targetId,actorId,now,now);audit(actorId,'workspace.member.invited',now);recordActivity(workspaceId,actorId,'member.invited',targetId,now);sql.exec('COMMIT');return'pending';}catch(error){sql.exec('ROLLBACK');throw error;}},
  respond(workspaceId,userId,accept,now=Date.now()){sql.exec('BEGIN IMMEDIATE');try{const pending=sql.prepare("SELECT 1 FROM workspaceMembers WHERE workspaceId=? AND userId=? AND status='pending'").get(workspaceId,userId);if(!pending){sql.exec('ROLLBACK');return false;}if(accept)sql.prepare("UPDATE workspaceMembers SET status='active',updatedAt=? WHERE workspaceId=? AND userId=? AND status='pending'").run(now,workspaceId,userId);else sql.prepare("DELETE FROM workspaceMembers WHERE workspaceId=? AND userId=? AND status='pending'").run(workspaceId,userId);audit(userId,accept?'workspace.invite.accepted':'workspace.invite.declined',now);recordActivity(workspaceId,userId,accept?'invite.accepted':'invite.declined',userId,now);if(accept){const latest=sql.prepare('SELECT COALESCE(MAX(sequence),0) AS sequence FROM workspaceActivity WHERE workspaceId=?').get(workspaceId).sequence;sql.prepare('INSERT INTO workspaceActivityReads(workspaceId,userId,lastSeenSequence) VALUES(?,?,?) ON CONFLICT(workspaceId,userId) DO UPDATE SET lastSeenSequence=MAX(lastSeenSequence,excluded.lastSeenSequence)').run(workspaceId,userId,latest);}sql.exec('COMMIT');return true;}catch(error){sql.exec('ROLLBACK');throw error;}},
  setRole(workspaceId,actorId,targetId,role,now=Date.now()){sql.exec('BEGIN IMMEDIATE');try{if(active.get(workspaceId,actorId)?.role!=='owner'||!['admin','member'].includes(role)){sql.exec('ROLLBACK');return false;}const changed=sql.prepare("UPDATE workspaceMembers SET role=?,updatedAt=? WHERE workspaceId=? AND userId=? AND status='active' AND role!='owner'").run(role,now,workspaceId,targetId).changes;if(!changed){sql.exec('ROLLBACK');return false;}audit(actorId,'workspace.member.role.changed',now);recordActivity(workspaceId,actorId,'member.role.changed',targetId,now);sql.exec('COMMIT');return true;}catch(error){sql.exec('ROLLBACK');throw error;}},
 transferOwner(workspaceId,actorId,targetId,now=Date.now()){sql.exec('BEGIN IMMEDIATE');try{if(active.get(workspaceId,actorId)?.role!=='owner'||actorId===targetId||active.get(workspaceId,targetId)?.role===undefined){sql.exec('ROLLBACK');return false;}const actor=sql.prepare("UPDATE workspaceMembers SET role='admin',updatedAt=? WHERE workspaceId=? AND userId=? AND status='active' AND role='owner'").run(now,workspaceId,actorId).changes;if(!actor){sql.exec('ROLLBACK');return false;}const target=sql.prepare("UPDATE workspaceMembers SET role='owner',updatedAt=? WHERE workspaceId=? AND userId=? AND status='active' AND role IN ('admin','member')").run(now,workspaceId,targetId).changes;if(!target)throw new Error('Workspace ownership transfer lost its active target');audit(actorId,'workspace.owner.transferred',now);audit(targetId,'workspace.owner.received',now);recordActivity(workspaceId,actorId,'owner.transferred',targetId,now);sql.exec('COMMIT');return true;}catch(error){sql.exec('ROLLBACK');throw error;}},
 deleteWorkspace(workspaceId,userId,now=Date.now()){sql.exec('BEGIN IMMEDIATE');try{if(active.get(workspaceId,userId)?.role!=='owner'){sql.exec('ROLLBACK');return false;}audit(userId,'workspace.deleted',now);const removed=sql.prepare('DELETE FROM workspaces WHERE id=?').run(workspaceId).changes===1;sql.exec('COMMIT');return removed;}catch(error){sql.exec('ROLLBACK');throw error;}},
  remove(workspaceId,actorId,targetId,now=Date.now()){sql.exec('BEGIN IMMEDIATE');try{const actorRole=active.get(workspaceId,actorId)?.role,target=active.get(workspaceId,targetId);if(!target||target.role==='owner'||!(actorRole==='owner'||actorRole==='admin'&&target.role==='member'||actorId===targetId&&target.role!=='owner')){sql.exec('ROLLBACK');return false;}sql.prepare("DELETE FROM workspaceMembers WHERE workspaceId=? AND userId=? AND status='active'").run(workspaceId,targetId);audit(actorId,'workspace.member.removed',now);recordActivity(workspaceId,actorId,'member.removed',targetId,now);sql.exec('COMMIT');return true;}catch(error){sql.exec('ROLLBACK');throw error;}},
  items(workspaceId,userId){if(!active.get(workspaceId,userId))return null;return sql.prepare('SELECT id,workspaceId,authorId,kind,title,content,state,revision,createdAt,updatedAt FROM workspaceItems WHERE workspaceId=? ORDER BY kind,state,updatedAt DESC,id LIMIT 500').all(workspaceId);},
  files(workspaceId,userId){if(!active.get(workspaceId,userId))return null;return sql.prepare('SELECT id,workspaceId,authorId,name,mime,size,createdAt FROM workspaceFiles WHERE workspaceId=? ORDER BY createdAt DESC,id LIMIT 500').all(workspaceId);},
  getFile(workspaceId,userId,id){if(!active.get(workspaceId,userId))return null;const file=sql.prepare('SELECT id,workspaceId,authorId,name,mime,size,content,createdAt FROM workspaceFiles WHERE id=? AND workspaceId=?').get(id,workspaceId);if(!file)return null;return{...file,data:Buffer.from(file.content).toString('base64')};},
  createFile({id,workspaceId,userId,name,mime,content},now=Date.now()){sql.exec('BEGIN IMMEDIATE');try{if(!active.get(workspaceId,userId)){sql.exec('ROLLBACK');return null;}const size=content.length,usage=sql.prepare('SELECT COUNT(*) AS count,COALESCE(SUM(size),0) AS bytes FROM workspaceFiles WHERE workspaceId=?').get(workspaceId);if(usage.count>=500||usage.bytes+size>100*1024*1024)throw Object.assign(new Error('This workspace has reached its shared file limit'),{status:429});sql.prepare('INSERT INTO workspaceFiles(id,workspaceId,authorId,name,mime,size,content,createdAt) VALUES(?,?,?,?,?,?,?,?)').run(id,workspaceId,userId,name,mime,size,content,now);audit(userId,'workspace.file.uploaded',now);recordActivity(workspaceId,userId,'file.uploaded',id,now);const saved=fileMetadata.get(id,workspaceId);sql.exec('COMMIT');return saved;}catch(error){sql.exec('ROLLBACK');throw error;}},
  deleteFile({id,workspaceId,userId},now=Date.now()){sql.exec('BEGIN IMMEDIATE');try{const role=active.get(workspaceId,userId)?.role,file=fileMetadata.get(id,workspaceId);if(!file||!(role==='owner'||role==='admin'||file.authorId===userId)){sql.exec('ROLLBACK');return false;}sql.prepare('DELETE FROM workspaceFiles WHERE id=? AND workspaceId=?').run(id,workspaceId);audit(userId,'workspace.file.deleted',now);recordActivity(workspaceId,userId,'file.deleted',id,now);sql.exec('COMMIT');return true;}catch(error){sql.exec('ROLLBACK');throw error;}},
  search(userId,query){const term=query.trim();if(term.length<2)return[];const items=sql.prepare(`SELECT i.id,i.workspaceId,w.name AS workspaceName,i.kind AS type,i.title,CASE WHEN instr(lower(i.content),lower(?))>0 THEN substr(i.content,max(1,instr(lower(i.content),lower(?))-80),160) ELSE '' END AS snippet,i.updatedAt FROM workspaceItems i JOIN workspaceMembers m ON m.workspaceId=i.workspaceId AND m.userId=? AND m.status='active' JOIN workspaces w ON w.id=i.workspaceId WHERE instr(lower(i.title),lower(?))>0 OR instr(lower(i.content),lower(?))>0 ORDER BY i.updatedAt DESC,i.id LIMIT 50`).all(term,term,userId,term,term);const files=sql.prepare(`SELECT f.id,f.workspaceId,w.name AS workspaceName,'file' AS type,f.name AS title,f.mime AS snippet,f.createdAt AS updatedAt FROM workspaceFiles f JOIN workspaceMembers m ON m.workspaceId=f.workspaceId AND m.userId=? AND m.status='active' JOIN workspaces w ON w.id=f.workspaceId WHERE instr(lower(f.name),lower(?))>0 ORDER BY f.createdAt DESC,f.id LIMIT 50`).all(userId,term);return [...items,...files].sort((a,b)=>b.updatedAt-a.updatedAt||a.id.localeCompare(b.id)).slice(0,50);},
  activity(workspaceId,userId){if(!active.get(workspaceId,userId))return null;const lastSeen=sql.prepare('SELECT lastSeenSequence FROM workspaceActivityReads WHERE workspaceId=? AND userId=?').get(workspaceId,userId)?.lastSeenSequence??0;return{events:sql.prepare('SELECT a.id,a.actorId,u.displayName AS actorName,a.event,a.subjectId,a.createdAt FROM workspaceActivity a JOIN users u ON u.id=a.actorId WHERE a.workspaceId=? ORDER BY a.sequence DESC LIMIT 100').all(workspaceId),unreadCount:sql.prepare('SELECT COUNT(*) AS count FROM workspaceActivity WHERE workspaceId=? AND actorId!=? AND sequence>?').get(workspaceId,userId,lastSeen).count};},
  markActivityRead(workspaceId,userId){sql.exec('BEGIN IMMEDIATE');try{if(!active.get(workspaceId,userId)){sql.exec('ROLLBACK');return null;}const latest=sql.prepare('SELECT COALESCE(MAX(sequence),0) AS sequence FROM workspaceActivity WHERE workspaceId=?').get(workspaceId).sequence;sql.prepare('INSERT INTO workspaceActivityReads(workspaceId,userId,lastSeenSequence) VALUES(?,?,?) ON CONFLICT(workspaceId,userId) DO UPDATE SET lastSeenSequence=MAX(lastSeenSequence,excluded.lastSeenSequence)').run(workspaceId,userId,latest);sql.exec('COMMIT');return{unreadCount:0};}catch(error){sql.exec('ROLLBACK');throw error;}},
  createItem({id,workspaceId,userId,kind,title,content,state='open'},now=Date.now()){sql.exec('BEGIN IMMEDIATE');try{if(!active.get(workspaceId,userId)){sql.exec('ROLLBACK');return null;}if(sql.prepare('SELECT COUNT(*) AS count FROM workspaceItems WHERE workspaceId=?').get(workspaceId).count>=500)throw Object.assign(new Error('This workspace has reached its shared board limit'),{status:429});sql.prepare('INSERT INTO workspaceItems VALUES(?,?,?,?,?,?,?,1,?,?)').run(id,workspaceId,userId,kind,title,content,state,now,now);audit(userId,'workspace.item.created',now);recordActivity(workspaceId,userId,'item.created',id,now);const saved=item.get(id,workspaceId);sql.exec('COMMIT');return saved;}catch(error){sql.exec('ROLLBACK');throw error;}},
  updateItem({id,workspaceId,userId,expectedRevision,title,content,state},now=Date.now()){sql.exec('BEGIN IMMEDIATE');try{if(!active.get(workspaceId,userId)){sql.exec('ROLLBACK');return null;}const current=item.get(id,workspaceId);if(!current||current.revision!==expectedRevision){sql.exec('ROLLBACK');return false;}sql.prepare('UPDATE workspaceItems SET title=?,content=?,state=?,revision=revision+1,updatedAt=? WHERE id=? AND workspaceId=? AND revision=?').run(title,content,state,Math.max(now,current.updatedAt+1),id,workspaceId,expectedRevision);audit(userId,'workspace.item.updated',now);recordActivity(workspaceId,userId,'item.updated',id,now);const saved=item.get(id,workspaceId);sql.exec('COMMIT');return saved;}catch(error){sql.exec('ROLLBACK');throw error;}},
  deleteItem({id,workspaceId,userId,expectedRevision},now=Date.now()){sql.exec('BEGIN IMMEDIATE');try{if(!active.get(workspaceId,userId)){sql.exec('ROLLBACK');return false;}const changes=sql.prepare('DELETE FROM workspaceItems WHERE id=? AND workspaceId=? AND revision=?').run(id,workspaceId,expectedRevision).changes;if(!changes){sql.exec('ROLLBACK');return false;}audit(userId,'workspace.item.deleted',now);recordActivity(workspaceId,userId,'item.deleted',id,now);sql.exec('COMMIT');return true;}catch(error){sql.exec('ROLLBACK');throw error;}},
 };
}

function automationStore(sql) {
 const byId=sql.prepare('SELECT id,userId,title,details,runAt,enabled,firedAt,revision,createdAt,updatedAt,repeatMs FROM automationRules WHERE id=? AND userId=?');
 return {
  list:(userId)=>sql.prepare('SELECT id,title,details,runAt,enabled,firedAt,revision,createdAt,updatedAt,repeatMs FROM automationRules WHERE userId=? ORDER BY runAt,id LIMIT 500').all(userId).map(row=>({...row,enabled:!!row.enabled})),
  create({id,userId,title,details,runAt,enabled=true,repeatMs=null},now=Date.now()){sql.exec('BEGIN IMMEDIATE');try{if(sql.prepare('SELECT COUNT(*) AS count FROM automationRules WHERE userId=?').get(userId).count>=500)throw Object.assign(new Error('This account has reached its scheduled reminder limit'),{status:429});sql.prepare('INSERT INTO automationRules(id,userId,title,details,runAt,enabled,firedAt,revision,createdAt,updatedAt,repeatMs) VALUES(?,?,?,?,?,?,NULL,1,?,?,?)').run(id,userId,title,details,runAt,Number(enabled),now,now,repeatMs);sql.prepare('INSERT INTO audit(userId,event,severity,createdAt) VALUES(?,?,?,?)').run(userId,'automate.reminder.created','info',now);const saved=byId.get(id,userId);sql.exec('COMMIT');return{...saved,enabled:!!saved.enabled};}catch(error){sql.exec('ROLLBACK');throw error;}},
  update({id,userId,expectedRevision,title,details,runAt,enabled,repeatMs=null},now=Date.now()){sql.exec('BEGIN IMMEDIATE');try{const current=byId.get(id,userId);if(!current||current.revision!==expectedRevision){sql.exec('ROLLBACK');return null;}sql.prepare('UPDATE automationRules SET title=?,details=?,runAt=?,enabled=?,repeatMs=?,firedAt=NULL,revision=revision+1,updatedAt=? WHERE id=? AND userId=? AND revision=?').run(title,details,runAt,Number(enabled),repeatMs,Math.max(now,current.updatedAt+1),id,userId,expectedRevision);sql.prepare('INSERT INTO audit(userId,event,severity,createdAt) VALUES(?,?,?,?)').run(userId,'automate.reminder.updated','info',now);const saved=byId.get(id,userId);sql.exec('COMMIT');return{...saved,enabled:!!saved.enabled};}catch(error){sql.exec('ROLLBACK');throw error;}},
  remove({id,userId,expectedRevision},now=Date.now()){sql.exec('BEGIN IMMEDIATE');try{const changes=sql.prepare('DELETE FROM automationRules WHERE id=? AND userId=? AND revision=?').run(id,userId,expectedRevision).changes;if(!changes){sql.exec('ROLLBACK');return false;}sql.prepare('INSERT INTO audit(userId,event,severity,createdAt) VALUES(?,?,?,?)').run(userId,'automate.reminder.deleted','warn',now);sql.exec('COMMIT');return true;}catch(error){sql.exec('ROLLBACK');throw error;}},
  dispatch(userId,now=Date.now()){sql.exec('BEGIN IMMEDIATE');try{const due=sql.prepare('SELECT id,title,details,runAt,revision,repeatMs FROM automationRules WHERE userId=? AND enabled=1 AND firedAt IS NULL AND runAt<=? ORDER BY runAt,id LIMIT 100').all(userId,now);const once=sql.prepare('UPDATE automationRules SET firedAt=?,updatedAt=? WHERE id=? AND userId=? AND enabled=1 AND firedAt IS NULL AND repeatMs IS NULL'),repeat=sql.prepare('UPDATE automationRules SET runAt=?,updatedAt=? WHERE id=? AND userId=? AND enabled=1 AND firedAt IS NULL AND repeatMs=?');for(const row of due){const result=row.repeatMs===null?once.run(now,now,row.id,userId):repeat.run(row.runAt+(Math.floor((now-row.runAt)/row.repeatMs)+1)*row.repeatMs,now,row.id,userId,row.repeatMs);if(!result.changes)continue;sql.prepare('INSERT INTO audit(userId,event,severity,createdAt) VALUES(?,?,?,?)').run(userId,'automate.reminder.delivered','info',now);}sql.exec('COMMIT');return due;}catch(error){sql.exec('ROLLBACK');throw error;}},
 };
}
