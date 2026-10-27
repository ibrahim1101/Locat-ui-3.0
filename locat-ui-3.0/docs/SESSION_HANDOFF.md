# Locat UI 3.0 session handoff

Updated 2026-10-27. Continue the development branch `rework/locat-core-scope` in `ibrahim1101/Locat-ui-3.0`. The branch's current GitHub tip is `065d417412479f24917bb74b2e324b20e0fcbfd8`; its tree matches the local source tree exactly. The 36 local commits were recreated through GitHub's connector, so remote commit SHAs differ. The local branch still contains the original SHAs and must not be pushed directly over the published branch.

Read [REWORK_SCOPE.md](REWORK_SCOPE.md) and [LOCAT_INTEGRATION_EXECUTION_TRACKER.md](LOCAT_INTEGRATION_EXECUTION_TRACKER.md) first. [ENGINEERING_HISTORY.md](ENGINEERING_HISTORY.md) records implementation and validation decisions. The repository-level [session handoff](../../docs/SESSION_HANDOFF.md) records publication and remaining release gates.

The current source rebuilds Calendar, Automate, Workspace and Share alongside account/security, encrypted one-to-one Matrix Chat, Link pairing/transfers, and Files & Vault. Cinema/media libraries, Locat Remote and SentinelLab are retired from the current scope. Keep the Obsidian Ember theme, nested navigation and truthful availability boundaries.

Final local validation on `3d1daaf` passes TypeScript, ESLint, all 326 frontend tests, all 119 server tests, production build and `npm audit --audit-level=high` (zero vulnerabilities). The build still reports a large Matrix crypto chunk. Playwright discovers eight browser specs, but Chromium is missing; installing Chromium and Firefox failed when the browser CDN returned a truncated zero-byte archive. The published branch has no combined commit status reported yet; hosted CI is still unverified.

Remaining release gates include hosted CI and browser acceptance, actual installed-PWA and two-account flows, physical-host systemd/Nginx install/upgrade/backup/restore/rollback, Windows/Android/physical-device acceptance, account recovery drills and independent security review. Calendar, Workspace and Automate data remain server-readable; reminders require Locat to stay open and visible; OS/push notifications and file shares are not implemented.

Continue implementation without asking the user to test until the work and automated checks are complete. Do not merge, deploy or publish a release without separate authorization.
