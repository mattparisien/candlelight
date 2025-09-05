#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function checkFile(filepath, description) {
  const fullPath = path.join(__dirname, filepath);
  const exists = fs.existsSync(fullPath);
  console.log(`${exists ? '✅' : '❌'} ${description}: ${filepath}`);
  return exists;
}

function checkPackageJson(packagePath) {
  try {
    const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    return pkg;
  } catch (error) {
    return null;
  }
}

console.log('🔍 Monorepo Structure Verification\n');

// Check root files
console.log('📁 Root Configuration:');
checkFile('package.json', 'Root package.json');
checkFile('README.md', 'README.md');
checkFile('.gitignore', 'Git ignore file');
checkFile('docker-compose.yml', 'Docker Compose config');
checkFile('dev.js', 'Development script');
checkFile('sqsp-plugins.code-workspace', 'VS Code workspace');

// Check packages structure
console.log('\n📦 Packages Structure:');
checkFile('packages', 'Packages directory');
checkFile('packages/plugins', 'Plugins package');
checkFile('packages/server', 'Server package');

// Check plugin files
console.log('\n🎨 Plugin Package:');
checkFile('packages/plugins/package.json', 'Plugins package.json');
checkFile('packages/plugins/webpack.config.js', 'Webpack config');
checkFile('packages/plugins/tsconfig.json', 'TypeScript config');
checkFile('packages/plugins/src', 'Source directory');
checkFile('packages/plugins/src/plugins', 'Plugins source');

// Check server files
console.log('\n🗄️ Server Package:');
checkFile('packages/server/package.json', 'Server package.json');
checkFile('packages/server/server.js', 'Server main file');
checkFile('packages/server/Dockerfile', 'Server Dockerfile');

// Verify workspace configuration
console.log('\n⚙️ Workspace Configuration:');
const rootPkg = checkPackageJson('package.json');
if (rootPkg && rootPkg.workspaces) {
  console.log('✅ NPM workspaces configured');
  console.log('   Workspaces:', rootPkg.workspaces.join(', '));
} else {
  console.log('❌ NPM workspaces not configured');
}

// Check plugin packages
const pluginsPkg = checkPackageJson('packages/plugins/package.json');
const serverPkg = checkPackageJson('packages/server/package.json');

if (pluginsPkg) {
  console.log(`✅ Plugins package: ${pluginsPkg.name}@${pluginsPkg.version}`);
}

if (serverPkg) {
  console.log(`✅ Server package: ${serverPkg.name}@${serverPkg.version}`);
}

console.log('\n🚀 Next Steps:');
console.log('1. Run: npm install');
console.log('2. Run: npm run dev (or node dev.js dev)');
console.log('3. Open browser at http://localhost:3000 for plugins');
console.log('4. Server will be available at http://localhost:3001');

console.log('\n📚 Available Commands:');
console.log('• npm run dev - Start development servers');
console.log('• npm run build - Build plugins for production'); 
console.log('• npm run clean - Clean all dependencies');
console.log('• node dev.js <command> - Use development CLI');
