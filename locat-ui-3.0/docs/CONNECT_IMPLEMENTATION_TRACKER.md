# Connect implementation tracker

| Priority | Source implementation | Automated validation | Platform/security acceptance |
| --- | --- | --- | --- |
| P0 existing stabilization | Auth, direct TLS, Host/Origin, proofs, UI3 account privacy/contact actions | Foundation API/TLS/negative/migration tests | Independent security review pending |
| P1 homeserver connection | Discovery, instance UUID, manual browser server navigation, readiness retry, authenticated health WebSockets/session inspection; explicit proxy mode and optional deployment templates | Client/unit/real HTTP and HTTPS tests | Public/LAN hardware, Docker/ARM64 and DNS inactive/unverified |
| P2 global identity | Local IDs preserved; qualified local addresses/search and browser device proof | Existing isolation/revocation tests | Authenticated global authority/key lifecycle pending |
| P3 E2EE/offline | Pinned SDK 44.0.0, real synthetic Synapse/Rust crypto and offline-delivery harness, exclusive browser crypto lifecycle, explicit account/device binding, bootstrap gateway and confirmed current-session Matrix logout | Synthetic encryption/verification/offline/tamper acceptance plus binding/gateway/UI tests; full chat/recovery acceptance pending | Gate closed; no real private Send |
| P4 federation | Standards-based direction/dependencies documented | None | Not implemented |
| P5 relay | Encrypted paired Remote signaling plus opt-in shared STUN/TURN configuration and temporary credential issuance | Existing API/crypto tests | Real TURN allocation/relay frames, quality diagnostics and native acceptance pending |
| P6 native | Original source references only | Three-OS source CI does not certify native clients | Windows/Android/Pi physical testing pending |
| P7 beta | Threat boundaries and acceptance procedures documented | Local foundation checks only | Not internet/public-beta ready |

Continuous scope is MASTER_ROADMAP.md; earlier all-49 register remains intact. Next engineering dependency is executable reviewed E2EE integration, account mapping and device verification; global authority/key lifecycle remains pending. Do not equate documentation or a tunnel with completed connectivity.

2026-10-15 managed messaging checkpoint: optional restricted service registration, proof-bound derived account/device provisioning, UI3 managed setup, local public-key binding and managed-token cleanup are implemented and locally tested. Real Synapse acceptance exercises the provisioning module. Complete browser, peer verification/recovery, conversations, federation and native acceptance remain pending; no live chat or full roadmap completion claim.
