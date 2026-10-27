# Self-host Locat UI 3.0

Locat is currently a self-hosted preview, not a production release. The checked-in service runs the built web UI and same-origin API on Node.js 24 or later. No container image, Compose file, automatic updater, public deployment recipe, Android package or Windows installer is included. Public-network use, native integrations, independent security review and physical-device acceptance remain open.

## Build and run on one machine

From `locat-ui-3.0/`:

```sh
npm ci
npm run check
npm run lint
npm run test:all
npm run build
npm start
```

The default listener is `127.0.0.1:8787`; open `http://127.0.0.1:8787`. The server serves the production build from `dist/`. For frontend development, use `npm run dev` and `npm run dev:server` in separate terminals. The live UI is the default. Preview fixtures are enabled only by setting `VITE_LOCAT_LIVE=false` when building the preview.

The server creates `server/data/locat.sqlite` with restrictive directory permissions. To select another database file, set `LOCAT_DATABASE_FILE` to its absolute path. Do not point this version at the retired JSON store. Unknown future database schemas fail closed; supported migrations are applied at startup.

Production builds serve the PWA manifest and register the service worker, which supplies an offline app shell and text/title/URL share reception on browsers that support Web Share Target. Install/share-target support requires HTTPS or localhost and is not a native Android intent or a substitute for browser/device acceptance. The service worker never caches `/api/` responses.

## Repeatable Linux service installation

The repository includes a single-host systemd unit, an environment template, and an Nginx reverse-proxy example in [`deploy/`](../deploy/README.md). The recipe runs one Node process with SQLite on the same machine and enforces the existing exact-origin and trusted-proxy checks. It is an installation path for the current self-hosted preview, not multi-host support or release certification. Follow the build, permission, HTTPS, upgrade and backup steps in that guide.

## Same-LAN HTTPS

For a private LAN, provide a certificate trusted by each client and whose subject covers the hostname or IP that clients use. Do not disable certificate verification. Example PowerShell configuration:

```powershell
$env:LOCAT_HOST='0.0.0.0'
$env:LOCAT_PORT='8787'
$env:LOCAT_PUBLIC_ORIGIN='https://locat.example.local:8787'
$env:LOCAT_TLS_KEY='D:\Locat\certs\key.pem'
$env:LOCAT_TLS_CERT='D:\Locat\certs\cert.pem'
$env:LOCAT_DATABASE_FILE='D:\Locat\data\locat.sqlite'
npm start
```

Replace the sample host and paths. Restrict the firewall to the intended private network. A non-loopback listener requires both TLS and `LOCAT_PUBLIC_ORIGIN`; the server checks the request Host and Origin against that exact origin and uses Secure session cookies.

If TLS terminates in a reverse proxy on the same machine, use `LOCAT_HOST=127.0.0.1`, set `LOCAT_TLS_TERMINATION=proxy`, set `LOCAT_PROXY_PEERS` to the proxy's exact socket IP, and set `LOCAT_PUBLIC_ORIGIN` to the external HTTPS origin. The proxy must preserve the public Host and Origin. Do not expose the app's proxy-mode listener to other network peers. Configure forwarded client IP attribution only when the trusted proxy overwrites the selected header with one canonical address. See [CONNECT_ARCHITECTURE.md](CONNECT_ARCHITECTURE.md) for the trust boundary.

## Optional Matrix messaging

Encrypted one-to-one messaging needs a separately operated Matrix homeserver and a configured Locat Matrix sidecar. Follow [MESSAGING_QUICKSTART.md](MESSAGING_QUICKSTART.md), keep the application-service file private and readable only by the service account, and verify the homeserver and browser acceptance before enabling real accounts. Locat's Matrix gateway restricts access to accepted contacts and managed device sessions. There is no federation setup in the supported flow.

## Database backups

Create a consistent SQLite snapshot with a new destination filename:

```sh
npm run backup:server -- /absolute/path/backups/locat-YYYYMMDD-HHMM.sqlite
npm run verify:backup -- /absolute/path/backups/locat-YYYYMMDD-HHMM.sqlite
```

The backup contains password hashes, session hashes and encrypted payloads. It is **not encrypted**; protect it as sensitive account data. Keep backups outside the web root and database directory. The app does not schedule backup retention or verify off-host copies. The Linux deployment package includes an opt-in daily snapshot-and-verify timer; it retains every backup, so operators must monitor disk space and configure retention separately. Preserve the operator identity signing key separately if one is configured; it is not included in the database backup. See [server/README.md](../server/README.md) for restore instructions and journal-file handling.

## Release limitations

- There is no production container image or Compose deployment. The checked-in systemd/Nginx recipe supports a single-host preview installation and has not passed independent host or recovery acceptance.
- Authentication limits are process-local. Multi-worker or multi-host operation is not supported or tested; run one service process with access to one database file.
- Server backups are not encrypted and automated retention is not implemented.
- Browser notifications while the app is closed, Android push, native secure storage and native installers are not available.
- Physical Windows/Android checks, account recovery acceptance, public-network deployment and independent security review are not complete.
- The Vault and Secrets client-encryption design does not replace review of browser storage, device compromise, server operations or recovery procedures.

Do not use this preview to store irreplaceable data or expose it directly to the public internet. A release candidate requires closing the tracked gates in [LOCAT_INTEGRATION_EXECUTION_TRACKER.md](LOCAT_INTEGRATION_EXECUTION_TRACKER.md) and [SESSION_HANDOFF.md](SESSION_HANDOFF.md).
