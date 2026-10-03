import { z } from 'zod';
import { Role, UserStatus } from '@prisma/client';

export const updateProfileSchema = z.object({
  firstName: z.string().trim().min(1).optional(),
  lastName: z.string().trim().min(1).optional(),
  phone: z.string().trim().nullable().optional(),
  avatarUrl: z.string().url().nullable().optional(),
  preferences: z.record(z.unknown()).optional(),
  buildingNo: z.string().trim().min(1).nullable().optional(),
  floorNo: z.string().trim().min(1).nullable().optional(),
  unitNo: z.string().trim().min(1).nullable().optional(),
});

export const inviteUserSchema = z.object({
  firstName: z.string().trim().min(1),
  lastName: z.string().trim().min(1),
  email: z.string().trim().email(),
  role: z.nativeEnum(Role),
  propertyId: z.string().uuid().optional(),
  buildingNo: z.string().trim().min(1).optional(),
  floorNo: z.string().trim().min(1).optional(),
  unitNo: z.string().trim().min(1).optional(),
}).superRefine((data, ctx) => {
  if (data.role === Role.SUPER_ADMIN && data.propertyId) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['propertyId'], message: 'Super Admin accounts cannot be assigned to a property.' });
  }
});

export const updateUserStatusSchema = z.object({
  status: z.nativeEnum(UserStatus),
});

export const updateUserPropertySchema = z.object({
  propertyId: z.string().uuid().nullable(),
});

export const listUsersQuerySchema = z.object({
  role: z.nativeEnum(Role).optional(),
  status: z.nativeEnum(UserStatus).optional(),
  propertyId: z.string().uuid().optional(),
  q: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
