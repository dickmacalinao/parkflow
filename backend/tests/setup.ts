import { beforeAll } from 'vitest';

beforeAll(() => {
  process.env.NODE_ENV = 'test';
  process.env.JWT_ACCESS_SECRET = 'test-access-secret-please-ignore';
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-please-ignore';
  process.env.DATABASE_URL = process.env.DATABASE_URL ?? 'postgresql://parkflow:parkflow@localhost:5432/parkflow_test?schema=public';
});
