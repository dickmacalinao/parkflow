import { beforeAll } from 'vitest';

process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET = 'test-access-secret-please-ignore';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-please-ignore';
const testDatabaseUrl = 'postgresql://parkflow:parkflow@localhost:5432/parkflow_test?schema=public';
if (process.env.CI !== 'true') process.env.DATABASE_URL = testDatabaseUrl;
else process.env.DATABASE_URL ??= testDatabaseUrl;
