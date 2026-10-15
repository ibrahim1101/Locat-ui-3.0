# Original Locat implementation ports

Source: ibrahim1101/Locat, integration/ui3 at 2e394921377fef687d565cff3208d36dd6a56b80. Original repository is read-only.

The following helpers and their original tests are copied into src/lib: musicEq, musicQueue, musicPresets, playbackProgress, imageEditing, photoEditing. The source project's GPL-3.0 license is preserved at the repository root.

Live integrations use original EQ DSP and queue policy, and photo render/export behavior. Playback progress is persisted alongside local file metadata; the original progress parser is available for future compatibility. Preset storage helpers are ported but the saved-preset UI now uses these helpers.

Cinema, Music and Photos import selected files into an account-scoped IndexedDB library. This library is device-local, not a server upload and not encrypted vault storage. Imports fail truthfully on storage errors. Favorites, albums and video resume positions persist. Native filesystem scanning, media tags/artwork extraction, thumbnails for video, server streaming/transcoding, hosted subtitles, audio track selection, music playlists and background playback are not yet connected.

The original reviewed source branch also contains chat, Link, Sentinel, private storage, native hosts and server media code. They require adapting to the SQLite/auth architecture and verifying contracts; their presence in the original repository does not imply they are live in UI 3.0.

## Additional ports

Original api/mediaRange and mediaTypes policies now drive the Node server's authenticated direct streaming; scanner behavior is adapted from mediaRouter with global scan bounds and opaque IDs. Original contracts/userCode plus its tests are ported. Direct media is connected; original FFprobe/remux/HLS and native-ticket features remain future adaptations. ORIGINAL_LOCAT_REQUIREMENTS.md preserves the original all-49 register and ecosystem scope; its historical test results do not certify UI 3.0.

### Sentinel continuation

Adapted the original scoped-token/webhook/incident workflow to the new SQLite authentication service and premium UI. Generic, nScout and PipelineGuard normalization, per-account source/fingerprint deduplication, severity escalation, status lifecycle, notes/history, revocable digest-only integration tokens and one-time token display are live. UI controls use shared sheets/buttons/fields. No external alerts are sent. Real vendor emitters, native host monitoring, notifications, retention/redaction and encryption of incident metadata remain pending.

### Media editing continuation

Playlist membership/order editing and opt-in sequential Cinema playback are now live in UI 3.0. The original photo renderer now powers the actual crop/text preview and edited-copy export, including crop preset/position/zoom, rotation, both flips and color adjustments. Browser/account data stays scoped; references do not copy/delete files. Browser visual/media acceptance, freehand drawing/undo, tags/artwork, synchronization and native background playback remain pending.

### Client-encrypted private storage continuation

Vault/Secrets now adapt the original wrapping/envelope/quota/revision architecture to UI3's SQLite/authentication service and shared UI theme. File/credential/note operations, encrypted metadata, client-only search/folders, locking, generator, clipboard, encrypted backup and missing-only restore are connected. See PRIVATE_STORAGE.md for exact scope, verification and original-data compatibility limits. This remains experimental and separately requires browser/native acceptance and independent security review.

### Devices and Link continuation

Original Link proof, pairing and directional transfer policies now have SQLite/authenticated UI3 paths and themed controls. Browser identities/peer pins, dual confirmation, encrypted text/URL/explicit clipboard/files, quotas, receipts, cancellation and revocation are connected. LINK_INTEGRATION.md records exact limits and original-data/domain differences; native/LAN/Remote and independent protocol acceptance remain open.

### Paired browser Remote continuation

Added a UI3-native experimental browser viewing flow using the new Link account/device proof/pins. Source consent, browser display picker, authenticated encrypted signaling, expiry and resource cleanup are connected. Original standalone Remote files remain a native-host reference; mouse/keyboard control, Android capture, TURN and actual two-device acceptance are unfinished. See REMOTE_INTEGRATION.md.

## Connect and contact privacy additions (2026-10-15)

Contact cancel/remove, privacy projection and themed settings extend the original contacts/users privacy behavior in the UI3 SQLite/auth boundary. They do not import original accounts automatically. Connect discovery, proxy configuration, readiness monitor and templates are new UI3 platform implementation responding to the supplied directives; they are not claimed as original integration compatibility. UUID schema migration preserves existing account/LC IDs, sessions and encrypted records. Existing browser keys remain origin-scoped. MASTER_ROADMAP.md preserves the expanded directive and FEATURE_MATRIX.md separates code/test/platform/review states.
