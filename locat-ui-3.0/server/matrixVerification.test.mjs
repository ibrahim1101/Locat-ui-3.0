import {test} from 'node:test';import assert from 'node:assert/strict';import {verificationRoute,validateMatrixVerification} from './matrixVerification.mjs';
const binding={matrixDeviceId:'SENDER'},content={from_device:'SENDER',methods:['m.sas.v1'],timestamp:Date.now(),transaction_id:'synthetic-txn'},payload=body=>({messages:{'@peer:matrix.test':{PEER:body}}});
test('verification transport accepts only standard SAS routes and one explicit well-formed recipient',()=>{
 assert.equal(verificationRoute('/_matrix/client/v3/sendToDevice/m.key.verification.request/txn').event,'request');for(const event of ['m.room.encrypted','m.room_key','m.key.verification.other'])assert.equal(verificationRoute('/_matrix/client/v3/sendToDevice/'+event+'/txn'),null);
 assert.deepEqual(validateMatrixVerification('request',payload(content),binding),{userId:'@peer:matrix.test',deviceId:'PEER'});
 for(const invalid of [payload({...content,from_device:'FOREIGN'}),payload({...content,timestamp:1}),payload({...content,methods:['m.qr_code.show.v1']}),payload({...content,body:'not a chat channel'}),{messages:{'@peer:matrix.test':{'*':content}}},{messages:{'@peer:matrix.test':{PEER:content,OTHER:content}}}])assert.throws(()=>validateMatrixVerification('request',invalid,binding));
 assert.throws(()=>validateMatrixVerification('key',payload({transaction_id:'txn',key:'bad'}),binding));assert.throws(()=>validateMatrixVerification('mac',payload({transaction_id:'txn',keys:'bad',mac:{}}),binding));assert.deepEqual(validateMatrixVerification('done',payload({transaction_id:'txn'}),binding),{userId:'@peer:matrix.test',deviceId:'PEER'});
});

test('SAS acceptance supports the SDK field shape while rejecting legacy-only authentication',()=>{
 const accept={transaction_id:'txn',key_agreement_protocol:'curve25519-hkdf-sha256',hash:'sha256',message_authentication_code:'hkdf-hmac-sha256.v2',short_authentication_string:['decimal','emoji'],commitment:'A'.repeat(43)};
 assert.equal(validateMatrixVerification('accept',payload(accept),binding).deviceId,'PEER');assert.throws(()=>validateMatrixVerification('accept',payload({...accept,message_authentication_code:'hkdf-hmac-sha256'}),binding));
 const start={from_device:'SENDER',transaction_id:'txn',method:'m.sas.v1',key_agreement_protocols:['curve25519-hkdf-sha256'],hashes:['sha256'],message_authentication_codes:['hkdf-hmac-sha256','hkdf-hmac-sha256.v2','org.matrix.msc3783.hkdf-hmac-sha256'],short_authentication_string:['decimal','emoji']};
 assert.equal(validateMatrixVerification('start',payload(start),binding).deviceId,'PEER');assert.throws(()=>validateMatrixVerification('start',payload({...start,message_authentication_codes:['hkdf-hmac-sha256']}),binding));
});
