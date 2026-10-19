import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createLayeredRateLimiter,createRateLimiter } from './rateLimit.mjs';
test('authentication limiter scopes buckets and permits attempts after window expiry', () => {
  let time = 0;
  const limit = createRateLimiter(2, 10000, () => time);
  assert.equal(limit('one'), 0); assert.equal(limit('one'), 0);
  assert.equal(limit('one'), 10); assert.equal(limit('two'), 0);
  time = 10001; assert.equal(limit('one'), 0);
});
test('layered authentication limits distinguish configured clients while bounding the trusted proxy peer',()=>{
 let time=0;const limit=createLayeredRateLimiter({peerMaximum:4,clientMaximum:2,windowMs:60000,now:()=>time,clientAddress:req=>req.client});
 const request=(client)=>({socket:{remoteAddress:'127.0.0.1'},client});
 assert.equal(limit(request('192.0.2.1')),0);assert.equal(limit(request('192.0.2.1')),0);assert.equal(limit(request('192.0.2.1')),60);
 assert.equal(limit(request('192.0.2.2')),0);assert.equal(limit(request('192.0.2.2')),60);
 time=60001;assert.equal(limit(request('192.0.2.1')),0);
});
test('unattributed proxy requests conservatively share the proxy client bucket',()=>{
 const limit=createLayeredRateLimiter({peerMaximum:100,clientMaximum:1,clientAddress:()=>undefined});const request={socket:{remoteAddress:'127.0.0.1'}};
 assert.equal(limit(request),0);assert.equal(limit(request),60);
});
