#!/usr/bin/env node

// Load environment variables from .env file
require('dotenv').config();

/**
 * PostgreSQL to DBF Export Tool
 * 
 * Features:
 * - Full export (replace entire file)
 * - Incremental export (append/update records)
 * - Duplicate checking based on unique fields:
 *   * PARTYMST: Checks PARTY_CODE (P_CODE)
 *   * ITEMMAST: Checks ID_NAME and SHORT_CODE (both must be unique)
 *   * IDMASTER: Checks USER_ID
 * - DBF files don't support primary keys, so manual checking prevents duplicates
 * 
 * Prerequisites:
 * npm install node-dbf axios commander
 * 
 * Usage:
 * node dbf-export.js export party party_master.dbf
 * node dbf-export.js export exch exchange.dbf
 * node dbf-export.js export idmaster id_master.dbf
 * node dbf-export.js export-changes --since 2024-01-01 --output changes/
 * node dbf-export.js sync-back party party_master.dbf --mode incremental
 */

const DBF = require('node-dbf');
const axios = require('axios');
const { Command } = require('commander');
const fs = require('fs').promises;
const path = require('path');

// Configuration
const API_URL = process.env.API_URL || 'http://localhost:3000/api/trpc';
const AUTH_EMAIL = process.env.ADMIN_EMAIL || 'admin@example.com';
const AUTH_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

let sessionCookie = null;

// Authenticate and get session
async function authenticate() {
  try {
    const response = await axios.post(`${API_URL.replace('/api/trpc', '')}/api/auth/signin/credentials`, {
      email: AUTH_EMAIL,
      password: AUTH_PASSWORD,
    });
    
    sessionCookie = response.headers['set-cookie'];
    console.log('✓ Authenticated successfully');
    return true;
  } catch (error) {
    console.error('✗ Authentication failed:', error.message);
    return false;
  }
}

// Call tRPC endpoint
async function callTRPC(procedure, input) {
  try {
    const url = input !== undefined
      ? `${API_URL}/${procedure}?input=${encodeURIComponent(JSON.stringify(input))}`
      : `${API_URL}/${procedure}`;

    const response = await axios.get(url, {
      headers: {
        'Cookie': sessionCookie || '',
      },
    });
    return response.data.result.data;
  } catch (error) {
    console.error('✗ API Error:', error.response?.data || error.message);
    throw error;
  }
}

// DBF Structure Definitions
const DBF_STRUCTURES = {
  party: [
    { name: 'PARTY_CODE', type: 'C', length: 6 },
    { name: 'PARTY_NAME', type: 'C', length: 15 },
    { name: 'REF', type: 'C', length: 15 },
  ],
  exch: [
    { name: 'ID_NAME', type: 'C', length: 15 },
    { name: 'PARTY_CODE', type: 'C', length: 6 },
    { name: 'SHORT_CODE', type: 'C', length: 8 },
    { name: 'RATE', type: 'N', length: 10, decimalPlaces: 2 },
    { name: 'ID_COMM', type: 'N', length: 10, decimalPlaces: 2 },
    { name: 'ID_AC', type: 'C', length: 6 },
  ],
  idmaster: [
    { name: 'USERID',     type: 'C', length: 15 },
    { name: 'PCODE',      type: 'C', length: 6 },
    { name: 'IDNAME',     type: 'C', length: 15 },
    { name: 'CREDIT',     type: 'N', length: 10, decimalPlaces: 0 },
    { name: 'COMMISSION', type: 'N', length: 7,  decimalPlaces: 2 },
    { name: 'RATE',       type: 'N', length: 8,  decimalPlaces: 2 },
    { name: 'PATI',       type: 'N', length: 8,  decimalPlaces: 2 },
    { name: 'PARTNER',    type: 'C', length: 6 },
    { name: 'ACTIVE',     type: 'C', length: 1 },
    { name: 'UPLINE',     type: 'C', length: 15 },
    { name: 'ISUPLINE',   type: 'L', length: 1 },
  ],
};

