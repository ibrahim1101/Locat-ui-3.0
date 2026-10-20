# Locat UI scope rework

**Current source of truth for the October 2026 scope rework.** Older roadmap, design, QA, and engineering-history documents describe earlier implementations. They remain for provenance and must not be read as confirmation that the retired modules or endpoints are active.

## Product scope

The app is organized around Chat, Link, Files & Vault, and the surrounding Locat workspace. The official Locat logo stays unchanged. Obsidian Ember is the default theme: matte `#0B0B0C` canvas with `#E86B2C` accent, consistent with the existing titanium and ember design system.

The navigation groups related destinations. Files opens a nested section for Vault and Secrets. Settings are grouped by account, app, connection and about, with a focused detail view; live account settings separate profile, sessions, security and messaging devices. Navigation, Home, Search, command palette, and module cards use the same hierarchy.

## Removed standalone features

- Cinema, media-library playback, Music, audio library/equalizer, and Photos library/editor.
- Host media scanning, streaming, media-library sharing, and media-specific server endpoints.
- Remote-control UI and Link remote-signaling endpoints.
- Sentinel incident webhooks, vendor mappings, tokens, and incident screens.

The Search view scopes app destinations. Chat supports ordinary encrypted file attachments in verified one-to-one Matrix conversations; bytes are encrypted in the browser before upload, attachment keys travel inside the encrypted room event, and ciphertext integrity is checked before decryption. The nested composer groups Photo, Document or file, Video, Location & schedule, and Stickers & doodles by intent. Image review offers the original or one of three local resize presets; video review provides a local non-autoplay preview and original-only send. Upload starts only after confirmation. Decrypted image/video previews load on demand in message bubbles. All attachments use the existing Matrix encryption and uncertain-send protections, with a 2,900,000-byte cap. Chromium and Firefox browser acceptance verifies encrypted attachment upload/download, byte equality, image preview, and storage behavior. Physical device acceptance remains open. Attachment handling is not routed through a standalone library. Link pairing and encrypted file/text transfers remain. Account activity remains under Settings → Security and uses the existing account events endpoint.

## Data and endpoint behavior

No account, media file, backup, or user content is removed or rewritten for this rework. Legacy media, remote-session, and Sentinel tables remain in place so an upgrade does not destroy existing data. Their handlers and store integrations are no longer loaded, and retired endpoints return not-found. Diagnostics no longer scans or reports media-library state. A separate retained Link improvement adds an additive schema 16 → 17 migration for shared, expiring device-proof rows; it preserves existing account and Link records. This migration has not been deployed to a user database.

This is a code and interface scope change. It does not deploy, publish, migrate user data, or modify a live database.

## Verification

The change is validated with the repository checks: TypeScript, ESLint, frontend and server tests, and a production build. API tests assert that retired media and Sentinel paths are not served; Link tests continue to cover device pairing and encrypted payload delivery. Legacy browser tests dedicated to removed screens are retired with those screens.

For active server setup and safety limits, use [server/README.md](../server/README.md). For the historical record, see [ENGINEERING_HISTORY.md](ENGINEERING_HISTORY.md).
