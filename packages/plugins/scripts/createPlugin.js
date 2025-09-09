#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Use dynamic import for node-fetch
async function getFetch() {
  const { default: fetch } = await import('node-fetch');
  return fetch;
}

// Helper function to convert plugin name to various formats
function formatPluginName(name) {
  // Convert to PascalCase (PluginName)
  const pascalCase = name.replace(/[-_\s]+(.)?/g, (_, c) => c ? c.toUpperCase() : '')
    .replace(/^(.)/, c => c.toUpperCase());
  
  // Convert to kebab-case (plugin-name)
  const kebabCase = name.replace(/([A-Z])/g, '-$1')
    .toLowerCase()
    .replace(/^-/, '')
    .replace(/[-_\s]+/g, '-');
  
  // Convert to camelCase (pluginName)
  const camelCase = pascalCase.replace(/^(.)/, c => c.toLowerCase());
  
  return { pascalCase, kebabCase, camelCase };
}

// Helper function to create directory if it doesn't exist
function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`📁 Created directory: ${dir}`);
  }
}

// Template for model.ts
function getModelTemplate(pascalCase, kebabCase) {
  return `import gsap from "gsap";
import PluginBase from "../_PluginBase/model";
import { PluginOptions } from "../_lib/ts/types";

interface I${pascalCase}Options {
  // Define your plugin options here
  enabled?: boolean;
}

interface I${pascalCase} {
  init(): void;
  destroy(): void;
}

class ${pascalCase} extends PluginBase<I${pascalCase}Options> implements I${pascalCase} {
  protected allowedOptions: (keyof I${pascalCase}Options)[] = ['enabled'];
  private options: PluginOptions<I${pascalCase}Options>;

  constructor(container: HTMLElement, options: PluginOptions<I${pascalCase}Options> = {}) {
    super(container, '${pascalCase}');
    this.options = {
      enabled: true,
      ...options
    };
  }

  init(): void {
    if (!this.options.enabled) {
      console.log('${pascalCase} is disabled');
      return;
    }

    console.log('Initializing ${pascalCase}...');
    this.setupPlugin();
  }

  private setupPlugin(): void {
    // Add your plugin initialization logic here
    this.container.setAttribute('data-candlelight-plugin-${kebabCase}', 'true');
    
    // Example: Add click handler
    this.container.addEventListener('click', this.handleClick.bind(this));
  }

  private handleClick(event: Event): void {
    console.log('${pascalCase} clicked:', event);
    // Add your click logic here
  }

  destroy(): void {
    // Clean up event listeners and resources
    this.container.removeEventListener('click', this.handleClick.bind(this));
    this.container.removeAttribute('data-candlelight-plugin-${kebabCase}');
    console.log('${pascalCase} destroyed');
  }
}

export default ${pascalCase};
`;
}

// Template for main.scss
function getStylesTemplate(kebabCase) {
  return `// Styles for ${kebabCase} plugin

[data-candlelight-plugin-${kebabCase}] {
  // Add your plugin styles here
  transition: all 0.3s ease;
  
  &:hover {
    // Add hover styles
  }
}

// Add responsive styles
@media (max-width: 768px) {
  [data-candlelight-plugin-${kebabCase}] {
    // Mobile styles
  }
}
`;
}

// Function to create plugin files
function createPluginFiles(pluginName, pluginDir) {
  const { pascalCase, kebabCase } = formatPluginName(pluginName);
  
  // Create main directories
  const assetsDir = path.join(pluginDir, 'assets');
  const stylesDir = path.join(assetsDir, 'styles');
  
  ensureDir(pluginDir);
  ensureDir(assetsDir);
  ensureDir(stylesDir);
  
  // Create model.ts
  const modelPath = path.join(pluginDir, 'model.ts');
  fs.writeFileSync(modelPath, getModelTemplate(pascalCase, kebabCase));
  console.log(`📄 Created: ${modelPath}`);
  
  // Create main.scss
  const stylesPath = path.join(stylesDir, 'main.scss');
  fs.writeFileSync(stylesPath, getStylesTemplate(kebabCase));
  console.log(`📄 Created: ${stylesPath}`);
  
  return { pascalCase, kebabCase };
}

// Function to register plugin in MongoDB
async function registerPluginInMongoDB(pluginData) {
  try {
    const fetch = await getFetch();
    const response = await fetch('http://localhost:3001/admin/plugins', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(pluginData)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log('🎉 Plugin registered in MongoDB:', result.plugin.displayName);
    return result.plugin;
  } catch (error) {
    console.error('❌ Failed to register plugin in MongoDB:', error.message);
    console.log('💡 Make sure the server is running on http://localhost:3001');
    throw error;
  }
}

// Main function
async function createPlugin() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  try {
    // Get plugin name from user
    const pluginName = await new Promise((resolve) => {
      rl.question('🔌 Enter the plugin name (e.g., "MyAwesome Plugin", "scroll-reveal"): ', resolve);
    });

    if (!pluginName.trim()) {
      console.log('❌ Plugin name is required!');
      process.exit(1);
    }

    // Get optional description
    const description = await new Promise((resolve) => {
      rl.question('📝 Enter plugin description (optional): ', resolve);
    });

    // Get tree configuration preference
    const treeConfigChoice = await new Promise((resolve) => {
      rl.question('🌳 Default tree config? (1=body, 2=button, 3=section, 4=none): ', resolve);
    });

    const { pascalCase, kebabCase } = formatPluginName(pluginName);
    
    // Determine tree config
    let treeConfig = null;
    switch(treeConfigChoice) {
      case '1':
        treeConfig = { element: "div", appendTo: "body" };
        break;
      case '2':
        treeConfig = "button";
        break;
      case '3':
        treeConfig = "section";
        break;
      default:
        treeConfig = null;
    }
    
    console.log(`\n🚀 Creating plugin: ${pascalCase}`);
    console.log(`📂 Slug: ${kebabCase}`);
    
    // Create plugin directory and files
    const pluginsDir = path.join(__dirname, '../src/plugins');
    const pluginDir = path.join(pluginsDir, pascalCase);
    
    if (fs.existsSync(pluginDir)) {
      console.log(`❌ Plugin directory already exists: ${pluginDir}`);
      process.exit(1);
    }
    
    const formats = createPluginFiles(pluginName, pluginDir);
    
    // Prepare MongoDB data
    const pluginData = {
      name: pascalCase,
      slug: kebabCase,
      displayName: pluginName.trim(),
      description: description.trim() || `${pluginName.trim()} plugin`,
      bundlePath: `/plugins/${kebabCase}/bundle.js`,
      treeConfig,
      supportedPlatforms: ['desktop'],
      squarespaceVersions: ['7.1'],
      isActive: true
    };
    
    // Register in MongoDB
    console.log('\n📡 Registering plugin in MongoDB...');
    await registerPluginInMongoDB(pluginData);
    
    console.log(`\n✅ Plugin "${pascalCase}" created successfully!`);
    console.log('\n📋 Next steps:');
    console.log(`   1. Edit ${path.join(pluginDir, 'model.ts')} to implement your plugin logic`);
    console.log(`   2. Customize ${path.join(pluginDir, 'assets/styles/main.scss')} for styling`);
    console.log('   3. Run `npm run build` to compile your plugin');
    console.log('   4. Test your plugin on a website');
    console.log(`\n🎯 Plugin will be available at: /plugins/${kebabCase}/bundle.js`);
    
  } catch (error) {
    console.error('❌ Error creating plugin:', error.message);
    process.exit(1);
  } finally {
    rl.close();
  }
}

// Run the script
createPlugin();
