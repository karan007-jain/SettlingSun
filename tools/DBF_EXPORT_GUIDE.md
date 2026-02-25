# PostgreSQL to DBF Export Tool

Tool to export data from PostgreSQL back to DBF files when data is created/updated in the web system.

## Installation

```bash
cd tools
npm install
```

Same dependencies as dbf-sync.js (already installed if you set up sync).

## Configuration

Uses the same `.env` file as dbf-sync.js:

```env
API_URL=http://localhost:3000/api/trpc
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=admin123
```

## Commands

### Full Export (Replace DBF File)

Export all data from PostgreSQL and create new DBF file:

```bash
# Export Party Master
node dbf-export.js export party party_master.dbf

# Export Exchange
node dbf-export.js export exch exchange.dbf

# Export ID Master
node dbf-export.js export idmaster id_master.dbf
```

### Incremental Export (Modified Records Only)

Export only records modified since a specific date:

**Note:** Uses PostgreSQL's internal `updatedAt` timestamp to filter records, but doesn't export this field to DBF.

```bash
node dbf-export.js export party party_master.dbf --since 2024-01-01
node dbf-export.js export exch exchange.dbf --since 2024-01-15
node dbf-export.js export idmaster id_master.dbf --since 2024-02-01
```

### Export All Changes

Export all changed records across all tables since a date:

```bash
# Export to default directory (.)
node dbf-export.js export-changes --since 2024-01-01

# Export to specific directory
node dbf-export.js export-changes --since 2024-01-01 --output changes/

# Export specific entities only
node dbf-export.js export-changes --since 2024-01-01 --entities party,exch
```

### Sync Back to Existing DBF

Update existing DBF files with PostgreSQL data:

```bash
# Full sync (replace all records)
node dbf-export.js sync-back party party_master.dbf --mode full

# Incremental sync (update changed records only)
node dbf-export.js sync-back party party_master.dbf --mode incremental --since 2024-01-01
node dbf-export.js sync-back exch exchange.dbf --mode incremental --since 2024-01-01
node dbf-export.js sync-back idmaster id_master.dbf --mode incremental --since 2024-01-01
```

## Sync Modes

### Full Mode
- Replaces entire DBF file with PostgreSQL data
- Use for complete refresh
- Overwrites all existing data

```bash
--mode full
```

### Incremental Mode
- Updates existing records and adds new ones
- Preserves records not in PostgreSQL
- Requires `--since` date parameter

```bash
--mode incremental --since 2024-01-01
```

## Duplicate Checking

**Important:** DBF files don't support primary keys or unique constraints. The export tool implements manual duplicate checking to prevent conflicts.

### Unique Fields Checked

#### PARTYMST.DBF (Party Master)
- **PARTY_CODE (P_CODE)**: Checked before adding new party records
- Records with duplicate party codes are skipped with a warning

#### ITEMMAST.DBF (Exchange)
- **ID_NAME (IDNAME)**: Must be unique across all exchange records
- **SHORT_CODE (SHORT)**: Must also be unique
- Both fields are checked - if either exists, the record is skipped
- This prevents duplicate exchanges that could cause confusion

#### IDMASTER.DBF (ID Master)
- **USER_ID (USERID)**: Checked before adding new ID records
- Records with duplicate user IDs are skipped with a warning

### Behavior During Incremental Sync

When using `--mode incremental`:

1. **Existing Record Found**: Record is **updated** with new data
2. **New Record, No Duplicates**: Record is **added** to file
3. **New Record, Duplicate Key**: Record is **skipped** and logged as warning

Example output:
```
Updating party_master.dbf with 5 records...
  Updated: PARTY_CODE=ABC123
  Added: PARTY_CODE=XYZ456
  ⚠ Skipped: PARTY_CODE=ABC123 already exists
  Added: PARTY_CODE=DEF789
✓ Updated 1 records, added 2 new records, skipped 2 duplicates
```

### Handling Skipped Records

If records are skipped due to duplicates:

