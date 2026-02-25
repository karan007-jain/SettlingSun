#!/usr/bin/env node

// Load environment variables
require('dotenv').config();

const axios = require('axios');

const API_URL = process.env.API_URL || 'http://localhost:3000/api/trpc';
const SYNC_API_KEY = process.env.SYNC_API_KEY || '';

async function test() {
  console.log('Testing sync.getSyncStatus endpoint...\n');
  console.log('API URL:', API_URL);
  console.log('API Key:', SYNC_API_KEY ? '✓ Set' : '✗ Not set');
  
  try {
    const url = `${API_URL}/sync.getSyncStatus`;
    console.log('Request URL:', url);
    
    const response = await axios.get(url, {
      headers: {
        'Authorization': `Bearer ${SYNC_API_KEY}`,
        'x-sync-api-key': SYNC_API_KEY,
      },
    });
    
    console.log('\n=== Full Response ===');
    console.log(JSON.stringify(response.data, null, 2));
    
    console.log('\n=== Result Data ===');
    console.log(JSON.stringify(response.data.result, null, 2));
    
    console.log('\n=== Actual Data ===');
    console.log(JSON.stringify(response.data.result.data, null, 2));
    
  } catch (error) {
    console.error('\n✗ Error:', error.message);
    if (error.response) {
      console.error('\nResponse status:', error.response.status);
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

test();
