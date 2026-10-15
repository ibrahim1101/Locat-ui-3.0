import {test} from 'node:test';import assert from 'node:assert/strict';import {mkdtemp,rm,readFile} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join} from 'node:path';import {createServer} from 'node:http';import {openDatabase} from './database.mjs';import {matrixProvider,matrixTokenHash} from './matrixBinding.mjs';
const keys={ed25519:Buffer.alloc(32,1).toString('base64').replace(/=+$/,''),curve25519:Buffer.alloc(32,2).toString('base64').replace(/=+$/,'')};
const input={userId:'@alice:matrix.test',deviceId:'ALICE',accessToken:'synthetic-matrix-token-0001',publicKeys:keys};
test('Matrix binding is durable, unique, session/device scoped, hashes tokens and prevents existing-device key replacement',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'locat-matrix-binding-'));const file=join(dir,'db.sqlite');let db;
 try{db=openDatabase(file);for(const id of ['a','b'])db.addUser({id,username:id.repeat(3),displayName:id,salt:'salt',hash:'hash'});
  const a=db.link.register('a','First','web','public-a').id,b=db.link.register('a','Second','web','public-b').id,foreign=db.link.register('b','Foreign','web','public-c').id;
  const remote={userId:input.userId,deviceId:input.deviceId,keys:null};
  assert.throws(()=>db.matrixBindings.bind('a',a,'session',input,{...remote,keys:{['ed25519:ALICE']:keys.ed25519,['curve25519:ALICE']:keys.curve25519}}),{status:409});
  const value=db.matrixBindings.bind('a',a,'session',input,remote);assert.equal(value.matrixUserId,input.userId);assert.equal(value.device.deviceId,'ALICE');assert.ok(!JSON.stringify(value).includes(input.accessToken));
  assert.equal(db.matrixBindings.authorize('a',a,'session',input.accessToken).matrixDeviceId,'ALICE');assert.throws(()=>db.matrixBindings.authorize('a',a,'other',input.accessToken),{status:403});assert.throws(()=>db.matrixBindings.authorize('a',b,'session',input.accessToken),{status:403});
  assert.throws(()=>db.matrixBindings.bind('a',b,'session',input,remote),{status:409});assert.throws(()=>db.matrixBindings.bind('b',foreign,'session',input,remote),{status:409});
  assert.throws(()=>db.matrixBindings.bind('a',a,'session',{...input,publicKeys:{...keys,ed25519:keys.curve25519}},remote),{status:409});
  db.matrixBindings.bind('a',a,'renewed',{...input,accessToken:'synthetic-new-token-0002'},{...remote,keys:{['ed25519:ALICE']:keys.ed25519,['curve25519:ALICE']:keys.curve25519}});
  assert.throws(()=>db.matrixBindings.authorize('a',a,'session',input.accessToken),{status:403});
  db.close();db=openDatabase(file);assert.equal(db.matrixBindings.current('a',a).tokenHash,matrixTokenHash('synthetic-new-token-0002'));assert.ok(!Buffer.from(await readFile(file)).includes(Buffer.from(input.accessToken)));
  db.matrixBindings.disconnect('a',a);assert.throws(()=>db.matrixBindings.authorize('a',a,'renewed','synthetic-new-token-0002'),{status:403});
  db.link.revoke('a',b,a);assert.throws(()=>db.matrixBindings.status('a',a),{status:403});
 }finally{db?.close();await rm(dir,{recursive:true,force:true});}
});
test('Matrix provider validates whoami/key responses against one configured upstream and rejects redirects/guests/oversized data',async()=>{
 assert.equal(matrixProvider({}),null);for(const upstream of ['http://192.168.1.1','http://localhost.evil.test','https://a:b@host','https://host/path'])assert.throws(()=>matrixProvider({LOCAT_MATRIX_UPSTREAM:upstream,LOCAT_MATRIX_SERVER_NAME:'matrix.test'}));
 let mode='valid';const seen=[];const server=createServer((req,res)=>{seen.push({url:req.url,auth:req.headers.authorization,cookie:req.headers.cookie});res.setHeader('Content-Type','application/json');if(mode==='redirect'){res.writeHead(302,{Location:'https://evil.test/'});return res.end();}if(mode==='large')return res.end('x'.repeat(32769));if(req.url.endsWith('whoami'))return res.end(JSON.stringify({user_id:input.userId,device_id:input.deviceId,is_guest:mode==='guest'}));res.end(JSON.stringify({device_keys:{[input.userId]:{[input.deviceId]:{user_id:input.userId,device_id:input.deviceId,keys:{['ed25519:ALICE']:keys.ed25519,['curve25519:ALICE']:keys.curve25519}}}}}));});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));try{const provider=matrixProvider({LOCAT_MATRIX_UPSTREAM:'http://127.0.0.1:'+server.address().port,LOCAT_MATRIX_SERVER_NAME:'matrix.test'});const value=await provider.inspect(input.accessToken);assert.equal(value.deviceId,'ALICE');assert.equal(seen[0].auth,'Bearer '+input.accessToken);assert.equal(seen[0].cookie,undefined);assert.equal(seen[0].url,'/_matrix/client/v3/account/whoami');
  mode='guest';await assert.rejects(provider.inspect(input.accessToken),{status:400});mode='large';await assert.rejects(provider.inspect(input.accessToken),{status:502});mode='redirect';await assert.rejects(provider.inspect(input.accessToken),{status:502});
 }finally{await new Promise(resolve=>server.close(resolve));}
});
