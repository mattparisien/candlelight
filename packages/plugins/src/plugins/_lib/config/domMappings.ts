interface SelectorConfig {
  selector: string | null;
  category: 'layout' | 'navigation' | 'content' | 'plugin' | 'sqsp-block';
}

export type { SelectorConfig };

export const UNIFIED_SELECTOR_MAP = new Map<string, SelectorConfig>([
  // Layout elements
  ["html", { selector: "html", category: "layout" }],
  ["body", { selector: "body[id^='collection-']", category: "layout" }],
  
  // Navigation elements
  ["header", { selector: ".header-announcement-bar-wrapper", category: "navigation" }],
  ["menu", { selector: ".header-menu", category: "navigation" }],
  ["footer", { selector: "footer", category: "navigation" }],
  
  // Content elements
  ["button", { selector: ".sqs-block-button-element", category: "content" }],
  ["link", { selector: "a,button", category: "content" }],
  ["section", { selector: "section.page-section", category: "content" }],
  
  // Plugin-specific elements
  ["LayeredSections", { selector: "[data-candlelight-plugin-layered-sections]", category: "plugin" }],
  
  // Squarespace block elements
  ["sqsp-button", { selector: ".sqs-block-button", category: "sqsp-block" }],
  ["sqsp-image", { selector: ".sqs-block-image", category: "sqsp-block" }],
  ["sqsp-text", { selector: ".sqs-block-html", category: "sqsp-block" }],
  ["sqsp-code", { selector: ".sqs-block-code", category: "sqsp-block" }],
  ["sqsp-gallery", { selector: ".sqs-block-gallery", category: "sqsp-block" }],
  ["sqsp-video", { selector: ".sqs-block-video", category: "sqsp-block" }],
  ["sqsp-map", { selector: ".sqs-block-map", category: "sqsp-block" }],
  ["sqsp-form", { selector: ".sqs-block-form", category: "sqsp-block" }],
]);

// Helper functions
export const getSelector = (key: string): string | null => 
  UNIFIED_SELECTOR_MAP.get(key)?.selector || null;

export const getSelectorsByCategory = (category: SelectorConfig['category']): Map<string, string | null> => {
  const result = new Map<string, string | null>();
  UNIFIED_SELECTOR_MAP.forEach((config, key) => {
    if (config.category === category) {
      result.set(key, config.selector);
    }
  });
  return result;
};

// Backward compatibility maps
export const HTML_SELECTOR_MAP = new Map<string, string | null>([
  ["html", getSelector("html")],
  ["body", getSelector("body")],
  ["header", getSelector("header")],
  ["menu", getSelector("menu")],
  ["footer", getSelector("footer")],
  ["button", getSelector("button")],
  ["link", getSelector("link")],
  ["section", getSelector("section")],
  ["LayeredSections", getSelector("LayeredSections")]
]);

export const SQSP_BLOCK_SELECTOR_MAP = new Map<string, string>([
  ["button", getSelector("sqsp-button")],
  ["image", getSelector("sqsp-image")],
  ["text", getSelector("sqsp-text")],
  ["code", getSelector("sqsp-code")],
  ["gallery", getSelector("sqsp-gallery")],
  ["video", getSelector("sqsp-video")],
  ["map", getSelector("sqsp-map")],
  ["form", getSelector("sqsp-form")],
]);

export const SQSP_ENV_SELECTOR_MAP = new Map<string,string>([
  ["DEV", "body.sqs-is-page-editing"],
  ["PROD", "body[data-env='prod']"]
]);
