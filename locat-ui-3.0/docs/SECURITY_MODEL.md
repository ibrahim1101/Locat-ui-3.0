# Security model entry point

Current boundaries: exact Host/Origin, scrypt authentication, hashed session tokens and HttpOnly SameSite cookies; Secure on direct TLS and explicit trusted proxy termination. TLS is mandatory outside loopback development. Proxy trust is socket IP plus fixed origin; forwarded headers are ignored. Accounts and module records are authorized on each request. Browser compromise remains a risk to client keys; server-readable profiles/shared-media metadata are not private E2EE.

See PRIVATE_STORAGE.md, LINK_INTEGRATION.md and REMOTE_INTEGRATION.md for experimental cryptographic details/limits. E2EE_SECURITY_MODEL.md gates messaging. No independent security audit or public-beta readiness is claimed. Quotas/rate limits are finite implementation controls, not complete internet abuse defenses. Public deployment requires the separate acceptance and authorization gates in CLOUDFLARE_DEPLOYMENT.md and CONNECT_TEST_PLAN.md.


Durable managed Matrix cleanup is implemented with additive schema 13 and transaction-coupled Link revocation; exact scope, worker lifecycle and evidence are in MATRIX_DEVICE_REVOCATION.md. It does not certify remote wiping, account-wide upstream sign-out, unbound-token inventory or full recovery.
