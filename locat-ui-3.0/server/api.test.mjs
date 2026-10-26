import WebSocket from 'ws';
import { once } from "node:events";
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer } from "node:net";
import {request as httpRequest} from 'node:http';
import {randomBytes,createHash} from 'node:crypto';
import {openDatabase} from './database.mjs';

async function freePort() {
  const server = createServer();
  await new Promise((resolve, reject) => server.once("error", reject).listen(0, "127.0.0.1", resolve));
  const port = server.address().port;
  await new Promise(resolve => server.close(resolve));
  return port;
}

test("development API: auth, isolation, discovery and messaging security gate", async () => {
  const dir = await mkdtemp(join(tmpdir(), "locat-api-test-"));
  const port = await freePort();
  const origin = "http://127.0.0.1:" + port;
  const child = spawn(process.execPath, ["server/index.mjs"], {
    cwd: process.cwd(),
    env: { ...process.env, LOCAT_HOST: "127.0.0.1", LOCAT_PORT: String(port), LOCAT_PUBLIC_ORIGIN:origin, LOCAT_DATABASE_FILE: join(dir, "auth.sqlite") },
    stdio: "ignore",
  });
  async function request(path, method = "GET", data, cookie, extraHeaders = {}) {
    const headers = { Origin: origin, ...extraHeaders };
    if (data !== undefined) headers["Content-Type"] = "application/json";
    if (cookie) headers.Cookie = cookie;
    return fetch(origin + path, { method, headers, body: data === undefined ? undefined : JSON.stringify(data) });
  }
  try {
    let ready = false;
    for (let i = 0; i < 60; i++) {
      if (child.exitCode !== null) throw new Error("API exited during startup");
      try { const res = await request("/api/ready"); if (res.ok) { ready = true; break; } } catch {}
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    assert.equal(ready, true, "API did not become ready");
    const discoveryResponse=await request('/.well-known/locat');
    assert.equal(discoveryResponse.headers.get('access-control-allow-origin'),'*');
    const discovery=await discoveryResponse.json();assert.equal(discovery.origin,origin);assert.match(discovery.serverId,/^[a-f0-9-]{36}$/);
    assert.equal(discovery.capabilities.privateMessaging,false);assert.equal(discovery.capabilities.federation,false);
    const password = "long-test-password-123";
    assert.equal((await request("/api/auth/register", "POST", { username: "alice", displayName: "Alice", password })).status, 201);
    assert.equal((await request("/api/auth/register", "POST", { username: "bob", displayName: "Bob", password })).status, 201);
    assert.equal((await request("/api/auth/register", "POST", null)).status, 400);
    assert.equal((await request("/api/messages")).status, 401);
    const login = await request("/api/auth/login", "POST", { username: "alice", password });
    assert.equal(login.status, 200);
    const aliceCookie = login.headers.get("set-cookie").split(";")[0];
    const socket=new WebSocket(origin.replace('http:','ws:')+'/api/connect/socket',{headers:{Origin:origin,Cookie:aliceCookie}});
    try{
      assert.equal(JSON.parse((await once(socket,'message'))[0]).type,'ready');
      const pong=once(socket,'message');socket.send(JSON.stringify({type:'ping',id:'api-check'}));
      assert.deepEqual(JSON.parse((await pong)[0]),{type:'pong',id:'api-check'});
    }finally{socket.terminate();}
    const bobLogin = await request("/api/auth/login", "POST", { username: "bob", password });
    const bobCookie = bobLogin.headers.get("set-cookie").split(";")[0];
    const bob = (await (await request("/api/users/search?q=bob", "GET", undefined, aliceCookie)).json()).users[0];
    assert.ok(bob.id);
    for(const path of ['/api/auth/me','/api/contacts','/api/users/search?q=bob','/api/preferences','/api/profile/privacy','/api/auth/sessions','/api/private/vault','/api/private/secrets','/api/security/events'])assert.equal((await request(path,'GET',undefined,aliceCookie,{'X-Locat-Account':bob.id})).status,403,'Stale account guard: '+path);
    assert.equal((await request('/api/contacts','GET',undefined,bobCookie,{'X-Locat-Account':bob.id})).status,200,'Matching expected account remains authorized');
    assert.equal(bob.globalIdentity.address,bob.lcCode+'@127.0.0.1:'+port);
    assert.equal((await (await request('/api/users/search?q='+encodeURIComponent(bob.globalIdentity.address),'GET',undefined,aliceCookie)).json()).users[0].id,bob.id);
    assert.equal((await request('/api/users/search?q=LC-1234@elsewhere.test','GET',undefined,aliceCookie)).status,501);
    for (const path of ['/api/media','/api/media/refresh','/api/media/shares','/api/media/stream/'+'a'.repeat(64),'/api/sentinel/incidents','/api/sentinel/tokens']) {
      assert.equal((await request(path, 'GET', undefined, aliceCookie)).status, 404, 'retired module route must not be served: '+path);
    }
    assert.match(bob.lcCode, /^LC-[1-9][0-9]{3}$/);
    const codeLookup = await (await request("/api/users/search?q=" + bob.lcCode, "GET", undefined, aliceCookie)).json();
    assert.equal(codeLookup.users[0].id, bob.id);
    assert.equal((await request("/api/diagnostics")).status, 401);
    const diagnostics = await (await request("/api/diagnostics", "GET", undefined, aliceCookie)).json();
    assert.equal(diagnostics.database.schemaVersion, 24); assert.equal(diagnostics.database.accessible, true);
    assert.equal(diagnostics.privateMessaging, "not-enabled"); assert.ok(!JSON.stringify(diagnostics).includes(dir));
    assert.equal((await request('/api/calendar/events?from=1&to=2')).status,401);
    const calendarFrom=Date.now(),calendarTo=calendarFrom+7*24*60*60_000;
    const calendarPath=`/api/calendar/events?from=${calendarFrom}&to=${calendarTo}`;
    assert.equal((await request(calendarPath,'GET',undefined,aliceCookie,{'X-Locat-Account':bob.id})).status,403);
    assert.equal((await request(`/api/calendar/events?from=1&to=${Date.now()+90*24*60*60_000}`,'GET',undefined,aliceCookie)).status,400);
    const calendarEvent={title:'Release planning',notes:'Account-only detail',startsAt:calendarFrom+60_000,endsAt:calendarFrom+3_660_000,reminderAt:calendarFrom};
    assert.equal((await request('/api/calendar/events','POST',calendarEvent,aliceCookie,{Origin:'https://evil.invalid'})).status,403);
    assert.equal((await request('/api/calendar/events','POST',{...calendarEvent,plaintext:'secret'},aliceCookie)).status,400);
    const calendarCreated=await request('/api/calendar/events','POST',calendarEvent,aliceCookie);assert.equal(calendarCreated.status,201);const {event:calendarSaved}=await calendarCreated.json();assert.equal(calendarSaved.title,calendarEvent.title);assert.ok(!JSON.stringify(calendarSaved).includes('plaintext'));
    assert.equal((await (await request(calendarPath,'GET',undefined,bobCookie)).json()).events.length,0);
    const calendarEvents=(await (await request(calendarPath,'GET',undefined,aliceCookie)).json()).events;assert.equal(calendarEvents.length,1);assert.equal(calendarEvents[0].id,calendarSaved.id);
    const calendarUpdate={id:calendarSaved.id,expectedUpdatedAt:calendarSaved.updatedAt,title:'Release plan',notes:'Updated',startsAt:calendarSaved.startsAt,endsAt:calendarSaved.endsAt,reminderAt:null};
    assert.equal((await request('/api/calendar/events','PATCH',calendarUpdate,bobCookie)).status,409);
    const calendarUpdated=await request('/api/calendar/events','PATCH',calendarUpdate,aliceCookie);assert.equal(calendarUpdated.status,200);const {event:calendarEdited}=await calendarUpdated.json();assert.equal(calendarEdited.title,'Release plan');
    assert.equal((await request('/api/calendar/events','PATCH',calendarUpdate,aliceCookie)).status,409);
    assert.equal((await request('/api/calendar/events','DELETE',{id:calendarSaved.id,expectedUpdatedAt:calendarSaved.updatedAt},aliceCookie)).status,409);
    assert.equal((await request('/api/calendar/events','DELETE',{id:calendarSaved.id,expectedUpdatedAt:calendarEdited.updatedAt},aliceCookie)).status,200);
    assert.equal((await (await request(calendarPath,'GET',undefined,aliceCookie)).json()).events.length,0);
    const repeatingCalendar=await request('/api/calendar/events','POST',{...calendarEvent,title:'Daily check-in',repeatMs:86_400_000},aliceCookie);assert.equal(repeatingCalendar.status,201);const {event:calendarSeries}=await repeatingCalendar.json();assert.equal(calendarSeries.repeatMs,86_400_000);
    const calendarOccurrences=(await (await request(calendarPath,'GET',undefined,aliceCookie)).json()).events;assert.equal(calendarOccurrences.length,7);assert.equal(new Set(calendarOccurrences.map(event=>event.id)).size,1);
    const legacyCalendarUpdate=await request('/api/calendar/events','PATCH',{id:calendarSeries.id,expectedUpdatedAt:calendarSeries.updatedAt,title:'Daily check-in',notes:'Adjusted',startsAt:calendarSeries.startsAt,endsAt:calendarSeries.endsAt,reminderAt:calendarSeries.reminderAt},aliceCookie);assert.equal(legacyCalendarUpdate.status,200);const {event:legacyUpdated}=await legacyCalendarUpdate.json();assert.equal(legacyUpdated.repeatMs,86_400_000);
    assert.equal((await request('/api/calendar/events','POST',{...calendarEvent,title:'Unsupported cadence',repeatMs:90_000},aliceCookie)).status,400);
    assert.equal((await request('/api/calendar/events','DELETE',{id:calendarSeries.id,expectedUpdatedAt:legacyUpdated.updatedAt},aliceCookie)).status,200);
    const encryptedShare={iv:Buffer.alloc(12,7).toString('base64'),ciphertext:Buffer.alloc(32,9).toString('base64'),ttlHours:24};
    assert.equal((await request('/api/share','POST',encryptedShare)).status,401);
    assert.equal((await request('/api/share','POST',{...encryptedShare,plaintext:'secret'},aliceCookie)).status,400);
    assert.equal((await request('/api/share','POST',encryptedShare,aliceCookie,{Origin:'https://evil.invalid'})).status,403);
    const shareCreated=await request('/api/share','POST',encryptedShare,aliceCookie);assert.equal(shareCreated.status,201);const {share:storedShare}=await shareCreated.json();assert.ok(storedShare.id);assert.equal(storedShare.ciphertext,encryptedShare.ciphertext);assert.ok(!('userId' in storedShare));
    assert.equal((await request('/api/share','GET',undefined,bobCookie)).status,200);assert.equal((await (await request('/api/share','GET',undefined,aliceCookie)).json()).shares[0].id,storedShare.id);
    const publicShare=await request('/api/share/'+storedShare.id);assert.equal(publicShare.status,200);assert.equal((await publicShare.json()).share.ciphertext,encryptedShare.ciphertext);
    assert.equal((await request('/api/share/'+storedShare.id,'DELETE',{expected:true},bobCookie)).status,404);
    assert.equal((await request('/api/share/'+storedShare.id,'DELETE',{expected:true},aliceCookie)).status,200);
    assert.equal((await request('/api/share/'+storedShare.id)).status,404);
    assert.equal((await request('/api/workspaces')).status,401);
    assert.equal((await request('/api/workspaces','POST',{name:'Core team'},aliceCookie,{Origin:'https://evil.invalid'})).status,403);
    const workspaceCreated=await request('/api/workspaces','POST',{name:'Core team'},aliceCookie);assert.equal(workspaceCreated.status,201);const {workspace}=await workspaceCreated.json();
    assert.equal((await request('/api/workspaces/'+workspace.id+'/items','GET',undefined,bobCookie)).status,404);
    assert.equal((await request('/api/workspaces/'+workspace.id+'/invite','POST',{userId:bob.id},aliceCookie)).status,201);
    let bobInvites=(await (await request('/api/workspaces/invitations','GET',undefined,bobCookie)).json()).invitations;assert.equal(bobInvites.length,1);assert.equal(bobInvites[0].name,'Core team');
    assert.equal((await request(`/api/workspaces/${workspace.id}/invitations`,'POST',{accept:true},bobCookie)).status,200);
    const roleChange=await request(`/api/workspaces/${workspace.id}/members/${bob.id}`,'PATCH',{role:'admin'},aliceCookie);assert.equal(roleChange.status,200,await roleChange.text());
    const memberList=(await (await request(`/api/workspaces/${workspace.id}/members`,'GET',undefined,bobCookie)).json()).members;assert.equal(memberList.find(row=>row.userId===bob.id).role,'admin');
    const workspaceItem=await request(`/api/workspaces/${workspace.id}/items`,'POST',{kind:'task',title:'Review release',content:'Check migration',state:'open'},aliceCookie);assert.equal(workspaceItem.status,201);const {item}=await workspaceItem.json();
    assert.equal((await request(`/api/workspaces/${workspace.id}/items`,'GET',undefined,bobCookie)).status,200);
    assert.equal((await request(`/api/workspaces/${workspace.id}/items/${item.id}`,'PATCH',{expectedRevision:item.revision,title:item.title,content:item.content,state:'done'},bobCookie)).status,200);
    assert.equal((await request(`/api/workspaces/${workspace.id}/items/${item.id}`,'PATCH',{expectedRevision:item.revision,title:item.title,content:item.content,state:'done'},aliceCookie)).status,409);
    assert.equal((await request(`/api/workspaces/${workspace.id}/owner`,'PATCH',{userId:bob.id},bobCookie)).status,403);
    assert.equal((await request(`/api/workspaces/${workspace.id}/owner`,'PATCH',{userId:bob.id},aliceCookie)).status,200);
    const transferredMembers=(await (await request(`/api/workspaces/${workspace.id}/members`,'GET',undefined,bobCookie)).json()).members;assert.equal(transferredMembers.find(row=>row.userId===bob.id).role,'owner');assert.equal(transferredMembers.find(row=>row.username==='alice').role,'admin');
    assert.equal((await request(`/api/workspaces/${workspace.id}`,'DELETE',{expected:true},aliceCookie)).status,403);
    assert.equal((await request(`/api/workspaces/${workspace.id}`,'DELETE',{expected:true},bobCookie)).status,200);
    assert.equal((await request(`/api/workspaces/${workspace.id}/items`,'GET',undefined,bobCookie)).status,404);
    assert.equal((await request('/api/automate/rules','GET',undefined,aliceCookie)).status,200);
    const scheduledAt=Date.now()+5*60_000,scheduled=await request('/api/automate/rules','POST',{title:'Take a break',details:'Stretch',runAt:scheduledAt,repeatMs:86_400_000},aliceCookie);assert.equal(scheduled.status,201);const {rule}=await scheduled.json();assert.equal(rule.repeatMs,86_400_000);
    assert.equal((await request('/api/automate/rules','POST',{title:'Unsupported cadence',details:'',runAt:Date.now()+5*60_000,repeatMs:90_000},aliceCookie)).status,400);
    assert.equal((await request('/api/automate/rules','POST',{title:'Too soon',details:'',runAt:Date.now()+10_000},aliceCookie)).status,400);
    const changed=await request('/api/automate/rules/'+rule.id,'PATCH',{expectedRevision:rule.revision,title:'Water break',details:'Drink water',runAt:scheduledAt,enabled:false,repeatMs:604_800_000},aliceCookie);assert.equal(changed.status,200);assert.equal((await changed.json()).rule.repeatMs,604_800_000);
    assert.equal((await request('/api/automate/rules/'+rule.id,'DELETE',{expectedRevision:rule.revision},aliceCookie)).status,409);
    const changedRule=(await (await request('/api/automate/rules','GET',undefined,aliceCookie)).json()).rules[0];assert.equal(changedRule.enabled,false);
    assert.equal((await request('/api/automate/dispatch','POST',{},aliceCookie,{Origin:'https://evil.invalid'})).status,403);
    assert.equal((await request('/api/automate/rules/'+rule.id,'DELETE',{expectedRevision:changedRule.revision},aliceCookie)).status,200);
    const privateConfig={v:1,storeId:'11111111-1111-4111-8111-111111111111',salt:Buffer.alloc(16).toString('base64'),iterations:600000,wrappedKey:{v:1,iv:Buffer.alloc(12).toString('base64'),data:Buffer.alloc(48).toString('base64')}};
    const privateEnvelope=privateConfig.wrappedKey;const privateId='22222222-2222-4222-8222-222222222222';
    assert.equal((await request('/api/private/vault')).status,401);
    assert.equal((await request('/api/private/vault/initialize','POST',{config:privateConfig},aliceCookie,{Origin:'https://evil.invalid'})).status,403);
    assert.equal((await request('/api/private/vault/initialize','POST',{config:privateConfig},aliceCookie)).status,201);
    assert.equal((await request('/api/private/vault/initialize','POST',{config:privateConfig},aliceCookie)).status,409);
    const privatePut={id:privateId,expectedRevision:0,envelope:privateEnvelope};
    assert.equal((await request('/api/private/vault/put','POST',{...privatePut,plaintext:'secret'},aliceCookie)).status,400);
    assert.equal((await request('/api/private/vault/put','POST',privatePut,aliceCookie)).status,200);
    assert.equal((await request('/api/private/vault/put','POST',privatePut,aliceCookie)).status,409);
    assert.equal((await request('/api/private/vault/'+privateId,'GET',undefined,bobCookie)).status,404);
    assert.equal((await request('/api/private/secrets/'+privateId,'GET',undefined,aliceCookie)).status,404);
    const privateStatus=await (await request('/api/private/vault','GET',undefined,aliceCookie)).json();assert.equal(privateStatus.objects.length,1);assert.ok(!JSON.stringify(privateStatus.objects).includes('envelope'));
    const nextPrivateConfig={...privateConfig,salt:Buffer.alloc(16,3).toString('base64'),wrappedKey:{v:1,iv:Buffer.alloc(12,3).toString('base64'),data:Buffer.alloc(48,3).toString('base64')}};
    const rewrap={expectedConfig:privateConfig,config:nextPrivateConfig};
    assert.equal((await request('/api/private/vault/rewrap','POST',rewrap)).status,401);
    assert.equal((await request('/api/private/vault/rewrap','POST',rewrap,bobCookie)).status,409);
    assert.equal((await request('/api/private/vault/rewrap','POST',rewrap,aliceCookie,{Origin:'https://evil.invalid'})).status,403);
    assert.equal((await request('/api/private/vault/rewrap','POST',{...rewrap,passphrase:'never-send-this'},aliceCookie)).status,400);
    assert.equal((await request('/api/private/vault/rewrap','POST',{...rewrap,config:{...nextPrivateConfig,storeId:privateId}},aliceCookie)).status,400);
    assert.equal((await request('/api/private/vault/rewrap','POST',rewrap,aliceCookie)).status,200);
    assert.equal((await request('/api/private/vault/rewrap','POST',rewrap,aliceCookie)).status,409);
    const afterRewrap=await(await request('/api/private/vault','GET',undefined,aliceCookie)).json();
    assert.deepEqual(afterRewrap.config,nextPrivateConfig);assert.deepEqual(afterRewrap.objects,privateStatus.objects);
    assert.equal((await request('/api/private/vault/remove','POST',{id:privateId,expectedRevision:2},aliceCookie)).status,409);
    assert.equal((await request('/api/private/vault/remove','POST',{id:privateId,expectedRevision:1},aliceCookie)).status,200);
    for(const event of ['initialized','written','removed','passphrase.changed']){
      const activity=await(await request('/api/security/events?q='+encodeURIComponent('private.vault.'+event),'GET',undefined,aliceCookie)).json();
      assert.equal(activity.events.filter(row=>row.event==='private.vault.'+event).length,1);
    }

    async function registerDevice(name,cookieValue) {
      const identity=await crypto.subtle.generateKey({name:'ECDH',namedCurve:'P-256'},false,['deriveBits']);
      const publicKey=Buffer.from(await crypto.subtle.exportKey('spki',identity.publicKey)).toString('base64');
      const registered=await request('/api/link/register','POST',{name,platform:'web',publicKey},cookieValue);assert.equal(registered.status,201);const {id}=await registered.json();
      const challenge=await (await request('/api/link/challenge','POST',{id},cookieValue)).json();
      const remote=await crypto.subtle.importKey('spki',Buffer.from(challenge.publicKey,'base64'),{name:'ECDH',namedCurve:'P-256'},false,[]);
      const bits=await crypto.subtle.deriveBits({name:'ECDH',public:remote},identity.privateKey,256);const keyBase=await crypto.subtle.importKey('raw',bits,'HKDF',false,['deriveKey']);
      const context=new TextEncoder().encode(`locat-link-device-proof:ui3-v1:${challenge.userId}:${id}:${challenge.id}`);
      const key=await crypto.subtle.deriveKey({name:'HKDF',hash:'SHA-256',salt:context,info:new TextEncoder().encode('challenge-response')},keyBase,{name:'AES-GCM',length:256},false,['decrypt']);
      const answer=Buffer.from(await crypto.subtle.decrypt({name:'AES-GCM',iv:Buffer.from(challenge.iv,'base64'),additionalData:context},key,Buffer.from(challenge.data,'base64'))).toString('base64');
      const proved=await request('/api/link/prove','POST',{id:challenge.id,answer},cookieValue);assert.equal(proved.status,200);const proof=await proved.json();
      assert.equal((await request('/api/link/prove','POST',{id:challenge.id,answer},cookieValue)).status,403);
      return {id,publicKey,identity,userId:challenge.userId,headers:{'X-Locat-Device-Proof':proof.token}};
    }
    assert.equal((await request('/api/link/devices')).status,401);
    assert.equal((await request('/api/link/devices','GET',undefined,aliceCookie)).status,403);
    const firstDevice=await registerDevice('First',aliceCookie),secondDevice=await registerDevice('Second',aliceCookie),foreignDevice=await registerDevice('Foreign',bobCookie);
    assert.equal((await request('/api/link/matrix/status')).status,401);
    assert.equal((await request('/api/link/matrix/status','GET',undefined,aliceCookie)).status,403);
    const matrixStatus=await (await request('/api/link/matrix/status','GET',undefined,aliceCookie,firstDevice.headers)).json();assert.equal(matrixStatus.configured,false);assert.equal(matrixStatus.device,null);
    assert.equal((await request('/_matrix/client/v3/account/whoami','GET',undefined,aliceCookie)).status,503);
    assert.equal((await request('/api/link/connectivity')).status,401);
    assert.equal((await request('/api/link/connectivity','GET',undefined,aliceCookie)).status,403);
    assert.deepEqual(await (await request('/api/link/connectivity','GET',undefined,aliceCookie,firstDevice.headers)).json(),{iceServers:[],hasRelay:false,expiresAt:null});
    assert.equal((await request('/api/link/connectivity','GET',undefined,bobCookie,firstDevice.headers)).status,403);
    assert.equal((await request('/api/link/devices','GET',undefined,bobCookie,firstDevice.headers)).status,403);
    assert.equal((await request('/api/link/pair','POST',{peer:foreignDevice.id},aliceCookie,firstDevice.headers)).status,404);
    assert.equal((await request('/api/link/rename','POST',{name:'Forged',id:secondDevice.id},aliceCookie,firstDevice.headers)).status,400);
    assert.equal((await request('/api/link/rename','POST',{name:'Forged'},aliceCookie,{...firstDevice.headers,Origin:'https://evil.invalid'})).status,403);
    const pairingResponse=await request('/api/link/pair','POST',{peer:secondDevice.id},aliceCookie,firstDevice.headers);assert.equal(pairingResponse.status,201);const pairingId=(await pairingResponse.json()).id;
    const confirmOne=await (await request('/api/link/confirm','POST',{id:pairingId,approved:true},aliceCookie,firstDevice.headers)).json();assert.equal(confirmOne.verified,false);
    const confirmTwo=await (await request('/api/link/confirm','POST',{id:pairingId,approved:true},aliceCookie,secondDevice.headers)).json();assert.equal(confirmTwo.verified,true);
    assert.equal((await request('/api/link/confirm','POST',{id:pairingId,approved:true},bobCookie,foreignDevice.headers)).status,404);
    const liveDevices=await (await request('/api/link/devices','GET',undefined,aliceCookie,firstDevice.headers)).json();assert.equal(liveDevices.devices.length,2);assert.equal(liveDevices.pairs[0].status,'verified');
    assert.equal((await request('/api/link/remote/create','POST',{pairId:pairingId,host:secondDevice.id},aliceCookie,firstDevice.headers)).status,404,'retired remote-control route is not served');
    const createLinkPayload=await request('/api/link/payload/create','POST',{pairId:pairingId,peer:secondDevice.id,kind:'text',name:'Encrypted text',mime:'text/plain',size:4},aliceCookie,firstDevice.headers);assert.equal(createLinkPayload.status,201);const relayPayload=(await createLinkPayload.json()).payload;
    const remoteDeviceKey=await crypto.subtle.importKey('spki',Buffer.from(secondDevice.publicKey,'base64'),{name:'ECDH',namedCurve:'P-256'},false,[]);
    const linkBits=await crypto.subtle.deriveBits({name:'ECDH',public:remoteDeviceKey},firstDevice.identity.privateKey,256);const linkBase=await crypto.subtle.importKey('raw',linkBits,'HKDF',false,['deriveKey']);
    const linkKey=await crypto.subtle.deriveKey({name:'HKDF',hash:'SHA-256',salt:new TextEncoder().encode('locat-ui3-link:v1'),info:new TextEncoder().encode(JSON.stringify([firstDevice.userId,pairingId]))},linkBase,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
    const relayAad=new TextEncoder().encode(JSON.stringify(['locat-ui3-link-payload:v1',relayPayload.userId,relayPayload.pairId,relayPayload.id,relayPayload.fromDevice,relayPayload.toDevice,relayPayload.kind,relayPayload.name,relayPayload.mime,relayPayload.size,relayPayload.chunkCount,0]));
    const relayIv=crypto.getRandomValues(new Uint8Array(12));const relayCipher=await crypto.subtle.encrypt({name:'AES-GCM',iv:relayIv,additionalData:relayAad},linkKey,new TextEncoder().encode('link'));
    const relayEnvelope={v:1,iv:Buffer.from(relayIv).toString('base64'),data:Buffer.from(relayCipher).toString('base64')};
    assert.equal((await request('/api/link/payload/chunk','POST',{id:relayPayload.id,seq:0,envelope:relayEnvelope},aliceCookie,secondDevice.headers)).status,403);
    assert.equal((await request('/api/link/payload/chunk','POST',{id:relayPayload.id,seq:0,envelope:relayEnvelope},aliceCookie,firstDevice.headers)).status,200);
    assert.equal((await request('/api/link/payload?id='+relayPayload.id+'&seq=0','GET',undefined,aliceCookie,firstDevice.headers)).status,403);
    assert.equal((await request('/api/link/payload?id='+relayPayload.id+'&seq=0','GET',undefined,bobCookie,foreignDevice.headers)).status,404);
    const relayed=await (await request('/api/link/payload?id='+relayPayload.id+'&seq=0','GET',undefined,aliceCookie,secondDevice.headers)).json();assert.deepEqual(relayed.envelope,relayEnvelope);
    const senderPublicKey=await crypto.subtle.importKey('spki',Buffer.from(firstDevice.publicKey,'base64'),{name:'ECDH',namedCurve:'P-256'},false,[]);const receiverBits=await crypto.subtle.deriveBits({name:'ECDH',public:senderPublicKey},secondDevice.identity.privateKey,256);const receiverBase=await crypto.subtle.importKey('raw',receiverBits,'HKDF',false,['deriveKey']);const receiverKey=await crypto.subtle.deriveKey({name:'HKDF',hash:'SHA-256',salt:new TextEncoder().encode('locat-ui3-link:v1'),info:new TextEncoder().encode(JSON.stringify([firstDevice.userId,pairingId]))},receiverBase,{name:'AES-GCM',length:256},false,['decrypt']);
    assert.equal(new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:Buffer.from(relayed.envelope.iv,'base64'),additionalData:relayAad},receiverKey,Buffer.from(relayed.envelope.data,'base64'))),'link');
    assert.equal((await request('/api/link/payload/finish','POST',{id:relayPayload.id,status:'complete'},aliceCookie,firstDevice.headers)).status,403);
    assert.equal((await request('/api/link/payload/finish','POST',{id:relayPayload.id,status:'complete'},aliceCookie,secondDevice.headers)).status,200);
    assert.equal((await request('/api/link/payload/chunk','POST',{id:relayPayload.id,seq:0,envelope:relayEnvelope},aliceCookie,firstDevice.headers)).status,409);
    assert.equal((await request('/api/link/revoke','POST',{id:secondDevice.id},aliceCookie,firstDevice.headers)).status,200);
    assert.equal((await request('/api/link/connectivity','GET',undefined,aliceCookie,secondDevice.headers)).status,403);
    assert.equal((await request('/api/link/devices','GET',undefined,aliceCookie,secondDevice.headers)).status,403);
    assert.equal((await request('/api/link/register','POST',{name:'Reuse',platform:'web',publicKey:secondDevice.publicKey},aliceCookie)).status,403);
    const payload = { recipientId: bob.id, ciphertext: "A".repeat(48), nonce: "B".repeat(24), algorithm: "client-e2ee-v1" };
    assert.equal((await request('/api/messages','POST',{...payload,plaintext:'synthetic-text'},aliceCookie)).status,501);
    assert.equal((await request('/api/messages','POST',payload,aliceCookie)).status,501);
    assert.equal((await request('/api/messages','GET',undefined,aliceCookie)).status,501);
    assert.equal((await request('/api/messages','GET',undefined,bobCookie)).status,501);
    assert.equal((await request('/api/messages','POST',payload,aliceCookie,{Origin:'https://evil.test'})).status,403);
    const alice = (await (await request("/api/auth/me", "GET", undefined, aliceCookie)).json()).user;
    assert.equal((await request("/api/contacts")).status, 401);
    assert.equal((await request("/api/contacts/request", "POST", { userId: bob.id }, aliceCookie)).status, 200);
    assert.equal((await request('/api/contacts/cancel','POST',{userId:alice.id},bobCookie)).status,404);
    assert.equal((await request('/api/contacts/cancel','POST',{userId:bob.id},aliceCookie)).status,200);
    assert.equal((await request('/api/contacts/request','POST',{userId:bob.id},aliceCookie)).status,200);
    assert.equal((await request("/api/contacts/respond", "POST", { userId: bob.id, accept: true }, aliceCookie)).status, 404);
    assert.equal((await request("/api/contacts/respond", "POST", { userId: alice.id, accept: true }, bobCookie)).status, 200);
    const friends = (await (await request("/api/contacts", "GET", undefined, aliceCookie)).json()).contacts;
    assert.equal(friends.length, 1); assert.equal(friends[0].status, "accepted");
    assert.equal((await request('/api/profile','POST',{displayName:'Bob',bio:'Synthetic contact-only bio'},bobCookie)).status,200);
    const privacy={profileVisibility:'contacts',usernameVisibility:'contacts',allowContactRequests:false};
    assert.equal((await request('/api/profile/privacy')).status,401);
    assert.equal((await request('/api/profile/privacy','POST',privacy,bobCookie,{Origin:'https://evil.test'})).status,403);
    assert.equal((await request('/api/profile/privacy','POST',{...privacy,extra:true},bobCookie)).status,400);
    assert.equal((await request('/api/profile/privacy','POST',privacy,bobCookie)).status,200);
    assert.equal((await (await request('/api/users/search?q=bob','GET',undefined,aliceCookie)).json()).users[0].id,bob.id);
    assert.equal((await (await request('/api/contacts','GET',undefined,aliceCookie)).json()).contacts[0].user.bio,'Synthetic contact-only bio');
    assert.equal((await request('/api/contacts/remove','POST',{userId:bob.id},aliceCookie)).status,200);
    assert.deepEqual((await (await request('/api/users/search?q=bob','GET',undefined,aliceCookie)).json()).users,[]);
    const hidden=(await (await request('/api/users/search?q='+bob.lcCode,'GET',undefined,aliceCookie)).json()).users[0];
    assert.equal(hidden.username,'');assert.equal(hidden.bio,'');
    assert.equal((await request('/api/contacts/request','POST',{userId:bob.id},aliceCookie)).status,403);
    assert.equal((await (await request('/api/auth/me','GET',undefined,bobCookie)).json()).user.username,'bob');
    assert.equal((await request('/api/profile/privacy','POST',{profileVisibility:'everyone',usernameVisibility:'everyone',allowContactRequests:true},bobCookie)).status,200);
    assert.equal((await request("/api/contacts/block", "POST", { userId: alice.id, blocked: true }, bobCookie)).status, 200);
    assert.equal((await request("/api/messages", "POST", payload, aliceCookie)).status, 501);
    assert.equal((await request("/api/contacts/request", "POST", { userId: bob.id }, aliceCookie)).status, 403);
    assert.deepEqual((await (await request("/api/users/search?q=bob", "GET", undefined, aliceCookie)).json()).users, []);
    assert.equal((await request("/api/contacts/block", "POST", { userId: alice.id, blocked: false }, bobCookie)).status, 200);
    assert.deepEqual((await (await request("/api/contacts", "GET", undefined, aliceCookie)).json()).contacts, []);
    assert.equal((await request("/api/auth/sessions")).status, 401);
    const aliceSessions = (await (await request("/api/auth/sessions", "GET", undefined, aliceCookie)).json()).sessions;
    assert.equal(aliceSessions.length, 1);
    assert.equal(aliceSessions[0].current, true);
    const bobSessions = (await (await request("/api/auth/sessions", "GET", undefined, bobCookie)).json()).sessions;
    await request("/api/auth/sessions/revoke", "POST", { id: bobSessions[0].id }, aliceCookie);
    assert.equal((await request("/api/auth/me", "GET", undefined, bobCookie)).status, 200);
    assert.equal((await request("/api/profile", "POST", { displayName: "Alice Updated", bio: "My public bio" }, aliceCookie)).status, 200);
    assert.equal((await (await request("/api/auth/me", "GET", undefined, aliceCookie)).json()).user.displayName, "Alice Updated");
    assert.equal((await (await request("/api/auth/me", "GET", undefined, aliceCookie)).json()).user.bio, "My public bio");
    assert.equal((await request("/api/profile", "POST", { displayName: "Alice Updated", lcCode: "LC-1000" }, aliceCookie)).status, 400);
    assert.equal((await request("/api/auth/password", "POST", { currentPassword: "incorrect", newPassword: "new-long-password-123" }, aliceCookie)).status, 401);
    assert.equal((await request("/api/auth/password", "POST", { currentPassword: password, newPassword: "new-long-password-123" }, aliceCookie)).status, 200);
    assert.equal((await request("/api/auth/me", "GET", undefined, aliceCookie)).status, 401);
    assert.equal((await request("/api/auth/login", "POST", { username: "alice", password })).status, 401);
    const updatedLogin = await request("/api/auth/login", "POST", { username: "alice", password: "new-long-password-123" });
    assert.equal(updatedLogin.status, 200);
    const updatedCookie = updatedLogin.headers.get("set-cookie").split(";")[0];
    assert.equal((await request("/api/preferences", "POST", { theme: "graphite", startup: "home" }, updatedCookie)).status, 200);
    assert.equal((await request("/api/preferences", "POST", { sendReadReceipts: true }, updatedCookie)).status, 200);
    assert.equal((await request("/api/preferences", "POST", { typingIndicators: true }, updatedCookie)).status, 200);
    assert.equal((await request("/api/preferences", "POST", { largeLibraries: true }, updatedCookie)).status, 400);
    assert.deepEqual(await (await request("/api/preferences", "GET", undefined, updatedCookie)).json(), {preferences:{theme:"graphite",startup:"home",sendReadReceipts:true,typingIndicators:true}});
    assert.deepEqual((await (await request("/api/preferences", "GET", undefined, bobCookie)).json()).preferences, {});
    const events = (await (await request("/api/security/events", "GET", undefined, updatedCookie)).json()).events;
    assert.ok(events.some(event => event.event === "password.changed"));
    assert.ok(events.some(event => event.event === "login.failed"));
    assert.equal((await request("/api/security/events")).status, 401);
    assert.equal((await request("/api/auth/logout", "POST", undefined, updatedCookie)).status, 200);
    assert.equal((await request("/api/auth/me", "GET", undefined, updatedCookie)).status, 401);
    assert.equal((await request("/api/auth/logout", "POST", undefined, aliceCookie)).status, 200);
    assert.equal((await request("/api/auth/me", "GET", undefined, aliceCookie)).status, 401);
    // Keep a real request body incomplete while revoking its authenticated session.
    // Use fixture-owned sessions to avoid interfering with login rate-limit acceptance.
    const inspection=openDatabase(join(dir,'auth.sqlite'));
    try{
      const aliceId=inspection.userByName('alice').id,before=inspection.userById(bob.id),preferences=inspection.preferences(bob.id);
      const cases=[
        ['/api/profile',{displayName:'Revoked late profile',bio:'Must not persist'}],
        ['/api/profile/privacy',{profileVisibility:'nobody',usernameVisibility:'nobody',allowContactRequests:false}],
        ['/api/preferences',{theme:'daylight'}],
        ['/api/contacts/block',{userId:aliceId,blocked:true}],
        ['/api/auth/sessions/revoke',{id:createHash('sha256').update(bobCookie.split('=')[1]).digest('hex')}],
      ];
      for(const [path,input] of cases){
        const token=randomBytes(32).toString('hex'),hash=createHash('sha256').update(token).digest('hex'),encoded=JSON.stringify(input);
        inspection.addSession(hash,bob.id,Date.now()+60000);
        let pending;const response=new Promise((resolve,reject)=>{pending=httpRequest(origin+path,{method:'POST',headers:{Origin:origin,Cookie:'locat_session='+token,'Content-Type':'application/json','Content-Length':Buffer.byteLength(encoded)}},res=>{res.resume();res.once('end',()=>resolve(res.statusCode));});pending.on('error',reject);pending.setTimeout(5000,()=>pending.destroy(new Error('Paused account request timed out')));});
        try{pending.write(encoded.slice(0,1));await new Promise(resolve=>setTimeout(resolve,50));inspection.revokeSession(hash);pending.end(encoded.slice(1));assert.equal(await response,401,path+' must reject a session revoked during body reading');}finally{pending.destroy();}
      }
      const after=inspection.userById(bob.id);for(const key of ['displayName','bio','profileVisibility','usernameVisibility','allowContactRequests'])assert.equal(after[key],before[key]);assert.deepEqual(inspection.preferences(bob.id),preferences);assert.equal((await request('/api/auth/me','GET',undefined,bobCookie)).status,200,'Revoked actor must not revoke another owned session');
    }finally{inspection.close();}
    let limited;
    for (let i = 0; i < 25; i++) limited = await request("/api/auth/login", "POST", { username: "x", password: "x" });
    assert.equal(limited.status, 429);
    assert.ok(Number(limited.headers.get("retry-after")) > 0);
    assert.equal((await request("/api/ready")).status, 200);
  } finally {
    if (child.exitCode === null && child.signalCode === null) { child.kill(); await once(child, "exit"); }
    await rm(dir, { recursive: true, force: true });
  }
});
