# DBF Sync Tool

Command-line tool to sync data between DBF (dBase/FoxPro) files and PostgreSQL database.

## ⭐ Quick Start - Unified Tool

**Recommended:** Use the unified `dbf-tool.js` for all operations:

```bash
cd tools
npm install
cp .env.example .env
# Edit .env and add SYNC_API_KEY (see SETUP.md)
node dbf-tool.js status
```

**⚠️ Important:** You must configure SYNC_API_KEY in both:
- Main project `.env` file
- `tools/.env` file

See **[SETUP.md](SETUP.md)** for detailed setup instructions.

**Windows shortcut:**
```bash
dbf status
dbf import party party_master.dbf --strategy UPSERT
dbf export party party_master.dbf
```

**Complete guides:**
- 🔧 [SETUP.md](SETUP.md) - **Start here!** Initial setup with API key
- 📖 [GETTING_STARTED.md](GETTING_STARTED.md) - Step-by-step tutorial
- 📚 [DBF_TOOL_GUIDE.md](DBF_TOOL_GUIDE.md) - Complete documentation
- ⚡ [QUICK_REFERENCE.md](QUICK_REFERENCE.md) - Command cheat sheet

## Tools Overview

| Tool | Purpose | Documentation |
|------|---------|---------------|
| **`dbf-tool.js`** | **✨ Unified tool for all import/export operations** | [DBF_TOOL_GUIDE.md](DBF_TOOL_GUIDE.md) |
| `dbf-sync.js` | Import from DBF to PostgreSQL (legacy) | This guide |
| `dbf-export.js` | Export from PostgreSQL to DBF (legacy) | [DBF_EXPORT_GUIDE.md](DBF_EXPORT_GUIDE.md) |
| `bidirectional-sync.sh/bat` | Two-way automated sync | [BIDIRECTIONAL_SYNC.md](BIDIRECTIONAL_SYNC.md) |

## Features

- ✅ **DBF to PostgreSQL**: Import data from DBF files to database
- ✅ **PostgreSQL to DBF**: Export data from database back to DBF files
- ✅ **Duplicate Checking**: Prevents duplicate records when exporting (checks PARTY_CODE, ID_NAME/SHORT_CODE, USER_ID)
- ✅ **Validation**: Check data before syncing
- ✅ **Incremental Sync**: Sync only changed records
- ✅ **Two-way Sync**: Keep DBF and PostgreSQL in sync

## Tools Overview

| Tool | Purpose | Documentation |
|------|---------|---------------|
| `dbf-sync.js` | Import from DBF to PostgreSQL | This guide |
| `dbf-export.js` | Export from PostgreSQL to DBF | [DBF_EXPORT_GUIDE.md](DBF_EXPORT_GUIDE.md) |
| `bidirectional-sync.sh/bat` | Two-way automated sync | [BIDIRECTIONAL_SYNC.md](BIDIRECTIONAL_SYNC.md) |

## Quick Start (Import)

```bash
cd tools
npm install
cp .env.example .env
# Edit .env with your configuration
node dbf-sync.js status
```

## Installation

```bash
cd tools
npm install
```

Required dependencies:
- `node-dbf` - Read DBF files
- `axios` - HTTP client
- `commander` - CLI framework

## Configuration

Create `.env` file in the `tools` directory:

```env
API_URL=http://localhost:3000/api/trpc
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=admin123
```

## Important Notes

### DBF Files Don't Support Primary Keys

DBF files lack database constraints (primary keys, unique indexes, foreign keys). The tools implement manual checking:

**Import (DBF → PostgreSQL):**
- PostgreSQL enforces constraints via Prisma schema
- Duplicate checks happen at database level
- Failed inserts are logged but don't crash the sync

**Export (PostgreSQL → DBF):**
- Tools manually check unique fields before appending:
  - **PARTYMST**: `PARTY_CODE`
  - **ITEMMAST**: `ID_NAME` AND `SHORT_CODE` (both checked)
  - **IDMASTER**: `USER_ID`
- Duplicates are skipped with warnings in logs
- Use `--mode full` to replace entire file if needed

