// import { Plugin } from "../ts/types";
// import { HTML_SELECTOR_MAP } from "./domMappings";

// // DEPRECATED: This static configuration is deprecated. 
// // Plugins are now fetched from the database via PluginDataService.
// // This is kept for backward compatibility only.

// export const pluginConfiguration: Plugin[] = [
//   {
//     name: "MagneticButton",
//     slug: "magnetic-button",
//     displayName: "Magnetic Button",
//     treeConfig: HTML_SELECTOR_MAP.get("button"),
//     isActive: true,
//     module: () => import("../../MagneticButton/model"),
//   },
//   {
//     name: "MouseFollower",
//     slug: "mouse-follower", 
//     displayName: "Mouse Follower",
//     module: () => import("../../MouseFollower/model"),
//     isActive: true,
//     treeConfig: {
//       element: "canvas",
//       appendTo: HTML_SELECTOR_MAP.get("body"),
//     },
//   },
//   {
//     name: "ImageTrailer",
//     slug: "image-trailer",
//     displayName: "Image Trailer",
//     module: () => import("../../ImageTrailer/model"),
//     isActive: false,
//     treeConfig: HTML_SELECTOR_MAP.get("section")
//   },
//   {
//     name: "LayeredSections",
//     slug: "layered-sections",
//     displayName: "Layered Sections",
//     module: () => import("../../LayeredSections/model"),
//     isActive: false,
//     treeConfig: null
//   }
// ];
