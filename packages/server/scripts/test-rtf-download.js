#!/usr/bin/env node

const mongoose = require('mongoose');
const fs = require('fs');
const Plugin = require('../models/Plugin');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/plugin-auth';

async function testRTFDownload() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('🔗 Connected to MongoDB\n');
    
    // Find the TestPlugin we just created
    const testPlugin = await Plugin.findOne({ slug: 'test-plugin' });
    
    if (!testPlugin) {
      console.log('❌ TestPlugin not found');
      return;
    }
    
    console.log(`📋 Found plugin: ${testPlugin.displayName}`);
    console.log(`🔐 Password: ${testPlugin.password}`);
    console.log(`💾 Download field exists: ${!!testPlugin.download}`);
    
    if (testPlugin.download) {
      // Save the RTF file to disk for testing
      const rtfPath = `./test-${testPlugin.slug}-install-guide.rtf`;
      fs.writeFileSync(rtfPath, testPlugin.download);
      console.log(`📄 RTF file saved to: ${rtfPath}`);
      
      // Show the content as text for verification
      console.log('\n📝 RTF Content Preview:');
      console.log(''.padEnd(50, '-'));
      console.log(testPlugin.download.toString('utf8'));
      console.log(''.padEnd(50, '-'));
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

if (require.main === module) {
  testRTFDownload();
}
