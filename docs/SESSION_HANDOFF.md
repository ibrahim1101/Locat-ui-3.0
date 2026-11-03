# Locat session handoff

Updated 2026-11-03. Active repository: `ibrahim1101/Locat-ui-3.0`, development branch `rework/locat-core-scope`. The current code checkpoint is `b2c25e3164a7edd94ffa2e7e8962c14c3db70848`; hosted CI is green on both workflows.

## Current validation

Core workflow [41695280027](https://github.com/ibrahim1101/Locat-ui-3.0/actions/runs/41695280027) passed all five jobs: connector preparation, Ubuntu/Windows/macOS verification, Chromium, Firefox, Matrix, cross-platform browser storage, repeated private-store checks, and the two-account Calendar/Workspace/Automate scenario. UI3 workflow [41695280160](https://github.com/ibrahim1101/Locat-ui-3.0/actions/runs/41695280160) passed check, lint, all tests, build, and the new moderate-severity audit gate. The two-account flow covers Workspace invite/accept, shared task revision/activity, shared recurring Calendar visibility/deletion, and owner-private recurring reminders including pause/delete.

A clean `npm ci`, `npm run check`, `npm run lint`, all 326 frontend tests, all 119 server tests, and `npm run build` pass locally. Full `npm audit` and `npm audit --omit=dev` report zero findings after the root override pins vulnerable lint-tree minimatch to patched 11.0.1. Local Playwright could not launch because browser binaries are absent; hosted Chromium and Firefox pass. The build retains the existing large Matrix crypto chunk advisory.

A tested root override now pins the lint tree to patched `minimatch@11.0.1`. Clean `npm ci`, check, lint, all 326 frontend and 119 server tests, build and full `npm audit` pass with zero findings. The installed ESLint/config-array/TypeScript-ESLint consumers passed lint and project validation with the override. CI now fails on moderate advisories. Hosted CI for the dependency follow-up is pending.

## Remaining physical and independent gates

The automated code checkpoint is ready for physical acceptance, but is not certified release-ready. Complete and record every applicable item in `locat-ui-3.0/docs/PHYSICAL_ACCEPTANCE_CHECKLIST.md`: real Linux install/upgrade/backup/restore/binary rollback behind Nginx; two-account Chat and Link on separate profiles/devices; app-lock and storage behavior; installed-PWA share handoff; and account/device recovery. Windows/Android and native device coverage and an independent security review also remain open. Do not imply CI covers physical deployment, native hardware, cross-device durability, or full account recovery.

Documented product limits remain: Calendar, Workspace and Automate data are readable by the server; reminders require Locat to stay open and visible, with no OS/push notifications; Share handles text only; Messages/Calls remain experimental and gated from ordinary conversations pending security/recovery work.

## Publication and scope

The user explicitly approved publishing the development branch through the GitHub connector. That authorization covers follow-up work on this branch. Do not merge, deploy, tag, or publish a release without separate authorization. Preserve retired scope and styling; see `locat-ui-3.0/docs/REWORK_SCOPE.md` and `locat-ui-3.0/docs/LOCAT_INTEGRATION_EXECUTION_TRACKER.md`.
