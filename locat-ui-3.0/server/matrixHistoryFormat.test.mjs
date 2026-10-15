import {test} from 'node:test';import assert from 'node:assert/strict';import {inspectHistoryFile,inspectHistoryKeys,MAX_HISTORY_FILE} from '../shared/matrixHistoryFormat.mjs';
const armor=(rounds=500000,version=1)=>{const bytes=Buffer.alloc(80);bytes[0]=version;bytes.writeUInt32BE(rounds,33);return '-----BEGIN MEGOLM SESSION DATA-----\n'+bytes.toString('base64').replace(/=+$/,'')+'\n-----END MEGOLM SESSION DATA-----';};
test('Matrix history preflight bounds derivation work and rejects malformed/unsupported armor before crypto',()=>{
 assert.deepEqual(inspectHistoryFile(armor()),{rounds:500000});assert.equal(inspectHistoryFile(armor().replaceAll('\n','\r\n')).rounds,500000);
 for(const bad of [armor(0),armor(9999),armor(2000001),armor(0xffffffff),armor(500000,2),'plaintext',armor()+'suffix',armor().replace(/\n./,'\n%'),'x'.repeat(MAX_HISTORY_FILE+1)])assert.throws(()=>inspectHistoryFile(bad));
});
test('history JSON preflight bounds entry count and rejects unsupported or missing key data',()=>{
 const entry={algorithm:'m.megolm.v1.aes-sha2',room_id:'!synthetic:matrix.test',session_id:'synthetic-session',sender_key:'synthetic-sender',session_key:'synthetic-key'};
 assert.deepEqual(inspectHistoryKeys(JSON.stringify([entry])),{entries:1});
 for(const bad of ['null','{}','[','[]',JSON.stringify([{...entry,algorithm:'unknown'}]),JSON.stringify([{...entry,session_key:''}]),JSON.stringify(Array(10001).fill(entry))])assert.throws(()=>inspectHistoryKeys(bad));
});
