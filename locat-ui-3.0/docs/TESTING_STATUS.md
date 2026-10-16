# Locat UI3 current testing status — 2026-10-16

Evidence applies to this app and its exact source, not earlier original-Locat releases or physical platform certification. Full all-49/A–AM scope is preserved.

| Check | Observed result |
| --- | --- |
| Current runtime | Local 6e5eb2e4c93ab52337121cef1f22b2c16187d463, published within 1e8216d385965b06d1de1b59ae3527206df12e6c |
| Latest fixture | 944753443bdc660e995a34e1018c46b71b4ca5db |
| Local check/lint/build | Passed; existing large SDK chunk warning |
| Frontend | 267 passed / 65 files |
| Backend | 111 passed |
| Actual Synapse/HTTPS | Encrypted guarded controller transport, lost-ack idempotence, bounded SDK history, receiving-controller projection after multi-room/full-sync/offline restart, same-device/new-token identical event and current authorization/revocation pass |
| Historical full accepted browser | 4439636 / 38870437274 / 116872990381: seven scenarios 56.4s + three repetitions 11.7s; all four jobs passed |
| Stronger sender diagnostic | 84a14b3 / 38882443056 / 116912144817 failed: retained draft and explicit reconnect refusal; old text locator had not proven acknowledgement |
| Processed-sync fix browser | 1e8216d / 38882934374 / 116913733717 passed real acknowledgement, multi-room/retry/offline/reload/history, stopped at tamper routing flag; not full acceptance |
| Latest complete acceptance | 38884136009 at 9447534 failed one-page-exhaustion fixture assumption; corrected up-to-three-page run pending |
| Separate Chromium process restart | Passed at a941aa3 / 38880790709 / 116906763002 with same native device keys; that workflow's messaging scenario failed |

Current runtime adds processed current-room sync gating, bounded history loading, five-minute/three-attempt uncertain-event retries and non-requeuing decryption observation. The fixture requires actual message-history acknowledgement and successful delivery of a modified ciphertext response before checking rejection. See SESSION_HANDOFF.md for exact failures, actual commands and next task. Full attempt chronology remains ENGINEERING_HISTORY.md and archived handoffs.

No complete reliability/public-beta/native/international-network claim. Durable sender storage, comprehensive old-history/recovery, gateway-process restart/proof recovery, global hosting, federation, actual TURN/media and physical platform acceptance remain open. Browser-local media remains plaintext as described in the UI. Source jobs on three operating systems do not certify native installers/hardware/notifications/control. Current UI3 theme and original media/Link/Sentinel/private-store features remain in scope.


### Accepted expanded messaging checkpoint — 2026-10-16

Source/fixture **3f2d8b646cddcda0cbda78ee6c168120b4105818**, workflow **38884847787**: Ubuntu **116919984756**, Windows **116919985148**, macOS **116919985161**, Chromium **116919985241** all successful. Actual logs confirm 267 frontend / 111 backend tests, enhanced real HTTPS/Synapse acceptance, eight browser scenarios (1.2m) and three repetitions (10.0s). The built UI passed acknowledged encrypted sends, multi-room isolation and setup retry, offline Synapse restart delivery, reload/reply, real bounded history, fulfilled tampered-ciphertext rejection, cross-account denial, live device revocation and plaintext scans. Separate graceful Chromium process restart preserves native keys. This is isolated browser/source CI, not physical native or international-network acceptance. Full recovery, durable outbox, Locat gateway-process restart, federation and TURN remain open. No deployment, key reset, migration or theme change.


### Gateway proof recovery candidate — 2026-10-16

Started published **287140d** after the accepted 3f2d8b6 checkpoint. Ending runtime/fixture source local **4156e66** adds typed HTTP status to Link failures, single fresh private-key proof setup shared by concurrent denied reads, and one read retry. An old rejected token cannot invalidate an already renewed token. Matrix GET transport can similarly renew proof once. POST/PUT and other mutations are never replayed by this recovery layer; persistent denial or revoked-key proof failure remains terminal. Account/session/device guards, keys and ciphertext are unchanged.

Actual gateway restart is added to the built Chromium conversation scenario using the same isolated SQLite database, TLS origin and Synapse. It requires old proof denial, fresh successful sync on both still-open clients, retained history and another acknowledged encrypted UI message, followed by existing tamper/revocation/plaintext checks. **This expanded restart scenario is pending CI; the accepted browser evidence above remains 3f2d8b6 / 38884847787.** Local check/lint/build and 271 frontend / 111 backend tests passed (17 focused proof/transport tests). Commands: `npm run check`, `npm run lint`, `npm run test:all`, `npm run build`, targeted Link/Matrix Vitest tests, `node --check tools/browser-fixture.mjs`, `node --check browser-tests/matrix.spec.mjs`, and `LOCAT_TEST_SYNAPSE_PYTHON=/workspace/scratch/8b3ebd8f9a46/synapse-test-env/bin/python npm run test:matrix` (passed: real HTTPS/Synapse harness). No dependency, migration, deployment or UI theme change. Next: require actual gateway-restart Chromium acceptance, fix any failure, then continue durable encrypted outbox/reconciliation.
