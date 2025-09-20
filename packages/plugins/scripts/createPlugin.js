#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { v4: uuidv4 } = require('uuid');

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
    this.options = this.validateOptions(options);
  }

    protected validateOptions(
    options: PluginOptions<IMagneticButtonOptions>
  ): PluginOptions<IMagneticButtonOptions> {
    const mergedOptions = this.mergeOptions(options, this.options);
      
    return mergedOptions;
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

[data-candlelight-${kebabCase}] {
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

// Function to generate a secure UUID-based password
function generatePluginPassword() {
  // Generate two UUIDs and concatenate them for extra security
  const uuid1 = uuidv4().replace(/-/g, ''); // Remove hyphens
  const uuid2 = uuidv4().replace(/-/g, ''); // Remove hyphens

  // Combine and take first 28 characters (less than 30)
  return (uuid1 + uuid2).substring(0, 28);
}

// Function to generate RTF install guide
function generateInstallGuideRTF(displayName, slug, password) {
  const rtfContent = `{\\rtf1\\ansi\\deff0 {\\fonttbl {\\f0 Times New Roman;}}\n\\f0\\fs24\\qc\\b ${displayName} by Candlelight Plugins\\b0\\par\n\\par\n\\b Plugin Install Guide:\\b0\\par\n{\\field{\\*\\fldinst HYPERLINK "https://candlelightplugins.com/${slug}"}{\\fldrslt https://candlelightplugins.com/${slug}}}\\par\n\\par\n\\b Password:\\b0\\par\n${password}\\par\n\\par\n\\b Happy designing and coding!\\b0\\par\n\\par\n\\b The Candlelight Plugins Team\\b0\\par}`;

  return Buffer.from(rtfContent, 'utf8');
}

// Parse environment from command-line args
function getEnvFromArgs() {
  const envArg = process.argv.find(arg => arg.startsWith('--env='));
  if (!envArg) return null;
  const env = envArg.split('=')[1].trim().toUpperCase();
  if (["DEV", "PROD", "ALL"].includes(env)) return env;
  return null;
}

// Register plugin using a single server URL
async function registerPlugin(pluginData) {
  const url = "http://localhost:3001/admin/plugins";
  console.log(`\n📡 Registering plugin at ${url} ...`);
  try {
    const fetch = await getFetch();
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(pluginData)
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `HTTP error! status: ${response.status}`);
    }
    const result = await response.json();
    console.log(`🎉 Plugin registered:`, result.plugin.displayName);
  } catch (error) {
    console.error(`❌ Failed to register plugin:`, error.message);
    console.log('💡 Make sure the server is running on http://localhost:3001');
  }
}

