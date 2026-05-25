// ============================================================================
// Quant Developer Platform - SDK Generator
// ============================================================================

import {
  SDKConfig,
  RouteDefinition,
  SDKMethod,
  SDKClient,
  GeneratedCode,
  RetryConfig,
  ParamDefinition,
} from '../types';

// ============================================================================
// SDK Generator Class
// ============================================================================

export class SDKGenerator {
  private routes: RouteDefinition[] = [];
  private config: SDKConfig;
  private generatedTypes: Set<string> = new Set();
  private paginatedEndpoints: Set<string> = new Set();
  private retryEnabled: boolean = false;
  private authConfig: { type: 'apiKey' | 'bearer' | 'basic'; headerName: string } | null = null;

  constructor(config: SDKConfig) {
    this.config = config;
  }

  /**
   * Generate SDK from an array of route definitions
   */
  public fromRoutes(routes: RouteDefinition[]): SDKClient {
    this.routes = routes;

    const methods: SDKMethod[] = routes.map(route => this.generateMethod(route));
    const types = this.generateTypes();

    return {
      name: this.config.name,
      version: this.config.version,
      methods,
      types,
      imports: ['fetch', 'AbortController'],
    };
  }

  /**
   * Generate a typed method for a route definition
   */
  public generateMethod(route: RouteDefinition): SDKMethod {
    const params: ParamDefinition[] = [];

    // Add path params
    if (route.pathParams) {
      params.push(...route.pathParams);
    }

    // Add query params
    if (route.queryParams) {
      params.push(...route.queryParams);
    }

    // Track types used
    if (route.requestType) this.generatedTypes.add(route.requestType);
    this.generatedTypes.add(route.responseType);
    if (route.bodyType) this.generatedTypes.add(route.bodyType);

    return {
      name: route.operationId,
      httpMethod: route.method,
      path: route.path,
      params,
      bodyType: route.bodyType,
      returnType: route.paginated ? `PaginatedResponse<${route.responseType}>` : route.responseType,
      description: route.description,
      paginated: route.paginated || false,
    };
  }

  /**
   * Extract and generate all request/response interfaces
   */
  public generateTypes(): string[] {
    const types = Array.from(this.generatedTypes);

    // Always include base types
    types.push('RequestOptions');
    types.push('APIError');
    if (this.paginatedEndpoints.size > 0 || this.routes.some(r => r.paginated)) {
      types.push('PaginatedResponse');
      types.push('PaginationParams');
    }

    return types;
  }

  /**
   * Mark endpoints as paginated and add iterator support
   */
  public addPagination(operationIds: string[]): void {
    for (const id of operationIds) {
      this.paginatedEndpoints.add(id);
    }
  }

  /**
   * Enable retry logic with configurable settings
   */
  public addRetry(config?: Partial<RetryConfig>): void {
    this.retryEnabled = true;
    if (config) {
      this.config.retryConfig = {
        ...this.config.retryConfig,
        ...config,
      };
    }
  }

  /**
   * Inject authentication configuration
   */
  public addAuth(type: 'apiKey' | 'bearer' | 'basic', headerName?: string): void {
    this.authConfig = {
      type,
      headerName: headerName || (type === 'apiKey' ? 'X-API-Key' : 'Authorization'),
    };
  }

  /**
   * Generate the package entry point (index file)
   */
  public generateIndex(): string {
    const lines: string[] = [];
    lines.push(`// Auto-generated SDK for ${this.config.name}`);
    lines.push(`// Version: ${this.config.version}`);
    lines.push('');
    lines.push(`export { ${this.config.name}Client } from './client';`);
    lines.push(`export * from './types';`);
    lines.push('');
    lines.push(`export const SDK_VERSION = '${this.config.version}';`);
    lines.push(`export const BASE_URL = '${this.config.baseUrl}';`);
    return lines.join('\n');
  }

  /**
   * Generate complete TypeScript SDK code
   */
  public toTypeScript(): GeneratedCode[] {
    const files: GeneratedCode[] = [];

    // Generate types file
    files.push(this.generateTypesFile());

    // Generate client class
    files.push(this.generateClientFile());

    // Generate index
    files.push({
      filename: 'index.ts',
      content: this.generateIndex(),
      language: 'typescript',
    });

    return files;
  }

  private generateTypesFile(): GeneratedCode {
    const lines: string[] = [];
    lines.push('// Auto-generated types');
    lines.push('');

    // Base types
    lines.push('export interface RequestOptions {');
    lines.push('  timeout?: number;');
    lines.push('  signal?: AbortSignal;');
    lines.push('  headers?: Record<string, string>;');
    lines.push('}');
    lines.push('');

    lines.push('export interface APIError {');
    lines.push('  code: string;');
    lines.push('  message: string;');
    lines.push('  statusCode: number;');
    lines.push('  details?: Record<string, unknown>;');
    lines.push('}');
    lines.push('');

    lines.push('export interface PaginatedResponse<T> {');
    lines.push('  data: T[];');
    lines.push('  total: number;');
    lines.push('  offset: number;');
    lines.push('  limit: number;');
    lines.push('  hasMore: boolean;');
    lines.push('}');
    lines.push('');

    lines.push('export interface PaginationParams {');
    lines.push('  offset?: number;');
    lines.push('  limit?: number;');
    lines.push('  cursor?: string;');
    lines.push('}');
    lines.push('');

    // Generate interfaces for each unique type
    for (const typeName of this.generatedTypes) {
      lines.push(`export interface ${typeName} {`);
      lines.push('  id: string;');
      lines.push('  [key: string]: unknown;');
      lines.push('}');
      lines.push('');
    }

    return {
      filename: 'types.ts',
      content: lines.join('\n'),
      language: 'typescript',
    };
  }

