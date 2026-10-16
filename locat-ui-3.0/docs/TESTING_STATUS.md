# Locat UI3 current testing status — 2026-10-16

Evidence is for this application, not certification inherited from the original Locat repository. Full roadmap/all-49 scope remains in MASTER_ROADMAP.md and ORIGINAL_LOCAT_REQUIREMENTS.md.

| Check | Observed result |
| --- | --- |
| Current production source | Local 01c1e85bc987ff9f0608997c202f6f065fcce003, published within 413c1cc5d45255d002f35724547ed837483e57f2 |
| Local type/lint/build | Passed |
| Frontend | 262 passed / 65 files |
| Backend | 111 passed |
| Real Synapse/production HTTPS | Guarded controller + refreshed pinned keys, complete encrypted transport, offline restart, tamper/revocation and lost-ack original-event idempotence pass |
| Accepted full browser candidate | 2d0e2ad / workflow 38868622567 / job 116867181610: seven scenarios (1.3m), three repetitions (10.3s); all four jobs succeeded |
| Normal-build follow-on | 413c1cc / workflow 38869589775: all OS jobs passed; browser 116870283567 passed six scenarios but messaging timed out in tamper interception setup |
| Corrected fixture | Local abc6ebb995a1c97988d17bc9a81affd96950da7d; normal-build browser rerun pending |

The accepted full browser flow used actual accounts/cookies/proofs, Contacts UI, mutual SAS, native IndexedDB crypto ownership, composer send/decrypt, unverified-device block, offline delivery after actual Synapse restart, reload/key/trust/history reopening, cross-account denial, ciphertext tamper rejection, live device revocation and Matrix write/database/WAL plaintext checks. The subsequent normal-source run passed through send/offline/reload/cross-account, then failed before a newly intercepted sync request appeared. The corrected handler registers before post-reload sync and enables tampering only later; existing offline checks run without it. A corrected actual browser pass is still required.

Default source enables encrypted text after the full accepted candidate; the acceptance-only build setting is removed. This is experimental development, not public-beta, independent security review or physical/international-network acceptance. Read SESSION_HANDOFF.md and MESSAGING_QUICKSTART.md.

Existing browser coverage for Link/private stores/history workers/Photos/Sentinel remains. Three-OS source jobs do not certify native installers, hardware codecs/input, notifications, capture/control or actual TURN relay. Durable sender outbox, broad history/multiple-room lifecycle, full identity recovery/cross-signing, federation/public hosting and native acceptance remain incomplete. Browser-local media remains plaintext as described in the UI.

Historical media acceptance: f3a4183 / workflow 38784656103 passed all four jobs, seven scenarios (40.7s) and three repetitions (12.5s), including native thumbnails/local-readiness. Earlier history is retained in ENGINEERING_HISTORY.md, BROWSER_FOUNDATION_ACCEPTANCE.md and docs/archive/TESTING_STATUS_353ca2b.md.
