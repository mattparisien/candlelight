const { MongoClient } = require('mongodb');
const fs = require('fs').promises;
const path = require('path');

// Load environment variables from .env.sync file
function loadEnvFromFile() {
  try {
    const envPath = path.join(__dirname, '..', '.env.sync');
    const envFile = require('fs').readFileSync(envPath, 'utf8');
    
    envFile.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
        const [key, ...valueParts] = trimmed.split('=');
        const value = valueParts.join('=');
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    });
    
    console.log('📄 Loaded environment variables from .env.sync');
  } catch (error) {
    console.log('⚠️  Could not load .env.sync file:', error.message);
  }
}

// Load env file before creating the class
loadEnvFromFile();

class DatabaseSync {
  constructor() {
    this.devUri = process.env.DEV_MONGODB_URI;
    this.prodUri = process.env.PROD_MONGODB_URI;
    this.dryRun = process.env.DRY_RUN === 'true';
    
    if (!this.devUri || !this.prodUri) {
      throw new Error('Missing required MongoDB connection strings');
    }
  }

  async connect() {
    console.log('🔌 Connecting to databases...');
    this.devClient = new MongoClient(this.devUri);
    this.prodClient = new MongoClient(this.prodUri);
    
    await Promise.all([
      this.devClient.connect(),
      this.prodClient.connect()
    ]);
    
    this.devDb = this.devClient.db();
    this.prodDb = this.prodClient.db();
    
    console.log('✅ Connected to both databases');
  }

  async disconnect() {
    await Promise.all([
      this.devClient?.close(),
      this.prodClient?.close()
    ]);
    console.log('🔌 Disconnected from databases');
  }

  async diffPlugins() {
    console.log('🔍 Analyzing plugin differences...');
    
    const devPlugins = await this.devDb.collection('plugins').find({}).toArray();
    const prodPlugins = await this.prodDb.collection('plugins').find({}).toArray();
    
    // Create maps for efficient lookup
    const prodPluginMap = new Map(prodPlugins.map(p => [p.name || p._id.toString(), p]));
    const devPluginMap = new Map(devPlugins.map(p => [p.name || p._id.toString(), p]));
    
    const changes = {
      toInsert: [],
      toUpdate: [],
      toDelete: []
    };
    
    // Find new plugins (in dev but not in prod)
    for (const devPlugin of devPlugins) {
      const key = devPlugin.name || devPlugin._id.toString();
      const prodPlugin = prodPluginMap.get(key);
      
      if (!prodPlugin) {
        changes.toInsert.push({
          type: 'INSERT',
          plugin: devPlugin,
          description: `New plugin: ${devPlugin.name || 'Unnamed'}`
        });
      } else {
        // Check if plugin needs updating (compare relevant fields)
        const needsUpdate = this.comparePlugins(devPlugin, prodPlugin);
        if (needsUpdate) {
          changes.toUpdate.push({
            type: 'UPDATE',
            plugin: devPlugin,
            existing: prodPlugin,
            description: `Update plugin: ${devPlugin.name || 'Unnamed'}`
          });
        }
      }
    }
    
    // Find plugins to potentially delete (in prod but not in dev)
    // Note: Be careful with deletions - you might want to disable this
    for (const prodPlugin of prodPlugins) {
      const key = prodPlugin.name || prodPlugin._id.toString();
      if (!devPluginMap.has(key)) {
        changes.toDelete.push({
          type: 'DELETE',
          plugin: prodPlugin,
          description: `Plugin removed from dev: ${prodPlugin.name || 'Unnamed'}`
        });
      }
    }
    
    return changes;
  }

  comparePlugins(devPlugin, prodPlugin) {
    // Define fields to compare (exclude _id, timestamps, etc.)
    const fieldsToCompare = [
      'name', 'description', 'version', 'config', 'isActive', 
      'category', 'tags', 'permissions'
    ];
    
    for (const field of fieldsToCompare) {
      const devValue = JSON.stringify(devPlugin[field]);
      const prodValue = JSON.stringify(prodPlugin[field]);
      
      if (devValue !== prodValue) {
        return true;
      }
    }
    
    return false;
  }

