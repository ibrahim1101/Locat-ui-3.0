# Self-hosted UI 3.0 server

Node 24+ serves both the built UI and API. This is a development deployment, not a claim of production readiness. Experimental encrypted text conversations now use the optional private Matrix/Synapse service and have actual browser acceptance. Full recovery, broader messaging, native clients and advanced administration remain incomplete. See MESSAGING_QUICKSTART.md for the verified workflow and limits. Progressive FFmpeg conversion is connected with documented limits. Nothing is automatically deployed.

The web UI's current CSS toolchain requires Chrome/Edge 111+, Firefox 128+, or Safari 16.4+. Keep the embedded Android WebView at a supported Chromium version. Native platform acceptance remains separate.

## One machine

From locat-ui-3.0:

```
npm ci
npm run build
npm start
```

Open http://127.0.0.1:8787. Vite is unnecessary for the built app. For frontend development use npm run dev and npm run dev:server in separate terminals. Live mode is default; VITE_LOCAT_LIVE=false selects the preview only when building/running Vite.

## Same LAN over HTTPS

Supply an existing certificate and private key trusted by your clients. Use a hostname/IP covered by that certificate. Do not disable certificate verification. Certificates are operator-provided; this app does not provision or log keys.

PowerShell:

```powershell
$env:LOCAT_HOST='0.0.0.0'
$env:LOCAT_PUBLIC_ORIGIN='https://locat.example.local:8787'
$env:LOCAT_TLS_KEY='D:\Locat\certs\key.pem'
$env:LOCAT_TLS_CERT='D:\Locat\certs\cert.pem'
$env:LOCAT_MEDIA_AUTHORIZED_ROOTS='D:\Shared\Movies;D:\Shared\Music'
npm start
```

Use your actual hostname and certificate paths. Configure host DNS and permit port 8787 on your private LAN firewall. Same-LAN use does not require Tailscale. Native app onboarding and remote access are separate work. Non-loopback listeners fail startup without TLS and an explicit public origin. Secure cookies and exact Origin/Host checks apply in HTTPS mode; forwarded headers never determine origin. Optional explicit reverse-proxy TLS termination is documented in CONNECT_ARCHITECTURE.md and CLOUDFLARE_DEPLOYMENT.md. Direct TLS remains the default LAN path.

Optional qualified global identities can be signed by a separate Ed25519 authority key. Generate it with `node tools/generate-server-identity-key.mjs /absolute/private/path/locat-identity.pem`, restrict it to the service owner (on Windows, use an owner-only ACL), and set `LOCAT_IDENTITY_SIGNING_KEY_FILE` before startup. Keep this key out of the database, application backups and Git; protect a separate recovery copy. The server signs domain-separated claims for its canonical origin and account identities, but current clients do not verify/pin the signatures and no rotation or recovery protocol exists. This option does not enable federation or prove domain ownership. See GLOBAL_IDENTITY_THREAT_MODEL.md.

## Shared media

LOCAT_MEDIA_AUTHORIZED_ROOTS is a platform-delimited list (semicolon on Windows, colon on Linux) of at most 16 operator-approved folders. Roots now default to operator-assigned ownership and explicitly configured accepted friends; unassigned roots are invisible. See [MEDIA_LIBRARY_ACCESS.md](MEDIA_LIBRARY_ACCESS.md) for account bootstrap, policy JSON and the explicit legacy compatibility option. No client supplies a path. Indexing skips symlinks and hidden files, allows raster/audio/video extensions only, and is bounded to 3000 media entries, 20000 visited entries and six directory levels. Index cache lasts 60 seconds; authenticated same-origin Refresh server forces a coalesced scan, bounded to six requests per account and thirty across the server process per minute.

GET /api/media lists library status and opaque item IDs. GET/HEAD /api/media/stream/<id> requires the current session and supports full/suffix/open-ended byte ranges. Session and library authorization are rechecked on each request; active streams are cancelled within the one-second polling interval after session/contact revocation. Already sent or buffered bytes cannot be recalled. Files cannot be modified/deleted via these endpoints.

Linux checks containment again against the opened file descriptor; other operating systems still have directory replacement race limitations and need platform hardening before use with an untrusted multi-user filesystem. FFprobe inspection and progressive FFmpeg remux/transcoding are connected. Client-native playback tickets, HLS and per-account media-root ACLs are not connected. Decoder support still depends on the browser.

Server-media favorites/albums/resume are device/account-scoped browser metadata. They do not modify host files and currently do not synchronize between clients. Edited server photos export new browser downloads.

## Docker template

From the repository root, provide certs/key.pem and certs/cert.pem readable by the container's node user, select a read-only media folder, and set LOCAT_PUBLIC_ORIGIN to the actual HTTPS origin. Then run:

```
docker compose -f compose.local.yml up --build
```

The image builds the frontend and runs Node as a non-root user. SQLite uses the locat_data volume. Certificates/media are read-only mounts. The container filesystem is read-only with a temporary /tmp. The health check confirms TCP listener liveness; /api/ready supplies application readiness. Do not use a broad home/system directory as the shared media mount. Docker was not available for local execution; validate this template on an isolated host before using it.

## Backups

See server/README.md for consistent SQLite online backups and recovery. Browser media, server host files and certificates are not included in SQLite backups. Preserve those separately. Unknown newer database schemas fail closed, and migrations preserve existing account IDs and sessions.

## Playback conversion

Install FFmpeg/FFprobe on PATH, or set LOCAT_FFMPEG_PATH and LOCAT_FFPROBE_PATH to trusted operator-owned executables. The updated Docker runtime installs FFmpeg, but this image has not been executed locally.

Cinema > Quality > Playback options opens the UI 3.0 compatibility sheet. GET /api/media/probe/<id> inspects only authorized media. A direct stream remains the default. mode=remux copies eligible H.264/audio streams into fragmented MP4; mode=transcode converts to software H.264/AAC at no more than 1920x1080 without enlarging small inputs. An optional audio=<stream-index> selects a validated audio stream for converted playback. Remux is start-only. Known-duration H264/AAC conversion supports bounded integer-second seek/restart/resume; Linux seeks through the inherited authorized inode, while other platforms retain bounded sequential input and may time out. Unknown-duration conversion cannot seek. Adaptive quality/HLS and hardware acceleration remain open. Two workers, startup/total deadlines and disconnect cancellation remain enforced. Native/browser decoding and performance acceptance remain separate.

Worker stdin is connected to an authorized open file handle. Containers requiring random access (for example some MP4 layouts) may not inspect or convert successfully via this progressive input path. Errors are explicit; no universal-codec guarantee is made. FFmpeg failures after headers have begun terminate the stream and surface as player errors.

Playlists, album overrides, favorites, EQ presets and resume pointers remain scoped to this browser/account (or explicit local device mode). Playlists contain references, not file copies; removing a playlist does not delete its files. They are not synchronized or included in SQLite server backups.

## Browser media editing

Manage playlist supports staged membership/order edits; save applies them, and closing discards them. Missing media references are retained until explicitly removed. Cinema's Continue video playlist switch applies only to the selected filtered playlist, advances after completion and stops at its last item. It attempts browser playback rather than bypassing autoplay policy; any denied attempt is shown as a playback error. Closing stops playback.

Photo crop/text controls render the same composition for preview and exported JPEG copies. Export retains the maximum 1600-pixel edge and bounded JPEG size inherited from the original helper. The host/device original remains unchanged. Canvas color-filter support varies by browser; unsupported adjustments fail explicitly. Freehand drawing, undo history and real browser pixel acceptance remain pending.
