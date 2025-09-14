#!/usr/bin/env node

const mongoose = require('mongoose');
const readline = require('readline');
const path = require('path');
const AuthorizedDomain = require('../models/AuthorizedDomain');
const Setting = require('../models/Setting');
const Plugin = require('../models/Plugin');
require('dotenv').config();

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
  } catch (error) {
    console.log('⚠️  Could not load .env.sync file:', error.message);
  }
}

// Parse environment flag from command line arguments
function parseEnvironment() {
  const envArg = process.argv.find(arg => arg.startsWith('--env='));
  const environment = envArg ? envArg.split('=')[1] : 'dev';
  
  // Validate environment
  if (!['dev', 'prod'].includes(environment)) {
    console.error('❌ Invalid environment. Use --env=dev or --env=prod');
    process.exit(1);
  }
  
  return environment;
}

// Get MongoDB URI based on environment
function getMongoURI(environment) {
  loadEnvFromFile();
  
  const envKey = environment === 'prod' ? 'PROD_MONGODB_URI' : 'DEV_MONGODB_URI';
  const mongoUri = process.env[envKey] || process.env.MONGODB_URI;
  
  if (!mongoUri) {
    console.error(`❌ MongoDB URI not found for environment: ${environment}`);
    console.error(`   Expected environment variable: ${envKey}`);
    process.exit(1);
  }
  
  return mongoUri;
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
}

async function addDomain(environment) {
  try {
    const mongoUri = getMongoURI(environment);
    await mongoose.connect(mongoUri);
    console.log(`🔗 Connected to MongoDB (${environment.toUpperCase()} environment)\n`);
    
    // Ensure collections exist (creates them if they don't exist)
    await AuthorizedDomain.createCollection().catch(() => {}); // Ignore error if collection exists
    await Setting.createCollection().catch(() => {}); // Ignore error if collection exists
    await Plugin.createCollection().catch(() => {}); // Ignore error if collection exists
    
    console.log('🔐 Add / Update Authorized Domain\n');

    const rawWebsiteUrl = await askQuestion('Enter website URL (e.g., client-site.squarespace.com): ');
    const normalizedUrl = rawWebsiteUrl.toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '');

    // Check if domain already exists
    let existing = await AuthorizedDomain.findOne({ websiteUrl: normalizedUrl }).populate('pluginsAllowed');

    if (existing) {
      const currentPluginNames = existing.pluginsAllowed.map(p => p.displayName).join(', ') || '(none)';
      console.log(`\nℹ️  Domain already exists: ${existing.websiteUrl}`);
      console.log(`   Current plugins: ${currentPluginNames}`);

      // Show available plugins
      const availablePlugins = await Plugin.find({ isActive: true }).sort({ displayName: 1 });
      console.log('\n📋 Available plugins:');
      availablePlugins.forEach((plugin, index) => {
        console.log(`   ${index + 1}. ${plugin.displayName} (${plugin.name})`);
      });

      const pluginsInput = await askQuestion('\nEnter plugins to ADD (comma-separated names/numbers) or "all" for all (leave blank to cancel): ');
      if (!pluginsInput.trim()) {
        console.log('🚫 No plugins specified. Aborting.');
        return;
      }

      let pluginsToAdd = [];
      if (pluginsInput.toLowerCase().trim() === 'all') {
        pluginsToAdd = availablePlugins.map(p => p._id);
      } else {
        const inputs = pluginsInput.split(',').map(p => p.trim()).filter(Boolean);
        for (const input of inputs) {
          // Check if it's a number (index)
          const index = parseInt(input) - 1;
          if (!isNaN(index) && index >= 0 && index < availablePlugins.length) {
            pluginsToAdd.push(availablePlugins[index]._id);
          } else {
            // Try to find by name
            const plugin = availablePlugins.find(p => 
              p.name.toLowerCase() === input.toLowerCase() || 
              p.displayName.toLowerCase() === input.toLowerCase()
            );
            if (plugin) {
              pluginsToAdd.push(plugin._id);
            } else {
              console.log(`   ⚠️  Plugin "${input}" not found, skipping...`);
            }
          }
        }
      }

      if (pluginsToAdd.length === 0) {
        console.log('🚫 No valid plugins specified. Aborting.');
        return;
      }

      // Merge with existing (avoid duplicates)
      const currentIds = existing.pluginsAllowed.map(p => p._id.toString());
      const newIds = pluginsToAdd.map(id => id.toString()).filter(id => !currentIds.includes(id));
      
      if (newIds.length === 0) {
        console.log('ℹ️  All specified plugins are already assigned to this domain.');
        return;
      }

      existing.pluginsAllowed.push(...newIds.map(id => new mongoose.Types.ObjectId(id)));
      await existing.save();

      // Reload to show updated info
      const updated = await AuthorizedDomain.findById(existing._id).populate('pluginsAllowed');
      console.log('\n✅ Domain updated successfully!');
      console.log('📋 Updated Domain Details:');
      console.log(`   🌐 Website: ${updated.websiteUrl}`);
      console.log(`   🎨 Plugins: ${updated.pluginsAllowed.map(p => p.displayName).join(', ')}`);
      console.log(`   📧 Customer: ${updated.customerEmail || 'N/A'}`);
      console.log(`   🆔 ID: ${updated._id}`);
      return;
    }

    // New domain flow
    const customerEmail = await askQuestion('Enter customer email: ');
    
    // Show available plugins
    const availablePlugins = await Plugin.find({ isActive: true }).sort({ displayName: 1 });
    console.log('\n📋 Available plugins:');
    availablePlugins.forEach((plugin, index) => {
      console.log(`   ${index + 1}. ${plugin.displayName} (${plugin.name})`);
    });
    
    const pluginsInput = await askQuestion('\nEnter allowed plugins (comma-separated names/numbers) or "all" for all plugins: ');
    const notes = await askQuestion('Enter notes (optional): ');

    let pluginsAllowed = [];
    if (pluginsInput.toLowerCase().trim() === 'all') {
      pluginsAllowed = availablePlugins.map(p => p._id);
    } else {
      const inputs = pluginsInput.split(',').map(p => p.trim()).filter(Boolean);
      for (const input of inputs) {
        // Check if it's a number (index)
        const index = parseInt(input) - 1;
        if (!isNaN(index) && index >= 0 && index < availablePlugins.length) {
          pluginsAllowed.push(availablePlugins[index]._id);
        } else {
          // Try to find by name
          const plugin = availablePlugins.find(p => 
            p.name.toLowerCase() === input.toLowerCase() || 
            p.displayName.toLowerCase() === input.toLowerCase()
          );
          if (plugin) {
            pluginsAllowed.push(plugin._id);
          } else {
            console.log(`   ⚠️  Plugin "${input}" not found, skipping...`);
          }
        }
      }
    }

    const domain = new AuthorizedDomain({
      websiteUrl: normalizedUrl,
      pluginsAllowed,
      customerEmail,
      status: 'active',
      notes: notes || undefined
    });

    await domain.save();
    
    // Reload to show plugin names
    const created = await AuthorizedDomain.findById(domain._id).populate('pluginsAllowed');
    console.log('\n✅ Domain added successfully!');
    console.log('📋 Domain Details:');
    console.log(`   🌐 Website: ${created.websiteUrl}`);
    console.log(`   🎨 Plugins: ${created.pluginsAllowed.map(p => p.displayName).join(', ')}`);
    console.log(`   📧 Customer: ${created.customerEmail}`);
    console.log(`   🆔 ID: ${created._id}`);

  } catch (error) {
    console.error('❌ Error adding/updating domain:', error.message);
  } finally {
    await mongoose.connection.close();
    rl.close();
    process.exit(0);
  }
}

