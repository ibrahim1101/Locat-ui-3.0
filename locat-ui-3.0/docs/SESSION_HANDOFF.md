# Locat UI3 current handoff — 2026-10-16

Continue the full authorized roadmap without routine approval questions. Preserve the current UI3 theme, all 49 original requirements and the complete A–AM ecosystem scope. A commit is a checkpoint, not completion of the project.

## Repository and boundaries

Work only on `integration/locat-core` in `ibrahim1101/Locat-ui-3.0`; application sources/scripts are in the nested `locat-ui-3.0` directory. Read the repository AGENTS.md. The original Locat repo is a read-only feature reference. Ordinary development commits/publication are authorized; main merges, public deployment/DNS, releases, paid resources and destructive changes require separate authorization. Preserve data and use additive schema changes only.

## Current gated browser integration — 2026-10-16

Starting published HEAD `16fe2040a018bb1d4e12aa27f6f063a584c203a9`; ending local source `0fbf626d11fd1e3ca136a87ed64fb9c70cc3c86e`. Account-owned browser crypto, production conversation controller and real conversation view are implemented. `LiveMatrixSettings` can explicitly transfer a bound handle with **Keep messaging active**; its crypto and exclusive store survive navigation. An explicit Stop closes it. Account replacement/unmount closes the owner; tokens remain in closures only. Ordinary Settings close without transfer keeps the previous release behavior.

Live Contacts now opens a real private conversation. The view reuses UI3 Composer/MessageBubble, displays only successfully decrypted text from encrypted SDK events and explicit missing-key/ciphertext failures, deduplicates IDs and caps projection at 200 events. Attachments/calls/actions remain unsupported. **Send is still hard-gated by conversationSendAccepted=false in LiveConversation.tsx.** No Milestone A/B/C completion claim.

The controller checks current accepted contacts, all active recipient devices' local verified status, Megolm room state and exact two-person joined membership before Send; rotates the outbound session for each new message, rechecks after async work and serializes submissions. Uncertain sends retain the original SDK event and transaction for at most three attempts; changed drafts/device sets cannot silently replay. Pending operations finish before crypto closes. Sync switches to registered rooms without stopping/restarting Rust and requests full initial state once.

Validation commands: npm run check; npm run lint; npm run test:all; npm run build; focused controller/owner/Settings tests; LOCAT_TEST_SYNAPSE_PYTHON=/workspace/scratch/8b3ebd8f9a46/synapse-test-env/bin/python npm run test:matrix. Local type/lint/source tests pass: 261 frontend/65 files, 111 backend. Production HTTPS/Synapse exercised the new controller's guarded send and recipient decryption; the latest original-event retry passed a deliberately lost HTTPS acknowledgement, with identical transaction/ciphertext and exactly one received message. Earlier protected-transport CI 38850540733 at 76908f6 passed all four jobs, seven browser scenarios (39.0s) and three repetitions (12.4s).

Added a built-browser step after actual Contacts/SAS: adopt crypto, navigate via real Messages sidebar links, open both private rooms and require encrypted synchronization while composer remains disabled. New-source CI must be observed. First investigate any fixture/controller regressions without relaxing authorization or success assertions. Next, after gated UI/security integration acceptance, exercise real Send/Receive in the built browser, then offline/reload/persistent-key/revocation/tamper/isolation/no-plaintext acceptance before claiming operational UI messaging. Review retries against server-accepted/lost-response cases, plus owner-stop/single-writer behavior. No public exposure, DNS, release, main merge or costs are authorized.

The full ecosystem/all-49 roadmap remains intact. See MATRIX_CONVERSATIONS.md and ENGINEERING_HISTORY.md for boundaries and previous failures. Native, global hosting, federation, TURN, full identity recovery and pending-room reconciliation remain open.

## Previous accepted media implementation

The latest production-source changes are in `353ca2b5a28302860aff548a95aa3917142dc4c4`; browser cleanup follow-up `f3a41830cca43b13565f8d1914b136c5eada512d` changes only the test fixture and engineering history. Both are published on the development branch.

