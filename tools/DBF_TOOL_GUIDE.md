# Unified DBF Sync Tool

Single command-line tool for complete bidirectional synchronization between DBF files and PostgreSQL.

## Features

- ✅ **Import**: DBF → PostgreSQL with validation
- ✅ **Export**: PostgreSQL → DBF with duplicate checking
- ✅ **Status**: View database record counts
- ✅ **All sync strategies**: UPSERT, REPLACE, INSERT_ONLY
- ✅ **Incremental sync**: Only changed records
- ✅ **Validation**: Check data before importing

## Installation

```bash
cd tools
npm install
```

## Configuration

Create `.env` file:

```env
API_URL=http://localhost:3000/api/trpc
SYNC_API_KEY=your-secret-sync-key-here
```

**Important:** The `SYNC_API_KEY` must match the one in your main project `.env` file (SettlingSun/.env).

In your main project `.env`, add:

```env
SYNC_API_KEY=your-secret-sync-key-here
```

Use a strong random key. Generate one with:

```bash
 openssl rand -base64 32    # Linux/Mac
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"  # Any platform
```

## Commands Overview

| Command | Purpose | Direction |
|---------|---------|-----------|
| `import` | Sync from DBF to PostgreSQL | DBF → PostgreSQL |
| `export` | Export to new DBF file | PostgreSQL → DBF |
| `sync-back` | Update existing DBF file | PostgreSQL → DBF |
| `export-changes` | Export all changes since date | PostgreSQL → DBF |
| `validate` | Validate DBF data | DBF (check only) |
| `status` | Show database counts | PostgreSQL (read only) |

## Import Commands (DBF → PostgreSQL)

### Status

Check current database record counts:

```bash
node dbf-tool.js status
```

Output:
```
=== Database Status ===
Party Master: 150 records
Exchange: 45 records
ID Master: 320 records
Total: 515 records
```

### Validate

Validate DBF data before importing:

```bash
# Validate Party Master
node dbf-tool.js validate party party_master.dbf

# Validate Exchange
node dbf-tool.js validate exch exchange.dbf
```

### Import

Import data from DBF files to PostgreSQL:

**Important: Import in this order:**
1. Party Master (required first)
2. Exchange (depends on Party Master)
3. ID Master (depends on both)

```bash
# Party Master
node dbf-tool.js import party party_master.dbf --strategy UPSERT

# Exchange
node dbf-tool.js import exch exchange.dbf --strategy UPSERT --match-by SHORT_CODE

# ID Master
node dbf-tool.js import idmaster id_master.dbf --strategy UPSERT
```

**Sync Strategies:**
- `UPSERT` (default): Create new or update existing records
- `REPLACE`: Delete all existing and insert new records
- `INSERT_ONLY`: Only insert new records, skip existing

**Match By (Exchange only):**
- `ID_NAME`: Match by exchange ID name
- `SHORT_CODE`: Match by short code (recommended)

## Export Commands (PostgreSQL → DBF)

### Export (New DBF File)

Create new DBF file from PostgreSQL data:

```bash
# Export all records
node dbf-tool.js export party party_master.dbf
node dbf-tool.js export exch exchange.dbf
node dbf-tool.js export idmaster id_master.dbf

# Export only modified since date
node dbf-tool.js export party party_master.dbf --since 2024-01-01
node dbf-tool.js export exch exchange.dbf --since 2024-01-15
```

### Sync Back (Update Existing DBF)

Update existing DBF file with PostgreSQL data:

```bash
# Full sync (replace all)
node dbf-tool.js sync-back party party_master.dbf --mode full

# Incremental sync (update/add changed records)
node dbf-tool.js sync-back party party_master.dbf --mode incremental --since 2024-01-01
node dbf-tool.js sync-back exch exchange.dbf --mode incremental --since 2024-01-01
node dbf-tool.js sync-back idmaster id_master.dbf --mode incremental --since 2024-01-01
```

**Duplicate Checking:**
Incremental mode checks for duplicates before appending:
- **PARTYMST**: Checks `PARTY_CODE`
- **ITEMMAST**: Checks `ID_NAME` and `SHORT_CODE`
- **IDMASTER**: Checks `USER_ID`

Duplicates are skipped with warnings.

### Export Changes

Export all changed records across multiple tables:

```bash
# Default output directory
node dbf-tool.js export-changes --since 2024-01-01

# Custom output directory
node dbf-tool.js export-changes --since 2024-01-01 --output changes/

# Specific entities only
node dbf-tool.js export-changes --since 2024-01-01 --entities party,exch
```

## Common Workflows

### 1. Initial Setup (DBF → PostgreSQL)

Import all legacy data:

```bash
node dbf-tool.js status
node dbf-tool.js validate party party_master.dbf
node dbf-tool.js import party party_master.dbf --strategy REPLACE
node dbf-tool.js import exch exchange.dbf --strategy REPLACE --match-by SHORT_CODE
node dbf-tool.js import idmaster id_master.dbf --strategy REPLACE
node dbf-tool.js status
```

### 2. Daily Import from DBF

Update PostgreSQL with DBF changes:

```bash
node dbf-tool.js import party party_master.dbf --strategy UPSERT
node dbf-tool.js import exch exchange.dbf --strategy UPSERT --match-by SHORT_CODE
node dbf-tool.js import idmaster id_master.dbf --strategy UPSERT
```

