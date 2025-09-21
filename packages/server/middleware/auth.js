const mongoose = require('mongoose');
const AuthorizedDomain = require('../models/AuthorizedDomain');
const Setting = require('../models/Setting');
const { extractDomain, getPluginNameFromPath } = require('./utils');
const os = require('os');



async function getAuthorizedSystemStations() {
  try {
    const setting = await Setting.findOne({ section: 'all', key: 'authorizedSystemStations' });
    if (setting && setting.value) {
      return setting.value.split(',').map(s => s.trim().toLowerCase());
    }
  } catch (error) {
    console.error('Error fetching authorized system stations:', error);
  }
  return [];
}


async function getSystemStation() {
  try {
    const hostname = os.hostname();
    
    return hostname;
  } catch (error) {
    console.error('Error fetching system stations:', error);
  }

}

async function isSystemStationAuthorized() {
  const stationId = await getSystemStation();

  if (!stationId) {
    console.error('No hostname found for system station');
    return false;
  }

  const authorizedStations = await getAuthorizedSystemStations();
  return authorizedStations.includes(stationId.toLowerCase());
}


// Main authentication middleware
async function authenticatePluginRequest(req, res, next) {
  try {


    console.log('hello!!!');
    const isSystemStation = await isSystemStationAuthorized();

    if (!isSystemStation) {
      return res.status(403).json({
        error: 'Access denied: Unauthorized system station'
      });
    }

    const referer = req.get('Referer');
    const origin = req.get('Origin');
    const userAgent = req.get('User-Agent');
    const internalUrl = req.get('X-Internal-Url'); // Custom header for internal requests
    const requestPath = req.path;

    console.log('Auth check:', {
      referer,
      origin,
      userAgent: userAgent?.substring(0, 100),
      path: requestPath,
      internalUrl
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
    const domain = extractDomain(internalUrl || referer || origin);
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

async function authenticateAdminRequest(req, res, next) {
  try {
    const isSystemStation = await isSystemStationAuthorized();
    if (!isSystemStation) {
      return res.status(403).json({
        error: 'Access denied: Unauthorized system station'
      });
    }
    next();

  }
  catch (error) {
    console.error('Admin authentication error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });

    return;
  }
  next();

}

module.exports = {
  authenticatePluginRequest,
  authenticateAdminRequest,
  AuthorizedDomain,
  extractDomain
};
