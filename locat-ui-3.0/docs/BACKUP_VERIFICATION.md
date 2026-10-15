# Operator backup verification

Create a new standalone database snapshot using the existing command:

```
npm run backup:server -- /private/path/new-backup.sqlite
```

Verify that completed snapshot:

```
npm run verify:backup -- /private/path/new-backup.sqlite
npm run verify:backup -- /private/path/new-backup.sqlite <trusted-expected-sha256>
```

This is a local operator CLI, with no HTTP route or ordinary-user filesystem browser. It requires Node 24+. Success prints a JSON summary and exits 0; failure prints a bounded reason and exits nonzero. The optional expected value must be exactly 64 hexadecimal characters. A checksum without a trusted earlier expected value is a baseline, not proof of authenticity or an independently signed backup.

The verifier accepts a regular 100-byte–2-GiB file and rejects leaf symlinks, nonempty -wal/-journal sidecars, malformed headers and inputs that change identity/size/mtime/ctime during copying. Use a completed standalone snapshot, not the live WAL database. It streams bytes and SHA-256 into a new private temporary file; only this copy is opened by SQLite, in read-only/query-only mode with trusted schema disabled. The selected original is not opened by SQLite, migrated, repaired, overwritten or restored. Temporary files and handles are released on success/failure. POSIX temporary file/directory modes are private; this does not assert native hardware protection or cross-platform ACL certification.

Checks cover SQLite integrity, foreign-key consistency, supported schema version, required tables and version-appropriate column presence. Versions 1 through the current version 14 are supported without applying migrations. A shared current-version constant and verifier manifest must remain synchronized; a later migration without a manifest update fails closed. Checks do not authenticate every application invariant, recreate missing constraints or prove that a backup came from a trusted server. The report contains size, digest, hash-match status, schema/check results, selected table counts and verification time; it contains no raw account/profile/password verifier, session, ciphertext or private-key rows.

No restore is performed. Test restoration separately in an isolated environment before relying on a recovery plan. This snapshot covers only the Node Locat SQLite database. Media/file roots, browser IndexedDB crypto identities/history, Matrix sidecar/PostgreSQL data, deployment configuration and operator secrets require their own backup/recovery processes. A successful check does not demonstrate passphrase availability, ciphertext decryption, native/browser behavior or recovery of the entire ecosystem. The database backup itself is not encrypted by this tool and must be protected as server data.

Tests create synthetic snapshots and check CLI success/failure codes, expected-hash mismatch, unchanged source bytes/directory, old-version non-migration, corrupted pages, required schema, orphan foreign keys, active journals and symlink rejection where supported. Actual operator backups, Windows/native restore and complete ecosystem recovery have not been certified. No public service or operator configuration was activated.
