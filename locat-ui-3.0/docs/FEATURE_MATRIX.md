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
| Messages/Calls | Contacts; no real private conversation/call flow | API/UI messaging gate enforced; legacy DB tests are not E2EE | None | Security gate closed |
| Remaining master ecosystem | Truthful unavailable live states | Some preview contract tests only | None | Planned; see full MASTER_ROADMAP.md sections A–AM |

Original requirement register: ORIGINAL_LOCAT_REQUIREMENTS.md (all 49 retained). Current live provenance: PORTED_INTEGRATIONS.md. MASTER_ROADMAP.md preserves the complete expanded user directive including Identity, Wallet, emergency, health and all other modules; no feature is dropped by the connectivity reprioritization.
