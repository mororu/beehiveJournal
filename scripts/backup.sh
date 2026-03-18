#!/bin/sh
# scripts/backup.sh
#
# WAL-safe SQLite backup for beehiveJournal.
# Uses SQLite's .backup command which is safe to run while the database is
# being written to (it waits for a clean checkpoint, not a file copy).
#
# Story 8.2 AC4-6.
#
# Usage:
#   ./scripts/backup.sh /data/db.sqlite /data/backups
#
# To run daily via cron on the VPS host (see docs/runbook.md §5):
#   0 2 * * * docker exec beehivejournal-app sh /app/scripts/backup.sh /data/db.sqlite /data/backups >> /var/log/beehivejournal-backup.log 2>&1
#
# Arguments:
#   $1  Path to the SQLite database file (default: /data/db.sqlite)
#   $2  Backup destination directory (default: /data/backups)

set -e

DB_PATH="${1:-/data/db.sqlite}"
BACKUP_DIR="${2:-/data/backups}"
RETAIN_DAYS=30

# ── Validate source ──────────────────────────────────────────────────────────
if [ ! -f "$DB_PATH" ]; then
    echo "[backup] ERROR: database not found at $DB_PATH" >&2
    exit 1
fi

# ── Ensure backup directory exists ───────────────────────────────────────────
mkdir -p "$BACKUP_DIR"

# ── Filename: db-YYYY-MM-DD_HHMMSS.sqlite ────────────────────────────────────
TIMESTAMP=$(date +%Y-%m-%d_%H%M%S)
DEST="$BACKUP_DIR/db-$TIMESTAMP.sqlite"

# ── WAL-safe backup via SQLite .backup command ───────────────────────────────
# The .backup command acquires a shared lock, flushes the WAL, and copies the
# database cleanly — safe to run against a live, write-active database.
sqlite3 "$DB_PATH" ".backup '$DEST'"

echo "[backup] Created: $DEST ($(du -h "$DEST" | cut -f1))"

# ── Retention: delete backups older than RETAIN_DAYS days ───────────────────
# Story 8.2 AC5: keep only the last 30 daily backups.
DELETED=0
find "$BACKUP_DIR" -maxdepth 1 -name 'db-*.sqlite' -type f -mtime +${RETAIN_DAYS} | while read -r OLD; do
    rm -f "$OLD"
    echo "[backup] Deleted old backup: $OLD"
    DELETED=$((DELETED + 1))
done

TOTAL=$(find "$BACKUP_DIR" -maxdepth 1 -name 'db-*.sqlite' -type f | wc -l | tr -d ' ')
echo "[backup] Done. $TOTAL backup(s) retained in $BACKUP_DIR."
