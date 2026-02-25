# DBF Tool Quick Reference

## Installation
```bash
cd tools
npm install
```

## Setup
Create `.env` file:
```env
API_URL=http://localhost:3000/api/trpc
SYNC_API_KEY=your-secret-sync-key-here
```

**Note:** SYNC_API_KEY must match the one in your main project `.env`

## Common Commands

### Status & Validation
```bash
# Check database counts
node dbf-tool.js status

# Validate before importing
node dbf-tool.js validate party party_master.dbf
node dbf-tool.js validate exch exchange.dbf
```

### Import (DBF → PostgreSQL)
```bash
# Import in order: Party → Exchange → ID Master
node dbf-tool.js import party party_master.dbf --strategy UPSERT
node dbf-tool.js import exch exchange.dbf --strategy UPSERT --match-by SHORT_CODE
node dbf-tool.js import idmaster id_master.dbf --strategy UPSERT
```

### Export (PostgreSQL → DBF)
```bash
# Create new DBF files
node dbf-tool.js export party party_master.dbf
node dbf-tool.js export exch exchange.dbf
node dbf-tool.js export idmaster id_master.dbf

# Export only recent changes
node dbf-tool.js export party party_master.dbf --since 2024-01-01
```

### Sync Back (Update Existing DBF)
```bash
# Full replace
node dbf-tool.js sync-back party party_master.dbf --mode full

# Incremental update (with duplicate checking)
node dbf-tool.js sync-back party party_master.dbf --mode incremental --since 2024-01-01
node dbf-tool.js sync-back exch exchange.dbf --mode incremental --since 2024-01-01
node dbf-tool.js sync-back idmaster id_master.dbf --mode incremental --since 2024-01-01
```

### Export All Changes
```bash
# Export all changes to directory
node dbf-tool.js export-changes --since 2024-01-01 --output changes/
```

## Windows Shortcuts

Use `dbf.bat` wrapper:
```cmd
dbf status
dbf import party party_master.dbf --strategy UPSERT
dbf export party party_master.dbf
dbf sync-back party party_master.dbf --mode incremental --since 2024-01-01
```

## Linux/Mac Shortcuts

Make executable and use wrapper:
```bash
chmod +x dbf.sh
./dbf.sh status
./dbf.sh import party party_master.dbf --strategy UPSERT
./dbf.sh export party party_master.dbf
./dbf.sh sync-back party party_master.dbf --mode incremental --since 2024-01-01
```

## Sync Strategies

| Strategy | Behavior |
|----------|----------|
| `UPSERT` | Create new or update existing (default) |
| `REPLACE` | Delete all + insert fresh data |
| `INSERT_ONLY` | Only insert new, skip existing |

## Entity Names

| Entity | DBF File | PostgreSQL Table |
|--------|----------|------------------|
| `party` | PARTYMST.DBF | PartyMaster |
| `exch` | ITEMMAST.DBF | Exch |
| `idmaster` | IDMASTER.DBF | IdMaster |

## Duplicate Checking (Export)

During incremental sync, checks for duplicates:
- **party**: `PARTY_CODE`
- **exch**: `ID_NAME` AND `SHORT_CODE`
- **idmaster**: `USER_ID`

Duplicates are skipped with warnings.

## Tips

✅ Always import in order: Party → Exchange → ID Master  
✅ Run `validate` before large imports  
✅ Use `UPSERT` for regular syncs  
✅ Use `--since` for incremental exports  
✅ Check `status` before and after operations  
✅ Close DBF files in other apps before syncing

## Help

```bash
node dbf-tool.js --help
node dbf-tool.js import --help
node dbf-tool.js export --help
node dbf-tool.js sync-back --help
```

## Full Documentation

See [DBF_TOOL_GUIDE.md](DBF_TOOL_GUIDE.md) for complete documentation.
