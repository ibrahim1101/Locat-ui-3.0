import {DatabaseSync} from 'node:sqlite';
import {open,lstat,mkdtemp,rm,constants} from 'node:fs/promises';
import {createWriteStream} from 'node:fs';
import {Transform} from 'node:stream';
import {pipeline} from 'node:stream/promises';
import {createHash} from 'node:crypto';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {DATABASE_SCHEMA_VERSION} from './database.mjs';
const MAX_BYTES=2*1024*1024*1024;
const groups=[['users','sessions','envelopes'],['preferences','audit'],['contacts','blocks'],[],['sentinelTokens','sentinelIncidents','sentinelEvents'],['privateStores','privateObjects'],['linkDevices','linkPairs'],['linkPayloads','linkPayloadChunks'],['remoteSessions','remoteSignals'],[],['serverMetadata'],['matrixAccounts','matrixBindings'],['matrixRevocations'],['matrixManagedDevices'],['matrixConversations'],['mediaShareOverrides']];
const columns={
 mediaShareOverrides:['libraryId','ownerId','friendId','allowed','updatedAt'],
 matrixConversations:['lowId','highId','operationId','status','roomId','createdAt'],
 users:['id','username','displayName','salt','hash'],sessions:['hash','userId','expiresAt'],envelopes:['sequence','id','senderId','recipientId','ciphertext','nonce','algorithm','createdAt'],
 preferences:['userId','value'],audit:['id','userId','event','severity','createdAt'],contacts:['lowId','highId','requesterId','status'],blocks:['blockerId','blockedId'],
 sentinelTokens:['id','userId','hash','name','prefix','createdAt','lastUsedAt','revokedAt'],sentinelIncidents:['id','userId','source','fingerprint','title','description','severity','status','occurrences','createdAt','updatedAt'],sentinelEvents:['id','incidentId','action','note','createdAt'],
 privateStores:['userId','module','config'],privateObjects:['userId','module','id','revision','envelope','bytes','updatedAt'],linkDevices:['id','userId','name','platform','publicKey','createdAt','lastSeenAt','revokedAt'],linkPairs:['id','userId','deviceA','deviceB','status','confirmedA','confirmedB','updatedAt'],
 linkPayloads:['id','userId','pairId','fromDevice','toDevice','kind','name','mime','size','chunkCount','status','createdAt','updatedAt'],linkPayloadChunks:['payloadId','seq','envelope'],remoteSessions:['id','userId','pairId','viewer','host','status','createdAt','expiresAt'],remoteSignals:['sequence','sessionId','signalId','fromDevice','kind','envelope'],serverMetadata:['key','value'],
 matrixAccounts:['userId','matrixUserId','createdAt'],matrixBindings:['userId','linkDeviceId','matrixUserId','matrixDeviceId','publicKeys','tokenHash','sessionHash','expiresAt'],matrixRevocations:['userId','linkDeviceId','matrixUserId','matrixDeviceId','status','attempts','nextAttemptAt','leaseUntil','leaseToken','createdAt','updatedAt'],matrixManagedDevices:['userId','linkDeviceId','matrixUserId','matrixDeviceId','operationToken','operationUntil','createdAt','updatedAt'],
};
/** Verify an isolated copy; never open/migrate/restore the selected original database. */
export async function verifyServerBackup(filename,options={}){
 return withVerifiedServerBackup(filename,options,report=>report);
}

