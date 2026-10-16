# Locat UI3 current handoff — 2026-10-16

Continue the full authorized roadmap without routine approval questions. Preserve the current UI3 theme, all 49 original requirements and the complete A–AM ecosystem scope. A commit is a checkpoint, not completion of the project.

## Repository and boundaries

Work only on `integration/locat-core` in `ibrahim1101/Locat-ui-3.0`; application sources/scripts are in the nested `locat-ui-3.0` directory. Read the repository AGENTS.md. The original Locat repo is a read-only feature reference. Ordinary development commits/publication are authorized; main merges, public deployment/DNS, releases, paid resources and destructive changes require separate authorization. Preserve data and use additive schema changes only.

## Current browser messaging acceptance candidate

Start published `bf24e71b0db6e684cbc75495f42355879b749416`; ending local source `ecd9a9e5d0fa22565f9d1eebb9693c82fb10b55b`. Account-owned crypto/controller and real Contacts-to-conversation UI are implemented. Explicit Keep messaging active transfers the bound handle out of Settings; Stop releases it, and account replacement/unmount closes it. Tokens remain in memory and existing single-writer/pin continuity is retained. Controller checks current accepted contacts, active locally verified devices, exact encrypted two-person membership, rotates each new outbound session, rechecks after async waits and caps original-event uncertain retries at three. No plaintext fallback; projection excludes plaintext wire events and unacknowledged local events.

**Default builds still disable Send.** Only the isolated browser CI job sets `VITE_LOCAT_MESSAGING_ACCEPTANCE=true` at build time. This is an acceptance candidate, not browser messaging success. After its real browser/security scenario passes, enable the default gate and remove the acceptance-only build setting, rerun the normal build/browser suite, then record exact results. Never open legacy `/api/messages` (still 501).

Observed prerequisite CI: run **38866823701** at `bf24e71`, browser **116861467492**, seven scenarios passed (53.6s) and three repetitions passed (12.0s). Actual browser accounts adopted crypto, navigated via sidebar and synchronized both real private rooms with Send disabled. All four jobs succeeded. Source/local results: **261 frontend / 65 files, 111 backend**, type/lint/build pass. Production HTTPS/Synapse used the actual guarded controller, deliberately dropped a server-accepted acknowledgement and confirmed one message, identical transaction and ciphertext. Fixture-only homeserver restart + bounded DB/WAL scan smoke passed. Source commands: check, lint, test:all, build, focused owner/controller/Settings tests, test:matrix with the pinned Python path and browser discovery.

The new browser scenario extends the real Contacts/SAS flow with: an extra unverified contact device blocking Send without ciphertext emission; actual composer send/decrypt; offline recipient plus actual Synapse restart; reload/rebind/native IndexedDB key/trust recovery; reply; cross-account session/proof denial; modified sync ciphertext rejection; live Devices UI revocation and subsequent gateway/send denial; captured Matrix request and both server DB/WAL plaintext scans. These assertions are **pending their own observed CI run**. Browser fixture helpers accept only their fresh synthetic paths, keep homeserver restart local and never expose operator data. Context-only certificate exception remains unchanged.

Exact next task: inspect the new CI result, diagnose its precise failing step if any and fix without relaxing crypto/auth/success assertions. If the complete browser candidate passes, replace the acceptance-only Send configuration with the default enabled gate and verify the normal source/browser build again. Then update milestone status only for actually met criteria; full production-grade messaging, browser restart, broad identity recovery, attachments/groups, remaining outbox/history reliability, public hosting, global physical networks, federation, TURN and native acceptance remain open. Keep all ecosystem/all-49 scope and approval boundaries intact.

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