async function listDomains(environment) {
  try {
    const mongoUri = getMongoURI(environment);
    await mongoose.connect(mongoUri);
    console.log(`🔗 Connected to MongoDB (${environment.toUpperCase()} environment)\n`);
    
    // Ensure collections exist (creates them if they don't exist)
    await AuthorizedDomain.createCollection().catch(() => {}); // Ignore error if collection exists
    await Setting.createCollection().catch(() => {}); // Ignore error if collection exists
    await Plugin.createCollection().catch(() => {}); // Ignore error if collection exists
    
    const domains = await AuthorizedDomain.find().populate('pluginsAllowed').sort({ createdAt: -1 });
    
    console.log('📋 Authorized Domains:\n');
    
    if (domains.length === 0) {
      console.log('No domains found. Add one with the "add" command.');
    } else {
      domains.forEach((domain, index) => {
        console.log(`${index + 1}. 🌐 ${domain.websiteUrl}`);
        console.log(`   📊 Status: ${domain.status}`);
        
        if (domain.pluginsAllowed && domain.pluginsAllowed.length > 0) {
          console.log(`   🎨 Plugins: ${domain.pluginsAllowed.map(p => p.displayName || p.name).join(', ')}`);
        } else {
          console.log(`   🎨 Plugins: (none - please update to assign plugins)`);
        }
        
        console.log(`   📧 Email: ${domain.customerEmail || 'N/A'}`);
        console.log(`   📅 Created: ${domain.createdAt.toLocaleDateString()}`);
        if (domain.expiresAt) {
          console.log(`   ⏰ Expires: ${domain.expiresAt.toLocaleDateString()}`);
        }
        if (domain.notes) {
          console.log(`   📝 Notes: ${domain.notes}`);
        }
        console.log(`   🆔 ID: ${domain._id}\n`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error fetching domains:', error.message);
  } finally {
    await mongoose.connection.close();
    rl.close();
    process.exit(0);
  }
}

// Command line interface
async function main() {
  const command = process.argv[2];
  const environment = parseEnvironment();

  if (!command) {
    console.log('🔐 Domain Management Tool\n');
    console.log('Usage: node manage-domains.js <command> [--env=<environment>]\n');
    console.log('Commands:');
    console.log('  add  - Add a new authorized domain');
    console.log('  list - List all authorized domains\n');
    console.log('Environment Options:');
    console.log('  --env=dev  - Use development database (default)');
    console.log('  --env=prod - Use production database\n');
    console.log('Examples:');
    console.log('  node manage-domains.js add --env=dev');
    console.log('  node manage-domains.js add --env=prod');
    console.log('  node manage-domains.js list --env=dev');
    process.exit(0);
  }

  console.log(`🌍 Environment: ${environment.toUpperCase()}`);

  switch (command) {
    case 'add':
      await addDomain(environment);
      break;
    case 'list':
      await listDomains(environment);
      break;
    default:
      console.log('❌ Unknown command. Use "add" or "list"');
      process.exit(1);
  }
}

if (require.main === module) {
  main();
}
