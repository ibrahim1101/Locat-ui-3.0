import test from 'node:test';
import assert from 'node:assert/strict';
import { remoteStatusConfig, sanitizeRemoteStatus, createRemoteStatusHandler } from './remoteInfrastructure.mjs';

test('opt-in requires URL and explicit owner IDs', () => {
  assert.equal(remoteStatusConfig({}).enabled, false);
  assert.equal(remoteStatusConfig({ LOCAT_REMOTE_STATUS_URL: 'http://192.168.1.11:8765/api/status' }).enabled, false);
  assert.throws(() => remoteStatusConfig({ LOCAT_REMOTE_STATUS_URL: 'http://example.com/api/status', LOCAT_REMOTE_STATUS_OWNER_IDS: 'a' }));
  assert.throws(() => remoteStatusConfig({ LOCAT_REMOTE_STATUS_URL: 'http://192.168.1.11:8765/other', LOCAT_REMOTE_STATUS_OWNER_IDS: 'a' }));
});
test('sanitization strips addresses, peer keys, and arbitrary fields', () => {
  const result = sanitizeRemoteStatus({ timestamp: new Date().toISOString(), checks: { wireguard_listening: true, private_key: true }, dns_addresses: ['secret'], peer_last_handshakes: { secret: 12 }, disk_used_percent: 10.6 });
  assert.deepEqual(result.checks, { wireguard_listening: true });
  assert.equal(JSON.stringify(result).includes('secret'), false);
  assert.equal(result.status, 'current');
});
test('unauthorized requests never reach Pi', async () => {
  let called = false; let status;
  const handler = createRemoteStatusHandler({
    sessionUser: () => ({ id: 'other' }), json: (_r,s) => { status=s; },
    env: { LOCAT_REMOTE_STATUS_URL: 'http://192.168.1.11:8765/api/status', LOCAT_REMOTE_STATUS_OWNER_IDS: 'owner' },
    fetchImpl: async () => { called=true; }
  });
  await handler({ method:'GET' }, {}, new URL('http://localhost/api/remote/infrastructure'));
  assert.equal(status, 404); assert.equal(called, false);
});
