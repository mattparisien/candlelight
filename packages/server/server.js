const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const { authenticateRequest, AuthorizedDomain } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3001;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/plugin-auth';

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
    
    // Allow Squarespace domains and custom domains
    if (origin && (
      origin.includes('.squarespace.com') || 
      origin.includes('localhost') ||
      origin.includes('127.0.0.1')
    )) {
      return callback(null, true);
    }
    
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
    const { websiteUrl, pluginsAllowed, customerEmail, expiresAt, notes } = req.body;
    
    const domain = new AuthorizedDomain({
      websiteUrl: websiteUrl.toLowerCase(),
      pluginsAllowed: pluginsAllowed || [],
      customerEmail,
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
app.use('/plugins', (req, res, next) => {
  console.log(`🔐 Starting auth check for: ${req.path}`);
  next();
}, authenticateRequest, (req, res, next) => {
  console.log(`🎉 Authentication passed for: ${req.path}`);
  const filePath = path.join(distPath, req.path.replace('/plugins', ''));
  
  if (fs.existsSync(filePath)) {
    console.log(`✅ File found and serving: ${req.path} -> ${filePath}`);
  } else {
    console.log(`❌ File not found: ${req.path} -> ${filePath}`);
  }
  
  next();
}, express.static(distPath, {
  setHeaders: (res, path) => {
    console.log(`📤 Serving file: ${path}`);
    
    // Set appropriate headers for JavaScript files
    if (path.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript');
    }
    
    // Disable all caching
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
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