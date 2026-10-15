# Testing status

2026-10-15 Connect foundation checkpoint: TypeScript check, ESLint, production build passed; 110 frontend tests in 36 files and 22 backend tests passed. Included real HTTP proxy-hop auth, HTTPS with trusted synthetic CA, SQLite migration/backup, FFmpeg/FFprobe and cryptographic negative tests. These tests verify their exact software assertions only. See ENGINEERING_HISTORY.md for failures/fixes and CONNECT_TEST_PLAN.md for pending real-device/network/security scenarios. No Docker, Android, Windows installer, Pi ARM64, international E2EE or federation acceptance ran.

Follow-on source checkpoint 7df4d52: check/lint/build and 113 frontend tests/37 files plus 24 backend tests passed. Added actual ws connections/authentication, negative origin/host/path/frame cases, session revocation, safe session inspection and qualified-address isolation. Production dependency audit reported zero vulnerabilities at execution. Docker runtime ws installation remains unexecuted.
