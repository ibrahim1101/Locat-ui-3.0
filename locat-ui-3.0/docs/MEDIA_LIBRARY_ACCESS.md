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

Owners can open **Library sharing** in Cinema, Music or Photos, then grant or revoke access for accepted contacts. Only operator-assigned owners see their libraries. The API accepts opaque existing library IDs and contact IDs, never filesystem paths or ownership claims. All media kinds inside the selected root share that root's permissions. The panel waits for server acknowledgement and reports failures without optimistic permission changes or automatic retries.

Owner decisions are durable SQLite records (schema 16), written atomically with an account audit event. Repeated identical decisions are idempotent. An explicit owner revoke overrides a configured `friendIds` seed, including after server restart with unchanged configuration and after contact reacceptance. Removing/blocking a contact suspends a still-granted share; accepting again resumes it unless explicitly revoked. Up to 128 distinct owner decisions per library are retained, including revocation tombstones; reaching the limit refuses a new decision and asks for operator assistance. Existing decisions can still be revoked. Writes are limited to 30 per account per minute. Unknown/changed sessions and wrong-account requests are denied.

Operator policy still determines which roots exist and who owns them. Removing a seed stops its access unless the owner independently granted it. To disable a root entirely, remove its ownership policy/root configuration. Library identifiers bind the normalized absolute configured path and owner; changing either creates a different permission scope. Review configured friend seeds when making such operator changes. Browser clients cannot change these definitions. Keep the private operator policy with backup materials; a SQLite backup includes owner decisions/audits, but does not contain root configuration or the original media files.

The additive schema 15 → 16 migration preserves accounts and prior data. Create a completed server backup before upgrading. Older application versions reject schema 16; rollback uses a separate pre-upgrade backup with its matching application version, never manual table deletion or replacing an open database. Restoring an older snapshot can restore its older permissions: review sharing before returning service to users.

Native folder setup, cross-homeserver library sharing and hardware acceptance remain open. This UI does not add arbitrary host paths or bypass current contact/session checks.

## Explicit compatibility mode

`LOCAT_MEDIA_ACCESS_MODE=authenticated` deliberately retains the old all-account behavior. Every authenticated account, including accounts registered later, can read every authorized root. It cannot be combined with owned policies. Use `owned` mode for private/friend libraries. Existing scanner/codec test fixtures opt into compatibility mode explicitly; separate ownership API/browser tests exercise the default permission model.

## Evidence and limits

`node --test server/mediaAccess.test.mjs server/mediaOwnership.test.mjs` uses disposable accounts/database, two synthetic H264/AAC libraries and a sparse 1 GiB file solely to test transport backpressure/abort. It verifies owner isolation, pending/accepted/ungranted/blocked policy, reciprocal probe/direct/range/remux/transcode access, contact/session stream cancellation, configuration revocation across restart, owner API isolation, Origin/account checks, explicit revocation after unchanged-config restart/contact reacceptance, and default denial. It does not test decoding a real gigabyte movie.

`browser-tests/media-sharing.spec.mjs` uses three real browser contexts against the built application, existing login/contact APIs, friend conversion/decoded frame, actual themed owner grant/revoke controls, and contact removal. Physical Windows/Android/Pi, the original 13 GB HEVC movie, constrained hardware performance, true cross-network/cross-server libraries and native permissions remain open acceptance tasks.
