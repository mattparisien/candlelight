#!/usr/bin/env node

const mongoose = require('mongoose');
const readline = require('readline');
const { AuthorizedDomain } = require('../middleware/auth');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/plugin-auth';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
}

async function addDomain() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('🔗 Connected to MongoDB\n');
    console.log('🔐 Add / Update Authorized Domain\n');

    const rawWebsiteUrl = await askQuestion('Enter website URL (e.g., client-site.squarespace.com): ');
    const normalizedUrl = rawWebsiteUrl.toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '');

    // Check if domain already exists
    let existing = await AuthorizedDomain.findOne({ websiteUrl: normalizedUrl });

    if (existing) {
      console.log(`\nℹ️  Domain already exists: ${existing.websiteUrl}`);
      console.log(`   Current plugins: ${existing.pluginsAllowed.length ? existing.pluginsAllowed.join(', ') : '(none)'}`);

      const pluginsInput = await askQuestion('Enter plugins to ADD (comma-separated) or "all" for all (leave blank to cancel): ');
      if (!pluginsInput.trim()) {
        console.log('🚫 No plugins specified. Aborting.');
        return;
      }

      let pluginsToAdd;
      if (pluginsInput.toLowerCase().trim() === 'all') {
        pluginsToAdd = ['LayeredSections', 'MagneticButton', 'MouseFollower', 'ImageTrailer', 'BlobRevealer'];
      } else {
        pluginsToAdd = pluginsInput.split(',').map(p => p.trim()).filter(Boolean);
      }

      const merged = Array.from(new Set([...(existing.pluginsAllowed || []), ...pluginsToAdd]));
      existing.pluginsAllowed = merged;
      await existing.save();

      console.log('\n✅ Domain updated successfully!');
      console.log('📋 Updated Domain Details:');
      console.log(`   🌐 Website: ${existing.websiteUrl}`);
      console.log(`   🎨 Plugins: ${existing.pluginsAllowed.join(', ')}`);
      console.log(`   📧 Customer: ${existing.customerEmail || 'N/A'}`);
      console.log(`   🆔 ID: ${existing._id}`);
      return;
    }

    // New domain flow
    const customerEmail = await askQuestion('Enter customer email: ');
    const pluginsInput = await askQuestion('Enter allowed plugins (comma-separated) or "all" for all plugins: ');
    const notes = await askQuestion('Enter notes (optional): ');

    let pluginsAllowed;
    if (pluginsInput.toLowerCase().trim() === 'all') {
      pluginsAllowed = ['LayeredSections', 'MagneticButton', 'MouseFollower', 'ImageTrailer', 'BlobRevealer'];
    } else {
      pluginsAllowed = pluginsInput.split(',').map(p => p.trim()).filter(Boolean);
    }

    const domain = new AuthorizedDomain({
      websiteUrl: normalizedUrl,
      pluginsAllowed,
      customerEmail,
      status: 'active',
      notes: notes || undefined
    });

    await domain.save();
    console.log('\n✅ Domain added successfully!');
    console.log('📋 Domain Details:');
    console.log(`   🌐 Website: ${domain.websiteUrl}`);
    console.log(`   🎨 Plugins: ${domain.pluginsAllowed.join(', ')}`);
    console.log(`   📧 Customer: ${domain.customerEmail}`);
    console.log(`   🆔 ID: ${domain._id}`);

  } catch (error) {
    console.error('❌ Error adding/updating domain:', error.message);
  } finally {
    await mongoose.connection.close();
    rl.close();
    process.exit(0);
  }
}

async function listDomains() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('🔗 Connected to MongoDB\n');
    
    const domains = await AuthorizedDomain.find().sort({ createdAt: -1 });
    
    console.log('📋 Authorized Domains:\n');
    
    if (domains.length === 0) {
      console.log('No domains found. Add one with the "add" command.');
    } else {
      domains.forEach((domain, index) => {
        console.log(`${index + 1}. 🌐 ${domain.websiteUrl}`);
        console.log(`   📊 Status: ${domain.status}`);
        console.log(`   🎨 Plugins: ${domain.pluginsAllowed.join(', ')}`);
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

  if (!command) {
    console.log('🔐 Domain Management Tool\n');
    console.log('Usage: node manage-domains.js <command>\n');
    console.log('Commands:');
    console.log('  add  - Add a new authorized domain');
    console.log('  list - List all authorized domains\n');
    console.log('Examples:');
    console.log('  node manage-domains.js add');
    console.log('  node manage-domains.js list');
    process.exit(0);
  }

  switch (command) {
    case 'add':
      await addDomain();
      break;
    case 'list':
      await listDomains();
      break;
    default:
      console.log('❌ Unknown command. Use "add" or "list"');
      process.exit(1);
  }
}

if (require.main === module) {
  main();
}
