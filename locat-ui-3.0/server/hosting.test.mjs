import { request as httpRequest } from 'node:http';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn, execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { once } from 'node:events';
import { request as httpsRequest } from 'node:https';
import { createServer } from 'node:net';
import { createPublicKey, generateKeyPairSync, verify } from 'node:crypto';
import { createIdentityRotation } from './globalIdentity.mjs';
import { openDatabase } from './database.mjs';
const exec = promisify(execFile);
test('HTTPS serves the built shell safely and issues Secure authenticated cookies', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'locat-host-'));
  let child;
  try {
    const key = join(dir, 'key.pem'), cert = join(dir, 'cert.pem'), identityKey = join(dir, 'identity.pem'), rotationFile=join(dir,'rotation.json'),databasePath=join(dir,'app.sqlite'),web = join(dir, 'web');
    const identityPair=generateKeyPairSync('ed25519'),identityPem=identityPair.privateKey.export({format:'pem',type:'pkcs8'}),oldIdentityPair=generateKeyPairSync('ed25519');await writeFile(identityKey,identityPem,{mode:0o600});
    await mkdir(join(web, 'assets'), { recursive: true });
    await writeFile(join(web, 'index.html'), '<title>Locat test shell</title>');
    await writeFile(join(web,'assets','crypto.wasm'),Buffer.from([0,97,115,109,1,0,0,0]));
    await writeFile(join(web, 'assets', 'app.js'), 'export const app = "Locat";');
    await writeFile(join(web,'manifest.webmanifest'),JSON.stringify({name:'Locat',share_target:{action:'/share-target',method:'POST'}}));
    await writeFile(join(web,'sw.js'),'self.addEventListener("fetch",()=>{});');
    await writeFile(join(dir, 'private.js'), 'DO NOT EXPOSE');
    try { await symlink(join(dir, 'private.js'), join(web, 'assets', 'escape.js')); } catch {}
    await exec('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-keyout', key, '-out', cert, '-days', '1', '-subj', '/CN=localhost', '-addext', 'subjectAltName=IP:127.0.0.1,DNS:localhost']);
    const reservation = createServer(); await new Promise(resolve => reservation.listen(0, '127.0.0.1', resolve));
    const port = reservation.address().port; await new Promise(resolve => reservation.close(resolve));
    const origin = 'https://127.0.0.1:' + port, ca = await readFile(cert),database=openDatabase(databasePath);let serverId;try{serverId=database.serverId;}finally{database.close();}
    const rotation=createIdentityRotation(origin,serverId,oldIdentityPair.privateKey,identityPair.privateKey);await writeFile(rotationFile,JSON.stringify(rotation),{mode:0o600});
    child = spawn(process.execPath, ['server/index.mjs'], { env: { ...process.env, LOCAT_HOST: '127.0.0.1', LOCAT_PORT: String(port), LOCAT_DATABASE_FILE: databasePath, LOCAT_TLS_KEY: key, LOCAT_TLS_CERT: cert, LOCAT_PUBLIC_ORIGIN: origin, LOCAT_IDENTITY_SIGNING_KEY_FILE: identityKey, LOCAT_IDENTITY_ROTATION_FILE:rotationFile, LOCAT_STATIC_DIR: web, LOCAT_MEDIA_AUTHORIZED_ROOTS: '' }, stdio: 'ignore' });
    function request(path, method = 'GET', data, extra = {}) {
      return new Promise((resolve, reject) => {
        const req = httpsRequest(origin + path, { ca, servername: "localhost", method, headers: { Origin: origin, 'Content-Type': 'application/json', ...extra } }, res => {
          let body = ''; res.on('data', chunk => body += chunk); res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body }));
        }); req.on('error', reject); req.end(data ? JSON.stringify(data) : undefined);
      });
    }
    let ready = false;
    for (let i = 0; i < 60; i++) { try { if ((await request('/api/ready')).status === 200) { ready = true; break; } } catch {} if (child.exitCode !== null) throw new Error('TLS server exited'); await new Promise(resolve => setTimeout(resolve, 50)); }
    assert.ok(ready);
    const discovery=JSON.parse((await request('/.well-known/locat')).body),serverProof=discovery.identity;
    assert.equal(discovery.capabilities.authenticatedIdentity,true);assert.equal(serverProof.origin,origin);assert.equal(serverProof.serverId,discovery.serverId);assert.deepEqual(serverProof.rotation,rotation);assert.equal(JSON.stringify(discovery).includes(identityPem),false);
    const identityPublicKey=createPublicKey({key:Buffer.from(serverProof.publicKey,'base64url'),format:'der',type:'spki'});
    const signatureValid=(claims,signature)=>verify(null,Buffer.from(JSON.stringify(claims)),identityPublicKey,Buffer.from(signature,'base64url'));
    assert.equal(signatureValid([serverProof.kind,serverProof.version,serverProof.serverId,serverProof.origin],serverProof.signature),true);
    const shell = await request('/files/secrets'); assert.equal(shell.status, 200); assert.match(shell.body, /Locat test shell/); assert.match(shell.headers['content-security-policy'], /frame-ancestors 'none'/);
    const wasm=await request('/assets/crypto.wasm');assert.equal(wasm.status,200);assert.equal(wasm.headers['content-type'],'application/wasm');assert.ok(shell.headers['content-security-policy'].includes("'wasm-unsafe-eval'"));assert.ok(!shell.headers['content-security-policy'].includes("'unsafe-eval'"));
    const manifest=await request('/manifest.webmanifest');assert.equal(manifest.status,200);assert.equal(manifest.headers['content-type'],'application/manifest+json');assert.equal(JSON.parse(manifest.body).share_target.action,'/share-target');
    const worker=await request('/sw.js');assert.equal(worker.status,200);assert.equal(worker.headers['content-type'],'text/javascript; charset=utf-8');assert.match(worker.body,/addEventListener/);
    assert.equal((await request('/assets/app.js')).status, 200);
    assert.equal((await request('/assets/app.js', 'HEAD')).body, '');
    assert.equal((await request('/assets/escape.js')).status, 404);
    assert.equal((await request('/api/ready', 'GET', undefined, { Host: 'attacker.test' })).status, 403);
    const credentials = { username: 'alice', displayName: 'Alice', password: 'secure-test-password-123' };
    assert.equal((await request('/api/auth/register', 'POST', credentials)).status, 201);
    assert.equal((await request('/api/auth/login', 'POST', credentials, { Origin: 'https://attacker.test' })).status, 403);
    const login = await request('/api/auth/login', 'POST', credentials);
    assert.equal(login.status, 200); assert.match(login.headers['set-cookie'][0], /; Secure/);
    const cookie = login.headers['set-cookie'][0].split(';')[0];
    const me=await request('/api/auth/me', 'GET', undefined, { Cookie: cookie });assert.equal(me.status,200);
    const accountProof=JSON.parse(me.body).user.globalIdentity.attestation;assert.equal(accountProof.accountId,JSON.parse(me.body).user.id);assert.equal(accountProof.lcCode,JSON.parse(me.body).user.lcCode.replace('LC-',''));
    assert.equal(accountProof.keyId,serverProof.keyId);assert.equal(signatureValid([accountProof.kind,accountProof.version,accountProof.serverId,accountProof.origin,accountProof.accountId,accountProof.lcCode],accountProof.signature),true);
    const diagnostics=await request('/api/diagnostics','GET',undefined,{Cookie:cookie});assert.equal(diagnostics.status,200);assert.equal(diagnostics.body.includes(identityPem),false);
  } finally {
    if (child && child.exitCode === null && child.signalCode === null) { child.kill(); await once(child, 'exit'); }
    await rm(dir, { recursive: true, force: true });
  }
});