See [DBF_EXPORT_GUIDE.md](DBF_EXPORT_GUIDE.md#duplicate-checking) for details.

## Commands

### Check Status

```bash
node dbf-sync.js status
```

Shows current record counts in database.

### Validate Data

Validate DBF data before syncing:

```bash
# Validate Party Master
node dbf-sync.js validate party path/to/party_master.dbf

# Validate Exchange
node dbf-sync.js validate exch path/to/exchange.dbf
```

### Sync Data

**Important**: Sync in this order:
1. Party Master (required first)
2. Exchange (depends on Party Master)
3. ID Master (depends on both)

#### Party Master

```bash
node dbf-sync.js sync party party_master.dbf --strategy UPSERT
```

#### Exchange

```bash
node dbf-sync.js sync exch exchange.dbf --strategy UPSERT --match-by SHORT_CODE
```

#### ID Master

```bash
node dbf-sync.js sync idmaster id_master.dbf --strategy UPSERT --match-by USER_ID --exch-match-by SHORT_CODE
```

## Options

### Sync Strategies

- `UPSERT` (default) - Insert new, update existing
- `REPLACE` - Delete all, then insert all
- `INSERT_ONLY` - Only insert new records

```bash
--strategy UPSERT
--strategy REPLACE
--strategy INSERT_ONLY
```

### Match By Options

For Exchange:
- `SHORT_CODE` (default) - Match by shortCode field
- `ID` - Match by database ID

```bash
--match-by SHORT_CODE
--match-by ID
```

For ID Master:
- `USER_ID` (default) - Match by userId field
- `ID` - Match by database ID

```bash
--match-by USER_ID
```

### Delete Not in Source

Remove records from database that don't exist in DBF file:

```bash
--delete-not-in-source
```

## DBF Field Mapping

### Party Master DBF Fields

| DBF Field    | Database Field | Required | Max Length |
|--------------|----------------|----------|------------|
| PARTY_CODE   | partyCode      | Yes      | 6          |
| PARTY_NAME   | partyName      | Yes      | 15         |
| REF          | ref            | No       | 15         |

### Exchange DBF Fields

| DBF Field    | Database Field | Required | Max Length |
|--------------|----------------|----------|------------|
| ID_NAME      | idName         | Yes      | 15         |
| PARTY_CODE   | partyCode      | Yes      | 6          |
| SHORT_CODE   | shortCode      | Yes      | 8          |
| RATE         | rate           | Yes      | -          |
| ID_COMM      | idComm         | Yes      | -          |
| ID_AC        | idAc           | Yes      | 6          |

### ID Master DBF Fields

| DBF Field    | Database Field | Required | Max Length |
|--------------|----------------|----------|------------|
| USER_ID      | userId         | Yes      | 15         |
| PARTY_CODE   | partyCode      | Yes      | 6          |
| ID_CODE      | idCode         | Yes      | -          |
| COMM         | comm           | Yes      | -          |
| RATE         | rate           | Yes      | -          |
| PATI         | pati           | Yes      | 6          |
| ACTIVE       | active         | No       | -          |
| IS_UPLINE    | isUpline       | No       | -          |
| UPLINE_ID    | uplineId       | No       | 15         |

## Example Workflows

### Initial Full Sync

```bash
# 1. Validate all data
node dbf-sync.js validate party data/party.dbf
node dbf-sync.js validate exch data/exch.dbf

# 2. Check current status
node dbf-sync.js status

# 3. Sync in order
node dbf-sync.js sync party data/party.dbf --strategy REPLACE
node dbf-sync.js sync exch data/exch.dbf --strategy REPLACE --match-by SHORT_CODE
node dbf-sync.js sync idmaster data/idmaster.dbf --strategy REPLACE --match-by USER_ID

# 4. Verify
node dbf-sync.js status
```

### Incremental Daily Sync

```bash
# Keep existing records, update changes
node dbf-sync.js sync party data/party.dbf --strategy UPSERT
node dbf-sync.js sync exch data/exch.dbf --strategy UPSERT --match-by SHORT_CODE
node dbf-sync.js sync idmaster data/idmaster.dbf --strategy UPSERT --match-by USER_ID
```

### Sync with Cleanup

```bash
# Remove records not in DBF files
node dbf-sync.js sync party data/party.dbf --strategy UPSERT --delete-not-in-source
node dbf-sync.js sync exch data/exch.dbf --strategy UPSERT --delete-not-in-source
node dbf-sync.js sync idmaster data/idmaster.dbf --strategy UPSERT --delete-not-in-source
```

## Error Handling

- Validation errors are shown before sync
- Foreign key violations are reported
- Individual record errors don't stop the batch
- Detailed error messages with context

## Automation with Cron/Task Scheduler

### Linux/Mac (crontab)

```bash
# Daily sync at 2 AM
0 2 * * * cd /path/to/SettlingSun/tools && node dbf-sync.js sync party /data/party.dbf --strategy UPSERT >> sync.log 2>&1
5 2 * * * cd /path/to/SettlingSun/tools && node dbf-sync.js sync exch /data/exch.dbf --strategy UPSERT >> sync.log 2>&1
10 2 * * * cd /path/to/SettlingSun/tools && node dbf-sync.js sync idmaster /data/idmaster.dbf --strategy UPSERT >> sync.log 2>&1
```

### Windows (Task Scheduler)

Create batch file `sync-daily.bat`:

```batch
@echo off
cd C:\path\to\SettlingSun\tools
node dbf-sync.js sync party C:\data\party.dbf --strategy UPSERT >> sync.log 2>&1
node dbf-sync.js sync exch C:\data\exch.dbf --strategy UPSERT >> sync.log 2>&1
node dbf-sync.js sync idmaster C:\data\idmaster.dbf --strategy UPSERT >> sync.log 2>&1
```

Schedule in Task Scheduler to run daily.

## Exporting Data (PostgreSQL to DBF)

When data is created/updated in the web system, export it back to DBF files.

### Export All Data

```bash
# Create new DBF files with all PostgreSQL data
node dbf-export.js export party party_master.dbf
node dbf-export.js export exch exchange.dbf
node dbf-export.js export idmaster id_master.dbf
```

### Export Recent Changes

```bash
# Export only records modified since a date
node dbf-export.js export party party_master.dbf --since 2024-01-01
node dbf-export.js export-changes --since 2024-01-01 --output changes/
```

### Sync Back to Existing DBF

```bash
# Update existing DBF files (incremental)
node dbf-export.js sync-back party party_master.dbf --mode incremental --since 2024-01-01

# Replace entire DBF file (full)
node dbf-export.js sync-back party party_master.dbf --mode full
```

**See [DBF_EXPORT_GUIDE.md](DBF_EXPORT_GUIDE.md) for complete export documentation.**

## Two-Way Sync Workflow

```bash
# 1. Import from DBF to PostgreSQL (morning)
node dbf-sync.js sync party party.dbf --strategy UPSERT
node dbf-sync.js sync exch exch.dbf --strategy UPSERT
node dbf-sync.js sync idmaster idmaster.dbf --strategy UPSERT

# 2. Export PostgreSQL changes back to DBF (evening)
node dbf-export.js sync-back party party.dbf --mode incremental --since $(date -d yesterday +%Y-%m-%d)
node dbf-export.js sync-back exch exch.dbf --mode incremental --since $(date -d yesterday +%Y-%m-%d)
node dbf-export.js sync-back idmaster idmaster.dbf --mode incremental --since $(date -d yesterday +%Y-%m-%d)
```

## Troubleshooting

### Authentication Failed

- Check ADMIN_EMAIL and ADMIN_PASSWORD in `.env`
- Ensure Next.js app is running
- Verify API_URL is correct

### Foreign Key Errors

- Party Master must be synced before Exchange
- Exchange must be synced before ID Master
- Check that referenced codes exist

### Validation Errors

- Check field lengths
- Verify data formats
- Look for special characters
- Check for duplicates

## NPM Scripts

```bash
# Quick commands using package.json scripts
npm run status
npm run validate:party path/to/file.dbf
npm run sync:party path/to/file.dbf
```

## Advanced Usage

### Custom Field Mapping

Edit `dbf-sync.js` to customize field mappings if your DBF files use different field names.

### Batch Size

For very large files, modify the tool to process records in batches to avoid memory issues.

### Logging

Redirect output to log files:

```bash
node dbf-sync.js sync party party.dbf --strategy UPSERT > sync-$(date +%Y%m%d).log 2>&1
```
