import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRateLimiter } from './rateLimit.mjs';
test('authentication limiter scopes buckets and permits attempts after window expiry', () => {
  let time = 0;
  const limit = createRateLimiter(2, 10000, () => time);
  assert.equal(limit('one'), 0); assert.equal(limit('one'), 0);
  assert.equal(limit('one'), 10); assert.equal(limit('two'), 0);
  time = 10001; assert.equal(limit('one'), 0);
});
