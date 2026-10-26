import {test,mock} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {openDatabase} from './database.mjs';
import {createMatrixRevocationWorker} from './matrixRevocation.mjs';
import {createManagedMatrixProvisioner} from './matrixProvisioning.mjs';
import {managedMatrixIdentity} from '../shared/matrixIdentity.mjs';
const owner='a'.repeat(32),other='b'.repeat(32),keys={ed25519:Buffer.alloc(32,1).toString('base64').replace(/=+$/,''),curve25519:Buffer.alloc(32,2).toString('base64').replace(/=+$/,'')};
function setup(db){for(const [id,name] of [[owner,'alice'],[other,'bob']])db.addUser({id,username:name,displayName:name,salt:'salt',hash:'hash'});const actor=db.link.register(owner,'Surviving','web','public-a').id,target=db.link.register(owner,'Revoked','web','public-b').id;const identity=managedMatrixIdentity(db.serverId,owner,target,'matrix.test');db.matrixBindings.bind(owner,target,'session',{userId:identity.userId,deviceId:identity.deviceId,accessToken:'synthetic-matrix-token-0001',publicKeys:keys},{userId:identity.userId,deviceId:identity.deviceId,keys:null});return {actor,target,identity};}
test('Link revocation atomically queues cleanup, expires grants and survives v12 migration/restart',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'locat-cleanup-')),file=join(dir,'db.sqlite');let db;
 try{db=openDatabase(file);const {actor,target}=setup(db);db.link.revoke(owner,actor,target);assert.equal(db.matrixRevocations.status(owner,target).status,'pending');assert.equal(db.matrixBindings.current(owner,target).expiresAt,0);assert.equal(db.link.list(owner,actor).devices.find(device=>device.id===target).matrixRevocation,'pending');assert.equal(db.matrixRevocations.status(other,target),null);db.close();
  const raw=new DatabaseSync(file);raw.exec('DROP TABLE automationRules;DROP TABLE workspaceItems;DROP TABLE workspaceMembers;DROP TABLE workspaces;DROP TABLE encryptedShares;DROP TABLE calendarEvents;DROP TABLE linkProofTokens;DROP TABLE linkProofChallenges;DROP TABLE IF EXISTS mediaShareOverrides;DROP TABLE matrixConversations;DROP TABLE matrixManagedDevices;DROP TABLE matrixRevocations;PRAGMA user_version=12;');raw.close();db=openDatabase(file);assert.equal(db.health().schemaVersion,25);assert.equal(db.userById(owner).username,'alice');assert.equal(db.matrixRevocations.status(owner,target).status,'pending');assert.ok(db.matrixBindings.current(owner,target));
  let now=1000,calls=0;let worker=createMatrixRevocationWorker({store:db.matrixRevocations,now:()=>now,revoke:async()=>{calls++;throw new Error('Offline');}});await worker.drain();await worker.stop();assert.equal(calls,1);assert.equal(db.matrixRevocations.status(owner,target).attempts,1);assert.equal(db.matrixRevocations.status(owner,target).nextAttemptAt,6000);db.close();db=openDatabase(file);
  worker=createMatrixRevocationWorker({store:db.matrixRevocations,now:()=>now,revoke:async(_job,recheck)=>{recheck();calls++;}});await worker.drain();assert.equal(calls,1);now=6000;await worker.drain();assert.equal(calls,2);assert.equal(db.matrixRevocations.status(owner,target).status,'confirmed');assert.equal(db.events(owner).filter(event=>event.event==='matrix.device.revoked.by_link').length,1);await worker.stop();
 }finally{db?.close();await rm(dir,{recursive:true,force:true});}
});
test('queue insertion failure rolls back Link revocation and local grant expiry',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'locat-cleanup-')),file=join(dir,'db.sqlite');let db;
 try{db=openDatabase(file);const {actor,target}=setup(db);const raw=new DatabaseSync(file);raw.exec("CREATE TRIGGER reject_cleanup BEFORE INSERT ON matrixRevocations BEGIN SELECT RAISE(ABORT,'synthetic queue failure');END;");raw.close();assert.throws(()=>db.link.revoke(owner,actor,target),/queue failure/);assert.equal(db.link.owned(owner,target).revokedAt,null);assert.ok(db.matrixBindings.current(owner,target).expiresAt>0);assert.equal(db.matrixRevocations.status(owner,target),null);
 }finally{db?.close();await rm(dir,{recursive:true,force:true});}
});
test('database leases exclude concurrent workers and reject completion from an expired lease',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'locat-cleanup-')),file=join(dir,'db.sqlite');let a,b;
 try{a=openDatabase(file);const {actor,target}=setup(a);a.link.revoke(owner,actor,target);b=openDatabase(file);const now=Date.now()+1,first=a.matrixRevocations.claim(now);assert.ok(first);assert.equal(b.matrixRevocations.claim(now),null);const replacement=b.matrixRevocations.claim(now+30000);assert.ok(replacement);assert.equal(a.matrixRevocations.finish(first,'confirmed',now+30001),false);assert.equal(b.matrixRevocations.finish(replacement,'confirmed',now+30001),true);assert.equal(a.matrixRevocations.status(owner,target).status,'confirmed');
 }finally{a?.close();b?.close();await rm(dir,{recursive:true,force:true});}
});
test('queued service deletion accepts only the exact derived identity and confirmed/idempotent responses',async()=>{
 const serverId='01234567-89ab-4def-8123-456789abcdef',identity=managedMatrixIdentity(serverId,owner,7,'matrix.test'),job={userId:owner,linkDeviceId:7,matrixUserId:identity.userId,matrixDeviceId:identity.deviceId};let status=200,errcode;const calls=[];
 const fetch=mock.method(globalThis,'fetch',async(url,options)=>{calls.push({url,options});return new Response(JSON.stringify(errcode?{errcode}:{}),{status});});
 try{const provisioner=createManagedMatrixProvisioner({provider:{origin:'https://matrix.test',serverName:'matrix.test'},serviceToken:'s'.repeat(64),serverId,store:{}});let checks=0;await provisioner.revokeQueuedDevice(job,()=>{checks++;});assert.equal(checks,2);assert.equal(calls[0].options.method,'DELETE');assert.equal(new URL(calls[0].url).searchParams.get('user_id'),identity.userId);
  await assert.rejects(provisioner.revokeQueuedDevice({...job,matrixUserId:'@foreign:matrix.test'},()=>{}),{manual:true});assert.equal(calls.length,1);status=404;errcode='M_NOT_FOUND';await provisioner.revokeQueuedDevice(job,()=>{});errcode='M_UNKNOWN';await assert.rejects(provisioner.revokeQueuedDevice(job,()=>{}),{status:502});
 }finally{fetch.mock.restore();}
});
test('worker marks unsupported targets for manual cleanup and stop waits for the outstanding deletion',async()=>{
 let claimed=false,finished=false,complete;const job={userId:owner,linkDeviceId:1,attempts:1};const statuses=[];const store={claim:()=>claimed?null:(claimed=true,job),revoked:()=>true,finish:(_job,status)=>statuses.push(status)};
 const worker=createMatrixRevocationWorker({store,revoke:()=>new Promise(resolve=>{complete=resolve;})});const draining=worker.drain();assert.equal(worker.drain(),draining);const stopping=worker.stop().then(()=>{finished=true;});await Promise.resolve();assert.equal(finished,false);complete();await stopping;assert.deepEqual(statuses,['confirmed']);
 claimed=false;const manual=createMatrixRevocationWorker({store,revoke:async()=>{throw Object.assign(new Error('Foreign identity'),{manual:true});}});await manual.drain();await manual.stop();assert.deepEqual(statuses,['confirmed','manual']);
});
