import {test} from 'node:test';import assert from 'node:assert/strict';import {mkdtemp,rm} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join} from 'node:path';import {createHash,scryptSync,scrypt as scryptCallback} from 'node:crypto';import {promisify} from 'node:util';
import {DatabaseSync} from 'node:sqlite';
import {openDatabase} from './database.mjs';import {createSessionSecurityHandler} from './sessionSecurity.mjs';
const scrypt=promisify(scryptCallback),password='synthetic-current-password',cookie='synthetic-current-cookie',digest=value=>createHash('sha256').update(value).digest('hex');
async function fixture(){const dir=await mkdtemp(join(tmpdir(),'locat-session-security-')),db=openDatabase(join(dir,'db.sqlite')),hash=scryptSync(password,'synthetic-salt',64).toString('hex');for(const [id,name] of [['a','alice'],['b','bob']])db.addUser({id,username:name,displayName:name,salt:'synthetic-salt',hash});db.addSession(digest(cookie),'a',Date.now()+60000);db.addSession('other-session','a',Date.now()+60000);db.addSession('foreign-session','b',Date.now()+60000);return {db,hash,file:join(dir,'db.sqlite'),async close(){db.close();await rm(dir,{recursive:true,force:true});}};}
function handler(f,derive=scrypt){let reply;const service=createSessionSecurityHandler({db:f.db,sessionUser:req=>f.db.sessionUser(digest(req.token??cookie),Date.now()),sessionToken:req=>req.token??cookie,body:async req=>req.body,json:(_res,status,data)=>{reply={status,data};},scrypt:derive,serialized:operation=>operation()});return {call:async(body={currentPassword:password},options={})=>{await service({method:'POST',headers:{origin:'https://locat.test'},body,...options},{},new URL('https://locat.test/api/auth/sessions/revoke-others'),'https://locat.test');return reply;},reply:()=>reply};}
test('bulk session policy preserves current/foreign sessions, expires affected Matrix grants and audits atomically',async()=>{
 const f=await fixture();try{const device=f.db.link.register('a','Other session','web','public-key').id,keys={ed25519:Buffer.alloc(32,1).toString('base64').replace(/=+$/,''),curve25519:Buffer.alloc(32,2).toString('base64').replace(/=+$/,'')};f.db.matrixBindings.bind('a',device,'other-session',{userId:'@alice:matrix.test',deviceId:'OTHER',accessToken:'synthetic-session-matrix-token',publicKeys:keys},{userId:'@alice:matrix.test',deviceId:'OTHER',keys:null});f.db.addSession('expired','a',Date.now()-1);const response=await handler(f).call();assert.equal(response.status,200);assert.equal(response.data.revokedCount,1);assert.ok(f.db.sessionUser(digest(cookie),Date.now()));assert.ok(f.db.sessionUser('foreign-session',Date.now()));assert.equal(f.db.sessionUser('other-session',Date.now()),undefined);assert.equal(f.db.matrixBindings.current('a',device).expiresAt,0);assert.equal(f.db.events('a')[0].event,'session.others.revoked');assert.ok(!JSON.stringify(response).includes(password));
 }finally{await f.close();}
});
test('bulk confirmation rejects wrong password, foreign Origin, unauthenticated requests and extra identity fields',async()=>{
 const f=await fixture();try{const service=handler(f);assert.equal((await service.call({currentPassword:'incorrect'})).status,401);assert.equal((await service.call(undefined,{headers:{origin:'https://foreign.test'}})).status,403);assert.equal((await service.call(undefined,{token:'unknown'})).status,401);assert.equal((await service.call({currentPassword:password,userId:'b'})).status,400);assert.ok(f.db.sessionUser('other-session',Date.now()));assert.equal(f.db.events('a').length,0);
 }finally{await f.close();}
});
test('bulk confirmation has a separate per-account limit',async()=>{
 const f=await fixture();try{const service=handler(f);for(let i=0;i<5;i++)assert.equal((await service.call({})).status,400);const result=await service.call({});assert.equal(result.status,429);assert.ok(result.data.retryAfter>0);assert.ok(f.db.sessionUser('other-session',Date.now()));
 }finally{await f.close();}
});
test('a session revoked during password derivation cannot commit bulk sign-out',async()=>{
 const f=await fixture();try{let finish;const service=handler(f,()=>new Promise(resolve=>{finish=resolve;})),operation=service.call();await Promise.resolve();f.db.revokeSession(digest(cookie));finish(Buffer.from(f.hash,'hex'));await assert.rejects(operation,{status:401});assert.ok(f.db.sessionUser('other-session',Date.now()));assert.equal(f.db.events('a').length,0);
 }finally{await f.close();}
});
test('stale credential/session snapshots cannot change passwords or revoke other sessions',async()=>{
 const f=await fixture();try{assert.throws(()=>f.db.revokeOtherSessions('a',digest(cookie),'stale-hash'),{status:401});assert.throws(()=>f.db.changePassword('a','new-salt','new-hash',{sessionHash:digest(cookie),expectedPasswordHash:'stale-hash'}),{status:401});assert.equal(f.db.userById('a').hash,f.hash);f.db.revokeSession(digest(cookie));assert.throws(()=>f.db.changePassword('a','new-salt','new-hash',{sessionHash:digest(cookie),expectedPasswordHash:f.hash}),{status:401});assert.ok(f.db.sessionUser('other-session',Date.now()));assert.equal(f.db.events('a').length,0);
 }finally{await f.close();}
});
test('password change commits its audit and revokes all owned sessions while preserving another account',async()=>{
 const f=await fixture();try{f.db.changePassword('a','new-salt','new-hash',{sessionHash:digest(cookie),expectedPasswordHash:f.hash});assert.equal(f.db.userById('a').hash,'new-hash');assert.equal(f.db.sessions('a',Date.now()).length,0);assert.ok(f.db.sessionUser('foreign-session',Date.now()));assert.equal(f.db.events('a')[0].event,'password.changed');
 }finally{await f.close();}
});

test('an audit write failure rolls back other-session and messaging-grant revocation',async()=>{
 const f=await fixture();try{const device=f.db.link.register('a','Other','web','rollback-public').id,keys={ed25519:Buffer.alloc(32,1).toString('base64').replace(/=+$/,''),curve25519:Buffer.alloc(32,2).toString('base64').replace(/=+$/,'')};f.db.matrixBindings.bind('a',device,'other-session',{userId:'@alice:matrix.test',deviceId:'OTHER',accessToken:'synthetic-rollback-token-0001',publicKeys:keys},{userId:'@alice:matrix.test',deviceId:'OTHER',keys:null});const raw=new DatabaseSync(f.file);raw.exec("CREATE TRIGGER reject_bulk_audit BEFORE INSERT ON audit WHEN NEW.event='session.others.revoked' BEGIN SELECT RAISE(ABORT,'synthetic audit failure');END;");raw.close();assert.throws(()=>f.db.revokeOtherSessions('a',digest(cookie),f.hash),/audit failure/);assert.ok(f.db.sessionUser('other-session',Date.now()));assert.ok(f.db.sessionUser(digest(cookie),Date.now()));assert.ok(f.db.matrixBindings.current('a',device).expiresAt>Date.now());assert.equal(f.db.events('a').length,0);
 }finally{await f.close();}
});
