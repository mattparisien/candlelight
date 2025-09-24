#!/usr/bin/env node
require('dotenv').config();
const os = require('os');
const mongoose = require('mongoose');
const Setting = require('../models/Setting');

const NODE_ENV = process.env.NODE_ENV || 'development';
if (NODE_ENV !== 'production') {
  console.log('post-deploy: skipping - NODE_ENV is not production:', NODE_ENV);
  process.exit(0);
}

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('post-deploy: MONGODB_URI not set. Aborting.');
  process.exit(1);
}

const hostname = os.hostname();
const SECTION = 'all';
const KEY = 'auhorizedSystemStations';

async function run() {
  await mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });

  let setting = await Setting.findOne({ section: SECTION, key: KEY }).exec();

  if (setting) {
    let parsed;
    try {
      parsed = JSON.parse(setting.value);
    } catch (e) {
      // If value isn't JSON, treat it as a single-string entry
      parsed = typeof setting.value === 'string' && setting.value.length ? [setting.value] : [];
    }

    if (!Array.isArray(parsed)) parsed = [parsed];

    if (!parsed.includes(hostname)) {
      parsed.push(hostname);
      setting.value = JSON.stringify(parsed);
      await setting.save();
      console.log(`post-deploy: added hostname to setting ${SECTION}/${KEY}:`, hostname);
    } else {
      console.log(`post-deploy: hostname already present in ${SECTION}/${KEY}:`, hostname);
    }
  } else {
    const newSetting = new Setting({
      section: SECTION,
      key: KEY,
      value: JSON.stringify([hostname])
    });
    await newSetting.save();
    console.log(`post-deploy: created setting ${SECTION}/${KEY} with hostname:`, hostname);
  }

  await mongoose.disconnect();
  process.exit(0);
}

run().catch(err => {
  console.error('post-deploy: fatal error', err);
  process.exit(1);
});
