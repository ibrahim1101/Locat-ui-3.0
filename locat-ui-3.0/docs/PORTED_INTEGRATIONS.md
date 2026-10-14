# Original Locat implementation ports

Source: ibrahim1101/Locat, integration/ui3 at 2e394921377fef687d565cff3208d36dd6a56b80. Original repository is read-only.

The following helpers and their original tests are copied into src/lib: musicEq, musicQueue, musicPresets, playbackProgress, imageEditing, photoEditing. The source project's GPL-3.0 license is preserved at the repository root.

Live integrations use original EQ DSP and queue policy, and photo render/export behavior. Playback progress is persisted alongside local file metadata; the original progress parser is available for future compatibility. Preset storage helpers are ported but the saved-preset UI now uses these helpers.

Cinema, Music and Photos import selected files into an account-scoped IndexedDB library. This library is device-local, not a server upload and not encrypted vault storage. Imports fail truthfully on storage errors. Favorites, albums and video resume positions persist. Native filesystem scanning, media tags/artwork extraction, thumbnails for video, server streaming/transcoding, hosted subtitles, audio track selection, music playlists and background playback are not yet connected.

The original reviewed source branch also contains chat, Link, Sentinel, private storage, native hosts and server media code. They require adapting to the SQLite/auth architecture and verifying contracts; their presence in the original repository does not imply they are live in UI 3.0.

## Additional ports

Original api/mediaRange and mediaTypes policies now drive the Node server's authenticated direct streaming; scanner behavior is adapted from mediaRouter with global scan bounds and opaque IDs. Original contracts/userCode plus its tests are ported. Direct media is connected; original FFprobe/remux/HLS and native-ticket features remain future adaptations. ORIGINAL_LOCAT_REQUIREMENTS.md preserves the original all-49 register and ecosystem scope; its historical test results do not certify UI 3.0.
