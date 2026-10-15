# Engineering history

## 2026-10-14 — Build stabilization and durable account foundation

Starting branch `integration/locat-core`: `5c7985e11efbddcb2de5054fc9e1ae7943ec8f0b`. Original Locat cloned for read-only reference. No legacy data migration performed.

- `f3424ca`: fixed literal newline breaking App.tsx, React session initialization lint error, and Vitest attempting to execute Node backend tests.
- `21912fb`: replaced JSON persistence with relational SQLite schema v1, foreign keys, unique usernames, inbox index, WAL and full synchronous writes. Added consistent online backups and recovery instructions. Added authenticated profile edits, account-scoped session list/revoke, and password changes with atomic all-session revocation. Added live account controls, Node 24 requirement, integration/UI tests and branch CI.

Verified locally: npm ci; npm run check; npm run lint; npm run test:all; npm run build. Frontend: 34 tests in 7 files. Backend: 2 suites covering API auth, envelope validation/isolation, profile editing, password replacement, cross-account revocation protection, database reopen durability, constraints, recipient cursors and restoring a consistent backup. UI tests cover revocation, failure reporting and password field clearing/sign-out. Remote CI, browser visual QA and native builds are unverified.

## Feature completion matrix

| Area | Implemented and tested | Pending |
|---|---|---|
| Build | TypeScript, lint, frontend/backend tests, Vite build | Browser QA, remote CI verification |
| Database | SQLite v1, constraints, durable writes, backup CLI, restore test | Upgrade migrations, retention, encrypted backups |
| Identity | Registration, login/logout, password change, display name | LC codes, avatars, deletion, administrative roles |
| Sessions | Persistence, expiry, account-scoped list/revoke | Device labels, rate limits, HTTPS origin configuration |
| Messaging | Authenticated ciphertext transport, recipient isolation | Reviewed E2EE and chat lifecycle integration |
| Contacts | Exact authenticated username discovery | Friend requests, blocking, groups |
| Cinema/Music/Photos | Preview UI | Actual media integrations |
| Link/Remote | Preview UI | Pairing, transfer, permissions, native capture/control |
| Sentinel/Vault/Secrets | Preview UI | Real events and audited encrypted storage |
| Application modules | Live account controls; preview screens preserved | Home/search/settings/productivity integration |
| Android/Windows | Unverified | Native hosts, permissions, APK/installer builds |
| Self-hosting | Loopback API, backup/recovery instructions | Hardened LAN HTTPS, Docker, monitoring |

Security limitations: ciphertext transport does not establish E2EE; real private messaging is not enabled. The API remains a development service, bound to loopback by default. Backups are sensitive and unencrypted. Device identities, roles, authentication rate limiting and non-loopback HTTPS are not implemented. Never replace an open SQLite database or copy only the main file while WAL is active. Old JSON paths are rejected rather than overwritten.

Next: authentication hardening and persisted settings, followed by contact state and reviewed E2EE library evaluation before connecting the chat UI.

## 2026-10-14 — Live UI shell, media ports, contacts and security

Previous verified batch published through connected GitHub as bab505227674ea7aa7e1fd6149842dee25520b54; terminal Git push lacked credentials. Remote publication combined the local commits listed above.

Original feature reference: Locat integration/ui3 at 2e39492. Ported tested music EQ, queue, presets, playback progress, image editing and photo editing helpers; preserved GPL-3.0 license and source attribution. Live mode now defaults on and uses the premium UI 3.0 shell. Preview-only routes are gated behind explicit preview mode.

Integrated local media imports in account-scoped IndexedDB, favorites, albums, sorting, downloads, real video/audio/image elements, video resume, fullscreen/PiP callbacks, music shuffle/repeat and graphic 5/10/15/31-band DSP with custom presets, and non-destructive JPEG photo export. Home/module launcher and search use actual imported media, never demonstration items. Music currently stops when leaving its screen; no server media or native background playback claims.

SQLite migrations v2 and v3 add persisted preferences, account audit events, contacts and blocks. New live contacts support requests, recipient-only acceptance/decline and blocking. Blocked pairs cannot send envelopes or discover one another. Sentinel displays actual login, password and contact/session events. Added original-style bounded authentication rate limiting (20/min/socket IP). These are development controls, not production hardening.

