// ============================================================================
// QuantMail API - Auth Controller
// Business logic for authentication endpoints
// ============================================================================

import type { Request, Response } from '../middleware';
import { OAuthService } from '../services/oauth-service';
import type { LoginRequest, RegisterRequest, PasswordResetRequest, PasswordResetConfirm } from '../../src/types';

export class AuthController {
  private oauthService: OAuthService;

  constructor(oauthService: OAuthService) {
    this.oauthService = oauthService;
  }

  async register(req: Request, res: Response): Promise<void> {
    const body = req.body as RegisterRequest;
    const result = await this.oauthService.register(body);

    if (!result.success) {
      res.status(400).json({ success: false, error: { code: 'REGISTRATION_FAILED', message: result.error!, statusCode: 400 } });
      return;
    }

    res.status(201).json({
      success: true,
      data: { userId: result.userId, message: 'Registration successful. Please check your email to verify your account.' },
    });
  }

  async login(req: Request, res: Response): Promise<void> {
    const body = req.body as LoginRequest;

    if (!body.email || !body.password) {
      res.status(400).json({ success: false, error: { code: 'INVALID_REQUEST', message: 'Email and password are required', statusCode: 400 } });
      return;
    }

    const result = await this.oauthService.login(body);

    if (!result.success) {
      res.status(401).json({ success: false, error: { code: 'LOGIN_FAILED', message: result.error!, statusCode: 401 } });
      return;
    }

    if (result.requiresTwoFactor) {
      res.status(200).json({ success: true, data: { requiresTwoFactor: true, userId: result.userId } });
      return;
    }

    // Generate session tokens
    const tokens = await this.oauthService.exchangeAuthCode(
      this.oauthService.generateAuthCode(result.userId!, 'quantmail-web', ['profile:read', 'profile:write', 'email:read', 'email:send'], 'https://mail.quant.app/auth/callback'),
      'quantmail-web', '', 'https://mail.quant.app/auth/callback'
    );

    res.status(200).json({
      success: true,
      data: {
        userId: result.userId,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: tokens.expiresIn,
      },
    });
  }

  async verifyEmail(req: Request, res: Response): Promise<void> {
    const token = req.query['token'] as string;
    if (!token) {
      res.status(400).json({ success: false, error: { code: 'MISSING_TOKEN', message: 'Verification token is required', statusCode: 400 } });
      return;
    }

    const result = await this.oauthService.verifyEmail(token);
    if (!result.success) {
      res.status(400).json({ success: false, error: { code: 'VERIFICATION_FAILED', message: result.error!, statusCode: 400 } });
      return;
    }

    res.status(200).json({ success: true, data: { message: 'Email verified successfully' } });
  }

  async requestPasswordReset(req: Request, res: Response): Promise<void> {
    const body = req.body as PasswordResetRequest;
    if (!body.email) {
      res.status(400).json({ success: false, error: { code: 'INVALID_REQUEST', message: 'Email is required', statusCode: 400 } });
      return;
    }

    await this.oauthService.requestPasswordReset(body.email);
    // Always return success to prevent email enumeration
    res.status(200).json({ success: true, data: { message: 'If the email exists, a reset link has been sent.' } });
  }

  async resetPassword(req: Request, res: Response): Promise<void> {
    const body = req.body as PasswordResetConfirm;
    if (!body.token || !body.newPassword) {
      res.status(400).json({ success: false, error: { code: 'INVALID_REQUEST', message: 'Token and new password are required', statusCode: 400 } });
      return;
    }

    const result = await this.oauthService.resetPassword(body.token, body.newPassword);
    if (!result.success) {
      res.status(400).json({ success: false, error: { code: 'RESET_FAILED', message: result.error!, statusCode: 400 } });
      return;
    }

    res.status(200).json({ success: true, data: { message: 'Password reset successfully' } });
  }

  async setupTwoFactor(req: Request, res: Response): Promise<void> {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required', statusCode: 401 } });
      return;
    }

    const result = await this.oauthService.setupTwoFactor(userId);
    if (!result.success) {
      res.status(400).json({ success: false, error: { code: '2FA_SETUP_FAILED', message: result.error!, statusCode: 400 } });
      return;
    }