1. **Check Source Data**: Verify you're not accidentally creating duplicates in PostgreSQL
2. **Review Logs**: The skip message shows which field caused the conflict
3. **Manual Resolution**: If needed, manually update the DBF record or remove the duplicate
4. **Re-sync**: Use `--mode full` to completely replace the file if needed

## Use Cases

### 1. Daily Incremental Sync

Sync changes from web system back to DBF files daily:

```bash
# Get yesterday's changes
node dbf-export.js sync-back party party_master.dbf --mode incremental --since $(date -d yesterday +%Y-%m-%d)
node dbf-export.js sync-back exch exchange.dbf --mode incremental --since $(date -d yesterday +%Y-%m-%d)
node dbf-export.js sync-back idmaster id_master.dbf --mode incremental --since $(date -d yesterday +%Y-%m-%d)
```

### 2. Backup to DBF

Create DBF backups of current database state:

```bash
mkdir backups/$(date +%Y%m%d)
node dbf-export.js export party backups/$(date +%Y%m%d)/party.dbf
node dbf-export.js export exch backups/$(date +%Y%m%d)/exch.dbf
node dbf-export.js export idmaster backups/$(date +%Y%m%d)/idmaster.dbf
```

### 3. Two-Way Sync

Keep DBF and PostgreSQL in sync:

```bash
# Morning: Import from DBF to PostgreSQL
node dbf-sync.js sync party party_master.dbf --strategy UPSERT
node dbf-sync.js sync exch exchange.dbf --strategy UPSERT
node dbf-sync.js sync idmaster id_master.dbf --strategy UPSERT

# Evening: Export PostgreSQL changes back to DBF
LAST_SYNC=$(cat last_sync_time.txt)
node dbf-export.js sync-back party party_master.dbf --mode incremental --since $LAST_SYNC
node dbf-export.js sync-back exch exchange.dbf --mode incremental --since $LAST_SYNC
node dbf-export.js sync-back idmaster id_master.dbf --mode incremental --since $LAST_SYNC
echo $(date -Iseconds) > last_sync_time.txt
```

## DBF Output Format

**Note:** Timestamps (`createdAt`, `updatedAt`) are tracked in PostgreSQL but NOT exported to DBF files, as legacy DBF systems don't use these fields. The web system maintains these internally for audit purposes.

### Party Master
| Field       | Type | Length | Description              |
|-------------|------|--------|--------------------------|
| PARTY_CODE  | C    | 6      | Party code (key)         |
| PARTY_NAME  | C    | 15     | Party name               |
| REF         | C    | 15     | Reference                |


### Exchange
| Field       | Type | Length | Description              |
|-------------|------|--------|--------------------------|
| ID_NAME     | C    | 15     | Exchange name (key)      |
| PARTY_CODE  | C    | 6      | Party code (FK)          |
| SHORT_CODE  | C    | 8      | Short code (unique)      |
| RATE        | N    | 10.2   | Rate                     |
| ID_COMM     | N    | 10.2   | Commission               |
| ID_AC       | C    | 6      | ID Account (FK)          |


### ID Master
| Field       | Type | Length | Description              |
|-------------|------|--------|--------------------------|
| USER_ID     | C    | 15     | User ID (key)            |
| PARTY_CODE  | C    | 6      | Party code (FK)          |
| ID_CODE     | C    | 8      | Exchange short code (FK) |
| CREDIT      | N    | 10.2   | Credit limit             |
| COMM        | N    | 10.2   | Commission               |
| RATE        | N    | 10.2   | Rate                     |
| PATI        | N    | 10.2   | Pati (numeric, optional) |
| PARTNER     | C    | 6      | Partner party code (FK, optional) |
| ACTIVE      | N    | 1      | Active flag (0/1)        |
| IS_UPLINE   | N    | 1      | Upline flag (0/1)        |
| UPLINE_ID   | C    | 15     | Upline user ID           |


## Automation Examples

