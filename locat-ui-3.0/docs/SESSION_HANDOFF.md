# Locat UI 3.0 session handoff

Updated 2026-10-24. Continue on `rework/locat-core-scope` in `ibrahim1101/Locat-ui-3.0`. Latest published checkpoint: `5f73a24` (`Document Link resume and connection checks`). Offline connection diagnostics are published in `8a1c02f`. Local checkpoint `36e26b6` adds server-authorized, locally decrypted Home conversation summaries and a real two-account browser assertion; its branch push is pending automatic-review approval. The active UI retains Obsidian Ember styling and nested navigation.

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
- Local `36e26b6` adds an authenticated `matrix/conversations` response restricted to current, accepted one-to-one contacts and ready rooms. Home requests summaries only while the current account's managed Matrix session is active, decrypts previews from that device's SDK timeline, and labels only currently accepted contacts. Group, foreign, unencrypted, removed-contact and malformed rows do not produce summaries. The Matrix browser flow now checks that a peer sees the decrypted message on Home and opens the same conversation from that row.

Current Home conversation summaries are still not connected. Do not derive “recent conversations” from contact membership or show preview records as live.

## Validation and hosted status

Local checks for `36e26b6` pass: TypeScript, ESLint, 298 frontend tests across 67 files (serial run), 109 backend tests, and production build. Four timing-sensitive frontend failures in the parallel run passed when their two test files were rerun alone and in the serial full suite. The build retains the large Matrix crypto chunk advisory. Browser spec syntax and Playwright discovery pass; real Synapse browser acceptance is hosted because its pinned test environment is unavailable locally.

Hosted run `40101881052` on `43cafff` failed only in the Link browser assertion: the check expected 11 writes but the logged actual scenario correctly made 12 (initial text send plus 11 file attempts). The assertion was corrected in `9118708`. Run `40102456079` then passed 7/7 Chromium, 7/7 Firefox, three repeated private-store foreground runs, Ubuntu, Windows, macOS, and connector preparation. Run `40105232427` on `8a1c02f` has passed Ubuntu, Windows and macOS checks plus connector acceptance; browser-foundation is still running its Firefox and repeated private-store checks. Neither run includes the local-only Home summary change in `36e26b6`.

## Remaining work

- Live Home now includes account-owned contact/request counts and a direct nested Requests shortcut. Live Search uses account-owned accepted contacts and modules; encrypted message search stays inside an open conversation. Continue useful server-backed workspace destinations and truthful unavailable states.
- Publish `36e26b6` after automatic review approves the branch update; inspect its hosted two-account Matrix Home assertion and full CI result.
- Continue encrypted messaging lifecycle and Link real-device/larger-transfer acceptance.
- Keep scheduled sending unavailable until a durable sender can safely use device-held Matrix credentials while the app is closed.
- Physical Windows/Android persistence checks, identity recovery limits, single-writer hosting assumptions, reproducible production deployment validation and independent security review remain open.

Run from `locat-ui-3.0/` for meaningful code batches: `npm run check`, `npm run lint`, `npm run test:all`, `npm run build`. The next source checkpoint is `36e26b6`; branch publication and its hosted checks are pending review. Continue account/security and encrypted messaging lifecycle work; retain physical-device, reproducible deployment and independent-review gates. Do not merge, deploy or publish a release.
