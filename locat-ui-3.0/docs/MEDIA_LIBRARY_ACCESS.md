# Operator-assigned media libraries

This is same-homeserver account authorization for Cinema, Photos and Music server media. It is not federation, remote filesystem discovery or end-to-end encryption of media. The operator can read the original files. Use HTTPS outside loopback development.

## Default and migration

`LOCAT_MEDIA_AUTHORIZED_ROOTS` still selects at most 16 read-only host folders. In the default `owned` access mode, a root is invisible until an operator assigns an existing local account as its owner. Existing media files, item IDs, database accounts and local resume/favorite data are not deleted or rewritten.

An authenticated account is not automatically entitled to every configured folder. Unavailable/ungranted libraries produce the same empty account view; private paths are not returned. The account owning a root can read it. A configured friend can read it only while both accounts remain accepted contacts and neither blocks the other. Accepted friendship alone grants no library access.

Start with no policy, register the intended accounts normally, and obtain their existing local account IDs from authenticated account/API responses (`GET /api/auth/me`). These are 32 lowercase hexadecimal characters, not usernames, LC addresses, device IDs or Matrix IDs. Check them with the people involved. Stop the development/self-hosted server before changing its environment, preserve its database, then restart with the policy. Unknown owners or invalid/ambiguous policies fail startup.

Example for a Linux host (replace both placeholder IDs):

```sh
export LOCAT_MEDIA_AUTHORIZED_ROOTS='/srv/locat-movies'
export LOCAT_MEDIA_ACCESS_MODE='owned'
export LOCAT_MEDIA_LIBRARY_ACCESS='[{"root":"/srv/locat-movies","ownerId":"OWNER_32_HEX_ID","friendIds":["FRIEND_32_HEX_ID"]}]'
```

PowerShell constructs valid JSON arrays without manual path escaping:

```powershell
$env:LOCAT_MEDIA_AUTHORIZED_ROOTS = 'D:\Shared\Movies'
$env:LOCAT_MEDIA_ACCESS_MODE = 'owned'
$policy = @(@{ root = 'D:\Shared\Movies'; ownerId = 'OWNER_32_HEX_ID'; friendIds = @('FRIEND_32_HEX_ID') })
$env:LOCAT_MEDIA_LIBRARY_ACCESS = ConvertTo-Json -InputObject $policy -Depth 4 -Compress
```

Each policy root must match an already configured authorized root after path normalization. Policies cannot add a filesystem path. Assign each root once; up to 64 distinct friend IDs per root are supported. Unknown fields and duplicate/self friend entries are rejected. No browser endpoint lets a user claim a root or change ownership.

For `compose.local.yml`, policy paths refer to paths **inside the container**: its read-only media mount is `/media`, so use `/media` in the JSON, regardless of the host folder name. The template passes both access variables through explicitly. This documentation does not activate a service, tunnel or public route.

Reciprocal sharing on one homeserver uses two roots, one assigned to each account, each with the other account in `friendIds`, plus an accepted contact relationship. Cross-homeserver reciprocal streaming remains a separate roadmap item.

## Revocation and recovery

New listing, diagnostics, probe, direct/range/HEAD, remux and transcode requests recheck account permissions. Removal/blocking denies new shared-media requests immediately. Active delivery checks session/contact authorization once per second and aborts the stream when it fails, releasing its file/conversion resources. Probe results are checked again before return. Already received or buffered bytes cannot be recalled.

Configured grants persist in the operator environment, not in the SQLite database. Removing a contact suspends its configured access; accepting that contact again re-enables a still-configured grant. To revoke a grant independently, remove its ID from the policy and restart the server. Tests verify that removal remains effective after restart even while the accounts remain accepted contacts. Keep the private policy configuration with the operator backup/recovery materials; a database backup alone does not contain it.

Dynamic owner-controlled grant/revoke UI, transactional share history/auditing, guided native folder setup and independent durable grants are not implemented by this configuration foundation. A new permission control must use the existing account model and UI 3.0 components, never accept arbitrary browser-supplied host paths, and preserve the server checks above.

## Explicit compatibility mode

`LOCAT_MEDIA_ACCESS_MODE=authenticated` deliberately retains the old all-account behavior. Every authenticated account, including accounts registered later, can read every authorized root. It cannot be combined with owned policies. Use `owned` mode for private/friend libraries. Existing scanner/codec test fixtures opt into compatibility mode explicitly; separate ownership API/browser tests exercise the default permission model.

## Evidence and limits

`node --test server/mediaAccess.test.mjs server/mediaOwnership.test.mjs` uses disposable accounts/database, two synthetic H264/AAC libraries and a sparse 1 GiB file solely to test transport backpressure/abort. It verifies owner isolation, pending/accepted/ungranted/blocked policy, reciprocal probe/direct/range/remux/transcode access, contact/session stream cancellation, configuration revocation across restart and default denial. It does not test decoding a real gigabyte movie.

`browser-tests/media-sharing.spec.mjs` uses three real browser contexts against the built application, existing login/contact APIs, friend conversion/decoded frame and removal. Physical Windows/Android/Pi, the original 13 GB HEVC movie, constrained hardware performance, true cross-network/cross-server libraries and native permissions remain open acceptance tasks.
