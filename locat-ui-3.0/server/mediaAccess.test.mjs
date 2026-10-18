import {test} from 'node:test';
import assert from 'node:assert/strict';
import {resolve,join,delimiter} from 'node:path';
import {createMediaAccess} from './mediaAccess.mjs';
const owner='a'.repeat(32),friend='b'.repeat(32),other='c'.repeat(32),root=resolve('synthetic-media');
test('media ownership is fail-closed and accepted friendship alone grants no access',()=>{
 let accepted=false,blocked=false;
 const store={userById:id=>[owner,friend,other].includes(id),acceptedContact:()=>accepted,blocked:()=>blocked};
 const env={LOCAT_MEDIA_AUTHORIZED_ROOTS:root};assert.equal(createMediaAccess(store,env).authorize(root,owner),false);
 const access=createMediaAccess(store,{...env,LOCAT_MEDIA_LIBRARY_ACCESS:JSON.stringify([{root,ownerId:owner,friendIds:[friend]}])});
 assert.equal(access.authorize(root,owner),true);assert.equal(access.authorize(root,friend),false);accepted=true;assert.equal(access.authorize(root,friend),true);assert.equal(access.authorize(root,other),false);
 blocked=true;assert.equal(access.authorize(root,friend),false);assert.equal(access.authorize(join(root,'other'),owner),false);assert.equal(access.authorize(root,undefined),false);
 const legacy=createMediaAccess(store,{...env,LOCAT_MEDIA_ACCESS_MODE:'authenticated'});assert.equal(legacy.authorize(root,other),true);assert.equal(legacy.authorize(root,'unknown'),false);
});
test('operator ownership policy rejects ambiguous, malformed and out-of-root grants',()=>{
 const store={userById:id=>id===owner},base={LOCAT_MEDIA_AUTHORIZED_ROOTS:root};
 for(const entry of [{root,ownerId:friend},{root:join(root,'unlisted'),ownerId:owner},{root,ownerId:owner,friendIds:[owner]},{root,ownerId:owner,friendIds:[friend,friend]},{root,ownerId:owner,friendIds:['not-account']},{root,ownerId:owner,unknown:true}])assert.throws(()=>createMediaAccess(store,{...base,LOCAT_MEDIA_LIBRARY_ACCESS:JSON.stringify([entry])}));
 assert.throws(()=>createMediaAccess(store,{...base,LOCAT_MEDIA_ACCESS_MODE:'public'}));assert.throws(()=>createMediaAccess(store,{...base,LOCAT_MEDIA_LIBRARY_ACCESS:'invalid'}));
 assert.throws(()=>createMediaAccess(store,{...base,LOCAT_MEDIA_ACCESS_MODE:'authenticated',LOCAT_MEDIA_LIBRARY_ACCESS:JSON.stringify([{root,ownerId:owner}])}));
 assert.throws(()=>createMediaAccess(store,{LOCAT_MEDIA_AUTHORIZED_ROOTS:[root,root].join(delimiter)}));
});
