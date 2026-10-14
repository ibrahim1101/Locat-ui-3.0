# Locat UI 3.0: test plan

## Automated (run in CI)
| Command | Covers |
|---|---|
| `npm run check` | TypeScript strict, `noUnusedLocals` |
| `npm run lint` | ESLint flat config, react-hooks rules |
| `npm test` | `src/test/contracts.test.ts`: registry coverage; planned / admin / offline availability; the preview adapter **never** returns `ok` for server operations; http:// is rejected; secret fixtures contain no values; the 15-Unicode-character password policy; CONTROL-STATES composer matrix; Back parent routes |
| `npm run build` | Production bundle with lazy route chunks |

## Responsive matrix (manual or Playwright)
360×780, 390×844, 430×932 portrait. 844×390 landscape. 768×1024. 1280×800. 1440×900. 2560×1080.
Check that: nothing overflows horizontally, chip rows scroll instead of wrapping, the bottom nav is hidden on immersive routes, sheet vs dialog switches at 768, and the sidebar rail switches at 1100.

## Flows
1. Entry: welcome → sign in → integration-pending notice → demo; register guidance; server http:// rejection; local mode → server modules gated.
2. Messages: open a conversation, send (preview-local bubble + violet toast), reply / edit / hide / restore / delete-for-everyone, hidden view replaces the composer, blocked conversation disables controls, key-rotation and former-member states, contacts accept/reject, schedule, location sheet.
3. Media: Cinema filter / sort / folder / player (play, seek, speed, quality, codec error on `v6`). Music play → mini player → Now Playing → EQ bands 5/10/15/31, parametric, bypass, clip warning. Photos limited banner, viewer, editor undo/redo, save as copy.
4. Devices: approve/reject pairing, send sheet, explicit clipboard paste, revoke.
5. Sentinel / Vault / Secrets / Admin / Hub / Search / Offline / Planned / Settings sections.
6. Preview lab: toggle Offline, TLS, Local and non-admin, and check the strips and gates.

## Accessibility
Keyboard-only pass on every screen. Screen reader check: disabled reasons are announced, `role=log` on messages, switches and radiogroups. Run at 200 % text (`Settings › Accessibility › Largest`). Contrast check on all three themes. Reduced motion.

## Physical acceptance (after integration, from the Locat docs)
`docs/UNIFIED_PLATFORM_TESTING.md`, `ANDROID_V1_ACCEPTANCE.md` and the Back gates in `CROSS_DEVICE_MEDIA_AND_ANDROID_BACK_PLAN.md`. Passing in this preview is **not** device acceptance.

## Locat root CI compatibility (ui3/)

`ui3/` lives inside the Locat repo, so the Locat root `npm run lint` (`eslint .` with the
root `eslint.config.js`) also lints `ui3/**/*.{ts,tsx}`. UI 3.0 is kept clean against that
exact config (react-hooks v7 recommended + react-refresh) — 0 errors, 0 warnings from `ui3/`.
The root `tsconfig.app.json` (`include: ["src"]`) and `vitest.config.ts` (explicit `include`)
do not pick up `ui3/`, so root `check`/`test`/`build` are unaffected.

Rules that shaped the code:
- Providers (components) live in `*Provider.tsx`; their contexts and hooks live in a sibling `.ts`
  (`app/back.ts`, `app/drop.ts`, `app/session.ts`, `app/player.ts`, `ui/Toast.ts`, `ui/ContextMenu.ts`).
- No ref reads/writes during render; latest-callback refs sync in `useLayoutEffect`.
- No synchronous `setState` in effects: URL-param sheets are derived from search params, state is
  adjusted during render when a prop changes, and the command palette mounts fresh on open.
- No `Date.now()` during render.

Verify from the Locat repo root: `npm run check && npm run lint && npm run build`, then
`cd ui3 && npm ci && npm run check && npm run lint && npm test && npm run build`.
