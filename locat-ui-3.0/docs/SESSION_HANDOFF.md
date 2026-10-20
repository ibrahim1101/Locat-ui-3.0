# Locat UI 3.0 session handoff

Updated 2026-10-20. Continue on branch rework/locat-core-scope in repository ibrahim1101/Locat-ui-3.0. Current source checkpoint: 27885182f2e05e6f569f5aa3a66bfa55c4480b4d.

## Active direction

Keep the Obsidian Ember theme and nested navigation/disclosures. Work on retained Locat core: Chat, Link, Files & Vault, account/security and workspace foundations. Cinema/media libraries, Locat Remote, and SentinelLab/vendor alert integration are retired. Do not restore them. No data recovery is requested; no service or live database has been changed by these code changes.

## Current live Chat work

- Verified one-to-one Matrix conversations with encrypted text, replies/reactions, attachments, voice review, one-time location, stickers/doodles and local image crop/rotate.
- Conversation search is a collapsed header section. It searches text and attachment names in the up-to-200 decrypted messages already loaded on this device.
- Own-text editing uses an encrypted event. The original target ID and replacement text are inside the ciphertext; projection requires the same sender on original and edit.
- Search is local-only; edits are append-only encrypted events. Scheduled send is still unavailable because the current server cannot reliably send as a device-held Matrix user when the app is closed.

## Validation and current worktree

Local check/lint, all tests (267 frontend / 108 server), build, browser-spec syntax/discovery and git diff --check passed at source commit 2788518. Exact-source hosted workflows for the new edit browser scenario are pending. The existing Matrix crypto bundle size warning remains.

## Next

Observe all hosted jobs for the current commit. Fix failures without weakening authorization, ciphertext privacy or sender-match assertions; update the engineering history with final run IDs. Then continue retained core work in nested UI groups. Physical platforms and broader recovery/security acceptance remain open.

Historical handoff: docs/archive/SESSION_HANDOFF_2026-10-20_pre-search.md.