### 3. Daily Export to DBF

Update DBF files with web system changes:

```bash
# Get yesterday's date
YESTERDAY=$(date -d yesterday +%Y-%m-%d)  # Linux/Mac
# or
$YESTERDAY = (Get-Date).AddDays(-1).ToString("yyyy-MM-dd")  # PowerShell

# Sync back incrementally
node dbf-tool.js sync-back party party_master.dbf --mode incremental --since $YESTERDAY
node dbf-tool.js sync-back exch exchange.dbf --mode incremental --since $YESTERDAY
node dbf-tool.js sync-back idmaster id_master.dbf --mode incremental --since $YESTERDAY
```

### 4. Two-Way Sync

Keep both systems in sync:

```bash
# Morning: Import from DBF
node dbf-tool.js import party party_master.dbf --strategy UPSERT
node dbf-tool.js import exch exchange.dbf --strategy UPSERT
node dbf-tool.js import idmaster id_master.dbf --strategy UPSERT

# Evening: Export to DBF
LAST_SYNC=$(cat last_sync_time.txt)
node dbf-tool.js sync-back party party_master.dbf --mode incremental --since $LAST_SYNC
node dbf-tool.js sync-back exch exchange.dbf --mode incremental --since $LAST_SYNC
node dbf-tool.js sync-back idmaster id_master.dbf --mode incremental --since $LAST_SYNC
date -Iseconds > last_sync_time.txt
```

### 5. Backup DBF Files

Create DBF backups from current database:

```bash
# PowerShell
$BACKUP_DIR = "backups\$(Get-Date -Format 'yyyyMMdd')"
New-Item -ItemType Directory -Force -Path $BACKUP_DIR
node dbf-tool.js export party "$BACKUP_DIR\party.dbf"
node dbf-tool.js export exch "$BACKUP_DIR\exch.dbf"
node dbf-tool.js export idmaster "$BACKUP_DIR\idmaster.dbf"

# Linux/Mac
BACKUP_DIR="backups/$(date +%Y%m%d)"
mkdir -p $BACKUP_DIR
node dbf-tool.js export party "$BACKUP_DIR/party.dbf"
node dbf-tool.js export exch "$BACKUP_DIR/exch.dbf"
node dbf-tool.js export idmaster "$BACKUP_DIR/idmaster.dbf"
```

## Field Mappings

### Party Master (PARTYMST.DBF)

| DBF Field | PostgreSQL Field | Required | Length |
|-----------|-----------------|----------|--------|
| PARTY_CODE (P_CODE) | partyCode | Yes | 6 |
| PARTY_NAME (P_NAME) | partyName | Yes | 15 |
| REF (P_REF) | ref | No | 15 |

### Exchange (ITEMMAST.DBF)

| DBF Field | PostgreSQL Field | Required | Length |
|-----------|-----------------|----------|--------|
| ID_NAME (IDNAME) | idName | Yes | 15 |
| PARTY_CODE (PCODE) | partyCode | Yes | 6 |
| SHORT_CODE (SHORT) | shortCode | Yes | 8 |
| RATE | rate | Yes | 10.2 |
| ID_COMM (IDCOMM) | idComm | Yes | 10.2 |
| ID_AC (IDAC) | idAc | Yes | 6 |

### ID Master (IDMASTER.DBF)

| DBF Field | PostgreSQL Field | Required | Length |
|-----------|-----------------|----------|--------|
| USER_ID (USERID) | userId | Yes | 15 |
| PARTY_CODE (PCODE) | partyCode | Yes | 6 |
| ID_CODE (IDNAME) | idCode | Yes | 8 |
| CREDIT | credit | Yes | 10.2 |
| COMM (COMMISSION) | comm | Yes | 10.2 |
| RATE | rate | Yes | 10.2 |
| PATI | pati | No | 10.2 |
| PARTNER | partner | No | 6 |
| ACTIVE | active | Yes | 1 |
| IS_UPLINE (UPLINE) | isUpline | Yes | 1 |
| UPLINE_ID | uplineId | No | 15 |

## Error Handling

### Import Errors

If import fails:

1. **Validation Errors**: Run `validate` command first
2. **Foreign Key Errors**: Ensure Party Master imported before Exchange/ID Master
3. **Duplicate Keys**: Use `UPSERT` strategy to update existing records

### Export Errors

If export fails:

1. **Duplicate Warnings**: Normal during incremental sync, records are skipped
2. **File Lock**: Close DBF file in other applications
3. **Missing Data**: Check if records exist in PostgreSQL with `status` command

### Common Issues

**"Unknown field `patiParty`"**
- Outdated Prisma client - restart dev server

**"EPERM: operation not permitted"**
- File is locked by another process - close file

**"Foreign key constraint failed"**
- Import in correct order: Party → Exchange → ID Master

## Tips

1. **Always validate** before importing large datasets
2. **Use UPSERT** for regular syncs to handle both new and updated records
3. **Incremental export** saves time - only syncs changed records
4. **Check status** before and after operations
5. **Backup DBF files** before full replace operations
6. **Close DBF files** in other applications before syncing

## Help

View all available commands:

```bash
node dbf-tool.js --help
```

View command-specific help:

```bash
node dbf-tool.js import --help
node dbf-tool.js export --help
node dbf-tool.js sync-back --help
```
