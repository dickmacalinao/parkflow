import { describe, expect, it } from 'vitest';
import { signAccessToken, verifyAccessToken, hashToken, generateRefreshToken } from '../../src/utils/tokens.js';

describe('tokens', () => {
  it('round-trips an access token', () => {
    const token = signAccessToken({ sub: 'user-1', role: 'TENANT' });
    const payload = verifyAccessToken(token);
    expect(payload.sub).toBe('user-1');
    expect(payload.role).toBe('TENANT');
  });

  it('rejects a tampered access token', () => {
    const token = signAccessToken({ sub: 'user-1', role: 'TENANT' });
    expect(() => verifyAccessToken(token + 'tampered')).toThrow();
  });

  it('hashToken is deterministic, so a stored hash can find a presented refresh token', () => {
    const token = generateRefreshToken();
    expect(hashToken(token)).toBe(hashToken(token));
  });

  it('generateRefreshToken produces distinct values', () => {
    expect(generateRefreshToken()).not.toBe(generateRefreshToken());
  });
});
