# Engineering history

## 2026-10-14 — Build stabilization and durable account foundation

Starting branch `integration/locat-core`: `5c7985e11efbddcb2de5054fc9e1ae7943ec8f0b`. Original Locat cloned for read-only reference. No legacy data migration performed.

- `f3424ca`: fixed literal newline breaking App.tsx, React session initialization lint error, and Vitest attempting to execute Node backend tests.
- `21912fb`: replaced JSON persistence with relational SQLite schema v1, foreign keys, unique usernames, inbox index, WAL and full synchronous writes. Added consistent online backups and recovery instructions. Added authenticated profile edits, account-scoped session list/revoke, and password changes with atomic all-session revocation. Added live account controls, Node 24 requirement, integration/UI tests and branch CI.

Verified locally: npm ci; npm run check; npm run lint; npm run test:all; npm run build. Frontend: 34 tests in 7 files. Backend: 2 suites covering API auth, envelope validation/isolation, profile editing, password replacement, cross-account revocation protection, database reopen durability, constraints, recipient cursors and restoring a consistent backup. UI tests cover revocation, failure reporting and password field clearing/sign-out. Remote CI, browser visual QA and native builds are unverified.

## Feature completion matrix

| Area | Implemented and tested | Pending |
|---|---|---|
| Build | TypeScript, lint, frontend/backend tests, Vite build | Browser QA, remote CI verification |
| Database | SQLite v1, constraints, durable writes, backup CLI, restore test | Upgrade migrations, retention, encrypted backups |
| Identity | Registration, login/logout, password change, display name | LC codes, avatars, deletion, administrative roles |
| Sessions | Persistence, expiry, account-scoped list/revoke | Device labels, rate limits, HTTPS origin configuration |
| Messaging | Authenticated ciphertext transport, recipient isolation | Reviewed E2EE and chat lifecycle integration |
| Contacts | Exact authenticated username discovery | Friend requests, blocking, groups |
| Cinema/Music/Photos | Preview UI | Actual media integrations |
| Link/Remote | Preview UI | Pairing, transfer, permissions, native capture/control |
| Sentinel/Vault/Secrets | Preview UI | Real events and audited encrypted storage |
| Application modules | Live account controls; preview screens preserved | Home/search/settings/productivity integration |
| Android/Windows | Unverified | Native hosts, permissions, APK/installer builds |
| Self-hosting | Loopback API, backup/recovery instructions | Hardened LAN HTTPS, Docker, monitoring |

Security limitations: ciphertext transport does not establish E2EE; real private messaging is not enabled. The API remains a development service, bound to loopback by default. Backups are sensitive and unencrypted. Device identities, roles, authentication rate limiting and non-loopback HTTPS are not implemented. Never replace an open SQLite database or copy only the main file while WAL is active. Old JSON paths are rejected rather than overwritten.

Next: authentication hardening and persisted settings, followed by contact state and reviewed E2EE library evaluation before connecting the chat UI.
