#!/bin/sh
set -eu

backup_dir=/var/lib/locat/backups
stamp=$(date -u +%Y%m%dT%H%M%SZ)
backup_file="$backup_dir/locat-$stamp.sqlite"
umask 077
mkdir -p "$backup_dir"
node /opt/locat/server/backup.mjs "$backup_file"
node /opt/locat/server/verify-backup.mjs "$backup_file"
printf 'Verified Locat backup: %s\n' "$backup_file"
