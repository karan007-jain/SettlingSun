# DBF Tool Setup Instructions

## Quick Setup

### 1. Add API Key to Main Project

Edit `SettlingSun/.env` and add:

```env
SYNC_API_KEY=your-secret-sync-key-here-replace-this
```

Generate a strong key:

**Windows (PowerShell):**
```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

**Linux/Mac:**
```bash
openssl rand -base64 32
```

**Example:** Your `.env` should look like:
```env
DATABASE_URL="postgresql://user:password@localhost:8888/db?schema=public"
NEXTAUTH_SECRET="..."
NEXTAUTH_URL="http://localhost:3000"
SYNC_API_KEY="Ab12Cd34Ef56Gh78Ij90Kl12Mn34Op56Qr78St90=="
NODE_ENV="development"
```

### 2. Create Tools `.env` File

```bash
cd tools
copy .env.example .env     # Windows
# or
cp .env.example .env       # Linux/Mac
```

Edit `tools/.env` with the **SAME** API key:

```env
API_URL=http://localhost:3000/api/trpc
SYNC_API_KEY=Ab12Cd34Ef56Gh78Ij90Kl12Mn34Op56Qr78St90==
```

⚠️ **Important:** Both SYNC_API_KEY values must be identical!

### 3. Restart Dev Server

After adding SYNC_API_KEY to main `.env`:

```bash
# Stop the dev server (Ctrl+C)
npm run dev
```

### 4. Test the Tool

```bash
cd tools
dbf status
```

You should see:
```
✓ Using API key authentication
Fetching current database status...

=== Database Status ===
Party Master: X records
Exchange: Y records
ID Master: Z records
```

## Troubleshooting

### "SYNC_API_KEY not set in .env file"
- Create `tools/.env` file from `.env.example`
- Add `SYNC_API_KEY=your-key-here`

### "Invalid or missing API key"
- Keys don't match between `tools/.env` and main `.env`
- Restart dev server after changing main `.env`

### "SYNC_API_KEY not configured. Admin access required."
- Add `SYNC_API_KEY` to main project `.env`
- Restart dev server

## Security Notes

1. **Never commit** `.env` files to version control
2. Use **different API keys** for production and development
3. **Rotate keys** periodically
4. The API key grants **full sync access** - keep it secret

## Next Steps

See [GETTING_STARTED.md](GETTING_STARTED.md) for usage examples.
