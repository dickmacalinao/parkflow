import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { signAccessToken } from '../../src/utils/tokens.js';

const app = createApp();

describe('RBAC', () => {
  it('rejects a TENANT token on an admin-only route', async () => {
    const token = signAccessToken({ sub: 'fake-user-id', role: 'TENANT' });
    const res = await request(app).get('/api/users').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it('rejects a PROPERTY_OWNER token from registering a property', async () => {
    const token = signAccessToken({ sub: 'fake-owner-id', role: 'PROPERTY_OWNER' });
    const res = await request(app)
      .post('/api/properties')
      .set('Authorization', `Bearer ${token}`)
      .send({});
    expect(res.status).toBe(403);
  });

  it('rejects a request with no token at all', async () => {
    const res = await request(app).get('/api/users');
    expect(res.status).toBe(401);
  });

  it('rejects a tampered token', async () => {
    const token = signAccessToken({ sub: 'fake-user-id', role: 'SUPER_ADMIN' });
    const res = await request(app).get('/api/users').set('Authorization', `Bearer ${token}xx`);
    expect(res.status).toBe(401);
  });
});
