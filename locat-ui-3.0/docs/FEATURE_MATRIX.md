# Feature evidence matrix

Implemented, tested, platform-verified and independently security-reviewed are separate statuses. No entire module is certified complete or independently audited. Current local work follows [REWORK_SCOPE.md](REWORK_SCOPE.md); rows marked retired describe the historical full roadmap and are excluded from the October 2026 rework.

| Scope | Implemented live subset | Tests | Platform verified | Remaining state |
| --- | --- | --- | --- | --- |
| Accounts/Contacts | Auth, LC/bio, session security, preferences, cancel/remove/block and server privacy | API + UI/unit, built login/cookie browser flow | Three-OS source/API CI; isolated Chromium/Linux login | Avatars/MFA/native/app lock planned |
| Connect | Discovery/manual browser navigation, retry monitor, proxy termination, authenticated health WebSockets and qualified local addresses | Local client/config/HTTP/TLS | No real LAN/global/Docker | Device subscriptions/global trust/E2EE/federation pending |
| Link | Proved paired browser identities and encrypted text/file chunks, account isolation, consent and cleanup | Crypto/API/UI plus prior two-context Link acceptance; reconstructed modules still need final suite | Prior isolated Chromium/Linux; no physical-device recheck on this checkout | Real LAN, mobile/native and deployment acceptance pending; Remote is retired |
| Cinema/Music/Photos | Retired by current scope | — | — | No live routes, APIs or tables in this rework |
| Vault/Secrets | Experimental client-encrypted records/files/backup and wrapping-passphrase change | Crypto/API/UI; actual Secrets create/rewrap/reload/reopen | Isolated Chromium/Linux round-trip; no native/independent review | Full data-key rotation/recovery/autofill expansion planned |
| Calendar | Account-scoped monthly events, fixed 24-hour/7-day recurring series, revision-checked edits/deletes and app-level foreground reminders | API/database and UI tests cover range expansion, migration and recurrence | None on restored checkout | Server can read event data; editing/deleting applies to the full series; no E2EE or OS notifications; browser acceptance pending |
| Automate | One-time and fixed 24-hour/7-day recurring reminders with edit/pause/delete and shared cross-tab dispatch | API/database and UI tests pass | None on restored checkout | Foreground visible/unlocked delivery only; no arbitrary code; browser acceptance pending |
| Workspace | Teams, pending invites, owner/admin/member roles, shared notes/task board, transactional owner transfer, owner-only deletion and member JSON export | API/database and UI tests cover role boundaries, transfer, export access and cascading deletion; two-account browser acceptance pending | None on restored checkout | Server-readable content; export includes membership and board data; deleting a workspace removes its invites, members, notes and tasks |
| Share | AES-GCM text links with fragment-held key, expiry, ciphertext retrieval, owner revocation, downloadable QR codes, local PWA share-target staging, and install-prompt guidance | API/database, UI and crypto tests pass; QR, handoff, and install-prompt UI tests pass; browser spec added | None on restored checkout | Text-only, 1.5 MB, max 20 active links; bearer-link access; installed-PWA and browser recipient acceptance pending |
| SentinelLab | Retired by current scope | — | — | No live routes, APIs or tables in this rework |
| Messages/Calls | Live experimental managed Matrix setup, native browser crypto lifecycle, room-free peer SAS and history workers; no live conversations/calls | Real Synapse/HTTPS plus actual Chromium setup, exclusive writer, key continuity, mutual SAS, workers/logout | Isolated Chromium/Linux and synthetic Synapse; no native/federation/full recovery | Conversation/call security gate closed |
| Remaining master ecosystem | Truthful unavailable live states | Some preview contract tests only | None | Planned; see full MASTER_ROADMAP.md sections A–AM |

Original requirement register: ORIGINAL_LOCAT_REQUIREMENTS.md (all 49 retained). Current live provenance: PORTED_INTEGRATIONS.md. MASTER_ROADMAP.md preserves the complete expanded user directive including Identity, Wallet, emergency, health and all other modules; no feature is dropped by the connectivity reprioritization.

2026-10-15 managed messaging checkpoint: optional restricted service registration, proof-bound derived account/device provisioning, UI3 managed setup, local public-key binding and managed-token cleanup are implemented and locally tested. Real Synapse acceptance exercises the provisioning module. Complete browser, peer verification/recovery, conversations, federation and native acceptance remain pending; no live chat or full roadmap completion claim.

2026-10-15 continuity/history checkpoint: existing public pins are checked during browser crypto initialization; UI3 can prepare standard password-encrypted room history-key downloads via a cancellable worker. Real Rust crypto on a synthetic IndexedDB adapter reopens with stable keys and decrypts old ciphertext; standard export/wrong-passphrase/fresh-identity import acceptance passes. This does not certify actual browser/disk persistence, import UI, identity recovery, trust verification or live conversations. See MATRIX_HISTORY_KEYS.md for scope and limits.

