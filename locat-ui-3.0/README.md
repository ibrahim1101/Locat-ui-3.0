# Locat UI 3.0

The live Locat UI 3.0 development app, with a self-hosted Node server, authenticated accounts, Link transfers, private files and optional Matrix/Synapse encrypted text conversations. React 19, TypeScript, Vite, Tailwind and Lucide retain the UI 3.0 theme. Preview fixtures remain explicitly separate.

See [SELF_HOSTING.md](docs/SELF_HOSTING.md), [MESSAGING_QUICKSTART.md](docs/MESSAGING_QUICKSTART.md), [SESSION_HANDOFF.md](docs/SESSION_HANDOFF.md) and the complete [MASTER_ROADMAP.md](docs/MASTER_ROADMAP.md). Browser tests do not certify public deployment, independent security review or physical native compatibility.

```bash
npm ci
npm run build
npm start        # built app + API, after operator configuration
# For frontend work: npm run dev and npm run dev:server
npm run check && npm run lint && npm test && npm run build
```

- `src/ui`: design-system components
- `src/theme`: tokens and themes
- `src/contracts`: typed integration seam (`LocatUiAdapter`)
- `src/layouts`: responsive shell (sidebar, rail, bottom nav), command palette, preview lab
- `src/screens`: every Locat module
- `src/app`: registry, session and Back contract
- `src/fixtures`: **preview only**. Fictional data and an adapter that always returns `integration-pending`

Current rework scope: `docs/REWORK_SCOPE.md`. Docs: `docs/LOCAT_FEATURE_UI_COVERAGE.md`, `LOCAT_COMPONENT_INTEGRATION_MAP.md`, `LOCAT_UI_DESIGN_SYSTEM.md`, `LOCAT_PLATFORM_BEHAVIOR.md`, `LOCAT_UI_TEST_PLAN.md`, `LOCAT_INTEGRATION_HANDOFF.md`.

The original Locat repository (`ibrahim1101/Locat`) was inspected read-only and has not been modified.
