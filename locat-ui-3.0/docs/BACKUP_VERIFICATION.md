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

Checks cover SQLite integrity, foreign-key consistency, supported schema version, required tables and version-appropriate column presence. Versions 1 through the current version 28 are supported without applying migrations. A shared current-version constant and verifier manifest must remain synchronized; a later migration without a manifest update fails closed. Checks do not authenticate every application invariant, recreate missing constraints or prove that a backup came from a trusted server. The report contains size, digest, hash-match status, schema/check results, selected table counts and verification time; it contains no raw account/profile/password verifier, session, ciphertext or private-key rows.

Verification itself performs no restore. The separate new-file restore command below supports isolated SQLite recovery rehearsals. Test restoration in an isolated environment before relying on a recovery plan. This snapshot covers only the Node Locat SQLite database. Media/file roots, browser IndexedDB crypto identities/history, Matrix sidecar/PostgreSQL data, deployment configuration and operator secrets require their own backup/recovery processes. A successful check does not demonstrate passphrase availability, ciphertext decryption, native/browser behavior or recovery of the entire ecosystem. The database backup itself is not encrypted by this tool and must be protected as server data.

Tests create synthetic snapshots and check CLI success/failure codes, expected-hash mismatch, unchanged source bytes/directory, old-version non-migration, corrupted pages, required schema, orphan foreign keys, active journals and symlink rejection where supported. Actual operator backups, Windows/native restore and complete ecosystem recovery have not been certified. No public service or operator configuration was activated.

Backup creation stages the SQLite snapshot in a private directory beside the chosen destination and publishes the completed mode-0600 file with an exclusive hard link. Existing destinations, including concurrently created files, are never replaced. The destination filesystem must support hard links; unsupported filesystems return an error. This does not establish power-loss durability or restore acceptance.

## Restore a verified snapshot to a new file

Use a private existing destination directory, with sufficient free space for the private verification copy and the staged restored file. Keep the expected SHA-256 separately from the backup if it is intended to detect untrusted changes.

```
npm run verify:backup -- /private/path/backup.sqlite
# Record the reported sha256 and compare it with a digest retained separately.
npm run restore:server -- /private/path/backup.sqlite /private/rehearsal/restored.sqlite <trusted-expected-sha256>
npm run verify:backup -- /private/rehearsal/restored.sqlite <trusted-expected-sha256>
```

The checksum is mandatory for restore. The command validates and hashes a stable private snapshot using the same checks as verification, then copies that exact snapshot rather than reopening the original path. It closes SQLite before consumption. The new file is staged in a private directory beside the destination, set to mode 0600, flushed and published with an exclusive hard link. An existing destination, symlink, directory or any existing destination -wal/-shm/-journal file is rejected, including empty sidecars. Competing writers cannot overwrite a destination through this command. The parent directory must already exist and the filesystem must support hard links. Use a directory controlled by the operator; this does not isolate against another process authorized to write that directory or run SQLite on the same path.

Success prints the verification report plus operation `restore-to-new-file`, the resolved destination and `activated: false`. It exits 0 only after publication. Failure exits nonzero; staging is cleaned up. Source bytes and schema version are preserved. Neither verification nor restore migrates a snapshot; opening an older restored copy with the server subsequently invokes normal migrations. No service is started, live file replaced, deployment configuration changed or Matrix sidecar contacted. File flushing is not a cross-platform power-loss durability certification.

**Keep recovery rehearsals offline and isolated from production integrations.** A restored database preserves its old authentication/session state, revocation queue, service mapping and server instance ID. Revocations or password changes made after the snapshot are absent. Starting a duplicate against production Matrix credentials could act on the same managed identities; merely copying SQLite cannot reconcile those systems. Before any production activation, stop the old instance, reconcile the database and sidecar recovery point, review stale sessions/tokens and queued work, and use an operator-reviewed recovery procedure. This command does not implement those activation steps or claim full identity recovery. Avoid copying production operator secrets into a rehearsal.

Synthetic tests cover source-byte preservation, byte-identical output, original server identity, account lookup, opaque Vault configuration/records, independent writes after reopening, expected-hash enforcement, empty sidecar rejection, existing-file/symlink preservation, concurrent exclusive publication, CLI exit status, old-version non-migration and verification-copy cleanup after a consumer failure. These Linux/Node tests do not establish physical Windows/Android/macOS/browser, external sidecar, real operator backup or full ecosystem recovery acceptance.

## Read-only source handling during backup creation

`backup:server` uses `LOCAT_DATABASE_FILE` (default `./server/data/locat.sqlite`) as an existing regular source file. It opens SQLite read-only with query-only mode and trusted schema disabled, without running application startup or migrations. Missing sources are rejected rather than created. An online SQLite backup includes committed data still in a live source's WAL; copying only the live main file would omit that data. SQLite may use its normal source journal/shared-memory mechanisms, so this is not a claim that the source directory is untouched or isolated from another authorized writer.

The staged standalone snapshot must pass the same 100-byte–2-GiB, supported-version, integrity, foreign-key and required-schema checks before publication. Validation failures leave no published destination. Older supported sources remain at their original version. Both the shared backup writer and restore reject any pre-existing destination or destination -wal/-shm/-journal, including empty files and symlinks. Use operator-controlled directories; these checks do not fence unrelated writers using the same directory.

Backup CLI success retains its path-only stdout contract. Missing/extra arguments and failures return nonzero with a bounded reason. Obtain and retain the digest with `verify:backup` before recovery. Tests exercise committed WAL content, source-byte preservation, no missing-source creation, unsupported/malformed snapshot rejection before publication, old-schema non-migration, destination sidecars and CLI compatibility. Backing up and restoring remain explicit commands; no recurring schedule, retention deletion, encrypted archive or production activation is enabled.
