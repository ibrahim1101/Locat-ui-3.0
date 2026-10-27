# Locat UI 3.0 session handoff

Updated 2026-10-27. Continue on `rework/locat-core-scope` in `ibrahim1101/Locat-ui-3.0`. The restored remote checkpoint is `18f703f` (`Update Locat hosted release checkpoint`). Home summaries landed in `65ceb22`; `eaf46db` removes mock notification controls and corrects deployment guidance. The active UI retains Obsidian Ember styling and nested navigation.

## Current restore and rebuild status

The scratch checkout had been pruned. It was restored from the remote branch at `18f703f`; the previous local-only commit `c6ffc77` and its unpushed source could not be recovered from GitHub or Library. The retained modules have since been rebuilt locally. Development-branch publication is authorized after local checks. At `0c56225`, this branch has 23 local commits ahead of `origin/rework/locat-core-scope`; two direct push attempts failed because the Git client cannot read a GitHub credential. Do not route around that credential failure. The local branch remains intact; this does not authorize merging, deployment, or release publication.

The current source adds schema 19–28, personal and active-workspace Calendar CRUD, fixed 24-hour/7-day recurring series and foreground reminders, client-encrypted Share links with expiry, atomic bounded opens, optional separate passphrases, signed-out receiving, revocation, downloadable QR codes and local PWA share-target staging, Workspace invitations/roles/shared notes/tasks/files, activity feed/unread acknowledgements, member JSON export and owner transfer/deletion, and one-time plus fixed 24-hour/7-day recurring Automate reminders. PWA incoming text is kept in service-worker IndexedDB for one hour and requires sign-in and user review before an encrypted link is created. See `REWORK_SCOPE.md` for limits and the final evidence status.

Local-only checkpoints `11df2b0`, `88d7f65`, `d1f92b3`, and `133b985` add QR/PWA share, browser and Node service-worker coverage, fix one-use consumption, and split live screens by route. The Share screen reloads active links after consumption and guides installation through the browser prompt or menu. Route splitting reduces the initial app JS chunk from 598 KB (181 KB gzip) to 339 KB (107 KB gzip); the separate Matrix crypto chunk remains about 1 MB. A direct push attempt after user approval failed because no GitHub credential is available to the local client. The current work remains in the local feature branch; do not bypass the credential failure through another upload path.

## Active direction

Preserve the Obsidian Ember theme and nested navigation/options. Continue retained Locat work in Chat, Link, Files & Vault, account/security and workspace foundations. Standalone media libraries, Locat Remote and SentinelLab are retired. Fresh install is acceptable; no data recovery is requested. Development-branch commits and publication are authorized; do not merge, deploy or publish a release.

Read `docs/REWORK_SCOPE.md` and `docs/LOCAT_INTEGRATION_EXECUTION_TRACKER.md` first. `docs/LOCAT_INTEGRATION_HANDOFF.md` describes the active live architecture; its pre-scope version is archived. `docs/ENGINEERING_HISTORY.md` records implementation decisions and test outcomes.

## Recently published work