Validation: frontend helper, UI and IndexedDB suites; backend authorization, settings isolation, audit, contact lifecycle/blocking, throttle headers, v1-to-v3 migration preservation and future-schema rejection. Build/type/lint checks pass. Browser visual QA, media codec decoding, native builds and remote CI status must be verified separately.

### Updated completion matrix

| Module | Live in UI 3.0 | Still pending |
|---|---|---|
| Home / Modules / Search | Real module launcher, imported library counts and local media search | Decrypted message and server media search |
| Messages | Contacts, friend requests, accept/decline, blocks | Verified E2EE and conversation lifecycle |
| Cinema | Device file persistence, native video element, premium controls, resume, fullscreen/PiP | Subtitles, audio tracks, server streaming/transcoding, video thumbnails/playlists |
| Music | Device audio playback, queue stepping, shuffle/repeat, graphic EQ and presets | Metadata/artwork, playlists, cross-screen/background playback |
| Photos | Actual gallery, albums, favorites, zoom, rotation/flip/adjustments, edited copy download | Native scanning, full-resolution exports, annotations/crop UI |
| Settings | Persisted theme, profile, passwords and session controls | Full settings forms, avatars, LC codes |
| Sentinel | Real account audit events | Device security events, alert workflow, webhooks |
| Link / Remote / Vault / Secrets / native apps | No fabricated live state | Original implementation adaptation and validation |

Next dependencies remain server media access, reviewed messaging protocol integration, Link/Remote platform ports, encrypted private storage and native packaging. All original integrations are not yet ported.

## 2026-10-14 — Remaining media, self-hosting and identity requirements

Starting remote checkpoint f4e99014e736daf5dc06e1ff2d21c971441ea2e7. Read the original Locat feature register, platform roadmap, media integration and later login/section/local-mode additions. Preserved all 49 original requirements in ORIGINAL_LOCAT_REQUIREMENTS.md as a historical reference, explicitly separate from this app's completion status.

Implemented:
- Read-only operator-approved server media indexing and authenticated GET/HEAD byte-range streaming; opaque IDs, bounded scans, skipped symlinks/hidden files, per-request containment and Linux opened-inode checks. Connected device/server source selection, real image/video/audio streams and per-account browser metadata to UI 3.0.
- Built UI served by the Node API, direct TLS listener, Secure cookies, strict configured public origin, trusted Host checks and a restricted SPA/static asset server with CSP. Added non-root Docker/Compose templates and self-hosting instructions; no deployment executed.
- Schema v4 migrates existing users to stable unique LC-1234 directory codes and a public bio. Exact code discovery and immutable profile identity validation are live.
- Real diagnostics/SQLite health/media status, browser storage estimates and a 15-second readiness monitor. Local media mode has no account identity, performs no server-library requests and uses a separate device scope. Unauthenticated live entry defaults to login; successful login opens Home.
- Local WebVTT track loading/selection through the existing premium Cinema controls; validates header and 2 MB size bound, keeps subtitles client-local and cleans object URLs.

Verification: TypeScript check, zero-error/zero-warning ESLint, 63 frontend tests in 19 files, 9 backend tests, and Vite production build passed. Backend suites exercise media full/ranged/HEAD responses, invalid IDs/ranges, unauthorized access, escaping symlinks and swapped media paths, LC discovery/bio/identity rejection, migration from actual v1 schema, trusted-CA TLS auth/cookies, untrusted Host/Origin rejection and static symlink containment. UI boot tests distinguish local tools from verified accounts. OpenSSL generates disposable test material. Docker/Cargo are unavailable; no native or Docker runtime acceptance claimed. FFmpeg is present but transcoding/HLS have not been ported or tested.

Failure fixed: the TLS test's intentionally hostile Host initially changed Node's inferred TLS server name and failed before reaching the HTTP Host guard. The test now explicitly verifies the certificate for localhost while sending the hostile HTTP Host; both TLS verification and HTTP rejection are exercised. React media URL dependencies were corrected to avoid unnecessary reloads and lint warnings.

### Current remaining dependency order

