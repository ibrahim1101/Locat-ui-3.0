# Locat UI3 current testing status — 2026-10-15

This is acceptance evidence for this UI3 application. Original-Locat tests and roadmap implementation labels are feature-reference material, not proof that the new app has those capabilities.

## Current source

Production-source revision: `353ca2b5a28302860aff548a95aa3917142dc4c4`. Fixture cleanup revision: `f3a41830cca43b13565f8d1914b136c5eada512d`.

| Check | Observed result |
| --- | --- |
| TypeScript / ESLint / production build | Passed locally |
| Frontend | 250 passed across 62 files |
| Backend | 105 passed |
| Corrected Chromium CI | Workflow 38784656103 / job 116593436148: seven scenarios passed (40.7s), three foundation repetitions passed (12.5s) |
| Current OS source CI | Ubuntu, macOS and Windows verification jobs passed on workflow 38784656103 |
| Preceding accepted timeline CI | Workflow 38781851921: Ubuntu, macOS, Windows and Chromium jobs passed; seven browser scenarios (40.4s) plus three foundation repetitions (12.2s) |

The current browser scenario tests stored WebP metadata through the fixture account's native IndexedDB, native 800×400-to-320×160 resizing and local cards/import readiness while fixture server inventory is withheld. These assertions now have an observed passing run. Runs 38783128218 and 38784072597 failed Photos fixture inspection/cleanup respectively; the other six scenarios passed in each. No CSP or success assertion was relaxed. Detailed failed/pass evidence remains in [BROWSER_FOUNDATION_ACCEPTANCE.md](BROWSER_FOUNDATION_ACCEPTANCE.md) and [ENGINEERING_HISTORY.md](ENGINEERING_HISTORY.md).

## What the evidence does and does not cover

- Actual Chromium foundation, two-context Link transfer/revocation, managed Matrix store continuity, Contacts-to-SAS comparisons, encrypted history workers, Photos and Sentinel have preceding observed passes. Current thumbnail/readiness additions passed the corrected run.
- Storage regression uses fake-indexeddb: old synchronous clone failure partially committed; explicit abort now preserves existing rows and prevents partial inserts. Provider quota/cache fallback is mocked; real-disk quota behavior is not certified.
- Photo unit/DOM tests cover import-calendar grouping, invalid/legacy timestamps, drawing/history, tags, bounded duplicate hashing, thumbnail bounds/late cleanup and hydration races. Source downloads and original-file preservation also have actual browser assertions.
- Source CI on Windows/macOS/Linux is not a native installer, physical input, hardware codec, background notification, screen-capture/TURN, complete recovery or federation certification.
- Private conversations remain disabled; cloud Photos backup/sync/sharing, camera/EXIF timelines and full identity recovery remain incomplete. Browser-local media/thumbnail copies remain plaintext as described in the UI.

Read [SESSION_HANDOFF.md](SESSION_HANDOFF.md), [MASTER_ROADMAP.md](MASTER_ROADMAP.md), [ORIGINAL_LOCAT_REQUIREMENTS.md](ORIGINAL_LOCAT_REQUIREMENTS.md) and [NATIVE_PLATFORM_STATUS.md](NATIVE_PLATFORM_STATUS.md) before expanding acceptance claims.

Previous testing notes are preserved byte-for-byte in [archive/TESTING_STATUS_353ca2b.md](archive/TESTING_STATUS_353ca2b.md). Historical statements there do not supersede later failures or the current checkpoint.
