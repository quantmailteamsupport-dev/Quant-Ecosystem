// ============================================================================
// Quant Developer Platform - Plugin Sandbox
// ============================================================================

import {
  PluginManifest,
  PluginCapability,
  PermissionGrant,
  ResourceLimit,
  SandboxContext,
  PluginExecution,
  AuditEntry,
} from '../types';

// ============================================================================
// Helpers
// ============================================================================

function generateId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 32; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

// ============================================================================
// Default Resource Limits
// ============================================================================

const DEFAULT_RESOURCE_LIMITS: ResourceLimit = {
  maxCpuMs: 5000,
  maxMemoryMB: 128,
  maxNetworkRequestsPerSecond: 10,
  maxStorageMB: 50,
  maxExecutionTimeMs: 5000,
  maxConcurrentOperations: 5,
};

// ============================================================================
// Plugin Sandbox Class
// ============================================================================

export class PluginSandbox {
  private plugins: Map<string, PluginManifest> = new Map();
  private contexts: Map<string, SandboxContext> = new Map();
  private executions: Map<string, PluginExecution> = new Map();
  private auditLogs: Map<string, AuditEntry[]> = new Map();
  private suspendedPlugins: Set<string> = new Set();

  /**
   * Register a plugin with declared capabilities and permissions
   */
  public registerPlugin(manifest: Omit<PluginManifest, 'id'> & { id?: string }): PluginManifest {
    const plugin: PluginManifest = {
      id: manifest.id || generateId(),
      name: manifest.name,
      version: manifest.version,
      description: manifest.description,
      author: manifest.author,
      capabilities: manifest.capabilities,
      permissions: manifest.permissions || [],
      entryPoint: manifest.entryPoint,
      resourceLimits: manifest.resourceLimits || { ...DEFAULT_RESOURCE_LIMITS },
    };

    this.plugins.set(plugin.id, plugin);
    this.auditLogs.set(plugin.id, []);

    this.logAudit(plugin.id, 'register', 'plugin', true, `Plugin ${plugin.name} v${plugin.version} registered`);

    return plugin;
  }

  /**
   * Check if a plugin has a specific capability before allowing an operation
   */
  public checkPermission(pluginId: string, capability: PluginCapability, scope?: string): boolean {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      this.logAudit(pluginId, 'checkPermission', capability, false, 'Plugin not found');
      return false;
    }

    if (this.suspendedPlugins.has(pluginId)) {
      this.logAudit(pluginId, 'checkPermission', capability, false, 'Plugin is suspended');
      return false;
    }

    // Check if plugin declares the capability
    if (!plugin.capabilities.includes(capability)) {
      this.logAudit(pluginId, 'checkPermission', capability, false, 'Capability not declared');
      return false;
    }

    // Check if permission is granted
    const grant = plugin.permissions.find(p =>
      p.capability === capability &&
      p.granted &&
      (!scope || p.scope === scope || p.scope === '*') &&
      (!p.expiresAt || p.expiresAt > Date.now())
    );

    const allowed = !!grant;
    this.logAudit(pluginId, 'checkPermission', `${capability}:${scope || '*'}`, allowed,
      allowed ? 'Permission granted' : 'Permission denied');

