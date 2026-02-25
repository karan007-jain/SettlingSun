# DBF Tool - Getting Started

This guide will walk you through using the unified DBF tool for the first time.

## Prerequisites

1. Make sure your Next.js dev server is running:
   ```bash
   npm run dev
   ```

2. Navigate to tools directory:
   ```bash
   cd tools
   ```

3. Install dependencies (one time):
   ```bash
   npm install
   ```

4. Create `.env` file (copy from example):
   ```bash
   copy .env.example .env    # Windows
   cp .env.example .env      # Linux/Mac
   ```

5. Edit `.env` with your API key:
   ```env
   API_URL=http://localhost:3000/api/trpc
   SYNC_API_KEY=your-secret-sync-key-here
   ```
   
   **Note:** The `SYNC_API_KEY` must match the one in your main project `.env` file.
   Copy it from `SettlingSun/.env` or set it to the same value in both files.

## Your First Import (DBF → PostgreSQL)

Let's import data from DBF files into your database.

### Step 1: Check Current Status

```bash
node dbf-tool.js status
```

You should see:
```
✓ Using API key authentication
Fetching current database status...

=== Database Status ===
Party Master: 0 records
Exchange: 0 records
ID Master: 0 records
Total: 0 records
```

### Step 2: Validate Your DBF Files

Before importing, validate your data:

```bash
node dbf-tool.js validate party path/to/party_master.dbf
```

This checks for:
- Valid party codes (6 characters)
- Valid party names (not empty)
- Proper data types

### Step 3: Import Party Master (First!)

Party Master must be imported first because other tables depend on it:

```bash
node dbf-tool.js import party path/to/party_master.dbf --strategy UPSERT
```

You'll see:
```
✓ Authenticated successfully
Reading DBF file: path/to/party_master.dbf
✓ Read 150 records from path/to/party_master.dbf

Syncing 150 records (strategy: UPSERT)...

=== Sync Results ===
Created: 150
Updated: 0
Failed: 0
Total: 150
```

### Step 4: Import Exchange

Now import exchange data:

```bash
node dbf-tool.js import exch path/to/exchange.dbf --strategy UPSERT --match-by SHORT_CODE
```

The `--match-by SHORT_CODE` tells it to match records by the short code field.

### Step 5: Import ID Master

Finally, import ID master data:

```bash
node dbf-tool.js import idmaster path/to/id_master.dbf --strategy UPSERT
```

### Step 6: Verify Import

Check the final status:

```bash
node dbf-tool.js status
```

You should now see all your records in the database!

## Your First Export (PostgreSQL → DBF)

Let's export data from PostgreSQL back to DBF files.

### Step 1: Export to New Files

Create new DBF files from your database:

```bash
node dbf-tool.js export party output/party_master.dbf
node dbf-tool.js export exch output/exchange.dbf
node dbf-tool.js export idmaster output/id_master.dbf
```

### Step 2: Update Existing Files (Incremental)

If you've made changes in the web system and want to sync back to your original DBF files:

```bash
node dbf-tool.js sync-back party path/to/party_master.dbf --mode incremental --since 2024-01-01
```

This will:
- Check for duplicates (PARTY_CODE)
- Update existing records
- Add new records
- Skip duplicates with warnings

## Using the Batch File (Windows)

For easier typing, use the batch file wrapper:

```bash
dbf status
dbf import party party_master.dbf --strategy UPSERT
dbf export party output/party.dbf
```

Much simpler!

## Common Workflows

### Daily Import from Legacy System

Import new/updated records from your DBF files:

```bash
dbf import party party_master.dbf --strategy UPSERT
dbf import exch exchange.dbf --strategy UPSERT --match-by SHORT_CODE
dbf import idmaster id_master.dbf --strategy UPSERT
```

### Daily Export to Legacy System

Export changes made in the web system:

```bash
dbf sync-back party party_master.dbf --mode incremental --since 2024-02-17
dbf sync-back exch exchange.dbf --mode incremental --since 2024-02-17
dbf sync-back idmaster id_master.dbf --mode incremental --since 2024-02-17
```

### Full Refresh

Replace all data in DBF files with current database state:

```bash
dbf sync-back party party_master.dbf --mode full
dbf sync-back exch exchange.dbf --mode full
dbf sync-back idmaster id_master.dbf --mode full
```

## Troubleshooting

### "Authentication failed"
- Check your `.env` file has correct SYNC_API_KEY
- Make sure SYNC_API_KEY matches between tools/.env and main project .env
- Verify the API_URL is correct

### "Foreign key constraint failed"
- Import in correct order: Party → Exchange → ID Master
- Make sure Party Master imported successfully first

### "Cannot find module 'node-dbf'"
- Run `npm install` in the tools directory

### "EPERM: operation not permitted"
- Close the DBF file in other applications (FoxPro, Excel, etc.)
- Make sure you have write permissions

### Validation Errors
- Fix the data in your DBF files
- Check field lengths and types
- Ensure required fields have values

## Next Steps

- Read [DBF_TOOL_GUIDE.md](DBF_TOOL_GUIDE.md) for complete documentation
- See [QUICK_REFERENCE.md](QUICK_REFERENCE.md) for command cheat sheet
- Set up automated syncs with scheduled tasks

## Questions?

Run `--help` on any command:
```bash
node dbf-tool.js --help
node dbf-tool.js import --help
node dbf-tool.js export --help
node dbf-tool.js sync-back --help
```

Good luck! 🎉
