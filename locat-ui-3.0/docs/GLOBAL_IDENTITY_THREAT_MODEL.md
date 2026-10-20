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

For a planned rotation while the old key is available, keep both private keys protected and run:

```sh
node tools/create-server-identity-rotation.mjs /absolute/old.pem /absolute/new.pem https://locat.example SERVER_UUID /absolute/rotation.json
```

Use the exact `serverId` from `/.well-known/locat`. Configure `LOCAT_IDENTITY_SIGNING_KEY_FILE` with the new private key and `LOCAT_IDENTITY_ROTATION_FILE` with this manifest, then deploy them together. The server checks that the old key signed a handoff for this exact origin, server ID and current new key before starting. Pinned browsers verify the handoff and wait for the user to accept it; they never replace the old pin automatically. Keep the manifest available while pinned users refresh. There is no acknowledgement service, so a client that misses the manifest must compare and explicitly pin the new fingerprint out of band.

## Limits and next acceptance

The signatures prove that the corresponding private key signed these exact claims. They do **not** prove that the key controls the DNS name, that the server is honest, or that the account belongs to a particular human. The browser verifies both discovery and account signatures when the nested identity details are opened. It can pin a valid authority fingerprint only after the user confirms a comparison through a separate trusted channel. Pins are public continuity metadata in browser local storage, scoped to the Locat account and exact origin; they can be cleared or changed by someone who can alter that browser profile and do not survive clearing site data. They are not synchronized across devices. A planned key change can include an old-key signed handoff; the browser detects it and waits for explicit acceptance before replacing the pin. If the old key is lost, this signed path is unavailable and each user must compare and explicitly pin the new fingerprint out of band. This does not recover account credentials or encrypted history. Federation remains disabled.

The browser now warns when a verified server UUID is already pinned under a different origin in the same browser profile. It requires the user to compare the fingerprint with the operator and confirm there is only one active writable owner before pinning the new origin. This is local continuity assistance only: it cannot query other devices, detect an unpinned clone, coordinate writable ownership, or distinguish a clone from an approved migration. The server still relies on operators to keep one active writable owner and the signing key outside database copies. Hosted CI accepted the clone warning in both Chromium and Firefox on source `5cd7e7c614ac0ecd7184cf5a5a299f92b2292751` (core workflow `39413862056`). Stronger platform-specific pin storage and independent security review remain open. Acceptance covers fresh authority, same-origin/same-key restart, account mismatch, origin mismatch, invalid signature, signed rotation, an unsigned changed key and a pinned same-UUID second origin. A built-browser key-loss scenario has been added: it replaces the isolated fixture signing key with an unrelated key, verifies the existing pin is unchanged, and requires out-of-band comparison plus explicit re-pinning; hosted acceptance passed in Chromium and Firefox on source `5cd7e7c614ac0ecd7184cf5a5a299f92b2292751` (core workflow `39413862056`). Malformed authority-pin data now blocks trust actions until the nested disclosure removes only invalid feature-owned entries and reruns verification; all valid pins remain and continue to trigger clone warnings. Hosted UI3/core acceptance passed on `fb1d7fe049e2159775b7e7ffea4762a6893ef013` (core workflow `39416980238`); the built browser follow-up `76e43da803ab46e67de3fa68ff6311b030f88ba9` passed Chromium and Firefox in core workflow `39419456980`. Full account/history recovery, protected browser/native stores and cross-signing remain separate acceptance gates.
