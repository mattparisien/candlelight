#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

const PACKAGES_DIR = path.join(__dirname, 'packages');

function runCommand(command, args, cwd) {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, {
      cwd,
      stdio: 'inherit',
      shell: true
    });

    proc.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Command failed with code ${code}`));
      } else {
        resolve();
      }
    });
  });
}

async function main() {
  const command = process.argv[2];
  
  switch (command) {
    case 'dev':
      console.log('🚀 Starting development servers...');
      console.log('📦 Plugins: http://localhost:3000');
      console.log('🗄️  Server: http://localhost:3001');
      
      // Start both services concurrently
      const pluginsProc = spawn('npm', ['run', 'dev'], {
        cwd: path.join(PACKAGES_DIR, 'plugins'),
        stdio: 'inherit',
        shell: true
      });
      
      const serverProc = spawn('npm', ['run', 'dev'], {
        cwd: path.join(PACKAGES_DIR, 'server'),
        stdio: 'inherit',
        shell: true
      });
      
      // Handle cleanup
      process.on('SIGINT', () => {
        pluginsProc.kill();
        serverProc.kill();
        process.exit();
      });
      
      break;
      
    case 'build':
      console.log('🏗️  Building plugins...');
      await runCommand('npm', ['run', 'build'], path.join(PACKAGES_DIR, 'plugins'));
      console.log('✅ Build complete!');
      break;
      
    case 'deploy':
      console.log('🚀 Building and deploying plugins...');
      await runCommand('npm', ['run', 'build'], path.join(PACKAGES_DIR, 'plugins'));
      await runCommand('node', ['deploy-plugins.js'], __dirname);
      console.log('✅ Deployment complete!');
      break;
      
    case 'clean':
      console.log('🧹 Cleaning node_modules and dist directories...');
      await runCommand('rm', ['-rf', 'node_modules', 'packages/*/node_modules', 'packages/*/dist'], __dirname);
      console.log('✅ Clean complete!');
      break;
      
    case 'install':
      console.log('📦 Installing dependencies for all workspaces...');
      await runCommand('npm', ['install'], __dirname);
      console.log('✅ Installation complete!');
      break;
      
    default:
      console.log(`
🏗️  Squarespace Plugins Monorepo Development CLI

Available commands:
  dev      - Start both plugins and server in development mode
  build    - Build plugins for production
  deploy   - Build plugins and deploy to server
  clean    - Remove all node_modules and dist directories
  install  - Install dependencies for all workspaces

Usage:
  node dev.js <command>
  
Examples:
  node dev.js dev
  node dev.js build
  node dev.js deploy
  node dev.js clean
      `);
  }
}

main().catch(console.error);
