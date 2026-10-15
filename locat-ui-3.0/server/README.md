# Locat 3.0 development API

**Status: local-only development service, not production-ready.** Run from the `locat-ui-3.0/` directory using Node.js 24+.

In PowerShell terminal 1:
```powershell
node server/index.mjs
```

In PowerShell terminal 2:
```powershell
$env:VITE_LOCAT_LIVE="true"
npm run dev
```

Open http://127.0.0.1:5173. Vite proxies /api to 127.0.0.1:8787. Run `npm run test:server` for the backend integration test and `npm run test:all` for frontend plus backend tests. These commands must be executed before claiming a passing build.

## Implemented development endpoints

| Method | Route | Purpose |
|---|---|---|
| GET | /api/ready | Health probe |
| POST | /api/auth/register | Create account |
| POST | /api/auth/login | Issue session cookie |
| GET | /api/auth/me | Current authenticated account |
| POST | /api/auth/logout | Revoke session |
| GET | /api/users/search?q=username | Exact username lookup (authenticated) |
| GET | /api/messages?after=0 | Read current user's encrypted envelopes |
| POST | /api/messages | Submit encrypted envelope to recipient |

Message submissions accept only `recipientId`, `ciphertext`, `nonce`, and `algorithm: "client-e2ee-v1"`. **This is a ciphertext transport contract, not E2EE implementation.** There is no client key exchange, key verification, message encryption/decryption, group messaging, or production message lifecycle. Do not submit real confidential messages or assume arbitrary ciphertext is secure.

Sessions are HttpOnly SameSite=Strict cookies. Mutating requests require a matching HTTP Origin. Data is stored in versioned transactional SQLite at `server/data/locat.sqlite` by default and is ignored by Git. Set `LOCAT_DATABASE_FILE` to select another SQLite file. The retired `LOCAT_DATA_FILE` variable fails startup rather than overwriting legacy JSON. Direct TLS serving is available; encrypted client-key management is not implemented. Keep HTTP development bound to loopback. For explicit same-LAN HTTPS configuration see ../docs/SELF_HOSTING.md; internet deployment is not validated.

The live UI is now the default entry and uses the UI 3.0 shell for account management, contacts, device media, search and account security events. Set VITE_LOCAT_LIVE=false only to open the explicitly separate preview. Unsupported live modules show notices instead of fixtures. Android, Windows native builds, and release packaging are not verified.

## Development checklist

1. Run `npm run check`, `npm run lint`, `npm run test:all`, and `npm run build`.
2. Fix failing checks before integrating more features.
3. Extend database migrations and exercise recovery before real use.
4. Implement a reviewed authenticated E2EE protocol with verified device keys before enabling real messaging.
5. Add authorization, quotas, rate limiting, backups, and native integration tests before production use.

## Account management

Authenticated `GET /api/auth/sessions` lists only the current account's active sessions, identifying the current one. `POST /api/auth/sessions/revoke` accepts `{id}` and can only revoke a session owned by the caller. These IDs are token hashes, never bearer tokens.

`POST /api/profile` accepts `{displayName}`. `POST /api/auth/password` accepts `{currentPassword,newPassword}`, verifies the current password and transactionally revokes all sessions. The live signed-in screen exposes these controls. Device names, avatars, LC codes, account deletion and settings sync remain unimplemented.

## Backup and recovery

Run `npm run backup:server -- ./server/data/backups/manual.sqlite` from the app directory. Choose a new filename each time; existing backups are never overwritten. SQLite's online backup API creates a consistent snapshot even with WAL enabled. Backups contain password hashes, session hashes and ciphertext: restrict access just like the live database.

Recovery: stop the API, preserve the current database and its `-wal`/`-shm` sidecars together, and point `LOCAT_DATABASE_FILE` at a separate copy of the chosen backup. Start the API and verify accounts before resuming use. Never replace an open SQLite file, or copy only its main file while it is running. Backups are not encrypted; automated retention and a recovery UI are still pending. Schemas v1–v4 are applied in transactions; newer unknown schemas fail closed.

## Live integration endpoints

- GET /api/contacts: account-scoped relationships and blocked accounts.
- POST /api/contacts/request with {userId}: create an outgoing request.
- POST /api/contacts/respond with {userId,accept}: respond only to an incoming pending request.
- POST /api/contacts/block with {userId,blocked}: toggle blocking; blocking removes the relationship and prevents envelope submissions in either direction.
- GET/POST /api/preferences: persist validated appearance/startup preferences; rejects unknown fields and preview stress-fixture switches.
- GET /api/security/events: latest 100 actual account events, scoped to the caller.

Authentication mutations allow 20 attempts per minute per socket IP, with Retry-After responses. This per-process development limiter is not a distributed policy; behind a proxy all requests may share a bucket. Audit storage retention is pending.

Device media uses browser IndexedDB, separate from server SQLite and backups. Import is not server upload. Files are not encrypted, and clearing browser storage removes copies. Native background music, tags/artwork, HLS/adaptive streaming and screen control remain pending. Test actual codec playback manually; unit tests cannot prove a browser decoder supports a particular file.

## New server/media and directory scope

`npm start` serves the built UI and API from one origin. `GET /api/media` lists operator-authorized read-only media; `GET/HEAD /api/media/stream/<opaque-id>` provides authenticated byte ranges. See docs/SELF_HOSTING.md for limits, TLS configuration and known platform races. Self-hosting does not enable E2EE or native-client integration.