- `84a473b` grouped Vault/Secrets into Entries, Backups and Security.
- `e86aadb` stopped Home from presenting fixture conversations/devices as live account data and visibly labels preview fixtures.
- `ee37f1c` added a live server-backed contact summary with accepted-contact and incoming-request counts, cancellation, loading and retry states.
- `af607c0` refreshed the active integration handoff, archived its stale fixture-only predecessor, and corrected the Messages availability description.
- `12e4ffe` opens the nested Requests section from Home when incoming requests exist; otherwise the shortcut opens Contacts.
- `342ebbc` connected live Home to account-owned contact/request counts and routed `/search` through account-scoped live search.
- `21cf810` increased the Windows proxy readiness window after hosted startup exceeded the old three-second test limit.
- `077e1d0` documented the live Home/Search boundaries; `c8a808c` updated the private-store browser flow to open the nested Security section before changing its passphrase.
- `23057ab` restored the complete Matrix browser spec and switched back to the nested Contacts section after accepting a new contact.
- `b19d23b` and `46974d0` covered the cross-tab app-lock signal and returned to Security after re-unlocking a tab.
- `666b461` raised the browser job cap to 35 minutes for Chromium, Firefox and the repeated private-store acceptance.
- `f352c9c` added an interrupted 8 MiB encrypted Link upload test that resumes from 10/33 chunks and verifies the downloaded bytes; hosted Chromium, Firefox and platform checks passed.
- `43cafff` rejects a changed file before resuming a Link upload, including changes in chunks not uploaded before interruption. A keyed account/device fingerprint covers all chunk bytes; the journal stores only the HMAC fingerprint. The browser scenario checks that the changed file causes no additional chunk writes.
- `9118708` corrects that browser scenario's network-write expectation from 11 to 12; the prior run showed the expected request includes the initial text transfer. Hosted run `40102456079` passed Chromium 7/7, Firefox 7/7, all three repeated private-store runs, Ubuntu, Windows, macOS, and connector checks.
- `8a1c02f` connects the Offline & LAN “Test connection” button to a bounded same-origin readiness check, reports success/failure/timeout, and aborts when the screen unmounts.
- `5f73a24` records Link resume and connection-check behavior in the integration handoff.
- `65ceb22` adds an authenticated `matrix/conversations` response restricted to current, accepted one-to-one contacts and ready rooms. Home requests summaries only while the current account's managed Matrix session is active, decrypts previews from that device's SDK timeline, and labels only currently accepted contacts. Group, foreign, unencrypted, removed-contact and malformed rows do not produce summaries. The Matrix browser flow now checks that a peer sees the decrypted message on Home and opens the same conversation from that row.
- Local branch commits `2c51980` and `2f8048e` add race-safe Workspace switching, a Linux preview deployment recipe, scoped Workspace search and result navigation; `4c36da5` and `cce3699` add an optional verified daily backup timer; `65ad758` adds privacy-preserving unified Workspace/Calendar search; `0c56225` adds the Nginx WebSocket health upgrade path. These commits remain unpushed because GitHub credentials are unavailable to this checkout.

Home now projects recent conversations from encrypted rooms authorized for the current account and active managed device. It displays only locally decrypted previews and currently accepted contact names; it does not create rooms or use preview fixtures for live accounts. Global Search now includes accepted contacts, live modules and bounded server search across active Workspace notes, tasks, shared file names, and personal/shared Calendar titles/notes; query terms are limited to 30/minute/account and results include only authorized short snippets. Workspace results open their team and scroll to the matching row; Calendar results select the owning calendar/month and scroll to the event. Settings marks OS notifications unavailable rather than presenting non-persistent mock controls.

## Validation and hosted status

The restored source has no hosted CI result yet. The latest local `npm run check`, `npm run lint`, `npm run test:all` (324 frontend tests across 74 files and 119 server tests), and `npm run build` pass. Workspace refreshes clear prior team data during switches and on failed refresh, with regression coverage for out-of-order responses and failure clearing. Global Workspace/Calendar search has UI, API, membership-isolation and rate-limit coverage. Playwright discovers 8 browser specs but no Chromium or Firefox executable is installed, so browser acceptance for this source did not run. A single-host Linux systemd/Nginx preview deployment recipe and opt-in daily snapshot/verification timer are checked in at `deploy/`; the timer never prunes backups, and neither has been exercised on a physical host. Share QR, bounded opens, optional passphrase decryption, and PWA staging/review have API/UI/crypto/service-worker harness coverage; real browser/PWA recipient acceptance remains open.

Older hosted runs below describe earlier, published code and are historical only; they do not validate this restored branch tip or the rebuilt local modules. Physical Windows/Android checks, independent security review, deployment/upgrade/rollback, recovery, and hosting remain open release gates.

Run from `locat-ui-3.0/` for meaningful code batches: `npm run check`, `npm run lint`, `npm run test:all`, `npm run build`. Rerun every local check after completing this rebuild. Continue until the retained scope is built; no manual user test is needed before that point. Do not merge, deploy or publish a release.
