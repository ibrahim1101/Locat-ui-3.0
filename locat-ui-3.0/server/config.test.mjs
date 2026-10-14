import { test } from 'node:test';
import assert from 'node:assert/strict';
import { serverConfig, requestOrigin } from './config.mjs';
test('LAN serving fails closed without TLS and an explicit public origin', () => {
  assert.throws(() => serverConfig({ LOCAT_HOST: '0.0.0.0' }), /TLS/);
  assert.throws(() => serverConfig({ LOCAT_TLS_KEY: 'key' }), /both/);
  assert.throws(() => serverConfig({ LOCAT_PUBLIC_ORIGIN: 'https://host' }), /scheme/);
  assert.throws(() => serverConfig({ LOCAT_PUBLIC_ORIGIN: 'http://host/path' }), /origin only/);
  assert.throws(() => serverConfig({ LOCAT_PORT: 'NaN' }), /PORT/);
  const config = serverConfig({ LOCAT_HOST: '0.0.0.0', LOCAT_TLS_KEY: 'key', LOCAT_TLS_CERT: 'cert', LOCAT_PUBLIC_ORIGIN: 'https://locat.test:8787' });
  assert.equal(requestOrigin({ headers: { host: 'locat.test:8787' } }, config), 'https://locat.test:8787');
  assert.equal(requestOrigin({ headers: { host: 'attacker.test:8787' } }, config), null);
});
test('development supports loopback Vite proxy hosts but rejects DNS rebinding hosts', () => {
  const config = serverConfig({});
  assert.equal(requestOrigin({ headers: { host: '127.0.0.1:5173' } }, config), 'http://127.0.0.1:5173');
  assert.equal(requestOrigin({ headers: { host: 'localhost:8787' } }, config), 'http://localhost:8787');
  assert.equal(requestOrigin({ headers: { host: 'rebind.attacker.test' } }, config), null);
  assert.equal(requestOrigin({ headers: { host: '127.0.0.1@attacker.test' } }, config), null);
});
