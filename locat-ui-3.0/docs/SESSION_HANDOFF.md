# Locat UI3 current handoff — 2026-10-16

Continue the full authorized roadmap without routine approval questions. Preserve the current UI3 theme, all 49 original requirements and the complete A–AM ecosystem scope. A commit is a checkpoint, not completion of the project.

## Repository and boundaries

Work only on `integration/locat-core` in `ibrahim1101/Locat-ui-3.0`; application sources/scripts are in the nested `locat-ui-3.0` directory. Read the repository AGENTS.md. The original Locat repo is a read-only feature reference. Ordinary development commits/publication are authorized; main merges, public deployment/DNS, releases, paid resources and destructive changes require separate authorization. Preserve data and use additive schema changes only.

## Critical messaging checkpoint

The 2026-10-16 directive makes secure conversations the immediate priority, ahead of optional recovery/media work. Full ecosystem scope is preserved. Starting local HEAD `5a00c4b` / remote `5bd7e010d529e07cf742933cc919e74793ef0629`; ending source checkpoint `09e7091d792d70cf1dc2813c01d643fc79e4dbf1` (development-branch publication/CI status must be recorded after observation).

Implemented production `POST /api/link/matrix/conversation`: exact cookie/proof/bearer binding, accepted unblocked contact, durable one-room-per-pair reservation, private non-federated Matrix v12 room with Megolm encryption and joined-only history. Uncertain creation stays pending; retries do not blindly create duplicates. Additive schema 15 includes the room registry and backup-verifier manifest. Existing data remains intact; never downgrade the database in place.

The same-origin gateway now permits only registered/contact-authorized room joins, metadata, bounded encrypted history and standard encrypted sends with matching device/curve-key pins. Plaintext sends, room-state writes, arbitrary invitations and foreign rooms remain denied. Authorization is rechecked after upstream waits. UI Send remains disabled. Sync is deliberately still room-free and encrypted to-device key delivery is not yet exposed; this is a server foundation, not operational browser chat or Milestone A completion. See MATRIX_CONVERSATIONS.md.

Commands: `git fetch origin integration/locat-core`, `git merge --ff-only origin/integration/locat-core`, `npm run check`, `npm run lint`, `npm run test:all`, `npm run build`, focused Node room/gateway/migration/backup tests, and `LOCAT_TEST_SYNAPSE_PYTHON=/workspace/scratch/8b3ebd8f9a46/synapse-test-env/bin/python npm run test:matrix`.

Observed local source validation: type/lint/build pass; 250 frontend / 62 files and 107 backend tests pass. Actual Synapse passes production private-room creation, pair discovery, SDK-encrypted send through the protected gateway, real recipient decryption, transaction idempotence, ciphertext-only history and removed-contact denial. The actual HTTPS production server also tests room creation/discovery/join/state with real login/proof/token guards, wrong Origin/token rejection and block denial. Key distribution/recipient synchronization in this synthetic send test still use the direct isolated Synapse path; no end-to-end browser conversation claim. The final post-gateway scan of both homeserver/Locat database and WAL files passed. Failures/fixes are in ENGINEERING_HISTORY.md.

Latest observed prior CI: workflow `38785504517` at `5bd7e01` completed successfully. New source CI/browser acceptance remains pending until observed. No DNS/public exposure/release/main merge occurred.

Exact next dependency: implement bounded proof/contact/device-authorized encrypted to-device key distribution and opt-in registered-room sync with current authorization filtering; exercise both SDK clients entirely through the protected gateway. Then move the crypto session lifetime out of the Settings sheet into an account-scoped owner and wire existing conversation UI. Verify browser send/receive, offline/reload/revocation/tamper/no-plaintext before enabling Send. Cross-signing recovery is not the immediate priority.

## Previous accepted media implementation

The latest production-source changes are in `353ca2b5a28302860aff548a95aa3917142dc4c4`; browser cleanup follow-up `f3a41830cca43b13565f8d1914b136c5eada512d` changes only the test fixture and engineering history. Both are published on the development branch.