Schema v4 adds immutable unique four-digit LC directory codes and public bio metadata, preserving account IDs and existing data. Exact username, LC-1234 and bare four-digit code discovery are supported. LC codes have a 9000-account capacity and are not login secrets. API profile changes reject identity-code updates. Bio is limited to 500 characters and is server-visible.

`GET /api/diagnostics` requires authentication and exposes service/SQLite/media status without credentials or absolute host paths. The app polls readiness every 15 seconds while open. Login-first entry and the default Home landing match Locat's later navigation requirement; explicit local mode opens browser media without a fake account. Server actions remain unavailable there. Local mode is not offline password authentication and must be reselected after reload.

The real TLS integration test requires OpenSSL on PATH; it creates temporary keys/certificates and validates using that temporary CA. No production key is read by tests. Docker files are templates and were not executed locally.

## Media compatibility runtime

GET /api/media/probe/<id> requires authentication and bounded FFprobe inspection. GET /api/media/stream/<id>?mode=remux or mode=transcode runs an authorized progressive FFmpeg worker; optional audio=<index> must identify a real audio stream. HEAD and non-initial byte ranges are rejected for conversion. Direct streaming continues to support ranges. File handles remain open through inspection/conversion and close on completion or cancellation. No shell interpolation or arbitrary client path is used. See docs/SELF_HOSTING.md for executable configuration, limits and progressive-input limitations.

Backend tests now require FFmpeg/FFprobe as well as OpenSSL. CI includes source/test/build jobs for Linux, Windows and macOS, but these jobs are not native app builds and their results must be checked before claiming cross-platform runtime acceptance.

### Sentinel incidents

Schema v5 adds account-owned incidents, history and integration-token hashes without replacing existing users or media data. In the live Sentinel screen, create a named token and copy its one-time value into an emitter secret store. Send JSON to `/api/sentinel/webhook?format=generic` with `Authorization: Bearer <token>`; a login cookie does not authorize ingestion. Required `title` (1–200 characters); optional `description` (5000), `source` (64), `fingerprint` (128), `severity` (info/low/medium/high/critical) and `status` (open/firing/resolved). Stable source/fingerprint pairs deduplicate per account. Repeated alerts increase occurrences and preserve the higher severity; resolved alerts close the incident, and a later firing alert reopens it. Acknowledged firing alerts remain acknowledged.

Original Locat nScout and PipelineGuard mappings are available with `format=nscout` or `format=pipelineguard`. These are adapter contracts, not verified integrations with a running vendor emitter. Integration tokens can only write incidents, are SHA-256 hashed at rest, and can be revoked immediately. Up to 20 active tokens per account; ingestion 120 requests/minute/token; body limit 64 KiB measured in UTF-8 bytes. Incident actions require account cookies and the exact trusted Origin. List/detail/history endpoints enforce account ownership. Tokens never authorize incident reads. UI lists latest 100 incidents and 200 history entries; manual refresh updates the view.

Incident descriptions, notes and history are server-readable. Do not send credentials in alerts. Automatic retention/redaction, native health monitoring, push/background notifications and external alert delivery remain pending. Database backups include Sentinel history and token hashes; protect backups as account data.

### Encrypted private-store API

Schema v6 adds privateStores/privateObjects. GET /api/private/vault or /api/private/secrets returns only configuration and object metadata. GET /<module>/<UUID> returns an owned ciphertext envelope and revision. POST /<module>/initialize, /put and /remove require account cookies and the exact trusted Origin; no integration token grants access. Initialize is immutable, put/remove enforce expectedRevision, and quotas are transactional (128 objects/64 MiB ciphertext per account/module). Strict validators reject extra plaintext fields. See docs/PRIVATE_STORAGE.md for crypto, backup/recovery and scope limitations. SQLite backups contain encrypted configuration/objects, not the unlocking passphrase.

### Devices and Link

Schema v7/v8 connects /api/link/register, challenge, prove, devices, heartbeat, rename, pair, confirm and revoke. Protected commands additionally require X-Locat-Device-Proof bound to the valid account cookie/session. Payload routes create immutable metadata, upload bounded encrypted chunks, list/get owned device deliveries and acknowledge/cancel. Roles, pair verification, quota, exact lengths and terminal state are enforced; pair rejection/revocation purges queued chunks. See docs/LINK_INTEGRATION.md for client crypto, readable metadata, restart/expiry and native limits.

### Browser Remote signaling

Schema v9 extends protected /api/link/remote routes with source-decided sessions and encrypted signaling. Account/session/device proof and verified pairs remain mandatory. Roles gate offers/answers, expiry/close/revocation purge signals, and no server capture/control endpoint exists. See docs/REMOTE_INTEGRATION.md for browser consent, direct connectivity and native limitations.

Optional connection infrastructure: see ../docs/CONNECT_ARCHITECTURE.md and ../docs/CONNECT_NETWORK_TRAVERSAL.md for fixed-peer TLS proxying, health WebSockets and protected temporary TURN credentials. No discovery/relay service is enabled by default. Legacy /api/messages now returns an authenticated 501 security gate until reviewed messaging integration is accepted; existing database rows remain preserved.