  async applyChanges(changes) {
    const appliedChanges = [];
    
    if (this.dryRun) {
      console.log('🧪 DRY RUN MODE - No actual changes will be made');
    }
    
    // Apply insertions
    for (const change of changes.toInsert) {
      console.log(`➕ ${change.description}`);
      
      if (!this.dryRun) {
        const insertDoc = { ...change.plugin };
        delete insertDoc._id; // Let MongoDB generate new _id
        insertDoc.syncedAt = new Date();
        insertDoc.syncedFrom = 'dev';
        
        await this.prodDb.collection('plugins').insertOne(insertDoc);
      }
      
      appliedChanges.push({
        type: 'INSERT',
        description: change.description,
        pluginName: change.plugin.name || 'Unnamed'
      });
    }
    
    // Apply updates
    for (const change of changes.toUpdate) {
      console.log(`📝 ${change.description}`);
      
      if (!this.dryRun) {
        const updateDoc = { ...change.plugin };
        delete updateDoc._id; // Don't update _id
        updateDoc.syncedAt = new Date();
        updateDoc.syncedFrom = 'dev';
        
        const filter = change.existing.name 
          ? { name: change.existing.name }
          : { _id: change.existing._id };
          
        await this.prodDb.collection('plugins').replaceOne(filter, updateDoc);
      }
      
      appliedChanges.push({
        type: 'UPDATE',
        description: change.description,
        pluginName: change.plugin.name || 'Unnamed'
      });
    }
    
    // Handle deletions (commented out for safety)
    /*
    for (const change of changes.toDelete) {
      console.log(`🗑️  ${change.description}`);
      
      if (!this.dryRun) {
        const filter = change.plugin.name 
          ? { name: change.plugin.name }
          : { _id: change.plugin._id };
          
        await this.prodDb.collection('plugins').deleteOne(filter);
      }
      
      appliedChanges.push({
        type: 'DELETE',
        description: change.description,
        pluginName: change.plugin.name || 'Unnamed'
      });
    }
    */
    
    return appliedChanges;
  }

  async syncPlugins() {
    try {
      await this.connect();
      
      const changes = await this.diffPlugins();
      
      console.log('📊 Sync Summary:');
      console.log(`  - Plugins to insert: ${changes.toInsert.length}`);
      console.log(`  - Plugins to update: ${changes.toUpdate.length}`);
      console.log(`  - Plugins to delete: ${changes.toDelete.length}`);
      
      const appliedChanges = await this.applyChanges(changes);
      
      // Write results for GitHub Actions
      const result = {
        status: 'success',
        timestamp: new Date().toISOString(),
        changes: appliedChanges,
        summary: {
          inserted: changes.toInsert.length,
          updated: changes.toUpdate.length,
          deleted: changes.toDelete.length
        },
        dryRun: this.dryRun
      };
      
      await fs.writeFile('sync-result.json', JSON.stringify(result, null, 2));
      
      console.log(`✅ Sync completed successfully. Applied ${appliedChanges.length} changes.`);
      
      return result;
      
    } catch (error) {
      console.error('❌ Sync failed:', error);
      
      const errorResult = {
        status: 'error',
        timestamp: new Date().toISOString(),
        error: error.message,
        changes: [],
        dryRun: this.dryRun
      };
      
      await fs.writeFile('sync-result.json', JSON.stringify(errorResult, null, 2));
      throw error;
      
    } finally {
      await this.disconnect();
    }
  }
}

// Run the sync
if (require.main === module) {
  const sync = new DatabaseSync();
  sync.syncPlugins()
    .then(result => {
      console.log('🎉 Database sync completed');
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Database sync failed:', error);
      process.exit(1);
    });
}

module.exports = DatabaseSync;
