# Locat UI3 current handoff — 2026-10-16

Continue the full authorized roadmap without routine approval questions. Preserve the current UI3 theme, all 49 original requirements and the complete A–AM ecosystem scope. A commit is a checkpoint, not completion of the project.

## Repository and boundaries

Work only on `integration/locat-core` in `ibrahim1101/Locat-ui-3.0`; application sources/scripts are in the nested `locat-ui-3.0` directory. Read the repository AGENTS.md. The original Locat repo is a read-only feature reference. Ordinary development commits/publication are authorized; main merges, public deployment/DNS, releases, paid resources and destructive changes require separate authorization. Preserve data and use additive schema changes only.

## Critical messaging checkpoint

The 2026-10-16 directive prioritizes actual encrypted conversations over optional recovery/media work while preserving the entire ecosystem. First room-bootstrap checkpoint published as `fb97863dc3a935d726edfe1f443615af42c76a8c`. This follow-on starts there and ends at local source `28fe65b5171631e783a93af96d745f7c98c49708`; record the publication/CI SHA after observation.

Production now includes durable one-room-per-accepted-pair creation, private Matrix v12/Megolm/joined-history state, additive schema 15/backup manifest, scoped joins/state/membership/ciphertext history/encrypted sends, exact device/curve-key pins, bounded standard encrypted Olm to-device delivery and bounded key-withheld metadata. Device query responses exclude inactive/unbound devices and reject changed bound pins. Key delivery and all upstream responses recheck current authorization after waits.

Opt-in `GET /_matrix/client/v3/sync?locat_conversations=1` synchronizes only current registered/accepted rooms (maximum 100; 50 timeline events/room, existing 2 MiB total response cap). It strips foreign rooms, plaintext message events, account data and presence; encrypted to-device events require an active bound sender key. Default verification sync stays room-free. Full state is requested only on a client's first transition, never forced on every poll (the latter caused excessive polling/429 in the first expanded test). See MATRIX_CONVERSATIONS.md.

UI Send is still disabled. No production browser conversation controller/session owner is wired yet. Do not call Milestone A/B/C complete. The legacy `/api/messages` experiment remains 501. Pending upstream room creation is deliberately not replayed; reconciliation/cleanup is unfinished. No DNS, public exposure, costs, releases or main merge occurred.

Actual commands: fetch/merge the remote branch; `npm run check`; `npm run lint`; `npm run test:all`; `npm run build`; focused `node --test` room/gateway/key-relay/sync/peer/migration/backup targets; `npm run test -- src/ui/Overlay.test.tsx`; `npm run test:browser -- --list`; `LOCAT_TEST_SYNAPSE_PYTHON=/workspace/scratch/8b3ebd8f9a46/synapse-test-env/bin/python npm run test:matrix`.

Current local results: type/lint/build pass, **252 frontend tests / 63 files and 111 backend tests pass**. Real pinned Synapse/SDK/Rust passes two independently verified SDK clients with key delivery, room sync, send/decrypt entirely behind the protected gateway; offline delivery after an actual homeserver restart; duplicate suppression; tampered ciphertext failure; revoked-device sync denial; and DB/WAL plaintext scans. A separate production HTTPS server test passes real login/Secure-cookie/proof/binding/SAS plus complete encrypted key delivery/room sync/send/decrypt and block/revocation/logout checks. These use synthetic IndexedDB and Node clients, not built-browser conversation UI.

Observed CI for first published source: run **38849371659** at `fb97863`, browser job **116806947302**, all seven main scenarios passed (36.9s), but the repeat step had one Secrets failure and two passes (26.7s); all Windows/macOS/Ubuntu verification jobs passed. The failed repeat showed a visible passphrase dialog and an empty required input, with no rewrap request. The shared Sheet delayed initial-focus callback could steal focus after the user already selected a field; it now preserves focus inside the dialog and has two passing regression tests. This fixes that demonstrated focus behavior; the exact historical CI failure cause is not proven. New-source browser/CI acceptance must be observed, not assumed. Earlier run 38785504517 at 5bd7e01 succeeded.

### Exact next engineering task

Implement the account-scoped production Matrix session owner and conversation controller, then project real data into the existing Inbox/Conversation/Composer UI. `LiveMatrixSettings` currently owns/closes crypto with its Sheet, while live Messages renders `LiveContacts`; shared preview components exist in `src/screens/messages`. Keep single-writer locks, memory-only tokens, account/logout cleanup and explicit verification. Closing/reopening UI must not accidentally stop a live crypto owner. SDK `stopClient()` stops the Rust backend: never stop/restart the same crypto object to switch from verification to room sync. Switch transport mode, abort the old sync request and request full state once instead (see the actual fixture).

Before Send, re-resolve the accepted contact and active devices, require the current pinned recipient devices to be locally verified, require the private room's exact encryption/membership state, rotate/discard the outbound session when authorization changes, and fail clearly on missing/unverified keys. Implement stable transaction IDs and bounded uncertain-send retry without plaintext fallback. Do not turn Send on before actual built two-browser acceptance covers the full flow, offline/reload/revocation/tamper/isolation/no-plaintext checks. Physical/cross-country acceptance and global exposure remain separate. Update the original single-writer Settings browser test deliberately when lifetime semantics change; keep an explicit way to close/release the crypto owner.

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
