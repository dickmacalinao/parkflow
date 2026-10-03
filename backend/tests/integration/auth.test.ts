/**
 * Integration test against a real Postgres database (see .github/workflows/backend-ci.yml,
 * which runs these with a postgres service container). Skipped automatically if DATABASE_URL
 * isn't reachable, so `vitest run` still passes in an environment with no database configured.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { execSync } from 'node:child_process';
import { createApp } from '../../src/app.js';
import { prisma } from '../../src/lib/prisma.js';

const app = createApp();
let dbAvailable = false;

beforeAll(async () => {
  try {
    execSync('npx prisma db push --skip-generate', { stdio: 'ignore' });
    await prisma.$connect();
    dbAvailable = true;
  } catch {
    dbAvailable = false;
  }
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('auth flow', () => {
  it('registers, then blocks login until the email is verified', async ({ skip }) => {
    if (!dbAvailable) skip();
    const email = `test.${Date.now()}@example.com`;
    const property = await prisma.property.upsert({
      where: { id: '00000000-0000-0000-0000-000000000099' },
      update: { status: 'ACTIVE', deletedAt: null },
      create: {
        id: '00000000-0000-0000-0000-000000000099',
        name: 'Auth Test Property',
        type: 'RESIDENTIAL_CONDOMINIUM',
        status: 'ACTIVE',
        addressLine1: '1 Test Way',
        city: 'Test City',
        state: 'CA',
        postalCode: '90000',
        country: 'USA',
      },
    });

    const registerRes = await request(app).post('/api/auth/register').send({
      firstName: 'Test',
      lastName: 'User',
      email,
      propertyId: property.id,
      password: 'Str0ngPass!',
    });
    expect(registerRes.status).toBe(201);

    const loginRes = await request(app).post('/api/auth/login').send({ email, password: 'Str0ngPass!' });
    expect(loginRes.status).toBe(401);
    expect(loginRes.body.error.message).toMatch(/verify your email/i);
  });

  it.runIf(() => dbAvailable)('rejects a malformed registration payload with 400', async () => {
    const res = await request(app).post('/api/auth/register').send({ email: 'not-an-email' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it.runIf(() => dbAvailable)('rejects unauthenticated access to a protected route', async () => {
    const res = await request(app).get('/api/users/me');
    expect(res.status).toBe(401);
  });
});
