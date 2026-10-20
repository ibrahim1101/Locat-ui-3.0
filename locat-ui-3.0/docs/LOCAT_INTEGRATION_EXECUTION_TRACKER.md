# Locat UI 3.0 active execution tracker

Updated 2026-10-20. This tracker follows the current user-directed scope on `rework/locat-core-scope`, superseding older roadmap priorities that include retired standalone modules. The Obsidian Ember theme and nested navigation/options remain required.

## Retained scope

| Area | Current behavior | Remaining work |
| --- | --- | --- |
| Accounts and security | Real account/session controls, activity, device binding and revocation; device-local PBKDF2 app-lock passcode with background and inactivity policies, reload persistence and same-origin cross-tab lock signals | Independent review, cross-platform persistence checks and broader identity recovery; retain explicit authorization and recovery limits |
| Chat | Verified one-to-one Matrix rooms, encrypted text/replies/reactions/attachments, local decrypted search, sender-validated encrypted text edits and own-message redactions with a nested confirmation; Contacts, Requests, Find people and Blocked use separate nested sections | Durable scheduled send remains unavailable until device-held credentials can send safely while the app is closed; continue lifecycle, reliability and physical-device acceptance |
| Link | Devices, Pairings and Transfers are separate Obsidian Ember sections; pairing requires two-device code comparison, and verified peers can send encrypted file/text transfers | Continue real two-device, larger-transfer, native and network acceptance |
| Files & Vault | Entries, Backups and Security are separate nested sections; credential and secure note stay a nested choice inside the Secrets editor; local unlocked search includes note text | Continue workspace integration, permissions and acceptance without restoring standalone media libraries |
| Workspace | Nested destinations, Search, Home, command palette and grouped Settings using Obsidian Ember; Home labels fixtures in preview and shows account-owned contact/request counts in live mode | Continue useful retained destinations with server-backed data and truthful unavailable states; live Home conversation summaries are not connected yet |
| Global readiness | Same-origin service, discovery, session-bound identity proofs and authenticated health | Continue connection and identity prerequisites that support retained Chat/Link features; physical-host and independent-review gates remain open |

## Retired scope

Cinema, standalone media libraries, Music, Photos library/editor, host media scanning/streaming/sharing, Locat Remote, Link remote-signaling, SentinelLab incident/webhook integrations, vendor mappings and related routes/helpers are retired. Ordinary encrypted Chat attachments remain in scope. Fresh installation is acceptable; no data recovery is requested.

## Execution order

1. Continue retained connection and identity reliability that gates Chat and Link.
2. Close high-value account/security and encrypted messaging lifecycle requirements.
3. Expand Files & Vault and workspace destinations using the shared nested UI hierarchy.
4. Run hosted and platform-specific acceptance; record concrete limits in `ENGINEERING_HISTORY.md`.

A passing test batch is a checkpoint, not overall completion. Keep backend authorization authoritative. Do not treat historical feature statuses below `MASTER_ROADMAP.md` as current scope; its user-directed override at the top controls this rework.