### Windows Task Scheduler (daily-export.bat)

```batch
@echo off
REM Daily export of web system changes back to DBF

set TODAY=%date:~-4,4%%date:~-10,2%%date:~-7,2%
set YESTERDAY=%date:~-4,4%%date:~-10,2%%date:~-8,2%

cd C:\path\to\SettlingSun\tools

REM Export yesterday's changes
node dbf-export.js sync-back party C:\data\party.dbf --mode incremental --since %YESTERDAY% >> export_%TODAY%.log 2>&1
node dbf-export.js sync-back exch C:\data\exch.dbf --mode incremental --since %YESTERDAY% >> export_%TODAY%.log 2>&1
node dbf-export.js sync-back idmaster C:\data\idmaster.dbf --mode incremental --since %YESTERDAY% >> export_%TODAY%.log 2>&1

echo Export completed: %date% %time% >> export_%TODAY%.log
```

### Linux/Mac Cron (crontab)

```bash
# Export changes daily at 6 PM
0 18 * * * cd /path/to/SettlingSun/tools && YESTERDAY=$(date -d yesterday +\%Y-\%m-\%d) && node dbf-export.js sync-back party /data/party.dbf --mode incremental --since $YESTERDAY >> export.log 2>&1
```

### Two-Way Sync Script (bidirectional-sync.sh)

```bash
#!/bin/bash
# Bidirectional sync between DBF and PostgreSQL

TOOLS_DIR="/path/to/SettlingSun/tools"
DATA_DIR="/data"
LAST_SYNC_FILE="$TOOLS_DIR/last_sync.txt"

cd $TOOLS_DIR

# Get last sync time (or use yesterday if file doesn't exist)
if [ -f "$LAST_SYNC_FILE" ]; then
    LAST_SYNC=$(cat "$LAST_SYNC_FILE")
else
    LAST_SYNC=$(date -d yesterday +%Y-%m-%d)
fi

echo "Starting bidirectional sync (last sync: $LAST_SYNC)"

# Step 1: Import DBF changes to PostgreSQL
echo "Importing DBF to PostgreSQL..."
node dbf-sync.js sync party "$DATA_DIR/party.dbf" --strategy UPSERT
node dbf-sync.js sync exch "$DATA_DIR/exch.dbf" --strategy UPSERT
node dbf-sync.js sync idmaster "$DATA_DIR/idmaster.dbf" --strategy UPSERT

# Step 2: Export PostgreSQL changes back to DBF
echo "Exporting PostgreSQL changes to DBF..."
node dbf-export.js sync-back party "$DATA_DIR/party.dbf" --mode incremental --since "$LAST_SYNC"
node dbf-export.js sync-back exch "$DATA_DIR/exch.dbf" --mode incremental --since "$LAST_SYNC"
node dbf-export.js sync-back idmaster "$DATA_DIR/idmaster.dbf" --mode incremental --since "$LAST_SYNC"

# Update last sync time
date -Iseconds > "$LAST_SYNC_FILE"

echo "Bidirectional sync completed"
```

Make executable: `chmod +x bidirectional-sync.sh`

## Error Handling

- Records are exported with timestamps to track changes
- Failed exports don't corrupt existing DBF files
- Detailed error messages for debugging
- Incremental mode preserves existing data

## Best Practices

1. **Always backup DBF files** before sync-back operations
2. **Use incremental mode** for daily syncs
3. **Use full mode** for complete refresh
4. **Track last sync time** for incremental syncs
5. **Test with small datasets** first
6. **Monitor logs** for errors
7. **Schedule during low-activity periods**

## Troubleshooting

### File Access Errors
- Ensure DBF file is not open in another application
- Check file permissions
- Verify path exists

### Missing Data
- Verify date format in --since parameter (YYYY-MM-DD)
- Check PostgreSQL has data
- Verify authentication

### Timestamp Issues
- Ensure system clocks are synchronized
- Use ISO date format: YYYY-MM-DD
- Check timezone settings