Photos now has bounded undo/redo, pointer drawing with cancellation, basic source-file information, local tags/search, explicit SHA-256 duplicate comparison, an import-date timeline and optional persistent thumbnails for eligible new imports. Originals remain the inputs for editing/export/duplicate comparison and original downloads. Timeline is based on browser imports, not camera dates, and excludes server timestamps. Read [PHOTO_EDITING.md](PHOTO_EDITING.md) for cache/drawing/scan/history limits and legacy fallback.

Media storage now aborts synchronous batch failures instead of partially committing earlier puts. A failed cached import retries the same new IDs once without thumbnails. Local hydration controls device readiness independently of server loading; imports await that hydration before publishing additions. Server requests retain expected-owner headers, deadlines, cancellation and generation guards. Unknown server inventory is not reported as a confirmed empty host configuration.

Existing account/session consistency, private encrypted stores, Sentinel incident/token/export flows, Link pairing/transfers and the managed Matrix/SAS/history foundation remain intact. Matrix private conversation APIs remain gated with 501; encrypted history-key import/export is not identity recovery. Never label preview data as live or equate browser/source checks with native certification.

## Validation checkpoint

Local production-source checks passed: TypeScript, lint, 250 frontend tests across 62 files, 105 backend tests and production build. Additional fixture lint and browser discovery passed.

CURRENT_CI: workflow 38784656103 at f3a41830cca43b13565f8d1914b136c5eada512d / browser job 116593436148 passed seven scenarios in 40.7 seconds and three separate foundation repetitions in 12.5 seconds. This includes persisted native WebP inspection, 800×400-to-320×160 resizing, original PNG preservation and local-card/import readiness while fixture server inventory is paused. All four workflow jobs succeeded: Ubuntu, macOS, Windows and Chromium.

Timeline source 488a4fb / workflow 38781851921 passed all four jobs; its browser job passed seven scenarios in 40.4 seconds and three foundation repetitions in 12.2 seconds. Later thumbnail run 38783128218 failed a fixture blob-fetch inspection; run 38784072597 then failed paused-route cleanup. The current fixture reads native IndexedDB and awaits route completion before removing the handler, retaining error propagation and the production CSP. See [ENGINEERING_HISTORY.md](ENGINEERING_HISTORY.md) and [BROWSER_FOUNDATION_ACCEPTANCE.md](BROWSER_FOUNDATION_ACCEPTANCE.md).

## Next work

Continue the critical messaging dependency above. Preserve the previous accepted media features and full A–AM roadmap; do not restart them.

Native installers, physical devices, hardware codecs, TURN/network capture/control, full identity recovery, federation and public hosting remain separate incomplete acceptance/work streams. Do not treat them as implemented merely because a shell or source job exists.

Run `npm run check`, `npm run lint`, `npm run test:all` and `npm run build` from the application directory for meaningful source batches. Matrix changes additionally need the existing pinned Synapse acceptance. Local browser binaries are unavailable; actual Chromium execution is provided by CI. Terminal fetch works; publication uses connected GitHub Git-data tools with exact tree verification and an expected-head lease, without force.

## Scope and preserved history

[MASTER_ROADMAP.md](MASTER_ROADMAP.md), [ORIGINAL_LOCAT_REQUIREMENTS.md](ORIGINAL_LOCAT_REQUIREMENTS.md), [TESTING_STATUS.md](TESTING_STATUS.md), [NATIVE_PLATFORM_STATUS.md](NATIVE_PLATFORM_STATUS.md).

All previous handoff notes are preserved byte-for-byte in [archive/SESSION_HANDOFF_353ca2b.md](archive/SESSION_HANDOFF_353ca2b.md). They are historical checkpoints; this document is the current entry point. Full engineering chronology remains in ENGINEERING_HISTORY.md.
