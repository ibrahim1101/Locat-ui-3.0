/** Deployment configuration is explicit; non-loopback listeners require real TLS. */
export function serverConfig(env = process.env) {
  const host = env.LOCAT_HOST ?? '127.0.0.1';
  const port = Number(env.LOCAT_PORT ?? 8787);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid LOCAT_PORT');
  const key = env.LOCAT_TLS_KEY, cert = env.LOCAT_TLS_CERT;
  if (!!key !== !!cert) throw new Error('Configure both LOCAT_TLS_KEY and LOCAT_TLS_CERT');
  const tls = !!key;
  let origin;
  if (env.LOCAT_PUBLIC_ORIGIN) {
    let url;
    try { url = new URL(env.LOCAT_PUBLIC_ORIGIN); } catch { throw new Error("LOCAT_PUBLIC_ORIGIN must be a valid HTTP(S) origin"); }
    if (url.username || url.password || url.pathname !== '/' || url.search || url.hash || !['http:', 'https:'].includes(url.protocol)) throw new Error('LOCAT_PUBLIC_ORIGIN must be an HTTP(S) origin only');
    if (url.protocol !== (tls ? 'https:' : 'http:')) throw new Error('Public origin scheme must match the listener TLS configuration');
    origin = url.origin;
  }
  const loopback = ['127.0.0.1', 'localhost', '::1'].includes(host);
  if (!loopback && (!tls || !origin)) throw new Error('Non-loopback serving requires TLS and LOCAT_PUBLIC_ORIGIN');
  if (tls && !origin) throw new Error('TLS serving requires LOCAT_PUBLIC_ORIGIN');
  return { host, port, key, cert, tls, origin, staticDir: env.LOCAT_STATIC_DIR ?? './dist' };
}
export function requestOrigin(req, config) {
  try {
    const host = req.headers.host;
    if (!host || /[\s/@\\]/.test(host)) return null;
    const url = new URL(`${config.tls ? 'https' : 'http'}://${host}`);
    if (config.origin) return url.origin === config.origin ? config.origin : null;
    return ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname) ? url.origin : null;
  } catch { return null; }
}
