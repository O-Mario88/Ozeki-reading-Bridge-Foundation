#!/usr/bin/env bash
set -euo pipefail

SOURCE_DB=${1:-../data/app.db}
BACKUP_DIR=${2:-../data/backups}

mkdir -p "$BACKUP_DIR"
TS=$(date +"%Y%m%d_%H%M%S")
DEST="$BACKUP_DIR/app-pre-migration-$TS.sqlite"
cp "$SOURCE_DB" "$DEST"

echo "SQLite backup created: $DEST"
