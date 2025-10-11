require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const { authenticatePluginRequest } = require('./middleware/auth');
const AuthorizedDomain = require('./models/AuthorizedDomain');
const Plugin = require('./models/Plugin');
const Order = require('./models/Order');
const Client = require('./models/Client');
const getRecentOrders = require('./lib/getRecentOrders');

const app = express();
const PORT = process.env.PORT || 3001;
const MONGODB_URI = process.env.MONGODB_URI;

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false // Disable for plugin serving
}));

// CORS configuration for plugin requests
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests) in development
    if (!origin && process.env.NODE_ENV === 'development') return callback(null, true);

    console.log('CORS check for origin:', origin);

    // Allow Squarespace domains and custom domains
    if (origin && (
      origin.includes('.squarespace.com') ||
      origin.includes('localhost') ||
      origin.includes('127.0.0.1') ||
      origin.includes(".candlelightplugins.com")
    )) {
      return callback(null, true);
    }

    console.log('made it here!')
    callback(null, true); // Allow all origins for now - auth middleware will handle specific domain checks
  },
  credentials: true
}));

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// Serve deployment manifest
app.get('/plugins/manifest', (req, res) => {
  try {
    const manifestPath = path.join(publicPath, 'deployment-manifest.json');
    if (require('fs').existsSync(manifestPath)) {
      const manifest = require(manifestPath);
      res.json(manifest);
    } else {
      res.status(404).json({ error: 'No deployment manifest found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Error reading manifest' });
  }
});

// Connect to MongoDB
mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB');
  })
  .catch((error) => {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  });

// API endpoint to get a single plugin by slug
app.get('/api/plugins/:slug', authenticatePluginRequest, async (req, res) => {
  try {
    const domain = req.authorizedDomain;
    const { slug } = req.params;



    if (!domain || !domain.pluginsAllowed || domain.pluginsAllowed.length === 0) {
      return res.status(404).json({ error: 'Plugin not found or not authorized for this domain' });
    }

    // Populate plugins and find the one with matching slug
    const domainWithPlugins = await AuthorizedDomain.findById(domain._id)
      .populate('pluginsAllowed', 'name slug displayName description bundlePath treeConfig isActive')
      .exec();



    const plugin = domainWithPlugins.pluginsAllowed.find(p => p.slug === slug && p.isActive);

    if (!plugin) {
      return res.status(404).json({ error: 'Plugin not found or not authorized for this domain' });
    }

    res.json(plugin);
  } catch (error) {
    console.error('Error fetching plugin:', error);
    res.status(500).json({ error: 'Failed to fetch plugin' });
  }
});

