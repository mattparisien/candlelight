# Plugin Authentication Server

This server provides URL-based authentication for Squarespace plugins. It validates requests based on the referring domain and serves plugin files only to authorized websites.

## Setup

1. **Install dependencies:**
   ```bash
   cd plugin-auth-server
   npm install
   ```

2. **Install MongoDB** (if not already installed):
   ```bash
   # macOS with Homebrew
   brew install mongodb-community
   brew services start mongodb/brew/mongodb-community
   ```

3. **Configure environment:**
   - Copy `.env` and update MongoDB connection if needed
   - Default connects to `mongodb://localhost:27017/plugin-auth`

4. **Start the server:**
   ```bash
   npm run dev  # Development with auto-restart
   npm start    # Production
   ```

## Usage

### Adding Authorized Domains

Use the admin endpoints or the management script:

```bash
# Add a test domain
node scripts/manage-domains.js add

# List all domains
node scripts/manage-domains.js list
```

Or use the REST API:

```bash
# Add a domain
curl -X POST http://localhost:3001/admin/domains \
  -H "Content-Type: application/json" \
  -d '{
    "websiteUrl": "mysite.squarespace.com",
    "pluginsAllowed": ["MouseFollower", "LayeredSections"],
    "customerEmail": "customer@example.com"
  }'

# List domains
curl http://localhost:3001/admin/domains
```

### Serving Plugin Files

1. **Copy built plugins** to the appropriate subdirectories in `dist/`:
   ```bash
   # Create the structure and copy files
   mkdir -p dist/mouse-follower
   mkdir -p dist/layered-sections
   mkdir -p dist/magnetic-button
   
   cp ../dist/mouse-follower.js ./dist/mouse-follower/main.js
   cp ../dist/layered-sections.js ./dist/layered-sections/main.js
   cp ../dist/magnetic-button.js ./dist/magnetic-button/main.js
   ```

2. **Plugin requests** are served from `/plugins/{pluginName}/main.js`:
   - `http://localhost:3001/plugins/mouse-follower/main.js`
   - `http://localhost:3001/plugins/layered-sections/main.js`
   - `http://localhost:3001/plugins/magnetic-button/main.js`

### How Authentication Works

1. **Request comes in** for a plugin file (e.g., `/plugins/mouse-follower/main.js`)
2. **Middleware extracts domain** from `Referer` or `Origin` headers
3. **Database check** verifies domain is authorized for this plugin
4. **File served** if authorized, 403 error if not

### Plugin Integration

In your Squarespace site, reference plugins from your auth server:

```html
<!-- MouseFollower plugin -->
<script src="https://your-server.com/plugins/mouse-follower/main.js" 
        data-radius="20" 
        data-color="#ff0000" 
        data-speed="0.1">
</script>

<!-- LayeredSections plugin -->
<script src="https://your-server.com/plugins/layered-sections/main.js"
        data-radius="80"
        data-blur="3">
</script>
```

## API Endpoints

- `GET /health` - Health check
- `POST /admin/domains` - Add authorized domain
- `GET /admin/domains` - List all domains  
- `PUT /admin/domains/:id` - Update domain
- `DELETE /admin/domains/:id` - Remove domain
- `GET /plugins/*` - Serve protected plugin files

## Security Features

- **Domain validation** - Only authorized domains can load plugins
- **Plugin-specific access** - Control which plugins each domain can use
- **Expiration dates** - Set license expiration
- **Status management** - Active/expired/suspended states
- **Development mode** - Allows localhost for testing
- **CORS protection** - Proper cross-origin handling
- **Helmet security** - Basic security headers

## Environment Variables

- `MONGODB_URI` - MongoDB connection string
- `PORT` - Server port (default: 3001)
- `NODE_ENV` - Environment (development/production)

## Database Schema

```javascript
{
  websiteUrl: "mysite.squarespace.com",
  pluginsAllowed: ["MouseFollower", "LayeredSections"],
  status: "active", // active|expired|suspended
  customerEmail: "customer@example.com",
  purchaseDate: "2024-01-01",
  expiresAt: null, // null = no expiration
  notes: "Customer notes"
}
```