1. Reviewed messaging protocol/library evaluation and authenticated device keys, then chat lifecycle, offline delivery, encrypted attachments, groups/replies/reactions and scheduling. Original custom encrypted-envelope code is not sufficient evidence of a reviewed E2EE protocol.
2. FFprobe/FFmpeg remux and HLS adaptation with authorized opened files, concurrency limits, cleanup and actual codec/signal tests; media metadata/artwork/playlists and background audio.
3. Session-bound Link pairing/proof, directional chunk transfer and clipboard; then approved Remote capture/control and platform consent.
4. Client-encrypted Vault/Secrets plus recovery, Sentinel webhook/alert workflow, roles/admin controls and profile privacy/avatars.
5. Calendar/Automate/Workspace/Share/Extensions require real authorization/encryption/isolation; preserve planned status until connected.
6. Android/Windows platform adapters, HTTPS onboarding, secure storage, native lifecycle/permissions, reproducible CI packaging and physical acceptance.

Passkeys, MFA, calls, disappearing/view-limited messages, widgets, account closure and receive-share targets remain open original requirements, not silently discarded. Preserve original accounts/data through additive migrations; never equate source presence, a preview, or a container template with runtime completion.

## UI-theme and media-compatibility continuation

Starting remote checkpoint 4f6cb157fc11e22adce3b8f19eff82acfc07c1f8. New controls remain inside UI 3.0 shared components/tokens. AGENTS.md now preserves this requirement for later engineering work.

- Adapted original playback-strategy policy and added real bounded FFprobe inspection plus cancelable FFmpeg remux/H.264-AAC conversion. Children receive bytes from an already authorized open file through stdin, never an arbitrary client pathname or shell command. Inspection has two slots and an eight-second deadline; conversion has two slots and a four-hour runtime bound. Conversion caps output at 1080p without upscaling small inputs.
- Cinema playback options use the premium player Sheet for delivery and audio-track selection. Progressive remux/conversion restarts from the beginning and disables seek buttons, seek slider and keyboard seeking. Direct playback remains seekable. HLS/adaptive switching are still pending.
- Replaced native audio controls with themed play/pause, seek, volume and mute, backed by HTMLAudioElement events. EQ presets use themed save/remove controls. Album editing and browser-copy removal use shared sheets instead of browser prompts. Explicit media cleanup stops playback/network loading on unmount and preserves video checkpoints.
- Added account/device-scoped ordered playlists from filtered library results, bounded parsing/storage, rename and confirmed deletion. Playlist deletion never deletes media. Cross-device playlist sync, item membership editing and automatic Cinema-series progression remain pending.
- Fixed contact-search, album-save, playlist-save and preset-save form buttons that were incorrectly left with the shared Button's default button type. Behavioral UI tests now exercise these submissions.
- System appearance follows OS color-scheme changes, including older MediaQueryList listener APIs. Added a Linux/Windows/macOS CI matrix with required media/TLS tools; YAML validated but remote runs are not yet verified. Docker runtime includes FFmpeg and the GPL license; the image remains unexecuted locally.

Validation: 72 frontend tests across 23 files; 11 backend tests; TypeScript check, zero-warning lint and production build passed. Real FFmpeg tests generate H.264/AAC MKV with two tones, remux/transcode the selected second audio, verify output codecs/dimensions, decode PCM and measure approximately 880 Hz, and check capacity/missing-executable cleanup. Authorization tests reject unauthenticated probes, malformed modes/audio indices, progressive seeks and invalid source inspection without host-path disclosure. UI tests exercise themed forms and non-destructive playlist deletion.

Limitations: progressive stdin processing cannot seek and may fail on containers requiring random-access input. Local imported files use browser decoding only; server conversion does not silently upload them. Converted failures after headers appear as a media failure. No genuine 4K/NVENC/HLS performance, browser visual QA, Android APK, Windows installer, native background playback or Docker execution is claimed. A Chromium-family executable is unavailable locally. Existing E2EE/Link/Remote/Vault/native dependencies remain open.

## Sentinel incident and integration continuation

Starting remote checkpoint c9c91eebf9848fa5d18fb56ed813101e7be5dc48.

