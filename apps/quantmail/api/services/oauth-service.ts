// ============================================================================
// QuantMail API - OAuth Service
// Central OAuth2 server for ecosystem-wide SSO
// ============================================================================

import type { PermissionScope, QuantApp } from '@quant/common';
import type {
  OAuthClient,
  AuthorizationGrant,
  LoginRequest,
  RegisterRequest,
  TwoFactorSetup,
} from '../../src/types';

// ----------------------------------------------------------------------------
// User Store (in-memory for this implementation)
// ----------------------------------------------------------------------------

interface StoredUser {
  id: string;
  email: string;
  username: string;
  displayName: string;
  passwordHash: string;
  role: 'user' | 'admin' | 'moderator';
  emailVerified: boolean;
  twoFactorEnabled: boolean;
  twoFactorSecret?: string;
  backupCodes: string[];
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
  loginAttempts: number;
  lockedUntil?: Date;
  passwordResetToken?: string;
  passwordResetExpiry?: Date;
  emailVerificationToken?: string;
}

// ----------------------------------------------------------------------------
// OAuth Service
// ----------------------------------------------------------------------------

export class OAuthService {
  private users: Map<string, StoredUser> = new Map();
  private clients: Map<string, OAuthClient> = new Map();
  private grants: Map<string, AuthorizationGrant> = new Map();
  private authCodes: Map<string, { userId: string; clientId: string; scopes: PermissionScope[]; redirectUri: string; expiresAt: Date; codeChallenge?: string; codeChallengeMethod?: string }> = new Map();
  private revokedTokens: Set<string> = new Set();

  constructor() {
    this.registerDefaultClients();
  }

  // --------------------------------------------------------------------------
  // User Registration
  // --------------------------------------------------------------------------

  async register(request: RegisterRequest): Promise<{ success: boolean; userId?: string; error?: string }> {
    // Validate required fields
    if (!request.email || !request.username || !request.password || !request.displayName) {
      return { success: false, error: 'All fields are required' };
    }

    if (!request.acceptTerms) {
      return { success: false, error: 'You must accept the terms of service' };
    }

    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(request.email)) {
      return { success: false, error: 'Invalid email format' };
    }

    // Validate username (alphanumeric, 3-30 chars)
    if (!/^[a-zA-Z0-9_]{3,30}$/.test(request.username)) {
      return { success: false, error: 'Username must be 3-30 alphanumeric characters' };
    }

