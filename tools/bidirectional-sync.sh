#!/bin/bash
# Two-Way Sync: DBF <-> PostgreSQL
# Keeps DBF files and database in sync

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Configuration
DATA_DIR="${DATA_DIR:-/data}"
LAST_SYNC_FILE="last_sync.txt"

# Get last sync time (or use yesterday)
if [ -f "$LAST_SYNC_FILE" ]; then
    LAST_SYNC=$(cat "$LAST_SYNC_FILE")
else
    LAST_SYNC=$(date -d yesterday +%Y-%m-%d 2>/dev/null || date -v-1d +%Y-%m-%d)
fi

echo "========================================"
echo "Two-Way Sync Started: $(date)"
echo "Last Sync: $LAST_SYNC"
echo "========================================"

# Step 1: Import from DBF to PostgreSQL
echo ""
echo "[1/2] Importing DBF to PostgreSQL..."
node dbf-sync.js sync party "$DATA_DIR/party.dbf" --strategy UPSERT
node dbf-sync.js sync exch "$DATA_DIR/exch.dbf" --strategy UPSERT
node dbf-sync.js sync idmaster "$DATA_DIR/idmaster.dbf" --strategy UPSERT

# Step 2: Export PostgreSQL changes back to DBF
echo ""
echo "[2/2] Exporting PostgreSQL changes to DBF..."
node dbf-export.js sync-back party "$DATA_DIR/party.dbf" --mode incremental --since "$LAST_SYNC"
node dbf-export.js sync-back exch "$DATA_DIR/exch.dbf" --mode incremental --since "$LAST_SYNC"
node dbf-export.js sync-back idmaster "$DATA_DIR/idmaster.dbf" --mode incremental --since "$LAST_SYNC"

# Update last sync time
date +%Y-%m-%d > "$LAST_SYNC_FILE"

echo ""
echo "========================================"
echo "Two-Way Sync Completed: $(date)"
echo "========================================"
