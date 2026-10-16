import {test} from 'node:test';import assert from 'node:assert/strict';
import {encryptedToDeviceRoute,validateEncryptedToDevice,validateWithheldToDevice} from './matrixEncryptedToDevice.mjs';
test('Olm relay accepts exact active pinned recipients and rejects plaintext, wildcards and oversized ciphertext',()=>{
 const binding={publicKeys:JSON.stringify({curve25519:'YWJj'})},resolve=(user,device)=>user==='@bob:test'&&device==='BOB'?{curve25519:'ZGVm'}:null;
 const envelope={algorithm:'m.olm.v1.curve25519-aes-sha2',sender_key:'YWJj',ciphertext:{ZGVm:{type:0,body:'Z2hp'}}};
 const payload=value=>({messages:{'@bob:test':{BOB:value}}});
 assert.equal(encryptedToDeviceRoute('/_matrix/client/v3/sendToDevice/m.room.encrypted/m123.1','PUT'),true);
 assert.equal(encryptedToDeviceRoute('/_matrix/client/v3/sendToDevice/m.room_key/txn','PUT'),false);
 assert.deepEqual(validateEncryptedToDevice(payload(envelope),binding,resolve),[{userId:'@bob:test',deviceId:'BOB',curve25519:'ZGVm'}]);
 for(const value of [{...envelope,body:'secret'},{...envelope,sender_key:'wrong'},{...envelope,algorithm:'m.room_key'},{...envelope,ciphertext:{OTHER:{type:0,body:'Z2hp'}}},{...envelope,ciphertext:{ZGVm:{type:2,body:'Z2hp'}}},{...envelope,ciphertext:{ZGVm:{type:0,body:'x'.repeat(65537)}}}])assert.throws(()=>validateEncryptedToDevice(payload(value),binding,resolve),{status:400});
 assert.throws(()=>validateEncryptedToDevice({messages:{'@bob:test':{'*':envelope}}},binding,resolve),{status:400});
 assert.throws(()=>validateEncryptedToDevice(payload(envelope),binding,()=>null),{status:403});
 assert.throws(()=>validateEncryptedToDevice({messages:{}},binding,resolve),{status:400});
});

test('withheld notices are bounded protocol metadata with fixed reasons, never room keys',()=>{
 const binding={matrixDeviceId:'ALICE',publicKeys:JSON.stringify({curve25519:'YWJj'})};const resolve=()=>({curve25519:'ZGVm'}),room='!'+'a'.repeat(43);
 const notice={algorithm:'m.megolm.v1.aes-sha2',sender_key:'YWJj',from_device:'ALICE',code:'m.unverified',room_id:room,session_id:'Z2hp',reason:'caller text','org.matrix.msgid':'message-1'};
 const payload=content=>({messages:{'@bob:test':{BOB:content}}});const data=payload({...notice});assert.equal(validateWithheldToDevice(data,binding,resolve,id=>id===room).length,1);assert.equal(data.messages['@bob:test'].BOB.reason,'Room key withheld: m.unverified');
 for(const content of [{...notice,session_key:'private'},{...notice,from_device:'OTHER'},{...notice,code:'custom'},{...notice,session_id:{body:'plaintext'}}])assert.throws(()=>validateWithheldToDevice(payload(content),binding,resolve,()=>true),{status:400});
 assert.throws(()=>validateWithheldToDevice(payload(notice),binding,resolve,()=>false),{status:403});assert.throws(()=>validateWithheldToDevice(payload(notice),binding,()=>null,()=>true),{status:403});
});