    // Validate password strength
    if (request.password.length < 8) {
      return { success: false, error: 'Password must be at least 8 characters' };
    }
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(request.password)) {
      return { success: false, error: 'Password must contain uppercase, lowercase, and a number' };
    }

    // Check if email or username already exists
    for (const user of this.users.values()) {
      if (user.email === request.email) {
        return { success: false, error: 'Email already registered' };
      }
      if (user.username === request.username) {
        return { success: false, error: 'Username already taken' };
      }
    }

    // Create user
    const userId = this.generateId('usr');
    const verificationToken = this.generateSecureToken();
    const user: StoredUser = {
      id: userId,
      email: request.email.toLowerCase(),
      username: request.username.toLowerCase(),
      displayName: request.displayName,
      passwordHash: await this.hashPassword(request.password),
      role: 'user',
      emailVerified: false,
      twoFactorEnabled: false,
      backupCodes: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      loginAttempts: 0,
      emailVerificationToken: verificationToken,
    };

    this.users.set(userId, user);

    return { success: true, userId };
  }

  // --------------------------------------------------------------------------
  // User Login
  // --------------------------------------------------------------------------

  async login(request: LoginRequest): Promise<{
    success: boolean;
    userId?: string;
    requiresTwoFactor?: boolean;
    error?: string;
  }> {
    // Find user by email
    let foundUser: StoredUser | undefined;
    for (const user of this.users.values()) {
      if (user.email === request.email.toLowerCase()) {
        foundUser = user;
        break;
      }
    }

    if (!foundUser) {
      return { success: false, error: 'Invalid email or password' };
    }

    // Check if account is locked
    if (foundUser.lockedUntil && foundUser.lockedUntil > new Date()) {
      const minutesLeft = Math.ceil((foundUser.lockedUntil.getTime() - Date.now()) / 60000);
      return { success: false, error: `Account locked. Try again in ${minutesLeft} minutes.` };
    }

    // Verify password
    const passwordValid = await this.verifyPassword(request.password, foundUser.passwordHash);
    if (!passwordValid) {
      foundUser.loginAttempts++;
      if (foundUser.loginAttempts >= 5) {
        foundUser.lockedUntil = new Date(Date.now() + 30 * 60 * 1000); // Lock for 30 min
        foundUser.loginAttempts = 0;
      }
      return { success: false, error: 'Invalid email or password' };
    }

    // Check email verification
    if (!foundUser.emailVerified) {
      return { success: false, error: 'Please verify your email address' };
    }

    // Check 2FA
    if (foundUser.twoFactorEnabled) {
      if (!request.twoFactorCode) {
        return { success: true, userId: foundUser.id, requiresTwoFactor: true };
      }
      const validCode = this.verifyTwoFactorCode(foundUser.twoFactorSecret!, request.twoFactorCode);
      if (!validCode) {
        // Check backup codes
        const backupIdx = foundUser.backupCodes.indexOf(request.twoFactorCode);
        if (backupIdx === -1) {
          return { success: false, error: 'Invalid two-factor authentication code' };
        }
        // Consume backup code
        foundUser.backupCodes.splice(backupIdx, 1);
      }
    }

    // Reset login attempts on success
    foundUser.loginAttempts = 0;
    foundUser.lockedUntil = undefined;
    foundUser.lastLoginAt = new Date();

    return { success: true, userId: foundUser.id };
  }

  // --------------------------------------------------------------------------
  // Email Verification
  // --------------------------------------------------------------------------

  async verifyEmail(token: string): Promise<{ success: boolean; error?: string }> {
    for (const user of this.users.values()) {
      if (user.emailVerificationToken === token) {
        user.emailVerified = true;
        user.emailVerificationToken = undefined;
        user.updatedAt = new Date();
        return { success: true };
      }
    }
    return { success: false, error: 'Invalid or expired verification token' };
  }

  // --------------------------------------------------------------------------
  // Password Reset
  // --------------------------------------------------------------------------

  async requestPasswordReset(email: string): Promise<{ success: boolean; token?: string }> {
    for (const user of this.users.values()) {
      if (user.email === email.toLowerCase()) {
        const token = this.generateSecureToken();
        user.passwordResetToken = token;
        user.passwordResetExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
        user.updatedAt = new Date();
        return { success: true, token };
      }
    }
    // Return success even if user not found (prevent enumeration)
    return { success: true };
  }

  async resetPassword(token: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
    for (const user of this.users.values()) {
      if (user.passwordResetToken === token) {
        if (!user.passwordResetExpiry || user.passwordResetExpiry < new Date()) {
          return { success: false, error: 'Reset token has expired' };
        }
        if (newPassword.length < 8) {
          return { success: false, error: 'Password must be at least 8 characters' };
        }
        user.passwordHash = await this.hashPassword(newPassword);
        user.passwordResetToken = undefined;
        user.passwordResetExpiry = undefined;
        user.updatedAt = new Date();
        return { success: true };
      }
    }
    return { success: false, error: 'Invalid reset token' };
  }

  // --------------------------------------------------------------------------
  // Two-Factor Authentication
  // --------------------------------------------------------------------------

  async setupTwoFactor(userId: string): Promise<{ success: boolean; setup?: TwoFactorSetup; error?: string }> {
    const user = this.users.get(userId);
    if (!user) return { success: false, error: 'User not found' };

    const secret = this.generateSecureToken().substring(0, 32);
    const backupCodes = Array.from({ length: 10 }, () => this.generateBackupCode());

    return {
      success: true,
      setup: {
        secret,
        qrCodeUrl: `otpauth://totp/QuantMail:${user.email}?secret=${secret}&issuer=QuantMail`,
        backupCodes,
      },
    };
  }

  async enableTwoFactor(userId: string, secret: string, code: string, backupCodes: string[]): Promise<{ success: boolean; error?: string }> {
    const user = this.users.get(userId);
    if (!user) return { success: false, error: 'User not found' };

    const valid = this.verifyTwoFactorCode(secret, code);
    if (!valid) return { success: false, error: 'Invalid verification code' };

    user.twoFactorEnabled = true;
    user.twoFactorSecret = secret;
    user.backupCodes = backupCodes;
    user.updatedAt = new Date();

    return { success: true };
  }

  async disableTwoFactor(userId: string, password: string): Promise<{ success: boolean; error?: string }> {
    const user = this.users.get(userId);
    if (!user) return { success: false, error: 'User not found' };

    const valid = await this.verifyPassword(password, user.passwordHash);
    if (!valid) return { success: false, error: 'Invalid password' };

    user.twoFactorEnabled = false;
    user.twoFactorSecret = undefined;
    user.backupCodes = [];
    user.updatedAt = new Date();

    return { success: true };
  }

  // --------------------------------------------------------------------------
  // OAuth2 Authorization
  // --------------------------------------------------------------------------

  authorize(params: {
    clientId: string;
    redirectUri: string;
    responseType: string;
    scope: string;
    state: string;
    codeChallenge?: string;
    codeChallengeMethod?: string;
  }): { success: boolean; client?: OAuthClient; scopes?: PermissionScope[]; error?: string } {
    const client = this.clients.get(params.clientId);
    if (!client) {
      return { success: false, error: 'Invalid client_id' };
    }

    if (!client.redirectUris.includes(params.redirectUri)) {
      return { success: false, error: 'Invalid redirect_uri' };
    }

    if (params.responseType !== 'code') {
      return { success: false, error: 'Unsupported response_type' };
    }

    const requestedScopes = params.scope.split(' ').filter(Boolean) as PermissionScope[];
    const invalidScopes = requestedScopes.filter((s) => !client.allowedScopes.includes(s));
    if (invalidScopes.length > 0) {
      return { success: false, error: `Invalid scopes: ${invalidScopes.join(', ')}` };
    }

    return { success: true, client, scopes: requestedScopes };
  }

  generateAuthCode(userId: string, clientId: string, scopes: PermissionScope[], redirectUri: string, codeChallenge?: string, codeChallengeMethod?: string): string {
    const code = this.generateSecureToken();
    this.authCodes.set(code, {
      userId,
      clientId,
      scopes,
      redirectUri,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      codeChallenge,
      codeChallengeMethod,
    });
    return code;
  }

  async exchangeAuthCode(code: string, clientId: string, clientSecret: string, redirectUri: string, codeVerifier?: string): Promise<{
    success: boolean;
    accessToken?: string;
    refreshToken?: string;
    expiresIn?: number;
    scope?: string;
    error?: string;
  }> {
    const authCode = this.authCodes.get(code);
    if (!authCode) {
      return { success: false, error: 'Invalid authorization code' };
    }

    // One-time use
    this.authCodes.delete(code);

    if (authCode.expiresAt < new Date()) {
      return { success: false, error: 'Authorization code expired' };
    }

    if (authCode.clientId !== clientId) {
      return { success: false, error: 'Client ID mismatch' };
    }

    if (authCode.redirectUri !== redirectUri) {
      return { success: false, error: 'Redirect URI mismatch' };
    }

    // Verify client secret
    const client = this.clients.get(clientId);
    if (!client) return { success: false, error: 'Client not found' };

    if (!client.isFirstParty && client.clientSecret !== clientSecret) {
      return { success: false, error: 'Invalid client credentials' };
    }

    // Verify PKCE
    if (authCode.codeChallenge) {
      if (!codeVerifier) return { success: false, error: 'Code verifier required' };
      const valid = this.verifyCodeChallenge(codeVerifier, authCode.codeChallenge, authCode.codeChallengeMethod || 'plain');
      if (!valid) return { success: false, error: 'Invalid code verifier' };
    }

    // Generate tokens
    const accessToken = this.generateAccessToken(authCode.userId, authCode.scopes, clientId);
    const refreshToken = this.generateSecureToken();

    // Store grant
    const grantId = this.generateId('grant');
    this.grants.set(grantId, {
      id: grantId,
      userId: authCode.userId,
      clientId,
      scopes: authCode.scopes,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      isRevoked: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return {
      success: true,
      accessToken,
      refreshToken,
      expiresIn: 3600,
      scope: authCode.scopes.join(' '),
    };
  }

  // --------------------------------------------------------------------------
  // Token Management
  // --------------------------------------------------------------------------

  async revokeToken(token: string): Promise<{ success: boolean }> {
    this.revokedTokens.add(token);
    return { success: true };
  }

  async revokeAllGrants(userId: string, clientId?: string): Promise<{ success: boolean; revokedCount: number }> {
    let count = 0;
    for (const [id, grant] of this.grants) {
      if (grant.userId === userId && (!clientId || grant.clientId === clientId)) {
        grant.isRevoked = true;
        count++;
      }
    }
    return { success: true, revokedCount: count };
  }

  // --------------------------------------------------------------------------
  // User Info
  // --------------------------------------------------------------------------

  getUserInfo(userId: string): {
    id: string;
    email: string;
    username: string;
    displayName: string;
    emailVerified: boolean;
    role: string;
    createdAt: Date;
  } | null {
    const user = this.users.get(userId);
    if (!user) return null;
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      displayName: user.displayName,
      emailVerified: user.emailVerified,
      role: user.role,
      createdAt: user.createdAt,
    };
  }

  // --------------------------------------------------------------------------
  // Private Helpers
  // --------------------------------------------------------------------------

  private registerDefaultClients(): void {
    const ecosystemApps: Array<{ clientId: string; name: string; app: QuantApp; redirectUris: string[]; scopes: PermissionScope[] }> = [
      { clientId: 'quantchat-client', name: 'QuantChat', app: 'quantchat', redirectUris: ['https://chat.quant.app/auth/callback'], scopes: ['profile:read', 'profile:write', 'messages:read', 'messages:write', 'contacts:read', 'realtime:connect'] },
      { clientId: 'quantsync-client', name: 'QuantSync', app: 'quantsync', redirectUris: ['https://sync.quant.app/auth/callback'], scopes: ['profile:read', 'profile:write', 'posts:read', 'posts:write', 'media:upload'] },
      { clientId: 'quantads-client', name: 'QuantAds', app: 'quantads', redirectUris: ['https://ads.quant.app/auth/callback'], scopes: ['profile:read', 'ads:manage', 'analytics:read'] },
      { clientId: 'quantube-client', name: 'QuantTube', app: 'quantube', redirectUris: ['https://tube.quant.app/auth/callback'], scopes: ['profile:read', 'media:read', 'media:upload', 'realtime:connect'] },
      { clientId: 'quantneon-client', name: 'QuantNeon', app: 'quantneon', redirectUris: ['https://neon.quant.app/auth/callback'], scopes: ['profile:read', 'media:read', 'media:upload', 'contacts:read'] },
      { clientId: 'quantedits-client', name: 'QuantEdits', app: 'quantedits', redirectUris: ['https://edits.quant.app/auth/callback'], scopes: ['profile:read', 'media:read', 'media:upload'] },
      { clientId: 'quantmax-client', name: 'QuantMax', app: 'quantmax', redirectUris: ['https://max.quant.app/auth/callback'], scopes: ['profile:read', 'profile:write', 'media:upload', 'contacts:read', 'realtime:connect'] },
      { clientId: 'quantai-client', name: 'QuantAI', app: 'quantai', redirectUris: ['https://ai.quant.app/auth/callback'], scopes: ['profile:read', 'ai:use', 'realtime:connect'] },
    ];

    for (const app of ecosystemApps) {
      const client: OAuthClient = {
        id: app.clientId,
        clientId: app.clientId,
        clientSecret: `qcs_${this.generateSecureToken().substring(0, 40)}`,
        name: app.name,
        description: `${app.name} application`,
        redirectUris: app.redirectUris,
        allowedScopes: app.scopes,
        grantTypes: ['authorization_code', 'refresh_token'],
        isFirstParty: true,
        app: app.app,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.clients.set(app.clientId, client);
    }
  }

  private async hashPassword(password: string): Promise<string> {
    // Simplified hash for demonstration - in production use bcrypt/argon2
    let hash = 0;
    const salted = `quant_salt_${password}_ecosystem`;
    for (let i = 0; i < salted.length; i++) {
      const char = salted.charCodeAt(i);
      hash = ((hash << 5) - hash + char) | 0;
    }
    return `hashed_${Math.abs(hash).toString(36)}`;
  }

  private async verifyPassword(password: string, hash: string): Promise<boolean> {
    const computed = await this.hashPassword(password);
    return computed === hash;
  }

  private verifyTwoFactorCode(secret: string, code: string): boolean {
    // Simplified TOTP verification
    const timeStep = Math.floor(Date.now() / 30000);
    const expected = this.generateTOTP(secret, timeStep);
    const previous = this.generateTOTP(secret, timeStep - 1);
    return code === expected || code === previous;
  }

  private generateTOTP(secret: string, counter: number): string {
    let hash = 0;
    const input = `${secret}:${counter}`;
    for (let i = 0; i < input.length; i++) {
      hash = ((hash << 5) - hash + input.charCodeAt(i)) | 0;
    }
    return String(Math.abs(hash) % 1000000).padStart(6, '0');
  }

  private verifyCodeChallenge(verifier: string, challenge: string, method: string): boolean {
    if (method === 'plain') return verifier === challenge;
    // S256: simplified
    let hash = 0;
    for (let i = 0; i < verifier.length; i++) {
      hash = ((hash << 5) - hash + verifier.charCodeAt(i)) | 0;
    }
    return Math.abs(hash).toString(36) === challenge;
  }

  private generateAccessToken(userId: string, scopes: PermissionScope[], clientId: string): string {
    const payload = {
      sub: userId,
      scopes,
      clientId,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
      iss: 'quantmail',
    };
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const sig = this.simpleSign(`${header}.${body}`);
    return `${header}.${body}.${sig}`;
  }

  private simpleSign(data: string): string {
    let hash = 0;
    const combined = data + 'quantmail_jwt_secret_key';
    for (let i = 0; i < combined.length; i++) {
      hash = ((hash << 5) - hash + combined.charCodeAt(i)) | 0;
    }
    return Math.abs(hash).toString(36).padStart(8, '0');
  }

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 10)}`;
  }

  private generateSecureToken(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 64; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  private generateBackupCode(): string {
    const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let result = '';
    for (let i = 0; i < 8; i++) {
      if (i === 4) result += '-';
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
}
