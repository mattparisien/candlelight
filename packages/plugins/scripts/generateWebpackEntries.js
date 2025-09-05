const glob = require('glob');
const path = require('path');
const { kebabCase } = require("lodash");

function generateEntryPoints() {
  const entry = {};
  // Look for index.ts files inside the plugins directory, excluding folders that start with an underscore.
  const pluginEntryFiles = glob.sync(path.join(__dirname, '../src/plugins/[^_]*/index.ts'));

  for (const file of pluginEntryFiles) {
    // Extract the plugin name based on the file path
    const pluginName = kebabCase(path.basename(path.dirname(file)));
    // Set the entry point in the entry object, using the plugin name
    entry[pluginName] = path.resolve(__dirname, file);
  }

  return entry;
}

module.exports = generateEntryPoints;
