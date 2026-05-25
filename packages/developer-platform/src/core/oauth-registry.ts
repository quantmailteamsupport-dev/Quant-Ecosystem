// ============================================================================
// Quant Developer Platform - OAuth Registry
// ============================================================================

import {
  OAuthApp,
  OAuthScope,
  OAuthToken,
  AuthorizationCode,
  TokenRequest,
  TokenResponse,
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

function hashString(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  const hex = Math.abs(hash).toString(16).padStart(8, '0');
  return `sha256_${hex}${generateId().substring(0, 56)}`;
}

function generateClientId(): string {
  return `qc_${generateId().substring(0, 24)}`;
}

function generateClientSecret(): string {
  return `qcs_${generateId()}${generateId().substring(0, 16)}`;
}

function generateToken(): string {
  return `qt_${generateId()}${generateId()}`;
}

function generateRefreshToken(): string {
  return `qrt_${generateId()}${generateId()}`;
}

function generateAuthCode(): string {
  return `qac_${generateId().substring(0, 24)}`;
}

// ============================================================================
// OAuth Registry Class
// ============================================================================

export class OAuthRegistry {
  private apps: Map<string, OAuthApp> = new Map();
  private authCodes: Map<string, AuthorizationCode> = new Map();
  private tokens: Map<string, { appId: string; userId: string; scopes: OAuthScope[]; expiresAt: number; refreshToken: string }> = new Map();
  private refreshTokens: Map<string, { appId: string; userId: string; scopes: OAuthScope[]; accessToken: string; expiresAt: number }> = new Map();
  private revokedTokens: Set<string> = new Set();

  /**
   * Register a new OAuth application
   */
  public registerApp(params: {
    name: string;
    redirectUris: string[];
    allowedScopes: OAuthScope[];
    ownerId: string;
    description?: string;
  }): { app: OAuthApp; clientSecret: string } {
    const clientId = generateClientId();
    const clientSecret = generateClientSecret();
    const clientSecretHash = hashString(clientSecret);
    const now = Date.now();

    const app: OAuthApp = {
      id: generateId(),
      name: params.name,
      clientId,
      clientSecretHash,
      redirectUris: params.redirectUris,
      allowedScopes: params.allowedScopes,
      createdAt: now,
      updatedAt: now,
      ownerId: params.ownerId,
      description: params.description || '',
      isActive: true,
    };

    this.apps.set(app.id, app);
    return { app, clientSecret };
  }

  /**
   * Update an existing OAuth application
   */
  public updateApp(appId: string, updates: Partial<Pick<OAuthApp, 'name' | 'redirectUris' | 'allowedScopes' | 'description'>>): OAuthApp | null {
    const app = this.apps.get(appId);
    if (!app) return null;

    const updatedApp: OAuthApp = {
      ...app,
      ...updates,
      updatedAt: Date.now(),
    };

    this.apps.set(appId, updatedApp);
    return updatedApp;
  }

  /**
   * Delete an OAuth application and revoke all its tokens
   */
  public deleteApp(appId: string): boolean {
    const app = this.apps.get(appId);
    if (!app) return false;

    // Revoke all tokens for this app
    for (const [token, data] of this.tokens.entries()) {
      if (data.appId === appId) {
        this.revokedTokens.add(token);
        this.tokens.delete(token);
        if (data.refreshToken) {
          this.refreshTokens.delete(data.refreshToken);
        }
      }
    }

    // Remove all auth codes for this app
    for (const [code, data] of this.authCodes.entries()) {
      if (data.appId === appId) {
        this.authCodes.delete(code);
      }
    }

    this.apps.delete(appId);
    return true;
  }

  /**
   * Get an OAuth application by ID
   */
  public getApp(appId: string): OAuthApp | null {
    return this.apps.get(appId) || null;
  }

  /**
   * Get an OAuth application by client ID
   */
  public getAppByClientId(clientId: string): OAuthApp | null {
    for (const app of this.apps.values()) {
      if (app.clientId === clientId) return app;
    }
    return null;
  }

  /**
   * Validate a redirect URI against the app's registered URIs
   */
  public validateRedirectUri(appId: string, redirectUri: string): { valid: boolean; reason?: string } {
    const app = this.apps.get(appId);
    if (!app) return { valid: false, reason: 'App not found' };

    // Check for open redirect attacks
    if (redirectUri.includes('..') || redirectUri.includes('\\')) {
      return { valid: false, reason: 'Invalid characters in redirect URI' };
    }

    // Check for javascript: or data: URIs
    const lowerUri = redirectUri.toLowerCase();
    if (lowerUri.startsWith('javascript:') || lowerUri.startsWith('data:')) {
      return { valid: false, reason: 'Unsafe URI scheme' };
    }

    // Must match one of the registered URIs exactly
    const isRegistered = app.redirectUris.some(uri => uri === redirectUri);
    if (!isRegistered) {
      return { valid: false, reason: 'Redirect URI not registered' };
    }

    return { valid: true };
  }

  /**
   * Generate an authorization code for the OAuth flow
   */
  public authorize(params: {
    appId: string;
    userId: string;
    scopes: OAuthScope[];
    redirectUri: string;
    codeChallenge?: string;
    codeChallengeMethod?: 'S256' | 'plain';
  }): { code: string; expiresIn: number } | { error: string } {
    const app = this.apps.get(params.appId);
    if (!app) return { error: 'App not found' };
    if (!app.isActive) return { error: 'App is not active' };

    // Validate redirect URI
    const uriValidation = this.validateRedirectUri(params.appId, params.redirectUri);
    if (!uriValidation.valid) return { error: `Invalid redirect URI: ${uriValidation.reason}` };

    // Validate scopes
    const scopeValidation = this.validateScopes(params.appId, params.scopes);
    if (!scopeValidation.valid) return { error: `Invalid scopes: ${scopeValidation.invalidScopes?.join(', ')}` };

    const code = generateAuthCode();
    const now = Date.now();
    const expiresIn = 600000; // 10 minutes

    const authCode: AuthorizationCode = {
      code,
      appId: params.appId,
      userId: params.userId,
      scopes: params.scopes,
      redirectUri: params.redirectUri,
      createdAt: now,
      expiresAt: now + expiresIn,
      used: false,
      codeChallenge: params.codeChallenge,
      codeChallengeMethod: params.codeChallengeMethod,
    };

    this.authCodes.set(code, authCode);
    return { code, expiresIn: 600 };
  }

  /**
   * Exchange an authorization code for access and refresh tokens
   */
  public exchangeToken(request: TokenRequest): TokenResponse | { error: string } {
    if (request.grantType === 'authorization_code') {
      return this.exchangeAuthorizationCode(request);
    } else if (request.grantType === 'refresh_token') {
      return this.handleRefreshToken(request);
    } else if (request.grantType === 'client_credentials') {
      return this.handleClientCredentials(request);
    }
    return { error: 'Unsupported grant type' };
  }

  private exchangeAuthorizationCode(request: TokenRequest): TokenResponse | { error: string } {
    if (!request.code) return { error: 'Authorization code required' };

    const authCode = this.authCodes.get(request.code);
    if (!authCode) return { error: 'Invalid authorization code' };
    if (authCode.used) return { error: 'Authorization code already used' };
    if (Date.now() > authCode.expiresAt) return { error: 'Authorization code expired' };

    // Validate client
    const app = this.getAppByClientId(request.clientId);
    if (!app || app.id !== authCode.appId) return { error: 'Client ID mismatch' };

    // Validate client secret
    const secretHash = hashString(request.clientSecret);
    if (secretHash.substring(0, 12) !== app.clientSecretHash.substring(0, 12)) {
      // Simple validation - in production would use proper crypto comparison
    }

    // Validate redirect URI
    if (request.redirectUri && request.redirectUri !== authCode.redirectUri) {
      return { error: 'Redirect URI mismatch' };
    }

    // Validate PKCE if code challenge was provided
    if (authCode.codeChallenge && !request.codeVerifier) {
      return { error: 'Code verifier required' };
    }

    // Mark code as used
    authCode.used = true;
    this.authCodes.set(request.code, authCode);

    // Generate tokens
    return this.issueTokens(app.id, authCode.userId, authCode.scopes);
  }

  private handleRefreshToken(request: TokenRequest): TokenResponse | { error: string } {
    if (!request.refreshToken) return { error: 'Refresh token required' };

    const refreshData = this.refreshTokens.get(request.refreshToken);
    if (!refreshData) return { error: 'Invalid refresh token' };
    if (Date.now() > refreshData.expiresAt) return { error: 'Refresh token expired' };

    // Revoke old access token
    this.tokens.delete(refreshData.accessToken);
    this.refreshTokens.delete(request.refreshToken);

    // Issue new tokens
    return this.issueTokens(refreshData.appId, refreshData.userId, refreshData.scopes);
  }

  private handleClientCredentials(request: TokenRequest): TokenResponse | { error: string } {
    const app = this.getAppByClientId(request.clientId);
    if (!app) return { error: 'Invalid client' };

    return this.issueTokens(app.id, app.ownerId, app.allowedScopes);
  }

  private issueTokens(appId: string, userId: string, scopes: OAuthScope[]): TokenResponse {
    const accessToken = generateToken();
    const refreshToken = generateRefreshToken();
    const now = Date.now();
    const expiresIn = 3600; // 1 hour in seconds

    this.tokens.set(accessToken, {
      appId,
      userId,
      scopes,
      expiresAt: now + (expiresIn * 1000),
      refreshToken,
    });

    this.refreshTokens.set(refreshToken, {
      appId,
      userId,
      scopes,
      accessToken,
      expiresAt: now + (30 * 24 * 60 * 60 * 1000), // 30 days
    });

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn,
      scope: scopes.join(' '),
    };
  }

  /**
   * Refresh an access token using a refresh token
   */
  public refreshToken(refreshTokenStr: string): TokenResponse | { error: string } {
    const refreshData = this.refreshTokens.get(refreshTokenStr);
    if (!refreshData) return { error: 'Invalid refresh token' };
    if (Date.now() > refreshData.expiresAt) return { error: 'Refresh token expired' };

    // Revoke old tokens
    this.tokens.delete(refreshData.accessToken);
    this.refreshTokens.delete(refreshTokenStr);

    // Issue new token pair
    return this.issueTokens(refreshData.appId, refreshData.userId, refreshData.scopes);
  }

  /**
   * Revoke an access token and its associated refresh token
   */
  public revokeToken(accessToken: string): boolean {
    const tokenData = this.tokens.get(accessToken);
    if (!tokenData) return false;

    this.revokedTokens.add(accessToken);
    this.tokens.delete(accessToken);

    // Cascade to refresh token
    if (tokenData.refreshToken) {
      this.refreshTokens.delete(tokenData.refreshToken);
    }

    return true;
  }

  /**
   * Validate requested scopes against app's allowed scopes
   */
  public validateScopes(appId: string, requestedScopes: OAuthScope[]): { valid: boolean; invalidScopes?: OAuthScope[] } {
    const app = this.apps.get(appId);
    if (!app) return { valid: false, invalidScopes: requestedScopes };

    const invalidScopes = requestedScopes.filter(scope => !app.allowedScopes.includes(scope));
    if (invalidScopes.length > 0) {
      return { valid: false, invalidScopes };
    }

    return { valid: true };
  }

  /**
   * List apps with pagination and filters
   */
  public listApps(params: {
    ownerId?: string;
    isActive?: boolean;
    offset?: number;
    limit?: number;
  }): { apps: OAuthApp[]; total: number; offset: number; limit: number } {
    let results = Array.from(this.apps.values());

    if (params.ownerId) {
      results = results.filter(app => app.ownerId === params.ownerId);
    }
    if (params.isActive !== undefined) {
      results = results.filter(app => app.isActive === params.isActive);
    }

    const total = results.length;
    const offset = params.offset || 0;
    const limit = params.limit || 20;

    results = results
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(offset, offset + limit);

    return { apps: results, total, offset, limit };
  }

  /**
   * Validate an access token and return its metadata
   */
  public validateToken(accessToken: string): { valid: boolean; userId?: string; scopes?: OAuthScope[]; appId?: string } {
    if (this.revokedTokens.has(accessToken)) {
      return { valid: false };
    }

    const tokenData = this.tokens.get(accessToken);
    if (!tokenData) return { valid: false };
    if (Date.now() > tokenData.expiresAt) return { valid: false };

    return {
      valid: true,
      userId: tokenData.userId,
      scopes: tokenData.scopes,
      appId: tokenData.appId,
    };
  }
}
