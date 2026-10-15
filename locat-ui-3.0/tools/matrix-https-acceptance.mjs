import WebSocket from 'ws';
/** Synthetic loopback acceptance of the production HTTPS/auth/proof boundary.
 * This is a Node client, not browser persistence or UI acceptance. */
import assert from 'node:assert/strict';
import {request as httpsRequest} from 'node:https';
import {createServer} from 'node:net';
import {spawn,execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {once} from 'node:events';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {randomBytes} from 'node:crypto';
import {createClient} from 'matrix-js-sdk';
import {createMatrixVerificationSession} from '../src/integration/matrixVerificationSession.ts';
const exec=promisify(execFile),pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));

export async function runMatrixHttpsAcceptance({dir,upstream,registration,quiet,until}){
 const reservation=createServer();await new Promise(resolve=>reservation.listen(0,'127.0.0.1',resolve));
 const port=reservation.address().port;await new Promise(resolve=>reservation.close(resolve));
 const origin='https://127.0.0.1:'+port,key=join(dir,'locat-test.key'),cert=join(dir,'locat-test.crt');
 await exec('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-keyout',key,'-out',cert,'-days','1','-subj','/CN=127.0.0.1','-addext','subjectAltName=IP:127.0.0.1']);
 const ca=await readFile(cert),clients=[],controllers=[];
 // Trust only this fixture certificate and only this exact loopback origin.
 function transport(input,init={}){
  const url=new URL(String(input));assert.equal(url.origin,origin);
  return new Promise((resolve,reject)=>{
   const request=httpsRequest(url,{method:init.method??'GET',headers:Object.fromEntries(new Headers(init.headers)),ca,signal:init.signal},response=>{
    const chunks=[];let length=0;
    response.on('data',chunk=>{length+=chunk.length;if(length>2*1024*1024){request.destroy(new Error('Acceptance response exceeded limit'));return;}chunks.push(chunk);});
    response.on('error',reject);response.on('end',()=>{
     const headers=new Headers();for(const [name,value] of Object.entries(response.headers)){if(value!==undefined)headers.set(name,Array.isArray(value)?value.join(', '):value);}
     resolve(new Response(Buffer.concat(chunks),{status:response.statusCode,headers}));
    });
   });request.setTimeout(70000,()=>request.destroy(new Error('HTTPS acceptance request timed out')));request.on('error',reject);request.end(init.body);
  });
 }
 const child=spawn(process.execPath,['server/index.mjs'],{cwd:process.cwd(),env:{...process.env,LOCAT_HOST:'127.0.0.1',LOCAT_PORT:String(port),LOCAT_PUBLIC_ORIGIN:origin,LOCAT_TLS_KEY:key,LOCAT_TLS_CERT:cert,LOCAT_DATABASE_FILE:join(dir,'locat-binding.sqlite'),LOCAT_MATRIX_UPSTREAM:upstream,LOCAT_MATRIX_SERVER_NAME:'locat-test.invalid',LOCAT_MATRIX_APPSERVICE_FILE:registration},stdio:'ignore'});
 async function api(path,{method='GET',data,cookie,proof,headers={}}={}){
  return transport(origin+path,{method,headers:{Origin:origin,...(data===undefined?{}:{'Content-Type':'application/json'}),...(cookie?{Cookie:cookie}:{}),...(proof?{'X-Locat-Device-Proof':proof}:{}),...headers},...(data===undefined?{}:{body:JSON.stringify(data)})});
 }
 async function json(path,options,status=200){const response=await api(path,options);assert.equal(response.status,status,'HTTPS '+path+' status');return response.json();}
 try{
  await until(async()=>{if(child.exitCode!==null)throw new Error('Production HTTPS server exited during acceptance');try{return (await api('/api/ready')).ok;}catch{return false;}},'production HTTPS server readiness');
  async function account(username,bind=true){
   const password=randomBytes(24).toString('base64url'),user=(await json('/api/auth/register',{method:'POST',data:{username,displayName:'Synthetic HTTPS '+username,password}},201)).user;
   const login=await api('/api/auth/login',{method:'POST',data:{username,password}});assert.equal(login.status,200);const setCookie=login.headers.get('set-cookie');assert.match(setCookie,/; Secure/);assert.match(setCookie,/; HttpOnly/);assert.match(setCookie,/SameSite=Strict/);const cookie=setCookie.split(';')[0];
   const identity=await crypto.subtle.generateKey({name:'ECDH',namedCurve:'P-256'},false,['deriveBits']);assert.equal(identity.privateKey.extractable,false);
   const publicKey=Buffer.from(await crypto.subtle.exportKey('spki',identity.publicKey)).toString('base64');
   const device=await json('/api/link/register',{method:'POST',cookie,data:{name:'Synthetic HTTPS Node client',platform:'web',publicKey}},201);
   const challenge=await json('/api/link/challenge',{method:'POST',cookie,data:{id:device.id}});
   const remote=await crypto.subtle.importKey('spki',Buffer.from(challenge.publicKey,'base64'),{name:'ECDH',namedCurve:'P-256'},false,[]),bits=await crypto.subtle.deriveBits({name:'ECDH',public:remote},identity.privateKey,256);
   const base=await crypto.subtle.importKey('raw',bits,'HKDF',false,['deriveKey']),context=new TextEncoder().encode(`locat-link-device-proof:ui3-v1:${user.id}:${device.id}:${challenge.id}`);
   const key=await crypto.subtle.deriveKey({name:'HKDF',hash:'SHA-256',salt:context,info:new TextEncoder().encode('challenge-response')},base,{name:'AES-GCM',length:256},false,['decrypt']);
   const answer=Buffer.from(await crypto.subtle.decrypt({name:'AES-GCM',iv:Buffer.from(challenge.iv,'base64'),additionalData:context},key,Buffer.from(challenge.data,'base64'))).toString('base64');
   const proof=(await json('/api/link/prove',{method:'POST',cookie,data:{id:challenge.id,answer}})).token;
   assert.equal((await api('/api/link/prove',{method:'POST',cookie,data:{id:challenge.id,answer}})).status,403,'Device challenge replay must fail');
   const auth={cookie,proof},issued=await json('/api/link/matrix/provision',{...auth,method:'POST',data:{}});
   if(!bind)return {user,password,username,auth,issued,linkDeviceId:device.id};
   const fetchFn=(input,init={})=>{const headers=new Headers(init.headers);headers.set('Cookie',cookie);headers.set('Origin',origin);headers.set('X-Locat-Device-Proof',proof);headers.set('Authorization','Bearer '+issued.accessToken);return transport(input,{...init,headers});};
   const client=createClient({baseUrl:origin,fetchFn,userId:issued.userId,deviceId:issued.deviceId,accessToken:issued.accessToken,verificationMethods:['m.sas.v1'],logger:quiet});clients.push(client);
   await client.initRustCrypto({useIndexedDB:true,cryptoDatabasePrefix:'synthetic-https-'+user.id});const publicKeys=await client.getCrypto().getOwnDeviceKeys();
   await json('/api/link/matrix/bind',{...auth,method:'POST',data:{...issued,publicKeys}});
   const controller=createMatrixVerificationSession(client,query=>json('/api/link/matrix/peer?'+new URLSearchParams(query),auth));controllers.push(controller);let state;controller.subscribe(value=>{state=value;});
   return {user,password,username,auth,issued,client,controller,state:()=>state};
  }
  const unbound=await account('https_unbound',false),unboundStatus=await json('/api/link/matrix/status',unbound.auth);
  const unboundDevices=await json('/api/link/devices',unbound.auth);assert.equal(unboundDevices.devices.find(device=>device.id===unbound.linkDeviceId).matrix.binding,'unbound');
  assert.equal(unboundStatus.device,null);assert.equal(unboundStatus.authorizedHere,false);assert.equal(unboundStatus.managedDevice.deviceId,unbound.issued.deviceId);assert.equal(unboundStatus.managedDevice.operationActive,false);
  assert.equal((await api('/_matrix/client/v3/account/whoami',{...unbound.auth,headers:{Authorization:'Bearer '+unbound.issued.accessToken}})).status,403,'Recorded setup does not authorize the Matrix gateway');
  await json('/api/link/matrix/revoke-managed-device',{...unbound.auth,method:'POST',data:{}});
  assert.equal((await fetch(upstream+'/_matrix/client/v3/account/whoami',{headers:{Authorization:'Bearer '+unbound.issued.accessToken}})).status,401,'Unbound managed device can be revoked without returning its token');
  const abandoned=await account('https_abandoned',false);await json('/api/link/revoke',{...abandoned.auth,method:'POST',data:{id:abandoned.linkDeviceId}});
  await until(async()=>(await fetch(upstream+'/_matrix/client/v3/account/whoami',{headers:{Authorization:'Bearer '+abandoned.issued.accessToken}})).status===401,'queued revocation of unbound managed device');
  const alice=await account('https_alice'),bob=await account('https_bob');
  const aliceDevices=await json('/api/link/devices',alice.auth),aliceMessaging=aliceDevices.devices.find(device=>device.matrix?.deviceId===alice.issued.deviceId)?.matrix;assert.equal(aliceMessaging?.binding,'authorized');assert.equal(aliceMessaging.managed,true);
  await json('/api/contacts/request',{...alice.auth,method:'POST',data:{userId:bob.user.id}});
  await json('/api/contacts/respond',{...bob.auth,method:'POST',data:{userId:alice.user.id,accept:true}});
  const protectedPath='/_matrix/client/v3/account/whoami',bearer={Authorization:'Bearer '+alice.issued.accessToken};
  assert.equal((await api(protectedPath,{headers:bearer})).status,401,'Matrix bearer alone is insufficient');
  assert.equal((await api(protectedPath,{cookie:alice.auth.cookie,headers:bearer})).status,403,'Cookie and bearer without proof are insufficient');
  assert.equal((await api(protectedPath,{...alice.auth,proof:bob.auth.proof,headers:bearer})).status,403,'Foreign proof must fail');
  assert.equal((await api(protectedPath,{...bob.auth,headers:bearer})).status,403,'Foreign session cannot use another binding');
  const secondLogin=await api('/api/auth/login',{method:'POST',data:{username:alice.username,password:alice.password}});assert.equal(secondLogin.status,200);
  const secondCookie=secondLogin.headers.get('set-cookie').split(';')[0];assert.equal((await api(protectedPath,{...alice.auth,cookie:secondCookie,headers:bearer})).status,403,'Device proof is bound to the exact login session');
  assert.equal((await api('/api/link/matrix/provision',{...alice.auth,method:'POST',data:{},headers:{Origin:'https://untrusted.invalid'}})).status,403,'Wrong mutation origin must fail');
  assert.equal((await api('/api/auth/sessions/revoke-others',{...alice.auth,method:'POST',data:{currentPassword:'incorrect-password'}})).status,401,'Bulk sign-out requires password confirmation');
  assert.equal((await api('/api/auth/sessions/revoke-others',{...alice.auth,method:'POST',data:{currentPassword:alice.password},headers:{Origin:'https://foreign.invalid'}})).status,403,'Bulk sign-out requires exact mutation Origin');
  const otherSocket=new WebSocket(origin.replace('https:','wss:')+'/api/connect/socket',{ca,headers:{Origin:origin,Cookie:secondCookie}});
  try{await once(otherSocket,'message');const result=await json('/api/auth/sessions/revoke-others',{...alice.auth,method:'POST',data:{currentPassword:alice.password}});assert.equal(result.revokedCount,1);assert.equal((await api('/api/auth/me',alice.auth)).status,200);assert.equal((await api('/api/auth/me',{cookie:secondCookie})).status,401);assert.equal((await api('/api/auth/me',bob.auth)).status,200);const closed=once(otherSocket,'close');otherSocket.send(JSON.stringify({type:'ping',id:'revoked-session'}));const [code]=await Promise.race([closed,pause(15000).then(()=>{throw new Error('Revoked HTTPS session socket stayed open');})]);assert.equal(code,4001);}finally{otherSocket.terminate();}
  const activity=await json('/api/security/events?q=session.others.revoked&severity=warn&limit=1',alice.auth);assert.equal(activity.events.length,1);assert.equal(activity.events[0].event,'session.others.revoked');const timestamp=activity.events[0].createdAt,timePage=await json('/api/security/events?q=session.others.revoked&fromTime='+timestamp+'&toTime='+(timestamp+1),alice.auth);assert.equal(timePage.events[0].id,activity.events[0].id);assert.equal((await json('/api/security/events?q=session.others.revoked&toTime='+timestamp,alice.auth)).events.length,0);assert.equal((await api('/api/security/events?fromTime='+timestamp+'&toTime='+timestamp,alice.auth)).status,400);assert.equal((await json('/api/security/events?q=session.others.revoked',bob.auth)).events.length,0);assert.equal((await api('/api/security/events?before=0',alice.auth)).status,400);assert.equal((await api('/api/security/events?userId='+bob.user.id,alice.auth)).status,400);
  await Promise.all([alice.controller.start(),bob.controller.start()]);await bob.controller.devices(alice.user.id);
  await alice.controller.request(bob.user.id,bob.issued.deviceId);await until(()=>bob.state().phase==='requested','HTTPS incoming verification');await bob.controller.accept();
  await until(()=>alice.state().phase==='comparing'&&bob.state().phase==='comparing','HTTPS SAS comparison');assert.deepEqual(alice.state().decimal,bob.state().decimal);assert.deepEqual(alice.state().emoji,bob.state().emoji);
  await alice.controller.confirm();assert.notEqual(alice.state().phase,'verified');await bob.controller.confirm();await until(()=>alice.state().phase==='verified'&&bob.state().phase==='verified','HTTPS stored device trust');
  assert.equal(alice.client.getRooms().length,0);assert.equal(bob.client.getRooms().length,0);
  await Promise.all(controllers.map(controller=>controller.close()));for(const client of clients)client.stopClient();
  await json('/api/contacts/block',{...alice.auth,method:'POST',data:{userId:bob.user.id,blocked:true}});
  assert.equal((await api('/api/link/matrix/peer?accountId='+bob.user.id,alice.auth)).status,404,'Blocking removes peer discovery');
  assert.equal((await api('/_matrix/client/v3/keys/query',{...alice.auth,method:'POST',data:{device_keys:{[bob.issued.userId]:[]}},headers:bearer})).status,403,'Blocking removes key discovery');
  await json('/api/link/matrix/revoke-managed-device',{...bob.auth,method:'POST',data:{}});
  assert.equal((await api(protectedPath,{...bob.auth,headers:{Authorization:'Bearer '+bob.issued.accessToken}})).status,403,'Revoked managed grant blocks gateway');
  const upstreamWhoami=await fetch(upstream+protectedPath,{headers:{Authorization:'Bearer '+bob.issued.accessToken}});assert.equal(upstreamWhoami.status,401,'Managed revocation invalidates actual upstream token');
  const linkDevices=await json('/api/link/devices',alice.auth);const ownLink=linkDevices.devices.find(device=>device.id===Number(alice.issued.deviceId.slice('LOCAT_'.length)));assert.ok(ownLink);
  await json('/api/link/revoke',{...alice.auth,method:'POST',data:{id:ownLink.id}});
  assert.equal((await api(protectedPath,{...alice.auth,headers:bearer})).status,403,'Revoked Link identity blocks the Matrix gateway');
  await until(async()=>(await fetch(upstream+protectedPath,{headers:bearer})).status===401,'queued Link revocation invalidates actual Matrix session');
  for(const file of ['locat-binding.sqlite','locat-binding.sqlite-wal']){let bytes;try{bytes=await readFile(join(dir,file));}catch(error){if(error.code==='ENOENT')continue;throw error;}for(const secret of [alice,bob,unbound,abandoned].flatMap(account=>[account.password,account.auth.cookie.split('=')[1],account.auth.proof,account.issued.accessToken]))assert.equal(bytes.includes(Buffer.from(secret)),false,'Locat persistence must not contain raw authentication secrets');}
  await json('/api/auth/logout',{...alice.auth,method:'POST',data:{}});
  assert.equal((await api(protectedPath,{...alice.auth,headers:bearer})).status,401,'Locat logout invalidates gateway session');
  return 'production HTTPS server: real login/Secure cookie/private-key proof, managed provisioning/binding, mutual SAS, unbound-device cleanup, password-confirmed other-session sign-out and socket invalidation, block/durable Link-to-Matrix revoke/logout enforcement';
 }finally{
  await Promise.allSettled(controllers.map(controller=>controller.close()));for(const client of clients)client.stopClient();
  if(child.exitCode===null&&child.signalCode===null){child.kill();await Promise.race([once(child,'exit'),pause(3000)]);if(child.exitCode===null&&child.signalCode===null){child.kill('SIGKILL');await once(child,'exit');}}
 }
}
