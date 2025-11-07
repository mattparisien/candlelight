import { Plugin } from '../ts/types';

class PluginDataService {
  private static instance: PluginDataService;
  private plugins: Plugin[] | null = null;
  private baseUrl: string;

  private constructor() {
    // Determine the base URL for API calls
    this.baseUrl = this.getBaseUrl();
  }

  static getInstance(): PluginDataService {
    if (!PluginDataService.instance) {
      PluginDataService.instance = new PluginDataService();
    }
    return PluginDataService.instance;
  }

  private getBaseUrl(): string {
    // Check if we're in development or production
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return 'http://localhost:3001';
    }

    const baseUrl = process.env.PLUGIN_SERVER_URL || 'https://sqsp-pluginsserver-production.up.railway.app';
    return baseUrl;
  }

  private nameToSlug(name: string): string {
    // Convert plugin name to kebab-case slug
    return name.replace(/([A-Z])/g, '-$1').toLowerCase().substring(1);
  }

  async getPlugins(): Promise<Plugin[]> {
    if (this.plugins) {
      return this.plugins;
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/plugins`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch plugins: ${response.status}`);
      }

      const pluginsData: Plugin[] = await response.json();

      // Map plugins and add module loaders dynamically
      this.plugins = pluginsData.map(plugin => ({
        ...plugin,
        treeConfig: plugin.treeConfig,
        module: this.createModuleLoader(plugin.name)
      }));

      return this.plugins;
    } catch (error) {
      console.error('Error fetching plugins:', error);
      // Fallback to empty array if API fails
      return [];
    }
  }

  private createModuleLoader(pluginName: string): () => Promise<any> {
    return async () => {
      try {
        // Dynamic import based on plugin name
        switch (pluginName) {
          case 'MagneticButton':
            return import('../../MagneticButton/model');
          case 'MouseFollower':
            return import('../../MouseFollower/model');
          case 'ImageTrailer':
            return import('../../ImageTrailer/model');
          case 'LayeredSections':
            return import('../../LayeredSections/model');
          case 'ShuffledTextLink':
            return import('../../ShuffledTextLink/model');
          default:
            console.warn(`Plugin ${pluginName} module not found, skipping...`);
            return null;
        }
      } catch (error) {
        console.error(`Failed to load module for plugin ${pluginName}:`, error);
        throw error;
      }
    };
  }

  async fetchPluginByName(pluginName: string, internalUrl?: string): Promise<Plugin | undefined> {
    try {
      const slug = this.nameToSlug(pluginName);
      const response = await fetch(`https://candlelightplugins.dev/api/plugins/${slug}`, {
        credentials: 'include',
        headers: {
          'X-Internal-Url': internalUrl,
          'Content-Type': 'application/json',
        },
      });

      if (response.status === 404) {
        return undefined;
      }

      if (!response.ok) {
        throw new Error(`Failed to fetch plugin ${pluginName}: ${response.status}`);
      }

      const pluginData: Plugin = await response.json();

      // Add module loader dynamically
      const pluginWithModule = {
        ...pluginData,
        treeConfig: pluginData.treeConfig,
        module: this.createModuleLoader(pluginData.name)
      };

      return pluginWithModule;
    } catch (error) {
      console.error(`Error fetching plugin ${pluginName}:`, error);
      return undefined;
    }
  }

  getPluginByName(pluginName: string): Plugin | undefined {
    return this.plugins?.find(plugin => plugin.name.trim() === pluginName.trim());
  }

  // Clear cache (useful for development)
  clearCache(): void {
    this.plugins = null;
  }
}

export default PluginDataService.getInstance();
