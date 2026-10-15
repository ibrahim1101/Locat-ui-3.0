# Feature evidence matrix

Implemented, tested, platform-verified and independently security-reviewed are separate statuses. No entire module is certified complete or independently audited.

| Scope | Implemented live subset | Tests | Platform verified | Remaining state |
| --- | --- | --- | --- | --- |
| Accounts/Contacts | Auth, LC/bio, sessions, preferences, cancel/remove/block and server privacy | API + UI/unit | Local Node/Linux only | Avatars/MFA/native/app lock planned |
| Connect | Discovery/manual browser navigation, retry monitor, proxy termination, authenticated health WebSockets and qualified local addresses | Local client/config/HTTP/TLS | No real LAN/global/Docker | Device subscriptions/global trust/E2EE/federation pending |
| Link/Remote | Proved paired browser identities, encrypted chunks/signaling, consent/cleanup | Crypto/API/UI tests | No real two-device/native | Resume/LAN/native/control/TURN pending |
| Cinema/Music/Photos | Local/server media, conversion, playlists/EQ/crop/text | Unit/API/real FFmpeg | No physical codec/browser acceptance | Broader roadmap remains planned |
| Vault/Secrets | Experimental client-encrypted records/files/backup | Crypto/API/UI | No native/independent review | Full key rotation/recovery/autofill expansion planned |
| Sentinel | Scoped token webhooks, owned incidents/history/actions | API/unit/UI | No native agent acceptance | Monitoring/notifications/retention planned |
| Messages/Calls | Contacts; reviewed Matrix synthetic integration and unwired persistent-crypto lifecycle; no live conversation/call flow | API/UI messaging gate enforced; legacy DB tests are not E2EE | None | Security gate closed |
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
