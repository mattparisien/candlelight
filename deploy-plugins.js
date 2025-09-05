#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Paths
const pluginsDistPath = path.join(__dirname, 'packages', 'plugins', 'dist');
const serverDistPath = path.join(__dirname, 'packages', 'server', 'dist');
const pluginsStaticPath = path.join(serverDistPath, 'public');

function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`📁 Created directory: ${path.relative(__dirname, dirPath)}`);
  }
}

function copyDirectory(src, dest) {
  ensureDirectoryExists(dest);
  
  const entries = fs.readdirSync(src, { withFileTypes: true });
  let copiedFiles = 0;
  
  for (let entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      copyDirectory(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
      copiedFiles++;
      console.log(`📄 Copied: ${entry.name}`);
    }
  }
  
  return copiedFiles;
}

function getDirectorySize(dirPath) {
  if (!fs.existsSync(dirPath)) return 0;
  
  let size = 0;
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  
  for (let entry of entries) {
    const entryPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      size += getDirectorySize(entryPath);
    } else {
      size += fs.statSync(entryPath).size;
    }
  }
  
  return size;
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

async function deployPlugins() {
  console.log('🚀 Deploying Plugins to Server...\n');
  
  // Check if plugins dist exists
  if (!fs.existsSync(pluginsDistPath)) {
    console.log('❌ Plugins dist folder not found!');
    console.log('   Run: npm run build:plugins first');
    process.exit(1);
  }
  
  // Get source info
  const sourceSize = getDirectorySize(pluginsDistPath);
  console.log(`📊 Source: ${path.relative(__dirname, pluginsDistPath)} (${formatBytes(sourceSize)})`);
  
  try {
    // Ensure server dist directory exists
    ensureDirectoryExists(serverDistPath);
    
    // Clean existing public folder if it exists
    if (fs.existsSync(pluginsStaticPath)) {
      fs.rmSync(pluginsStaticPath, { recursive: true, force: true });
      console.log('🧹 Cleaned existing public folder');
    }
    
    // Copy plugins dist to server/dist/public
    console.log('\n📦 Copying files...');
    const copiedFiles = copyDirectory(pluginsDistPath, pluginsStaticPath);
    
    // Get destination info
    const destSize = getDirectorySize(pluginsStaticPath);
    
    console.log('\n✅ Deployment Complete!');
    console.log(`📁 Destination: ${path.relative(__dirname, pluginsStaticPath)}`);
    console.log(`📊 Files copied: ${copiedFiles}`);
    console.log(`📦 Total size: ${formatBytes(destSize)}`);
    
    // Create a deployment manifest
    const manifest = {
      deployedAt: new Date().toISOString(),
      sourceDir: path.relative(__dirname, pluginsDistPath),
      destinationDir: path.relative(__dirname, pluginsStaticPath),
      filesCopied: copiedFiles,
      totalSize: destSize,
      formattedSize: formatBytes(destSize)
    };
    
    const manifestPath = path.join(pluginsStaticPath, 'deployment-manifest.json');
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    console.log(`📋 Created deployment manifest: ${path.relative(__dirname, manifestPath)}`);
    
  } catch (error) {
    console.error('❌ Deployment failed:', error.message);
    process.exit(1);
  }
}

// Check if running as script
if (require.main === module) {
  deployPlugins().catch(console.error);
}

module.exports = { deployPlugins };
