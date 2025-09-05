const mongoose = require('mongoose');

// MongoDB Schema for authorized domains
const authorizedDomainSchema = new mongoose.Schema({
  websiteUrl: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  pluginsAllowed: [{
    type: String,
    enum: ['MouseFollower', 'LayeredSections', 'MagneticButton', 'ImageTrailer', 'BlobRevealer']
  }],
  status: {
    type: String,
    enum: ['active', 'expired', 'suspended'],
    default: 'active'
  },
  purchaseDate: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date,
    default: null // null means no expiration
  },
  customerEmail: String,
  notes: String
}, {
  timestamps: true
});

const AuthorizedDomain = mongoose.model('AuthorizedDomain', authorizedDomainSchema);

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
    pluginFolder = pathParts[0]; // First segment after root
  }

  console.log('Extracted plugin folder:', pluginFolder);

  if (!pluginFolder) {
    return null;
  }

  // Convert folder names to plugin names
  switch (pluginFolder.toLowerCase()) {
    case 'mouse-follower':
    case 'mousefollower':
      return 'MouseFollower';
    case 'layered-sections':
    case 'layeredsections':
      return 'LayeredSections';
    case 'magnetic-button':
    case 'magneticbutton':
      return 'MagneticButton';
    case 'image-trailer':
    case 'imagetrailer':
      return 'ImageTrailer';
    case 'blob-revealer':
    case 'blobrevealer':
      return 'BlobRevealer';
    default:
      // Try to convert kebab-case to PascalCase
      return pluginFolder
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join('');
  }
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

    // Get plugin name from request path
    const pluginName = getPluginNameFromPath(requestPath);
    console.log('Plugin requested:', pluginName);
    if (!pluginName) {
      console.log('Could not determine plugin name from path:', requestPath);
      return res.status(403).json({
        error: 'Access denied: Invalid plugin request'
      });
    }

    // Check database for authorized domain
    const authorizedDomain = await AuthorizedDomain.findOne({
      websiteUrl: domain,
      status: 'active'
    });

    if (!authorizedDomain) {
      console.log('Domain not found or not active:', domain);
      return res.status(403).json({
        error: 'Access denied: Unauthorized domain',
        domain: domain
      });
    }

    // Check if domain has access to this specific plugin
    if (!authorizedDomain.pluginsAllowed.includes(pluginName)) {
      console.log('Domain does not have access to plugin:', domain, pluginName);
      return res.status(403).json({
        error: 'Access denied: Plugin not authorized for this domain',
        domain: domain,
        plugin: pluginName
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

    console.log('Access granted:', domain, pluginName);
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
