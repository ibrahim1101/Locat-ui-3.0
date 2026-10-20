import { test } from 'node:test';
import assert from 'node:assert/strict';
import { serverConfig, requestClientAddress, requestOrigin } from './config.mjs';
import { generateKeyPairSync } from 'node:crypto';
import { mkdtempSync, writeFileSync, chmodSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
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

test('TLS termination trusts exact socket peers and fixed HTTPS origin, never forwarded headers', () => {
  assert.throws(()=>serverConfig({LOCAT_TLS_TERMINATION:'proxy',LOCAT_PUBLIC_ORIGIN:'https://locat.test'}),/PEERS/);
  assert.throws(()=>serverConfig({LOCAT_TLS_TERMINATION:'proxy',LOCAT_PROXY_PEERS:'127.0.0.1',LOCAT_PUBLIC_ORIGIN:'http://locat.test'}),/scheme/);
  const config=serverConfig({LOCAT_HOST:'0.0.0.0',LOCAT_TLS_TERMINATION:'proxy',LOCAT_PROXY_PEERS:'127.0.0.1,172.30.8.2',LOCAT_PUBLIC_ORIGIN:'https://locat.test'});
  const request=(peer,host='locat.test')=>({socket:{remoteAddress:peer},headers:{host,'x-forwarded-proto':'http','x-forwarded-host':'evil.test','x-forwarded-for':'127.0.0.1'}});
  assert.equal(config.tls,false);assert.equal(config.secure,true);
  assert.equal(requestOrigin(request('::ffff:127.0.0.1'),config),'https://locat.test');
  assert.equal(requestOrigin(request('172.30.8.2'),config),'https://locat.test');
  assert.equal(requestOrigin(request('172.30.8.3'),config),null);
  assert.equal(requestOrigin(request('127.0.0.1','evil.test'),config),null);
});

test('proxy client attribution requires an exact trusted peer and one valid configured IP header',()=>{
  assert.throws(()=>serverConfig({LOCAT_PROXY_CLIENT_IP_HEADER:'cf-connecting-ip'}),/proxy termination/);
  assert.throws(()=>serverConfig({LOCAT_TLS_TERMINATION:'proxy',LOCAT_PROXY_PEERS:'127.0.0.1',LOCAT_PROXY_CLIENT_IP_HEADER:'x-real-ip'}),/must be/);
  const config=serverConfig({LOCAT_TLS_TERMINATION:'proxy',LOCAT_PROXY_PEERS:'127.0.0.1',LOCAT_PROXY_CLIENT_IP_HEADER:'cf-connecting-ip',LOCAT_PUBLIC_ORIGIN:'https://locat.test'});
  const request=(peer,header)=>({socket:{remoteAddress:peer},headers:{'cf-connecting-ip':header}});
  assert.equal(requestClientAddress(request('::ffff:127.0.0.1','2001:db8::5'),config),'2001:db8::5');
  assert.equal(requestClientAddress(request('127.0.0.1','forged, 192.0.2.1'),config),'127.0.0.1');
  assert.equal(requestClientAddress(request('172.30.0.9','192.0.2.1'),config),'172.30.0.9');
});

test('optional authority signing key is a protected absolute Ed25519 file and never required for local startup',()=>{
 assert.equal(serverConfig({}).identitySigningKey,undefined);
 const dir=mkdtempSync(join(tmpdir(),'locat-identity-key-'));
 try{
  const path=join(dir,'identity.pem'),pair=generateKeyPairSync('ed25519');
  writeFileSync(path,pair.privateKey.export({format:'pem',type:'pkcs8'}),{mode:0o600});chmodSync(path,0o600);
  assert.equal(serverConfig({LOCAT_IDENTITY_SIGNING_KEY_FILE:path}).identitySigningKey.asymmetricKeyType,'ed25519');
  assert.throws(()=>serverConfig({LOCAT_IDENTITY_SIGNING_KEY_FILE:'relative.pem'}),/absolute path/);
  const other=join(dir,'wrong.pem'),rsa=generateKeyPairSync('rsa',{modulusLength:2048});writeFileSync(other,rsa.privateKey.export({format:'pem',type:'pkcs8'}),{mode:0o600});chmodSync(other,0o600);
  assert.throws(()=>serverConfig({LOCAT_IDENTITY_SIGNING_KEY_FILE:other}),/Ed25519/);
  const rotationPath=join(dir,'rotation.json');writeFileSync(rotationPath,JSON.stringify({kind:'locat.rotation.v1'}),{mode:0o600});chmodSync(rotationPath,0o600);
  assert.deepEqual(serverConfig({LOCAT_IDENTITY_SIGNING_KEY_FILE:path,LOCAT_IDENTITY_ROTATION_FILE:rotationPath}).identityRotation,{kind:'locat.rotation.v1'});
  assert.throws(()=>serverConfig({LOCAT_IDENTITY_ROTATION_FILE:rotationPath}),/requires LOCAT_IDENTITY_SIGNING_KEY_FILE/);
  assert.throws(()=>serverConfig({LOCAT_IDENTITY_SIGNING_KEY_FILE:path,LOCAT_IDENTITY_ROTATION_FILE:'relative.json'}),/absolute path/);
  const alias=join(dir,'alias.pem');try{symlinkSync(path,alias);assert.throws(()=>serverConfig({LOCAT_IDENTITY_SIGNING_KEY_FILE:alias}),/regular Ed25519/);}catch(error){if(error.code!=='EPERM'&&error.code!=='EACCES')throw error;}
 }finally{rmSync(dir,{recursive:true,force:true});}
});
