# Locat UI 3.0 session handoff

Updated 2026-10-20. Continue on `rework/locat-core-scope` in `ibrahim1101/Locat-ui-3.0`. Latest published checkpoint before current local browser-test addition: `16510ad` (`Refresh current session handoff`). The working tree contains an uncommitted browser acceptance update.

## Active direction

Preserve the Obsidian Ember theme and nested navigation/options. Continue retained Locat work in Chat, Link, Files & Vault, account/security and workspace foundations. Standalone media libraries, Locat Remote and SentinelLab are retired. Fresh install is acceptable; no data recovery is requested. Development-branch commits and publication are authorized; do not merge, deploy or publish a release.

Read `docs/REWORK_SCOPE.md` and `docs/LOCAT_INTEGRATION_EXECUTION_TRACKER.md` first. `docs/LOCAT_INTEGRATION_HANDOFF.md` describes the active live architecture; its pre-scope version is archived. `docs/ENGINEERING_HISTORY.md` records implementation decisions and test outcomes.

## Recently published work

- `84a473b` grouped Vault/Secrets into Entries, Backups and Security.
- `e86aadb` stopped Home from presenting fixture conversations/devices as live account data and visibly labels preview fixtures.
- `ee37f1c` added a live server-backed contact summary with accepted-contact and incoming-request counts, cancellation, loading and retry states.
- `af607c0` refreshed the active integration handoff, archived its stale fixture-only predecessor, and corrected the Messages availability description.
- `12e4ffe` opens the nested Requests section from Home when incoming requests exist; otherwise the shortcut opens Contacts.

Current Home conversation summaries are still not connected. Do not derive “recent conversations” from contact membership or show preview records as live.

## Validation and hosted status

The latest full local run passes `npm run check`, `npm run lint`, `npm run test:all` (282 frontend tests and 108 server tests), and `npm run build`. The production build retains the known large Matrix crypto chunk advisory. The test suite verifies nested Contacts, server-owned Home counts, route-to-Requests navigation, encrypted messaging, Link and private storage behavior. A new two-account Home-to-Requests browser scenario passes syntax checking and Playwright discovery, but local execution is blocked because the Chromium headless executable is not installed in this workspace.

At the latest check, GitHub checks for `12e4ffe` were still running: connector preparation succeeded; Ubuntu, Windows and browser-foundation were in progress; macOS was queued. Verify before reporting a hosted result. The workflow-run summary wrapper filters pull-request runs, so query commit check-runs if needed.

## Remaining work

- Continue useful server-backed workspace destinations and truthful unavailable states.
- Connect Home to actual conversation summaries only if the Matrix session can provide a safe, account-scoped local projection.
- Continue encrypted messaging lifecycle and Link real-device/larger-transfer acceptance.
- Keep scheduled sending unavailable until a durable sender can safely use device-held Matrix credentials while the app is closed.
- Physical-device/cross-platform persistence checks, identity recovery limits, single-writer hosting assumptions and independent security review remain open.

Run from `locat-ui-3.0/` for meaningful code batches: `npm run check`, `npm run lint`, `npm run test:all`, `npm run build`. Keep this handoff current after a significant checkpoint.
