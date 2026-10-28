# Single-host Linux deployment

This is a reproducible **self-hosted preview** setup for one Linux machine running one Locat process, SQLite, systemd, and Nginx. It terminates HTTPS at Nginx and binds the Node service to loopback. It is not a multi-host design or a public-release certification.

## Build and install

Use a supported Linux host with Node.js 24 or later, npm, systemd, and Nginx. From the repository's `locat-ui-3.0/` directory:

```sh
npm ci
npm run check
npm run lint
npm run test:all
npm run build
npm prune --omit=dev
```

Install the service account and create a versioned release root, the writable database directory, and the environment directory:

```sh
sudo useradd --system --user-group --home-dir /var/lib/locat --shell /usr/sbin/nologin locat
sudo install -d -o root -g locat -m 0750 /opt/locat-releases
sudo install -d -o locat -g locat -m 0700 /var/lib/locat
sudo install -d -o root -g root -m 0750 /etc/locat
```

Stage an immutable versioned release. Include `deploy/`: the optional backup service runs `/opt/locat/deploy/scripts/backup.sh`.

```sh
set -eu
RELEASE_ID="$(node -p "require('./package.json').version")-$(git rev-parse --short HEAD)"
RELEASE_DIR="/opt/locat-releases/$RELEASE_ID"
if [ -e "$RELEASE_DIR" ] || [ -L "$RELEASE_DIR" ]; then
  echo "Release already exists: $RELEASE_DIR" >&2
  exit 1
fi
sudo install -d -o root -g locat -m 0750 "$RELEASE_DIR"
sudo cp -a dist server shared node_modules package.json deploy "$RELEASE_DIR/"
sudo chown -R root:locat "$RELEASE_DIR"
sudo find "$RELEASE_DIR" -type d -exec chmod 0750 {} +
sudo find "$RELEASE_DIR" -type f -exec chmod 0640 {} +
sudo ln -s "$RELEASE_DIR" /opt/locat
```

The `/opt/locat` symlink selects the active release. The commands above are for a fresh install; upgrades use the switch procedure below. Keep `/var/lib/locat` owned by `locat` with mode `0700`. Install `deploy/locat.env.example` as `/etc/locat/locat.env`, set the exact public HTTPS origin and database path, and keep that file root-owned with mode `0640`:

```sh
sudo install -o root -g root -m 0640 deploy/locat.env.example /etc/locat/locat.env
sudoedit /etc/locat/locat.env
```

For Debian/Ubuntu, install `deploy/nginx/locat.conf.example` as an Nginx site. Replace the sample hostname and certificate paths, configure a trusted certificate, then enable it:

```sh
sudo install -m 0644 deploy/nginx/locat.conf.example /etc/nginx/sites-available/locat
sudo ln -s /etc/nginx/sites-available/locat /etc/nginx/sites-enabled/locat
```

The port 80 server redirects to HTTPS. The exact `/api/connect/socket` location forwards WebSocket upgrade headers for the authenticated live-health socket; it does not carry messages. The proxy overwrites `X-Forwarded-For` with one canonical client address and connects to Locat over loopback; keep `LOCAT_PROXY_PEERS` aligned with that exact socket address. Do not add other peers or accept forwarded client headers directly from the network.

Install and start the unit:

```sh
sudo install -m 0644 deploy/systemd/locat.service /etc/systemd/system/locat.service
sudo systemctl daemon-reload
sudo nginx -t
sudo systemctl enable --now locat
sudo systemctl reload nginx
```

Verify `https://locat.example.net/api/ready` from a client. Confirm the returned TLS and origin fields, then register a non-sensitive test account. Review `journalctl -u locat` for startup errors. The server's strict origin and proxy-peer checks intentionally reject alternate hostnames and untrusted proxy connections.

With that account signed in, open Settings → Connection and confirm **Real-time session** reports connected. This exercises the authenticated WSS upgrade and heartbeat through Nginx. If it stays unavailable while `/api/ready` succeeds, check the exact socket location and the `Upgrade`/`Connection` forwarding before investigating application health.

## Optional daily backups

The package includes an opt-in `locat-backup.timer`. It creates a fresh timestamped SQLite online backup each day under `/var/lib/locat/backups`, then verifies it before reporting success. It never overwrites or automatically deletes an existing backup. The snapshots are not encrypted; the directory is private to the `locat` service account. Enable and inspect it with:

