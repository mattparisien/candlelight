#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');

function runCommand(command, cwd = process.cwd()) {
  try {
    console.log(`🔧 Running: ${command}`);
    const result = execSync(command, { 
      cwd, 
      stdio: 'inherit',
      encoding: 'utf8'
    });
    return result;
  } catch (error) {
    console.error(`❌ Command failed: ${command}`);
    console.error(error.message);
    process.exit(1);
  }
}

async function buildForProduction() {
  console.log('🏗️ Building Plugins for Railway Deployment...\n');
  
  const rootDir = __dirname;
  const pluginsDir = path.join(rootDir, 'packages', 'plugins');
  
  // Set production environment
  process.env.NODE_ENV = 'production';
  process.env.BASE_URL = process.env.BASE_URL || 'https://your-app.railway.app';
  
  console.log(`📦 Environment: ${process.env.NODE_ENV}`);
  console.log(`🌐 Base URL: ${process.env.BASE_URL}`);
  console.log(`📁 Building from: ${pluginsDir}\n`);
  
  try {
    // Install dependencies if node_modules doesn't exist
    const nodeModulesPath = path.join(pluginsDir, 'node_modules');
    const fs = require('fs');
    
    if (!fs.existsSync(nodeModulesPath)) {
      console.log('📦 Installing plugin dependencies...');
      runCommand('npm install', pluginsDir);
    }
    
    // Build plugins
    console.log('🔨 Building plugins...');
    runCommand('npm run build', pluginsDir);
    
    // Deploy plugins to server
    console.log('🚀 Deploying plugins to server...');
    runCommand('node deploy-plugins.js', rootDir);
    
    console.log('\n✅ Production build complete!');
    console.log('📊 Build artifacts:');
    console.log('   📁 Frontend: packages/plugins/dist/');
    console.log('   📁 Server: packages/server/dist/public/');
    
  } catch (error) {
    console.error('\n❌ Build failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  buildForProduction();
}

module.exports = { buildForProduction };
