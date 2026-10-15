# Global connectivity status

Implemented/tested locally: existing same-origin auth/API, direct HTTPS, opt-in fixed-peer reverse proxy mode, discovery, manual browser server entry and readiness recovery. These foundations permit an operator to prepare an HTTPS public origin; they do not establish international reachability or private messaging.

The proposed personal endpoint is https://locat.ibrahimshaik.com. It is an operator target, not a compiled application requirement. No DNS existence, ownership verification, tunnel activation or public connectivity is claimed. Other operators supply their own LOCAT_PUBLIC_ORIGIN. Browser selection checks /.well-known/locat without cookies and opens the chosen origin only after the user clicks Open this server.

LAN-only direct TLS requires no Cloudflare, Tailscale or internet. Automatic mDNS discovery needs a native implementation. Browser HTTP LAN origins are rejected because they do not provide a suitable secure context; loopback HTTP is development only. Internet access must present a valid HTTPS certificate. Browser origin changes do not migrate encrypted storage or device keys.

All auth attempts behind a proxy currently share the socket-peer rate bucket. This conservative limit can constrain multi-user operation. Do not trust arbitrary X-Forwarded-For/CF-Connecting-IP to bypass it. Trusted proxy-specific address attribution and layered abuse limits are a remaining beta prerequisite.
