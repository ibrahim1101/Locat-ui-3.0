# Feature evidence matrix

Implemented, tested, platform-verified and independently security-reviewed are separate statuses. No entire module is certified complete or independently audited.

| Scope | Implemented live subset | Tests | Platform verified | Remaining state |
| --- | --- | --- | --- | --- |
| Accounts/Contacts | Auth, LC/bio, sessions, preferences, cancel/remove/block and server privacy | API + UI/unit | Local Node/Linux only | Avatars/MFA/native/app lock planned |
| Connect | Discovery/manual browser navigation, retry monitor, proxy termination, authenticated health WebSockets and qualified local addresses | Local client/config/HTTP/TLS | No real LAN/global/Docker | Device subscriptions/global trust/E2EE/federation pending |
| Link/Remote | Proved paired browser identities, encrypted chunks/signaling, consent/cleanup | Crypto/API/UI tests | No real two-device/native | Resume/LAN/native/control/TURN pending |
| Cinema/Music/Photos | Local/server media, conversion, playlists/EQ/crop/text | Unit/API/real FFmpeg | No physical codec/browser acceptance | Broader roadmap remains planned |
| Vault/Secrets | Experimental client-encrypted records/files/backup | Crypto/API/UI | No native/independent review | Rotation/recovery/autofill expansion planned |
| Sentinel | Scoped token webhooks, owned incidents/history/actions | API/unit/UI | No native agent acceptance | Monitoring/notifications/retention planned |
| Messages/Calls | Contacts; reviewed Matrix synthetic integration and unwired persistent-crypto lifecycle; no live conversation/call flow | API/UI messaging gate enforced; legacy DB tests are not E2EE | None | Security gate closed |
| Remaining master ecosystem | Truthful unavailable live states | Some preview contract tests only | None | Planned; see full MASTER_ROADMAP.md sections A–AM |

Original requirement register: ORIGINAL_LOCAT_REQUIREMENTS.md (all 49 retained). Current live provenance: PORTED_INTEGRATIONS.md. MASTER_ROADMAP.md preserves the complete expanded user directive including Identity, Wallet, emergency, health and all other modules; no feature is dropped by the connectivity reprioritization.

2026-10-15 managed messaging checkpoint: optional restricted service registration, proof-bound derived account/device provisioning, UI3 managed setup, local public-key binding and managed-token cleanup are implemented and locally tested. Real Synapse acceptance exercises the provisioning module. Complete browser, peer verification/recovery, conversations, federation and native acceptance remain pending; no live chat or full roadmap completion claim.

2026-10-15 continuity/history checkpoint: existing public pins are checked during browser crypto initialization; UI3 can prepare standard password-encrypted room history-key downloads via a cancellable worker. Real Rust crypto on a synthetic IndexedDB adapter reopens with stable keys and decrypts old ciphertext; standard export/wrong-passphrase/fresh-identity import acceptance passes. This does not certify actual browser/disk persistence, import UI, identity recovery, trust verification or live conversations. See MATRIX_HISTORY_KEYS.md for scope and limits.

2026-10-15 import/SAS checkpoint: UI3 local encrypted history import is implemented with standard Matrix crypto, bounded resource/cost preflight and safe store shutdown sequencing. Real Synapse/Rust validates tamper/wrong-password rejection, duplicate import, unchanged identity and historical decryption. Actual SAS protocol cancellation and mutual confirmation pass in the isolated harness; live SAS UI, cross-signing, complete identity recovery and browser persistence acceptance remain pending. Conversation gateway/Send remain gated. See MATRIX_HISTORY_KEYS.md.

2026-10-15 peer checkpoint: current bound/proved sessions can resolve an accepted unblocked local contact's Matrix mapping without tokens, pins or a trust assertion. Key query/claim gateway requests now enforce the same contact boundary and recheck after upstream waits. Actual SAS mismatch/one-sided/mutual confirmation is tested separately on real Synapse. Live verification UX/transport and full browser acceptance are still pending; Send remains gated. See MATRIX_PEER_VERIFICATION.md.
