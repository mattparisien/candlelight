#!/usr/bin/env node

const readline = require('readline');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const Plugin = require('../models/Plugin');

const MONGODB_URI = process.env.MONGODB_URI;

function toSlug(str) {
  return String(str)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // remove invalid
    .replace(/\s+/g, '-') // spaces to dashes
    .replace(/-+/g, '-'); // collapse dashes
}

async function connect() {
  if (!MONGODB_URI) {
    throw new Error('Missing MONGODB_URI in environment');
  }
  await mongoose.connect(MONGODB_URI);
}

async function activateOne(identifier) {
  // Try name match first, then slug match (accept both inputs)
  const slug = toSlug(identifier);
  const updated = await Plugin.findOneAndUpdate(
    { $or: [{ name: identifier }, { slug }] },
    { isActive: true },
    { new: true }
  );
  return updated;
}

async function activateMany(names) {
  const results = [];
  for (const name of names) {
    const n = name.trim();
    if (!n) continue;
    try {
      const doc = await activateOne(n);
      if (doc) {
        results.push({ name: n, status: 'activated', id: doc._id, slug: doc.slug });
        console.log(`✅ Activated: ${doc.displayName} (${doc.name}) [slug: ${doc.slug}]`);
      } else {
        results.push({ name: n, status: 'not-found' });
        console.log(`⚠️  Not found: ${n}`);
      }
    } catch (err) {
      results.push({ name: n, status: 'error', error: err.message });
      console.error(`❌ Error activating ${n}:`, err.message);
    }
  }
  return results;
}

async function main(inputNames) {
  try {
    await connect();
    console.log('🔗 Connected to MongoDB');

    if (!inputNames || inputNames.length === 0) {
      inputNames = await promptForNames();
    }

    if (!inputNames || inputNames.length === 0) {
      console.log('No plugin names provided. Exiting.');
      return;
    }

    console.log('\n🔌 Activating plugin(s)...\n');
    await activateMany(inputNames);

    console.log('\n🎉 Done.');
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

function promptForNames() {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question('Enter plugin name(s) (comma-separated): ', (answer) => {
      rl.close();
      const names = String(answer)
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      resolve(names);
    });
  });
}

// Allow names via CLI as well: node scripts/activate-plugins.js MouseFollower,LayeredSections
const cliArg = process.argv.slice(2).join(' ');
const initialNames = cliArg
  ? cliArg
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  : [];

if (require.main === module) {
  main(initialNames);
}
