import { describe, expect, it, vi } from 'vitest';
import { ZodError, z } from 'zod';
import { errorHandler } from '../../src/middleware/errorHandler.js';
import { conflict, notFound } from '../../src/utils/errors.js';

function mockRes() {
  const res: { statusCode?: number; body?: unknown; status: (c: number) => typeof res; json: (b: unknown) => typeof res } = {
    status(code) {
      res.statusCode = code;
      return res;
    },
    json(body) {
      res.body = body;
      return res;
    },
  };
  return res;
}

describe('errorHandler', () => {
  it('maps AppError to its own status and code', () => {
    const res = mockRes();
    errorHandler(notFound('Reservation not found.'), {} as never, res as never, vi.fn());
    expect(res.statusCode).toBe(404);
    expect((res.body as { error: { code: string } }).error.code).toBe('NOT_FOUND');
  });

  it('maps a conflict AppError to 409', () => {
    const res = mockRes();
    errorHandler(conflict('Bay already booked.'), {} as never, res as never, vi.fn());
    expect(res.statusCode).toBe(409);
  });

  it('maps ZodError to 400 with field details', () => {
    const res = mockRes();
    const schema = z.object({ email: z.string().email() });
    const result = schema.safeParse({ email: 'not-an-email' });
    expect(result.success).toBe(false);
    if (!result.success) {
      errorHandler(result.error as ZodError, {} as never, res as never, vi.fn());
    }
    expect(res.statusCode).toBe(400);
  });

  it('falls back to 500 for unrecognized errors', () => {
    const res = mockRes();
    errorHandler(new Error('boom'), { path: '/x' } as never, res as never, vi.fn());
    expect(res.statusCode).toBe(500);
  });
});
