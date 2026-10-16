# Global connectivity status

Implemented/tested locally: existing same-origin auth/API, direct HTTPS, opt-in fixed-peer reverse proxy mode, discovery, manual browser server entry, readiness recovery, session-authenticated WebSocket health and qualified local addresses. These foundations permit an operator to prepare an HTTPS public origin; they do not establish international reachability. Private two-user encrypted messaging through the authenticated Locat gateway has separate real Chromium/Synapse acceptance; see MESSAGING_QUICKSTART.md and BROWSER_FOUNDATION_ACCEPTANCE.md. This does not certify a public deployment or federation.

The proposed personal endpoint is https://locat.ibrahimshaik.com. It is an operator target, not a compiled application requirement. No DNS existence, ownership verification, tunnel activation or public connectivity is claimed. Other operators supply their own LOCAT_PUBLIC_ORIGIN. Browser selection checks /.well-known/locat without cookies and opens the chosen origin only after the user clicks Open this server.

LAN-only direct TLS requires no Cloudflare, Tailscale or internet. Automatic mDNS discovery needs a native implementation. Browser HTTP LAN origins are rejected because they do not provide a suitable secure context; loopback HTTP is development only. Internet access must present a valid HTTPS certificate. Browser origin changes do not migrate encrypted storage or device keys.

All auth attempts behind a proxy currently share the socket-peer rate bucket. This conservative limit can constrain multi-user operation. Do not trust arbitrary X-Forwarded-For/CF-Connecting-IP to bypass it. Trusted proxy-specific address attribution and layered abuse limits are a remaining beta prerequisite.


Container boundary: compose.cloudflare.yml currently configures the web/API connector only. It does not configure the private Matrix service, registration mount or upstream address. Combining its Locat container with compose.matrix.yml is not a tested messaging deployment: container loopback is not host loopback, and LOCAT_MATRIX_UPSTREAM intentionally rejects plain HTTP to arbitrary bridge hostnames. Do not fix this by publishing Synapse/admin ports or relaxing the upstream transport rule. The current documented topology for integration validation is host Node with a private loopback homeserver; a fully integrated container profile and actual Docker/ARM64 acceptance remain open. Public activation still requires the operator's separate authorization.


Optional Linux host route now has a preparation-only profile: see HOST_CONNECTOR_PREPARATION.md and repository-root compose.cloudflare-host.yml. Only cloudflared shares the host network; existing host Node/private loopback Synapse remain unchanged. The original bridge profile above still does not integrate Matrix. The new profile uses an exact-host ingress and catch-all 404, exposes no database/admin/SSH listener and never starts automatically. Local proxy-boundary tests pass; actual Docker/ingress CI and public/ARM64 acceptance must be observed separately. No public activation is authorized by this preparation.


Observed private-hop acceptance: source 1c3367a, workflow 38961333506 connector job 117176862160 passed actual Compose/offline cloudflared ingress and nonroot Linux host-network HTTP/session/WebSocket/revocation checks. This does not activate or certify the public edge, ARM64 or Matrix-through-tunnel operation. Discovery now distinguishes configured Matrix capability from absent setup; it is not an upstream health check or device authorization.
