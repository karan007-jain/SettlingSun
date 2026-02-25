#!/usr/bin/env node

// Load environment variables from .env file
require('dotenv').config();

/**
 * Unified DBF Sync Tool
 * 
 * Complete bidirectional sync between DBF files and PostgreSQL
 * 
 * Features:
 * - Import: DBF → PostgreSQL (sync, validate)
 * - Export: PostgreSQL → DBF (export, sync-back)
 * - Duplicate checking for exports
 * - Foreign key validation
 * - Multiple sync strategies
 * 
 * Prerequisites:
 * npm install dbffile axios commander dotenv
 * 
 * Usage Examples:
 * 
 * Import (DBF → PostgreSQL):
 *   node dbf-tool.js import party party_master.dbf --strategy UPSERT
 *   node dbf-tool.js import exch exchange.dbf --strategy UPSERT --match-by SHORT_CODE
 *   node dbf-tool.js import idmaster id_master.dbf --strategy UPSERT
 *   node dbf-tool.js validate party party_master.dbf
 *   node dbf-tool.js status
 * 
 * Export (PostgreSQL → DBF):
 *   node dbf-tool.js export party party_master.dbf
 *   node dbf-tool.js export exch exchange.dbf --since 2024-01-01
 *   node dbf-tool.js sync-back party party_master.dbf --mode incremental --since 2024-01-01
 *   node dbf-tool.js export-changes --since 2024-01-01 --output changes/
 */

const { DBFFile } = require('dbffile');
const axios = require('axios');
const { Command } = require('commander');
const fs = require('fs').promises;
const path = require('path');

// Configuration
const API_URL = process.env.API_URL || 'http://localhost:3000/api/trpc';
const SYNC_API_KEY = process.env.SYNC_API_KEY || '';

// ============================================================================
// AUTHENTICATION
// ============================================================================

async function authenticate() {
  if (!SYNC_API_KEY) {
    console.error('✗ SYNC_API_KEY not set in .env file');
    console.error('  Add SYNC_API_KEY to your .env file');
    return false;
  }
  
  console.log('✓ Using API key authentication');
  return true;
}

async function callAPI(endpoint, data = null, method = 'POST') {
  try {
    const url = `${API_URL.replace('/trpc', '')}${endpoint}`;
    
    const config = {
      headers: {
        'x-sync-api-key': SYNC_API_KEY || '',
        'Content-Type': 'application/json',
      },
    };

    let response;
    if (method === 'GET') {
      response = await axios.get(url, config);
    } else {
      response = await axios.post(url, data, config);
    }
    
    return response.data;
  } catch (error) {
    console.error('✗ API Error:', error.response?.data?.error || error.message);
    if (error.response?.data) {
      console.error('  Response data:', JSON.stringify(error.response.data, null, 2));
    }
    throw error;
  }
}

// ============================================================================
// DBF STRUCTURE DEFINITIONS
// ============================================================================

const DBF_STRUCTURES = {
  party: [
    { name: 'PARTY_CODE', type: 'C', size: 6 },
    { name: 'PARTY_NAME', type: 'C', size: 30 },
    { name: 'REF', type: 'C', size: 20 },
  ],
  exch: [
    { name: 'ID_NAME', type: 'C', size: 20 },
    { name: 'PARTY_CODE', type: 'C', size: 6 },
    { name: 'SHORT_CODE', type: 'C', size: 8 },
    { name: 'RATE', type: 'N', size: 6, decs: 2 },
    { name: 'ID_COMM', type: 'N', size: 6, decs: 2 },
    { name: 'ID_AC', type: 'C', size: 10 },
  ],
  idmaster: [
    { name: 'USERID',     type: 'C', size: 15 },
    { name: 'PCODE',      type: 'C', size: 6 },
    { name: 'IDNAME',     type: 'C', size: 15 },
    { name: 'CREDIT',     type: 'N', size: 10, decs: 0 },
    { name: 'COMMISSION', type: 'N', size: 7,  decs: 2 },
    { name: 'RATE',       type: 'N', size: 8,  decs: 2 },
    { name: 'PATI',       type: 'N', size: 8,  decs: 2 },
    { name: 'PARTNER',    type: 'C', size: 6 },
    { name: 'ACTIVE',     type: 'C', size: 1 },
    { name: 'UPLINE',     type: 'C', size: 15 },
    { name: 'ISUPLINE',   type: 'L', size: 1 },
  ],
};

