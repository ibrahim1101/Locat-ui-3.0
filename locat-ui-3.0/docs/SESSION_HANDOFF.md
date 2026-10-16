# Locat UI3 current handoff — 2026-10-16

Continue the full authorized roadmap without routine approval questions. Preserve the current UI3 theme, all 49 original requirements and the complete A–AM ecosystem scope. A commit is a checkpoint, not completion of the project.

## Repository and boundaries

Work only on `integration/locat-core` in `ibrahim1101/Locat-ui-3.0`; application sources/scripts are in the nested `locat-ui-3.0` directory. Read the repository AGENTS.md. The original Locat repo is a read-only feature reference. Ordinary development commits/publication are authorized; main merges, public deployment/DNS, releases, paid resources and destructive changes require separate authorization. Preserve data and use additive schema changes only.

## Current encrypted text UI checkpoint

Starting published `2d0e2ad2f8e423e003e6b57156a3205dc8317f91`; ending local fixture checkpoint **abc6ebb995a1c97988d17bc9a81affd96950da7d** (production source remains 01c1e85bc987ff9f0608997c202f6f065fcce003). The complete browser acceptance candidate passed, so **normal builds now enable encrypted text Send** and the CI-only build setting was removed. The normal-build follow-on still requires its own observed CI result. Legacy `/api/messages` remains 501; live messages use reviewed SDK crypto and the registered-room gateway, never that experiment.

Observed full browser acceptance: source **2d0e2ad**, workflow **38868622567**, browser job **116867181610** passed seven scenarios (**1.3m**) and three foreground repetitions (**10.3s**); all four jobs succeeded. The real built UI scenario creates two accounts/sessions, accepts contacts, rejects/mutually verifies SAS, adopts account-owned native IndexedDB crypto, navigates to both private rooms, blocks an extra unverified device without a send, exchanges encrypted text, delivers once after offline recipient + actual Synapse restart, reloads/rebinds with retained keys/trust/history and replies, rejects cross-account proof/token use and modified ciphertext, revokes the live device through Devices and denies subsequent sync/send. Matrix write capture and both server database/WAL scans exclude synthetic message plaintext. Certificate exception remains isolated to the fixture context. This demonstrates secure conversations in an isolated same-homeserver Chromium setup, not physical/cross-country/public hosting/native acceptance or independent review.

The new source additionally forces a fresh key query through the pinned SDK before send guards: public getUserDeviceInfo(downloadUncached=true) otherwise reads cached keys for already tracked users. The version-isolated bridge uses the same queryKeysForUsers/outgoingRequestProcessor path as upstream, never changes trust and fails closed on runtime incompatibility. Local check/lint/test:all/build pass **262 frontend / 65 files, 111 backend**. Real Synapse/production HTTPS controller acceptance passes with this refresh and the lost-ack original-event check (same transaction/ciphertext, one received message). All source stays on integration/locat-core.

Usage: each user binds in Settings, enables verification, selects the other accepted contact and compares/confirms the exact SAS on both screens. Choose **Keep messaging active**, navigate to Messages and open the contact conversation. All active contact devices must be verified. Closing Settings after explicit adoption preserves crypto; **Stop active messaging** holds ownership until store/lock release completes. Reopening after reload explicitly rebinds the same persistent keys. Tokens stay in memory; account replacement/unmount closes the owner.

Controller protections: current accepted contact/device checks before/after SDK waits; verified recipient keys; exact two-member joined Megolm room; new outbound session per new message; serialized submissions; at most three retries of the original SDK event/transaction after uncertain acknowledgement; no changed draft/device replay; no plaintext fallback. Wire plaintext/local unacknowledged events never project as sent. Decryption failures are explicit. Projection is capped at 200 recent SDK events; initial sync is 50/room. Sent means homeserver accepted, not read/decrypted acknowledgement.

Remaining blockers: durable sender outbox across full client loss; broader pagination/history and multiple-room lifecycle; complete recovery/cross-signing; pending room-creation reconciliation; independent security review; real browser process restart and non-Chromium/native hardware; globally exposed/different-network/country acceptance; federation, calls/TURN, attachments/groups and all ecosystem scope. Do not claim Milestones B–G or production/public-beta readiness from this bounded test.

Normal source published as `413c1cc5d45255d002f35724547ed837483e57f2`. Run **38869589775** passed all three OS jobs and six browser scenarios; browser **116870283567** completed real Send/offline/reload/cross-account checks, then timed out waiting to observe a newly intercepted sync request before the tamper assertion. This was a fixture request-ordering dependency, not an observed plaintext/tamper acceptance. The handler now installs before the post-reload owner starts sync and toggles mutation only for the later test. It no longer relies on an offline pulse producing a new request within 30 seconds; offline/restart assertions still run before interception exists. Crypto failure/no-plaintext/revocation success assertions are unchanged. The corrected normal-build run is pending.

Read MESSAGING_QUICKSTART.md for the operator/user workflow. Both READMEs now describe the live app rather than the original UI-only seed. TESTING_STATUS.md distinguishes the full accepted candidate from the current follow-on.

Exact next action: observe corrected normal-build CI for the current source, repair any regressions without relaxing tests, then record accepted source/CI and continue reliable messaging dependencies (bounded history/multi-room/recovery and durable uncertain-send design) before global hosting activation. Public deployment, DNS, costs, main merge and releases still need separate authorization. No such action occurred.

Commands executed: git fetch/merge; npm run check; npm run lint; npm run test:all; npm run build; targeted owner/controller/Settings tests; node syntax/browser discovery; real fixture restart/scan smoke; LOCAT_TEST_SYNAPSE_PYTHON=/workspace/scratch/8b3ebd8f9a46/synapse-test-env/bin/python npm run test:matrix. Full all-49/A–AM roadmap remains intact.

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