2026-10-15 import/SAS checkpoint: UI3 local encrypted history import is implemented with standard Matrix crypto, bounded resource/cost preflight and safe store shutdown sequencing. Real Synapse/Rust validates tamper/wrong-password rejection, duplicate import, unchanged identity and historical decryption. Actual SAS protocol cancellation and mutual confirmation pass in the isolated harness; live SAS UI, cross-signing, complete identity recovery and browser persistence acceptance remain pending. Conversation gateway/Send remain gated. See MATRIX_HISTORY_KEYS.md.

2026-10-15 peer checkpoint: current bound/proved sessions can resolve an accepted unblocked local contact's Matrix mapping without tokens, pins or a trust assertion. Key query/claim gateway requests now enforce the same contact boundary and recheck after upstream waits. Actual SAS mismatch/one-sided/mutual confirmation is tested separately on real Synapse. Live verification UX/transport and full browser acceptance are still pending; Send remains gated. See MATRIX_PEER_VERIFICATION.md.

Live verification checkpoint: UI3 now explicitly enables room-free verification sync, selects a real accepted contact/device and presents SDK SAS controls with authorization/key-continuity/stored-trust checks. Real controller/SDK/Synapse acceptance runs through the HTTP gateway using synthetic Locat guards; browser HTTPS/IndexedDB/native acceptance is still pending. A pinned internal SDK tracking adapter requires review/retest on upgrades. Full recovery, large contact pagination and conversations remain unfinished; Send stays gated. See MATRIX_PEER_VERIFICATION.md.


Durable managed Matrix cleanup is implemented with additive schema 13 and transaction-coupled Link revocation; exact scope, worker lifecycle and evidence are in MATRIX_DEVICE_REVOCATION.md. It does not certify remote wiping, account-wide upstream sign-out, unbound-token inventory or full recovery.


Managed setup now records deterministic device intent before upstream issuance under schema 14; this metadata neither grants gateway access nor replaces key binding. Unbound cleanup and operation-lease boundaries are documented in MATRIX_MANAGED_SETUP.md.


Password-confirmed other-session sign-out and transactional password-change authorization are implemented; see SESSION_SECURITY.md for local grant scope, audit atomicity and acceptance evidence.


Account-owned security audit search and cursor pagination are implemented in Sentinel; see ACCOUNT_ACTIVITY.md. This covers retained audit records rather than the full cross-module Timeline roadmap.


Account audit date windows and bounded loaded-result JSON export are implemented; ACCOUNT_ACTIVITY.md defines the readable-file scope and excludes full account/private-key backup or signed-evidence claims.


Operator-only standalone SQLite backup verification is available through verify:backup; BACKUP_VERIFICATION.md defines integrity/checksum/schema scope and excludes full ecosystem restore or decryption claims.

Operator restore:server can publish a checksum-verified standalone SQLite snapshot to a new unused file without activation; see BACKUP_VERIFICATION.md for isolation, stale authentication state and separate sidecar/browser/media recovery scope.

Private-store wrapping passphrase changes are implemented with current-phrase verification in the client and atomic session/config/audit checks in SQLite. This preserves the data key and does not revoke older backups or already-unlocked clients; see PRIVATE_STORAGE.md.

Sentinel incident server filters and cursor paging are implemented in the UI3 live panel; SENTINEL_INCIDENTS.md records owner checks, mutable-order semantics and remaining history/token/vendor acceptance scope.

Sentinel now pages incident lists, token inventory and per-incident event history in UI3. Existing API array fields/defaults remain; SENTINEL_INCIDENTS.md defines cursor/authorization/one-time-secret behavior.

Actual Chromium foundation and two-context Link acceptance are recorded in BROWSER_FOUNDATION_ACCEPTANCE.md. Account-scoped Devices lifetime cancellation/duplicate guards and post-body session/proof/device rechecks are described in LINK_INTEGRATION.md. These do not certify Matrix browsers, native hardware or the complete ecosystem.

Real Chromium managed-device setup, native IndexedDB signing-key continuity, exclusive writer rejection, verification sync and confirmed logout/cleanup passed at 056b778 (workflow 38748818924). See BROWSER_FOUNDATION_ACCEPTANCE.md for exact evidence, certificate/network restrictions and later peer-SAS test status. Settings and transports now isolate account lifetimes and cancel on close; this does not enable conversations or certify full recovery/native clients.

Sentinel can explicitly download bounded readable JSON for loaded incidents and applied filters. SENTINEL_INCIDENTS.md distinguishes this from full archive/history/retention or private backup. The current UI3 theme and account scope are preserved.

Photos now has bounded per-open-photo undo/redo covering existing crop/color/text/reset parameters. PHOTO_EDITING.md defines its nonpersistent history, source preservation and pending real-canvas browser target. Freehand UI, synchronization and native codec/hardware acceptance remain open.
