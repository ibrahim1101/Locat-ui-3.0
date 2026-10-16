# Locat UI3 current testing status — 2026-10-16

Evidence is for this application, not certification inherited from the original Locat repository. Full roadmap/all-49 scope remains in MASTER_ROADMAP.md and ORIGINAL_LOCAT_REQUIREMENTS.md.

| Check | Observed result |
| --- | --- |
| Current production source | Local 01c1e85bc987ff9f0608997c202f6f065fcce003, accepted within 443963655f3084f8526f44504b6ea3e2ecb7641b |
| Local type/lint/build | Passed |
| Frontend | 262 passed / 65 files |
| Backend | 111 passed |
| Real Synapse/production HTTPS | Guarded controller + refreshed pinned keys, complete encrypted transport, offline restart, tamper/revocation and lost-ack original-event idempotence pass |
| Accepted full browser candidate | 2d0e2ad / workflow 38868622567 / job 116867181610: seven scenarios (1.3m), three repetitions (10.3s); all four jobs succeeded |
| Normal-build follow-on | 413c1cc / workflow 38869589775: all OS jobs passed; browser 116870283567 passed six scenarios but messaging timed out in tamper interception setup |
| Accepted corrected normal build | 4439636 / workflow 38870437274 / browser 116872990381: seven scenarios (56.4s), three repetitions (11.7s); Ubuntu/macOS succeeded, Windows job 116872990651 also succeeded; all four passed |

The accepted full browser flow used actual accounts/cookies/proofs, Contacts UI, mutual SAS, native IndexedDB crypto ownership, composer send/decrypt, unverified-device block, offline delivery after actual Synapse restart, reload/key/trust/history reopening, cross-account denial, ciphertext tamper rejection, live device revocation and Matrix write/database/WAL plaintext checks. The subsequent normal-source run passed through send/offline/reload/cross-account, then failed before a newly intercepted sync request appeared. The corrected handler registers before post-reload sync and enables tampering only later; existing offline checks run without it. The corrected normal build passed the complete browser flow and all repetitions, with no acceptance-only Send build setting.

Default source enables encrypted text after the full accepted candidate; the acceptance-only build setting is removed. This is experimental development, not public-beta, independent security review or physical/international-network acceptance. Read SESSION_HANDOFF.md and MESSAGING_QUICKSTART.md.

Existing browser coverage for Link/private stores/history workers/Photos/Sentinel remains. Three-OS source jobs do not certify native installers, hardware codecs/input, notifications, capture/control or actual TURN relay. Durable sender outbox, broad history/multiple-room lifecycle, full identity recovery/cross-signing, federation/public hosting and native acceptance remain incomplete. Browser-local media remains plaintext as described in the UI.

Historical media acceptance: f3a4183 / workflow 38784656103 passed all four jobs, seven scenarios (40.7s) and three repetitions (12.5s), including native thumbnails/local-readiness. Earlier history is retained in ENGINEERING_HISTORY.md, BROWSER_FOUNDATION_ACCEPTANCE.md and docs/archive/TESTING_STATUS_353ca2b.md.

The working text/UI path now meets the same-homeserver two-user secure-conversation objective in isolated Chromium. Broader durable sender/history/multi-room reliability, real process restart, public/international deployment and native hardware remain separate unfinished work.