// Helper function to detect entity from filename
function getEntityFromFilename(filePath) {
  const basename = path.basename(filePath, '.dbf').toLowerCase();
  
  // Map common filename patterns to entities
  if (basename.includes('party') || basename.includes('partymst')) {
    return 'party';
  }
  if (basename.includes('exch') || basename.includes('item') || basename.includes('itemmast')) {
    return 'exch';
  }
  if (basename.includes('idmaster') || basename.includes('id_master')) {
    return 'idmaster';
  }
  
  // Default fallback - try to match directly
  return DBF_STRUCTURES[basename] ? basename : null;
}

// ============================================================================
// IMPORT FUNCTIONS (DBF → PostgreSQL)
// ============================================================================

async function readDBF(filePath) {
  try {
    console.log(`Reading DBF file: ${filePath}`);
    const dbf = await DBFFile.open(filePath);
    const records = await dbf.readRecords();
    console.log(`✓ Read ${records.length} records from ${filePath}`);
    return records;
  } catch (error) {
    console.error('✗ Error reading DBF:', error.message);
    throw error;
  }
}

function transformPartyMaster(record) {
  return {
    partyCode: (record.PARTY_CODE || record.P_CODE || '').toString().trim(),
    partyName: (record.PARTY_NAME || record.P_NAME || '').toString().trim(),
    ref: (record.REF || record.P_REF || '').toString().trim() || null,
  };
}

function transformExch(record) {
  return {
    idName: (record.ID_NAME || record.IDNAME || '').toString().trim(),
    partyCode: (record.PARTY_CODE || record.PCODE || '').toString().trim(),
    shortCode: (record.SHORT_CODE || record.SHORT || '').toString().trim(),
    rate: parseFloat(record.RATE || 0),
    idComm: parseFloat(record.ID_COMM || record.IDCOMM || 0),
    idAc: (record.ID_AC || record.IDAC || '').toString().trim(),
  };
}

function transformIdMaster(record) {
  // ISUPLINE is explicit L(1) field; UPLINE is C(15) reference to upline userId

  const isUpline = !!record.ISUPLINE ;
  const uplineId = (record.UPLINE || '').toString().trim() || null;

  return {
    userId: (record.USERID || record.USER_ID || '').toString().trim(),
    partyCode: (record.PCODE || record.PARTY_CODE || '').toString().trim(),
    idCode: (record.IDNAME || record.ID_CODE || '').toString().trim(),
    credit: parseInt(record.CREDIT || 0, 10),
    comm: parseFloat(record.COMMISSION || record.COMM || 0),
    rate: parseFloat(record.RATE || 0),
    pati: record.PATI ? parseFloat(record.PATI) : null,
    partner: (record.PARTNER || '').toString().trim() || null,
    active: typeof record.ACTIVE === 'boolean' ? record.ACTIVE
      : ['T','Y','1'].includes((record.ACTIVE || '').toString().trim().toUpperCase()),
    isUpline: isUpline,
    uplineId: isUpline ? null : uplineId,
  };
}

/**
 * Sort IdMaster records to ensure uplines are imported before downlines
 * This prevents foreign key constraint violations on uplineId
 */
function sortIdMasterRecords(records) {
  const sorted = [];
  const remaining = [...records];
  const userIdSet = new Set();
  
  // First pass: add all records without uplineId
  for (let i = remaining.length - 1; i >= 0; i--) {
    if (!remaining[i].uplineId) {
      sorted.push(remaining[i]);
      userIdSet.add(remaining[i].userId);
      remaining.splice(i, 1);
    }
  }
  
  // Multiple passes: add records whose uplineId is already in sorted list
  let prevLength = -1;
  while (remaining.length > 0 && remaining.length !== prevLength) {
    prevLength = remaining.length;
    
    for (let i = remaining.length - 1; i >= 0; i--) {
      if (userIdSet.has(remaining[i].uplineId)) {
        sorted.push(remaining[i]);
        userIdSet.add(remaining[i].userId);
        remaining.splice(i, 1);
      }
    }
  }
  
  // Add any remaining records (circular references or missing uplines)
  if (remaining.length > 0) {
    console.warn(`Warning: ${remaining.length} records have uplineId references that cannot be resolved within the dataset`);
    console.warn('These records will be added at the end and may fail if uplineId doesn\'t exist in database:');
    remaining.forEach(r => {
      console.warn(`  - userId: ${r.userId}, uplineId: ${r.uplineId}`);
    });
    sorted.push(...remaining);
  }
  
  return sorted;
}