- Additive SQLite schema v5 preserves existing accounts, LC codes, sessions and media preferences. It adds account-owned incidents/history and digest-only integration tokens.
- Original generic/nScout/PipelineGuard adapter mappings now feed authenticated, bounded webhook ingestion. Tokens are write-only for their owner's incidents; cookies cannot authorize ingestion. Exact Origin guards apply to account mutations, and foreign incident/token actions return 404.
- Transactional source/fingerprint deduplication, occurrence counts, severity escalation, resolved/reopened/acknowledged states and notes are live. Account-scoped status views, details/history, token creation/one-time copying and confirmed revocation use the existing UI 3.0 components.
- Request JSON now measures actual bytes and uses fatal UTF-8 decoding; webhook bodies are capped at 64 KiB. Active tokens are capped at 20/account, creation at 20/hour/account, webhook writes at 120/minute/token.

Validation: TypeScript, zero-warning lint, 74 frontend tests across 24 files, 14 backend tests, and production build passed. API coverage checks cookie-only webhook rejection, unknown formats, malformed payloads, cross-account list/detail/action isolation, hostile Origin, deduplication/escalation, note/status transitions, oversized multibyte payloads, safe token metadata and immediate revocation. Store tests verify digest persistence, cross-owner deduplication, history after restart and revoked-token rejection; adapter fixtures check failure/recovery. UI tests exercise incident acknowledgement and one-time-token form submission/clearing. Initial UI tests missed Router/BackProvider context; their test harness was corrected, with the proper provider import/root path, before successful validation.

Limitations: incident metadata remains server-readable. No native monitoring, real emitter acceptance, automatic retention/redaction, external notifications, push/background alerts or browser visual acceptance is claimed. The remaining original requirement register remains active.

## Media editing and playlist continuation

Starting remote checkpoint 0fc109b0a137f158d6c2a6704d8a5893b96ae834.

- Playlist management now stages ordered membership edits, supports adding available library items, moving items up/down and removing references, and saves atomically to the existing browser/account namespace. Closing discards staged changes. Empty playlists are supported. Limits remain 30 playlists/1000 items, with a bounded searchable addition list. Files are never deleted by membership edits.
- Cinema offers an explicit UI 3.0 switch to continue the selected filtered playlist. Completion advances to the next available ordered item and attempts playback. Manual initial selection stays paused; the final item does not wrap. Browser autoplay rejection is displayed. Closing the player stops the queue/player and clears the auto-start flag.
- Photo crop presets, crop zoom/position, vertical flip and bounded text annotations use shared controls. Preview and JPEG export use the same original canvas renderer, so crop/rotation/flip/color/text are composed in the same order. Original files stay untouched; viewer zoom only changes display. Reset clears edits, and annotation removal is non-destructive.

Validation: TypeScript, zero-warning lint, 81 frontend tests across 26 files, 14 backend tests and production build passed. UI tests verify staged membership/order until Save, no file deletion, opt-in queue progression without wrap, source crop/text/reset/export inputs, manual resume, completion callbacks and browser autoplay failure. Canvas/media methods are mocked in DOM tests; real browser pixels, decoding, autoplay/native lifecycle and visual acceptance are not certified. Missing image decode fails visibly rather than making a fake download.

Remaining media scope: freehand photo drawing, undo/redo, metadata/artwork/tag extraction, cross-device playlist synchronization, native background music, HLS/adaptive quality and hardware/4K performance acceptance. Secure messaging, device pairing/Remote, encrypted private storage, planned productivity modules and native installers remain separate open dependencies in the full original register.

## Client-encrypted Vault and Secrets continuation

Starting remote checkpoint 9a2e02c2508343abc1439dd1620486c1afd5c964.

