const glob = require('glob');
const path = require('path');
const fs = require('fs');
const { kebabCase } = require("lodash");

function generateEntryPoints() {
  const entry = {};
  
  // Look for plugin directories (excluding folders that start with an underscore)
  const pluginDirs = glob.sync(path.join(__dirname, '../src/plugins/[^_]*/'));

  for (const dir of pluginDirs) {
    const pluginName = path.basename(dir);
    const kebabName = kebabCase(pluginName);
    
    // Check if model.ts exists (required for all plugins)
    const modelPath = path.join(dir, 'model.ts');
    if (!fs.existsSync(modelPath)) {
      console.warn(`Warning: Plugin ${pluginName} missing model.ts, skipping...`);
      continue;
    }
    
    // Create a virtual entry point by generating the entry file content
    const entryContent = generateEntryContent(pluginName, dir);
    const virtualEntryPath = path.join(__dirname, '../.temp/', `${pluginName}_entry.js`);
    
    // Ensure .temp directory exists
    const tempDir = path.dirname(virtualEntryPath);
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    // Write the virtual entry file
    fs.writeFileSync(virtualEntryPath, entryContent);
    
    // Set the entry point
    entry[kebabName] = virtualEntryPath;
  }

  return entry;
}

function generateEntryContent(pluginName, pluginDir) {
  const relativePath = path.relative(
    path.join(__dirname, '../.temp/'),
    path.join(pluginDir, 'model.ts')
  ).replace(/\\/g, '/'); // Normalize path separators for webpack
  
  // Check if styles exist
  const stylesPath = path.join(pluginDir, 'assets/styles/main.scss');
  const hasStyles = fs.existsSync(stylesPath);
  
  const stylesImport = hasStyles ? 
    `import "${path.relative(path.join(__dirname, '../.temp/'), stylesPath).replace(/\\/g, '/')}";` : 
    '// No styles found';
  
  return `
// Auto-generated entry point for ${pluginName}
import { initializePlugin } from "${path.relative(
    path.join(__dirname, '../.temp/'), 
    path.join(__dirname, '../src/plugins/_lib/utils/index.ts')
  ).replace(/\\/g, '/')}";

${stylesImport}

// Initialize the plugin
initializePlugin("${pluginName}");
`.trim();
}

module.exports = generateEntryPoints;
