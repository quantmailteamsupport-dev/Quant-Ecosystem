// ============================================================================
// Quant Developer Platform - API Versioning Manager
// ============================================================================

import {
  APIVersion,
  VersionConfig,
  DeprecationNotice,
  MigrationGuide,
  VersionChange,
  VersionChangelog,
  VersionNegotiation,
  VersionedRoute,
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

function compareVersions(a: string, b: string): number {
  const partsA = a.replace('v', '').split('.').map(Number);
  const partsB = b.replace('v', '').split('.').map(Number);

  for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
    const numA = partsA[i] || 0;
    const numB = partsB[i] || 0;
    if (numA !== numB) return numA - numB;
  }
  return 0;
}

// ============================================================================
// API Version Manager Class
// ============================================================================

export class APIVersionManager {
  private versions: Map<string, APIVersion> = new Map();
  private config: VersionConfig;
  private deprecationNotices: Map<string, DeprecationNotice> = new Map();

  constructor(config?: Partial<VersionConfig>) {
    this.config = {
      defaultVersion: config?.defaultVersion || 'v1',
      supportedVersions: config?.supportedVersions || ['v1'],
      headerName: config?.headerName || 'Accept',
      urlPattern: config?.urlPattern || '/api/:version/',
      vendorPrefix: config?.vendorPrefix || 'application/vnd.quant',
    };
  }

  /**
   * Register a new API version with its routes and schemas
   */
  public registerVersion(params: {
    version: string;
    routes: VersionedRoute[];
    changelog?: VersionChangelog[];
  }): APIVersion {
    const apiVersion: APIVersion = {
      version: params.version,
      prefix: `/api/${params.version}`,
      releaseDate: Date.now(),
      deprecatedAt: null,
      sunsetDate: null,
      isActive: true,
      routes: params.routes,
      changelog: params.changelog || [],
    };

    this.versions.set(params.version, apiVersion);

    // Add to supported versions if not already there
    if (!this.config.supportedVersions.includes(params.version)) {
      this.config.supportedVersions.push(params.version);
      this.config.supportedVersions.sort(compareVersions);
    }

    return apiVersion;
  }

