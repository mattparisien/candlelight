import { PluginConfiguration } from "../ts/types";
import { HTML_SELECTOR_MAP } from "./domMappings";

export const pluginConfiguration: PluginConfiguration[] = [
  {
    name: "MagneticButton",
    displayName: "Magnetic Button",
    tree: HTML_SELECTOR_MAP.get("button"),
    isActive: false,
    module: () => import("../../MagneticButton/model"),
  },
  {
    name: "MouseFollower",
    displayName: "Mouse Follower",
    module: () => import("../../MouseFollower/model"),
    isActive: true,
    tree: {
      element: "canvas",
      appendTo: HTML_SELECTOR_MAP.get("body"),
    },
  },
  {
    name: "ImageTrailer",
    displayName: "Image Trailer",
    module: () => import("../../ImageTrailer/model"),
    isActive: false,
    tree: HTML_SELECTOR_MAP.get("section")
  },
  {
    name: "LayeredSections",
    displayName: "Layered Sections",
    module: () => import("../../LayeredSections/model"),
    isActive: false,
  }
];
