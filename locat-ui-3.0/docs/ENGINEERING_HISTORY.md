# Engineering history — current scope rework

Date: 2026-10-20. Earlier records are preserved in the pre-search engineering history archive at docs/archive/ENGINEERING_HISTORY_2026-10-20_pre-search.md. This file records the current branch work and validation.

## Retired feature scope

Cinema and standalone media libraries, Locat Remote, and SentinelLab/integrations were removed from active UI, routes, and helper code. Schema 18 drops their dedicated tables; account, messaging, Link, Vault, Secrets, and account-activity data remain. Remaining Sentinel references in live source are limited to migration/backup compatibility and tests proving retired tables and endpoints are absent.

## Nested decrypted Chat search

Added a collapsed Search loaded messages section to the conversation header, styled with Obsidian Ember tokens. It searches text and attachment names among up to 200 successfully decrypted messages already loaded on this device. Terms remain in component memory; no server query or persistent index is used. It jumps to a result locally.

## Encrypted text edits

Added Edit message to the nested message menu for the sender’s own decrypted text messages. An edit is a new encrypted event; its target ID and replacement text stay in ciphertext. Projection applies it only when the sender matches the original sender. Attachments and other users’ messages are rejected. Uncertain delivery uses the existing encrypted retry path.

Local validation on source commit 2788518: check, lint, 267 frontend / 108 server tests, production build, browser syntax/discovery, and diff whitespace checks passed. The Matrix crypto chunk-size advisory remains.

## Publication failures and fixes

- Commit 89e1f36 initially published a malformed ConversationSearch.tsx blob because the path was read from the wrong working directory. UI run 39442044980 failed TypeScript with TS1490; core run 39442037749 failed its build for the same reason. Commit 715f369 repaired source, but large documentation blobs were truncated by the connector.
- Commit 2788518 restores readable documents and adds text editing. This follow-up keeps original long records in the archive above. Exact-source hosted acceptance is pending; earlier failed runs are not counted as passes.

## Remaining limits

Search only covers already loaded messages. Edit behavior is client-side projection; a modified client can send malformed events. Scheduled sending stays unavailable in live Chat until it has a reliable durable sender compatible with the device-held Matrix credentials. Physical-device and broader identity-recovery acceptance remain open.
