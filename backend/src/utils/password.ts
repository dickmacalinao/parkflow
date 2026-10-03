import bcrypt from 'bcryptjs';
import { env } from '../config/env.js';

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, env.BCRYPT_SALT_ROUNDS);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

// OWASP-baseline password policy: 8+ chars, upper, lower, digit. Enforced again in the
// zod schema at the request boundary; kept here too so it travels with the hashing utility.
export function isStrongPassword(plain: string): boolean {
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(plain);
}
