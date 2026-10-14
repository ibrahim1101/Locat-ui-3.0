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

## 2026-10-14 — Live UI shell, media ports, contacts and security

Previous verified batch published through connected GitHub as bab505227674ea7aa7e1fd6149842dee25520b54; terminal Git push lacked credentials. Remote publication combined the local commits listed above.

Original feature reference: Locat integration/ui3 at 2e39492. Ported tested music EQ, queue, presets, playback progress, image editing and photo editing helpers; preserved GPL-3.0 license and source attribution. Live mode now defaults on and uses the premium UI 3.0 shell. Preview-only routes are gated behind explicit preview mode.

Integrated local media imports in account-scoped IndexedDB, favorites, albums, sorting, downloads, real video/audio/image elements, video resume, fullscreen/PiP callbacks, music shuffle/repeat and graphic 5/10/15/31-band DSP with custom presets, and non-destructive JPEG photo export. Home/module launcher and search use actual imported media, never demonstration items. Music currently stops when leaving its screen; no server media or native background playback claims.

SQLite migrations v2 and v3 add persisted preferences, account audit events, contacts and blocks. New live contacts support requests, recipient-only acceptance/decline and blocking. Blocked pairs cannot send envelopes or discover one another. Sentinel displays actual login, password and contact/session events. Added original-style bounded authentication rate limiting (20/min/socket IP). These are development controls, not production hardening.

Validation: frontend helper, UI and IndexedDB suites; backend authorization, settings isolation, audit, contact lifecycle/blocking, throttle headers, v1-to-v3 migration preservation and future-schema rejection. Build/type/lint checks pass. Browser visual QA, media codec decoding, native builds and remote CI status must be verified separately.

### Updated completion matrix

| Module | Live in UI 3.0 | Still pending |
|---|---|---|
| Home / Modules / Search | Real module launcher, imported library counts and local media search | Decrypted message and server media search |
| Messages | Contacts, friend requests, accept/decline, blocks | Verified E2EE and conversation lifecycle |
| Cinema | Device file persistence, native video element, premium controls, resume, fullscreen/PiP | Subtitles, audio tracks, server streaming/transcoding, video thumbnails/playlists |
| Music | Device audio playback, queue stepping, shuffle/repeat, graphic EQ and presets | Metadata/artwork, playlists, cross-screen/background playback |
| Photos | Actual gallery, albums, favorites, zoom, rotation/flip/adjustments, edited copy download | Native scanning, full-resolution exports, annotations/crop UI |
| Settings | Persisted theme, profile, passwords and session controls | Full settings forms, avatars, LC codes |
| Sentinel | Real account audit events | Device security events, alert workflow, webhooks |
| Link / Remote / Vault / Secrets / native apps | No fabricated live state | Original implementation adaptation and validation |

Next dependencies remain server media access, reviewed messaging protocol integration, Link/Remote platform ports, encrypted private storage and native packaging. All original integrations are not yet ported.
