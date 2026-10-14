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

Sessions are HttpOnly SameSite=Strict cookies. Mutating requests require a matching HTTP Origin. Data is stored in versioned transactional SQLite at `server/data/locat.sqlite` by default and is ignored by Git. Set `LOCAT_DATABASE_FILE` to select another SQLite file. The retired `LOCAT_DATA_FILE` variable fails startup rather than overwriting legacy JSON. No HTTPS termination, rate limiting, or encrypted key management is implemented. Keep the backend bound to loopback; do not expose it on a LAN or the internet.

The live UI currently supports account entry and a truthful signed-in placeholder. The full module UI remains preview-only until live integrations are built. Android, Windows native builds, and release packaging are not verified.

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

Recovery: stop the API, preserve the current database and its `-wal`/`-shm` sidecars together, and point `LOCAT_DATABASE_FILE` at a separate copy of the chosen backup. Start the API and verify accounts before resuming use. Never replace an open SQLite file, or copy only its main file while it is running. Backups are not encrypted; automated retention and a recovery UI are still pending. Schema v1 is created in a transaction; newer unknown schemas fail closed.
