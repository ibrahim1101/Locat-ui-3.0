# Locat UI 3.0 session handoff

Updated 2026-10-20. Continue on `rework/locat-core-scope` in `ibrahim1101/Locat-ui-3.0`.

## Active direction

Keep the Obsidian Ember theme and nested navigation/disclosures. Continue retained Locat core: Chat, Link, Files & Vault, account/security and workspace foundations. Cinema and standalone media libraries, Locat Remote and SentinelLab are retired. No data recovery is requested. No service or live database has been changed by this code work.

## Current Chat work

- Verified one-to-one Matrix conversations support encrypted text, replies, reactions and attachments, plus reviewed voice, one-time location, stickers/doodles and local image edits.
- Conversation search is nested in the header and searches up to 200 decrypted messages already loaded on this device. Search terms are not sent or persisted.
- Own-text editing uses a new encrypted event. Target ID and replacement text stay in ciphertext; projection accepts an edit only from the original author. Attachments and peer messages cannot be edited.
- Scheduled sending remains unavailable until a durable sender can operate with device-held Matrix credentials while the app is closed.

## Validation

Latest local source passed TypeScript, ESLint, all 267 frontend and 108 server tests, production build, browser-spec syntax and test discovery. The real two-account Matrix Playwright scenario was skipped locally because the pinned Synapse environment is unavailable; hosted Matrix acceptance is still required. The build reports the existing large Matrix crypto chunk advisory.

The previous GitHub publication used empty blobs for some app files. Those files were restored from the last verified source snapshot and republished as base64 blobs; fetched GitHub sizes and blob hashes match local files. Avoid UTF-8 connector uploads for large app source files.

Historical handoff: `docs/archive/SESSION_HANDOFF_2026-10-20_pre-search.md`.