async function validateCommand(entity, dbfFile, options = {}) {
  const records = await readDBF(dbfFile);
  let transformedData;

  switch (entity) {
    case 'party':
      transformedData = records.map(transformPartyMaster);
      break;
    case 'exch':
      transformedData = records.map(transformExch);
      break;
    case 'idmaster':
      transformedData = records.map(transformIdMaster);
      // Filter by type if specified
      if (options.type) {
        const totalRecords = transformedData.length;
        if (options.type === 'upline') {
          transformedData = transformedData
            .filter(r => !r.uplineId || r.uplineId === '')
            .map(r => ({ ...r, isUpline: true, uplineId: null }));
          console.log(`Filtered to ${transformedData.length} upline records (out of ${totalRecords} total)`);
        } else if (options.type === 'downline') {
          transformedData = transformedData
            .filter(r => r.uplineId && r.uplineId !== '')
            .map(r => ({ ...r, isUpline: false }));
          console.log(`Filtered to ${transformedData.length} downline records (out of ${totalRecords} total)`);
        } else {
          console.error(`Invalid type: ${options.type}. Use 'upline' or 'downline'`);
          return;
        }
      }
      break;
    default:
      console.log('Validation only available for party, exch, and idmaster');
      return;
  }

  console.log(`\nValidating ${transformedData.length} records in batches...`);
  
  // Process in batches of 100
  const batchSize = 100;
  const allValid = [];
  const allInvalid = [];
  
  for (let i = 0; i < transformedData.length; i += batchSize) {
    const batch = transformedData.slice(i, i + batchSize);
    console.log(`  Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(transformedData.length / batchSize)} (${batch.length} records)...`);
    
    const result = await callAPI('/sync/validate', {
      entity,
      data: batch
    });
    allValid.push(...result.valid);
    allInvalid.push(...result.invalid);
  }

  console.log('\n=== Validation Results ===');
  console.log(`Total Records: ${transformedData.length}`);
  console.log(`Valid: ${allValid.length}`);
  console.log(`Invalid: ${allInvalid.length}`);
  
  if (allInvalid.length > 0) {
    console.log('\n=== Invalid Records ===');
    allInvalid.forEach((item) => {
      console.log(`\nRecord: ${JSON.stringify(item.record)}`);
      console.log(`Errors: ${item.errors.join(', ')}`);
    });
  }

  // For downline validation: print a distinct list of missing uplines
  if (entity === 'idmaster' && options.type === 'downline') {
    const missingUplineSet = new Set();
    for (const item of allInvalid) {
      for (const err of item.errors) {
        const match = err.match(/Upline '([^']+)' does not exist/);
        if (match) missingUplineSet.add(match[1]);
      }
    }
    if (missingUplineSet.size > 0) {
      console.log('\n=== Missing Uplines (distinct) ===');
      console.log(`${missingUplineSet.size} upline(s) not found in database:`);
      [...missingUplineSet].sort().forEach((u) => console.log(`  - ${u}`));
    } else {
      console.log('\nAll referenced uplines exist in the database.');
    }
  }

  return { valid: allValid, invalid: allInvalid };
}

