# DBF to PostgreSQL Sync Documentation

## Overview
Endpoints for syncing data from DBF files to PostgreSQL database with full validation and error handling.

## Sync Endpoints

### 1. Party Master Sync
**Endpoint**: `sync.syncPartyMaster`

**Parameters**:
```typescript
{
  strategy: "UPSERT" | "REPLACE" | "INSERT_ONLY",
  data: Array<{
    partyCode: string,    // Exactly 6 characters
    partyName: string,    // Max 15 characters
    ref?: string          // Max 15 characters (optional)
  }>,
  deleteNotInSource: boolean  // Delete records not in sync data
}
```

**Strategies**:
- `UPSERT` (default): Insert new records, update existing ones
- `REPLACE`: Delete all existing records, then insert all
- `INSERT_ONLY`: Only insert new records, skip existing ones

**Response**:
```typescript
{
  inserted: number,
  updated: number,
  deleted: number,
  errors: string[]
}
```

### 2. Exchange Sync
**Endpoint**: `sync.syncExch`

**Parameters**:
```typescript
{
  strategy: "UPSERT" | "REPLACE" | "INSERT_ONLY",
  matchBy: "ID" | "SHORT_CODE",  // How to match existing records
  data: Array<{
    id?: string,          // Optional: existing record ID
    idName: string,       // Max 15 characters
    partyCode: string,    // Must exist in PartyMaster
    shortCode: string,    // Max 8 characters, unique
    rate: number,
    idComm: number,
    idAc: string          // Must exist in PartyMaster
  }>,
  deleteNotInSource: boolean,
  exchMatchBy: "ID" | "SHORT_CODE"
}
```

**Match By Options**:
- `SHORT_CODE` (default): Match by shortCode field
- `ID`: Match by database ID (if available)

### 3. ID Master Sync
**Endpoint**: `sync.syncIdMaster`

**Parameters**:
```typescript
{
  strategy: "UPSERT" | "REPLACE" | "INSERT_ONLY",
  matchBy: "ID" | "USER_ID",     // How to match existing records
  exchMatchBy: "ID" | "SHORT_CODE",  // How to find exchange
  data: Array<{
    id?: string,
    userId: string,       // Max 15 characters, unique
    partyCode: string,    // Must exist in PartyMaster
    idCode: string,       // Exchange ID or shortCode
    comm: number,
    rate: number,
    pati: string,         // Must exist in PartyMaster
    active: boolean,
    isUpline: boolean,
    uplineId?: string     // Must exist in IdMaster (if isUpline=false)
  }>,
  deleteNotInSource: boolean
}
```

**Exchange Match Options**:
- `SHORT_CODE` (default): Match exchange by shortCode
- `ID`: Match exchange by database ID

## Validation Endpoints

### Validate Party Master
**Endpoint**: `sync.validatePartyMaster`

Validates data before syncing. Checks:
- PartyCode length (must be 6)
- PartyName length (max 15)
- Ref length (max 15)
- Duplicate partyCodes in input

**Returns**:
```typescript
{
  valid: boolean,
  errors: string[],
  duplicates: string[],
  totalRecords: number
}
```

### Validate Exchange
**Endpoint**: `sync.validateExch`

Validates data before syncing. Checks:
- Field length constraints
- Foreign key existence (partyCode, idAc)
- Duplicate shortCodes

**Returns**:
```typescript
{
  valid: boolean,
  errors: string[],
  duplicates: string[],
  missingParties: string[],
  totalRecords: number
}
```

## Sync Status
**Endpoint**: `sync.getSyncStatus`

Returns current database counts:
```typescript
{
  partyMaster: number,
  exch: number,
  idMaster: number,
  lastSync: Date
}
```

## Command-Line Tool Integration

### Recommended Sync Order
1. **PartyMaster** first (required by Exch and IdMaster)
2. **Exch** second (required by IdMaster)
3. **IdMaster** last (depends on both)

### Example Sync Flow

```bash
# 1. Validate data first
node dbf-sync.js validate party party_master.dbf

# 2. Sync PartyMaster
node dbf-sync.js sync party party_master.dbf --strategy UPSERT

# 3. Sync Exchange
node dbf-sync.js sync exch exchange.dbf --strategy UPSERT --match-by SHORT_CODE

# 4. Sync IdMaster
node dbf-sync.js sync idmaster id_master.dbf --strategy UPSERT --match-by USER_ID --exch-match-by SHORT_CODE
```

### DBF Tool Recommendations

**Node.js Libraries**:
- `node-dbf` - Read DBF files
- `axios` - HTTP requests to tRPC endpoints

**Python Alternative**:
- `dbfread` - Read DBF files
- `requests` - HTTP requests

### Sample DBF Reader (Node.js)

```javascript
const DBF = require('node-dbf');
const axios = require('axios');

async function syncPartyMaster(dbfFile) {
  const dbf = await DBF.open(dbfFile);
  const records = await dbf.readRecords();
  
  const data = records.map(r => ({
    partyCode: r.PARTY_CODE.trim().toUpperCase(),
    partyName: r.PARTY_NAME.trim(),
    ref: r.REF?.trim() || null
  }));

  // First validate
  const validation = await tRPCClient.sync.validatePartyMaster.mutate(data);
  
  if (!validation.valid) {
    console.error('Validation errors:', validation.errors);
    return;
  }

  // Then sync
  const result = await tRPCClient.sync.syncPartyMaster.mutate({
    strategy: 'UPSERT',
    data,
    deleteNotInSource: false
  });

  console.log(`Synced: ${result.inserted} inserted, ${result.updated} updated`);
}
```

## API Endpoint URL

**Base URL**: `http://localhost:3000/api/trpc`

**Authentication**: Required - Admin role only
- Include session cookie or JWT token

## Error Handling

All sync operations return detailed errors:
- Foreign key violations
- Validation failures
- Duplicate records
- Individual record failures (doesn't stop batch)

Errors are returned in results.errors array with context.

## Best Practices

1. **Always validate first** before syncing
2. **Use UPSERT strategy** for incremental updates
3. **Batch sync** in reasonable chunks (100-1000 records)
4. **Log results** for audit trail
5. **Sync in order**: PartyMaster → Exch → IdMaster
6. **Test with small dataset** first
7. **Backup database** before large sync operations

## Incremental Sync Strategy

For ongoing syncs:
```typescript
{
  strategy: "UPSERT",           // Update existing, insert new
  deleteNotInSource: false      // Keep records not in DBF
}
```

## Full Refresh Strategy

For complete replacement:
```typescript
{
  strategy: "REPLACE",          // Delete all, insert all
  deleteNotInSource: true       // Not needed with REPLACE
}
```

## Performance Considerations

- Batch size: 500-1000 records per request recommended
- Foreign key validation is performed for each record
- Transactions ensure data integrity
- Consider indexing on match fields (userId, shortCode)