  private generateClientFile(): GeneratedCode {
    const lines: string[] = [];
    const className = `${this.config.name}Client`;

    lines.push(`import { RequestOptions, APIError, PaginatedResponse } from './types';`);
    lines.push('');
    lines.push(`export class ${className} {`);
    lines.push('  private baseUrl: string;');
    lines.push('  private headers: Record<string, string>;');
    lines.push(`  private timeout: number;`);

    if (this.retryEnabled) {
      lines.push('  private maxRetries: number;');
      lines.push('  private retryDelay: number;');
    }

    lines.push('');
    lines.push(`  constructor(config: { baseUrl?: string; apiKey?: string; token?: string; timeout?: number }) {`);
    lines.push(`    this.baseUrl = config.baseUrl || '${this.config.baseUrl}';`);
    lines.push(`    this.timeout = config.timeout || ${this.config.timeout};`);
    lines.push('    this.headers = { "Content-Type": "application/json" };');

    if (this.authConfig) {
      if (this.authConfig.type === 'apiKey') {
        lines.push(`    if (config.apiKey) this.headers['${this.authConfig.headerName}'] = config.apiKey;`);
      } else if (this.authConfig.type === 'bearer') {
        lines.push(`    if (config.token) this.headers['Authorization'] = \`Bearer \${config.token}\`;`);
      }
    }

    if (this.retryEnabled) {
      lines.push(`    this.maxRetries = ${this.config.retryConfig.maxRetries};`);
      lines.push(`    this.retryDelay = ${this.config.retryConfig.initialDelay};`);
    }

    lines.push('  }');
    lines.push('');

    // Generate methods for each route
    for (const route of this.routes) {
      const method = this.generateMethod(route);
      lines.push(this.generateMethodCode(method));
      lines.push('');
    }

    // Add private request method
    lines.push('  private async request<T>(method: string, path: string, body?: unknown, options?: RequestOptions): Promise<T> {');
    lines.push('    const url = `${this.baseUrl}${path}`;');
    lines.push('    const headers = { ...this.headers, ...options?.headers };');

    if (this.retryEnabled) {
      lines.push('    let lastError: Error | null = null;');
      lines.push('    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {');
      lines.push('      try {');
      lines.push('        const response = await fetch(url, {');
      lines.push('          method,');
      lines.push('          headers,');
      lines.push('          body: body ? JSON.stringify(body) : undefined,');
      lines.push('          signal: options?.signal,');
      lines.push('        });');
      lines.push('        if (!response.ok) {');
      lines.push('          const error = await response.json() as APIError;');
      lines.push('          throw new Error(error.message || `HTTP ${response.status}`);');
      lines.push('        }');
      lines.push('        return await response.json() as T;');
      lines.push('      } catch (e) {');
      lines.push('        lastError = e as Error;');
      lines.push('        if (attempt < this.maxRetries) {');
      lines.push(`          await new Promise(r => setTimeout(r, this.retryDelay * Math.pow(${this.config.retryConfig.backoffMultiplier}, attempt)));`);
      lines.push('        }');
      lines.push('      }');
      lines.push('    }');
      lines.push('    throw lastError || new Error("Request failed");');
      lines.push('  }');
    } else {
      lines.push('    const response = await fetch(url, {');
      lines.push('      method,');
      lines.push('      headers,');
      lines.push('      body: body ? JSON.stringify(body) : undefined,');
      lines.push('      signal: options?.signal,');
      lines.push('    });');
      lines.push('    if (!response.ok) {');
      lines.push('      const error = await response.json() as APIError;');
      lines.push('      throw new Error(error.message || `HTTP ${response.status}`);');
      lines.push('    }');
      lines.push('    return await response.json() as T;');
      lines.push('  }');
    }

    lines.push('}');

    return {
      filename: 'client.ts',
      content: lines.join('\n'),
      language: 'typescript',
    };
  }

  private generateMethodCode(method: SDKMethod): string {
    const lines: string[] = [];
    const params: string[] = [];

    // Build parameter list
    for (const param of method.params) {
      const optional = param.required ? '' : '?';
      params.push(`${param.name}${optional}: ${param.type}`);
    }
    if (method.bodyType) {
      params.push(`body: ${method.bodyType}`);
    }
    params.push('options?: RequestOptions');

    // Build path with interpolation
    let path = method.path;
    for (const param of method.params.filter(p => method.path.includes(`:${p.name}`))) {
      path = path.replace(`:${param.name}`, `\${${param.name}}`);
    }

    lines.push(`  /**`);
    lines.push(`   * ${method.description}`);
    lines.push(`   */`);
    lines.push(`  async ${method.name}(${params.join(', ')}): Promise<${method.returnType}> {`);
    lines.push(`    return this.request<${method.returnType}>('${method.httpMethod}', \`${path}\`${method.bodyType ? ', body' : ', undefined'}, options);`);
    lines.push(`  }`);

    return lines.join('\n');
  }

  /**
   * Get the SDK configuration
   */
  public getConfig(): SDKConfig {
    return { ...this.config };
  }

  /**
   * Get all registered routes
   */
  public getRoutes(): RouteDefinition[] {
    return [...this.routes];
  }
}
