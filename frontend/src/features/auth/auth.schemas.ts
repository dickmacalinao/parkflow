import { z } from 'zod';

const password = z
  .string()
  .min(8, 'At least 8 characters.')
  .regex(/[a-z]/, 'Needs a lowercase letter.')
  .regex(/[A-Z]/, 'Needs an uppercase letter.')
  .regex(/\d/, 'Needs a number.');

export const loginSchema = z.object({
  email: z.string().email('Enter a valid email.'),
  password: z.string().min(1, 'Password is required.'),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    firstName: z.string().trim().min(1, 'First name is required.'),
    lastName: z.string().trim().min(1, 'Last name is required.'),
    email: z.string().email('Enter a valid email.'),
    propertyId: z.string().uuid('Choose your property.'),
    phone: z.string().trim().optional(),
    password,
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, { message: 'Passwords do not match.', path: ['confirmPassword'] });
export type RegisterInput = z.infer<typeof registerSchema>;

export const forgotPasswordSchema = z.object({ email: z.string().email('Enter a valid email.') });
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({ password, confirmPassword: z.string() })
  .refine((d) => d.password === d.confirmPassword, { message: 'Passwords do not match.', path: ['confirmPassword'] });
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
