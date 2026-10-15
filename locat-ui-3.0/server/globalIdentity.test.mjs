import {test} from 'node:test';
import assert from 'node:assert/strict';
import {accountIdentity,localDiscoveryQuery} from './globalIdentity.mjs';
test('qualified addresses preserve LC/account IDs, avoid server collisions and do no remote discovery',()=>{
 const user={id:'a'.repeat(32),lcCode:'1234'};
 const a=accountIdentity(user,'https://a.test','server-a'),b=accountIdentity(user,'https://b.test','server-b');
 assert.equal(a.address,'LC-1234@a.test');assert.notEqual(a.accountUri,b.accountUri);assert.equal(user.lcCode,'1234');
 assert.equal(accountIdentity(user,undefined,'server-a'),null);
 assert.equal(localDiscoveryQuery(' LC-1234@A.TEST ','https://a.test'),'lc-1234');
 assert.equal(localDiscoveryQuery('alice','https://a.test'),'alice');
 assert.throws(()=>localDiscoveryQuery('alice@b.test','https://a.test'),{status:501});
 assert.throws(()=>localDiscoveryQuery('alice@a.test@b.test','https://a.test'),{status:400});
 assert.throws(()=>localDiscoveryQuery('a'.repeat(351),'https://a.test'),{status:400});
});
