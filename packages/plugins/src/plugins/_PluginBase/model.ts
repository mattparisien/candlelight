import { PluginOptions } from "../_lib/ts/types";

export type PluginAllowedOptions<T> = Array<keyof T>;

// Abstract class representing the base for all plugins.
abstract class PluginBase<T> {
  private _globalPluginSelector = "data-candlelight-plugin";

  
  protected container: HTMLElement; // The plugin HTML container element
  protected abstract allowedOptions: (keyof T)[];

  constructor(container: HTMLElement, name: string) {
    if (new.target === PluginBase) {
      throw new TypeError("Cannot construct PluginBase instances directly");
    }

    if (!container) {
      throw new Error("Missing plugin container");
    }

    this.container = container;
    this.setAttributes(name);
  }

  isType(variable, typeName) {
    // Check for null explicitly since typeof null is "object"
    if (variable === null && typeName.toLowerCase() === "null") {
      return true;
    }

    // Check for array since typeof array is "object"
    if (Array.isArray(variable) && typeName.toLowerCase() === "array") {
      return true;
    }

    // Check for Date since typeof Date is "object"
    if (variable instanceof Date && typeName.toLowerCase() === "date") {
      return true;
    }

    // For primitive types and function
    return typeof variable === typeName.toLowerCase();
  }

  // Validate the provided options against the allowed options.
  // This method should be implemented by subclasses to perform specific validations.
  // Return the validated and possibly filtered options.
  protected abstract validateOptions(
    userOptions: Partial<PluginOptions<T>>,
    defaultOptions: PluginOptions<T>
  ): PluginOptions<T> | void;

  // Placeholder for the init method. This must be implemented by subclasses.
  public abstract init(): void;

  // Merges the options passed in to the derived constructor with the
  // This method should ideally be called by all derived classes inside the validateOptions method
  protected mergeOptions(
    userOptions: Partial<PluginOptions<T>>,
    defaultOptions: PluginOptions<T>
  ): PluginOptions<T> {
    const mergedOptions = defaultOptions;

    Object.entries(userOptions).forEach((entry) => {
      Object.keys(defaultOptions).forEach((defaultOptions) => {
        if (entry[0] === defaultOptions) {
          mergedOptions[defaultOptions] = entry[1];
        }
      });
    });

    return mergedOptions as PluginOptions<T>;
  }

  // Takes the client options object and attributes keys to current object
  protected setOptions(userOptions: Partial<PluginOptions<T>>) {
    Object.entries(userOptions).forEach((entry) => {
      const key = entry[0];
      const value = entry[1];

      if (this.allowedOptions.includes(key as keyof T)) {
        if (value && (typeof value == "string" ? value.trim() != "" : true)) {
          if (
            `_${value}` in this &&
            this.allowedOptions.includes(value as keyof T)
          ) {
            this[`_${value}`] = entry[1];
          }
        }
      }
    });
  }

  // Sets custom data attributes on the container for easy identification
  private setAttributes(name: string) {
    this.container.setAttribute(this._globalPluginSelector, "true");
    this.container.setAttribute(
      this._globalPluginSelector +
        `-${name.toLowerCase().split(" ").join("-")}`,
      "true"
    );
  }
}

export default PluginBase;
