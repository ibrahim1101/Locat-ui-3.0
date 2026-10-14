# Locat UI 3.0

Presentation-only UI foundation for the Locat ecosystem.
**React 19 + TypeScript + Vite + Tailwind**, fixture-driven, with typed integration contracts.
It is not connected to live Locat functionality and does not replace Locat's backend, authentication,
encryption, messaging or media engines.

## Where the code is

Everything lives in [`locat-ui-3.0/`](locat-ui-3.0/README.md):

| Path | Contents |
|---|---|
| `locat-ui-3.0/src/screens/` | All module screens: auth, home, messages, cinema, music, photos, devices, remote, sentinel, vault/secrets, search, hub/admin/diagnostics, offline, planned, settings, **gallery** |
| `locat-ui-3.0/src/ui/` | Design-system components, incl. `Virtual.tsx` (virtualized lists/grids), `ContextMenu*.ts(x)` (cursor-anchored menus) |
| `locat-ui-3.0/src/app/` | Shell infrastructure: session, Android back contract, drag-and-drop, player, registry |
| `locat-ui-3.0/src/contracts/` | Typed adapter contracts (`LocatUiAdapter`) for future live integration |
| `locat-ui-3.0/src/fixtures/` | Preview adapter + fixture data, incl. large-library stress sets |
| `locat-ui-3.0/src/test/` | Vitest suites (contracts + enhancements) |
| `locat-ui-3.0/docs/` | Feature coverage matrix, component integration map, design system, platform behavior, test plan, integration handoff |

## Run

```bash
cd locat-ui-3.0
npm ci
npm run dev      # http://localhost:5173
npm run check    # TypeScript
npm run lint     # ESLint (mirrors the Locat root config)
npm test         # Vitest
npm run build    # production build
```

## History

The UI was developed in its own nested git repository. Its full commit history is preserved in
`memory/locat-ui-3.0-history.bundle` (`git clone memory/locat-ui-3.0-history.bundle ui-history`).