```sh
sudo install -m 0644 deploy/systemd/locat-backup.service /etc/systemd/system/locat-backup.service
sudo install -m 0644 deploy/systemd/locat-backup.timer /etc/systemd/system/locat-backup.timer
sudo systemctl daemon-reload
sudo systemctl enable --now locat-backup.timer
sudo systemctl start locat-backup.service
sudo systemctl status locat-backup.service
```

This intentionally has no automatic retention policy. Monitor free space and arrange operator-controlled off-host copies and retention before enabling it on a long-lived server. A backup on the same host does not protect against host or disk loss.

## Upgrade and rollback

Build and stage a new release in `/opt/locat-releases` using the steps above. Before switching, create a unique backup from the live database and verify it. Run these commands on the host; the explicit `LOCAT_DATABASE_FILE` ensures the backup uses the live database rather than a database path relative to the build checkout:

```sh
set -eu
BACKUP="/var/lib/locat/backups/locat-pre-upgrade-$(date -u +%Y%m%dT%H%M%SZ).sqlite"
sudo install -d -o locat -g locat -m 0700 /var/lib/locat/backups
sudo env LOCAT_DATABASE_FILE=/var/lib/locat/locat.sqlite node /opt/locat/server/backup.mjs "$BACKUP"
sudo node /opt/locat/server/verify-backup.mjs "$BACKUP"
BACKUP_SHA256="$(sha256sum "$BACKUP" | cut -d ' ' -f 1)"
printf 'Verified snapshot SHA-256: %s\n' "$BACKUP_SHA256"
```

Save the currently active target before switching. Stop the service, atomically change the symlink, then start the new release and check both systemd and `/api/ready`:

```sh
set -eu
OLD_RELEASE="$(readlink -f /opt/locat)"
NEXT_RELEASE="/opt/locat-releases/REPLACE-WITH-NEW-RELEASE-ID"
test -d "$OLD_RELEASE"
test -d "$NEXT_RELEASE"
sudo systemctl stop locat
SWITCH_LINK="/opt/locat.next.$$"
sudo ln -s "$NEXT_RELEASE" "$SWITCH_LINK"
sudo mv -Tf "$SWITCH_LINK" /opt/locat
sudo systemctl start locat
sudo systemctl is-active --quiet locat
curl --fail --silent --show-error https://locat.example.net/api/ready
```

For a binary-only rollback, use the saved `OLD_RELEASE` target and roll back only if that version supports the database schema already in use:

```sh
set -eu
test -d "$OLD_RELEASE"
sudo systemctl stop locat
ROLLBACK_LINK="/opt/locat.rollback.$$"
sudo ln -s "$OLD_RELEASE" "$ROLLBACK_LINK"
sudo mv -Tf "$ROLLBACK_LINK" /opt/locat
sudo systemctl start locat
sudo systemctl is-active --quiet locat
curl --fail --silent --show-error https://locat.example.net/api/ready
```

If the old binary cannot read the migrated database, keep the service stopped and restore the verified snapshot to a separate, unused path. This operation never overwrites the live database. Set ownership, update `LOCAT_DATABASE_FILE` in `/etc/locat/locat.env`, switch `/opt/locat` to the matching old release, then start and verify the service:

```sh
set -eu
RESTORED_DB="/var/lib/locat/locat-restored-$(date -u +%Y%m%dT%H%M%SZ).sqlite"
sudo node /opt/locat/server/restore-backup.mjs "$BACKUP" "$RESTORED_DB" "$BACKUP_SHA256"
sudo chown locat:locat "$RESTORED_DB"
sudo chmod 0600 "$RESTORED_DB"
sudoedit /etc/locat/locat.env
```

Keep the backup path, backup SHA-256, and old release path with the change record. If rollback or restore commands are run in a new shell, assign the recorded `OLD_RELEASE`, `BACKUP`, and `BACKUP_SHA256` values there.

Do not delete the original database or the verified snapshot until the restored service has been checked and the operator confirms the recovery.

## Boundaries

- Run exactly one Locat process with one SQLite file. Authentication rate limits are process-local and horizontal scaling is unsupported.
- Schedule backups and retention with operator-controlled tooling. The database backup is not encrypted; store it outside the web root with restricted access and verify it regularly.
- This unit does not provision certificates, Matrix, firewall rules, identity signing keys, or backup schedules.
- Review the threat model, [self-hosting limits](../docs/SELF_HOSTING.md), and [messaging setup](../docs/MESSAGING_QUICKSTART.md) before real accounts. Public-internet exposure, independent security review, recovery drills, and physical-device acceptance remain release gates.
