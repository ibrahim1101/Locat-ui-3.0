# Locat physical acceptance checklist

Use this after the development branch passes its automated checks. Run it on an isolated test server with synthetic accounts and disposable data. Do not use production account data; SQLite backups contain the account database and are not encrypted.

Record the branch and commit, host/device models, OS versions, browser versions, date, and result for each item. Redact usernames, tokens, private keys, backup contents, and public-share secrets from logs.

## Self-hosted Linux install and recovery

- Install the versioned release using [`deploy/README.md`](../deploy/README.md). Confirm the staged package includes `dist/`, `server/`, `shared/`, production `node_modules/`, `package.json`, and `deploy/`.
- Verify `systemctl is-active locat`, `nginx -t`, and `https://<test-host>/api/ready`. Confirm the returned origin and TLS state match the configured public HTTPS origin.
- Sign in to a synthetic account and confirm Settings → Connection reports the authenticated real-time session connected through Nginx.
- Create a fresh unique SQLite online backup, verify it, and retain its SHA-256. Restore it to a new path, verify the restored file, and confirm the original database was not replaced.
- Stage a second version, back up the live test database, switch `/opt/locat` while the service is stopped, then verify service and readiness. Exercise binary rollback. Exercise database restore only against a disposable test database and confirm the restored service starts.

## Accounts, Chat, Link, and local storage

- Create two synthetic accounts on separate browser profiles/devices. Accept a contact request, bind each messaging device, compare device verification codes out-of-band, and send encrypted text and a supported file in both directions.
- Confirm the Home conversation summary appears only for the accepted contact, opens the correct conversation, and reflects messages after reload/reconnect. Confirm local message search finds decrypted text on that device.
- Pair two Locat devices using the displayed comparison code. Transfer a file up to the documented 8 MiB Link acceptance size, interrupt a transfer, resume it from the original file, compare the received file hash, then revoke the pairing and confirm further transfers are blocked.
- Set an app-lock passcode, verify background and inactivity locking, reload and reopen the app, and confirm the correct passcode unlocks local data while a wrong passcode does not. Check that one account's local records do not appear in another account's profile.
- Verify message read receipts and typing indicators remain off by default. When explicitly enabled, confirm they operate only in the open authorized conversation.

## Installed PWA and account recovery

- Install the PWA on a supported browser/device. Share text into it while signed out, sign in, review the staged text, and confirm it remains local until the user chooses to create an encrypted share.
- Open a text share in a signed-out recipient profile. Confirm the URL fragment holds the decryption secret, the server receives ciphertext only, and a one-use/open-limit policy is enforced.
- Run the account recovery and device-loss procedure using synthetic accounts. Record which keys/data recover and which require a still-authorized device; do not claim recovery beyond the tested procedure.

## Result record

```text
Branch / commit:
Host and OS:
Devices and OS versions:
Browser versions:
Date:
Install / upgrade / backup / restore / rollback:
Chat / Link / app lock / PWA:
Recovery:
Failures and redacted evidence:
```
