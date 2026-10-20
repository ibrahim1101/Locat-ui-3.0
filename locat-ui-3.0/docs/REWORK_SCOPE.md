# Locat UI scope rework

**Current source of truth for the October 2026 scope rework.** Older roadmap, design, QA, and engineering-history documents describe earlier implementations. They remain for provenance and must not be read as confirmation that the retired modules or endpoints are active.

## Product scope

The app is organized around Chat, Link, Files & Vault, and the surrounding Locat workspace. The official Locat logo stays unchanged. Obsidian Ember is the default theme: matte `#0B0B0C` canvas with `#E86B2C` accent, consistent with the existing titanium and ember design system.

The navigation groups related destinations. Files opens a nested section for Vault and Secrets. Settings are grouped by account, app, connection and about, with a focused detail view; live account settings separate profile, sessions, security and messaging devices. Navigation, Home, Search, command palette, and module cards use the same hierarchy.

## Removed standalone features

- Cinema, media-library playback, Music, audio library/equalizer, and Photos library/editor.
- Host media scanning, streaming, media-library sharing, and media-specific server endpoints.
- Remote-control UI and Link remote-signaling endpoints.
- SentinelLab, incident/webhook ingestion, vendor mappings, tokens, incident screens, and related integration code.

The Search view scopes app destinations. Chat supports ordinary encrypted file attachments in verified one-to-one Matrix conversations; bytes are encrypted in the browser before upload, attachment keys travel inside the encrypted room event, and ciphertext integrity is checked before decryption. The nested composer groups Photo, Document or file, Video, Location & schedule, and Stickers & doodles by intent. Image review offers the original or one of three local resize presets; video review provides a local non-autoplay preview and original-only send. Voice recording is local, limited to 60 seconds and 2.9 MB, and requires explicit review before encrypted upload. Decrypted image/video/audio previews load on demand in message bubbles and never auto-play. All attachments use the existing Matrix encryption and uncertain-send protections, with a 2,900,000-byte cap. Read receipts are an account preference, off by default, sent only when a decrypted incoming message is visible in the open conversation at the latest scroll position, and enforced by the Matrix gateway; senders see a read status after the peer's receipt arrives. Typing indicators are a separate account preference, off by default; opted-in users exchange short-lived standard Matrix typing metadata in authorized private rooms. Draft contents are never sent, and each side must opt in to share or see the signal. Chromium and Firefox browser acceptance verifies encrypted attachment upload/download, byte equality, image preview, and storage behavior; real microphone acceptance is Chromium-only. Physical device acceptance remains open. Attachment handling is not routed through a standalone library. Link pairing and encrypted file/text transfers remain. Account activity remains under Settings → Security and uses the existing account events endpoint.

## Data and endpoint behavior

The schema 18 migration removes only retired-feature records and tables: Cinema/media-library sharing overrides, Link Remote sessions/signals, and Sentinel tokens/incidents/events. Accounts, sessions, encrypted messages, contacts, Link identities/pairings/transfers, Vault and Secrets records, audit history, Matrix bindings and backups remain untouched. Fresh databases never create the retired tables. The retained Link proof-store migration is schema 16 → 17; schema 18 then removes the retired tables. Backup verification continues to accept older backup schemas while schema 18 no longer requires retired tables. No running user service or database has been changed by this code work.

This is a code and interface scope change. It does not deploy, publish, or modify a live database. Installing the updated service on an existing database applies schema 18 and permanently removes the retired-feature records listed above; a fresh installation starts without them.

## Verification

The change is validated with the repository checks: TypeScript, ESLint, frontend and server tests, and a production build. API tests assert that retired media and Sentinel paths are not served; Link tests continue to cover device pairing and encrypted payload delivery. Legacy browser tests dedicated to removed screens are retired with those screens.

For active server setup and safety limits, use [server/README.md](../server/README.md). For the historical record, see [ENGINEERING_HISTORY.md](ENGINEERING_HISTORY.md).