// Format date for DBF
function formatDateForDBF(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

// Write DBF file
async function writeDBF(filePath, records, structure) {
  try {
    console.log(`Writing ${records.length} records to ${filePath}...`);
    
    // Create DBF file
    const dbf = await DBF.create(filePath, structure);
    
    // Write records
    for (const record of records) {
      const formattedRecord = {};
      
      for (const field of structure) {
        let value = record[field.name];
        
        // Format dates
        if (field.type === 'D' && value) {
          value = formatDateForDBF(value);
        }
        
        // Format strings
        if (field.type === 'C') {
          value = (value || '').toString().padEnd(field.length, ' ').substring(0, field.length);
        }
        
        // Format numbers
        if (field.type === 'N') {
          value = Number(value || 0);
        }
        
        formattedRecord[field.name] = value;
      }
      
      await dbf.append(formattedRecord);
    }
    
    await dbf.close();
    console.log(`✓ Successfully wrote ${records.length} records to ${filePath}`);
    
    return true;
  } catch (error) {
    console.error('✗ Error writing DBF:', error.message);
    throw error;
  }
}

// Update existing DBF file
async function updateDBF(filePath, records, keyFields) {
  try {
    console.log(`Updating ${filePath} with ${records.length} records...`);
    
    // Ensure keyFields is an array
    if (!Array.isArray(keyFields)) {
      keyFields = [keyFields];
    }
    
    // Read existing records
    const dbf = await DBF.open(filePath);
    const existingRecords = await dbf.readRecords();
    await dbf.close();
    
    // Update or add new records
    let updated = 0;
    let added = 0;
    let skipped = 0;
    
    const updatedRecords = [...existingRecords];
    
    for (const newRecord of records) {
      // Check if record exists based on ANY unique key field
      let existingIndex = -1;
      let matchedField = null;
      
      for (const keyField of keyFields) {
        const key = newRecord[keyField]?.toString().trim();
        if (!key) continue;
        
        const foundIndex = updatedRecords.findIndex(r => {
          const existingKey = r[keyField]?.toString().trim();
          return existingKey && existingKey === key;
        });
        
        if (foundIndex >= 0) {
          existingIndex = foundIndex;
          matchedField = keyField;
          break;
        }
      }
      
      if (existingIndex >= 0) {
        // Record exists - update it
        updatedRecords[existingIndex] = newRecord;
        updated++;
        console.log(`  Updated: ${matchedField}=${newRecord[matchedField]}`);
      } else {
        // New record - check if any unique field already exists in different record
        let isDuplicate = false;
        
        for (const keyField of keyFields) {
          const key = newRecord[keyField]?.toString().trim();
          if (!key) continue;
          
          const duplicate = updatedRecords.find(r => {
            const existingKey = r[keyField]?.toString().trim();
            return existingKey && existingKey === key;
          });
          
          if (duplicate) {
            console.log(`  ⚠ Skipped: ${keyField}=${key} already exists`);
            isDuplicate = true;
            skipped++;
            break;
          }
        }
        
        if (!isDuplicate) {
          updatedRecords.push(newRecord);
          added++;
          console.log(`  Added: ${keyFields[0]}=${newRecord[keyFields[0]]}`);
        }
      }
    }
    
    // Get structure from first record
    const structure = DBF_STRUCTURES[path.basename(filePath, '.dbf').toLowerCase()];
    
    // Write back to file
    await writeDBF(filePath, updatedRecords, structure);
    
    console.log(`✓ Updated ${updated} records, added ${added} new records, skipped ${skipped} duplicates`);
    
    return { updated, added, skipped };
  } catch (error) {
    console.error('✗ Error updating DBF:', error.message);
    throw error;
  }
}

// Export command
async function exportCommand(entity, dbfFile, options) {
  let data;
  let procedure;
  let structure;

  const input = options.since ? { modifiedSince: new Date(options.since) } : undefined;

  switch (entity) {
    case 'party':
      procedure = 'sync.exportPartyMaster';
      structure = DBF_STRUCTURES.party;
      break;
    
    case 'exch':
      procedure = 'sync.exportExch';
      structure = DBF_STRUCTURES.exch;
      break;
    
    case 'idmaster':
      procedure = 'sync.exportIdMaster';
      structure = DBF_STRUCTURES.idmaster;
      break;
    
    default:
      throw new Error(`Unknown entity: ${entity}`);
  }

  console.log(`Exporting ${entity} from PostgreSQL...`);
  data = await callTRPC(procedure, input);

  console.log(`\n=== Export Results ===`);
  console.log(`Total Records: ${data.length}`);
  
  if (data.length === 0) {
    console.log('No records to export');
    return;
  }

  // Write to DBF
  await writeDBF(dbfFile, data, structure);

  return data;
}

// Export changes command
async function exportChangesCommand(options) {
  const since = new Date(options.since);
  const outputDir = options.output || '.';

  console.log(`Exporting changes since ${since.toISOString()}...`);
  
  const data = await callTRPC('sync.exportChanges', {
    since,
    entities: options.entities || ['party', 'exch', 'idmaster'],
  });

  console.log('\n=== Export Changes Results ===');
  
  // Ensure output directory exists
  await fs.mkdir(outputDir, { recursive: true });

  if (data.partyMaster && data.partyMaster.length > 0) {
    const filePath = path.join(outputDir, 'party_master.dbf');
    await writeDBF(filePath, data.partyMaster, DBF_STRUCTURES.party);
    console.log(`Party Master: ${data.partyMaster.length} records → ${filePath}`);
  }

  if (data.exch && data.exch.length > 0) {
    const filePath = path.join(outputDir, 'exchange.dbf');
    await writeDBF(filePath, data.exch, DBF_STRUCTURES.exch);
    console.log(`Exchange: ${data.exch.length} records → ${filePath}`);
  }

  if (data.idMaster && data.idMaster.length > 0) {
    const filePath = path.join(outputDir, 'id_master.dbf');
    await writeDBF(filePath, data.idMaster, DBF_STRUCTURES.idmaster);
    console.log(`ID Master: ${data.idMaster.length} records → ${filePath}`);
  }

  return data;
}

// Sync back command (incremental or full)
async function syncBackCommand(entity, dbfFile, options) {
  const mode = options.mode || 'full';
  const since = options.since ? new Date(options.since) : null;

  console.log(`Syncing ${entity} back to DBF (mode: ${mode})...`);

  const input = mode === 'incremental' && since ? { modifiedSince: since } : undefined;

  let procedure;
  let keyFields;

  switch (entity) {
    case 'party':
      procedure = 'sync.exportPartyMaster';
      keyFields = ['PARTY_CODE']; // Check party code
      break;
    case 'exch':
      procedure = 'sync.exportExch';
      keyFields = ['ID_NAME', 'SHORT_CODE']; // Check both ID name and short code
      break;
    case 'idmaster':
      procedure = 'sync.exportIdMaster';
      keyFields = ['USERID']; // Check user ID
      break;
    default:
      throw new Error(`Unknown entity: ${entity}`);
  }

  const data = await callTRPC(procedure, input);

  console.log(`\n=== Sync Back Results ===`);
  console.log(`Total Records: ${data.length}`);

  if (mode === 'full') {
    // Replace entire file
    const structure = DBF_STRUCTURES[entity];
    await writeDBF(dbfFile, data, structure);
  } else {
    // Incremental update with duplicate checking
    const result = await updateDBF(dbfFile, data, keyFields);
    console.log(`Updated: ${result.updated}, Added: ${result.added}, Skipped: ${result.skipped}`);
  }

  return data;
}

// Main CLI
const program = new Command();

program
  .name('dbf-export')
  .description('Export PostgreSQL data to DBF files')
  .version('1.0.0');

program
  .command('export <entity> <dbfFile>')
  .description('Export data to DBF file (entity: party, exch, idmaster)')
  .option('-s, --since <date>', 'Export only records modified since date (YYYY-MM-DD)')
  .action(async (entity, dbfFile, options) => {
    if (await authenticate()) {
      await exportCommand(entity, dbfFile, options);
    }
  });

program
  .command('export-changes')
  .description('Export all changes since a specific date')
  .option('-s, --since <date>', 'Export changes since date (YYYY-MM-DD)', required => required)
  .option('-o, --output <dir>', 'Output directory', '.')
  .option('-e, --entities <list>', 'Comma-separated list of entities (party,exch,idmaster)')
  .action(async (options) => {
    if (!options.since) {
      console.error('Error: --since option is required');
      return;
    }
    
    if (options.entities) {
      options.entities = options.entities.split(',');
    }
    
    if (await authenticate()) {
      await exportChangesCommand(options);
    }
  });

program
  .command('sync-back <entity> <dbfFile>')
  .description('Sync PostgreSQL data back to existing DBF file')
  .option('-m, --mode <mode>', 'Sync mode: full or incremental', 'full')
  .option('-s, --since <date>', 'For incremental mode: sync changes since date (YYYY-MM-DD)')
  .action(async (entity, dbfFile, options) => {
    if (options.mode === 'incremental' && !options.since) {
      console.error('Error: --since is required for incremental mode');
      return;
    }
    
    if (await authenticate()) {
      await syncBackCommand(entity, dbfFile, options);
    }
  });

program.parse();
