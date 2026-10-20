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
| GET | /api/messages | Retired route: 501 |
| POST | /api/messages | Retired route: 501; no plaintext fallback |

Messaging uses the managed Matrix gateway and reviewed Matrix/Rust SDK, with contact/device/session authorization. Legacy `/api/messages` is gated with 501. Actual browser/Synapse acceptance and limits are recorded in ../docs/SESSION_HANDOFF.md and E2EE_SECURITY_MODEL.md; neither a web build nor source CI certifies native or public-network deployment.

Sessions are HttpOnly SameSite=Strict cookies. Mutating requests require a matching HTTP Origin. Data is stored in versioned transactional SQLite at `server/data/locat.sqlite` by default and is ignored by Git. Set `LOCAT_DATABASE_FILE` to select another SQLite file. The retired `LOCAT_DATA_FILE` variable fails startup rather than overwriting legacy JSON. Direct TLS and reviewed SDK client-key management are implemented; native secure storage and full account recovery acceptance remain separate. Keep HTTP development bound to loopback. For explicit same-LAN HTTPS configuration see ../docs/SELF_HOSTING.md; internet deployment is not validated.

The live UI is now the default entry and uses the UI 3.0 shell for account management, contacts, Link transfers, private files, scoped search and account activity. Set VITE_LOCAT_LIVE=false only to open the explicitly separate preview. Unsupported live modules show notices instead of fixtures. Android, Windows native builds, and release packaging are not verified.

## Development checklist

1. Run `npm run check`, `npm run lint`, `npm run test:all`, and `npm run build`.
2. Fix failing checks before integrating more features.
3. Extend database migrations and exercise recovery before real use.
4. Preserve reviewed Matrix SDK/device/session authorization and verified E2EE acceptance before enabling new messaging paths.
5. Add authorization, quotas, rate limiting, backups, and native integration tests before production use.

## Account management

Authenticated `GET /api/auth/sessions` lists only the current account's active sessions, identifying the current one. `POST /api/auth/sessions/revoke` accepts `{id}` and can only revoke a session owned by the caller. These IDs are token hashes, never bearer tokens.

`POST /api/profile` accepts `{displayName}`. `POST /api/auth/password` accepts `{currentPassword,newPassword}`, verifies the current password and transactionally revokes all sessions. The live signed-in screen exposes these controls. Current feature-specific status and native limitations are tracked in ../docs/SESSION_HANDOFF.md.

## Optional global identity signing

Qualified `LC-code@authority` addresses remain descriptive unless the operator configures a stable Ed25519 signing key. Generate a new file with `node tools/generate-server-identity-key.mjs /absolute/path/locat-identity.pem`, then set `LOCAT_IDENTITY_SIGNING_KEY_FILE` to that absolute path before starting the server. Startup fails closed for non-regular, symlinked, broad-permission or non-Ed25519 files on POSIX. On Windows, protect the file with an owner-only ACL. The key stays outside SQLite, user backups and diagnostics; back it up separately under operator control.

With a configured key, `GET /.well-known/locat` publishes a domain-separated signed `(kind, version, serverId, canonical origin)` claim, and account responses publish signed `(kind, version, serverId, canonical origin, immutable account ID, LC code)` claims. Without a key, discovery reports `authenticatedIdentity: false`; ordinary local operation is unchanged. The browser verifies both signatures from nested identity details and can pin the public fingerprint per account and exact origin after the user compares it with the operator through another trusted channel. Signatures establish only that the key signed those fields. They do not prove domain ownership, and no signed rotation or recovery protocol exists. Federation remains disabled. Read ../docs/GLOBAL_IDENTITY_THREAT_MODEL.md before enabling this optional capability.

## Backup and recovery

Run `npm run backup:server -- ./server/data/backups/manual.sqlite` from the app directory. Choose a new filename each time; existing backups are never overwritten. SQLite's online backup API creates a consistent snapshot even with WAL enabled. Backups contain password hashes, session hashes and ciphertext: restrict access just like the live database.

Recovery: stop the API, preserve the current database and its `-wal`/`-shm` sidecars together, and point `LOCAT_DATABASE_FILE` at a separate copy of the chosen backup. Start the API and verify accounts before resuming use. Never replace an open SQLite file, or copy only its main file while it is running. Backups are not encrypted; automated retention and a recovery UI are still pending. Supported additive migrations through schema 17 are applied in transactions; future unknown schemas fail closed.

## Live integration endpoints

- GET /api/contacts: account-scoped relationships and blocked accounts.
- POST /api/contacts/request with {userId}: create an outgoing request.
- POST /api/contacts/respond with {userId,accept}: respond only to an incoming pending request.
- POST /api/contacts/block with {userId,blocked}: toggle blocking; blocking removes the relationship and prevents envelope submissions in either direction.
- GET/POST /api/preferences: persist validated appearance/startup preferences; rejects unknown fields and preview stress-fixture switches.
- GET /api/security/events: latest 100 actual account events, scoped to the caller.

Authentication mutations allow 20 attempts per minute per client address and a 1200-attempt per-minute ceiling per connection peer, with Retry-After responses. The limiter is per process, not a distributed policy. Behind a trusted TLS proxy the client address remains the proxy peer unless `LOCAT_PROXY_CLIENT_IP_HEADER` is explicitly set to `cf-connecting-ip` or `x-forwarded-for`. Configure this only when that exact trusted proxy strips/replaces the chosen header with one canonical client IP; multi-value, invalid and missing headers conservatively fall back to the peer address. `LOCAT_PROXY_PEERS` remains mandatory, and forwarded headers never affect origin validation. Audit storage retention is pending.

## Current UI and API scope

The active app scope is Chat, Link, Files & Vault, account settings, and the surrounding Locat workspace. Obsidian Ember is the default appearance (`#0B0B0C` canvas and `#E86B2C` accent); the official Locat logo remains unchanged. Files has nested Vault and Secrets destinations, and account settings use grouped, focused sections.

Standalone Cinema/video playback, Music/audio libraries, Photos library, media-library streaming and sharing, remote control, and Sentinel/vendor alert integrations are retired from the UI and server routes. Their API paths are unavailable. Ordinary image, voice, and file attachments in Chat remain part of messaging. Link's verified device pairing and encrypted file/text transfers remain active.

**Existing data is preserved.** No media, Sentinel, remote-session, account, message, Link, Vault, or Secrets records are deleted or rewritten by this scope change. Legacy tables stay in place for existing installations and backups. The current development schema is version 17, adding only expiring Link proof state for workers sharing the same SQLite file; it does not change existing account or content rows. New requests to retired endpoints return not-found and do not expose those records. Account activity remains available within Settings → Security.

Diagnostics report connection, TLS, runtime, database and messaging state only. They do not scan or index host media folders. Legacy historical implementation notes elsewhere in this repository describe prior behavior and are not active endpoint guidance; see [REWORK_SCOPE.md](../docs/REWORK_SCOPE.md) for the current scope and [ENGINEERING_HISTORY.md](../docs/ENGINEERING_HISTORY.md) for provenance.
