#!/usr/bin/env node

// Load environment variables from .env file
require('dotenv').config();

/**
 * DBF to PostgreSQL Sync Tool
 * 
 * Prerequisites:
 * npm install node-dbf axios commander
 * 
 * Usage:
 * node dbf-sync.js validate party party_master.dbf
 * node dbf-sync.js sync party party_master.dbf --strategy UPSERT
 * node dbf-sync.js sync exch exchange.dbf --strategy UPSERT --match-by SHORT_CODE
 * node dbf-sync.js sync idmaster id_master.dbf --strategy UPSERT --match-by USER_ID
 * node dbf-sync.js status
 */

const DBF = require('node-dbf');
const axios = require('axios');
const { Command } = require('commander');
const fs = require('fs').promises;

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
    const response = await axios.post(
      `${API_URL}/${procedure}`,
      input,
      {
        headers: {
          'Content-Type': 'application/json',
          'Cookie': sessionCookie || '',
        },
      }
    );
    return response.data.result.data;
  } catch (error) {
    console.error('✗ API Error:', error.response?.data || error.message);
    throw error;
  }
}

// Read DBF file
async function readDBF(filePath) {
  try {
    console.log(`Reading DBF file: ${filePath}`);
    const dbf = await DBF.open(filePath);
    const records = await dbf.readRecords();
    console.log(`✓ Read ${records.length} records`);
    return records;
  } catch (error) {
    console.error('✗ Error reading DBF:', error.message);
    throw error;
  }
}

// Transform PartyMaster records
function transformPartyMaster(records) {
  return records.map(r => ({
    partyCode: (r.P_CODE || r.PARTY_CODE || r.partyCode || '').toString().trim().toUpperCase().substring(0, 6),
    partyName: (r.P_NAME || r.PARTY_NAME || r.partyName || '').toString().trim().substring(0, 15),
    ref: r.P_REF || r.REF || r.ref ? (r.P_REF || r.REF || r.ref).toString().trim().substring(0, 15) : null,
  })).filter(r => r.partyCode && r.partyName);
}

// Transform Exchange records
function transformExch(records) {
  return records.map(r => ({
    idName: (r.IDNAME || r.ID_NAME || r.idName || '').toString().trim().substring(0, 15),
    partyCode: (r.PCODE || r.PARTY_CODE || r.partyCode || '').toString().trim().toUpperCase().substring(0, 6),
    shortCode: (r.SHORT || r.SHORT_CODE || r.shortCode || '').toString().trim().substring(0, 8),
    rate: parseFloat(r.RATE || r.rate || 0),
    idComm: parseFloat(r.IDCOMM || r.ID_COMM || r.idComm || 0),
    idAc: (r.IDAC || r.ID_AC || r.idAc || '').toString().trim().toUpperCase().substring(0, 6),
  })).filter(r => r.idName && r.shortCode && r.partyCode && r.idAc);
}

// Transform IdMaster records
function transformIdMaster(records) {
  return records.map(r => ({
    userId: (r.USER_ID || r.USERID || r.userId || '').toString().trim().substring(0, 15),
    partyCode: (r.PCODE || r.PARTY_CODE || r.partyCode || '').toString().trim().toUpperCase().substring(0, 6),
    idCode: (r.IDNAME || r.ID_CODE || r.idCode || '').toString().trim(),
    credit: parseInt(r.CREDIT || r.credit || 0, 10),
    comm: parseFloat(r.COMMISSION || r.COMM || r.comm || 0),
    rate: parseFloat(r.RATE || r.rate || 0),
    pati: r.PATI || r.pati ? parseFloat(r.PATI || r.pati) : null,
    partner: r.PARTNER || r.partner ? (r.PARTNER || r.partner).toString().trim().toUpperCase().substring(0, 6) : null,
    active: typeof r.ACTIVE === 'boolean' ? r.ACTIVE
      : ['T','Y','1'].includes((r.ACTIVE || '').toString().trim().toUpperCase()),
    isUpline: Boolean(r.ISUPLINE !== undefined ? r.ISUPLINE : r.IS_UPLINE !== undefined ? r.IS_UPLINE : r.isUpline !== undefined ? r.isUpline : false),
    uplineId: (r.UPLINE || r.UPLINE_ID || r.uplineId) ? (r.UPLINE || r.UPLINE_ID || r.uplineId).toString().trim().substring(0, 15) || null : null,
  })).filter(r => r.userId && r.partyCode && r.idCode);
}

