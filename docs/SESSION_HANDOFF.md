# Locat UI 3.0 session handoff

Updated 2026-10-20. Continue on `rework/locat-core-scope` in `ibrahim1101/Locat-ui-3.0`. Latest published checkpoint: `21cf810` (`Allow Windows proxy test more startup time`). The feature checkpoint `342ebbc` connects the account summary to the actual live Home route; the checkout is clean at the published tip.

## Active direction

Preserve the Obsidian Ember theme and nested navigation/options. Continue retained Locat work in Chat, Link, Files & Vault, account/security and workspace foundations. Standalone media libraries, Locat Remote and SentinelLab are retired. Fresh install is acceptable; no data recovery is requested. Development-branch commits and publication are authorized; do not merge, deploy or publish a release.

Read `docs/REWORK_SCOPE.md` and `docs/LOCAT_INTEGRATION_EXECUTION_TRACKER.md` first. `docs/LOCAT_INTEGRATION_HANDOFF.md` describes the active live architecture; its pre-scope version is archived. `docs/ENGINEERING_HISTORY.md` records implementation decisions and test outcomes.

## Recently published work

- `84a473b` grouped Vault/Secrets into Entries, Backups and Security.
- `e86aadb` stopped Home from presenting fixture conversations/devices as live account data and visibly labels preview fixtures.
- `ee37f1c` added a live server-backed contact summary with accepted-contact and incoming-request counts, cancellation, loading and retry states.
- `af607c0` refreshed the active integration handoff, archived its stale fixture-only predecessor, and corrected the Messages availability description.
- `12e4ffe` opens the nested Requests section from Home when incoming requests exist; otherwise the shortcut opens Contacts.
- `d81921d` routes live Search through account-owned accepted contacts and module results while keeping encrypted message search inside conversations; `678f181` corrects the loading state for accounts with no contacts.
- `342ebbc` mounts the contact/request summary in the actual live Home route, keeps the conversation summary unavailable state honest, and updates browser acceptance for live Home and Search.
- `21cf810` extends the Windows proxy-server readiness window after hosted CI showed the prior three-second limit was too short.

Current Home conversation summaries are still not connected. Do not derive “recent conversations” from contact membership or show preview records as live.

## Validation and hosted status

The latest full local run passes `npm run check`, `npm run lint`, `npm run test:all` (286 frontend tests and 108 server tests), and `npm run build`. The production build retains the known large Matrix crypto chunk advisory. The test suite verifies nested Contacts, server-owned Home counts, route-to-Requests navigation, encrypted messaging, Link and private storage behavior. The two-account Home-to-Requests browser scenario asserts live Home contains no preview conversations or devices, and now checks that global live Search returns no fictional person for a fixture-only query. The spec passes syntax checking and Playwright discovery, but local execution is blocked because the Chromium headless executable is not installed in this workspace. Commit `cf605a3` exposed that browser acceptance was asserting preview Home copy on the separate live Home route; `342ebbc` fixes the expectation and mounts the server-backed summary on live Home. The proxy readiness fix passes focused hosting tests locally. At the latest check, hosted checks for `342ebbc` and `21cf810` were still running; verify the latest commit check-runs before reporting.

The workflow-run summary wrapper filters pull-request runs, so query commit check-runs when verifying push-triggered hosted results.

## Remaining work

- Live Home now includes account-owned contact/request counts and a direct nested Requests shortcut. Live Search uses account-owned accepted contacts and modules; encrypted message search stays inside an open conversation. Continue useful server-backed workspace destinations and truthful unavailable states.
- Connect Home to actual conversation summaries only if the Matrix session can provide a safe, account-scoped local projection.
- Continue encrypted messaging lifecycle and Link real-device/larger-transfer acceptance.
- Keep scheduled sending unavailable until a durable sender can safely use device-held Matrix credentials while the app is closed.
- Physical-device/cross-platform persistence checks, identity recovery limits, single-writer hosting assumptions and independent security review remain open.

Run from `locat-ui-3.0/` for meaningful code batches: `npm run check`, `npm run lint`, `npm run test:all`, `npm run build`. Keep this handoff current after a significant checkpoint.
