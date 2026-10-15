import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {mkdtemp,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {openDatabase} from './database.mjs';
import {parseIncidentQuery,parseTokenQuery,parseIncidentHistoryQuery} from './sentinelQueries.mjs';
async function fixture(run){
 const dir=await mkdtemp(join(tmpdir(),'locat-incident-query-'));let db,raw;
 try{const file=join(dir,'db.sqlite');db=openDatabase(file);raw=new DatabaseSync(file);for(const id of ['a','b'])db.addUser({id,username:id,displayName:id,salt:'s',hash:'h'});
  const insert=(id,userId='a',extra={})=>{const row={id:id.toString(16).padStart(32,'0'),userId,source:'custom',fingerprint:String(id),title:'Alert '+id,description:'',severity:'medium',status:'open',occurrences:1,createdAt:1000,updatedAt:1000,...extra};raw.prepare('INSERT INTO sentinelIncidents VALUES (?,?,?,?,?,?,?,?,?,?,?)').run(...['id','userId','source','fingerprint','title','description','severity','status','occurrences','createdAt','updatedAt'].map(key=>row[key]));return row;};
  await run({db,raw,insert});
 }finally{raw?.close();db?.close();await rm(dir,{recursive:true,force:true});}
}
test('incident query rejects ambiguous selectors, malformed cursors and unbounded pages',()=>{
 assert.equal(parseIncidentQuery(new URLSearchParams()).limit,100);
 for(const query of ['userId=b','q=a&q=b','status=open&status=resolved','status=closed','severity=urgent','limit=0','limit=101','limit=01','before=1','before=01:'+ 'a'.repeat(32),'before=8640000000000001:'+ 'a'.repeat(32),'before=1:'+ 'A'.repeat(32),'source='+ 's'.repeat(65),'q='+ 'x'.repeat(161)])assert.throws(()=>parseIncidentQuery(new URLSearchParams(query)),error=>error.status===400,query);
 assert.equal(parseIncidentQuery(new URLSearchParams({before:'0:'+ 'a'.repeat(32),limit:'1'})).before.updatedAt,0);
});
test('incident cursor pages cover more than 100 owned rows and stable timestamp ties without duplicates',async()=>{
 await fixture(({db,insert})=>{
  for(let id=1;id<=137;id++)insert(id);for(let id=200;id<210;id++)insert(id,'b');
  const first=db.sentinel.incidentPage('a',{limit:25}),ids=first.incidents.map(row=>row.id);let cursor=first.nextCursor;
  assert.equal(ids.length,25);assert.ok(cursor);insert(999,'a',{updatedAt:2000});
  while(cursor){const page=db.sentinel.incidentPage('a',{limit:25,before:cursor});for(const row of page.incidents){assert.equal(row.userId,'a');ids.push(row.id);}cursor=page.nextCursor;}
  assert.equal(ids.length,137);assert.equal(new Set(ids).size,137);
  assert.equal(db.sentinel.incidentPage('a',{limit:1}).incidents[0].id,(999).toString(16).padStart(32,'0'));
  assert.equal(db.sentinel.incidents('a',null).length,100);
 });
});
test('incident filters are combined on the server, use literal search and always retain ownership',async()=>{
 await fixture(({db,insert})=>{
  const target=insert(1,'a',{title:"Alert 100%_' failure",source:'nscout',severity:'critical',status:'resolved'});
  insert(2,'b',{title:target.title,source:'nscout',severity:'critical',status:'resolved'});
  insert(3,'a',{title:target.title,source:'custom',severity:'critical',status:'resolved'});
  insert(4,'a',{title:target.title,source:'nscout',severity:'low',status:'resolved'});
  insert(5,'a',{title:target.title,source:'nscout',severity:'critical',status:'open'});
  insert(6,'a',{title:'Other',description:'A Database Connection Failed',source:'other'});
  const page=db.sentinel.incidentPage('a',{q:"ALERT 100%_'",source:'nscout',severity:'critical',status:'resolved',limit:1});
  assert.deepEqual(page.incidents.map(row=>row.id),[target.id]);assert.equal(page.nextCursor,null);
  assert.equal(db.sentinel.incidentPage('a',{q:'database connection'}).incidents.length,1);
  assert.equal(db.sentinel.incidentPage('a',{source:'NSCOUT'}).incidents.length,0);
  assert.equal(db.sentinel.incidentPage('a',{q:"' OR 1=1 --"}).incidents.length,0);
 });
});
test('an incident updated above the cursor is included on refresh rather than treated as an immutable snapshot',async()=>{
 await fixture(({db,raw,insert})=>{
  for(let id=1;id<=4;id++)insert(id);
  const first=db.sentinel.incidentPage('a',{limit:2});
  raw.prepare('UPDATE sentinelIncidents SET updatedAt=3000 WHERE id=?').run('1'.padStart(32,'0'));
  const older=db.sentinel.incidentPage('a',{limit:2,before:first.nextCursor});assert.equal(older.incidents.length,1);
  assert.equal(db.sentinel.incidentPage('a',{limit:2}).incidents[0].id,'1'.padStart(32,'0'));
 });
});

test('token pages reach older active and revoked records without leaking token hashes or foreign owners',async()=>{
 await fixture(({db,raw})=>{
  const put=(id,userId,revokedAt)=>raw.prepare('INSERT INTO sentinelTokens(id,userId,hash,name,prefix,createdAt,revokedAt) VALUES(?,?,?,?,?,?,?)').run(id.toString(16).padStart(32,'0'),userId,id.toString(16).padStart(64,'0'),'Token '+id,'lsk_public',1000,revokedAt);
  for(let id=1;id<=132;id++)put(id,'a',id<=20?null:2000);put(999,'b',null);
  const active=db.sentinel.tokenPage('a',{state:'active',limit:25});assert.equal(active.tokens.length,20);assert.equal(active.nextCursor,null);assert.equal(active.tokens.every(row=>row.revokedAt===null),true);
  let cursor=null,ids=[];
  do{const page=db.sentinel.tokenPage('a',{limit:25,before:cursor});ids.push(...page.tokens.map(row=>row.id));assert.equal(page.tokens.some(row=>'hash' in row||'userId' in row||'token' in row),false);cursor=page.nextCursor;}while(cursor);
  assert.equal(ids.length,132);assert.equal(new Set(ids).size,132);
  assert.equal(db.sentinel.tokenPage('a',{state:'revoked',limit:100}).tokens.length,100);
  for(const query of ['userId=b','state=other','state=active&state=revoked','limit=101','before=invalid'])assert.throws(()=>parseTokenQuery(new URLSearchParams(query)),error=>error.status===400);
 });
});
test('owned incident history pages reach beyond 200 events and exclude newer arrivals and foreign history',async()=>{
 await fixture(({db,raw,insert})=>{
  const a=insert(1),b=insert(2,'b');const add=(id,note)=>raw.prepare('INSERT INTO sentinelEvents(incidentId,action,note,createdAt) VALUES(?,?,?,?)').run(id,'note',note,1000);
  for(let index=0;index<231;index++){add(a.id,'Owned '+index);add(b.id,'Foreign '+index);}
  assert.equal(db.sentinel.detail('b',a.id),null);assert.equal(db.sentinel.detail('a',a.id).events.length,200);
  const first=db.sentinel.detail('a',a.id,{limit:50}),ids=first.events.map(row=>row.id);let cursor=first.nextCursor;
  add(a.id,'New arrival');
  while(cursor){const page=db.sentinel.detail('a',a.id,{limit:50,before:cursor});assert.equal(page.events.every(row=>row.note.startsWith('Owned')),true);ids.push(...page.events.map(row=>row.id));cursor=page.nextCursor;}
  assert.equal(ids.length,231);assert.equal(new Set(ids).size,231);assert.equal(db.sentinel.detail('a',a.id,{limit:1}).events[0].note,'New arrival');
  for(const query of ['userId=b','before=0','before=01','before=1&before=2','limit=201','limit=0'])assert.throws(()=>parseIncidentHistoryQuery(new URLSearchParams(query)),error=>error.status===400);
 });
});