// Validate command
async function validateCommand(entity, dbfFile) {
  const records = await readDBF(dbfFile);
  let data;
  let procedure;

  switch (entity) {
    case 'party':
      data = transformPartyMaster(records);
      procedure = 'sync.validatePartyMaster';
      break;
    case 'exch':
      data = transformExch(records);
      procedure = 'sync.validateExch';
      break;
    default:
      throw new Error(`Validation not implemented for ${entity}`);
  }

  console.log(`Validating ${data.length} records...`);
  const result = await callTRPC(procedure, data);

  console.log('\n=== Validation Results ===');
  console.log(`Total Records: ${result.totalRecords}`);
  console.log(`Valid: ${result.valid ? '✓ Yes' : '✗ No'}`);
  
  if (result.errors?.length > 0) {
    console.log(`\nErrors (${result.errors.length}):`);
    result.errors.forEach(err => console.log(`  - ${err}`));
  }
  
  if (result.duplicates?.length > 0) {
    console.log(`\nDuplicates (${result.duplicates.length}):`);
    result.duplicates.forEach(dup => console.log(`  - ${dup}`));
  }
  
  if (result.missingParties?.length > 0) {
    console.log(`\nMissing Parties (${result.missingParties.length}):`);
    result.missingParties.forEach(p => console.log(`  - ${p}`));
  }

  return result.valid;
}

// Sync command
async function syncCommand(entity, dbfFile, options) {
  const records = await readDBF(dbfFile);
  let data;
  let procedure;
  let input;

  switch (entity) {
    case 'party':
      data = transformPartyMaster(records);
      procedure = 'sync.syncPartyMaster';
      input = {
        strategy: options.strategy || 'UPSERT',
        data,
        deleteNotInSource: options.deleteNotInSource || false,
      };
      break;
    
    case 'exch':
      data = transformExch(records);
      procedure = 'sync.syncExch';
      input = {
        strategy: options.strategy || 'UPSERT',
        data,
        deleteNotInSource: options.deleteNotInSource || false,
        matchBy: options.matchBy || 'SHORT_CODE',
      };
      break;
    
    case 'idmaster':
      data = transformIdMaster(records);
      procedure = 'sync.syncIdMaster';
      input = {
        strategy: options.strategy || 'UPSERT',
        data,
        deleteNotInSource: options.deleteNotInSource || false,
        matchBy: options.matchBy || 'USER_ID',
        exchMatchBy: options.exchMatchBy || 'SHORT_CODE',
      };
      break;
    
    default:
      throw new Error(`Unknown entity: ${entity}`);
  }

  console.log(`Syncing ${data.length} records with strategy: ${input.strategy}...`);
  const result = await callTRPC(procedure, input);

  console.log('\n=== Sync Results ===');
  console.log(`Inserted: ${result.inserted}`);
  console.log(`Updated: ${result.updated}`);
  console.log(`Deleted: ${result.deleted}`);
  
  if (result.errors?.length > 0) {
    console.log(`\nErrors (${result.errors.length}):`);
    result.errors.forEach(err => console.log(`  - ${err}`));
  } else {
    console.log('✓ No errors');
  }

  return result;
}

// Status command
async function statusCommand() {
  const result = await callTRPC('sync.getSyncStatus', undefined);

  console.log('\n=== Database Status ===');
  console.log(`Party Master: ${result.partyMaster} records`);
  console.log(`Exchange: ${result.exch} records`);
  console.log(`ID Master: ${result.idMaster} records`);
  console.log(`Last Sync: ${new Date(result.lastSync).toLocaleString()}`);

  return result;
}

// Main CLI
const program = new Command();

program
  .name('dbf-sync')
  .description('Sync DBF files to PostgreSQL database')
  .version('1.0.0');

program
  .command('validate <entity> <dbfFile>')
  .description('Validate DBF data before syncing (entity: party, exch)')
  .action(async (entity, dbfFile) => {
    if (await authenticate()) {
      await validateCommand(entity, dbfFile);
    }
  });

program
  .command('sync <entity> <dbfFile>')
  .description('Sync DBF data to database (entity: party, exch, idmaster)')
  .option('-s, --strategy <strategy>', 'Sync strategy: UPSERT, REPLACE, INSERT_ONLY', 'UPSERT')
  .option('-d, --delete-not-in-source', 'Delete records not in source', false)
  .option('-m, --match-by <field>', 'Match by field (ID, SHORT_CODE, USER_ID)', 'SHORT_CODE')
  .option('-e, --exch-match-by <field>', 'Exchange match by (ID, SHORT_CODE)', 'SHORT_CODE')
  .action(async (entity, dbfFile, options) => {
    if (await authenticate()) {
      await syncCommand(entity, dbfFile, options);
    }
  });

program
  .command('status')
  .description('Get current database sync status')
  .action(async () => {
    if (await authenticate()) {
      await statusCommand();
    }
  });

program.parse();
