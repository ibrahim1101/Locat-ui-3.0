# Locat session handoff

Updated 2026-11-03. Active repository: `ibrahim1101/Locat-ui-3.0`, development branch `rework/locat-core-scope`. The latest code checkpoint is `e1e4fe8896ef24a991a186c1ff996e30870bbd08`; its hosted CI is green. The user asked to complete all work that can be done before physical testing.

## Current validation

Core workflow [41621564711](https://github.com/ibrahim1101/Locat-ui-3.0/actions/runs/41621564711) passed connector preparation, Ubuntu/Windows/macOS verification, Chromium, Firefox, Matrix, cross-platform browser storage, repeated private-store checks, and the new two-account Calendar/Workspace/Automate scenario. Workflow [41621564595](https://github.com/ibrahim1101/Locat-ui-3.0/actions/runs/41621564595) passed UI3 check, lint, full tests and build. The new browser flow covers workspace invite/acceptance, shared task revision/activity, shared recurring Calendar visibility/deletion, and owner-private recurring reminders including pause/delete.

Local validation on the code checkpoint passed `npm run check`, `npm run lint`, all 326 frontend tests, all 119 server tests, and `npm run build`. Local Playwright could not launch because browser binaries are absent; hosted Chromium and Firefox ran the acceptance successfully. Build emits the existing large Matrix crypto chunk advisory.

`npm audit --omit=dev` reports zero production dependency vulnerabilities. Full `npm audit` reports 12 moderate findings in the development lint-tooling dependency chain, all stemming from the `minimatch` globparts denial-of-service advisory. The lockfile resolves vulnerable `minimatch@10.2.6`; upstream currently lists 11.0.1 as patched. An override to 11 can break APIs used by lint plugins, and ESLint has an open request to migrate. Keep this dependency finding open until upstream-compatible releases are available and validated; do not use an unverified override. [Advisory](https://github.com/advisories/GHSA-g3hv-75wg-m249).

## Remaining physical and independent gates

The automated code checkpoint is ready for physical acceptance, but is not certified release-ready. Complete and record every applicable item in `locat-ui-3.0/docs/PHYSICAL_ACCEPTANCE_CHECKLIST.md`: real Linux install/upgrade/backup/restore/binary rollback behind Nginx; two-account Chat and Link on separate profiles/devices; app-lock and storage behavior; installed-PWA share handoff; and account/device recovery. Windows/Android and native device coverage and an independent security review also remain open. Do not imply CI covers physical deployment, native hardware, cross-device durability, or full account recovery.

Documented product limits remain: Calendar, Workspace and Automate data are readable by the server; reminders require Locat to stay open and visible, with no OS/push notifications; Share handles text only; Messages/Calls remain experimental and gated from ordinary conversations pending security/recovery work.

## Publication and scope

The user explicitly approved publishing the development branch through the GitHub connector. That authorization covers follow-up work on this branch. Do not merge, deploy, tag, or publish a release without separate authorization. Preserve retired scope and styling; see `locat-ui-3.0/docs/REWORK_SCOPE.md` and `locat-ui-3.0/docs/LOCAT_INTEGRATION_EXECUTION_TRACKER.md`.
