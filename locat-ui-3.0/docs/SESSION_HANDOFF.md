# Locat UI 3.0 session handoff

Updated 2026-10-25. Continue on `rework/locat-core-scope` in `ibrahim1101/Locat-ui-3.0`. The restored remote checkpoint is `18f703f` (`Update Locat hosted release checkpoint`). Home summaries landed in `65ceb22`; `eaf46db` removes mock notification controls and corrects deployment guidance. The active UI retains Obsidian Ember styling and nested navigation.

## Current restore and rebuild status

The scratch checkout had been pruned. It was restored from the remote branch at `18f703f`; the previous local-only commit `c6ffc77` and its unpushed source could not be recovered from GitHub or Library. Do not describe its local Calendar/Workspace/Automate/Share code or previous browser results as present in this checkout. The modules have now been rebuilt locally on top of the restored branch. These changes are not published, and the earlier automatic GitHub upload rejection remains in effect; do not bypass it. Continue local implementation and preserve checkpoints.

The current source adds schema 19–22, account-scoped Calendar CRUD and foreground reminders, client-encrypted text Share links with expiry/revocation, downloadable QR codes and local PWA share-target staging, Workspace invitations/roles/shared notes/tasks, and one-time Automate reminders. PWA incoming text is kept in service-worker IndexedDB for one hour and requires sign-in and user review before an encrypted link is created. See `REWORK_SCOPE.md` for limits and the final evidence status.

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

Home now projects recent conversations from encrypted rooms authorized for the current account and active managed device. It displays only locally decrypted previews and currently accepted contact names; it does not create rooms or use preview fixtures for live accounts. Settings marks OS notifications unavailable rather than presenting non-persistent mock controls.

## Validation and hosted status

The restored source has no hosted CI result yet. Local TypeScript and ESLint pass; `npm run test:all` passes 306 frontend tests across 73 files and 111 server tests; production build succeeds with the existing large Matrix chunk advisory. Playwright discovers 7 browser specs, but no Chromium or Firefox executable is installed in this restored workspace, so browser acceptance for this source has not run. Share QR and PWA staging/review have UI coverage, but installed-PWA receive, sign-in continuation and recipient flow still need real-browser acceptance.

Older hosted runs below describe earlier, published code and are historical only; they do not validate this restored branch tip or the rebuilt local modules. Physical Windows/Android checks, independent security review, deployment/upgrade/rollback, recovery, and hosting remain open release gates.

Run from `locat-ui-3.0/` for meaningful code batches: `npm run check`, `npm run lint`, `npm run test:all`, `npm run build`. Rerun every local check after completing this rebuild. Continue until the retained scope is built; no manual user test is needed before that point. Do not merge, deploy or publish a release.