test('explicit proxy termination retains Host/Origin checks and Secure cookies over private HTTP hop',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'locat-proxy-'));let child;
 try{
  const reservation=createServer();await new Promise(resolve=>reservation.listen(0,'127.0.0.1',resolve));const port=reservation.address().port;await new Promise(resolve=>reservation.close(resolve));
  const origin='https://locat.test';
  child=spawn(process.execPath,['server/index.mjs'],{env:{...process.env,LOCAT_HOST:'127.0.0.1',LOCAT_PORT:String(port),LOCAT_DATABASE_FILE:join(dir,'app.sqlite'),LOCAT_TLS_KEY:'',LOCAT_TLS_CERT:'',LOCAT_TLS_TERMINATION:'proxy',LOCAT_PROXY_PEERS:'127.0.0.1',LOCAT_PROXY_CLIENT_IP_HEADER:'cf-connecting-ip',LOCAT_PUBLIC_ORIGIN:origin,LOCAT_MEDIA_AUTHORIZED_ROOTS:''},stdio:'ignore'});
  const request=(path,method='GET',data,extra={})=>new Promise((resolve,reject)=>{
    const req=httpRequest({hostname:'127.0.0.1',port,path,method,headers:{Host:'locat.test',Origin:origin,'Content-Type':'application/json',...extra}},res=>{
      let body='';res.on('data',chunk=>body+=chunk);res.on('end',()=>resolve({status:res.statusCode,ok:res.statusCode===200,headers:{get:key=>Array.isArray(res.headers[key])?res.headers[key][0]:res.headers[key]},json:async()=>JSON.parse(body)}));
    });req.on('error',reject);req.end(data?JSON.stringify(data):undefined);
  });
  let ready=false;for(let i=0;i<200;i++){try{if((await request('/api/ready')).ok){ready=true;break;}}catch{}if(child.exitCode!==null)throw new Error('Proxy-mode server exited');await new Promise(resolve=>setTimeout(resolve,50));}assert.ok(ready);
  const info=await (await request('/.well-known/locat')).json();assert.equal(info.origin,origin);assert.equal(info.identity,null);assert.equal(info.capabilities.authenticatedIdentity,false);
  assert.equal((await request('/api/ready','GET',undefined,{Host:'evil.test','X-Forwarded-Host':'locat.test','X-Forwarded-Proto':'https'})).status,403);
  const credentials={username:'alice',displayName:'Alice',password:'long-test-password-123'};
  assert.equal((await request('/api/auth/register','POST',credentials,{Origin:'https://evil.test'})).status,403);
  assert.equal((await request('/api/auth/register','POST',credentials)).status,201);
  const login=await request('/api/auth/login','POST',credentials);assert.equal(login.status,200);assert.match(login.headers.get('set-cookie'),/; Secure/);
  const cookie=login.headers.get('set-cookie').split(';')[0];const diagnostics=await (await request('/api/diagnostics','GET',undefined,{Cookie:cookie})).json();assert.equal(diagnostics.tls,true);assert.equal(diagnostics.tlsTermination,'proxy');
  const clientA={'CF-Connecting-IP':'198.51.100.10'};for(let attempt=0;attempt<20;attempt++)assert.equal((await request('/api/auth/login','POST',{...credentials,password:'incorrect-password'},clientA)).status,401);
  assert.equal((await request('/api/auth/login','POST',{...credentials,password:'incorrect-password'},clientA)).status,429);
  assert.equal((await request('/api/auth/register','POST',{username:'bob',displayName:'Bob',password:'another-long-test-password-123'},{'CF-Connecting-IP':'198.51.100.11'})).status,201);
 }finally{if(child&&child.exitCode===null&&child.signalCode===null){child.kill();await once(child,'exit');}await rm(dir,{recursive:true,force:true});}
});
