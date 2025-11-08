import { HTML_SELECTOR_MAP, SQSP_ENV_SELECTOR_MAP } from "../config/domMappings";
import PluginDataService from "../services/PluginDataService";
import DeviceService from "../services/DeviceService";
import { ElementTree, HTMLSelector, Plugin } from "../ts/types";
import DomUtils from "./DomUtils";

const encodeHTML = (str: string): string => {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
};

const getPluginOptionsFromScript = (script: HTMLOrSVGScriptElement) => {
  const options = {};
  const dataAttributes = script?.dataset;

  if (!dataAttributes) return;

  for (const [key, value] of Object.entries(dataAttributes)) {
    options[key] = encodeHTML(value);
  }

  return options;
};

async function getPlugin(pluginName: string, origin: string): Promise<Plugin | undefined> {
  return await PluginDataService.fetchPluginByName(pluginName, origin);
}

function getContainersBySelector(
  selector: HTMLSelector
): HTMLElement | HTMLElement[] {
  return DomUtils.querySelectorAll(selector);
}

const createTree = (structure: ElementTree): HTMLElement => {
  if (!structure) {
    throw new Error("createTree: Structure argument missing");
  }

  // Create the element
  const element = document.createElement(structure.element);

  // Apply attributes
  if (structure.attributes) {
    for (const [attr, value] of Object.entries(structure.attributes)) {
      if (attr === "dataset") {
        // Special handling for dataset
        for (const [dataKey, dataValue] of Object.entries(value)) {
          element.dataset[dataKey] = dataValue;
        }
      } else {
        element.setAttribute(attr, value as string);
      }
    }
  }

  // Recursively process children
  if (structure.children) {
    for (const child of structure.children) {
      const childElement = createTree(child as ElementTree);
      if (childElement) {
        element.appendChild(childElement as HTMLElement);
      }
    }
  }

  // Append to specified parent, if any
  if (structure.appendTo) {
    const container = DomUtils.querySelector(structure.appendTo);

    if (!container) {
      throw new Error(
        "createTree: could not identify container elememt to append tree to."
      );
    }

    container.appendChild(element as HTMLElement);
  }

  return element;
};

const isHTMLSelector = (selector: string | Object): boolean => {
  return typeof selector === "string";
};

export async function initializePlugin(pluginName: string): Promise<void> {
  const script: HTMLOrSVGScriptElement = document.currentScript;

  window.addEventListener("load", async () => {
    try {
      let options, module, Class, plugin: Plugin, containerNodes, isDev, internalUrl;

      if (!script) {
        throw new Error(
          `Error initializing plugin ${pluginName}. Script tag not found.`
        );
      }

      isDev = document.querySelector(SQSP_ENV_SELECTOR_MAP.get("DEV"));
      internalUrl = window["Static"]["SQUARESPACE_CONTEXT"]["website"]["internalUrl"];

            console.log('blah', window["Static"])

      console.log(`Initializing plugin: ${pluginName} withg editing check url ${internalUrl}`);

      if (isDev) {
        console.log("Development environment detected, skipping plugin load.");
        return;
      } else {
        console.log(`Initializing plugin: ${pluginName}`);
      }

      if (!internalUrl) {
        console.log('bonjourrrrr');
        throw new Error(
          `Error initializing plugin ${pluginName}. Could not determine website domain.`
        );
      } else {
        console.log(`Website domain: ${internalUrl}`);
      }


      options = getPluginOptionsFromScript(script);
      plugin = await getPlugin(pluginName, internalUrl); // Get the plugin object from API
      console.log('the plugin!!!!', plugin);
      if (!plugin)
        throw new Error(
          `Plugin configuration not found for ${pluginName}. Make sure the plugin is authorized for this domain.`
        );

      // Check device compatibility
      if (plugin.supportedPlatforms && plugin.supportedPlatforms.length > 0) {
        const deviceType = DeviceService.getDeviceType();
        const isDeviceSupported = plugin.supportedPlatforms.includes(deviceType);

        if (!isDeviceSupported) {
          console.log(`Plugin ${pluginName} is not supported on ${deviceType}. Supported platforms: ${plugin.supportedPlatforms.join(', ')}`);
          return;
        }

        console.log(`Device compatibility check passed for ${pluginName} on ${deviceType}`);
      }



      if (plugin.isActive && plugin.module) {
        module = await plugin.module(); // Load the module from plugin configuration
        Class = await module.default; // Get the module's default exported value (the class)

        if (!Class)
          throw new Error(
            `Error loading class for plugin ${pluginName}. Module not found.`
          );

        // Use treeConfig from the API response, fallback to HTML_SELECTOR_MAP
        const treeConfig = plugin.treeConfig;

        if (treeConfig) {
          if (isHTMLSelector(treeConfig)) {
            containerNodes = getContainersBySelector(treeConfig as HTMLSelector);
          } else {
            containerNodes = createTree(treeConfig as ElementTree);
          }

          if (
            !containerNodes ||
            (Array.isArray(containerNodes) && !containerNodes.length)
          ) {
            throw new Error(
              `Error finding/creating container node(s) for plugin ${pluginName}`
            );
          } else if (Array.isArray(containerNodes)) {
            containerNodes.forEach((container) => {
              const instance = new Class(container, options);
              instance.init();
            });
          } else {
            const instance = new Class(containerNodes as HTMLElement, options);
            instance.init();
          }
        } else {
          // Fallback to old HTML_SELECTOR_MAP behavior
          containerNodes = Array.from(document.querySelectorAll(HTML_SELECTOR_MAP.get(pluginName)))

          if (containerNodes?.length) {
            containerNodes.forEach(container => {
              const instance = new Class(container, options);
              instance.init();
            })
          } else {
            const instance = new Class(document.body, options);
            instance.init();
          }

        }

      }
    } catch (err) {
      console.error(`Plugin initialization error for ${pluginName}:`, err);
    }
  });
}