  /**
   * Negotiate version from Accept header or URL
   * Supports: application/vnd.quant.v2+json or /api/v2/ URL pattern
   */
  public negotiateVersion(request: { headers?: Record<string, string>; url?: string }): VersionNegotiation {
    // Try URL-based versioning first
    if (request.url) {
      const urlMatch = request.url.match(/\/api\/(v\d+(?:\.\d+)*)\//);
      if (urlMatch) {
        const requestedVersion = urlMatch[1];
        const version = this.versions.get(requestedVersion);
        if (version && version.isActive) {
          return {
            requestedVersion,
            resolvedVersion: requestedVersion,
            source: 'url',
            isDeprecated: version.deprecatedAt !== null,
            deprecationNotice: this.deprecationNotices.get(requestedVersion),
          };
        }
      }
    }

    // Try header-based versioning
    if (request.headers) {
      const acceptHeader = request.headers[this.config.headerName] || request.headers[this.config.headerName.toLowerCase()];
      if (acceptHeader) {
        // Parse: application/vnd.quant.v2+json
        const headerMatch = acceptHeader.match(/application\/vnd\.quant\.(v\d+(?:\.\d+)*)\+json/);
        if (headerMatch) {
          const requestedVersion = headerMatch[1];
          const version = this.versions.get(requestedVersion);
          if (version && version.isActive) {
            return {
              requestedVersion,
              resolvedVersion: requestedVersion,
              source: 'header',
              isDeprecated: version.deprecatedAt !== null,
              deprecationNotice: this.deprecationNotices.get(requestedVersion),
            };
          }
        }
      }
    }

    // Fall back to default version
    return {
      requestedVersion: null,
      resolvedVersion: this.config.defaultVersion,
      source: 'default',
      isDeprecated: false,
    };
  }

  /**
   * Get all active (non-sunset) versions
   */
  public getActiveVersions(): APIVersion[] {
    return Array.from(this.versions.values())
      .filter(v => v.isActive)
      .sort((a, b) => compareVersions(a.version, b.version));
  }

  /**
   * Deprecate a version with a sunset date
   */
  public deprecateVersion(version: string, params: {
    sunsetDate: number;
    alternativeVersion: string;
    migrationGuideUrl?: string;
  }): DeprecationNotice | null {
    const apiVersion = this.versions.get(version);
    if (!apiVersion) return null;

    const now = Date.now();
    apiVersion.deprecatedAt = now;
    apiVersion.sunsetDate = params.sunsetDate;
    this.versions.set(version, apiVersion);

    const notice: DeprecationNotice = {
      version,
      deprecatedAt: now,
      sunsetDate: params.sunsetDate,
      migrationGuideUrl: params.migrationGuideUrl || `/docs/migration/${version}-to-${params.alternativeVersion}`,
      alternativeVersion: params.alternativeVersion,
      affectedEndpoints: apiVersion.routes.map(r => `${r.method} ${r.path}`),
    };

    this.deprecationNotices.set(version, notice);
    return notice;
  }

  /**
   * Sunset (deactivate) a version that has passed its sunset date
   */
  public sunsetVersion(version: string): boolean {
    const apiVersion = this.versions.get(version);
    if (!apiVersion) return false;

    apiVersion.isActive = false;
    this.versions.set(version, apiVersion);

    // Remove from supported versions
    this.config.supportedVersions = this.config.supportedVersions.filter(v => v !== version);

    return true;
  }

  /**
   * Get migration guide between two versions
   */
  public getMigrationGuide(fromVersion: string, toVersion: string): MigrationGuide | null {
    const from = this.versions.get(fromVersion);
    const to = this.versions.get(toVersion);
    if (!from || !to) return null;

    const breakingChanges: VersionChange[] = [];
    const nonBreakingChanges: VersionChange[] = [];

    // Determine removed endpoints (breaking)
    for (const route of from.routes) {
      const stillExists = to.routes.some(r => r.method === route.method && r.path === route.path);
      if (!stillExists) {
        breakingChanges.push({
          type: 'removed',
          endpoint: `${route.method} ${route.path}`,
          description: `Endpoint removed in ${toVersion}`,
          before: `${route.method} ${route.path}`,
        });
      }
    }

    // Determine added endpoints (non-breaking)
    for (const route of to.routes) {
      const existedBefore = from.routes.some(r => r.method === route.method && r.path === route.path);
      if (!existedBefore) {
        nonBreakingChanges.push({
          type: 'added',
          endpoint: `${route.method} ${route.path}`,
          description: `New endpoint added in ${toVersion}`,
          after: `${route.method} ${route.path}`,
        });
      }
    }

    // Collect changelog changes between versions
    for (const entry of to.changelog) {
      const change: VersionChange = {
        type: entry.type,
        endpoint: entry.endpoint || 'general',
        description: entry.description,
      };
      if (entry.type === 'removed' || entry.type === 'changed') {
        breakingChanges.push(change);
      } else {
        nonBreakingChanges.push(change);
      }
    }

    const steps: string[] = [];
    if (breakingChanges.length > 0) {
      steps.push(`Review ${breakingChanges.length} breaking changes`);
      steps.push('Update client code for removed/changed endpoints');
    }
    if (nonBreakingChanges.length > 0) {
      steps.push(`Consider adopting ${nonBreakingChanges.length} new features`);
    }
    steps.push(`Update Accept header to ${this.config.vendorPrefix}.${toVersion}+json`);
    steps.push('Run integration tests against the new version');
    steps.push('Monitor error rates after migration');

    const estimatedEffort = breakingChanges.length === 0 ? 'Low (no breaking changes)' :
      breakingChanges.length <= 3 ? 'Medium (few breaking changes)' :
      'High (significant breaking changes)';

    return {
      fromVersion,
      toVersion,
      breakingChanges,
      nonBreakingChanges,
      steps,
      estimatedEffort,
    };
  }

  /**
   * Transform a request from one version format to another
   */
  public transformRequest(request: Record<string, unknown>, fromVersion: string, toVersion: string): Record<string, unknown> {
    const from = this.versions.get(fromVersion);
    const to = this.versions.get(toVersion);
    if (!from || !to) return request;

    const transformed = { ...request };

    // Apply version-specific transformations
    // This is a framework - real transformations would be registered per version pair
    transformed['__apiVersion'] = toVersion;
    transformed['__transformedFrom'] = fromVersion;

    // Handle field renames between versions
    const fieldMappings = this.getFieldMappings(fromVersion, toVersion);
    for (const [oldField, newField] of Object.entries(fieldMappings)) {
      if (oldField in transformed) {
        transformed[newField] = transformed[oldField];
        delete transformed[oldField];
      }
    }

    return transformed;
  }

  /**
   * Transform a response for the requested version
   */
  public transformResponse(response: Record<string, unknown>, currentVersion: string, requestedVersion: string): Record<string, unknown> {
    if (currentVersion === requestedVersion) return response;

    const transformed = { ...response };

    // Apply reverse field mappings
    const fieldMappings = this.getFieldMappings(requestedVersion, currentVersion);
    for (const [targetField, sourceField] of Object.entries(fieldMappings)) {
      if (sourceField in transformed) {
        transformed[targetField] = transformed[sourceField];
        delete transformed[sourceField];
      }
    }

    // Remove fields not available in the requested version
    const requestedVersionData = this.versions.get(requestedVersion);
    if (requestedVersionData && compareVersions(requestedVersion, currentVersion) < 0) {
      // Older version requested - may need to strip new fields
      transformed['__version'] = requestedVersion;
    }

    return transformed;
  }

  private getFieldMappings(fromVersion: string, toVersion: string): Record<string, string> {
    // In a real implementation, these would be registered per version pair
    const mappings: Record<string, Record<string, Record<string, string>>> = {};
    return mappings[fromVersion]?.[toVersion] || {};
  }

  /**
   * Get changelog between versions including breaking vs non-breaking changes
   */
  public getChangelog(version?: string): { version: string; changes: VersionChangelog[]; isBreaking: boolean }[] {
    const versions = version
      ? [this.versions.get(version)].filter((v): v is APIVersion => v !== undefined)
      : Array.from(this.versions.values()).sort((a, b) => compareVersions(b.version, a.version));

    return versions.map(v => ({
      version: v.version,
      changes: v.changelog,
      isBreaking: v.changelog.some(c => c.type === 'removed' || c.type === 'changed'),
    }));
  }

  /**
   * Get current version configuration
   */
  public getConfig(): VersionConfig {
    return { ...this.config };
  }

  /**
   * Set the default version
   */
  public setDefaultVersion(version: string): boolean {
    if (!this.versions.has(version)) return false;
    this.config.defaultVersion = version;
    return true;
  }

  /**
   * Get a specific version
   */
  public getVersion(version: string): APIVersion | null {
    return this.versions.get(version) || null;
  }

  /**
   * Add a route to a specific version
   */
  public addRoute(version: string, route: VersionedRoute): boolean {
    const apiVersion = this.versions.get(version);
    if (!apiVersion) return false;

    apiVersion.routes.push(route);
    this.versions.set(version, apiVersion);
    return true;
  }

  /**
   * Get deprecation headers for a response
   */
  public getDeprecationHeaders(version: string): Record<string, string> {
    const notice = this.deprecationNotices.get(version);
    if (!notice) return {};

    return {
      'Deprecation': new Date(notice.deprecatedAt).toUTCString(),
      'Sunset': new Date(notice.sunsetDate).toUTCString(),
      'Link': `<${notice.migrationGuideUrl}>; rel="deprecation"`,
      'X-API-Warn': `Version ${version} is deprecated. Please migrate to ${notice.alternativeVersion}.`,
    };
  }
}
