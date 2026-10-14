import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {openDatabase} from './database.mjs';
import {normalizeIncident,normalizeWebhook,tokenHash} from './sentinel.mjs';
test('Sentinel stores digests, persists history, isolates deduplication and preserves revoked incidents',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'locat-sentinel-')); const file=join(dir,'test.sqlite'); let db;
 try {
  db=openDatabase(file);
  for(const id of ['a','b']) db.addUser({id,username:id,displayName:id,salt:'salt',hash:'hash'});
  const a=db.sentinel.createToken('a','Test'); const b=db.sentinel.createToken('b','Test');
  const raw=new DatabaseSync(file); const stored=raw.prepare('SELECT hash FROM sentinelTokens WHERE id=?').get(a.id); raw.close();
  assert.equal(stored.hash,tokenHash(a.token)); assert.notEqual(stored.hash,a.token);
  const input=normalizeIncident({title:'Failed',source:'test',fingerprint:'same'});
  const id=db.sentinel.ingest(db.sentinel.authenticate(a.token),input);
  const other=db.sentinel.ingest(db.sentinel.authenticate(b.token),input); assert.notEqual(id,other);
  assert.equal(db.sentinel.detail('b',id),null);
  assert.throws(()=>db.sentinel.action('b',id,'resolve'),/not found/);
  db.sentinel.action('a',id,'resolve'); db.sentinel.ingest(db.sentinel.authenticate(a.token),input);
  assert.equal(db.sentinel.detail('a',id).incident.status,'open');
  db.sentinel.action('a',id,'note','checked'); db.sentinel.revokeToken('a',a.id);
  db.close(); db=openDatabase(file); assert.equal(db.sentinel.authenticate(a.token),undefined);
  assert.equal(db.sentinel.detail('a',id).events[0].note,'checked');
 }finally{db?.close();await rm(dir,{recursive:true,force:true});}
});
test('generic incident validation bounds strings and rejects malformed enums',()=>{
 for(const input of [null,[],{title:''},{title:'x',severity:'urgent'},{title:'x',status:'unknown'},{title:'x',description:4},{title:'x',fingerprint:'a'.repeat(129)}]) assert.throws(()=>normalizeIncident(input));
 assert.equal(normalizeIncident({title:' Test ',status:'resolved'}).status,'resolved');
});

test('original nScout and PipelineGuard mappings normalize failures and recovery',()=>{
 const a=normalizeWebhook('nscout',{alert:{name:'DB failure',service:'database',host:'host',level:'fatal',id:'alert-1'}});
 assert.equal(a.severity,'critical'); assert.equal(a.fingerprint,'alert-1'); assert.equal(a.source,'nscout');
 assert.equal(normalizeWebhook('nscout',{alert:{state:'recovered'}}).status,'resolved');
 const failed=normalizeWebhook('pipelineguard',{pipeline:'Build',stage:'test',status:'failed'});
 const passed=normalizeWebhook('pipelineguard',{pipeline:'Build',stage:'test',status:'passed'});
 assert.equal(failed.severity,'high'); assert.equal(passed.status,'resolved'); assert.equal(failed.fingerprint,passed.fingerprint);
 assert.throws(()=>normalizeWebhook('other',{})); assert.throws(()=>normalizeWebhook('nscout',{alert:[]}));
 assert.throws(()=>normalizeWebhook('pipelineguard',{pipeline:42}));
});
