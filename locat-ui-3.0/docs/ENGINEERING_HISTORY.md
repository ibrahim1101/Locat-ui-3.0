# Engineering history — current scope rework

Date: 2026-10-20. Earlier records are preserved in `docs/archive/ENGINEERING_HISTORY_2026-10-20_pre-search.md`.

## Retired feature scope

Cinema and standalone media libraries, Locat Remote, and SentinelLab/integrations were removed from active UI, routes and helper code. Schema 18 drops their dedicated tables; core account, messaging, Link, Vault, Secrets and activity data remain. References to retired feature names in active source are limited to compatibility migration/backup code and tests that assert retired routes and tables are absent.

## Nested decrypted Chat search and encrypted text edits

Chat search is a collapsed header disclosure. It matches text and attachment names among up to 200 successfully decrypted messages loaded on this device, keeps terms in component memory, and jumps locally.

The sender can edit an owned decrypted text message from its nested message actions. The edit is a new encrypted event; the target ID and new body remain in ciphertext. Projection requires the edit sender to match the original sender. Attachments and another user's messages are rejected. The sender can also redact an owned encrypted message for everyone from the same nested menu, with a styled confirmation that explains retained backups and saved copies. The deletion controller accepts only the sender’s own encrypted room events, checks the current Locat binding after event lookup, and sends a content-free redaction request. Redacted messages and replies project safe deleted placeholders. Unit coverage checks ownership, forged edits and encrypted send shape; browser coverage exercises the two-account edit and deletion UI and checks that content is not sent in clear text.

## Device app lock

Account → Security now includes a nested device-local app lock. Passcodes are salted and derived with PBKDF2-SHA-256; settings control inactivity timeout and background locking, and users can lock immediately. The lock gates the app UI while leaving the server session intact. Browser storage is not encrypted by this feature, and biometrics remain disabled pending verified platform authentication. Focused tests cover passcode verification, setting/policy lifecycle, and hiding/revealing app content through the gate.

## Validation and publication repair

Local TypeScript, ESLint, all frontend/server tests, production build, browser-spec syntax and Playwright discovery passed after source restoration. The real Matrix browser scenario skipped locally because `LOCAT_TEST_SYNAPSE_PYTHON` is unavailable. Hosted UI and core workflows passed on follow-up commit `dcb872b` (runs `39446767634` and `39446768005`), including Chromium and Firefox Matrix acceptance. The later docs-only scope commit `c511cd0` passed platform jobs and the Chromium/Firefox identity, Link and messaging browser batch (core run `39450561720`). The first restored-source browser run exposed a test-fixture issue: the edit case changed a shared message used by a later step. The test now sends and edits its own unique message. The production build retains its Matrix crypto chunk-size advisory. The app-lock follow-on passes TypeScript, ESLint, 271 frontend tests, 108 server tests and production build locally; its hosted macOS/Linux/Windows checks passed, while the longer browser batch was still running at the deletion checkpoint. The delete-for-everyone change passes TypeScript, ESLint, 272 frontend tests, 108 server tests, production build and focused gateway/transport tests locally. Browser acceptance now covers the nested confirmation, both clients’ deleted placeholder and absence of plaintext in the redaction traffic; it awaits the next hosted Matrix run. The production build retains its Matrix crypto chunk-size advisory.

Earlier publication failures: commit `89e1f36` included a malformed `ConversationSearch.tsx` from a wrong working directory; UI run `39442044980` and core run `39442037749` failed TypeScript on that source. Commit `715f369` repaired the source but its large docs were truncated by the connector. Commits `2788518` and `003585b` then used UTF-8 blob uploads that created empty app-file blobs; their GitHub Actions failures were upload corruption, not source failures. This repair restored the last verified non-empty source snapshot, reapplied encrypted edits and republished changed files using base64. Fetched GitHub blob sizes and SHAs match local file hashes.

## Remaining limits

Search covers loaded messages only. Client-side edit projection can be bypassed by a modified client, so peers should accept only authenticated same-author events. Scheduled sending stays unavailable until it has a durable sender compatible with device-held Matrix credentials. Physical-device and broader identity-recovery acceptance remain open.
