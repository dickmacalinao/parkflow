import { z } from 'zod';

const password = z
  .string()
  .min(8, 'Password must be at least 8 characters.')
  .regex(/[a-z]/, 'Password must include a lowercase letter.')
  .regex(/[A-Z]/, 'Password must include an uppercase letter.')
  .regex(/\d/, 'Password must include a number.');

export const registerSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required.'),
  lastName: z.string().trim().min(1, 'Last name is required.'),
  email: z.string().trim().email('Enter a valid email address.'),
  phone: z.string().trim().optional(),
  propertyId: z.string().uuid(),
  password,
  // Public self-registration is for tenants/visitors only; staff roles are created via invitation.
  role: z.enum(['TENANT', 'VISITOR']).default('TENANT'),
});

export const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1, 'Password is required.'),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required.'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password,
});

export const verifyEmailSchema = z.object({
  token: z.string().min(1),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: password,
});
