# 🎨 Plugin Integration Guide for Squarespace

## How to Add Plugins to Your Squarespace Site

### Step 1: Get Your Plugin URLs

Your plugins are hosted at: `https://your-app.railway.app/plugins/`

**Available Plugins:**
- **LayeredSections**: Interactive masking with SVG reveals
- **MagneticButton**: Magnetic hover effects  
- **MouseFollower**: Custom cursor following effects
- **ImageTrailer**: Image trailing cursor effects

### Step 2: Add to Squarespace Code Injection

1. **Go to:** Settings → Advanced → Code Injection
2. **Add CSS to Header:**

```html
<!-- LayeredSections Plugin Styles -->
<link rel="stylesheet" href="https://your-app.railway.app/plugins/layered-sections/assets/styles/main.css">

<!-- MouseFollower Plugin Styles -->
<link rel="stylesheet" href="https://your-app.railway.app/plugins/mouse-follower/assets/styles/main.css">

<!-- ImageTrailer Plugin Styles -->
<link rel="stylesheet" href="https://your-app.railway.app/plugins/image-trailer/assets/styles/main.css">
```

3. **Add JavaScript to Footer:**

```html
<!-- Plugin Scripts -->
<script src="https://your-app.railway.app/plugins/layered-sections/bundle.js"></script>
<script src="https://your-app.railway.app/plugins/magnetic-button/bundle.js"></script>
<script src="https://your-app.railway.app/plugins/mouse-follower/bundle.js"></script>
<script src="https://your-app.railway.app/plugins/image-trailer/bundle.js"></script>

<!-- Initialize Plugins -->
<script>
document.addEventListener('DOMContentLoaded', function() {
  // LayeredSections - Add data attribute to sections you want to affect
  const layeredSections = document.querySelector('[data-candlelight-plugin-layered-sections]');
  if (layeredSections) {
    new LayeredSections(layeredSections, {
      // Plugin options here
    });
  }
  
  // MagneticButton - Automatically applies to elements with data attribute
  const magneticButtons = document.querySelectorAll('[data-candlelight-plugin-magnetic-button]');
  magneticButtons.forEach(button => {
    new MagneticButton(button, {
      // Plugin options here
    });
  });
  
  // MouseFollower - Add to body or specific containers
  const mouseFollower = document.querySelector('[data-candlelight-plugin-mouse-follower]');
  if (mouseFollower) {
    new MouseFollower(mouseFollower, {
      // Plugin options here
    });
  }
  
  // ImageTrailer - Add to elements you want to have image trailing
  const imageTrailers = document.querySelectorAll('[data-candlelight-plugin-image-trailer]');
  imageTrailers.forEach(element => {
    new ImageTrailer(element, {
      // Plugin options here
    });
  });
});
</script>
```

### Step 3: Add Data Attributes to Your Content

Add these data attributes to the HTML elements where you want plugins to work:

#### LayeredSections
```html
<!-- Add to a section or container -->
<section data-candlelight-plugin-layered-sections>
  <!-- Your content here -->
</section>
```

#### MagneticButton  
```html
<!-- Add to buttons -->
<button data-candlelight-plugin-magnetic-button>
  Click me!
</button>
```

#### MouseFollower
```html
<!-- Add to body or container -->
<div data-candlelight-plugin-mouse-follower>
  <!-- Content where mouse following should work -->
</div>
```

#### ImageTrailer
```html
<!-- Add to elements that should have trailing images -->
<div data-candlelight-plugin-image-trailer>
  Hover over me for image trail
</div>
```

### Step 4: Verify Installation

Check that plugins are loading:
1. Open browser developer tools (F12)
2. Go to Network tab
3. Refresh your site
4. Look for successful loading of plugin files from your domain

### 🔒 Authentication

Your server checks if the requesting domain is authorized. Make sure your Squarespace site domain is added to the allowed domains list using:

```bash
npm run domains:add
```

### 📋 Plugin File Structure

Your server serves these files:

```
https://your-app.railway.app/plugins/
├── layered-sections/
│   ├── bundle.js
│   └── assets/styles/main.css
├── magnetic-button/
│   └── bundle.js  
├── mouse-follower/
│   ├── bundle.js
│   └── assets/styles/main.css
├── image-trailer/
│   ├── bundle.js
│   └── assets/styles/main.css
└── manifest (deployment info)
```

### 🎯 Complete Example for One Plugin

Here's a complete example for adding LayeredSections:

**Header Code Injection:**
```html
<link rel="stylesheet" href="https://your-app.railway.app/plugins/layered-sections/assets/styles/main.css">
```

**Footer Code Injection:**
```html
<script src="https://your-app.railway.app/plugins/layered-sections/bundle.js"></script>
<script>
document.addEventListener('DOMContentLoaded', function() {
  const container = document.querySelector('[data-candlelight-plugin-layered-sections]');
  if (container) {
    new LayeredSections(container, {
      // Add any plugin-specific options here
    });
  }
});
</script>
```

**In your Squarespace content:**
```html
<!-- Add this data attribute to sections you want to affect -->
<section data-candlelight-plugin-layered-sections>
  <div class="content">Your section content here</div>
</section>
```

### 🚨 Important Notes

1. **Domain Authorization**: Your Squarespace domain must be in the authorized domains list
2. **HTTPS Only**: Plugins must be loaded over HTTPS in production
3. **Load Order**: CSS in header, JavaScript in footer for best performance
4. **Data Attributes**: Required for plugins to target the correct elements

### 🔍 Troubleshooting

- **Plugin not loading**: Check browser console for CORS errors
- **No effect**: Verify data attributes are correct
- **Style issues**: Ensure CSS is loaded in header before content renders
