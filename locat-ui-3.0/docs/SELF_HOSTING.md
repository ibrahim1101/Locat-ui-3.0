# Self-hosted UI 3.0 server

Node 24+ serves both the built UI and API. This is a development deployment, not a claim of production readiness. Private chat, E2EE, transcoding, native clients and advanced administration remain incomplete. Nothing is automatically deployed.

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

Use your actual hostname and certificate paths. Configure host DNS and permit port 8787 on your private LAN firewall. Same-LAN use does not require Tailscale. Native app onboarding and remote access are separate work. Non-loopback listeners fail startup without TLS and an explicit public origin. Secure cookies and exact Origin/Host checks apply in HTTPS mode; forwarding-proxy headers are not trusted. Reverse-proxy TLS termination is not implemented in this configuration.

## Shared media

LOCAT_MEDIA_AUTHORIZED_ROOTS is a platform-delimited list (semicolon on Windows, colon on Linux) of at most 16 operator-approved folders. Every registered account can read these shared folders; they are not private per-user vaults. No client supplies a path. Indexing skips symlinks and hidden files, allows raster/audio/video extensions only, and is bounded to 3000 media entries, 20000 visited entries and six directory levels. Index cache lasts 60 seconds; Refresh server may show the cached scan until then.

GET /api/media lists library status and opaque item IDs. GET/HEAD /api/media/stream/<id> requires the current session and supports full/suffix/open-ended byte ranges. Existing sessions are rechecked on each request; revocation cannot recall bytes already sent or cancel an already authorized stream. Files cannot be modified/deleted via these endpoints.

Linux checks containment again against the opened file descriptor; other operating systems still have directory replacement race limitations and need platform hardening before use with an untrusted multi-user filesystem. No client-native playback tickets, FFmpeg remux/HLS, or per-account media-root ACLs are connected yet. Decoder support still depends on the browser.

Server-media favorites/albums/resume are device/account-scoped browser metadata. They do not modify host files and currently do not synchronize between clients. Edited server photos export new browser downloads.

## Docker template

From the repository root, provide certs/key.pem and certs/cert.pem readable by the container's node user, select a read-only media folder, and set LOCAT_PUBLIC_ORIGIN to the actual HTTPS origin. Then run:

```
docker compose -f compose.local.yml up --build
```

The image builds the frontend and runs Node as a non-root user. SQLite uses the locat_data volume. Certificates/media are read-only mounts. The container filesystem is read-only with a temporary /tmp. The health check confirms TCP listener liveness; /api/ready supplies application readiness. Do not use a broad home/system directory as the shared media mount. Docker was not available for local execution; validate this template on an isolated host before using it.

## Backups

See server/README.md for consistent SQLite online backups and recovery. Browser media, server host files and certificates are not included in SQLite backups. Preserve those separately. Unknown newer database schemas fail closed, and migrations preserve existing account IDs and sessions.