// Singleton class to manage all Squarespace environment and plugin lifecycle
class SquarespaceEnvironmentManager {
  private static instance: SquarespaceEnvironmentManager | null = null;
  private observer: MutationObserver | null = null;
  private isInitialized = false;
  private allPluginInstances = new Map<string, any[]>(); // pluginName -> instances[]
  private pluginInitializers = new Map<string, () => Promise<void>>(); // pluginName -> initializer function
  private currentEnvironment: string = 'PROD';

  private constructor() { }

  static getInstance(): SquarespaceEnvironmentManager {
    if (!SquarespaceEnvironmentManager.instance) {
      SquarespaceEnvironmentManager.instance = new SquarespaceEnvironmentManager();
    }
    return SquarespaceEnvironmentManager.instance;
  }

  // Set Squarespace environment and initialization attribute on HTML document
  private setSqspEnvironmentAttribute(): void {
    let environment = 'PROD'; // Default to production

    // Check for editing state (remove the '.' prefix for class checking)
    const editingClass = SQSP_ENV_SELECTOR_MAP.get("EDITING");
    const devClass = SQSP_ENV_SELECTOR_MAP.get("DEV");
    if (editingClass && document.body.classList.contains(editingClass.replace('.', ''))) {
      environment = 'EDITING';
    }
    else if (devClass && document.body.classList.contains(devClass.replace('.', ''))) {
      environment = 'DEV';
    } else {
      // Check for preview state
      const hasEditMode = document.body.classList.contains('sqs-edit-mode');
      const hasPageEditing = document.body.classList.contains('sqs-is-page-editing');

      if (hasEditMode && !hasPageEditing) {
        environment = 'PREVIEW';
      }
    }

    this.currentEnvironment = environment;

    // Set initialization attribute based on environment
    if (environment === 'EDITING') {
      document.documentElement.removeAttribute('data-candlelight-initialized');
    } else {
      document.documentElement.setAttribute('data-candlelight-initialized', 'true');
    }
  }

