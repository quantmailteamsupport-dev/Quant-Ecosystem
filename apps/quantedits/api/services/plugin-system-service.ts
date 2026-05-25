// ============================================================================
// QuantEdits - Plugin System Service
// Plugin loading, marketplace, sandboxed execution, permissions
// ============================================================================

interface Plugin {
  id: string;
  name: string;
  version: string;
  author: string;
  description: string;
  category: 'effects' | 'transitions' | 'audio' | 'color' | 'automation' | 'export' | 'utility';
  permissions: PluginPermission[];
  status: 'active' | 'inactive' | 'disabled' | 'error';
  size: number;
  downloads: number;
  rating: number;
  entryPoint: string;
  config: Record<string, any>;
  installedAt?: string;
  lastUsed?: string;
}

type PluginPermission = 'read_media' | 'write_media' | 'network' | 'filesystem' | 'gpu' | 'ui_panel' | 'settings';

interface PluginExecution {
  id: string;
  pluginId: string;
  input: Record<string, any>;
  output: Record<string, any>;
  duration: number;
  memoryUsed: number;
  status: 'running' | 'completed' | 'failed' | 'timeout';
  error?: string;
  startedAt: string;
  completedAt?: string;
}

interface MarketplaceListing {
  id: string;
  pluginId: string;
  name: string;
  author: string;
  description: string;
  price: number;
  isFree: boolean;
  category: Plugin['category'];
  downloads: number;
  rating: number;
  reviews: number;
  screenshots: string[];
  lastUpdated: string;
  compatibility: string[];
}

interface PluginValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
  permissions: PluginPermission[];
  securityScore: number;
  sizeBytes: number;
}

class PluginSystemService {
  private plugins: Map<string, Plugin> = new Map();
  private executions: Map<string, PluginExecution> = new Map();
  private marketplace: Map<string, MarketplaceListing> = new Map();
  private installedPlugins: Map<string, string[]> = new Map();
  private counter: number = 0;

  constructor() {
    this.initMarketplace();
  }

  private genId(prefix: string): string {
    return `${prefix}_${Date.now().toString(36)}_${(++this.counter).toString(36)}`;
  }

  private initMarketplace(): void {
    const listings = [
      { name: 'Auto Color Grade', category: 'color' as const, price: 0, desc: 'AI-powered color grading' },
      { name: 'Smooth Transitions Pack', category: 'transitions' as const, price: 9.99, desc: '50+ smooth transitions' },
      { name: 'Audio Visualizer', category: 'audio' as const, price: 4.99, desc: 'Real-time audio visualization' },
      { name: 'Batch Exporter Pro', category: 'export' as const, price: 14.99, desc: 'Multi-format batch export' },
      { name: 'Glitch Effects', category: 'effects' as const, price: 0, desc: 'Retro glitch effect pack' },
      { name: 'Smart Crop', category: 'automation' as const, price: 7.99, desc: 'AI-based smart cropping' },
      { name: 'LUT Generator', category: 'color' as const, price: 12.99, desc: 'Create custom LUTs' },
      { name: 'Subtitle Tool', category: 'utility' as const, price: 0, desc: 'Auto subtitle generation' },
    ];

    listings.forEach((l, i) => {
      const listing: MarketplaceListing = {
        id: `ml_${i}`, pluginId: `plug_${i}`, name: l.name, author: `Developer ${i + 1}`,
        description: l.desc, price: l.price, isFree: l.price === 0, category: l.category,
        downloads: Math.floor(1000 + Math.random() * 50000), rating: 3.5 + Math.random() * 1.5,
        reviews: Math.floor(50 + Math.random() * 500),
        screenshots: [`https://cdn.quant.edits/plugins/${i}/ss1.jpg`, `https://cdn.quant.edits/plugins/${i}/ss2.jpg`],
        lastUpdated: new Date(Date.now() - Math.random() * 90 * 86400000).toISOString(),
        compatibility: ['QuantEdits 2.0+'],
      };
      this.marketplace.set(listing.id, listing);
    });
  }

