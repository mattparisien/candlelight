#!/usr/bin/env node

const mongoose = require('mongoose');
const Plugin = require('../models/Plugin');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI;

// Function to generate a secure UUID-based password
async function generatePluginPassword() {
  const { v4: uuidv4 } = await import('uuid');
  // Generate two UUIDs and concatenate them for extra security
  const uuid1 = uuidv4().replace(/-/g, ''); // Remove hyphens
  const uuid2 = uuidv4().replace(/-/g, ''); // Remove hyphens
  
  // Combine and take first 28 characters (less than 30)
  return (uuid1 + uuid2).substring(0, 28);
}

async function addPasswordsToExistingPlugins() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('🔗 Connected to MongoDB\n');
    
    // Find ALL plugins to update them with new UUID passwords
    const allPlugins = await Plugin.find({});
    
    console.log(`📋 Found ${allPlugins.length} plugins to update with new UUID passwords\n`);
    
    if (allPlugins.length === 0) {
      console.log('✅ No plugins found!');
      return;
    }
    
    const passwordMap = {};
    
    for (const plugin of allPlugins) {
      const password = await generatePluginPassword();
      
      await Plugin.findByIdAndUpdate(plugin._id, { password });
      
      passwordMap[plugin.name] = password;
      
      console.log(`🔐 Updated ${plugin.displayName} (${plugin.name})`);
      console.log(`   New Password: ${password}\n`);
    }
    
    console.log('✅ All plugins now have new UUID passwords!');
    console.log('\n⚠️  IMPORTANT: Save these passwords securely - they cannot be recovered!');
    console.log('\n📋 New Password Summary:');
    console.log(''.padEnd(60, '='));
    
    for (const [pluginName, password] of Object.entries(passwordMap)) {
      console.log(`${pluginName.padEnd(20)} | ${password}`);
    }
    
  } catch (error) {
    console.error('❌ Error updating plugins:', error.message);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

if (require.main === module) {
  addPasswordsToExistingPlugins();
}
