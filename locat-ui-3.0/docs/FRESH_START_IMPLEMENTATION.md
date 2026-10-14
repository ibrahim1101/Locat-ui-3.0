# Locat 3.0 — Fresh-Start Integration Decision

Status: approved direction, implementation in progress.

## Source of truth
- Primary application: this repository, `Locat-ui-3.0`.
- Development branch: `integration/locat-core`.
- Previous `Locat` repository: implementation reference only, not the active development target.
- Keep UI 3.0 design and navigation; replace preview fixtures with real services as modules become functional.

## Data and compatibility
- New development accounts and database are permitted.
- No requirement to migrate emulator-only account records, old login sessions, settings, or media indexes.
- Do not silently import legacy keys or credentials.
- Preserve security properties: authenticated access, encryption, authorization, input validation, and explicit errors.

## Implementation order
1. Establish a new backend service and a documented development configuration.
2. Implement real registration, login, logout, and session validation.
3. Add durable database storage with migrations and server-side permissions.
4. Implement identity-key generation and encrypted messaging, using vetted code from Locat where suitable.
5. Replace UI 3.0 preview adapters module by module with real service adapters.
6. Integrate Android runtime and create a debug APK after build and integration tests pass.

## Guardrails
- Preview fixtures are never a production data source.
- UI readiness is not proof of backend readiness.
- No mock operation may claim success in live mode.
- Avoid committing secrets, credentials, or generated databases.
- Existing UI 3.0 preview remains runnable until the live entry point is verified.
- Do not delete old repository or its history.
