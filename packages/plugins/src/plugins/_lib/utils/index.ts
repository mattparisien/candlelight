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

async function getPlugin(pluginName: string): Promise<Plugin | undefined> {
  return await PluginDataService.fetchPluginByName(pluginName);
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
      let options, module, Class, plugin: Plugin, containerNodes, isDev;

      if (!script) {
        throw new Error(
          `Error initializing plugin ${pluginName}. Script tag not found.`
        );
      }

      isDev = document.querySelector(SQSP_ENV_SELECTOR_MAP.get("DEV"));

      if (isDev) {
        console.log("Development environment detected, skipping plugin load.");
        return;
      } else {
        console.log(`Initializing plugin: ${pluginName}`);
      }

      options = getPluginOptionsFromScript(script);
      plugin = await getPlugin(pluginName); // Get the plugin object from API

      if (!plugin)
        throw new Error(
          `Plugin configuration not found for ${pluginName}. Make sure the plugin is authorized for this domain.`
        );

      console.log('Plugin configuration:', plugin);
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

// Export services for use in plugins
export { default as DeviceService } from "../services/DeviceService";
