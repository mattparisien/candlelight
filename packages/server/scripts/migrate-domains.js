#!/usr/bin/env node

require('dotenv').config();
const mongoose = require('mongoose');
const AuthorizedDomain = require('../models/AuthorizedDomain');
const Plugin = require('../models/Plugin');

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI not found in environment variables');
    process.exit(1);
}

async function migrateDomains() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('🔗 Connected to MongoDB\n');

        // Get all plugins
        const plugins = await Plugin.find({ isActive: true });
        console.log(`📋 Found ${plugins.length} active plugins:`);
        plugins.forEach(plugin => {
            console.log(`   🔌 ${plugin.displayName} (ID: ${plugin._id})`);
        });

        // Get all domains that don't have pluginsAllowed set or have empty array
        const domains = await AuthorizedDomain.find({
            $or: [
                { pluginsAllowed: { $exists: false } },
                { pluginsAllowed: null },
                { pluginsAllowed: { $size: 0 } }
            ]
        });

        if (domains.length === 0) {
            console.log('\n✅ All domains already have plugins configured');
            return;
        }

        console.log(`\n🔄 Found ${domains.length} domains that need plugin migration:`);
        
        for (const domain of domains) {
            console.log(`\n🌐 Migrating: ${domain.websiteUrl}`);
            
            // For now, let's assign all plugins to existing domains
            // In production, you might want to be more selective
            const allPluginIds = plugins.map(p => p._id);
            
            await AuthorizedDomain.findByIdAndUpdate(
                domain._id,
                { pluginsAllowed: allPluginIds },
                { new: true }
            );
            
            console.log(`   ✅ Assigned ${allPluginIds.length} plugins`);
        }

        console.log('\n🎉 Domain migration completed!');

    } catch (error) {
        console.error('❌ Migration error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

// Handle command line arguments
const command = process.argv[2];

if (command === 'help' || command === '--help' || command === '-h') {
    console.log(`
🔧 Domain Migration Script

This script migrates existing domains to use Plugin ObjectIds instead of string arrays.

Usage:
  node migrate-domains.js              # Migrate all domains without plugins
  node migrate-domains.js --dry-run    # Show what would be migrated (coming soon)
  node migrate-domains.js --help       # Show this help

⚠️  This will assign ALL active plugins to domains that don't have any plugins configured.
    You may want to customize this behavior for your specific use case.
    `);
    process.exit(0);
}

migrateDomains();