// API endpoint to get plugins for a domain
app.get('/api/plugins', authenticatePluginRequest, async (req, res) => {
  try {
    const domain = req.authorizedDomain;

    if (!domain || !domain.pluginsAllowed || domain.pluginsAllowed.length === 0) {
      return res.json([]);
    }

    // Populate plugins with their details
    const domainWithPlugins = await AuthorizedDomain.findById(domain._id)
      .populate('pluginsAllowed', 'name slug displayName description bundlePath treeConfig isActive')
      .exec();

    const allowedPlugins = domainWithPlugins.pluginsAllowed.filter(plugin => plugin.isActive);

    res.json(allowedPlugins);
  } catch (error) {
    console.error('Error fetching plugins:', error);
    res.status(500).json({ error: 'Failed to fetch plugins' });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Admin endpoints for managing authorized domains
app.post('/admin/domains', async (req, res) => {
  try {
    const { websiteUrl, pluginsAllowed, customerEmail, clientEmail, clientId, expiresAt, notes } = req.body;

    let client = null;
    // Prefer explicit clientId if provided
    if (clientId) {
      client = await Client.findById(clientId);
    } else if (clientEmail || customerEmail) {
      const email = (clientEmail || customerEmail).toLowerCase();
      client = await Client.findOne({ email });
      if (!client) {
        client = new Client({ email, name: null, metadata: {} });
        await client.save();
      }
    }

    const domain = new AuthorizedDomain({
      websiteUrl: websiteUrl.toLowerCase(),
      pluginsAllowed: pluginsAllowed || [],
      client: client ? client._id : undefined,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      notes
    });

    await domain.save();
    res.json({ success: true, domain });
  } catch (error) {
    console.error('Error creating domain:', error);
    res.status(400).json({ error: error.message });
  }
});

// Admin endpoint for creating plugins
app.post('/admin/plugins', async (req, res) => {
  try {
    const {
      name,
      slug,
      displayName,
      description,
      bundlePath,
      treeConfig,
      password,
      download,
      supportedPlatforms,
      squarespaceVersions,
      isActive
    } = req.body;
    console.log('hiiii!');

    const pluginData = {
      name,
      slug,
      displayName,
      description,
      bundlePath: bundlePath || `/plugins/${slug}/bundle.js`,
      treeConfig: treeConfig || null,
      supportedPlatforms: supportedPlatforms || ['desktop'],
      squarespaceVersions: squarespaceVersions || ['7.1'],
      isActive: isActive !== undefined ? isActive : true
    };

    // Add password if provided
    if (password) {
      pluginData.password = password;
    }

    // Convert base64 download data back to Buffer if provided
    if (download) {
      pluginData.download = Buffer.from(download, 'base64');
    }

    const plugin = new Plugin(pluginData);

    await plugin.save();
    res.json({ success: true, plugin });
  } catch (error) {
    console.error('Error creating plugin:', error);
    res.status(400).json({ error: error.message });
  }
});

app.get('/admin/domains', async (req, res) => {
  try {
    const domains = await AuthorizedDomain.find().sort({ createdAt: -1 });
    res.json({ domains });
  } catch (error) {
    console.error('Error fetching domains:', error);
    res.status(500).json({ error: error.message });
  }
});

app.put('/admin/domains/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Handle client updates: accept clientEmail or clientId
    if (updates.clientEmail || updates.customerEmail) {
      const email = (updates.clientEmail || updates.customerEmail).toLowerCase();
      let client = await Client.findOne({ email });
      if (!client) {
        client = new Client({ email, name: null, metadata: {} });
        await client.save();
      }
      updates.client = client._id;
      delete updates.clientEmail;
      delete updates.customerEmail;
    }

    const domain = await AuthorizedDomain.findByIdAndUpdate(id, updates, { new: true });
    if (!domain) {
      return res.status(404).json({ error: 'Domain not found' });
    }

    res.json({ success: true, domain });
  } catch (error) {
    console.error('Error updating domain:', error);
    res.status(400).json({ error: error.message });
  }
});

app.delete('/admin/domains/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const domain = await AuthorizedDomain.findByIdAndDelete(id);

    if (!domain) {
      return res.status(404).json({ error: 'Domain not found' });
    }

    res.json({ success: true, message: 'Domain deleted' });
  } catch (error) {
    console.error('Error deleting domain:', error);
    res.status(500).json({ error: error.message });
  }
});

