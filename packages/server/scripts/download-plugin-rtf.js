#!/usr/bin/env node

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const Plugin = require('../models/Plugin');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/plugin-auth';

// Function to generate RTF install guide (same as in createPlugin.js)
function generateInstallGuideRTF(displayName, slug, password) {
  const rtfContent = `{\\rtf1\\ansi\\deff0 {\\fonttbl {\\f0 Times New Roman;}}
\\f0\\fs24\\qc\\b ${displayName} by Candlelight Plugins\\b0\\par
\\par
\\b Plugin Install Guide:\\b0\\par
{\\field{\\*\\fldinst HYPERLINK "https://candlelightplugins.com/${slug}"}{\\fldrslt https://candlelightplugins.com/${slug}}}\\par
\\par
\\b Password:\\b0\\par
${password}\\par
\\par
\\b Happy designing and coding!\\b0\\par
\\par
\\b The Candlelight Plugins Team\\b0\\par
}`;
  
  return Buffer.from(rtfContent, 'utf8');
}

// Helper function to create directory if it doesn't exist
function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`📁 Created directory: ${dir}`);
  }
}

// Function to create readline interface
function createReadlineInterface() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
}

// Function to prompt user for plugin selection
function promptUser(question) {
  const rl = createReadlineInterface();
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function downloadPluginRTF() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('🔗 Connected to MongoDB\n');
    
    // Get all plugins
    const allPlugins = await Plugin.find({}).sort({ displayName: 1 });
    
    if (allPlugins.length === 0) {
      console.log('❌ No plugins found in database');
      return;
    }
    
    console.log('📋 Available plugins:');
    console.log(''.padEnd(50, '='));
    allPlugins.forEach((plugin, index) => {
      console.log(`${(index + 1).toString().padStart(2)}. ${plugin.displayName} (${plugin.slug})`);
    });
    console.log(''.padEnd(50, '='));
    
    const choice = await promptUser('\n🔌 Enter plugin number (or "all" for all plugins): ');
    
    let pluginsToProcess = [];
    
    if (choice.toLowerCase() === 'all') {
      pluginsToProcess = allPlugins;
      console.log('\n🚀 Processing all plugins...\n');
    } else {
      const pluginIndex = parseInt(choice) - 1;
      if (pluginIndex >= 0 && pluginIndex < allPlugins.length) {
        pluginsToProcess = [allPlugins[pluginIndex]];
      } else {
        console.log('❌ Invalid plugin number');
        return;
      }
    }
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const plugin of pluginsToProcess) {
      try {
        console.log(`🔄 Processing: ${plugin.displayName} (${plugin.slug})`);
        
        // Generate RTF content
        const installGuideRTF = generateInstallGuideRTF(plugin.displayName, plugin.slug, plugin.password);
        
        // Determine plugin directory path
        const pluginDir = path.join(__dirname, '../../plugins/src/plugins', plugin.name);
        const downloadsDir = path.join(pluginDir, 'assets', 'downloads');
        const rtfFilePath = path.join(downloadsDir, `${plugin.slug}-install-guide.rtf`);
        
        // Check if plugin directory exists
        if (!fs.existsSync(pluginDir)) {
          console.log(`   ⚠️  Plugin directory not found: ${pluginDir}`);
          console.log(`   📁 Creating directory structure...`);
          
          // Create the full directory structure
          ensureDir(pluginDir);
          ensureDir(path.join(pluginDir, 'assets'));
        }
        
        // Ensure downloads directory exists
        ensureDir(downloadsDir);
        
        // Check if RTF file already exists
        const fileExists = fs.existsSync(rtfFilePath);
        if (fileExists) {
          console.log(`   🔄 Overriding existing RTF file`);
        }
        
        // Write RTF file
        fs.writeFileSync(rtfFilePath, installGuideRTF);
        console.log(`   ✅ RTF file ${fileExists ? 'updated' : 'created'}: ${rtfFilePath}`);
        
        // Update database with RTF data if it doesn't exist
        if (!plugin.download) {
          await Plugin.findByIdAndUpdate(plugin._id, { 
            download: installGuideRTF 
          });
          console.log(`   💾 Updated database with RTF data`);
        }
        
        successCount++;
        
      } catch (error) {
        console.error(`   ❌ Error processing ${plugin.displayName}: ${error.message}`);
        errorCount++;
      }
      
      console.log(''); // Empty line for spacing
    }
    
    console.log('📊 Summary:');
    console.log(`   ✅ Successfully processed: ${successCount} plugins`);
    if (errorCount > 0) {
      console.log(`   ❌ Errors encountered: ${errorCount} plugins`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

if (require.main === module) {
  downloadPluginRTF();
}
