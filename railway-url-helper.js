#!/usr/bin/env node

const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('🔍 Railway URL Configuration Helper\n');

console.log('After deploying to Railway, you need to update your BASE_URL environment variable.');
console.log('Here\'s how to find your Railway app URL:\n');

console.log('📋 Steps:');
console.log('1. Go to https://railway.app and log into your account');
console.log('2. Click on your project');
console.log('3. Go to the "Deployments" tab');
console.log('4. Look for a URL like: https://your-project-production.up.railway.app');
console.log('5. Copy this URL\n');

rl.question('Enter your Railway app URL (e.g., https://your-project-production.up.railway.app): ', (url) => {
  if (!url || !url.startsWith('https://')) {
    console.log('❌ Please enter a valid HTTPS URL');
    rl.close();
    return;
  }

  console.log('\n✅ Great! Now update your Railway environment variables:');
  console.log('\n📋 In Railway Dashboard > Settings > Environment:');
  console.log(`BASE_URL=${url}`);
  
  console.log('\n🔄 Railway will automatically redeploy with the new URL.');
  console.log('\n🎯 Your services will be available at:');
  console.log(`   📡 API Health Check: ${url}/health`);
  console.log(`   🎨 Plugin Files: ${url}/plugins/`);
  console.log(`   📋 Deployment Info: ${url}/plugins/manifest`);
  
  console.log('\n💡 Pro tip: You can also set up a custom domain in Railway > Settings > Domains');
  
  rl.close();
});

rl.on('close', () => {
  console.log('\n🚀 Happy deploying!');
});
