/**
 * @summary Configuration types
 */

export enum EAspectRatio {
  Portrait = "4:5",
  Square = "1:1",
  Landscape = "5:4",
}

export type Constructor<T = {}> = new (...args: any[]) => T;

export type AbstractConstructor<T = {}> = Function & { prototype: T };

export type AnyConstructor<T = {}> = Constructor<T> | AbstractConstructor<T>;

export type PluginElement = HTMLElement;

export type HTMLSelector = string;

export type PluginSelector = HTMLSelector;

export type ElementTree = {
  element: string;
  attributes?: {
    [key: string]:
      | string
      | number
      | boolean
      | {
          [key: string]: string | number | boolean;
        };
  };
  children?: Omit<ElementTree, "appendTo">[];
  appendTo: HTMLSelector;
};

/**
 * @summary The plugins root element, can either be a selector
 * or take a custom object
 */
export type PluginRootElement = HTMLSelector | ElementTree;

export type PluginOptions<T> = T & {
  [K in keyof T as `_${string & K}`]?: T[K];
};
export type PluginConfiguration = {
  name: string;
  displayName: string;
  description?: string;
  tree?: PluginRootElement;
  isActive: boolean;
  module: () => Promise<any>;
};

/**
 * @summary UI types
 */

export type PluginContainer = HTMLElement | ElementTree;