- Schema v6 adds account/module-owned encrypted stores and objects without replacing existing accounts or integrations. Immutable initialization, expected-revision writes/deletes, transactional quotas, trusted Origin and authenticated ownership apply. The runtime Docker template now copies shared validators; no Docker execution is claimed.
- Adapted original Locat master-key wrapping and AES-GCM envelope design to UI3 string identities. Real Web Crypto uses PBKDF2-SHA256 600k, fresh salts/IVs, nonextractable keys and account/module/store/record AAD. UI3's authenticated scope deliberately differs from original numeric-account/origin scope; no original encrypted-data migration/byte compatibility is claimed.
- UI 3.0 Vault file import/decrypted downloads/metadata editing and Secrets credential/note editing, masked display, password generator and clipboard operations are connected. Search/folder filters run only over unlocked client data. Plaintext/passphrases never enter these server upload flows.
- Manual lock, hidden-page and five-minute idle lock clear forms/plaintext/key references; generation checks prevent stale unlock completion after lock/unmount. Browser memory, clipboard and native hardware protections remain separate limitations.
- Encrypted backup download and locked/unlocked missing-only restore validate/authenticate all archived entries before writes, preserve existing entries/configuration and can initialize an empty same-account store. Interrupted/rate-limited restores may partially complete and safely retry. Forgetting the private passphrase cannot be recovered by login password reset.

Validation: TypeScript, zero-warning lint, 90 frontend tests across 28 files, 16 backend tests and production build passed. Real Web Crypto tests cover round trips, nonextractability, IV uniqueness, wrong passphrase/owner/module/store/record, tampering, file-length validation and backup scope. UI tests check no secret/passphrase in uploads, hidden-page clearing, local search, safe missing-only restore and corrupted backup rejection before writes. SQLite tests write actual 4 MiB envelopes to verify 64 MiB quotas, enforce 128-object bounds, preserve ciphertext/configuration on restart and reject stale revisions/replacement configuration. API tests reject hostile Origin/unauthenticated/foreign reads, wrong module, plaintext fields and stale deletes/writes. A TypeScript UUID-default inference error was fixed with an explicit string parameter; a ref-cleanup lint warning was fixed through the intended lifecycle invalidation callback before clean validation. Base64 validation uses bounded character scans to avoid large-input regex stack sensitivity.

Limitations: detailed in PRIVATE_STORAGE.md. Browser/client trust and an independent security review remain required; this is not messaging E2EE, an audited password manager or hardware secure storage. No forgotten-passphrase recovery, original encrypted-store migration, passphrase rotation, autofill/shared vaults, large-file streaming, offline replicas or native biometric acceptance is claimed. Secure messaging, Link/Remote, planned productivity modules and native delivery remain open in the original requirement register.

## Continuous roadmap: Devices and encrypted Link

Starting remote checkpoint 3d99f8a05d2cc95d57a6ef5e27fa5ad3d24b18e4. The old execution tracker incorrectly described the superseded original-repository migration plan; it now reflects approved fresh-start development in this repository and preserves the complete remaining roadmap.

- Schema v7/v8 adds owned devices, dual-confirmation pairs, payload metadata and encrypted chunks without altering prior accounts/integrations. Ported original canonical key validation and process-local session-bound proof challenge state machine; private-key possession is mandatory for protected actions.
- Persistent browser/account nonextractable identities, concurrent first-use protection, peer-key pinning, both-screen comparison, explicit approval/rejection, current-device rename, heartbeat, key reset and durable revocation use UI3 shared controls.
- Experimental encrypted text/URL/explicit clipboard and chunked file flows use pair/account-derived keys and authenticated immutable transfer metadata/direction/chunk positions. Backend enforces actor roles, quotas, exact chunk lengths, duplicate-chunk policy, destination-only receipt and closed-transfer rules. Pair rejection/revocation cancels and purges pending ciphertext; source/destination receipt/cancel state is real and never equated with guaranteed reading or OS file save.
- Corrected lifecycle/proof-request races and kept reset reachable after self-revocation. Added bounded HTTP timeouts and pending-first delivery lists. Browser identity reset preserves unrelated account/media/private data.

Validation: TypeScript, zero-warning lint, 100 frontend tests across 32 files, 19 backend tests and production build passed. Actual Web Crypto tests exercise nonextractable persistence, concurrent IndexedDB initialization, reciprocal pair/account keys, safety transcript variation, chunk metadata/direction tampering, UTF-8 and empty files. Backend tests exercise proof replay/expiry/session/account/alias rejection, dual approval, restart/revocation, actor-scoped chunks/receipts, duplicate length/state rules and ciphertext purge. HTTP tests perform actual ECDH/HKDF/AES-GCM submission/relay/decryption, reject foreign/forged/hostile-Origin/device-role commands and prevent post-completion ciphertext revival. UI tests exercise explicit approval/pin, real rename, confirmed revocation, encrypted send contracts, missing-pin rejection and local-mode no-fetch. Initial lint failures around render-time clock and filename escaping were corrected before final checks; activity uses the server observation timestamp.

