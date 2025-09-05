#!/usr/bin/env node

const mongoose = require('mongoose');
const { AuthorizedDomain } = require('../middleware/auth');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/plugin-auth';

async function addDomain() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');
    
    const domain = new AuthorizedDomain({
      websiteUrl: 'example.squarespace.com',
      pluginsAllowed: ['MouseFollower', 'LayeredSections'],
      customerEmail: 'customer@example.com',
      status: 'active',
      notes: 'Test domain - added via script'
    });
    
    await domain.save();
    console.log('Domain added successfully:', domain);
    
  } catch (error) {
    console.error('Error adding domain:', error);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

async function listDomains() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');
    
    const domains = await AuthorizedDomain.find().sort({ createdAt: -1 });
    
    console.log('\n=== Authorized Domains ===');
    domains.forEach((domain, index) => {
      console.log(`\n${index + 1}. ${domain.websiteUrl}`);
      console.log(`   Status: ${domain.status}`);
      console.log(`   Plugins: ${domain.pluginsAllowed.join(', ')}`);
      console.log(`   Email: ${domain.customerEmail || 'N/A'}`);
      console.log(`   Created: ${domain.createdAt.toLocaleDateString()}`);
      if (domain.expiresAt) {
        console.log(`   Expires: ${domain.expiresAt.toLocaleDateString()}`);
      }
    });
    
  } catch (error) {
    console.error('Error listing domains:', error);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

// Command line interface
const command = process.argv[2];

switch (command) {
  case 'add':
    addDomain();
    break;
  case 'list':
    listDomains();
    break;
  default:
    console.log('Usage:');
    console.log('  node scripts/manage-domains.js add    - Add a test domain');
    console.log('  node scripts/manage-domains.js list   - List all domains');
    process.exit(1);
}