async function importCommand(entity, dbfFile, options) {
  const records = await readDBF(dbfFile);
  let transformedData;
  let procedure;

  switch (entity) {
    case 'party':
      transformedData = records.map(transformPartyMaster);
      procedure = 'sync.syncPartyMaster';
      break;
    
    case 'exch':
      transformedData = records.map(transformExch);
      procedure = 'sync.syncExch';
      break;
    
    case 'idmaster':
      transformedData = records.map(transformIdMaster);
      // Filter by type if specified
      if (options.type) {
        const totalRecords = transformedData.length;
        if (options.type === 'upline') {
          transformedData = transformedData
            .filter(r => !r.uplineId || r.uplineId === '')
            .map(r => ({ ...r, isUpline: true, uplineId: null }));
          console.log(`Filtered to ${transformedData.length} upline records (out of ${totalRecords} total)`);
        } else if (options.type === 'downline') {
          transformedData = transformedData
            .filter(r => r.uplineId && r.uplineId !== '')
            .map(r => ({ ...r, isUpline: false }));
          console.log(`Filtered to ${transformedData.length} downline records (out of ${totalRecords} total)`);
          // Sort downlines to ensure correct import order
          transformedData = sortIdMasterRecords(transformedData);
        } else {
          throw new Error(`Invalid type: ${options.type}. Use 'upline' or 'downline'`);
        }
      } else {
        // Sort all records: uplines first, then downlines
        // This ensures uplineId foreign keys are satisfied
        transformedData = sortIdMasterRecords(transformedData);
      }
      procedure = 'sync.syncIdMaster';
      break;
    
    default:
      throw new Error(`Unknown entity: ${entity}`);
  }

  // ── Validate first, skip invalid records ──────────────────────────────────
  console.log(`\nValidating ${transformedData.length} records before import...`);
  const batchSize = 100;
  const validatedData = [];
  let totalSkipped = 0;

  for (let i = 0; i < transformedData.length; i += batchSize) {
    const batch = transformedData.slice(i, i + batchSize);
    const result = await callAPI('/sync/validate', { entity, data: batch });
    validatedData.push(...result.valid);
    totalSkipped += result.invalid.length;
    if (result.invalid.length > 0) {
      result.invalid.forEach(item => {
        console.warn(`  ⚠ Skipping invalid record (${item.errors.join(', ')}):`, JSON.stringify(item.record));
      });
    }
  }

  console.log(`✓ Validation complete: ${validatedData.length} valid, ${totalSkipped} skipped`);

  if (validatedData.length === 0) {
    console.log('No valid records to import.');
    return { created: 0, updated: 0, failed: 0, total: 0, errors: [] };
  }

  // Re-sort after filtering (uplines before downlines)
  if (entity === 'idmaster') {
    transformedData = sortIdMasterRecords(validatedData);
  } else {
    transformedData = validatedData;
  }
  // ──────────────────────────────────────────────────────────────────────────

  console.log(`\nSyncing ${transformedData.length} records in batches (strategy: ${options.strategy || 'UPSERT'})...`);
  
  let totalCreated = 0;
  let totalUpdated = 0;
  let totalFailed = 0;
  let allErrors = [];
  
  for (let i = 0; i < transformedData.length; i += batchSize) {
    const batch = transformedData.slice(i, i + batchSize);
    console.log(`  Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(transformedData.length / batchSize)} (${batch.length} records)...`);
    
    const input = {
      entity,
      data: batch,
      strategy: options.strategy || 'UPSERT',
    };

    if (options.matchBy) {
      input.matchBy = options.matchBy;
    }
    
    const result = await callAPI('/sync/import', input);
    totalCreated += result.created;
    totalUpdated += result.updated;
    totalFailed += result.failed || 0;
    if (result.errors && result.errors.length > 0) {
      allErrors.push(...result.errors);
    }
  }

  console.log('\n=== Sync Results ===');
  console.log(`Created: ${totalCreated}`);
  console.log(`Updated: ${totalUpdated}`);
  console.log(`Failed: ${totalFailed}`);
  console.log(`Total: ${transformedData.length}`);
  
  if (allErrors.length > 0) {
    console.log(`\n=== Errors ===`);
    allErrors.forEach((error, index) => {
      console.log(`${index + 1}. ${error}`);
    });
  }

  return {
    created: totalCreated,
    updated: totalUpdated,
    failed: totalFailed,
    total: transformedData.length,
    errors: allErrors
  };
}

async function statusCommand() {
  console.log('Fetching current database status...\n');
  
  const status = await callAPI('/sync/status', null, 'GET');

  console.log('=== Database Status ===');
  console.log(`Party Master: ${status.partyMaster} records`);
  console.log(`Exchange: ${status.exch} records`);
  console.log(`ID Master: ${status.idMaster} records`);
  console.log(`Total: ${status.partyMaster + status.exch + status.idMaster} records`);
  console.log(`Last Sync: ${new Date(status.lastSync).toLocaleString()}\n`);
}

// ============================================================================
// EXPORT FUNCTIONS (PostgreSQL → DBF)
// ============================================================================

