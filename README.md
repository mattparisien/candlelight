# Squarespace Plugins Monorepo

A comprehensive monorepo containing Squarespace plugins and their supporting authentication server.

## 📁 Project Structure

```
sqsp-plugins-monorepo/
├── packages/
│   ├── plugins/           # Frontend plugin development workspace
│   │   ├── src/
│   │   │   ├── plugins/   # Individual plugin implementations
│   │   │   │   ├── LayeredSections/
│   │   │   │   ├── MagneticButton/
│   │   │   │   ├── MouseFollower/
│   │   │   │   └── ImageTrailer/
│   │   │   ├── assets/    # Shared assets
│   │   │   └── index.html # Development template
│   │   ├── scripts/       # Build and generation scripts
│   │   ├── webpack.config.js
│   │   └── package.json
│   └── server/            # Authentication server
│       ├── middleware/    # Express middleware
│       ├── scripts/       # Server utility scripts
│       ├── server.js      # Main server file
│       └── package.json
├── package.json           # Root package.json with workspace config
└── README.md             # This file
```

## 🚀 Getting Started

### Prerequisites

- Node.js >= 16.0.0
- npm >= 8.0.0

### Installation

1. **Install all dependencies** (root + workspaces):
   ```bash
   npm run install-all
   ```

   Or use the standard approach:
   ```bash
   npm install
   ```

### Development

#### Start both services simultaneously:
```bash
npm run dev
```

#### Or run services individually:

**Frontend Plugins Development:**
```bash
npm run dev:plugins
```
- Starts webpack dev server on `http://localhost:3000`
- Hot reload enabled for rapid development
- TypeScript compilation with source maps

**Authentication Server:**
```bash
npm run dev:server
```
- Starts Express server (check server package.json for port)
- Auto-restart on file changes via nodemon

### Building

**Build plugins for production:**
```bash
npm run build
# or specifically
npm run build:plugins
```

**Deploy plugins to server:**
```bash
# Build and deploy in one command
npm run build:deploy

# Or separately
npm run deploy:plugins
```

**Start production server:**
```bash
npm run start:server
```

## 🔧 Plugin Development

### Creating New Plugins

Generate a new plugin structure:
```bash
npm run create-plugin
```

Generate a plugin mixin:
```bash
npm run create-plugin-mixin
```

### Available Plugins

- **LayeredSections**: Interactive masking with SVG reveals
- **MagneticButton**: Magnetic hover effects
- **MouseFollower**: Custom cursor following effects  
- **ImageTrailer**: Image trailing cursor effects

### Plugin Architecture

Each plugin follows a consistent structure:
```
PluginName/
├── index.ts           # Plugin entry point
├── model.ts           # Main plugin logic
└── assets/
    ├── styles/
    │   └── main.scss  # Plugin-specific styles
    └── fonts/         # Plugin-specific fonts
```

## 🏗️ Technology Stack

### Frontend (packages/plugins)
- **TypeScript** - Type safety and modern JavaScript features
- **Webpack 5** - Module bundling and development server
- **SCSS** - Enhanced CSS with variables and nesting
- **PostCSS** - CSS processing with Tailwind CSS support
- **Three.js** - 3D graphics and WebGL
- **GSAP** - High-performance animations

### Backend (packages/server)
- **Node.js** - JavaScript runtime
- **Express** - Web application framework
- **Mongoose** - MongoDB object modeling
- **CORS** - Cross-origin resource sharing
- **Helmet** - Security middleware

## 📋 Available Scripts

### Root Level Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start both plugins and server in development mode |
| `npm run dev:plugins` | Start only plugin development server |
| `npm run dev:server` | Start only authentication server |
| `npm run build` | Build plugins for production |
| `npm run build:production` | Build plugins and deploy for production |
| `npm run deploy:plugins` | Deploy built plugins to server |
| `npm run build:deploy` | Build and deploy plugins in one command |
| `npm run install-all` | Install dependencies for all workspaces |
| `npm run clean` | Remove all node_modules and dist directories |

### Plugin-Specific Commands

| Command | Description |
|---------|-------------|
| `npm run create-plugin` | Generate new plugin boilerplate |
| `npm run create-plugin-mixin` | Generate plugin mixin structure |
| `npm run build-plugins` | Build all plugins |

## 🔒 Environment Configuration

### Plugins (.env)
```env
BASE_URL=http://localhost:3000
```

### Server (.env)
```env
# Add your server environment variables here
MONGODB_URI=mongodb://localhost:27017/plugins
PORT=3001
```

## 🚢 Deployment

### Railway (Recommended)

1. **Push to GitHub and connect Railway**
2. **Set initial environment variables in Railway dashboard:**
   ```
   NODE_ENV=production
   MONGODB_URI=mongodb+srv://your-atlas-connection
   PORT=3001
   BASE_URL=https://temporary-url.railway.app  # Will update this in step 4
   ```
3. **Railway will automatically build and deploy**
4. **Get your actual Railway URL** from the Deployments tab
   - Format: `https://your-project-production.up.railway.app`
5. **Update BASE_URL** environment variable with your actual URL
6. **Railway will auto-redeploy** with the correct URL

The deployment process:
- Installs all dependencies
- Builds plugins for production
- Deploys plugins to server static directory
- Starts the Express server

### Frontend Plugins
- Built files are output to `packages/plugins/dist/`
- Can be deployed to any static hosting service (Netlify, Vercel, etc.)
- Netlify configuration included (`netlify.toml`)

### Backend Server
- Deployed with Railway, Render, or any Node.js hosting
- Serves both API endpoints and static plugin files
- Health check endpoint at `/health`
- Plugin files served at `/plugins/*`

## 🤝 Contributing

1. Create a new branch for your feature
2. Make your changes in the appropriate package
3. Test your changes locally
4. Submit a pull request

## 📝 Development Notes

- **Hot Reload**: Both frontend and backend support hot reloading
- **TypeScript**: Full TypeScript support with proper type checking
- **Shared Dependencies**: Common dependencies are hoisted to the root level
- **Independent Versioning**: Each package can be versioned independently
- **Cross-Package Dependencies**: Packages can depend on each other using workspace protocol

## 🐛 Troubleshooting

### Common Issues

**Dependencies not installing:**
```bash
npm run clean
npm run install-all
```

**Port conflicts:**
- Check if ports 3000 (frontend) or 3001 (server) are in use
- Modify port settings in respective package.json files

**TypeScript errors:**
- Ensure all packages have their dependencies installed
- Check tsconfig.json settings in packages/plugins/

## 📄 License

ISC License - See individual package.json files for details.