/** Internal operator helper: the private snapshot exists only during consume. */
export async function withVerifiedServerBackup(filename,{expectedSha256}={},consume){
 if(groups.length!==DATABASE_SCHEMA_VERSION)throw new Error('Backup verifier schema manifest needs updating');
 if(typeof filename!=='string'||!filename)throw new Error('Select a completed standalone SQLite backup');
 if(expectedSha256!==undefined&&(typeof expectedSha256!=='string'||!/^[a-fA-F0-9]{64}$/.test(expectedSha256)))throw new Error('Expected SHA-256 must contain exactly 64 hexadecimal characters');
 let source,working,sql;
 try{
  const file=resolve(filename),before=await lstat(file);if(!before.isFile()||before.isSymbolicLink()||before.size<100||before.size>MAX_BYTES)throw new Error('Backup must be a regular SQLite file between 100 bytes and 2 GiB');
  for(const suffix of ['-wal','-journal']){try{const sidecar=await lstat(file+suffix);if(sidecar.size)throw new Error('Backup has an active journal; create a completed standalone snapshot first');}catch(error){if(error.code!=='ENOENT')throw error;}}
  source=await open(file,constants.O_RDONLY|(constants.O_NOFOLLOW??0));const initial=await source.stat();if(initial.dev!==before.dev||initial.ino!==before.ino||!initial.isFile())throw new Error('Backup changed before verification');
  const header=Buffer.alloc(16);await source.read(header,0,16,0);if(header.toString('binary')!=='SQLite format 3\0')throw new Error('Backup is not a SQLite database');
  working=await mkdtemp(join(tmpdir(),'locat-backup-verify-'));const snapshot=join(working,'snapshot.sqlite'),hash=createHash('sha256');let bytes=0;
  const checksum=new Transform({transform(chunk,_encoding,next){bytes+=chunk.length;if(bytes>initial.size||bytes>MAX_BYTES)return next(new Error('Backup changed while reading'));hash.update(chunk);next(null,chunk);}});
  await pipeline(source.createReadStream({start:0,autoClose:false}),checksum,createWriteStream(snapshot,{flags:'wx',mode:0o600}));
  const final=await source.stat(),current=await lstat(file);if(bytes!==initial.size||final.size!==initial.size||final.mtimeMs!==initial.mtimeMs||final.ctimeMs!==initial.ctimeMs||current.dev!==initial.dev||current.ino!==initial.ino)throw new Error('Backup changed while reading');
  const sha256=hash.digest('hex');if(expectedSha256&&sha256!==expectedSha256.toLowerCase())throw new Error('Backup SHA-256 does not match the expected value');
  sql=new DatabaseSync(snapshot,{readOnly:true});sql.exec('PRAGMA query_only=ON;PRAGMA trusted_schema=OFF;');
  if(Object.values(sql.prepare('PRAGMA integrity_check(1)').get())[0]!=='ok')throw new Error('SQLite integrity check failed');
  if(sql.prepare('PRAGMA foreign_key_check').get())throw new Error('SQLite foreign-key check failed');
  const schemaVersion=sql.prepare('PRAGMA user_version').get().user_version;if(schemaVersion<1||schemaVersion>DATABASE_SCHEMA_VERSION)throw new Error('Backup schema version is unsupported');
  const tables=new Set(sql.prepare("SELECT name FROM sqlite_schema WHERE type='table'").all().map(row=>row.name));
  for(const name of groups.slice(0,schemaVersion).flat())if(!tables.has(name))throw new Error('Backup is missing a required Locat table');
  for(const name of groups.slice(0,schemaVersion).flat()){
   const actual=new Set(sql.prepare('PRAGMA table_info('+name+')').all().map(row=>row.name)),required=[...columns[name]];
   if(name==='users'&&schemaVersion>=4)required.push('lcCode','bio');if(name==='users'&&schemaVersion>=10)required.push('profileVisibility','usernameVisibility','allowContactRequests');
   for(const column of required)if(!actual.has(column))throw new Error('Backup is missing required Locat columns');
  }
  const counts={};for(const name of ['users','envelopes','privateObjects','linkDevices','matrixBindings','mediaShareOverrides'])if(tables.has(name))counts[name]=sql.prepare('SELECT COUNT(*) AS n FROM '+name).get().n;
  const report={ok:true,schemaVersion,sizeBytes:bytes,sha256,expectedHashMatched:expectedSha256?true:null,integrity:'ok',foreignKeys:'ok',schemaCheck:'required-tables-and-columns',counts,scope:'standalone-locat-sqlite',checkedAt:new Date().toISOString()};
  sql.close();sql=undefined;
  return await consume(report,snapshot);
 }catch(error){if(error.code)throw new Error('Backup could not be read or verified');throw error;}
 finally{try{sql?.close();}finally{try{await source?.close();}finally{if(working)await rm(working,{recursive:true,force:true});}}}
}
