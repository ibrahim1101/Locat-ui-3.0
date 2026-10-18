import { isIP } from 'node:net';

const PRIVATE_IPV4 = /^(?:10\.|192\.168\.|172\.(?:1[6-9]|2\d|3[01])\.)/;
export function remoteStatusConfig(env = process.env) {
  const endpoint = env.LOCAT_REMOTE_STATUS_URL?.trim() || '';
  const owners = new Set((env.LOCAT_REMOTE_STATUS_OWNER_IDS || '').split(',').map(s => s.trim()).filter(Boolean));
  if (!endpoint || owners.size === 0) return { enabled: false, owners };
  const url = new URL(endpoint);
  if (url.protocol !== 'http:' || url.username || url.password || url.search || url.hash ||
      !PRIVATE_IPV4.test(url.hostname) || isIP(url.hostname) !== 4 ||
      url.pathname !== '/api/status') {
    throw new Error('LOCAT_REMOTE_STATUS_URL must be a fixed private IPv4 HTTP /api/status endpoint');
  }
  return { enabled: true, owners, url: url.href };
}
export function sanitizeRemoteStatus(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new Error('Invalid status payload');
  const checks = payload.checks;
  if (!checks || typeof checks !== 'object' || Array.isArray(checks)) throw new Error('Invalid checks');
  const permitted = [
    'wg-quick@wg0.service','locat-remote-firewall.service','locat-remote-ddns.timer',
    'wireguard_listening','forward_10.77.0.2','nat_10.77.0.2',
    'forward_10.77.0.3','nat_10.77.0.3','sunshine_reachable',
    'dns_resolves','dns_matches_local_ipv6','disk_below_90_percent'
  ];
  const safe = Object.fromEntries(permitted.filter(k => typeof checks[k] === 'boolean').map(k => [k, checks[k]]));
  if (!Object.keys(safe).length) throw new Error('No valid checks');
  const timestamp = typeof payload.timestamp === 'string' && Number.isFinite(Date.parse(payload.timestamp))
    ? payload.timestamp : null;
  const disk = typeof payload.disk_used_percent === 'number' && Number.isFinite(payload.disk_used_percent)
    ? Math.max(0, Math.min(100, payload.disk_used_percent)) : null;
  return {
    status: timestamp && Date.now() - Date.parse(timestamp) <= 15 * 60_000 &&
      Date.parse(timestamp) <= Date.now() + 60_000 ? 'current' : 'stale',
    observedHealthy: Object.values(safe).every(Boolean),
    checkedAt: timestamp,
    checks: safe,
    diskUsedPercent: disk
  };
}
export function createRemoteStatusHandler({ sessionUser, json, env = process.env, fetchImpl = fetch }) {
  const config = remoteStatusConfig(env);
  return async (req, res, url) => {
    if (url.pathname !== '/api/remote/infrastructure') return false;
    if (req.method !== 'GET') { json(res, 405, { error: 'Method not allowed' }, { Allow: 'GET' }); return true; }
    const user = sessionUser(req);
    if (!user) { json(res, 401, { error: 'Not authenticated' }); return true; }
    if (!config.enabled || !config.owners.has(user.id)) {
      json(res, 404, { error: 'Remote infrastructure status unavailable' }); return true;
    }
    try {
      const response = await fetchImpl(config.url, {
        method: 'GET', redirect: 'error', signal: AbortSignal.timeout(2500),
        headers: { Accept: 'application/json' }
      });
      if (!response.ok) throw new Error('Upstream unavailable');
      if (Number(response.headers.get('content-length') || 0) > 65536) throw new Error('Oversized status');
      const raw = await response.text();
      if (raw.length > 65536) throw new Error('Oversized status');
      json(res, 200, sanitizeRemoteStatus(JSON.parse(raw)));
    } catch {
      json(res, 503, { error: 'Remote infrastructure status unavailable' });
    }
    return true;
  };
}
