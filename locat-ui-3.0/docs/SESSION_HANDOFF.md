# Locat UI 3.0 session handoff

Updated 2026-10-20. Continue on `rework/locat-core-scope` in `ibrahim1101/Locat-ui-3.0`.

## Active direction

Keep the Obsidian Ember theme and nested navigation/disclosures. Continue retained Locat core: Chat, Link, Files & Vault, account/security and workspace foundations. Cinema and standalone media libraries, Locat Remote and SentinelLab are retired. No data recovery is requested. No service or live database has been changed by this code work.

## Current Chat work

- Verified one-to-one Matrix conversations support encrypted text, replies, reactions and attachments, plus reviewed voice, one-time location, stickers/doodles and local image edits.
- Conversation search is nested in the header and searches up to 200 decrypted messages already loaded on this device. Search terms are not sent or persisted.
- Own-text editing uses a new encrypted event. Target ID and replacement text stay in ciphertext; projection accepts an edit only from the original author. Attachments and peer messages cannot be edited.
- Own encrypted messages can be redacted for everyone from the nested message menu. The gateway verifies the target event is encrypted and belongs to the bound Matrix user before forwarding a body-free redaction request. A confirmation explains backup and saved-copy limits; redacted messages and replies show deleted placeholders.
- Scheduled sending remains unavailable until a durable sender can operate with device-held Matrix credentials while the app is closed.
- Account → Security includes a device-local PBKDF2 app lock with configurable inactivity and background policies. Lock signals clear other open same-origin app tabs. It gates the UI only, does not encrypt browser storage, and leaves biometrics disabled pending verified platform authentication.

## Validation

The restored Chat source passed TypeScript, ESLint, all 267 frontend and 108 server tests, production build, browser-spec syntax and Playwright discovery. The real two-account Matrix Playwright scenario skipped locally because the pinned Synapse environment is unavailable; hosted Chromium/Firefox Matrix acceptance passed on run `39446768005`. Hosted Chromium/Firefox identity, Link and messaging acceptance also passed on run `39450561720`. The new app-lock slice passes TypeScript, ESLint, all 272 frontend and 108 server tests, and production build locally; hosted macOS/Linux/Windows checks passed and the long browser batch was running at the deletion checkpoint. The deletion UI and gateway tests pass locally. Hosted Matrix acceptance initially found the gateway was dropping redaction events from scoped room sync; the fix now retains redactions and strips cleartext reasons, and the latest run will rerun cross-account deletion. The app-lock browser flow passed reload and wrong/correct passcode checks on Chromium; same-origin cross-tab lock propagation is included in the latest run. Local Playwright cannot launch because this workspace lacks Chromium; CI provisions its own. Builds retain the large Matrix crypto chunk advisory.

The previous GitHub publication used empty blobs for some app files. Those files were restored from the last verified source snapshot and republished as base64 blobs; fetched GitHub sizes and blob hashes match local files. Avoid UTF-8 connector uploads for large app source files.

## Next

Continue the retained-core sequence: account/security and messaging lifecycle gaps, followed by Files & Vault and workspace destinations. Global connection and identity reliability now has hosted Chromium/Firefox coverage for the exercised flow; cross-device, physical-host, single-writer and recovery acceptance remain open. Treat older roadmap rows for standalone media, Remote and SentinelLab as retired under the current scope override.

Historical handoff: `docs/archive/SESSION_HANDOFF_2026-10-20_pre-search.md`.
