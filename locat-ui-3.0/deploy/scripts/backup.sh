#!/bin/sh
set -eu

app_dir=${LOCAT_APP_DIR:-/opt/locat}
backup_dir=${LOCAT_BACKUP_DIR:-/var/lib/locat/backups}
stamp=$(date -u +%Y%m%dT%H%M%SZ)
backup_file="$backup_dir/locat-$stamp.sqlite"
umask 077
mkdir -p "$backup_dir"
node "$app_dir/server/backup.mjs" "$backup_file"
node "$app_dir/server/verify-backup.mjs" "$backup_file"
printf 'Verified Locat backup: %s\n' "$backup_file"
