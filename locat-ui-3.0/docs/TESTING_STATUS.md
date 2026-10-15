# Testing status

2026-10-15 Connect foundation checkpoint: TypeScript check, ESLint, production build passed; 110 frontend tests in 36 files and 22 backend tests passed. Included real HTTP proxy-hop auth, HTTPS with trusted synthetic CA, SQLite migration/backup, FFmpeg/FFprobe and cryptographic negative tests. These tests verify their exact software assertions only. See ENGINEERING_HISTORY.md for failures/fixes and CONNECT_TEST_PLAN.md for pending real-device/network/security scenarios. No Docker, Android, Windows installer, Pi ARM64, international E2EE or federation acceptance ran.

Follow-on source checkpoint 7df4d52: check/lint/build and 113 frontend tests/37 files plus 24 backend tests passed. Added actual ws connections/authentication, negative origin/host/path/frame cases, session revocation, safe session inspection and qualified-address isolation. Production dependency audit reported zero vulnerabilities at execution. Docker runtime ws installation remains unexecuted.

Traversal follow-on: check/lint/build and 115 frontend tests/37 files plus 25 backend tests pass. Credential construction/configuration/access and Remote opt-in/relay-only wiring are tested; actual external ICE requests and relay connectivity have not run. This adds no physical/network/platform verification.

Matrix feasibility follow-on: 117 frontend tests/38 files, 25 backend tests, check/lint/build passed. Separate real Matrix/Synapse integration passed with verified synthetic fingerprints, encrypted content/decryption, offline delivery after actual homeserver restart, timeline deduplication, ciphertext-tamper rejection and DB/WAL unique-plaintext-marker absence. Production npm audit reports zero vulnerabilities. Browser lifecycle tests mock SDK/Web Locks, so persistent browser crypto is not platform-verified. See MATRIX_INTEGRATION.md; the live messaging gate remains closed.

Matrix sidecar generator adds a backend configuration test: private files, distinct secrets, restricted application role, closed registration/federation, exact HTTPS and refusal to overwrite. The deployment templates remain runtime-unverified. No full ecosystem completion is claimed.