    res.status(200).json({ success: true, data: result.setup });
  }

  async enableTwoFactor(req: Request, res: Response): Promise<void> {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required', statusCode: 401 } });
      return;
    }

    const { secret, code, backupCodes } = req.body as { secret: string; code: string; backupCodes: string[] };
    const result = await this.oauthService.enableTwoFactor(userId, secret, code, backupCodes);
    if (!result.success) {
      res.status(400).json({ success: false, error: { code: '2FA_ENABLE_FAILED', message: result.error!, statusCode: 400 } });
      return;
    }

    res.status(200).json({ success: true, data: { message: 'Two-factor authentication enabled' } });
  }

  async disableTwoFactor(req: Request, res: Response): Promise<void> {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required', statusCode: 401 } });
      return;
    }

    const { password } = req.body as { password: string };
    const result = await this.oauthService.disableTwoFactor(userId, password);
    if (!result.success) {
      res.status(400).json({ success: false, error: { code: '2FA_DISABLE_FAILED', message: result.error!, statusCode: 400 } });
      return;
    }

    res.status(200).json({ success: true, data: { message: 'Two-factor authentication disabled' } });
  }

  // OAuth2 endpoints
  async authorize(req: Request, res: Response): Promise<void> {
    const params = {
      clientId: req.query['client_id'] as string,
      redirectUri: req.query['redirect_uri'] as string,
      responseType: req.query['response_type'] as string,
      scope: req.query['scope'] as string || 'profile:read',
      state: req.query['state'] as string,
      codeChallenge: req.query['code_challenge'] as string | undefined,
      codeChallengeMethod: req.query['code_challenge_method'] as string | undefined,
    };

    if (!params.clientId || !params.redirectUri || !params.responseType || !params.state) {
      res.status(400).json({ success: false, error: { code: 'INVALID_REQUEST', message: 'Missing required OAuth parameters', statusCode: 400 } });
      return;
    }

    const result = this.oauthService.authorize(params);
    if (!result.success) {
      res.status(400).json({ success: false, error: { code: 'AUTHORIZATION_FAILED', message: result.error!, statusCode: 400 } });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        client: { name: result.client!.name, description: result.client!.description },
        requestedScopes: result.scopes,
        authorizationUrl: `/auth/consent?client_id=${params.clientId}&scope=${params.scope}&state=${params.state}`,
      },
    });
  }

  async token(req: Request, res: Response): Promise<void> {
    const body = req.body as {
      grant_type: string;
      code?: string;
      client_id: string;
      client_secret?: string;
      redirect_uri?: string;
      code_verifier?: string;
      refresh_token?: string;
    };

    if (!body.grant_type || !body.client_id) {
      res.status(400).json({ success: false, error: { code: 'INVALID_REQUEST', message: 'grant_type and client_id are required', statusCode: 400 } });
      return;
    }

    if (body.grant_type === 'authorization_code') {
      if (!body.code || !body.redirect_uri) {
        res.status(400).json({ success: false, error: { code: 'INVALID_REQUEST', message: 'code and redirect_uri are required', statusCode: 400 } });
        return;
      }

      const result = await this.oauthService.exchangeAuthCode(
        body.code, body.client_id, body.client_secret || '', body.redirect_uri, body.code_verifier
      );

      if (!result.success) {
        res.status(400).json({ success: false, error: { code: 'TOKEN_EXCHANGE_FAILED', message: result.error!, statusCode: 400 } });
        return;
      }

      res.status(200).json({
        access_token: result.accessToken,
        token_type: 'Bearer',
        expires_in: result.expiresIn,
        refresh_token: result.refreshToken,
        scope: result.scope,
      });
      return;
    }

    res.status(400).json({ success: false, error: { code: 'UNSUPPORTED_GRANT', message: `Grant type "${body.grant_type}" not supported`, statusCode: 400 } });
  }

  async revoke(req: Request, res: Response): Promise<void> {
    const { token } = req.body as { token: string };
    if (!token) {
      res.status(400).json({ success: false, error: { code: 'INVALID_REQUEST', message: 'Token is required', statusCode: 400 } });
      return;
    }

    await this.oauthService.revokeToken(token);
    res.status(200).json({ success: true });
  }

  async userInfo(req: Request, res: Response): Promise<void> {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required', statusCode: 401 } });
      return;
    }

    const info = this.oauthService.getUserInfo(userId);
    if (!info) {
      res.status(404).json({ success: false, error: { code: 'USER_NOT_FOUND', message: 'User not found', statusCode: 404 } });
      return;
    }

    res.status(200).json({ success: true, data: info });
  }
}