Photos now has bounded undo/redo, pointer drawing with cancellation, basic source-file information, local tags/search, explicit SHA-256 duplicate comparison, an import-date timeline and optional persistent thumbnails for eligible new imports. Originals remain the inputs for editing/export/duplicate comparison and original downloads. Timeline is based on browser imports, not camera dates, and excludes server timestamps. Read [PHOTO_EDITING.md](PHOTO_EDITING.md) for cache/drawing/scan/history limits and legacy fallback.

Media storage now aborts synchronous batch failures instead of partially committing earlier puts. A failed cached import retries the same new IDs once without thumbnails. Local hydration controls device readiness independently of server loading; imports await that hydration before publishing additions. Server requests retain expected-owner headers, deadlines, cancellation and generation guards. Unknown server inventory is not reported as a confirmed empty host configuration.

Existing account/session consistency, private encrypted stores, Sentinel incident/token/export flows, Link pairing/transfers and the managed Matrix/SAS/history foundation remain intact. The legacy /api/messages experiment remains gated with 501; encrypted history-key import/export is not identity recovery. Never label preview data as live or equate browser/source checks with native certification.

## Validation checkpoint

Local production-source checks passed: TypeScript, lint, 250 frontend tests across 62 files, 105 backend tests and production build. Additional fixture lint and browser discovery passed.

HISTORICAL_MEDIA_CI: workflow 38784656103 at f3a41830cca43b13565f8d1914b136c5eada512d / browser job 116593436148 passed seven scenarios in 40.7 seconds and three separate foundation repetitions in 12.5 seconds. This includes persisted native WebP inspection, 800×400-to-320×160 resizing, original PNG preservation and local-card/import readiness while fixture server inventory is paused. All four workflow jobs succeeded: Ubuntu, macOS, Windows and Chromium.

Timeline source 488a4fb / workflow 38781851921 passed all four jobs; its browser job passed seven scenarios in 40.4 seconds and three foundation repetitions in 12.2 seconds. Later thumbnail run 38783128218 failed a fixture blob-fetch inspection; run 38784072597 then failed paused-route cleanup. The current fixture reads native IndexedDB and awaits route completion before removing the handler, retaining error propagation and the production CSP. See [ENGINEERING_HISTORY.md](ENGINEERING_HISTORY.md) and [BROWSER_FOUNDATION_ACCEPTANCE.md](BROWSER_FOUNDATION_ACCEPTANCE.md).

## Next work

Continue the critical messaging dependency above. Preserve the previous accepted media features and full A–AM roadmap; do not restart them.

Native installers, physical devices, hardware codecs, TURN/network capture/control, full identity recovery, federation and public hosting remain separate incomplete acceptance/work streams. Do not treat them as implemented merely because a shell or source job exists.

Run `npm run check`, `npm run lint`, `npm run test:all` and `npm run build` from the application directory for meaningful source batches. Matrix changes additionally need the existing pinned Synapse acceptance. Local browser binaries are unavailable; actual Chromium execution is provided by CI. Terminal fetch works; publication uses connected GitHub Git-data tools with exact tree verification and an expected-head lease, without force.

## Scope and preserved history

[MASTER_ROADMAP.md](MASTER_ROADMAP.md), [ORIGINAL_LOCAT_REQUIREMENTS.md](ORIGINAL_LOCAT_REQUIREMENTS.md), [TESTING_STATUS.md](TESTING_STATUS.md), [NATIVE_PLATFORM_STATUS.md](NATIVE_PLATFORM_STATUS.md).

All previous handoff notes are preserved byte-for-byte in [archive/SESSION_HANDOFF_353ca2b.md](archive/SESSION_HANDOFF_353ca2b.md). They are historical checkpoints; this document is the current entry point. Full engineering chronology remains in ENGINEERING_HISTORY.md.
