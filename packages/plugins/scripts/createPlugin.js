const fs = require("fs").promises;
const path = require("path");
const {
  PLUGINS_DIR,
  PLUGINS_MODULE_MAPPING_FILE_PATH,
  PLUGINS_CONFIG_FILE_PATH,
} = require("./constants");
const { createDirectory } = require("./utils");

// Async function to encapsulate plugin creation logic
const createPlugin = async (pluginName) => {
  try {
    const specificPluginDirectoryPath = path.join(PLUGINS_DIR, pluginName);
    const pluginTsFilePath = path.join(specificPluginDirectoryPath, "model.ts");
    const pluginIndexFilePath = path.join(
      specificPluginDirectoryPath,
      "index.ts"
    );
    const pluginStylesDirectoryPath = path.join(
      specificPluginDirectoryPath,
      "assets",
      "styles"
    );
    const pluginStylesFilePath = path.join(
      pluginStylesDirectoryPath,
      "main.scss"
    );

    // Create the specific plugin directory and its styles directory
    await createDirectory(specificPluginDirectoryPath);
    await createDirectory(pluginStylesDirectoryPath);

    // Generate plugin file content and index.ts content
    const pluginFileContent = generatePluginTemplate(pluginName);
    const pluginIndexFileContent = `
import { initializePlugin } from '../_lib/utils';
import './assets/styles/main.scss';

initializePlugin('${pluginName}');
`;

    // Create or update the specific plugin's TypeScript, SCSS files, and index.ts
    await fs.writeFile(pluginStylesFilePath, "");
    await fs.writeFile(pluginTsFilePath, pluginFileContent);
    await fs.writeFile(pluginIndexFilePath, pluginIndexFileContent);

    // Update MODULE_MAPPING with the new plugin
    await updateModuleMapping(pluginName);

    // Update plugins.json configuration file
    await updatePluginsConfig(pluginName);

    console.log(`${pluginName} plugin created successfully.`);
  } catch (error) {
    console.error(`Error creating plugin ${pluginName}:`, error);
  }
};

// Function to update the MODULE_MAPPING object within the module mapping file
async function updateModuleMapping(pluginName) {
  try {
    const mappingContent = await fs.readFile(
      PLUGINS_MODULE_MAPPING_FILE_PATH,
      "utf8"
    );
    const insertionContent = `  ${pluginName}: () => import("../../${pluginName}/model"),\n`;
    const updatedContent = mappingContent.replace(
      /(const MODULE_MAPPING = {\n)/,
      `$1${insertionContent}`
    );

    await fs.writeFile(
      PLUGINS_MODULE_MAPPING_FILE_PATH,
      updatedContent,
      "utf8"
    );
    console.log(`Updated MODULE_MAPPING with ${pluginName}.`);
  } catch (error) {
    console.error(`Error updating MODULE_MAPPING for ${pluginName}:`, error);
  }
}

// Converts pluginName from camelCase to PascalCase and splits into words
function generateDisplayName(pluginName) {
  const pascalCase = pluginName.replace(/([A-Z])/g, " $1").trim(); // Add space before each uppercase letter
  return pascalCase.charAt(0).toUpperCase() + pascalCase.slice(1); // Capitalize the first letter
}

// Function to add new plugin config to plugins.json
async function updatePluginsConfig(pluginName) {
  try {
    const configFileContent = await fs.readFile(
      PLUGINS_CONFIG_FILE_PATH,
      "utf8"
    );
    const pluginsConfig = JSON.parse(configFileContent);

    // Add the new plugin configuration
    pluginsConfig.push({
      name: pluginName,
      displayName: generateDisplayName(pluginName),
      selector: "", // Leaving selector blank as per instructions
    });

    // Write the updated configuration back to the file
    await fs.writeFile(
      PLUGINS_CONFIG_FILE_PATH,
      JSON.stringify(pluginsConfig, null, 2),
      "utf8"
    );
    console.log(`Updated plugins.json with ${pluginName}.`);
  } catch (error) {
    console.error(`Error updating plugins.json for ${pluginName}:`, error);
  }
}

// Template function for generating plugin file content (remains unchanged)
const generatePluginTemplate = (pluginName) => {
  return `
import PluginBase from '../_PluginBase/model';
import { PluginConfiguration } from '../_lib/ts/types';

class ${pluginName} extends PluginBase {
    constructor(element: HTMLElement, config: PluginConfiguration) {
        super(element);
        
        this.setPluginConfig(config);
        this.setPluginAttributes(this.name);
    }
}

export default ${pluginName};
`;
};

// Example usage
const pluginName = process.argv.slice(2)[0];
createPlugin(pluginName).then(() => console.log("Plugin created successfully"));
