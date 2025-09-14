#!/usr/bin/env node

/**
 * Manual Database Sync Trigger
 * Usage: node scripts/trigger-sync.js [--dry-run]
 */

const { execSync } = require('child_process');
const path = require('path');

// Load environment variables from .env.sync file
function loadEnvFromFile() {
  try {
    const envPath = path.join(__dirname, '..', '.env.sync');
    const envFile = require('fs').readFileSync(envPath, 'utf8');
    
    envFile.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
        const [key, ...valueParts] = trimmed.split('=');
        const value = valueParts.join('=');
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    });
    
    console.log('📄 Loaded environment variables from .env.sync');
  } catch (error) {
    console.log('⚠️  Could not load .env.sync file:', error.message);
  }
}

const isDryRun = process.argv.includes('--dry-run');

console.log('🚀 Triggering database sync...');
console.log(`Mode: ${isDryRun ? 'DRY RUN' : 'LIVE'}`);

try {
  // Load environment variables first
  loadEnvFromFile();
  
  // Set environment variables
  process.env.DRY_RUN = isDryRun.toString();
  
  // Check if we have required environment variables
  if (!process.env.DEV_MONGODB_URI || !process.env.PROD_MONGODB_URI) {
    console.log('⚠️  Missing MongoDB connection strings in environment');
    console.log('Required: DEV_MONGODB_URI, PROD_MONGODB_URI');
    process.exit(1);
  }
  
  // Run the sync script
  const syncScript = path.join(__dirname, 'db-sync.js');
  execSync(`node ${syncScript}`, { 
    stdio: 'inherit',
    cwd: path.dirname(__dirname)
  });
  
  console.log('✅ Sync completed successfully');
  
} catch (error) {
  console.error('❌ Sync failed:', error.message);
  process.exit(1);
}
