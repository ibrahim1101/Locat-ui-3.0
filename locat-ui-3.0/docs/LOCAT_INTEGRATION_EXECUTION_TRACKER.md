# Locat UI 3.0 active execution tracker

This tracker supersedes the earlier migration-preparation plan. The approved fresh-start decision in FRESH_START_IMPLEMENTATION.md makes ibrahim1101/Locat-ui-3.0, branch integration/locat-core, the active application. Original Locat is a read-only implementation reference. No work is to be redirected into the original repository or its release branch.

## Verified live foundation

| Area | Current UI3 behavior | Remaining acceptance or feature scope |
| --- | --- | --- |
| Authentication/accounts | Real SQLite registration/login/logout, password/session management, immutable LC codes and bio | Profile picture expansion, app lock, MFA/passkeys/account closure |
| Navigation/theme | Live routes, explicit local mode, premium UI3 controls, saved/system appearance, readiness monitor | Physical accessibility and native Back/lifecycle acceptance |
| Contacts | Account-owned requests/accept/decline/block/discovery | Cancel/remove and bio/username/request privacy implemented; wider contact fields pending; private chat remains gated |
| Media | Browser/server libraries, authenticated ranges, FFprobe/FFmpeg, local subtitles, themed music/EQ, playlists, photo crop/text | HLS/hardware/background audio, metadata/artwork, synchronization, freehand/undo and browser/native acceptance |
| Sentinel | Owned incidents/history, generic/nScout/PipelineGuard webhooks, revocable write-only tokens, notes/status actions | Real emitters/native monitoring, notifications, retention/redaction |
| Vault/Secrets | Experimental client encryption, revisions/quotas, file/credential operations, local search, lock and encrypted backup/recovery | Independent review, original encrypted-data migration, rotation, native storage/autofill/sharing |
| Devices/Link | Browser identity persistence, session-bound key proof, dual approval/pinned peers, encrypted payloads/chunks/receipts/cancellation/revocation | Real two-device/native acceptance, LAN/mDNS/P2P, cross-device media discovery/approvals and large-file memory/resume improvements |
| Hosting | Same-origin Node UI/API, trusted Host/Origin, direct/proxy TLS, discovery, authenticated health WebSockets, SQLite online backups, Docker templates and three-OS checks | Actual Docker/ARM/Pi/native operation, signed artifacts and recovery drills |
| Messaging | Live contacts; API/UI private-messaging gate; legacy rows preserved | Reviewed protocol/library gate, authenticated keys, chat lifecycle/outbox/history and all dependent messaging requirements |
| Remote | Experimental paired browser screen viewing, explicit source picker/consent, encrypted signaling, cleanup and expiry | Two-device WebRTC/TURN acceptance, authenticated native capture/input agent and platform permissions |
| Productivity/admin | Planned live states | Actual roles/admin, Hub, Calendar, Automate, Workspace, Share, Extensions and their authorization/encryption contracts |

## Full roadmap remains active

ORIGINAL_LOCAT_REQUIREMENTS.md preserves all 49 numbered requirements and the ecosystem register. Its historical statuses do not certify UI3. ENGINEERING_HISTORY.md records each actual UI3 batch, checks and limitations; PORTED_INTEGRATIONS.md records source provenance.

Continue autonomously through independent implementable work. A passed batch is a publication checkpoint, not overall completion. Keep backend authorization authoritative, never display fixture content as live, and use the current theme for every option/dialog/section. Develop and publish ordinary work only to integration/locat-core; do not merge main, deploy services or publish releases implicitly.

The new Locat Connect directive makes global connectivity the highest priority without removing ecosystem scope. See CONNECT_IMPLEMENTATION_TRACKER.md. Dependency order: stabilize shared discovery/connection/session infrastructure; evaluate reviewed messaging protocol/library and implement dependent messaging; finish account/media/infrastructure features; implement productivity/admin using real authorization and appropriate encryption/isolation; integrate native hosts and run platform acceptance. Independent tasks may proceed while an unavailable toolchain or hardware blocks acceptance elsewhere. Only concrete blocked requirements should be marked blocked; never mark the whole roadmap complete because tests pass.