// Orders API for storing plugin purchases
app.post('/api/orders/:id', async (req, res) => {
  try {
    const orderId = req.params.id;

    if (!orderId) {
      return res.status(400).json({ error: 'orderId is required' });
    }

    // Fetch recent orders from Squarespace and find the matching one
    const orders = await getRecentOrders();
    const found = (orders.result || orders).find(o => o.id === orderId || o.orderId === orderId);
    if (!found) return res.status(404).json({ error: 'Order not found in Squarespace recent orders' });

    // Extract relevant fields
    const clientEmail = found.customerEmail || (found.customer && found.customer.email) || (found.billingAddress && found.billingAddress.email);
    const billing = found.billingAddress || {};
    const amount = found.total || found.amount || req.body.amount;
    const currency = found.currency || req.body.currency || 'USD';
    const lineItems = Array.isArray(found.lineItems) ? found.lineItems : [];

    if (!clientEmail) return res.status(400).json({ error: 'Client email not found on Squarespace order' });

    // Helper to escape regex
    const escapeRegex = (s) => (s || '').replace(/[.*+?^${}()|[\\]\\]/g, '\\$&');

    // Resolve plugins from lineItems to ObjectId values
    const plugins = await Promise.all(found.lineItems.map(async lineItem => {
      try {
        const pluginName = lineItem.productName || lineItem.name || lineItem.productTitle;
        if (!pluginName) return null;
        const regex = new RegExp(`^${escapeRegex(pluginName)}$`, 'i');
        const pluginDoc = await Plugin.findOne({ $or: [{ displayName: regex }, { name: regex }, { slug: regex }] });
        if (!pluginDoc) return null;
        const authorizedDomain = (lineItem.customizations || []).find(c => c.label && c.label.trim().toLowerCase() === 'internal squarespace website url')?.value || null;
        return { pluginId: pluginDoc._id, authorizedDomain };
      } catch (err) {
        return null;
      }
    }));

    // Filter out any nulls
    const validPlugins = (plugins || []).filter(Boolean);
    if (validPlugins.length === 0) return res.status(404).json({ error: 'No matching plugins found' });

    // Find or create client from billingAddress
    let client = await Client.findOne({ email: clientEmail.toLowerCase() });
    if (!client) {
      client = new Client({
        email: clientEmail.toLowerCase(),
        name: `${billing.firstname || ''} ${billing.lastname || ''}`.trim() || undefined,
        firstname: billing.firstname || undefined,
        lastname: billing.lastname || undefined,
        address1: billing.address1 || undefined,
        address2: billing.address2 || undefined,
        city: billing.city || 'Mont-Royal',
        state: billing.state || 'QC',
        countryCode: billing.countryCode || 'CA',
        postalCode: billing.postalCode || 'H3R 2R2',
        phone: billing.phone || '',
        metadata: found
      });
      await client.save();
    }

    const pluginIds = validPlugins.map(p => p.pluginId);

    const orderDoc = new Order({
      orderId,
      plugins: pluginIds,
      clientId: client._id,
      amount: amount || undefined,
      currency,
      metadata: found
    });

    await orderDoc.save();


    // Update authorized domains
    await Promise.all(validPlugins.map(async ({ pluginId, authorizedDomain }) => {
      if (!authorizedDomain) return;
      const domainUrl = authorizedDomain.toLowerCase().trim();
      let domain = await AuthorizedDomain.findOne({ websiteUrl: domainUrl });
      if (!domain) {
        domain = new AuthorizedDomain({
          websiteUrl: domainUrl,
          pluginsAllowed: [pluginId],
          client: client._id
        });
      }
      else if (!domain.pluginsAllowed.map(id => id.toString()).includes(pluginId.toString())) {
        domain.pluginsAllowed.push(pluginId);
        if (!domain.client && client) {
          domain.client = client._id;
        }
      }
      await domain.save();
    }));

    res.json({ success: true, order: orderDoc, plugins: pluginIds });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/orders', async (req, res) => {
  try {

    const orders = await getRecentOrders();

    return res.json({ orders: orders });

    // const orders = await Order.find()
    //   .populate('plugin', 'name slug displayName')
    //   .sort({ createdAt: -1 });

    // res.json({ orders });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: error.message });
  }
});

// app.get('/api/orders/:id', async (req, res) => {
//   try {
//     const { id } = req.params;
//     const order = await Order.findById(id).populate('plugin', 'name slug displayName');
//     if (!order) return res.status(404).json({ error: 'Order not found' });
//     res.json({ order });
//   } catch (error) {
//     console.error('Error fetching order:', error);
//     res.status(500).json({ error: error.message });
//   }
// });

app.post("/api/orders/refresh", async (req, res) => {

  const orders = await getRecentOrders();
  console.log(orders);

  return res.status(200);
})

// Create dist directory structure if it doesn't exist
const distPath = path.join(__dirname, 'dist', 'public');
const fs = require('fs');

// Create main dist directory
if (!fs.existsSync(distPath)) {
  fs.mkdirSync(distPath, { recursive: true });
}

// Create plugin subdirectories
const pluginDirs = ['mouse-follower', 'layered-sections', 'magnetic-button', 'image-trailer', 'blob-revealer'];
pluginDirs.forEach(dir => {
  const pluginPath = path.join(distPath, dir);
  if (!fs.existsSync(pluginPath)) {
    fs.mkdirSync(pluginPath, { recursive: true });
  }
});

// Serve protected plugin files with authentication
app.use('/plugins', authenticatePluginRequest, express.static(distPath, {
  setHeaders: (res, path) => {
    // Set appropriate headers for JavaScript files
    if (path.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript');
    }

    // Cache control
    res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
  }
}));

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    path: req.path
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Plugin auth server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`MongoDB URI: ${MONGODB_URI}`);
  console.log(`Plugin files served from: ${distPath}`);
});