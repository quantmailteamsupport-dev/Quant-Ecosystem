import { test, expect } from '@playwright/test';
import { TEST_USERS } from '../../fixtures/test-data';

interface ApiSchema {
  required: string[];
  properties: Record<string, { type: string; items?: { type: string } }>;
}

const SCHEMAS: Record<string, ApiSchema> = {
  loginResponse: {
    required: ['token', 'user'],
    properties: {
      token: { type: 'string' },
      user: { type: 'object' },
      expiresAt: { type: 'string' },
    },
  },
  userProfile: {
    required: ['id', 'email', 'displayName'],
    properties: {
      id: { type: 'string' },
      email: { type: 'string' },
      displayName: { type: 'string' },
      avatar: { type: 'string' },
      createdAt: { type: 'string' },
    },
  },
  chatMessage: {
    required: ['id', 'content', 'senderId', 'timestamp'],
    properties: {
      id: { type: 'string' },
      content: { type: 'string' },
      senderId: { type: 'string' },
      timestamp: { type: 'string' },
      attachments: { type: 'array', items: { type: 'object' } },
    },
  },
  emailMessage: {
    required: ['id', 'from', 'to', 'subject', 'body'],
    properties: {
      id: { type: 'string' },
      from: { type: 'string' },
      to: { type: 'string' },
      subject: { type: 'string' },
      body: { type: 'string' },
      date: { type: 'string' },
      read: { type: 'boolean' },
    },
  },
};

function validateSchema(data: Record<string, unknown>, schema: ApiSchema): boolean {
  for (const field of schema.required) {
    if (!(field in data)) return false;
  }
  return true;
}

test.describe('API Contract Validation', () => {
  let authToken: string;

  test.beforeAll(async ({ request }) => {
    const response = await request.post('/api/auth/login', {
      data: {
        email: TEST_USERS.primary.email,
        password: TEST_USERS.primary.password,
      },
    });
    const body = await response.json();
    authToken = body.token;
  });

  test('POST /api/auth/login should match login response schema', async ({ request }) => {
    const response = await request.post('/api/auth/login', {
      data: {
        email: TEST_USERS.primary.email,
        password: TEST_USERS.primary.password,
      },
    });

    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(validateSchema(body, SCHEMAS.loginResponse)).toBeTruthy();
    expect(typeof body.token).toBe('string');
    expect(body.token.length).toBeGreaterThan(0);
  });

  test('GET /api/users/me should match user profile schema', async ({ request }) => {
    const response = await request.get('/api/users/me', {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(validateSchema(body, SCHEMAS.userProfile)).toBeTruthy();
    expect(body.email).toBe(TEST_USERS.primary.email);
  });

  test('GET /api/chat/messages should match chat messages schema', async ({ request }) => {
    const response = await request.get('/api/chat/messages', {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(Array.isArray(body.messages)).toBeTruthy();
    if (body.messages.length > 0) {
      expect(validateSchema(body.messages[0], SCHEMAS.chatMessage)).toBeTruthy();
    }
  });

  test('GET /api/mail/messages should match email messages schema', async ({ request }) => {
    const response = await request.get('/api/mail/messages', {
      headers: { Authorization: `Bearer ${authToken}` },
      params: { folder: 'inbox' },
    });

    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(Array.isArray(body.messages)).toBeTruthy();
    if (body.messages.length > 0) {
      expect(validateSchema(body.messages[0], SCHEMAS.emailMessage)).toBeTruthy();
    }
  });

  test('should return 401 for unauthenticated requests', async ({ request }) => {
    const response = await request.get('/api/users/me');
    expect(response.status()).toBe(401);
  });

  test('should return proper error format for invalid requests', async ({ request }) => {
    const response = await request.post('/api/auth/login', {
      data: { email: '', password: '' },
    });

    expect(response.status()).toBeGreaterThanOrEqual(400);
    const body = await response.json();
    expect(body).toHaveProperty('error');
    expect(typeof body.error).toBe('string');
  });
});
