# Locat UI 3.0

A presentation-only UI foundation for the Locat ecosystem. It is built with React 19, TypeScript, Vite, Tailwind and Lucide, and runs standalone on isolated fixtures. It contains no backend, auth, crypto or media engine.

```bash
npm install
npm run dev      # http://localhost:5173
npm run check && npm run lint && npm test && npm run build
```

- `src/ui`: design-system components
- `src/theme`: tokens and themes
- `src/contracts`: typed integration seam (`LocatUiAdapter`)
- `src/layouts`: responsive shell (sidebar, rail, bottom nav), command palette, preview lab
- `src/screens`: every Locat module
- `src/app`: registry, session, Back contract, player state
- `src/fixtures`: **preview only**. Fictional data and an adapter that always returns `integration-pending`

Docs: `docs/LOCAT_FEATURE_UI_COVERAGE.md`, `LOCAT_COMPONENT_INTEGRATION_MAP.md`, `LOCAT_UI_DESIGN_SYSTEM.md`, `LOCAT_PLATFORM_BEHAVIOR.md`, `LOCAT_UI_TEST_PLAN.md`, `LOCAT_INTEGRATION_HANDOFF.md`.

The original Locat repository (`ibrahim1101/Locat`) was inspected read-only and has not been modified.
