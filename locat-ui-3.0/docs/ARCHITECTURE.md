# Architecture entry point

Existing React/TypeScript UI3 design system and live adapters use a same-origin Node 24/SQLite backend. Explicit local mode has no server identity. Account/module authorization is server-side. Shared connection evolution is CONNECT_ARCHITECTURE.md; private storage and Link/Remote boundaries are PRIVATE_STORAGE.md, LINK_INTEGRATION.md and REMOTE_INTEGRATION.md. New modules must reuse platform identity/connection services while retaining module encryption/permission boundaries. MASTER_ROADMAP.md describes intended architecture, not completed services.


Durable managed Matrix cleanup is implemented with additive schema 13 and transaction-coupled Link revocation; exact scope, worker lifecycle and evidence are in MATRIX_DEVICE_REVOCATION.md. It does not certify remote wiping, account-wide upstream sign-out, unbound-token inventory or full recovery.