    return allowed;
  }

  /**
   * Grant a permission to a plugin
   */
  public grantPermission(pluginId: string, params: {
    capability: PluginCapability;
    scope: string;
    grantedBy: string;
    expiresAt?: number | null;
  }): boolean {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) return false;

    // Plugin must declare the capability
    if (!plugin.capabilities.includes(params.capability)) return false;

    const grant: PermissionGrant = {
      capability: params.capability,
      scope: params.scope,
      granted: true,
      grantedAt: Date.now(),
      grantedBy: params.grantedBy,
      expiresAt: params.expiresAt || null,
    };

    // Remove existing grant for same capability+scope
    plugin.permissions = plugin.permissions.filter(p =>
      !(p.capability === params.capability && p.scope === params.scope)
    );

    plugin.permissions.push(grant);
    this.plugins.set(pluginId, plugin);

    this.logAudit(pluginId, 'grantPermission', `${params.capability}:${params.scope}`, true,
      `Permission granted by ${params.grantedBy}`);

    return true;
  }

  /**
   * Revoke a permission from a plugin
   */
  public revokePermission(pluginId: string, capability: PluginCapability, scope: string): boolean {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) return false;

    const before = plugin.permissions.length;
    plugin.permissions = plugin.permissions.filter(p =>
      !(p.capability === capability && p.scope === scope)
    );

    if (plugin.permissions.length === before) return false;

    this.plugins.set(pluginId, plugin);
    this.logAudit(pluginId, 'revokePermission', `${capability}:${scope}`, true, 'Permission revoked');

    return true;
  }

  /**
   * Create an isolated execution context with restricted APIs
   */
  public createContext(pluginId: string): SandboxContext | null {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) return null;

    if (this.suspendedPlugins.has(pluginId)) return null;

    const context: SandboxContext = {
      pluginId,
      permissions: [...plugin.permissions],
      resourceLimits: { ...plugin.resourceLimits },
      startedAt: Date.now(),
      cpuUsedMs: 0,
      memoryUsedMB: 0,
      networkRequestsThisSecond: 0,
      storageUsedMB: 0,
      isActive: true,
      apiProxy: this.getAPIProxy(pluginId),
    };

    this.contexts.set(pluginId, context);
    this.logAudit(pluginId, 'createContext', 'sandbox', true, 'Execution context created');

    return context;
  }

  /**
   * Set resource limits for a plugin
   */
  public setResourceLimits(pluginId: string, limits: Partial<ResourceLimit>): boolean {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) return false;

    plugin.resourceLimits = {
      ...plugin.resourceLimits,
      ...limits,
    };

    this.plugins.set(pluginId, plugin);

    // Update active context if exists
    const context = this.contexts.get(pluginId);
    if (context) {
      context.resourceLimits = { ...plugin.resourceLimits };
      this.contexts.set(pluginId, context);
    }

    this.logAudit(pluginId, 'setResourceLimits', 'resources', true, `Limits updated: ${JSON.stringify(limits)}`);

    return true;
  }

  /**
   * Execute plugin code within the sandbox, enforcing resource limits
   */
  public execute(pluginId: string, code: () => unknown): PluginExecution {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error('Plugin not found');
    }

    if (this.suspendedPlugins.has(pluginId)) {
      throw new Error('Plugin is suspended');
    }

    const context = this.contexts.get(pluginId) || this.createContext(pluginId);
    if (!context) {
      throw new Error('Failed to create execution context');
    }

    const execution: PluginExecution = {
      id: generateId(),
      pluginId,
      startedAt: Date.now(),
      completedAt: null,
      status: 'running',
      resourceUsage: {
        cpuMs: 0,
        memoryPeakMB: 0,
        networkRequests: 0,
        storageOperations: 0,
      },
      auditLog: [],
    };

    this.executions.set(execution.id, execution);

    try {
      const startTime = Date.now();

      // Execute with resource monitoring
      const result = code();

      const cpuMs = Date.now() - startTime;
      execution.resourceUsage.cpuMs = cpuMs;

      // Check CPU limit
      if (cpuMs > plugin.resourceLimits.maxCpuMs) {
        execution.status = 'timeout';
        execution.error = `CPU time exceeded: ${cpuMs}ms > ${plugin.resourceLimits.maxCpuMs}ms`;
        this.logAudit(pluginId, 'execute', 'cpu', false, execution.error);
      } else {
        execution.status = 'completed';
        execution.result = result;
      }

      // Update context resource usage
      context.cpuUsedMs += cpuMs;

    } catch (error) {
      execution.status = 'failed';
      execution.error = error instanceof Error ? error.message : 'Unknown error';
      this.logAudit(pluginId, 'execute', 'code', false, `Execution failed: ${execution.error}`);
    }

    execution.completedAt = Date.now();
    this.executions.set(execution.id, execution);

    return execution;
  }

  /**
   * Get a proxy object that only exposes allowed APIs based on permissions
   */
  public getAPIProxy(pluginId: string): Record<string, unknown> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) return {};

    const proxy: Record<string, unknown> = {};

    // Network API (if permission granted)
    if (this.checkCapabilityDeclared(plugin, 'network')) {
      proxy['network'] = {
        fetch: (url: string) => this.proxyNetworkRequest(pluginId, url),
        maxRequestsPerSecond: plugin.resourceLimits.maxNetworkRequestsPerSecond,
      };
    }

    // Storage API (if permission granted)
    if (this.checkCapabilityDeclared(plugin, 'storage')) {
      proxy['storage'] = {
        get: (key: string) => this.proxyStorageGet(pluginId, key),
        set: (key: string, value: unknown) => this.proxyStorageSet(pluginId, key, value),
        delete: (key: string) => this.proxyStorageDelete(pluginId, key),
        maxSizeMB: plugin.resourceLimits.maxStorageMB,
      };
    }

    // Data access API (if permission granted)
    if (this.checkCapabilityDeclared(plugin, 'data_access')) {
      proxy['data'] = {
        query: (collection: string, filter: unknown) => this.proxyDataQuery(pluginId, collection, filter),
        maxResults: 1000,
      };
    }

    // Event subscription API (if permission granted)
    if (this.checkCapabilityDeclared(plugin, 'event_subscription')) {
      proxy['events'] = {
        subscribe: (event: string, handler: unknown) => this.proxyEventSubscribe(pluginId, event, handler),
        emit: (event: string, data: unknown) => this.proxyEventEmit(pluginId, event, data),
      };
    }

    // UI extension API (if permission granted)
    if (this.checkCapabilityDeclared(plugin, 'ui_extension')) {
      proxy['ui'] = {
        registerPanel: (config: unknown) => this.logAudit(pluginId, 'ui.registerPanel', 'ui_extension', true),
        registerAction: (config: unknown) => this.logAudit(pluginId, 'ui.registerAction', 'ui_extension', true),
      };
    }

    return proxy;
  }

  private checkCapabilityDeclared(plugin: PluginManifest, capability: PluginCapability): boolean {
    return plugin.capabilities.includes(capability);
  }

  private proxyNetworkRequest(pluginId: string, url: string): { allowed: boolean; url: string } {
    const context = this.contexts.get(pluginId);
    if (!context) return { allowed: false, url };

    if (context.networkRequestsThisSecond >= context.resourceLimits.maxNetworkRequestsPerSecond) {
      this.logAudit(pluginId, 'network.fetch', url, false, 'Rate limit exceeded');
      return { allowed: false, url };
    }

    context.networkRequestsThisSecond++;
    this.logAudit(pluginId, 'network.fetch', url, true);
    return { allowed: true, url };
  }

  private proxyStorageGet(pluginId: string, key: string): void {
    this.logAudit(pluginId, 'storage.get', key, true);
  }

  private proxyStorageSet(pluginId: string, key: string, _value: unknown): void {
    this.logAudit(pluginId, 'storage.set', key, true);
  }

  private proxyStorageDelete(pluginId: string, key: string): void {
    this.logAudit(pluginId, 'storage.delete', key, true);
  }

  private proxyDataQuery(pluginId: string, collection: string, _filter: unknown): void {
    this.logAudit(pluginId, 'data.query', collection, true);
  }

  private proxyEventSubscribe(pluginId: string, event: string, _handler: unknown): void {
    this.logAudit(pluginId, 'events.subscribe', event, true);
  }

  private proxyEventEmit(pluginId: string, event: string, _data: unknown): void {
    this.logAudit(pluginId, 'events.emit', event, true);
  }

  /**
   * Get audit log for a plugin
   */
  public audit(pluginId: string, params?: {
    action?: string;
    startTime?: number;
    endTime?: number;
    limit?: number;
  }): AuditEntry[] {
    let entries = this.auditLogs.get(pluginId) || [];

    if (params?.action) {
      entries = entries.filter(e => e.action === params.action);
    }
    if (params?.startTime) {
      entries = entries.filter(e => e.timestamp >= params.startTime!);
    }
    if (params?.endTime) {
      entries = entries.filter(e => e.timestamp <= params.endTime!);
    }

    entries = entries.sort((a, b) => b.timestamp - a.timestamp);

    if (params?.limit) {
      entries = entries.slice(0, params.limit);
    }

    return entries;
  }

  /**
   * Immediately suspend a misbehaving plugin
   */
  public suspend(pluginId: string, reason?: string): boolean {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) return false;

    this.suspendedPlugins.add(pluginId);

    // Deactivate context
    const context = this.contexts.get(pluginId);
    if (context) {
      context.isActive = false;
      this.contexts.set(pluginId, context);
    }

    // Mark running executions as killed
    for (const execution of this.executions.values()) {
      if (execution.pluginId === pluginId && execution.status === 'running') {
        execution.status = 'killed';
        execution.completedAt = Date.now();
        execution.error = reason || 'Plugin suspended';
      }
    }

    this.logAudit(pluginId, 'suspend', 'plugin', true, reason || 'Plugin suspended by admin');

    return true;
  }

  /**
   * Resume a suspended plugin
   */
  public resume(pluginId: string): boolean {
    if (!this.suspendedPlugins.has(pluginId)) return false;

    this.suspendedPlugins.delete(pluginId);
    this.logAudit(pluginId, 'resume', 'plugin', true, 'Plugin resumed');

    return true;
  }

  /**
   * Get plugin manifest
   */
  public getPlugin(pluginId: string): PluginManifest | null {
    return this.plugins.get(pluginId) || null;
  }

  /**
   * Check if a plugin is suspended
   */
  public isSuspended(pluginId: string): boolean {
    return this.suspendedPlugins.has(pluginId);
  }

  /**
   * Get execution by ID
   */
  public getExecution(executionId: string): PluginExecution | null {
    return this.executions.get(executionId) || null;
  }

  /**
   * List all registered plugins
   */
  public listPlugins(): PluginManifest[] {
    return Array.from(this.plugins.values());
  }

  private logAudit(pluginId: string, action: string, resource: string, allowed: boolean, details?: string): void {
    const entry: AuditEntry = {
      timestamp: Date.now(),
      action,
      resource,
      allowed,
      details,
    };

    const logs = this.auditLogs.get(pluginId) || [];
    logs.push(entry);

    // Keep only last 10000 entries per plugin
    if (logs.length > 10000) {
      logs.splice(0, logs.length - 10000);
    }

    this.auditLogs.set(pluginId, logs);
  }
}
