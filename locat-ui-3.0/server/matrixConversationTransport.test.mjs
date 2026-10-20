import {test} from 'node:test';
import assert from 'node:assert/strict';
import {conversationRoute,validateConversationRequest,validConversationRoomId} from './matrixConversationTransport.mjs';
test('conversation transport accepts canonical IDs and encrypted operations only',()=>{
 for(const room of ['!legacy:matrix.test','!'+'a'.repeat(43)]){
  assert.equal(validConversationRoomId(room),true);const prefix='/_matrix/client/v3/rooms/'+encodeURIComponent(room);
  assert.deepEqual(conversationRoute(prefix+'/receipt/m.read/%24event.1','POST'),{roomId:room,action:'receipt',eventId:'$event.1'});
  assert.deepEqual(conversationRoute(prefix+'/redact/%24event.1/txn_01','PUT'),{roomId:room,action:'redact',eventId:'$event.1'});
  assert.equal(conversationRoute(prefix+'/redact/%24event.1/txn_01','POST'),null);
  assert.deepEqual(conversationRoute(prefix+'/typing/%40alice%3Amatrix.test','PUT'),{roomId:room,action:'typing',userId:'@alice:matrix.test'});
  assert.equal(conversationRoute(prefix+'/typing/%40alice%3Amatrix.test','POST'),null);
  assert.equal(conversationRoute(prefix+'/receipt/m.read/%24event.1','PUT'),null);
  assert.deepEqual(conversationRoute(prefix+'/send/m.room.encrypted/txn_01','PUT'),{roomId:room,action:'send/m.room.encrypted/txn_01'});
  assert.equal(conversationRoute(prefix+'/send/m.room.message/txn','PUT'),null);assert.equal(conversationRoute(prefix+'/state/m.room.encryption','PUT'),null);assert.equal(conversationRoute(prefix+'/invite','POST'),null);assert.equal(conversationRoute(prefix+'/messages','POST'),null);
 }
 for(const value of ['!bad','!room/escape:host','#alias:host','!x:host?query'])assert.equal(conversationRoute('/_matrix/client/v3/rooms/'+encodeURIComponent(value)+'/messages','GET')?.roomId===value,value==='!x:host?query');
 assert.equal(conversationRoute('/_matrix/client/v3/rooms/%21legacy%3Amatrix.test/messages','GET'),null);
 const route={action:'send/m.room.encrypted/txn'};const encrypted={algorithm:'m.megolm.v1.aes-sha2',sender_key:'YWJj',session_id:'ZGVm',device_id:'DEVICE',ciphertext:'Z2hp'};
 validateConversationRequest({action:'redact'},{},new URLSearchParams());assert.throws(()=>validateConversationRequest({action:'redact'},{reason:'plaintext'},new URLSearchParams()),{status:400});assert.throws(()=>validateConversationRequest({action:'redact'},{},new URLSearchParams('access_token=x')),{status:400});
 validateConversationRequest({action:'receipt'},{},new URLSearchParams());validateConversationRequest({action:'receipt'},{thread_id:'main'},new URLSearchParams());assert.throws(()=>validateConversationRequest({action:'receipt'},{thread_id:'javascript:alert(1)'},new URLSearchParams()),{status:400});assert.throws(()=>validateConversationRequest({action:'receipt'},{},new URLSearchParams('access_token=x')),{status:400});
 validateConversationRequest(route,encrypted,new URLSearchParams());
 validateConversationRequest({action:'typing'},{typing:true,timeout:20000},new URLSearchParams());validateConversationRequest({action:'typing'},{typing:false},new URLSearchParams());
 for(const [input,query] of [[{typing:true,timeout:999},new URLSearchParams()],[{typing:true,timeout:30001},new URLSearchParams()],[{typing:true,timeout:20000,body:'draft'},new URLSearchParams()],[{typing:false,timeout:0},new URLSearchParams()],[{typing:true,timeout:20000},new URLSearchParams('access_token=x')]])assert.throws(()=>validateConversationRequest({action:'typing'},input,query),{status:400});
 for(const input of [{...encrypted,body:'plaintext'},{...encrypted,algorithm:'m.room.message'},{...encrypted,ciphertext:'x'.repeat(65537)},{...encrypted,ciphertext:'<script>'},{...encrypted,session_id:''}])assert.throws(()=>validateConversationRequest(route,input,new URLSearchParams()),{status:400});
 assert.throws(()=>validateConversationRequest({action:'join'},{third_party_signed:{}},new URLSearchParams()),{status:400});
 const query=new URLSearchParams('dir=b&limit=25&filter=arbitrary');validateConversationRequest({action:'messages'},undefined,query);assert.deepEqual(JSON.parse(query.get('filter')),{types:['m.room.encrypted']});
 for(const value of ['dir=b&limit=51','dir=b&limit=1&limit=2','dir=b&access_token=bad','dir=wrong','dir=b&from='+('x'.repeat(2049))])assert.throws(()=>validateConversationRequest({action:'messages'},undefined,new URLSearchParams(value)),{status:400});
});
