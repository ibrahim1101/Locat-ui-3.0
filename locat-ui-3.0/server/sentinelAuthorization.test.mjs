import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {openDatabase} from './database.mjs';
import {createSentinelHandler,normalizeIncident,tokenHash} from './sentinel.mjs';
async function fixture(run){
 const dir=await mkdtemp(join(tmpdir(),'locat-sentinel-auth-'));let db,raw;
 try{const file=join(dir,'db.sqlite');db=openDatabase(file);raw=new DatabaseSync(file);for(const id of ['a','b'])db.addUser({id,username:id,displayName:id,salt:'s',hash:'h'});await run({db,raw});}
 finally{raw?.close();db?.close();await rm(dir,{recursive:true,force:true});}
}
test('a revoked webhook token cannot ingest after its request body was paused',async()=>{
 await fixture(async({db})=>{
  const issued=db.sentinel.createToken('a','Monitor');let release;const pending=new Promise(resolve=>{release=resolve;});let responded=false;
  const handler=createSentinelHandler({store:db.sentinel,sessionUser:()=>null,body:async()=>{await pending;return {title:'Late alert',fingerprint:'late'};},json:()=>{responded=true;}});
  const operation=handler({method:'POST',headers:{authorization:'Bearer '+issued.token}},{},new URL('https://locat.test/api/sentinel/webhook'),'https://locat.test');
  db.sentinel.revokeToken('a',issued.id);release();await assert.rejects(operation,error=>error.status===401);
  assert.equal(responded,false);assert.equal(db.sentinel.incidents('a',null).length,0);
 });
});
test('revoked or mismatched token snapshots preserve existing incident history and occurrences',async()=>{
 await fixture(({db})=>{
  const issued=db.sentinel.createToken('a','Monitor'),actor=db.sentinel.authenticate(issued.token),input=normalizeIncident({title:'Existing alert',fingerprint:'same'});
  const id=db.sentinel.ingest(actor,input),before=db.sentinel.detail('a',id);
  assert.throws(()=>db.sentinel.ingest({...actor,userId:'b'},input),error=>error.status===401);
  db.sentinel.revokeToken('a',issued.id);
  assert.throws(()=>db.sentinel.ingest(actor,input),error=>error.status===401);
  assert.deepEqual(db.sentinel.detail('a',id),before);
 });
});
test('Sentinel user actions reject revoked, expired and foreign sessions before committing',async()=>{
 await fixture(({db})=>{
  const own='a'.repeat(64),foreign='b'.repeat(64),expired='c'.repeat(64);
  db.addSession(own,'a',Date.now()+60000);db.addSession(foreign,'b',Date.now()+60000);db.addSession(expired,'a',Date.now()-1);
  const issued=db.sentinel.createToken('a','Monitor',own),id=db.sentinel.ingest(db.sentinel.authenticate(issued.token),normalizeIncident({title:'Alert'}));
  db.revokeSession(own);
  for(const hash of [own,foreign,expired]){
   assert.throws(()=>db.sentinel.createToken('a','No mint',hash),error=>error.status===401);
   assert.throws(()=>db.sentinel.revokeToken('a',issued.id,hash),error=>error.status===401);
   assert.throws(()=>db.sentinel.action('a',id,'resolve','',hash),error=>error.status===401);
  }
  assert.ok(db.sentinel.authenticate(issued.token));assert.equal(db.sentinel.detail('a',id).incident.status,'open');assert.equal(db.sentinel.detail('a',id).events.length,1);assert.equal(db.sentinel.tokens('a').length,1);
 });
});
test('user-session revocation while a token creation body is paused prevents minting',async()=>{
 await fixture(async({db})=>{
  const token='d'.repeat(64);db.addSession(tokenHash(token),'a',Date.now()+60000);
  let release;const pending=new Promise(resolve=>{release=resolve;});
  const handler=createSentinelHandler({store:db.sentinel,sessionUser:()=>db.sessionUser(tokenHash(token),Date.now()),sessionToken:()=>token,body:async()=>{await pending;return {name:'Late token'};},json(){}});
  const operation=handler({method:'POST',headers:{origin:'https://locat.test'}},{},new URL('https://locat.test/api/sentinel/tokens'),'https://locat.test');
  db.revokeSession(tokenHash(token));release();await assert.rejects(operation,error=>error.status===401);assert.equal(db.sentinel.tokens('a').length,0);
 });
});
test('audit failures roll back token minting, revocation and incident status/history changes',async()=>{
 await fixture(({db,raw})=>{
  const reject=()=>raw.exec("CREATE TRIGGER reject_sentinel_audit BEFORE INSERT ON audit WHEN NEW.event LIKE 'sentinel.%' BEGIN SELECT RAISE(ABORT,'synthetic Sentinel audit failure');END;");
  reject();assert.throws(()=>db.sentinel.createToken('a','Never minted'),/synthetic Sentinel audit failure/);assert.equal(db.sentinel.tokens('a').length,0);
  raw.exec('DROP TRIGGER reject_sentinel_audit');const issued=db.sentinel.createToken('a','Monitor'),id=db.sentinel.ingest(db.sentinel.authenticate(issued.token),normalizeIncident({title:'Alert'})),before=db.sentinel.detail('a',id);
  reject();assert.throws(()=>db.sentinel.revokeToken('a',issued.id),/synthetic Sentinel audit failure/);assert.ok(db.sentinel.authenticate(issued.token));
  assert.throws(()=>db.sentinel.action('a',id,'resolve'),/synthetic Sentinel audit failure/);assert.deepEqual(db.sentinel.detail('a',id),before);
  assert.equal(db.auditPage('a',{q:'sentinel.'}).events.length,1);
 });
});
test('Sentinel actions share a bounded account bucket and reject extra selector fields',async()=>{
 let mutations=0;
 const handler=createSentinelHandler({store:{action(){mutations++;}},sessionUser:()=>({id:'a'}),sessionToken:()=> 'a'.repeat(64),body:async()=>({action:'note',note:'Checked'}),json(){}});
 const req={method:'POST',headers:{origin:'https://locat.test'}},url=new URL('https://locat.test/api/sentinel/incidents/'+ 'f'.repeat(32));
 for(let index=0;index<60;index++)await handler(req,{},url,'https://locat.test');
 await assert.rejects(handler(req,{},url,'https://locat.test'),error=>error.status===429&&error.retryAfter>0);assert.equal(mutations,60);
 const strict=createSentinelHandler({store:{},sessionUser:()=>({id:'a'}),sessionToken:()=> 'a'.repeat(64),body:async()=>({name:'Monitor',userId:'b'}),json(){}});
 await assert.rejects(strict(req,{},new URL('https://locat.test/api/sentinel/tokens'),'https://locat.test'),error=>error.status===400);
});
