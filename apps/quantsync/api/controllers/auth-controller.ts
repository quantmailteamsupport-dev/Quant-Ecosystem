// ============================================================================
// QuantSync - Auth Controller
// QuantMail SSO, anonymous mode toggle, session management
// ============================================================================

import type { Request, Response } from '../middleware';

interface UserSession {
  userId: string;
  email: string;
  username: string;
  displayName: string;
  isAnonymous: boolean;
  anonymousAlias?: string;
  createdAt: string;
  lastActiveAt: string;
}

class AuthController {
  private sessions: Map<string, UserSession> = new Map();
  private anonymousAliases: string[] = [
    'ShadowWalker', 'NightOwl', 'MysteryVoice', 'HiddenSage', 'PhantomWriter',
    'SecretObserver', 'CloakedMind', 'AnonymousEcho', 'StealthThinker', 'VeiledSoul',
    'DarkHorse', 'SilentStorm', 'GhostWriter', 'InvisibleInk', 'MaskedRebel',
  ];

  async loginWithSSO(req: Request, res: Response): Promise<void> {
    const body = req.body as { quantMailToken: string; redirectUri?: string };

    if (!body.quantMailToken) {
      res.status(400).json({ success: false, error: { code: 'MISSING_TOKEN', message: 'QuantMail SSO token is required', statusCode: 400 } });
      return;
    }

    // Decode the QuantMail SSO token
    try {
      const parts = body.quantMailToken.split('.');
      if (parts.length !== 3) throw new Error('Invalid token format');
      const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());

      const session: UserSession = {
        userId: payload.sub,
        email: payload.email || '',
        username: payload.username || payload.email?.split('@')[0] || '',
        displayName: payload.displayName || payload.username || '',
        isAnonymous: false,
        createdAt: new Date().toISOString(),
        lastActiveAt: new Date().toISOString(),
      };

      this.sessions.set(session.userId, session);

      // Generate QuantSync access token
      const tokenPayload = {
        sub: session.userId,
        email: session.email,
        username: session.username,
        displayName: session.displayName,
        role: 'user',
        iss: 'quantsync',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 86400, // 24 hours
      };

      const accessToken = `eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.${Buffer.from(JSON.stringify(tokenPayload)).toString('base64url')}.quantsync_signature`;

      res.status(200).json({
        success: true,
        data: {
          accessToken,
          refreshToken: `refresh_${session.userId}_${Date.now()}`,
          user: {
            id: session.userId,
            username: session.username,
            displayName: session.displayName,
            email: session.email,
          },
          expiresIn: 86400,
        },
      });
    } catch {
      res.status(401).json({ success: false, error: { code: 'INVALID_SSO_TOKEN', message: 'Invalid QuantMail SSO token', statusCode: 401 } });
    }
  }

  async toggleAnonymousMode(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    const body = req.body as { enabled: boolean };

    const session = this.sessions.get(userId);
    if (!session) {
      // Create a session from the auth data
      const newSession: UserSession = {
        userId,
        email: req.user?.email || '',
        username: req.user?.username || '',
        displayName: req.user?.displayName || '',
        isAnonymous: body.enabled,
        anonymousAlias: body.enabled ? this.generateAnonymousAlias() : undefined,
        createdAt: new Date().toISOString(),
        lastActiveAt: new Date().toISOString(),
      };
      this.sessions.set(userId, newSession);

      res.status(200).json({
        success: true,
        data: {
          isAnonymous: newSession.isAnonymous,
          anonymousAlias: newSession.anonymousAlias,
          message: body.enabled ? 'Anonymous mode enabled. Your posts will not reveal your identity.' : 'Anonymous mode disabled.',
        },
      });
      return;
    }

    session.isAnonymous = body.enabled;
    session.anonymousAlias = body.enabled ? this.generateAnonymousAlias() : undefined;
    session.lastActiveAt = new Date().toISOString();

    res.status(200).json({
      success: true,
      data: {
        isAnonymous: session.isAnonymous,
        anonymousAlias: session.anonymousAlias,
        message: body.enabled ? 'Anonymous mode enabled. Your posts will not reveal your identity.' : 'Anonymous mode disabled.',
      },
    });
  }

  async getSession(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    const session = this.sessions.get(userId);

    res.status(200).json({
      success: true,
      data: session || {
        userId,
        email: req.user?.email || '',
        username: req.user?.username || '',
        displayName: req.user?.displayName || '',
        isAnonymous: false,
        createdAt: new Date().toISOString(),
        lastActiveAt: new Date().toISOString(),
      },
    });
  }

  async refreshToken(req: Request, res: Response): Promise<void> {
    const body = req.body as { refreshToken: string };
    if (!body.refreshToken || !body.refreshToken.startsWith('refresh_')) {
      res.status(401).json({ success: false, error: { code: 'INVALID_REFRESH_TOKEN', message: 'Invalid refresh token', statusCode: 401 } });
      return;
    }

    const parts = body.refreshToken.split('_');
    const userId = parts[1];

    const tokenPayload = {
      sub: userId,
      role: 'user',
      iss: 'quantsync',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 86400,
    };

    const accessToken = `eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.${Buffer.from(JSON.stringify(tokenPayload)).toString('base64url')}.quantsync_signature`;

    res.status(200).json({
      success: true,
      data: { accessToken, expiresIn: 86400 },
    });
  }

  async logout(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    this.sessions.delete(userId);
    res.status(200).json({ success: true, data: { message: 'Logged out successfully' } });
  }

  private generateAnonymousAlias(): string {
    const alias = this.anonymousAliases[Math.floor(Math.random() * this.anonymousAliases.length)];
    const suffix = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
    return `${alias}${suffix}`;
  }

  isAnonymous(userId: string): boolean {
    return this.sessions.get(userId)?.isAnonymous || false;
  }

  getAnonymousAlias(userId: string): string | undefined {
    return this.sessions.get(userId)?.anonymousAlias;
  }
}

export const authController = new AuthController();
export default AuthController;
