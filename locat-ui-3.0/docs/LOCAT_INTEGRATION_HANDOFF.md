# Locat UI 3.0 implementation handoff

Updated 2026-10-20. This is the active implementation handoff for `rework/locat-core-scope` in `ibrahim1101/Locat-ui-3.0`. The older design-to-integration handoff is preserved at `docs/archive/LOCAT_INTEGRATION_HANDOFF_pre_core_scope.md` for provenance only.

## Current product scope

Locat is a runnable React, TypeScript and Vite application backed by the same-origin Locat server in `server/`. The server provides account authentication, sessions, contacts, device-bound Link, optional Matrix messaging, encrypted private storage, account activity and signed identity discovery. Local and preview adapters remain presentation/testing modes; they must never make sample data appear as a live account record.

Keep the Obsidian Ember visual system, shared controls, responsive layouts and nested destination hierarchy. Current product priorities are Chat, Link, Files & Vault, account/security and useful workspace foundations.

Retired scope: standalone Cinema and media libraries, Music, Photos library/editor, host media scanning/streaming/sharing, Locat Remote, Link remote-signaling, SentinelLab and its incident/webhook/vendor integrations. Do not restore their routes, services, data models or helper modules. Ordinary encrypted Chat attachments remain supported. Fresh installation is acceptable; data recovery is not requested.

## Live behavior and trust boundaries

- Server-owned operations must use same-origin authenticated APIs and enforce ownership on the server. `accountRequest` carries an expected account ID to prevent stale-tab actions crossing account switches.
- Local mode has no authenticated account authority. It cannot access account discovery, sessions, contacts, Link or private server stores.
- Chat uses verified one-to-one Matrix rooms through the scoped gateway. Message content and attachments are encrypted on the device. Never infer delivery from a queued transfer or claim recovery of missing encryption keys.
- Link uses per-browser signing keys, dual-confirmed pairings and encrypted text/file payloads. Queued means stored, not delivered.
- Vault and Secrets encrypt entries in the browser before server storage. Their passphrase is independent of the login password.
- The app lock is a device-local privacy gate, not browser-storage encryption. Biometrics remain disabled pending verified platform authentication.
- Signed identity disclosures verify authority/account claims and support explicit, per-account browser pinning. A signature does not prove domain ownership.
- Preview fixtures are allowed only in preview mode and must be labeled. If live data is not connected, show a truthful empty/unavailable state.

## Navigation and UI

Keep related options inside nested sections or disclosures rather than flattening them onto one page. Messages groups Contacts, Requests, Find people and Blocked. Link groups Devices, Pairings and Transfers. Vault and Secrets group Entries, Backups and Security; credential and secure-note types stay nested inside the Secrets editor. Live account settings group Profile, Messaging privacy, Sessions, Security, and Messaging devices. Preserve the current theme tokens and shared `Screen`, `Sheet`, `Button`, `TextField`, `Switch`, `StateView` and other `src/ui` controls.

Buttons inside forms must explicitly use `type="submit"`. Browser `prompt` and `confirm` are not application UI. Keep accessibility labels, status/error announcements, loading and retry states, and responsive behavior.

## Validation and open acceptance

For meaningful code batches, run from `locat-ui-3.0/`:

```sh
npm run check
npm run lint
npm run test:all
npm run build
```

The latest locally validated dashboard batches pass these checks. The build reports the existing large Matrix crypto chunk advisory. Hosted status for the latest connector-published commits is not available through the current GitHub status/run endpoints; do not describe local checks as hosted checks.

Continue remaining work in `docs/LOCAT_INTEGRATION_EXECUTION_TRACKER.md`. Open acceptance includes real two-device and physical-device behavior, larger transfers, cross-platform storage behavior, identity recovery limits, single-writer hosting assumptions and independent security review. Scheduled sending stays unavailable until a durable sender can safely operate with device-held Matrix credentials while the app is closed.

Do not merge to `main`, deploy public services or publish releases. Ordinary implementation, testing, development commits and publication to `rework/locat-core-scope` are authorized.

## Source-of-truth documents

- `docs/REWORK_SCOPE.md` — product scope and data behavior.
- `docs/LOCAT_INTEGRATION_EXECUTION_TRACKER.md` — active work sequence and remaining acceptance.
- `docs/ENGINEERING_HISTORY.md` — implementation decisions and observed failures/fixes.
- `docs/ORIGINAL_LOCAT_REQUIREMENTS.md` and `docs/LOCAT_FEATURE_UI_COVERAGE.md` — retained requirement register and historical coverage; read them through the current scope override.
- `server/README.md`, `docs/SELF_HOSTING.md`, `docs/PRIVATE_STORAGE.md` and `docs/LINK_INTEGRATION.md` — operational and feature-specific details.
