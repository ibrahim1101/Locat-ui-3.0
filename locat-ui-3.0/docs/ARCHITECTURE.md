# Architecture entry point

Existing React/TypeScript UI3 design system and live adapters use a same-origin Node 24/SQLite backend. Explicit local mode has no server identity. Account/module authorization is server-side. Shared connection evolution is CONNECT_ARCHITECTURE.md; private storage and Link/Remote boundaries are PRIVATE_STORAGE.md, LINK_INTEGRATION.md and REMOTE_INTEGRATION.md. New modules must reuse platform identity/connection services while retaining module encryption/permission boundaries. MASTER_ROADMAP.md describes intended architecture, not completed services.


Durable managed Matrix cleanup is implemented with additive schema 13 and transaction-coupled Link revocation; exact scope, worker lifecycle and evidence are in MATRIX_DEVICE_REVOCATION.md. It does not certify remote wiping, account-wide upstream sign-out, unbound-token inventory or full recovery.


Managed setup now records deterministic device intent before upstream issuance under schema 14; this metadata neither grants gateway access nor replaces key binding. Unbound cleanup and operation-lease boundaries are documented in MATRIX_MANAGED_SETUP.md.


Password-confirmed other-session sign-out and transactional password-change authorization are implemented; see SESSION_SECURITY.md for local grant scope, audit atomicity and acceptance evidence.


Operator-only standalone SQLite backup verification is available through verify:backup; BACKUP_VERIFICATION.md defines integrity/checksum/schema scope and excludes full ecosystem restore or decryption claims.

Operator restore:server can publish a checksum-verified standalone SQLite snapshot to a new unused file without activation; see BACKUP_VERIFICATION.md for isolation, stale authentication state and separate sidecar/browser/media recovery scope.

Sentinel incident server filters and cursor paging are implemented in the UI3 live panel; SENTINEL_INCIDENTS.md records owner checks, mutable-order semantics and remaining history/token/vendor acceptance scope.
