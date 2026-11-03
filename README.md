# Locat UI 3.0

The Locat UI 3.0 development app combines the existing React/TypeScript UI with a self-hosted Node account/API server and optional private Matrix/Synapse messaging service. Live mode is the default; preview fixtures are separate.

Encrypted text conversations now have actual two-account Chromium acceptance, including SAS verification, offline delivery, reload, tamper and revocation checks. Broader recovery, messaging features, public/global deployment and native-platform validation remain incomplete. This is an experimental development branch, not a public release or independently audited system.

Start with the [current engineering handoff](locat-ui-3.0/docs/SESSION_HANDOFF.md), [messaging guide](locat-ui-3.0/docs/MESSAGING_QUICKSTART.md) and [self-hosting instructions](locat-ui-3.0/docs/SELF_HOSTING.md). The [current scope register](locat-ui-3.0/docs/REWORK_SCOPE.md) supersedes historical media/remote/Sentinel roadmaps. Standalone Cinema, Music, Photos, Remote control and SentinelLab integration are retired. Calendar, Workspace and Automate are not end-to-end encrypted; consult the register for data visibility and platform limits.

## Where the code is

Everything lives in [`locat-ui-3.0/`](locat-ui-3.0/README.md):

| Path | Contents |
|---|---|
| `locat-ui-3.0/src/screens/` | Current Chat, Link, Files & Vault and collaboration screens; use the scope register for active versus retired modules |
| `locat-ui-3.0/src/ui/` | Design-system components, incl. `Virtual.tsx` (virtualized lists/grids), `ContextMenu*.ts(x)` (cursor-anchored menus) |
| `locat-ui-3.0/src/app/` | Shell infrastructure: session, nested navigation, Android back contract and module registry |
| `locat-ui-3.0/src/contracts/` | Typed adapter contracts (`LocatUiAdapter`) for live/preview integration |
| `locat-ui-3.0/src/fixtures/` | Preview adapter + fixture data, incl. large-library stress sets |
| `locat-ui-3.0/src/test/` | Vitest suites (contracts + enhancements) |
| `locat-ui-3.0/docs/` | Feature coverage matrix, component integration map, design system, platform behavior, test plan, integration handoff |

## Run

```bash
cd locat-ui-3.0
npm ci
npm run build
npm start        # built app + API; see HTTPS/Matrix configuration above
# Frontend development: npm run dev and npm run dev:server
npm run check    # TypeScript
npm run lint     # ESLint (mirrors the Locat root config)
npm test         # Vitest
npm run build    # production build
```

## History

The UI was developed in its own nested git repository. Its full commit history is preserved in
`memory/locat-ui-3.0-history.bundle` (`git clone memory/locat-ui-3.0-history.bundle ui-history`).