  // Initialize the global observer (only once)
  private initializeGlobalObserver(): void {
    if (this.isInitialized) {
      return; // Already initialized
    }

    this.setSqspEnvironmentAttribute(); // Set initial environment

    // Set up MutationObserver to watch for class changes on body
    this.observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          const previousEnvironment = this.currentEnvironment;
          this.setSqspEnvironmentAttribute();

          // Only react if environment actually changed
          if (this.currentEnvironment !== previousEnvironment) {
            this.handleEnvironmentChange(previousEnvironment, this.currentEnvironment);
          }
        }
      });
    });

    this.observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['class']
    });

    this.isInitialized = true;
    console.log('🌍 Squarespace Environment Manager initialized');
  }

  // Handle environment changes
  private async handleEnvironmentChange(from: string, to: string): Promise<void> {
    console.log(`🔄 Environment changed: ${from} → ${to}`);

    if (to === 'EDITING') {
      // Entering editing mode - destroy all plugins
      this.destroyAllPlugins();
    } else if (from === 'EDITING' && (to === 'PROD' || to === 'PREVIEW' || to === 'DEV')) {
      // Exiting editing mode - reinitialize all plugins
      setTimeout(() => this.reinitializeAllPlugins(), 100); // Small delay for DOM stability
    }
  }

  // Get current editing state
  isEditing(): boolean {
    return this.currentEnvironment === 'EDITING';
  }

  // Check if plugins should be initialized (not in editing mode)
  shouldInitializePlugins(): boolean {
    return this.currentEnvironment !== 'EDITING';
  }

  // Register a plugin with its initializer function
  registerPlugin(pluginName: string, initializerFn: () => Promise<void>): void {
    this.pluginInitializers.set(pluginName, initializerFn);

    // Initialize the global observer if this is the first plugin
    this.initializeGlobalObserver();

    // Initialize immediately if plugins should be initialized (not in editing mode)
    if (this.shouldInitializePlugins()) {
      console.log('made it here!')
      initializerFn().catch(err => {
        console.error(`Error initializing plugin ${pluginName}:`, err);
      });
    }
  }

  // Add plugin instance to tracking
  addPluginInstance(pluginName: string, instance: any): void {
    if (!this.allPluginInstances.has(pluginName)) {
      this.allPluginInstances.set(pluginName, []);
    }
    this.allPluginInstances.get(pluginName)!.push(instance);
  }

  // Destroy all instances of all plugins
  private destroyAllPlugins(): void {
    let totalDestroyed = 0;

    this.allPluginInstances.forEach((instances, pluginName) => {
      instances.forEach(instance => {
        if (instance && typeof instance.destroy === 'function') {
          try {
            instance.destroy();
            totalDestroyed++;
          } catch (err) {
            console.error(`Error destroying plugin instance for ${pluginName}:`, err);
          }
        }
      });
      instances.length = 0; // Clear the array
    });

    if (totalDestroyed > 0) {
      console.log(`🗑️  Destroyed ${totalDestroyed} plugin instances due to editing mode`);
    }
  }

  // Reinitialize all registered plugins
  private async reinitializeAllPlugins(): Promise<void> {
    console.log(`🚀 Reinitializing ${this.pluginInitializers.size} plugins...`);

    const initPromises = Array.from(this.pluginInitializers.entries()).map(async ([pluginName, initFn]) => {
      try {
        await initFn();
      } catch (err) {
        console.error(`Error reinitializing plugin ${pluginName}:`, err);
      }
    });

    await Promise.all(initPromises);
    console.log('✅ Plugin reinitialization complete');
  }

  // Get current environment
  getCurrentEnvironment(): string {
    return this.currentEnvironment;
  }

  // Get plugin instance count
  getPluginInstanceCount(pluginName?: string): number {
    if (pluginName) {
      return this.allPluginInstances.get(pluginName)?.length || 0;
    }

    let total = 0;
    this.allPluginInstances.forEach(instances => {
      total += instances.length;
    });
    return total;
  }

  // Cleanup (for testing purposes)
  destroy(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    this.destroyAllPlugins();
    this.pluginInitializers.clear();
    this.isInitialized = false;
    SquarespaceEnvironmentManager.instance = null;
    console.log('🧹 Squarespace Environment Manager destroyed');
  }
}

