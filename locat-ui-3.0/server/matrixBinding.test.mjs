import {test} from 'node:test';import assert from 'node:assert/strict';import {mkdtemp,rm,readFile} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join} from 'node:path';import {createServer} from 'node:http';import {openDatabase} from './database.mjs';import {matrixProvider,matrixTokenHash,createMatrixBindingHandler} from './matrixBinding.mjs';
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
 let mode='valid';const seen=[];const server=createServer((req,res)=>{seen.push({url:req.url,auth:req.headers.authorization,cookie:req.headers.cookie});res.setHeader('Content-Type','application/json');if(mode==='null')return res.end('null');if(mode==='redirect'){res.writeHead(302,{Location:'https://evil.test/'});return res.end();}if(mode==='large')return res.end('x'.repeat(32769));if(req.url.endsWith('whoami'))return res.end(JSON.stringify({user_id:input.userId,device_id:input.deviceId,is_guest:mode==='guest'}));res.end(JSON.stringify({device_keys:{[input.userId]:{[input.deviceId]:{user_id:input.userId,device_id:input.deviceId,keys:{['ed25519:ALICE']:keys.ed25519,['curve25519:ALICE']:keys.curve25519}}}}}));});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));try{const provider=matrixProvider({LOCAT_MATRIX_UPSTREAM:'http://127.0.0.1:'+server.address().port,LOCAT_MATRIX_SERVER_NAME:'matrix.test'});const value=await provider.inspect(input.accessToken);assert.equal(value.deviceId,'ALICE');assert.equal(seen[0].auth,'Bearer '+input.accessToken);assert.equal(seen[0].cookie,undefined);assert.equal(seen[0].url,'/_matrix/client/v3/account/whoami');
  mode='null';await assert.rejects(provider.inspect(input.accessToken),{status:502});mode='guest';await assert.rejects(provider.inspect(input.accessToken),{status:400});mode='large';await assert.rejects(provider.inspect(input.accessToken),{status:502});mode='redirect';await assert.rejects(provider.inspect(input.accessToken),{status:502});
 }finally{await new Promise(resolve=>server.close(resolve));}
});

test('Matrix binding rechecks authorization after upstream validation before persisting a grant',async()=>{
 let persisted=false,audited=false,finish;const upstream=new Promise(resolve=>{finish=resolve;});
 const handler=createMatrixBindingHandler({store:{bind(){persisted=true;}},provider:{inspect:()=>upstream},body:async()=>input,json(){throw new Error('No success response expected');},audit(){audited=true;}});
 const operation=handler({req:{method:'POST'},res:{},url:new URL('http://locat.test/api/link/matrix/bind'),userId:'owner',actor:1,session:'session',recheck(){throw Object.assign(new Error('Session revoked during validation'),{status:401});}});
 finish({userId:input.userId,deviceId:input.deviceId,keys:null});await assert.rejects(operation,{status:401});assert.equal(persisted,false);assert.equal(audited,false);
});
test('explicit Matrix logout blocks the gateway first, supports retry and never claims an unconfirmed upstream logout',async()=>{
 let blocked=false,attempt=0,result;const events=[];const handler=createMatrixBindingHandler({store:{authorize(_user,_actor,_session,token,allowExpired){assert.equal(token,input.accessToken);assert.equal(allowExpired,true);},disconnect(){blocked=true;}},provider:{async logout(){assert.equal(blocked,true);if(++attempt===1)throw Object.assign(new Error('Unavailable'),{status:502});}},body:async()=>({accessToken:input.accessToken}),json(_res,status,value){assert.equal(status,200);result=value;},audit(_user,event){events.push(event);}});
 const command={req:{method:'POST'},res:{},url:new URL('http://locat.test/api/link/matrix/logout'),userId:'owner',actor:1,session:'session',recheck(){}};
 await assert.rejects(handler(command),{status:502});assert.equal(blocked,true);assert.equal(result,undefined);assert.deepEqual(events,['matrix.session.logout.unconfirmed']);await handler(command);assert.deepEqual(result,{ok:true,upstreamLogoutConfirmed:true});assert.equal(events.at(-1),'matrix.session.logged_out');
});