  async loadPlugin(pluginId: string, userId: string): Promise<Plugin> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) throw new Error('Plugin not found');
    if (plugin.status === 'error') throw new Error('Plugin has errors, cannot load');

    plugin.status = 'active';
    plugin.lastUsed = new Date().toISOString();
    return plugin;
  }

  async unloadPlugin(pluginId: string): Promise<boolean> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) throw new Error('Plugin not found');
    plugin.status = 'inactive';
    return true;
  }

  async listPlugins(category?: Plugin['category'], userId?: string): Promise<Plugin[]> {
    let plugins = Array.from(this.plugins.values());
    if (category) plugins = plugins.filter(p => p.category === category);
    if (userId) {
      const installed = this.installedPlugins.get(userId) || [];
      plugins = plugins.filter(p => installed.includes(p.id));
    }
    return plugins;
  }

  async search(query: string, category?: Plugin['category']): Promise<MarketplaceListing[]> {
    let results = Array.from(this.marketplace.values());
    if (query) results = results.filter(l => l.name.toLowerCase().includes(query.toLowerCase()) || l.description.toLowerCase().includes(query.toLowerCase()));
    if (category) results = results.filter(l => l.category === category);
    return results.sort((a, b) => b.downloads - a.downloads);
  }

  async getMarketplace(opts?: { category?: Plugin['category']; sort?: 'popular' | 'recent' | 'rating'; limit?: number }): Promise<MarketplaceListing[]> {
    let listings = Array.from(this.marketplace.values());
    if (opts?.category) listings = listings.filter(l => l.category === opts.category);
    if (opts?.sort === 'rating') listings.sort((a, b) => b.rating - a.rating);
    else if (opts?.sort === 'recent') listings.sort((a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime());
    else listings.sort((a, b) => b.downloads - a.downloads);
    return listings.slice(0, opts?.limit || 20);
  }

  async installPlugin(listingId: string, userId: string): Promise<Plugin> {
    const listing = this.marketplace.get(listingId);
    if (!listing) throw new Error('Listing not found');

    const plugin: Plugin = {
      id: listing.pluginId, name: listing.name, version: '1.0.0', author: listing.author,
      description: listing.description, category: listing.category,
      permissions: ['read_media', 'write_media'], status: 'inactive',
      size: 50000 + Math.floor(Math.random() * 500000), downloads: listing.downloads,
      rating: listing.rating, entryPoint: `plugins/${listing.pluginId}/index.js`,
      config: {}, installedAt: new Date().toISOString(),
    };

    this.plugins.set(plugin.id, plugin);
    const userPlugins = this.installedPlugins.get(userId) || [];
    userPlugins.push(plugin.id);
    this.installedPlugins.set(userId, userPlugins);
    listing.downloads++;

    return plugin;
  }

  async uninstallPlugin(pluginId: string, userId: string): Promise<boolean> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) throw new Error('Plugin not found');

    plugin.status = 'disabled';
    const userPlugins = this.installedPlugins.get(userId) || [];
    const idx = userPlugins.indexOf(pluginId);
    if (idx >= 0) userPlugins.splice(idx, 1);
    this.installedPlugins.set(userId, userPlugins);
    return true;
  }

  async validatePlugin(pluginData: { name: string; code: string; permissions: PluginPermission[] }): Promise<PluginValidation> {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!pluginData.name || pluginData.name.length < 3) errors.push('Plugin name must be at least 3 characters');
    if (!pluginData.code || pluginData.code.length < 50) errors.push('Plugin code is too short');
    if (pluginData.permissions.includes('network')) warnings.push('Network access requested - review carefully');
    if (pluginData.permissions.includes('filesystem')) warnings.push('Filesystem access requested - potential security risk');

    const dangerousPatterns = ['eval(', 'Function(', 'child_process', 'require('];
    for (const pattern of dangerousPatterns) {
      if (pluginData.code.includes(pattern)) errors.push(`Dangerous pattern found: ${pattern}`);
    }

    const securityScore = Math.max(0, 100 - errors.length * 30 - warnings.length * 10);

    return { valid: errors.length === 0, errors, warnings, permissions: pluginData.permissions, securityScore, sizeBytes: pluginData.code.length };
  }

  async sandboxExec(pluginId: string, input: Record<string, any>): Promise<PluginExecution> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) throw new Error('Plugin not found');
    if (plugin.status !== 'active') throw new Error('Plugin is not active');

    const execution: PluginExecution = {
      id: this.genId('exec'),
      pluginId,
      input,
      output: { result: 'processed', type: plugin.category, timestamp: Date.now() },
      duration: Math.floor(50 + Math.random() * 500),
      memoryUsed: Math.floor(1000000 + Math.random() * 50000000),
      status: 'completed',
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
    };

    this.executions.set(execution.id, execution);
    return execution;
  }

  async getPermissions(pluginId: string): Promise<{ permissions: PluginPermission[]; granted: PluginPermission[]; denied: PluginPermission[] }> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) throw new Error('Plugin not found');
    const dangerous: PluginPermission[] = ['network', 'filesystem'];
    const granted = plugin.permissions.filter(p => !dangerous.includes(p));
    const denied = plugin.permissions.filter(p => dangerous.includes(p));
    return { permissions: plugin.permissions, granted, denied };
  }
}

export const pluginSystemService = new PluginSystemService();
export { PluginSystemService };