// Enhanced plugin initialization with editing state awareness
export async function initializePluginWithEditingCheck(pluginName: string): Promise<void> {
  const script: HTMLOrSVGScriptElement = document.currentScript;
  const envManager = SquarespaceEnvironmentManager.getInstance();

  // Create the plugin initializer function
  const pluginInitializer = async (): Promise<void> => {
    if (!envManager.shouldInitializePlugins()) {
      console.log(`Plugin ${pluginName} not initialized - page is in editing mode`);
      return;
    }

    try {
      let options, module, Class, plugin: Plugin, containerNodes, internalUrl;

      if (!script) {
        throw new Error(
          `Error initializing plugin ${pluginName}. Script tag not found.`
        );
      }

      internalUrl = window["Static"]["SQUARESPACE_CONTEXT"]["website"]["internalUrl"];

      console.log('blah', window["Static"])
      console.log(`Initializing plugin: ${pluginName} withg editing check url ${internalUrl}`);

      if (!internalUrl) {
        console.log('haahhaahhahah');
        throw new Error(
          `Error initializing plugin ${pluginName}. Could not determine website domain.`
        );
      }
      else {
        console.log(`Website domain: ${internalUrl}`);
      }

      console.log(`Initializing plugin: ${pluginName} (env: ${envManager.getCurrentEnvironment()})`);

      options = getPluginOptionsFromScript(script);
    
      plugin = await getPlugin(pluginName, internalUrl);
  
      if (!plugin) {
        throw new Error(
          `Plugin configuration not found for ${pluginName}. Make sure the plugin is authorized for this domain.`
        );
      }

      // Check device compatibility
      console.log('plugin supported platforms', plugin.supportedPlatforms);
      if (plugin.supportedPlatforms && plugin.supportedPlatforms.length > 0) {
        const deviceType = DeviceService.getDeviceType();
        console.log('current device type', deviceType);
        const isDeviceSupported = plugin.supportedPlatforms.includes(deviceType);
        console.log('is device supported', isDeviceSupported);

        if (!isDeviceSupported) {
          console.log(`Plugin ${pluginName} is not supported on ${deviceType}. Supported platforms: ${plugin.supportedPlatforms.join(', ')}`);
          return;
        }

        console.log(`Device compatibility check passed for ${pluginName} on ${deviceType}`);
      }

      if (plugin.isActive && plugin.module) {
        module = await plugin.module();
        Class = await module.default;

        if (!Class) {
          throw new Error(
            `Error loading class for plugin ${pluginName}. Module not found.`
          );
        }

        // Use treeConfig from the API response, fallback to HTML_SELECTOR_MAP
        const treeConfig = plugin.treeConfig;

        if (treeConfig) {
          if (isHTMLSelector(treeConfig)) {
            containerNodes = getContainersBySelector(treeConfig as HTMLSelector);
          } else {
            containerNodes = createTree(treeConfig as ElementTree);
          }

          if (
            !containerNodes ||
            (Array.isArray(containerNodes) && !containerNodes.length)
          ) {
            throw new Error(
              `Error finding/creating container node(s) for plugin ${pluginName}`
            );
          } else if (Array.isArray(containerNodes)) {
            containerNodes.forEach((container) => {
              const instance = new Class(container, options);
              instance.init();
              envManager.addPluginInstance(pluginName, instance);
            });
          } else {
            const instance = new Class(containerNodes as HTMLElement, options);
            instance.init();
            envManager.addPluginInstance(pluginName, instance);
          }
        } else {
          // Fallback to old HTML_SELECTOR_MAP behavior
          containerNodes = Array.from(document.querySelectorAll(HTML_SELECTOR_MAP.get(pluginName)));

          if (containerNodes?.length) {
            containerNodes.forEach(container => {
              const instance = new Class(container, options);
              instance.init();
              envManager.addPluginInstance(pluginName, instance);
            });
          } else {
            const instance = new Class(document.body, options);
            instance.init();
            envManager.addPluginInstance(pluginName, instance);
          }
        }
      }
    } catch (err) {
      console.error(`Plugin initialization error for ${pluginName}:`, err);
    }
  };

  // Register the plugin with the environment manager
  const registerPlugin = () => {
    envManager.registerPlugin(pluginName, pluginInitializer);
  };

  // Initialize based on document ready state
  if (document.readyState === 'loading') {
    window.addEventListener("load", registerPlugin);
  } else {
    // DOM is already loaded
    setTimeout(registerPlugin, 0);
  }
}

// Export services and managers for use in plugins
export { default as DeviceService } from "../services/DeviceService";
export { SquarespaceEnvironmentManager };
