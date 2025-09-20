#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Use dynamic import for node-fetch
async function getFetch() {
  const { default: fetch } = await import('node-fetch');
  return fetch;
}

// Helper function to convert plugin name to various formats
function formatPluginName(name) {
  // Convert to PascalCase (PluginName)
  const pascalCase = name.replace(/[-_\s]+(.)?/g, (_, c) => c ? c.toUpperCase() : '')
    .replace(/^(.)/, c => c.toUpperCase());

  // Convert to kebab-case (plugin-name)
  const kebabCase = name.replace(/([A-Z])/g, '-$1')
    .toLowerCase()
    .replace(/^-/, '')
    .replace(/[-_\s]+/g, '-');

  return { pascalCase, kebabCase };
}

// Helper to recursively delete a directory
function deleteDirRecursive(dirPath) {
  if (fs.existsSync(dirPath)) {
    fs.rmSync(dirPath, { recursive: true, force: true });
    console.log(`🗑️ Deleted directory: ${dirPath}`);
  } else {
    console.log(`⚠️ Directory not found: ${dirPath}`);
  }
}

// Function to delete plugin from MongoDB
async function deletePluginFromMongoDB(slug) {
  try {
    const fetch = await getFetch();
    const response = await fetch(`http://localhost:3001/admin/plugins/${slug}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log('✅ Plugin deleted from MongoDB:', result.plugin.displayName || slug);
    return result.plugin;
  } catch (error) {
    console.error('❌ Failed to delete plugin in MongoDB:', error.message);
    console.log('💡 Make sure the server is running on http://localhost:3001');
    throw error;
  }
}

// Main function
async function deletePlugin() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  try {
    // Get plugin name from user
    const pluginName = await new Promise((resolve) => {
      rl.question('🗑️ Enter the plugin name to delete (e.g., "MyAwesome Plugin", "scroll-reveal"): ', resolve);
    });

    if (!pluginName.trim()) {
      console.log('❌ Plugin name is required!');
      process.exit(1);
    }

    const { pascalCase, kebabCase } = formatPluginName(pluginName);

    // Delete local plugin directory
    const pluginsDir = path.join(__dirname, '../src/plugins');
    const pluginDir = path.join(pluginsDir, pascalCase);
    deleteDirRecursive(pluginDir);

    // Delete from MongoDB
    console.log('\n📡 Deleting plugin from MongoDB...');
    await deletePluginFromMongoDB(kebabCase);

    console.log(`\n✅ Plugin "${pascalCase}" deleted successfully!`);
    console.log('   All local files and MongoDB entry removed.');
  } catch (error) {
    console.error('❌ Error deleting plugin:', error.message);
    process.exit(1);
  } finally {
    rl.close();
  }
}

// Run the script
deletePlugin();
