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
