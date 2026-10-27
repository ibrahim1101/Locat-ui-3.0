# Locat session handoff

Updated 2026-10-27. Continue work on `rework/locat-core-scope` in `ibrahim1101/Locat-ui-3.0`. The full feature checkpoint was published at `065d417412479f24917bb74b2e324b20e0fcbfd8`; follow-up documentation commits record publication and final validation status. The published tree matches current local `HEAD`.

## Published checkpoint

All 36 local feature commits after `18f703f` were published to the development branch, covering 72 changed files. The initial published tree SHA exactly matched the local feature tree (`d3a992ff9f7f74f370926714ef20169a55146a68`); documentation-only follow-ups were also published and the latest remote tree matches current local `HEAD`. GitHub's connector recreated the commits, so their commit SHAs differ from the local commit SHAs. The local branch retains its original history and must not be pushed directly over the published branch. Development-branch publication is authorized. Merging, deployment, and release publication are not authorized.

The direct Git push failed because the local client has no GitHub credential (`could not read Username for 'https://github.com': terminal prompts disabled`). After the user explicitly approved connector publication, GitHub's commit/tree API published the same 36 changes and messages. The branch ref update used an expected-head check. No other branch was changed.

## Product scope

Read `locat-ui-3.0/docs/REWORK_SCOPE.md` and `locat-ui-3.0/docs/LOCAT_INTEGRATION_EXECUTION_TRACKER.md` for current scope and evidence. Preserve Obsidian Ember styling and nested navigation. Retained areas include account/security, encrypted one-to-one Matrix Chat, Link pairing/transfers, Files & Vault, Workspace, Calendar, Automate, and encrypted text Share. Standalone media libraries, Locat Remote and SentinelLab are retired from this rework.

Final local validation on `3d1daaf` passes TypeScript, ESLint, all 326 frontend tests, all 119 server tests, production build, and `npm audit --audit-level=high` (zero vulnerabilities). The build still reports the Matrix crypto chunk size advisory. Playwright discovers eight browser specs, but execution is blocked because Chromium is missing; installing Chromium and Firefox failed when the browser CDN returned a truncated zero-byte archive. The GitHub connector reports no combined status checks on the published tip yet; hosted CI is still unverified.

## Remaining release gates

- Run and review the published branch's hosted Node, Chromium and Firefox workflows.
- Complete real browser and installed-PWA recipient acceptance, including two-account flows.
- Exercise the Linux systemd/Nginx install, upgrade, backup, restore and rollback recipe on a physical host.
- Complete Windows, Android and physical-device acceptance for Link, app lock and encrypted storage.
- Run account recovery drills and obtain an independent security review.
- Preserve documented limits: Calendar, Workspace and Automate data are server-readable; reminders require Locat to be open and visible; there are no OS/push notifications; Share currently handles text only.

Do not ask the user to test until the implementation and automated checks are complete. Do not merge, deploy or publish a release without separate authorization. Continue independent implementation and keep evidence and remaining limits current in `ENGINEERING_HISTORY.md` and the scope documents.
