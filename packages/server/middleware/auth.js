const mongoose = require('mongoose');
const AuthorizedDomain = require('../models/AuthorizedDomain');

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




// Main authentication middleware
async function authenticateRequest(req, res, next) {
  try {
    const referer = req.get('Referer');
    const origin = req.get('Origin');
    const userAgent = req.get('User-Agent');
    const requestPath = req.path;

    console.log('the path', requestPath);

    console.log('Auth check:', {
      referer,
      origin,
      userAgent: userAgent?.substring(0, 100),
      path: requestPath
    });

    // Allow localhost for development
    if (process.env.NODE_ENV === 'development') {
      const isLocalhost = referer?.includes('localhost') ||
        referer?.includes('127.0.0.1') ||
        origin?.includes('localhost') ||
        origin?.includes('127.0.0.1');

      if (isLocalhost) {
        console.log('Development: allowing localhost request');
        // Find localhost domain for API endpoints
        if (requestPath.startsWith('/api/')) {
          const localhostDomain = await AuthorizedDomain.findOne({ websiteUrl: 'localhost' });
          if (localhostDomain) {
            req.authorizedDomain = localhostDomain;
          }
        }
        return next();
      }
    }

    // Extract domain from referer or origin
    const domain = extractDomain(referer || origin);
    console.log('Extracted domain:', domain);
    if (!domain) {
      console.log('No valid domain found in request');
      return res.status(403).json({
        error: 'Access denied: Invalid or missing referer'
      });
    }

    // Get plugin slug from request path (skip for API routes)
    let pluginSlug = null;
    if (!requestPath.startsWith('/api/')) {
      pluginSlug = getPluginNameFromPath(requestPath);
      console.log('the plugin slug', pluginSlug);
      if (!pluginSlug) {
        console.log('Could not determine plugin slug from path:', requestPath);
        return res.status(403).json({
          error: 'Access denied: Invalid plugin request'
        });
      }
    }

    // Check database for authorized domain

    const domains = await AuthorizedDomain.find({});
    console.log('Authorized domains in DB:', domains.map(d => d.websiteUrl));
    

    const authorizedDomain = await AuthorizedDomain.findOne({
      websiteUrl: domain,
      status: 'active'
    }).populate('pluginsAllowed');

    if (!authorizedDomain) {
      console.log('Domain not found or not active:', domain);
      return res.status(403).json({
        error: 'Access denied: Unauthorized domain',
        domain: domain
      });
    }

    // Check if domain has access to this specific plugin (skip for API routes)
    console.log('the plugin slug is', pluginSlug);
    console.log('the authorized domain plugin slugs are', authorizedDomain.pluginsAllowed.map(p => p.slug));
    const allowedPluginSlugs = authorizedDomain.pluginsAllowed.map(p => p.slug);
    if (pluginSlug && !allowedPluginSlugs.includes(pluginSlug)) {
      console.log('Domain does not have access to plugin:', domain, pluginSlug);
      return res.status(403).json({
        error: 'Access denied: Plugin not authorized for this domain',
        domain: domain,
        plugin: pluginSlug
      });
    }

    // Check expiration if set
    if (authorizedDomain.expiresAt && new Date() > authorizedDomain.expiresAt) {
      console.log('Domain access expired:', domain);
      return res.status(403).json({
        error: 'Access denied: License expired',
        domain: domain
      });
    }

    console.log('Access granted:', domain, pluginSlug);
    
    // Set the authorized domain on the request for API endpoints
    req.authorizedDomain = authorizedDomain;
    
    next();

  } catch (error) {
    console.error('Authentication middleware error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
}

module.exports = {
  authenticateRequest,
  AuthorizedDomain,
  extractDomain
};
