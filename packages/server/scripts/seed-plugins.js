#!/usr/bin/env node

const mongoose = require('mongoose');
const Plugin = require('../models/Plugin');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/plugin-auth';

const plugins = [
    {
        name: 'MouseFollower',
        slug: 'mouse-follower',
        displayName: 'Mouse Follower',
        description: 'Interactive canvas element that follows mouse movements',
        bundlePath: '/plugins/mouse-follower/bundle.js',
        treeConfig: {
            element: "canvas",
            appendTo: "body"
        },
        isActive: true,
        supportedPlatforms: ['desktop'],
        squarespaceVersions: ['7.1']
    },
    {
        name: 'MagneticButton',
        slug: 'magnetic-button',
        displayName: 'Magnetic Button',
        description: 'Button with magnetic hover effects',
        bundlePath: '/plugins/magnetic-button/bundle.js',
        treeConfig: "button", // HTML selector string
        isActive: true,
        supportedPlatforms: ['desktop', 'mobile'],
        squarespaceVersions: ['7.1']
    },
    {
        name: 'LayeredSections',
        slug: 'layered-sections',
        displayName: 'Layered Sections',
        description: 'Multi-layered section effects',
        bundlePath: '/plugins/layered-sections/bundle.js',
        treeConfig: null, // Will use default HTML_SELECTOR_MAP
        isActive: true,
        supportedPlatforms: ['desktop'],
        squarespaceVersions: ['7.1']
    },
    {
        name: 'ImageTrailer',
        slug: 'image-trailer',
        displayName: 'Image Trailer',
        description: 'Trailing image effects on mouse movement',
        bundlePath: '/plugins/image-trailer/bundle.js',
        treeConfig: "section", // HTML selector
        isActive: true,
        supportedPlatforms: ['desktop'],
        squarespaceVersions: ['7.1']
    },
    {
        name: 'BlobRevealer',
        slug: 'blob-revealer',
        displayName: 'Blob Revealer',
        description: 'Organic blob reveal animations',
        bundlePath: '/plugins/blob-revealer/bundle.js',
        treeConfig: null, // Will use default behavior
        isActive: true,
        supportedPlatforms: ['desktop', 'mobile'],
        squarespaceVersions: ['7.1']
    }
];

async function seedPlugins() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('🔗 Connected to MongoDB\n');
    
    console.log('🔌 Seeding Plugin Collection...\n');
    
    for (const pluginData of plugins) {
      const existing = await Plugin.findOne({ name: pluginData.name });
      
      if (existing) {
        console.log(`⚡ Plugin "${pluginData.name}" already exists, updating...`);
        await Plugin.findOneAndUpdate(
          { name: pluginData.name },
          pluginData,
          { new: true }
        );
        console.log(`   ✅ Updated: ${pluginData.displayName}`);
      } else {
        const plugin = new Plugin(pluginData);
        await plugin.save();
        console.log(`   ✨ Created: ${pluginData.displayName} (ID: ${plugin._id})`);
      }
    }
    
    console.log('\n🎉 Plugin seeding completed!');
    console.log('\n📋 All Plugins:');
    
    const allPlugins = await Plugin.find().sort({ name: 1 });
    allPlugins.forEach(plugin => {
      console.log(`   🔌 ${plugin.displayName} (${plugin.name}) - ID: ${plugin._id}`);
    });
    
  } catch (error) {
    console.error('❌ Error seeding plugins:', error);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

if (require.main === module) {
  seedPlugins();
}
