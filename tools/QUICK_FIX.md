# IMPORTANT - Action Required!

## You're almost there! Just 3 quick steps:

### Step 1: Install dotenv package
```bash
cd tools
npm install
```

This will install the `dotenv` package needed to read your `.env` file.

### Step 2: Restart your Next.js dev server

The server needs to restart to load the `SYNC_API_KEY` environment variable.

**In the terminal running `npm run dev`:**
1. Press `Ctrl+C` to stop the server
2. Run `npm run dev` again

### Step 3: Test the tool

```bash
cd tools
dbf status
```

You should now see:
```
✓ Using API key authentication
Fetching current database status...

=== Database Status ===
Party Master: 0 records
Exchange: 0 records
ID Master: 0 records
Total: 0 records
```

## What was fixed?

✅ Added `dotenv` package to load `.env` files  
✅ Fixed `status` command to use sync API  
✅ Both `.env` files already have matching `SYNC_API_KEY`  

## If you still get errors:

1. **Check your `.env` files match:**
   - `SettlingSun/.env` should have `SYNC_API_KEY="PSOXigrWIdHUilPUIsFDoQ=="`
   - `tools/.env` should have `SYNC_API_KEY="PSOXigrWIdHUilPUIsFDoQ=="`

2. **Make sure dev server restarted:**
   - The server must reload to pick up environment variables
   
3. **Verify API key is being read:**
   - Run `node -e "require('dotenv').config(); console.log(process.env.SYNC_API_KEY)"`
   - In tools directory, should print: `PSOXigrWIdHUilPUIsFDoQ==`

## Ready to sync!

Once `dbf status` works, you can start syncing:
```bash
dbf import party party_master.dbf --strategy UPSERT
dbf export party output.dbf
```

See [GETTING_STARTED.md](GETTING_STARTED.md) for full tutorial!
