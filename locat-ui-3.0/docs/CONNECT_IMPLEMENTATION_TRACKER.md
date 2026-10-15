# Connect implementation tracker

| Priority | Source implementation | Automated validation | Platform/security acceptance |
| --- | --- | --- | --- |
| P0 existing stabilization | Auth, direct TLS, Host/Origin, proofs, UI3 account privacy/contact actions | Foundation API/TLS/negative/migration tests | Independent security review pending |
| P1 homeserver connection | Discovery, instance UUID, manual browser server navigation, readiness retry; explicit proxy mode and optional deployment templates | Client/unit/real HTTP and HTTPS tests | Public/LAN hardware, Docker/ARM64 and DNS inactive/unverified |
| P2 global identity | Local immutable account/LC and browser device proof preserved | Existing isolation/revocation tests | Global identity/key lifecycle pending |
| P3 E2EE/offline | Preferred Matrix feasibility direction documented | No messaging crypto acceptance | Gate closed; no real private Send |
| P4 federation | Standards-based direction/dependencies documented | None | Not implemented |
| P5 relay | Existing encrypted paired Remote signaling | Existing API/crypto tests | STUN/TURN configuration and real frames pending |
| P6 native | Original source references only | Three-OS source CI does not certify native clients | Windows/Android/Pi physical testing pending |
| P7 beta | Threat boundaries and acceptance procedures documented | Local foundation checks only | Not internet/public-beta ready |

Continuous scope is MASTER_ROADMAP.md; earlier all-49 register remains intact. Next engineering dependency is authenticated WebSocket lifecycle and safe session recovery; then global identity and executable reviewed E2EE integration. Do not equate documentation or a tunnel with completed connectivity.
