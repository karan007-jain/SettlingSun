# Bidirectional DBF Sync - Quick Reference

## Overview

Complete two-way synchronization between PostgreSQL (web system) and DBF files (legacy system).

**Timestamp Handling:**
- PostgreSQL tracks `createdAt` and `updatedAt` internally for all records
- DBF files DON'T have these fields (legacy system doesn't need them)
- Import: Prisma auto-generates timestamps when creating records
- Export: Uses PostgreSQL timestamps to filter changes, but doesn't write them to DBF
- Incremental sync works by checking PostgreSQL's `updatedAt` field

## Files Created

### Export Tool
- **dbf-export.js**: Main export CLI tool
- **export-dbf.bat**: Windows wrapper script
- **export-dbf.sh**: Linux/Mac wrapper script
- **DBF_EXPORT_GUIDE.md**: Complete export documentation

### Bidirectional Sync
- **bidirectional-sync.bat**: Windows two-way sync automation
- **bidirectional-sync.sh**: Linux/Mac two-way sync automation

### API Endpoints (in sync.ts)
- `sync.exportPartyMaster`: Export all party records
- `sync.exportExch`: Export all exchange records
- `sync.exportIdMaster`: Export all ID master records
- `sync.exportChanges`: Export changes across all entities since date

## Workflow

### Daily Two-Way Sync

**Morning: Import DBF → PostgreSQL**
```bash
node dbf-sync.js sync party party.dbf --strategy UPSERT
node dbf-sync.js sync exch exch.dbf --strategy UPSERT
node dbf-sync.js sync idmaster idmaster.dbf --strategy UPSERT
```

**Evening: Export PostgreSQL → DBF**
```bash
node dbf-export.js sync-back party party.dbf --mode incremental --since $(date -d yesterday +%Y-%m-%d)
node dbf-export.js sync-back exch exch.dbf --mode incremental --since $(date -d yesterday +%Y-%m-%d)
node dbf-export.js sync-back idmaster idmaster.dbf --mode incremental --since $(date -d yesterday +%Y-%m-%d)
```

**Automated (runs both)**
```bash
./bidirectional-sync.sh    # Linux/Mac
bidirectional-sync.bat     # Windows
```

## Export Modes

### Full Export
Replace entire DBF file with PostgreSQL data:
```bash
node dbf-export.js export party party.dbf
node dbf-export.js sync-back party party.dbf --mode full
```

### Incremental Export
Update only changed records:
```bash
node dbf-export.js sync-back party party.dbf --mode incremental --since 2024-01-01
```

### Export Changes
Export all changes across entities:
```bash
node dbf-export.js export-changes --since 2024-01-01 --output changes/
```

## Use Cases

### 1. Web Entry → DBF Backup
Users create/update records in web system during the day. Export changes back to DBF nightly.

```bash
# In cron or Task Scheduler
0 22 * * * cd /path/to/tools && node dbf-export.js export-changes --since $(date +%Y-%m-%d) --output /backup
```

### 2. Legacy System Integration
Keep both systems (web + legacy) in sync:
```bash
# Run twice daily
./bidirectional-sync.sh
```

### 3. Migration to Web System
Gradually migrate from DBF to PostgreSQL while maintaining DBF as backup:
```bash
# Import nightly
node dbf-sync.js sync party party.dbf --strategy UPSERT

# Export daily for safe rollback
node dbf-export.js export party party_backup.dbf
```

## Automation

### Windows Task Scheduler

Create task to run `bidirectional-sync.bat` at 6 PM daily:
```
schtasks /create /tn "DBF Sync" /tr "C:\path\to\tools\bidirectional-sync.bat" /sc daily /st 18:00
```

### Linux/Mac Cron

Add to crontab:
```
# Two-way sync at 6 PM daily
0 18 * * * cd /path/to/SettlingSun/tools && ./bidirectional-sync.sh >> sync.log 2>&1
```

## Key Features

✅ **Incremental Sync**: Only sync changed records
✅ **Timestamp Tracking**: Uses updatedAt field for incremental sync
✅ **Foreign Key Export**: Exports with proper relationships
✅ **Field Transformation**: Handles DBF naming conventions
✅ **Batch Processing**: Processes large datasets efficiently
✅ **Error Handling**: Individual record errors don't stop batch
✅ **Authentication**: Uses admin credentials from .env
✅ **Logging**: Detailed output for debugging
✅ **Last Sync Tracking**: Remembers last sync time

## Configuration

Edit `tools/.env`:
```env
API_URL=http://localhost:3000/api/trpc
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=admin123
```

For production, point to production URL:
```env
API_URL=https://your-domain.com/api/trpc
```

## Testing

1. **Test export to new file**:
   ```bash
   node dbf-export.js export party test_party.dbf
   ```

2. **Verify exported data**:
   Open in DBF viewer or re-import to test database

3. **Test incremental update**:
   ```bash
   # Create records in web system
   # Then export changes
   node dbf-export.js sync-back party party.dbf --mode incremental --since $(date +%Y-%m-%d)
   ```

4. **Test full sync**:
   ```bash
   ./bidirectional-sync.sh
   ```

## Troubleshooting

### "Cannot write to DBF file"
- Ensure DBF file is not open in another program
- Check file permissions

### "No records exported"
- Verify `--since` date is before records were created/updated
- Check database has data: `node dbf-sync.js status`

### "Authentication failed"
- Verify .env credentials
- Ensure admin user exists in database

### "Field length exceeded"
- Check field mappings match DBF structure
- Verify data doesn't exceed field limits

## Best Practices

1. **Always backup DBF files** before sync-back
2. **Use incremental mode** for daily syncs
3. **Use full mode** for complete refresh
4. **Track last sync time** for accurate incremental syncs
5. **Test with small datasets** first
6. **Monitor logs** for errors
7. **Schedule during low-activity periods**
8. **Maintain DBF as backup** even when using web system

## Documentation

- **Import**: [tools/README.md](README.md)
- **Export**: [tools/DBF_EXPORT_GUIDE.md](DBF_EXPORT_GUIDE.md)
- **API**: [DBF_SYNC_GUIDE.md](../DBF_SYNC_GUIDE.md)
