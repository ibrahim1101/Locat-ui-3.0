# UI 3.0 encrypted private storage

Vault and Secrets are experimental browser implementations adapted from original Locat's private-store design. They are separate from messaging encryption and native secure storage. All controls use the UI 3.0 theme. Authenticated account cookies and the trusted request Origin authorize writes; explicit local mode has no server storage access.

## Current behavior

Each account has independent Vault/Secrets stores. A random 256-bit master key is wrapped by a passphrase-derived AES-GCM key using PBKDF2-HMAC-SHA256 (600,000 iterations, random 16-byte salt). Each wrapping/entry operation generates a fresh 12-byte IV and uses a 128-bit authentication tag. Additional authenticated data binds the UI3 protocol namespace, account ID, module, store ID and record ID. Raw master-key byte arrays are cleared after import; imported master keys are nonextractable. Passphrases and plaintext entry names/content are never submitted to the server by these flows.

Server SQLite stores only configuration, wrapped master key, ciphertext envelopes, opaque IDs, revisions, ciphertext sizes and modification timestamps. That metadata reveals account association, entry counts, sizes, timing and access patterns. Private action audit events contain action/module names only, not decrypted names or contents.

Vault imports one file up to 2 MiB, encrypting names, folder labels, MIME and bytes together. Decrypted copies download as application/octet-stream. Secrets supports credentials/notes, masked password fields, unbiased CSPRNG password generation, editing and explicit clipboard copying. Folder/name editing and search run only on decrypted client memory. The server never indexes decrypted names or searches private plaintext.

Limits: 128 objects/module/account, 64 MiB serialized ciphertext quota/module/account, 4 MiB envelope data, 60 writes/minute/account. Ownership and module scoping apply to every read/write/delete. Expected-revision checks reject stale overwrites/deletes; quotas and object counts are enforced transactionally. Configuration replacement/reset is not exposed. A forgotten passphrase cannot be reset using the login password.

Lock now, hidden-page handling and five-minute idle locking drop key/plaintext references and clear forms/dialogs. Unmount/logout/account scope changes invalidate in-flight unlocks. Browser JavaScript does not guarantee secure erasure of prior immutable strings, garbage-collected memory, clipboard history, downloads or OS/browser remnants. Copy and decrypted download are explicit user actions. Native biometric unlock/hardware key storage is not connected.

## Backup and restore

Download encrypted backup contains configuration, opaque scope IDs and ciphertext only. Restore validates the exact format/scope/schema/bounds, unlocks with the original passphrase and decrypts/authenticates every archived object before the first write. It restores only missing IDs into the matching account/module/store, preserving all existing entries/configuration. An empty matching-account store may initialize from the backup configuration. Scope is tied to stable UI3 account IDs rather than hosting origin, so moving the same database to another trusted HTTPS origin does not require re-encryption. Restoring into a newly created different account is rejected.

Restoration is a sequence of revision-checked writes, not an atomic whole-backup import. Interruption, concurrent writes, hidden-page locking, server capacity or rate limits may leave a subset restored; a retry rechecks live status and safely skips existing IDs. A large archive may require waiting for the 60/minute write bucket to reset and retrying. Unlock again after completion. SQLite online backups also preserve the encrypted stores; restore the same account database using server recovery instructions.

Original Locat numeric-account/origin-bound encrypted envelopes and UI3 string-account envelopes use different authenticated scopes. They are not silently imported or declared byte-compatible. The original repository and its data remain untouched. A verified decrypt/re-encrypt migration tool is still required for original encrypted-store imports, different accounts, and passphrase rotation.

## Verification and limits

Tests use actual Node Web Crypto for create/unlock/encrypt/decrypt, nonextractability, fresh IVs, tampering, owner/module/store/record mismatch and file length validation. UI tests verify no plaintext/passphrase in uploads, locked-page clearing, scoped local search, safe missing-only restore and corrupted archive rejection before writes. SQLite/API tests verify isolation, schema migration, revision conflicts, count/byte quotas and trusted Origin. These assertions do not replace browser/native acceptance or an independent security review.

The browser client and origin must be trusted: a malicious delivered client, XSS, compromised device, extension or unlocked session can read plaintext. This is not an audited password-manager product or a claim that a malicious server cannot replace the browser client. Large-file streaming, offline encrypted replicas, autofill, shared vaults, native keychain/keystore integration, passphrase rotation and original-store migration remain open.

Primary algorithm references checked during implementation:
- W3C Web Cryptography API: https://www.w3.org/TR/2017/REC-WebCryptoAPI-20170126/
- OWASP Password Storage Cheat Sheet (PBKDF2 work factor guidance): https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html
- Original Locat `src/lib/privateStoreCrypto.ts`, `contracts/privateStore.ts`, `api/privateStoreRouter.ts`, branch integration/ui3, commit 2e394921377fef687d565cff3208d36dd6a56b80; GPL source provenance retained.
