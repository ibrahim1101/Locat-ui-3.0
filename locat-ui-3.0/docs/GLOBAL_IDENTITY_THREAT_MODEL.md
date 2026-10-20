# Global identity and key lifecycle threat model

## Current identity model

Locat keeps its existing immutable account IDs and server-local four-digit LC codes. A qualified address such as `LC-1234@locat.example` adds the configured canonical origin; `locat://locat.example/account/<immutable-id>` disambiguates accounts. LC codes can collide between servers. A stored server UUID distinguishes ordinary server instances but is not proof of server ownership, and restoring/cloning the same database duplicates that UUID.

Without an operator authority key, discovery and account addresses are descriptive only. The current transport trust boundary is the configured HTTPS origin and its certificate/operator. Matrix device keys are separately pinned to the Locat account/device binding; this is not a global identity or cross-signing system.

## Threats and required behavior

| Threat | Required behavior |
| --- | --- |
| DNS, hosting or homeserver impersonation | Bind signed claims to the exact canonical HTTPS origin and stable server UUID; a signature alone does not prove domain control. Require an explicit fingerprint check or a previously trusted key before showing a server as verified. |
| Duplicate LC codes on different servers | Include canonical origin and immutable account ID in signed account claims; never identify a remote account by LC code alone. |
| Silent authority or signing-key change | Detect a changed key ID and require an explicit continuity proof or out-of-band re-verification. Never silently replace a stored pin. |
| Database clone or restore | Treat a copied database UUID as a clone, not a second server identity. Keep the signing key separate from the database and require one active writable owner for an authority. |
| Key loss or compromise | Do not recover/replace signing keys through a Locat password or Matrix access token. Key recovery and rotation must have an explicit, auditable protocol and honest loss behavior. |
| Lost device or room-history file | Separate server identity, account authentication, device signing keys, cross-signing trust and exported Megolm history keys. A history export is not identity recovery. |
| Malicious remote discovery | Keep remote discovery/federation disabled until authenticated, bounded, SSRF-safe resolution and replay/idempotency controls are accepted. |

## Implemented first slice

An operator may configure `LOCAT_IDENTITY_SIGNING_KEY_FILE` with an owner-only Ed25519 PKCS#8 private-key file. The server signs a domain-separated `locat.server.v1` discovery claim `(version, serverId, canonicalOrigin)` and `locat.account.v1` per-account claims `(version, serverId, canonicalOrigin, immutableAccountId, lcCode)`. Signatures are Ed25519 over the UTF-8 bytes of compact JSON arrays: `[kind, version, serverId, canonicalOrigin]` for discovery and `[kind, version, serverId, canonicalOrigin, immutableAccountId, lcCode]` for accounts. The public key is SubjectPublicKeyInfo DER encoded with base64url; `keyId` is base64url SHA-256 of those same DER bytes. The public key and its key ID accompany each signature. The private key is not stored in SQLite, returned by diagnostics, or sent to clients. Startup rejects relative, symlink, non-regular, broad-permission or non-Ed25519 key files on supported POSIX hosts. Without the key, startup and existing local addresses continue to work, but discovery reports `authenticatedIdentity: false` and account addresses remain unsigned.

Generate a new key without overwriting an existing file:

```sh
node tools/generate-server-identity-key.mjs /absolute/private/path/locat-identity.pem
```

Set `LOCAT_IDENTITY_SIGNING_KEY_FILE` in the server's protected environment. On Windows, use a private directory ACL; Node's portable POSIX mode bits are not an ACL check. Back up this key separately under operator control. Never commit it, copy it into SQLite, include it in an application backup, or expose it in diagnostics.

## Limits and next acceptance

The signatures prove that the corresponding private key signed these exact claims. They do **not** prove that the key controls the DNS name, that the server is honest, that the account belongs to a particular human, or that a client has trusted the key. Current clients do not yet verify or pin these signatures, and no key-rotation chain is implemented. Replacing the configured key changes the key ID; clients must not treat that as a verified rotation. Federation remains disabled.

Next P2 work is client-side signature verification, a visible first-contact fingerprint check, persistent per-authority pins with account/origin isolation, explicit changed-key handling, and a signed rotation/recovery protocol. Test fresh authority, same-origin/same-key restart, account mismatch, origin mismatch, changed key, invalid signature, cloned server ID and recovery after actual key loss. Full cross-signing, account recovery, browser disk persistence, native stores and independent security review remain separate acceptance gates.