test('managed setup endpoint requires empty derived-identity input and existing action limits',async()=>{
 let input={},status,payload,called=0;const audits=[];
 const handler=createMatrixBindingHandler({store:{},provider:{},provisioner:{async provision(user,actor,recheck){assert.equal(user,'account');assert.equal(actor,7);recheck();called++;return {userId:'@managed:matrix.test',deviceId:'LOCAT_7',accessToken:'synthetic-device-token'};}},body:async()=>input,json(_res,code,value){status=code;payload=value;},audit(...args){audits.push(args);}});
 const context={req:{method:'POST'},res:{},url:new URL('http://localhost/api/link/matrix/provision'),userId:'account',actor:7,session:'session',recheck(){}};
 input={userId:'@chosen:matrix.test'};await assert.rejects(handler(context),{status:400});assert.equal(called,0);
 input={};await handler(context);assert.equal(status,200);assert.equal(payload.deviceId,'LOCAT_7');assert.equal(audits[0][1],'matrix.session.provisioned');
 for(let i=0;i<8;i++)await handler(context);await assert.rejects(handler(context),{status:429});
 const unavailable=createMatrixBindingHandler({store:{},provider:{},body:async()=>({}),json(){},audit(){}});await assert.rejects(unavailable(context),{status:503});
});

test('exhausted Matrix setup allowance preserves separately bounded cleanup and revocation',async()=>{
 let input={},provisioned=0,cancelled=0,revoked=0,loggedOut=0,disconnected=0,allowed=true;
 const handler=createMatrixBindingHandler({store:{authorize(){},disconnect(){disconnected++;}},provider:{async logout(){loggedOut++;}},provisioner:{async provision(){provisioned++;return {};},async cancel(_user,_actor,_token,recheck){recheck();cancelled++;return {upstreamLogoutConfirmed:true};},async revokeDevice(_user,_actor,recheck){recheck();revoked++;}},body:async()=>input,json(){},audit(){}});
 const command=action=>handler({req:{method:'POST'},res:{},url:new URL('https://locat.test/api/link/matrix/'+action),userId:'owner',actor:1,session:'session',recheck(){if(!allowed)throw Object.assign(new Error('Session revoked'),{status:401});}});
 for(let i=0;i<10;i++)await command('provision');assert.equal(provisioned,10);await assert.rejects(command('provision'),{status:429});await assert.rejects(command('bind'),{status:429});
 input={accessToken:'synthetic-matrix-token-0001'};allowed=false;await assert.rejects(command('cancel-provision'),{status:401});assert.equal(cancelled,0);allowed=true;
 await command('cancel-provision');await command('logout');input={};await command('disconnect');await command('revoke-managed-device');assert.equal(cancelled,1);assert.equal(loggedOut,1);assert.equal(disconnected,2);assert.equal(revoked,1);
 input={accessToken:'synthetic-matrix-token-0001'};for(let i=0;i<25;i++)await command('cancel-provision');await assert.rejects(command('cancel-provision'),{status:429});await assert.rejects(command('provision'),{status:429});
});

test('cleanup cannot act after authorization changes while its request body is being read',async()=>{
 for(const action of ['cancel-provision','disconnect','logout','revoke-managed-device']){
  let release,entered,allowed=true,mutated=false;const reading=new Promise(resolve=>{entered=resolve;}),gate=new Promise(resolve=>{release=resolve;});
  const handler=createMatrixBindingHandler({store:{authorize(){mutated=true;},disconnect(){mutated=true;}},provider:{async logout(){mutated=true;}},provisioner:{async cancel(){mutated=true;},async revokeDevice(){mutated=true;}},body:async()=>{entered();await gate;return ['logout','cancel-provision'].includes(action)?{accessToken:'synthetic-matrix-token-0001'}:{};},json(){mutated=true;},audit(){mutated=true;}});
  const operation=handler({req:{method:'POST'},res:{},url:new URL('https://locat.test/api/link/matrix/'+action),userId:'owner',actor:1,session:'session',recheck(){if(!allowed)throw Object.assign(new Error('Session revoked'),{status:401});}});
  await reading;allowed=false;release();await assert.rejects(operation,{status:401});assert.equal(mutated,false,action+' must retain the fresh authorization guard');
 }
});
