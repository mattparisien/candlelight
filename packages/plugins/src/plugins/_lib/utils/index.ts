import { HTML_SELECTOR_MAP, SQSP_ENV_SELECTOR_MAP } from "../config/domMappings";
import { pluginConfiguration } from "../config/plugins";
import { ElementTree, HTMLSelector, PluginConfiguration } from "../ts/types";
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

function getPluginConfig(pluginName: string): PluginConfiguration {
  return pluginConfiguration.find((config) => config.name.trim() === pluginName.trim());
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
      let options, module, Class, config: PluginConfiguration, containerNodes, isDev;

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
      config = await getPluginConfig(pluginName); // Get the configuration object


      if (!config)
        throw new Error(
          `System configuration object not found for plugin ${pluginName}`
        );

      if (config.isActive) {
        module = await config.module(); // Load the module from configuration
        Class = await module.default; // Get the module's default exported value (the class)

        if (!Class)
          throw new Error(
            `Error loading class or config. Plugin ${pluginName} not found.`
          );

        if (config.tree) {

          if (isHTMLSelector(config.tree)) {
            containerNodes = getContainersBySelector(config.tree as HTMLSelector);
          } else {
            containerNodes = createTree(config.tree as ElementTree);
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
          containerNodes = Array.from(document.querySelectorAll(HTML_SELECTOR_MAP.get(pluginName)))
          containerNodes.forEach(container => {
            const instance = new Class(container, options);
            instance.init();
          })
        }

      }
    } catch (err) {
      console.error(err);
    }
  });
}
