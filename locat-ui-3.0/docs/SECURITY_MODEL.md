# Security model entry point

Current boundaries: exact Host/Origin, scrypt authentication, hashed session tokens and HttpOnly SameSite cookies; Secure on direct TLS and explicit trusted proxy termination. TLS is mandatory outside loopback development. Proxy trust is socket IP plus fixed origin; forwarded headers are ignored. Accounts and module records are authorized on each request. Browser compromise remains a risk to client keys; server-readable profiles/shared-media metadata are not private E2EE.

See PRIVATE_STORAGE.md, LINK_INTEGRATION.md and REMOTE_INTEGRATION.md for experimental cryptographic details/limits. E2EE_SECURITY_MODEL.md gates messaging. No independent security audit or public-beta readiness is claimed. Quotas/rate limits are finite implementation controls, not complete internet abuse defenses. Public deployment requires the separate acceptance and authorization gates in CLOUDFLARE_DEPLOYMENT.md and CONNECT_TEST_PLAN.md.


Durable managed Matrix cleanup is implemented with additive schema 13 and transaction-coupled Link revocation; exact scope, worker lifecycle and evidence are in MATRIX_DEVICE_REVOCATION.md. It does not certify remote wiping, account-wide upstream sign-out, unbound-token inventory or full recovery.


Managed setup now records deterministic device intent before upstream issuance under schema 14; this metadata neither grants gateway access nor replaces key binding. Unbound cleanup and operation-lease boundaries are documented in MATRIX_MANAGED_SETUP.md.


Password-confirmed other-session sign-out and transactional password-change authorization are implemented; see SESSION_SECURITY.md for local grant scope, audit atomicity and acceptance evidence.


Account-owned security audit search and cursor pagination are implemented in Sentinel; see ACCOUNT_ACTIVITY.md. This covers retained audit records rather than the full cross-module Timeline roadmap.


Account audit date windows and bounded loaded-result JSON export are implemented; ACCOUNT_ACTIVITY.md defines the readable-file scope and excludes full account/private-key backup or signed-evidence claims.


Operator-only standalone SQLite backup verification is available through verify:backup; BACKUP_VERIFICATION.md defines integrity/checksum/schema scope and excludes full ecosystem restore or decryption claims.
