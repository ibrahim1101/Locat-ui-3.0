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

function ownerHandler(fetchImpl, json){
 return createRemoteStatusHandler({sessionUser:()=>({id:'owner'}),json,fetchImpl,env:{LOCAT_REMOTE_STATUS_URL:'http://192.168.1.11:8765/api/status',LOCAT_REMOTE_STATUS_OWNER_IDS:'owner'}});
}
test('owner receives only sanitized bounded status and upstream requests carry no user credentials',async()=>{
 let status,body;
 const handler=ownerHandler(async(url,options)=>{
  assert.equal(url,'http://192.168.1.11:8765/api/status');assert.equal(options.redirect,'error');assert.deepEqual(options.headers,{Accept:'application/json'});assert.ok(options.signal instanceof AbortSignal);
  return new Response(JSON.stringify({timestamp:new Date().toISOString(),checks:{wireguard_listening:true},secret:'do not expose'}));
 },(_res,s,b)=>{status=s;body=b;});
 await handler({method:'GET',headers:{cookie:'private-session'}},{},new URL('https://locat.invalid/api/remote/infrastructure'));
 assert.equal(status,200);assert.equal(body.observedHealthy,true);assert.equal(JSON.stringify(body).includes('do not expose'),false);
});
test('chunked oversized status is cancelled before the rest of the stream is read',async()=>{
 let cancelled=false,reads=0,status,body;
 const stream=new ReadableStream({pull(controller){reads++;controller.enqueue(new Uint8Array(32768));},cancel(){cancelled=true;}});
 const handler=ownerHandler(async()=>new Response(stream),(_res,s,b)=>{status=s;body=b;});
 await handler({method:'GET'},{},new URL('https://locat.invalid/api/remote/infrastructure'));
 assert.equal(status,503);assert.equal(cancelled,true);assert.ok(reads<=4);assert.deepEqual(body,{error:'Remote infrastructure status unavailable'});
});
test('upstream failure, malformed JSON and byte-heavy UTF8 fail without leaking diagnostics',async()=>{
 for(const response of [new Response('private upstream details',{status:500}),new Response('not JSON'),new Response('é'.repeat(40000))]){
  let status,body;const handler=ownerHandler(async()=>response,(_res,s,b)=>{status=s;body=b;});
  await handler({method:'GET'},{},new URL('https://locat.invalid/api/remote/infrastructure'));
  assert.equal(status,503);assert.deepEqual(body,{error:'Remote infrastructure status unavailable'});
 }
});