function formatDateForDBF(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

async function writeDBF(filePath, records, structure) {
  try {
    console.log(`Writing ${records.length} records to ${filePath}...`);
    
    // Delete existing file if it exists (DBFFile.create fails if file exists)
    try {
      await fs.unlink(filePath);
    } catch (error) {
      // File doesn't exist, that's fine
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }
    
    // Format records
    const formattedRecords = records.map(record => {
      const formattedRecord = {};
      
      for (const field of structure) {
        let value = record[field.name];
        
        if (field.type === 'D' && value) {
          value = new Date(value);
        }
        
        if (field.type === 'C') {
          value = (value || '').toString();
        }
        
        if (field.type === 'N') {
          value = Number(value || 0);
        }
        if (field.type === 'L') {
          value = value ? 'T' : 'F';
        }
        
        formattedRecord[field.name] = value;
      }
      
      return formattedRecord;
    });
    
    // Create DBF file and write records
    const dbf = await DBFFile.create(filePath, structure);
    await dbf.appendRecords(formattedRecords);
    
    console.log(`✓ Successfully wrote ${records.length} records to ${filePath}`);
    
    return true;
  } catch (error) {
    console.error('✗ Error writing DBF:', error.message);
    throw error;
  }
}

async function updateDBF(filePath, records, keyFields) {
  try {
    console.log(`Updating ${filePath} with ${records.length} records...`);
    
    if (!Array.isArray(keyFields)) {
      keyFields = [keyFields];
    }
    
    // Read existing records
    const dbf = await DBFFile.open(filePath);
    const existingRecords = await dbf.readRecords();
    
    let added = 0;
    let skipped = 0;
    
    const updatedRecords = [...existingRecords];
    
    for (const newRecord of records) {
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
        // Record already exists - skip it (don't update)
        skipped++;
        console.log(`  ⚠ Skipped: ${matchedField}=${newRecord[matchedField]} (already exists)`);
      } else {
        // Record doesn't exist - add it
        updatedRecords.push(newRecord);
        added++;
        console.log(`  Added: ${keyFields[0]}=${newRecord[keyFields[0]]}`);
      }
    }
    
    const entityType = getEntityFromFilename(filePath);
    if (!entityType) {
      throw new Error(`Could not determine entity type from filename: ${filePath}`);
    }
    
    const structure = DBF_STRUCTURES[entityType];
    await writeDBF(filePath, updatedRecords, structure);
    
    console.log(`✓ Added ${added} new records, skipped ${skipped} existing records`);
    
    return { added, skipped, total: updatedRecords.length };
  } catch (error) {
    console.error('✗ Error updating DBF:', error.message);
    throw error;
  }
}

async function exportCommand(entity, dbfFile, options) {
  let data;
  let procedure;
  let structure;
  let keyFields;

  const input = options.since ? { modifiedSince: new Date(options.since) } : undefined;

  switch (entity) {
    case 'party':
      procedure = 'sync.exportPartyMaster';
      structure = DBF_STRUCTURES.party;
      keyFields = ['PARTY_CODE'];
      break;
    
    case 'exch':
      procedure = 'sync.exportExch';
      structure = DBF_STRUCTURES.exch;
      keyFields = ['ID_NAME', 'SHORT_CODE'];
      break;
    
    case 'idmaster':
      procedure = 'sync.exportIdMaster';
      structure = DBF_STRUCTURES.idmaster;
      keyFields = ['USERID'];
      break;
    
    default:
      throw new Error(`Unknown entity: ${entity}`);
  }

  console.log(`Exporting ${entity} from PostgreSQL...`);
  data = await callAPI('/sync/export', {
    entity,
    modifiedSince: input?.modifiedSince
  });

  console.log(`\n=== Export Results ===`);
  console.log(`Total Records from Database: ${data.length}`);
  
  if (data.length === 0) {
    console.log('No records to export');
    return;
  }

  // Check if file exists
  let fileExists = false;
  try {
    await fs.access(dbfFile);
    fileExists = true;
  } catch (error) {
    // File doesn't exist
    fileExists = false;
  }

  if (fileExists) {
    // File exists - update it
    console.log(`File exists - syncing updates...`);
    const result = await updateDBF(dbfFile, data, keyFields);
    
    console.log(`\n=== Summary ===`);
    console.log(`Added: ${result.added}`);
    console.log(`Skipped (already exist): ${result.skipped}`);
    console.log(`Total records in file: ${result.total}`);
  } else {
    // File doesn't exist - create new
    console.log(`Creating new file...`);
    await writeDBF(dbfFile, data, structure);
    
    console.log(`\n=== Summary ===`);
    console.log(`Created: ${data.length} new records`);
    console.log(`Total records in file: ${data.length}`);
  }

  return data;
}

