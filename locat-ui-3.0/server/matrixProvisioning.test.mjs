import {test} from 'node:test';import assert from 'node:assert/strict';import {createServer} from 'node:http';
import {createManagedMatrixProvisioner} from './matrixProvisioning.mjs';import {managedMatrixIdentity} from '../shared/matrixIdentity.mjs';
test('managed provisioning derives identity, rejects migration/key replacement and cleans up sessions on authorization loss',async()=>{
 const serverId='e4aca6da-f98e-40cc-890e-cc577dc6c0bc',user='a'.repeat(32),identity=managedMatrixIdentity(serverId,user,1,'matrix.test'),secret='s'.repeat(64),token='synthetic-device-token-0001',seen=[],loggedOut=[];let mode='valid',local={matrixUserId:null,device:null};
 const server=createServer(async(req,res)=>{let body='';for await(const chunk of req)body+=chunk;seen.push({path:req.url,auth:req.headers.authorization,body:JSON.parse(body),cookie:req.headers.cookie});res.setHeader('Content-Type','application/json');if(mode==='redirect'){res.writeHead(302,{Location:'https://foreign.test'});return res.end('{}');}if(mode==='large')return res.end('x'.repeat(32769));if(mode==='null')return res.end('null');if(req.url.endsWith('/register')){if(mode==='existing'){res.statusCode=400;return res.end(JSON.stringify({errcode:'M_USER_IN_USE'}));}return res.end(JSON.stringify({user_id:identity.userId}));}res.end(JSON.stringify({user_id:identity.userId,device_id:identity.deviceId,access_token:token}));});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const provider={origin:'http://127.0.0.1:'+server.address().port,serverName:'matrix.test',async inspect(){return {userId:identity.userId,deviceId:identity.deviceId,keys:mode==='keys'?{'ed25519:LOCAT_1':'unknown','curve25519:LOCAT_1':'unknown'}:null};},async logout(value){loggedOut.push(value);}};
 const service=createManagedMatrixProvisioner({provider,serviceToken:secret,serverId,store:{status(){return local;}}});
 try{
  const result=await service.provision(user,1,()=>{});assert.deepEqual(result,{userId:identity.userId,deviceId:identity.deviceId,accessToken:token});assert.ok(!JSON.stringify(result).includes(secret));assert.equal(seen[0].body.username,identity.localpart);assert.equal(seen[0].body.inhibit_login,true);assert.equal(seen[1].body.device_id,identity.deviceId);assert.ok(seen.every(value=>value.auth==='Bearer '+secret&&!value.cookie));
  mode='existing';await service.provision(user,1,()=>{});
  const count=seen.length;local={matrixUserId:'@foreign:matrix.test',device:null};await assert.rejects(service.provision(user,1,()=>{}),{status:409});assert.equal(seen.length,count);local={matrixUserId:null,device:null};
  mode='keys';await assert.rejects(service.provision(user,1,()=>{}),{status:409});assert.equal(loggedOut.at(-1),token);
  mode='valid';let checks=0;await assert.rejects(service.provision(user,1,()=>{if(++checks===3)throw Object.assign(new Error('Session revoked'),{status:403});}),{status:403});assert.equal(loggedOut.length,2);
  for(const invalid of ['redirect','large','null']){mode=invalid;await assert.rejects(service.provision(user,1,()=>{}),{status:502});}
  mode='valid';await service.cancel(user,1,token,()=>{});assert.equal(loggedOut.at(-1),token);await assert.rejects(service.cancel(user,1,secret,()=>{}),{status:400});
  const original=provider.inspect;provider.inspect=async()=>({userId:'@foreign:matrix.test',deviceId:identity.deviceId});await assert.rejects(service.cancel(user,1,token,()=>{}),{status:403});provider.inspect=original;
  mode='valid';await service.provision(user,1,()=>{}); // Failure paths release the per-device lock.
  let release,entered;const held=new Promise(resolve=>{release=resolve;}),ready=new Promise(resolve=>{entered=resolve;});provider.inspect=async()=>{entered();await held;return original();};
  const pending=service.provision(user,1,()=>{});await ready;await assert.rejects(service.provision(user,1,()=>{}),{status:409});release();await pending;provider.inspect=original;
  const originalLogout=provider.logout;provider.logout=async()=>{throw new Error('Unavailable');};mode='keys';await assert.rejects(service.provision(user,1,()=>{}),/cleanup.*not confirmed/);provider.logout=originalLogout;
 }finally{await new Promise(resolve=>server.close(resolve));}
});
