import {test} from 'node:test';import assert from 'node:assert/strict';import {managedMatrixIdentity,managedMatrixNamespace} from '../shared/matrixIdentity.mjs';
test('managed Matrix identity reserves an exact instance/account namespace without changing existing Locat IDs',()=>{
 const server='e4aca6da-f98e-40cc-890e-cc577dc6c0bc',id='a'.repeat(32);const first=managedMatrixIdentity(server,id,1,'matrix.test:8448'),second=managedMatrixIdentity(server,id,2,'matrix.test:8448');assert.equal(first.userId,second.userId);assert.notEqual(first.deviceId,second.deviceId);assert.ok(first.userId.includes(id));const match=new RegExp(managedMatrixNamespace(server,'matrix.test:8448'));assert.ok(match.test(first.userId));assert.ok(!match.test(first.userId.replace('matrix.test','matrixXtest')));assert.ok(!match.test(first.userId.replace(id,'b'.repeat(31))));assert.ok(!match.test(first.userId+'evil'));assert.throws(()=>managedMatrixIdentity(server,id,0,'matrix.test'));assert.throws(()=>managedMatrixIdentity('invalid',id,1,'matrix.test'));assert.throws(()=>managedMatrixNamespace(server,'matrix.test/path'));
});

test('operator application-service validation rejects broader scopes, foreign identities and shared credentials',async()=>{
 const {createMatrixAppserviceRegistration,validateMatrixAppserviceRegistration}=await import('./matrixAppserviceConfig.mjs');
 const server='e4aca6da-f98e-40cc-890e-cc577dc6c0bc',name='matrix.test';
 const registration=createMatrixAppserviceRegistration(server,name);
 assert.deepEqual(validateMatrixAppserviceRegistration(registration,server,name),{serviceToken:registration.as_token});
 const variants=[{...registration,id:'foreign'},{...registration,url:'https://events.test'}, {...registration,hs_token:registration.as_token},{...registration,as_token:'short'}, {...registration,rate_limited:false},{...registration,receive_ephemeral:true},{...registration,sender_localpart:'other'}, {...registration,namespaces:{...registration.namespaces,users:[{exclusive:true,regex:'.*'}]}},{...registration,namespaces:{...registration.namespaces,rooms:[{exclusive:true,regex:'.*'}]}},{...registration,namespaces:{...registration.namespaces,users:[{exclusive:false,regex:registration.namespaces.users[0].regex}]}}];
 for(const candidate of variants)assert.throws(()=>validateMatrixAppserviceRegistration(candidate,server,name),/does not match/);
 assert.throws(()=>validateMatrixAppserviceRegistration(registration,server,'other.test'),/does not match/);
});
