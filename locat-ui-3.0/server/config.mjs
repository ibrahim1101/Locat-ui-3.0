import { isIP } from 'node:net';
import { constants, lstatSync, readFileSync } from 'node:fs';
import { isAbsolute } from 'node:path';
import { createPrivateKey } from 'node:crypto';
/** Deployment configuration is explicit; non-loopback listeners require real TLS. */
export function serverConfig(env = process.env) {
  const host = env.LOCAT_HOST ?? '127.0.0.1';
  const port = Number(env.LOCAT_PORT ?? 8787);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid LOCAT_PORT');
  const key = env.LOCAT_TLS_KEY, cert = env.LOCAT_TLS_CERT;
  if (!!key !== !!cert) throw new Error('Configure both LOCAT_TLS_KEY and LOCAT_TLS_CERT');
  const tls = !!key;
  const proxy = env.LOCAT_TLS_TERMINATION === 'proxy';
  if (env.LOCAT_TLS_TERMINATION && !proxy) throw new Error('Invalid LOCAT_TLS_TERMINATION');
  if (proxy && tls) throw new Error('Proxy termination and listener TLS are mutually exclusive');
  const proxyPeers = (env.LOCAT_PROXY_PEERS ?? '').split(',').map(s => s.trim()).filter(Boolean);
  if (proxy && (!proxyPeers.length || proxyPeers.length > 16 || proxyPeers.some(ip => !isIP(ip)))) throw new Error('Proxy termination requires explicit LOCAT_PROXY_PEERS IP addresses');
  if (!proxy && proxyPeers.length) throw new Error('LOCAT_PROXY_PEERS requires proxy termination');
  const proxyClientIpHeader=(env.LOCAT_PROXY_CLIENT_IP_HEADER??'').trim().toLowerCase();
  if(proxyClientIpHeader&&!['cf-connecting-ip','x-forwarded-for'].includes(proxyClientIpHeader))throw new Error('LOCAT_PROXY_CLIENT_IP_HEADER must be cf-connecting-ip or x-forwarded-for');
  if(proxyClientIpHeader&&!proxy)throw new Error('LOCAT_PROXY_CLIENT_IP_HEADER requires proxy termination');
  const secure = tls || proxy;
  let identitySigningKey;
  if (env.LOCAT_IDENTITY_SIGNING_KEY_FILE) {
    const keyPath=env.LOCAT_IDENTITY_SIGNING_KEY_FILE;
    if(!isAbsolute(keyPath))throw new Error('LOCAT_IDENTITY_SIGNING_KEY_FILE must be an absolute path');
    let metadata,pem;
    try {
      metadata=lstatSync(keyPath);
      if(metadata.isSymbolicLink()||!metadata.isFile())throw new Error('not a regular file');
      if(process.platform!=='win32'&&(metadata.mode&0o077)!==0)throw new Error('permissions are too broad');
      pem=readFileSync(keyPath);
      identitySigningKey=createPrivateKey(pem);
    } catch {
      throw new Error('LOCAT_IDENTITY_SIGNING_KEY_FILE must name a readable regular Ed25519 private-key file with owner-only permissions');
    }
    if(identitySigningKey.asymmetricKeyType!=='ed25519')throw new Error('LOCAT_IDENTITY_SIGNING_KEY_FILE must contain an Ed25519 private key');
  }
  let identityRotation;
  if(env.LOCAT_IDENTITY_ROTATION_FILE){
    if(!identitySigningKey)throw new Error('LOCAT_IDENTITY_ROTATION_FILE requires LOCAT_IDENTITY_SIGNING_KEY_FILE');
    const rotationPath=env.LOCAT_IDENTITY_ROTATION_FILE;
    if(!isAbsolute(rotationPath))throw new Error('LOCAT_IDENTITY_ROTATION_FILE must be an absolute path');
    try{
      const metadata=lstatSync(rotationPath);
      if(metadata.isSymbolicLink()||!metadata.isFile()||metadata.size>8192)throw new Error('not a bounded regular file');
      identityRotation=JSON.parse(readFileSync(rotationPath,'utf8'));
      if(!identityRotation||typeof identityRotation!=='object'||Array.isArray(identityRotation))throw new Error('not a rotation object');
    }catch{throw new Error('LOCAT_IDENTITY_ROTATION_FILE must name a readable regular JSON file no larger than 8 KiB');}
  }
  let origin;
  if (env.LOCAT_PUBLIC_ORIGIN) {
    let url;
    try { url = new URL(env.LOCAT_PUBLIC_ORIGIN); } catch { throw new Error("LOCAT_PUBLIC_ORIGIN must be a valid HTTP(S) origin"); }
    if (url.username || url.password || url.pathname !== '/' || url.search || url.hash || !['http:', 'https:'].includes(url.protocol)) throw new Error('LOCAT_PUBLIC_ORIGIN must be an HTTP(S) origin only');
    if (url.protocol !== (secure ? 'https:' : 'http:')) throw new Error('Public origin scheme must match the listener TLS configuration');
    origin = url.origin;
  }
  const loopback = ['127.0.0.1', 'localhost', '::1'].includes(host);
  if (!loopback && (!secure || !origin)) throw new Error('Non-loopback serving requires TLS and LOCAT_PUBLIC_ORIGIN');
  if (secure && !origin) throw new Error('TLS serving requires LOCAT_PUBLIC_ORIGIN');
  return { host, port, key, cert, tls, secure, proxy, proxyPeers, proxyClientIpHeader, origin, identitySigningKey, identityRotation, staticDir: env.LOCAT_STATIC_DIR ?? './dist' };
}
function normalizeIp(value){return typeof value==='string'?value.replace(/^::ffff:/,''):'';}
/** Trust one canonical client IP header only through an explicitly trusted proxy peer. */
export function requestClientAddress(req,config){
  const peer=normalizeIp(req.socket?.remoteAddress)||'unknown';
  if(!config.proxy||!config.proxyPeers.includes(peer)||!config.proxyClientIpHeader)return peer;
  const candidate=req.headers?.[config.proxyClientIpHeader];
  return typeof candidate==='string'&&!candidate.includes(',')&&isIP(candidate.trim())?normalizeIp(candidate.trim()):peer;
}
export function requestOrigin(req, config) {
  try {
    if (config.proxy) {
      const address = normalizeIp(req.socket?.remoteAddress);
      if (!config.proxyPeers.includes(address)) return null;
    }
    const host = req.headers.host;
    if (!host || /[\s/@\\]/.test(host)) return null;
    const url = new URL(`${config.secure ? 'https' : 'http'}://${host}`);
    if (config.origin) return url.origin === config.origin ? config.origin : null;
    return ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname) ? url.origin : null;
  } catch { return null; }
}