async function exportChangesCommand(options) {
  const since = new Date(options.since);
  const outputDir = options.output || '.';
  const entities = options.entities || ['party', 'exch', 'idmaster'];

  console.log(`Exporting changes since ${since.toISOString()}...`);
  console.log('\n=== Export Changes Results ===');
  
  await fs.mkdir(outputDir, { recursive: true });

  // Export each entity separately
  const data = {};
  
  if (entities.includes('party')) {
    const partyData = await callAPI('/sync/export', {
      entity: 'party',
      modifiedSince: since
    });
    
    if (partyData && partyData.length > 0) {
      const filePath = path.join(outputDir, 'party_master.dbf');
      await writeDBF(filePath, partyData, DBF_STRUCTURES.party);
      console.log(`Party Master: ${partyData.length} records → ${filePath}`);
      data.partyMaster = partyData;
    }
  }

  if (entities.includes('exch')) {
    const exchData = await callAPI('/sync/export', {
      entity: 'exch',
      modifiedSince: since
    });
    
    if (exchData && exchData.length > 0) {
      const filePath = path.join(outputDir, 'exchange.dbf');
      await writeDBF(filePath, exchData, DBF_STRUCTURES.exch);
      console.log(`Exchange: ${exchData.length} records → ${filePath}`);
      data.exch = exchData;
    }
  }

  if (entities.includes('idmaster')) {
    const idMasterData = await callAPI('/sync/export', {
      entity: 'idmaster',
      modifiedSince: since
    });
    
    if (idMasterData && idMasterData.length > 0) {
      const filePath = path.join(outputDir, 'id_master.dbf');
      await writeDBF(filePath, idMasterData, DBF_STRUCTURES.idmaster);
      console.log(`ID Master: ${idMasterData.length} records → ${filePath}`);
      data.idMaster = idMasterData;
    }
  }

  return data;
}

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
      keyFields = ['PARTY_CODE'];
      break;
    case 'exch':
      procedure = 'sync.exportExch';
      keyFields = ['ID_NAME', 'SHORT_CODE'];
      break;
    case 'idmaster':
      procedure = 'sync.exportIdMaster';
      keyFields = ['USERID'];
      break;
    default:
      throw new Error(`Unknown entity: ${entity}`);
  }

  const data = await callAPI('/sync/export', {
    entity,
    modifiedSince: input?.modifiedSince
  });

  console.log(`\n=== Sync Back Results ===`);
  console.log(`Total Records: ${data.length}`);

  if (mode === 'full') {
    const structure = DBF_STRUCTURES[entity];
    await writeDBF(dbfFile, data, structure);
  } else {
    const result = await updateDBF(dbfFile, data, keyFields);
    console.log(`Added: ${result.added}, Skipped: ${result.skipped}`);
  }

  return data;
}

// ============================================================================
// CLI SETUP
// ============================================================================

const program = new Command();

program
  .name('dbf-tool')
  .description('Unified DBF Sync Tool - Bidirectional sync between DBF and PostgreSQL')
  .version('1.0.0');

// Import commands
program
  .command('import <entity> <dbfFile>')
  .description('Import DBF data to PostgreSQL (entity: party, exch, idmaster)')
  .option('-s, --strategy <strategy>', 'Sync strategy: UPSERT, REPLACE, INSERT_ONLY', 'UPSERT')
  .option('-m, --match-by <field>', 'Match records by field (for exch: ID_NAME or SHORT_CODE)')
  .option('-t, --type <type>', 'Filter idmaster records by type: upline or downline')
  .action(async (entity, dbfFile, options) => {
    if (await authenticate()) {
      await importCommand(entity, dbfFile, options);
    }
  });

program
  .command('validate <entity> <dbfFile>')
  .description('Validate DBF data before syncing (entity: party, exch, idmaster)')
  .option('-t, --type <type>', 'Filter idmaster records by type: upline or downline')
  .action(async (entity, dbfFile, options) => {
    if (await authenticate()) {
      await validateCommand(entity, dbfFile, options);
    }
  });

program
  .command('status')
  .description('Show current database record counts')
  .action(async () => {
    if (await authenticate()) {
      await statusCommand();
    }
  });

// Export commands
program
  .command('export <entity> <dbfFile>')
  .description('Export PostgreSQL data to DBF file (entity: party, exch, idmaster)')
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