// Main function
async function createPlugin() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  try {
    // ENV selection
    let env = getEnvFromArgs();
    if (!env) {
      env = await new Promise((resolve) => {
        rl.question('🌎 Select environment (1=DEV, 2=PROD, 3=ALL): ', answer => {
          if (answer.trim() === '1' || /^dev$/i.test(answer)) resolve('DEV');
          else if (answer.trim() === '2' || /^prod$/i.test(answer)) resolve('PROD');
          else resolve('ALL');
        });
      });
    }

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
      rl.question('🌳 Default tree config? (1=body, 2=button, 3=section, 4=none, 5=custom): ', resolve);
    });

    // Get supported platforms
    const platformsInput = await new Promise((resolve) => {
      rl.question('📱 Supported platforms? (1=all, 2=desktop only, 3=mobile+tablet, 4=custom): ', resolve);
    });

    const { pascalCase, kebabCase } = formatPluginName(pluginName);

    // Determine tree config
    let treeConfig = null;
    const tc = String(treeConfigChoice || '').trim().toLowerCase();
    if (tc.startsWith('1') || tc === 'body') {
      treeConfig = { element: "div", appendTo: "body" };
    } else if (tc.startsWith('2') || tc === 'button') {
      treeConfig = "button";
    } else if (tc.startsWith('3') || tc === 'section') {
      treeConfig = "section";
    } else if (tc.startsWith('5') || tc.includes('custom')) {
      const customTreeConfig = await new Promise((resolve) => {
        rl.question('   Enter custom selector (CSS): ', resolve);
      });
      treeConfig = (customTreeConfig || '').trim() || null;
    } else {
      treeConfig = null;
    }

    // Determine supported platforms
    let supportedPlatforms = ['desktop']; // default
    switch (platformsInput) {
      case '1':
        supportedPlatforms = ['desktop', 'mobile', 'tablet'];
        break;
      case '2':
        supportedPlatforms = ['desktop'];
        break;
      case '3':
        supportedPlatforms = ['mobile', 'tablet'];
        break;
      case '4':
        const customPlatforms = await new Promise((resolve) => {
          rl.question('   Enter platforms (comma-separated: desktop,mobile,tablet): ', resolve);
        });
        supportedPlatforms = customPlatforms.split(',').map(p => p.trim()).filter(p => ['desktop', 'mobile', 'tablet'].includes(p));
        if (supportedPlatforms.length === 0) {
          supportedPlatforms = ['desktop']; // fallback
        }
        break;
      default:
        supportedPlatforms = ['desktop'];
    }

    console.log(`\n🚀 Creating plugin: ${pascalCase}`);
    console.log(`📂 Slug: ${kebabCase}`);

    // Create plugin directory and files
    const pluginsDir = path.join(__dirname, '../src/plugins');
    const pluginDir = path.join(pluginsDir, pascalCase);

    let formats;
    let skipLocal = false;
    if (fs.existsSync(pluginDir)) {
      const override = await new Promise((resolve) => {
        rl.question(`❌ Plugin directory already exists: ${pluginDir}\nDo you want to recreate/override it? (y/N): `, answer => {
          resolve(/^y(es)?$/i.test(answer.trim()));
        });
      });
      if (!override) {
        console.log('⚠️ Skipping local file creation. Plugin will still be registered in MongoDB.');
        skipLocal = true;
      } else {
        // Remove the existing directory
        fs.rmSync(pluginDir, { recursive: true, force: true });
        console.log(`🗑️ Removed existing directory: ${pluginDir}`);
      }
    }
    if (!skipLocal) {
      formats = createPluginFiles(pluginName, pluginDir);
    }

    // Generate a secure UUID-based password for the plugin
    const pluginPassword = generatePluginPassword();

    // Generate RTF install guide
    const installGuideRTF = generateInstallGuideRTF(pluginName.trim(), kebabCase, pluginPassword);

    // Create downloads directory and save RTF file
    const downloadsDir = path.join(pluginDir, 'assets', 'downloads');
    ensureDir(downloadsDir);

    const rtfFilePath = path.join(downloadsDir, `${kebabCase}-install-guide.rtf`);
    fs.writeFileSync(rtfFilePath, installGuideRTF);
    console.log(`📄 Created: ${rtfFilePath}`);

    // Prepare MongoDB data
    const pluginData = {
      name: pascalCase,
      slug: kebabCase,
      displayName: pluginName.trim(),
      description: description.trim() || `${pluginName.trim()} plugin`,
      bundlePath: `/plugins/${kebabCase}/bundle.js`,
      treeConfig,
      password: pluginPassword,
      download: installGuideRTF.toString('base64'), // Convert Buffer to base64 for JSON transmission
      supportedPlatforms,
      squarespaceVersions: ['7.1'],
      isActive: true
    };

    // Register plugin using single server URL
    await registerPlugin(pluginData);

    console.log(`\n✅ Plugin "${pascalCase}" created successfully!`);
    console.log(`🔐 Plugin Password: ${pluginPassword}`);
    console.log('   ⚠️  Save this password securely - it cannot be recovered!');
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