Limitations: LINK_INTEGRATION.md details experimental protocol/client trust, readable metadata, process-local proof restart/expiry, browser storage, receiver memory, interruption/resend and native/LAN/Remote gaps. Automated tests do not certify browser pixels, native permissions, two-device physical pairing or independently reviewed security. A publication checkpoint does not complete the full roadmap.

## Continuous roadmap: paired browser Remote viewing

Starting remote checkpoint be728903b6e106a36f49a9d2730b37aad7a311c5.

- Schema v9 adds owned remote sessions and bounded encrypted signaling. Requests require a proved verified pair; only the source may decide, requests expire after sixty seconds, sessions after twenty minutes, and roles gate SDP directions. Close/expiry/rejection/revocation purge active signals.
- Themed Remote uses explicit browser screen selection, pinned-pair authenticated encrypted SDP/ICE, view-only RTCPeerConnection and local resource cleanup on stop/failure/exit. There is no iframe carrying the original UI and no automatic capture or native input impersonation.
- Added a reusable account-scoped browser Link client with bounded calls, proof renewal, pins and close invalidation. Capture/authorization failure paths stop selected tracks. Unsupported capture and direct-connectivity constraints are visible.

Validation: TypeScript, zero-warning lint, 106 frontend tests across 34 files, 20 backend tests and production build passed. HTTP coverage performs actual AES-GCM encrypted signaling relay/decryption and rejects viewer approval, unapproved/wrong-direction/foreign/hostile-Origin/closed-session signals. Store coverage verifies source consent, one-time decision, cursors, expiration and revocation. Crypto/controller tests verify authenticated context, stop-on-key failure and close-on-authorization loss. UI tests verify no automatic capture, browser picker before server approval, stop on setup failure and local-mode no access. A ref cleanup warning was resolved using explicit lifecycle invalidation.

Limitations: REMOTE_INTEGRATION.md records direct WebRTC reachability/no TURN, no native input/audio, experimental security scope, polling revocation and absent physical browser/native acceptance. Native capture/control still requires a separately verified agent adapter. This is another checkpoint, not full-roadmap completion.

## 2026-10-15 — Connect foundation and account privacy checkpoint

Verified remote start: 6f4aff34a88848b9e058740359d2ac489670f715 on integration/locat-core, confirmed through GitHub after terminal fetch returned HTTP 502. Existing local account changes were preserved. Incorporated the supplied complete master roadmap and higher-priority Connect directive without removing the original all-49 register.

Implemented contact request cancellation, accepted-contact removal, server-enforced bio/username visibility and request preferences (schema 10), themed settings and authoritative profile refresh. Added schema 11 persistent server instance UUID, public versioned discovery, bounded credential-free browser discovery/manual navigation, readiness timeout/backoff/network recovery, diagnostics, fixed-peer proxy TLS termination with Secure cookies and exact Host/Origin. Added optional unexecuted Cloudflare Compose/ingress and conventional nginx templates, no DNS or deployment changes.

Validation: npm run check; npm run lint; npm run test:all (110 frontend tests/36 files; 22 backend tests); npm run build all passed. git diff --check passed. Initial TypeScript unused binding was removed. Initial proxy test used fetch with overridden Host, which did not reach the expected host; replaced with a real node:http request, then both TLS/proxy integration tests and the complete suite passed. Real FFmpeg/FFprobe/OpenSSL tests ran. Docker/cloudflared/ARM64 and real devices were not available and were not tested.

Messaging SDK feasibility checked against official Matrix/Signal sources; Matrix is the preferred integration candidate, not installed or certified E2EE. Browser server selection intentionally navigates to a separate origin rather than forwarding existing cookies/keys. Instance UUID is server-advertised, not cryptographic verification. Proxy socket buckets conservatively aggregate auth limits; public-beta abuse controls, authenticated WebSocket lifecycle, global identities, reviewed messaging, federation and real-network acceptance remain incomplete. This is a checkpoint; continue with shared connection/session work.
