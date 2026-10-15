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
const exec = promisify(execFile);
test('HTTPS serves the built shell safely and issues Secure authenticated cookies', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'locat-host-'));
  let child;
  try {
    const key = join(dir, 'key.pem'), cert = join(dir, 'cert.pem'), web = join(dir, 'web');
    await mkdir(join(web, 'assets'), { recursive: true });
    await writeFile(join(web, 'index.html'), '<title>Locat test shell</title>');
    await writeFile(join(web, 'assets', 'app.js'), 'export const app = "Locat";');
    await writeFile(join(dir, 'private.js'), 'DO NOT EXPOSE');
    try { await symlink(join(dir, 'private.js'), join(web, 'assets', 'escape.js')); } catch {}
    await exec('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-keyout', key, '-out', cert, '-days', '1', '-subj', '/CN=localhost', '-addext', 'subjectAltName=IP:127.0.0.1,DNS:localhost']);
    const reservation = createServer(); await new Promise(resolve => reservation.listen(0, '127.0.0.1', resolve));
    const port = reservation.address().port; await new Promise(resolve => reservation.close(resolve));
    const origin = 'https://127.0.0.1:' + port, ca = await readFile(cert);
    child = spawn(process.execPath, ['server/index.mjs'], { env: { ...process.env, LOCAT_HOST: '127.0.0.1', LOCAT_PORT: String(port), LOCAT_DATABASE_FILE: join(dir, 'app.sqlite'), LOCAT_TLS_KEY: key, LOCAT_TLS_CERT: cert, LOCAT_PUBLIC_ORIGIN: origin, LOCAT_STATIC_DIR: web, LOCAT_MEDIA_AUTHORIZED_ROOTS: '' }, stdio: 'ignore' });
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
    const shell = await request('/cinema'); assert.equal(shell.status, 200); assert.match(shell.body, /Locat test shell/); assert.match(shell.headers['content-security-policy'], /frame-ancestors 'none'/);
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
    assert.equal((await request('/api/auth/me', 'GET', undefined, { Cookie: cookie })).status, 200);
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
  child=spawn(process.execPath,['server/index.mjs'],{env:{...process.env,LOCAT_HOST:'127.0.0.1',LOCAT_PORT:String(port),LOCAT_DATABASE_FILE:join(dir,'app.sqlite'),LOCAT_TLS_KEY:'',LOCAT_TLS_CERT:'',LOCAT_TLS_TERMINATION:'proxy',LOCAT_PROXY_PEERS:'127.0.0.1',LOCAT_PUBLIC_ORIGIN:origin,LOCAT_MEDIA_AUTHORIZED_ROOTS:''},stdio:'ignore'});
  const request=(path,method='GET',data,extra={})=>new Promise((resolve,reject)=>{
    const req=httpRequest({hostname:'127.0.0.1',port,path,method,headers:{Host:'locat.test',Origin:origin,'Content-Type':'application/json',...extra}},res=>{
      let body='';res.on('data',chunk=>body+=chunk);res.on('end',()=>resolve({status:res.statusCode,ok:res.statusCode===200,headers:{get:key=>Array.isArray(res.headers[key])?res.headers[key][0]:res.headers[key]},json:async()=>JSON.parse(body)}));
    });req.on('error',reject);req.end(data?JSON.stringify(data):undefined);
  });
  let ready=false;for(let i=0;i<60;i++){try{if((await request('/api/ready')).ok){ready=true;break;}}catch{}if(child.exitCode!==null)throw new Error('Proxy-mode server exited');await new Promise(resolve=>setTimeout(resolve,50));}assert.ok(ready);
  const info=await (await request('/.well-known/locat')).json();assert.equal(info.origin,origin);
  assert.equal((await request('/api/ready','GET',undefined,{Host:'evil.test','X-Forwarded-Host':'locat.test','X-Forwarded-Proto':'https'})).status,403);
  const credentials={username:'alice',displayName:'Alice',password:'long-test-password-123'};
  assert.equal((await request('/api/auth/register','POST',credentials,{Origin:'https://evil.test'})).status,403);
  assert.equal((await request('/api/auth/register','POST',credentials)).status,201);
  const login=await request('/api/auth/login','POST',credentials);assert.equal(login.status,200);assert.match(login.headers.get('set-cookie'),/; Secure/);
  const cookie=login.headers.get('set-cookie').split(';')[0];const diagnostics=await (await request('/api/diagnostics','GET',undefined,{Cookie:cookie})).json();assert.equal(diagnostics.tls,true);assert.equal(diagnostics.tlsTermination,'proxy');
 }finally{if(child&&child.exitCode===null&&child.signalCode===null){child.kill();await once(child,'exit');}await rm(dir,{recursive:true,force:true});}
});
