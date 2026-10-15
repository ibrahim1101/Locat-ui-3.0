# Connectivity acceptance plan

Use only synthetic identities/messages and test credentials. Source tests do not certify physical/network scenarios.

| Test | Reproducible acceptance | Status |
| --- | --- | --- |
| A LAN | Trusted HTTPS on isolated Pi; Windows/Android on same Wi-Fi open discovery, register/login, pair and exercise authorized APIs without internet/VPN | Pending hardware/native clients |
| B different networks | Approved public HTTPS; one Wi-Fi and one mobile-data client authenticate, maintain session and recover after network switching | Pending approved deployment/devices |
| C international E2EE | India/USA clients verify device keys, exchange encrypted messages/attachments and inspect protocol states | Pending reviewed messaging integration and devices |
| D federation | Two independent protocol-compatible homeservers exchange verified encrypted messages; replay/block/retry cases | Pending protocol/identity integration |
| E offline | Disconnect recipient, queue ciphertext, restart server, reconnect/decrypt once and acknowledge idempotently | Pending reviewed messaging transport |
| F revocation | Revoke one device; new message keys/content denied while another remains authorized | Link proof revocation tested; messaging acceptance pending |
| G TURN | Force relay-only ICE with short-lived TURN credentials and confirm selected relay candidate and consent/revocation | Pending TURN infrastructure and WebRTC configuration |
| H compromise boundary | Inspect test DB/backups/queues/logs for synthetic plaintext/private keys while retaining expected routing metadata | Vault/Link ciphertext tests exist; messaging acceptance pending |

Automated foundation coverage: direct TLS with trusted test CA; real HTTP proxy-hop auth/Secure cookies/Host/Origin checks; exact socket-peer unit denial; discovery version/origin/size and no-credential/no-redirect client checks; persisted instance identity/backup/migration; readiness failure backoff/network event/disposal. Commands: npm run check; npm run lint; npm run test:all; npm run build. Docker Compose/cloudflared configuration is not runtime-tested locally.

Local ws coverage now includes actual production cookie auth/ping and isolated socket origin/host/path/session denial, account cap, invalid/oversized frames and revoked-session close. Client heartbeat/backoff/disposal, safe session inspection and qualified-authority isolation are tested. Real WSS through TLS proxies/Cloudflare and physical network changes remain pending acceptance.
