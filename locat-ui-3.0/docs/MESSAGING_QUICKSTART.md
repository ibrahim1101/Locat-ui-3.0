# Encrypted text messaging — development guide

This flow uses two Locat accounts on one configured homeserver. Actual Chromium acceptance covers the built UI and real SDK/Synapse, including an offline recipient and homeserver restart. It does not certify physical international networks, native apps, public beta or independent security review. No public service is activated by this guide.

## Operator prerequisites

Use Node 24+ and the built app/API described in [SELF_HOSTING.md](SELF_HOSTING.md). Messaging additionally requires the private Synapse setup and instance-scoped managed registration in [MATRIX_SIDECAR.md](MATRIX_SIDECAR.md). The server status in Settings must report configured managed setup. A plain Node app without the sidecar cannot provide encrypted conversations. Keep Synapse/database/admin interfaces private; route Matrix client requests through Locat's proof/binding gateway. Do not expose Synapse directly.

Use a secure browser origin, persistent IndexedDB and Web Locks. Real clients must trust the operator's HTTPS certificate; acceptance fixtures' certificate exceptions are not production instructions. Do not generate a new server instance identity or overwrite an existing registration/database to fix a failed setup. Docker/Pi/public deployment still needs its own validation and the required activation authorization.

## Two-user workflow

1. Sign in with independent accounts/browser profiles. In Messages, find the other exact username or LC code, send a friend request and accept it.
2. Each user opens Settings → Set up messaging device → Create and bind managed session. Existing browser keys must match the stored device pins; setup never silently replaces them.
3. Both enable device verification, select each other's contact and choose the real device. Request/accept verification. Compare every displayed number or emoji over an independently trusted channel, then confirm on both screens. Names and device labels alone do not establish identity.
4. Each chooses **Keep messaging active**. Navigate through the sidebar to Messages and choose **Open encrypted conversation**. Both users must open it so their membership is joined and the room synchronizes.
5. Compose text and Send. Every active contact device must be locally verified. An extra unverified device blocks sending; verify it or revoke that device intentionally. Calls/attachments and unsupported controls stay unavailable.

Closing Settings after explicit adoption preserves the account's crypto/store lock. **Stop active messaging** waits for store release. Another tab sharing the same browser crypto store cannot become a second writer. Account change/sign-out closes the owner. Reload requires explicit managed rebind/adoption of the same persisted keys; it is not complete account/identity recovery.

## Status, retries and recovery limits

Sent means the homeserver accepted the event, not that a recipient read/decrypted it. An offline recipient receives encrypted data on reconnection. Missing keys/modified ciphertext show a decryption failure; there is no plaintext fallback. An uncertain send retains its original SDK event/transaction for up to three attempts in the current owner. Keep the exact draft; do not repeatedly create new sends. Check history before manual resubmission after a full client loss. There is no durable sender outbox/reconciliation guarantee across browser process loss.

Recent history is bounded: initial sync 50 events per room, UI projection 200 recent SDK events. Full pagination/multiple-room lifecycle and full cross-signing/identity recovery remain unfinished. Existing standard encrypted room-history import/export is separate from identity/trust recovery. Keep backups/passphrases separately; do not treat a server backup as a backup of every client's keys.

Revocation blocks new protected access and queues managed upstream device cleanup; it cannot recall messages/keys/copies already received. The homeserver still sees routing, membership, device/public keys, timing and sizes. Compromised endpoints or maliciously delivered client software can read client plaintext. See [E2EE_SECURITY_MODEL.md](E2EE_SECURITY_MODEL.md) and [BROWSER_FOUNDATION_ACCEPTANCE.md](BROWSER_FOUNDATION_ACCEPTANCE.md) for exact evidence and boundaries.

The conversation offers **Load older encrypted messages** when a backward cursor exists. It loads at most 50 events per action, three pages per open, within the 200-event display window. A disabled control can mean no older cursor, the window/page limit, or unavailable room/connection state. Missing keys require a separate recovery path; this control does not restore them.

An uncertain message can only retry the original SDK event at most three times within five minutes. After expiry, stop messaging and inspect history; opening a new session is not proof that an earlier send failed. If room setup fails, **Retry conversation setup** checks again through the server; a room stuck pending still requires reconciliation and will not be recreated automatically.


Gateway restart recovery: an open browser can renew its private-key device proof when a protected read is denied after a Locat server restart. This recovery retries a read once; it does not replay message mutations. Existing authorization and revocation checks still apply. Chromium acceptance at 4d72038 / workflow 38886169276 passed actual gateway restart and another encrypted UI message without reloading. Uncertain encrypted sends now retain a device-scoped ciphertext retry record across reload. Inspect history before retrying, and do not assume a retained draft means the server rejected the message.


If a send has no confirmed acknowledgement, reopen its original contact after restarting messaging on the same browser/device. **Retry pending encrypted message** sends the original ciphertext/transaction only after current authorization and verification checks. It allows at most three transmissions within five minutes. A changed contact device set, missing trust, expiry, storage failure or backward clock blocks replay. **Forget pending retry** requires confirmation and only removes local retry metadata; a server-accepted message may still arrive. Unresolved retry records block new compositions. Browser storage loss, a different device or lost messaging keys cannot recover this journal. No automatic replay or long-term offline sender queue is implemented.
