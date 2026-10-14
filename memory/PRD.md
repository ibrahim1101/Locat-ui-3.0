# PRD: Locat UI 3.0

## Original problem statement
Build a permanent, premium UI foundation for the Locat ecosystem. It is presentation-only: React + TypeScript + Vite + Tailwind, no Expo/RN, no new backend, auth, crypto or media engine. Audit the read-only repo `ibrahim1101/Locat` (`release/locat-v1.0`), map all 49 historical requirements and every module, build a design system, a responsive shell (Android, desktop, web), deep core screens, honest previews for planned modules, typed integration contracts and documentation.

## User choices
Standalone Vite project at `/app/locat-ui-3.0` (its own git repo, pushed with "Save to GitHub"). Public repo cloned read-only. Full depth. Full creative freedom.

## Architecture
- `src/contracts`: `LocatUiAdapter` seam (auth, appLock, messaging, media, link, remote, sentinel, privateStore, admin, moduleAvailability), plus `OperationResult` and `Capability`.
- `src/fixtures`: fictional data and `previewAdapter` (always integration-pending).
- `src/app`: registry, session, Android Back contract, player state, honest feedback.
- `src/ui`: Titanium Ember design system. `src/layouts`: shell, sidebar/rail, bottom nav, command palette, preview lab.
- `src/screens`: auth, home, modules, messages, cinema, music, photos, devices, remote, sentinel, vault/secrets, search, hub, admin, diagnostics, offline, planned (workspace/calendar/automate/share/extensions), settings.
- `docs/`: coverage matrix, integration map, design system, platform behavior, test plan, handoff.

## Implemented (2026-10-14)
- Every module and all 49 requirements are mapped. M12/M13 are left unresolved and unnamed.
- Gates pass: tsc, eslint, 12 vitest tests and vite build. Testing agent iteration 1: all checks pass.

## Preview.2 (2026-10-14)
- Huge libraries: `ui/Virtual.tsx` (VirtualList/VirtualGrid), 5k messages / 10k songs / 20k photos / 2k videos stress fixtures.
- Desktop polish: cursor-anchored context menus, drag-and-drop presentation, keyboard roving, command palette.
- Component Gallery at `/gallery`.
- Passes Locat root ESLint config (react-hooks v7 + react-refresh): providers split into `*Provider.tsx`, hooks in sibling `.ts`.
- Gates: tsc, eslint (0 warnings), 18 vitest tests, vite build. Testing agent iteration 2: pass.

## Export fix (2026-10-14)
- `locat-ui-3.0/` was a nested git repo (gitlink), so the GitHub export contained only the Expo/FastAPI starter. Now tracked as regular files (97).
- Starter `frontend/`, `backend/`, `tests/` untracked via .gitignore (kept on disk for the platform). Nested history preserved in `memory/locat-ui-3.0-history.bundle`.
- Destination: ibrahim1101/Locat-ui-3.0 `main` (user pushes via Emergent). Do NOT push to ibrahim1101/Locat.

## Backlog
- P0: implement `LiveLocatAdapter` inside the Locat repo (deferred by user).
- P2: visual regression tests, i18n strings extraction.
