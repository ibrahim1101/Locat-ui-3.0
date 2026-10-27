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

Keep the built directory at `/opt/locat` with `dist/`, `server/`, `shared/`, `node_modules/`, and `package.json`. Install the service account and writable database directory:

```sh
sudo useradd --system --home-dir /var/lib/locat --shell /usr/sbin/nologin locat
sudo install -d -o root -g locat -m 0750 /opt/locat
sudo install -d -o locat -g locat -m 0700 /var/lib/locat
sudo install -d -o root -g root -m 0750 /etc/locat
```

Copy the built application to `/opt/locat`. Make its files owned by `root:locat`, directories mode `0750`, and files mode `0640`; keep `/var/lib/locat` owned by `locat` with mode `0700`. Install `deploy/locat.env.example` as `/etc/locat/locat.env`, set the exact public HTTPS origin, and make the file root-owned mode `0640`.

Install `deploy/nginx/locat.conf.example` as an Nginx site. Replace the sample hostname and certificate paths. Configure a trusted certificate before enabling the site. The port 80 server redirects to HTTPS. The exact `/api/connect/socket` location forwards WebSocket upgrade headers for the authenticated live-health socket; it does not carry messages. The proxy overwrites `X-Forwarded-For` with one canonical client address and connects to Locat over loopback; keep `LOCAT_PROXY_PEERS` aligned with that exact socket address. Do not add other peers or accept forwarded client headers directly from the network.

Install and start the unit:

```sh
sudo install -m 0644 deploy/systemd/locat.service /etc/systemd/system/locat.service
sudo systemctl daemon-reload
sudo systemctl enable --now locat
sudo nginx -t
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

Build a new copy outside `/opt/locat`, run the full check sequence above, and create and verify a new database backup before switching versions:

```sh
npm run backup:server -- /var/lib/locat/backups/locat-before-upgrade.sqlite
npm run verify:backup -- /var/lib/locat/backups/locat-before-upgrade.sqlite
```

Keep versioned application directories and point `/opt/locat` to one selected version only while the service is stopped. For schema-changing upgrades, preserve the backup and do not roll the old binary onto a database that has already migrated unless that version explicitly supports the newer schema. Restore only into a separate database copy using the documented restore procedure; verify it before changing `LOCAT_DATABASE_FILE`.

## Boundaries

- Run exactly one Locat process with one SQLite file. Authentication rate limits are process-local and horizontal scaling is unsupported.
- Schedule backups and retention with operator-controlled tooling. The database backup is not encrypted; store it outside the web root with restricted access and verify it regularly.
- This unit does not provision certificates, Matrix, firewall rules, identity signing keys, or backup schedules.
- Review the threat model, [self-hosting limits](../docs/SELF_HOSTING.md), and [messaging setup](../docs/MESSAGING_QUICKSTART.md) before real accounts. Public-internet exposure, independent security review, recovery drills, and physical-device acceptance remain release gates.
