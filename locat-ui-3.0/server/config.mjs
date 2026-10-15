import { isIP } from 'node:net';
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
  const secure = tls || proxy;
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
  return { host, port, key, cert, tls, secure, proxy, proxyPeers, origin, staticDir: env.LOCAT_STATIC_DIR ?? './dist' };
}
export function requestOrigin(req, config) {
  try {
    if (config.proxy) {
      const address = req.socket?.remoteAddress?.replace(/^::ffff:/, '');
      if (!config.proxyPeers.includes(address)) return null;
    }
    const host = req.headers.host;
    if (!host || /[\s/@\\]/.test(host)) return null;
    const url = new URL(`${config.secure ? 'https' : 'http'}://${host}`);
    if (config.origin) return url.origin === config.origin ? config.origin : null;
    return ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname) ? url.origin : null;
  } catch { return null; }
}
