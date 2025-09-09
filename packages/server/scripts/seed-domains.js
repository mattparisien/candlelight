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

const sampleDomains = [
    {
        websiteUrl: 'matthew-parisien.squarespace.com',
        status: 'active',
        customerEmail: 'matt@example.com',
        purchaseDate: new Date('2025-09-05'),
        pluginNames: ['MouseFollower', 'MagneticButton', 'LayeredSections']
    },
    {
        websiteUrl: 'roadrunner-piano-gdlc.squarespace.com', 
        status: 'active',
        customerEmail: 'customer@example.com',
        purchaseDate: new Date('2025-09-05'),
        pluginNames: ['ImageTrailer', 'BlobRevealer']
    },
    {
        websiteUrl: 'demo-site.squarespace.com',
        status: 'active', 
        customerEmail: 'demo@example.com',
        purchaseDate: new Date('2025-09-09'),
        pluginNames: ['MouseFollower', 'MagneticButton', 'ImageTrailer', 'BlobRevealer', 'LayeredSections']
    }
];

async function seedDomains() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('🔗 Connected to MongoDB\n');

        // Get all plugins to map names to ObjectIds
        const plugins = await Plugin.find({});
        const pluginMap = {};
        plugins.forEach(plugin => {
            pluginMap[plugin.name] = plugin._id;
        });

        console.log('📋 Available plugins:');
        plugins.forEach(plugin => {
            console.log(`   🔌 ${plugin.displayName} (${plugin.name})`);
        });

        console.log('\n🌐 Seeding Authorized Domains...\n');

        for (const domainData of sampleDomains) {
            // Map plugin names to ObjectIds
            const pluginIds = domainData.pluginNames
                .map(name => pluginMap[name])
                .filter(id => id); // Remove any undefined IDs

            const domain = new AuthorizedDomain({
                websiteUrl: domainData.websiteUrl,
                status: domainData.status,
                customerEmail: domainData.customerEmail,
                purchaseDate: domainData.purchaseDate,
                pluginsAllowed: pluginIds
            });

            const savedDomain = await domain.save();
            
            const pluginNames = domainData.pluginNames.join(', ');
            console.log(`   ✅ Created: ${savedDomain.websiteUrl}`);
            console.log(`      📧 Email: ${savedDomain.customerEmail}`);
            console.log(`      🔌 Plugins: ${pluginNames}`);
            console.log(`      🆔 ID: ${savedDomain._id}`);
            console.log('');
        }

        console.log('🎉 Domain seeding completed!\n');

        // Show summary
        const totalDomains = await AuthorizedDomain.countDocuments();
        console.log(`📊 Total domains in database: ${totalDomains}`);

    } catch (error) {
        console.error('❌ Seeding error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

seedDomains();
