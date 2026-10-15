# Reviewed Matrix stack — executable feasibility checkpoint

Pinned matrix-js-sdk 44.0.0 (Apache-2.0) is now a source dependency; package-lock locks its Rust crypto WASM dependency (18.9.0). Existing Locat source remains GPLv3; SDK/WASM licenses remain upstream Apache-2.0 and must be retained in distribution. The isolated test server is Synapse 1.163.0, a separate service with its own upstream licensing; this checkpoint does not bundle or deploy a production homeserver. No independent license/security audit is claimed.

`tools/matrix-acceptance.mjs` creates only a new temporary synthetic homeserver with 127.0.0.1 listener, private room, two synthetic accounts/device keys and disabled federation/statistics. It has no parameter for an existing server, production account or Locat database. Its temporary insecure test-only registration configuration is generated outside the repository, never exposed, and removed after child-process shutdown. Do not adapt that registration configuration into a public deployment.

Actual local acceptance passed:

- Initialized the SDK Rust crypto engine on both synthetic clients.
- Compared peer Ed25519 fingerprints against the corresponding client's own public key through the test's out-of-band channel, then marked those exact devices locally verified.
- Enabled the SDK's unverified-device blacklist; sent an encrypted private-room message and decrypted it on the recipient.
- Asserted the homeserver event is m.room.encrypted and contains none of the unique synthetic message marker.
- Disconnected the recipient transport, queued ciphertext, restarted the real homeserver using the same database, reconnected and decrypted the queued message.
- Asserted the received event ID occurs once in the recipient timeline and modified ciphertext fails decryption.
- Scanned the homeserver SQLite database and WAL for the unique message marker; neither contained it.

These are same-host synthetic acceptance results, not international connectivity, full key/metadata leakage assessment, independently verified human identity or a complete private chat implementation. The harness uses in-memory client crypto state and transport disconnection, not persisted client recovery after device loss. An initial attempt to stop/restart the same ephemeral SDK instance failed because stopClient disposes its crypto; the corrected test preserves the recipient engine while disconnecting transport. Shutdown retry timers can linger in this SDK setup, so the standalone harness exits only after assertions, client stop, homeserver termination and fixture removal. Production lifecycle/timer behavior needs browser acceptance.

`src/integration/matrixCryptoSession.ts` adds a browser lifecycle adapter, now invoked by the experimental settings setup. It requires secure context, IndexedDB and an exclusive Web Lock held for the entire account/user/device crypto-store lifetime. It uses persistent Rust crypto, distinct store prefix, same-origin Matrix endpoint, memory-only supplied Matrix token, default rejection of unverified devices and cleanup on close/cancellation/failure. Unit tests verify exclusive ownership, no second initialization and cleanup. Actual browser IndexedDB/WASM persistence, crash/abort/reload behavior and cross-tab ownership are not platform-verified. The authorized backend must enforce a unique Locat-account-to-Matrix-account/device binding before exposing this adapter. It does not accept a Locat password as a Matrix credential and is invoked only by explicit experimental device setup. It does not start conversation sync or Send. See MATRIX_ACCOUNT_BINDING.md.

The /api/messages security gate stays closed. Remaining dependencies include a separately administered same-origin Matrix service, completion of Locat account/token mapping and upstream revocation, human verification UX/SAS or cross-signing, durable browser recovery/backup, attachments/group lifecycle, authentication isolation, abuse limits and permission integration. Browser CSP/WASM asset delivery is now packaged; actual browser acceptance is separate. Do not enable live Send on the strength of this harness alone.

## Reproduce locally

From the app directory with Node 24 and Python 3.12, create a disposable Python venv outside the repository and install `tools/matrix-test-requirements.txt`. Set LOCAT_TEST_SYNAPSE_PYTHON to that environment's python executable, then run `npm run test:matrix`. The script asserts the test Synapse version, generates its own private fixture paths/keys and prints a bounded pass summary. Run standard check/lint/test:all/build separately. The normal suite does not require Python. Linux CI now contains this optional-environment installation and real integration step; the changed remote workflow has not yet been observed completing.

Sources checked: https://github.com/matrix-org/matrix-js-sdk ; https://github.com/matrix-org/matrix-sdk-crypto-wasm ; https://element-hq.github.io/synapse/latest/setup/installation.html . Exact installed SDK type declarations/source were used for initialization, device verification and client shutdown behavior. No original/custom messaging ratchet or cipher was introduced.
