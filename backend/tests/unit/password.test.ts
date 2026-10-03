import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword, isStrongPassword } from '../../src/utils/password.js';

describe('password utils', () => {
  it('hashes and verifies a matching password', async () => {
    const hash = await hashPassword('Str0ngPass!');
    expect(await verifyPassword('Str0ngPass!', hash)).toBe(true);
  });

  it('rejects a non-matching password', async () => {
    const hash = await hashPassword('Str0ngPass!');
    expect(await verifyPassword('WrongPass!', hash)).toBe(false);
  });

  it.each([
    ['short1A', false],
    ['nouppercase1', false],
    ['NOLOWERCASE1', false],
    ['NoDigitsHere', false],
    ['GoodPass1', true],
  ])('isStrongPassword(%s) -> %s', (candidate, expected) => {
    expect(isStrongPassword(candidate)).toBe(expected);
  });
});
