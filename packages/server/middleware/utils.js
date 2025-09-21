// Helper function to extract and normalize domain from URL
function extractDomain(url) {
  if (!url) return null;

  try {
    const parsed = new URL(url);
    let hostname = parsed.hostname.toLowerCase();

    return hostname
      .replace("www.", "")
      .replace("http://", "")
      .replace("https://", "")
      .replace(/\/$/, "") // Remove trailing slash
      .trim();

  } catch (error) {
    console.error('Error parsing URL:', url, error);
    return null;
  }
}

// Helper function to get plugin name from request path
function getPluginNameFromPath(path) {
  // Handle format: /plugins/{pluginName}/main.js
  const pathParts = path.split('/');
  let pluginFolder;

  if (path.includes("/plugins/")) {
    // Find the segment after /plugins/
    const pluginIndex = pathParts.indexOf('plugins');
    if (pluginIndex !== -1 && pathParts.length > pluginIndex + 1) {
      pluginFolder = pathParts[pluginIndex + 1];
    }
  } else {
    // Handle format: /{pluginName}/bundle.js
    pluginFolder = pathParts[1]; // First segment after root
  }

  console.log('Extracted plugin folder:', pluginFolder);

  if (!pluginFolder) {
    return null;
  }

  // Return the folder name as slug (kebab-case)
  return pluginFolder.toLowerCase();
}

module.exports = {
  extractDomain,
  getPluginNameFromPath
};