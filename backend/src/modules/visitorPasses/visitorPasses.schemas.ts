import { z } from 'zod';

export const createVisitorPassSchema = z
  .object({
    propertyId: z.string().uuid(),
    visitorName: z.string().trim().min(1),
    visitorPhone: z.string().trim().optional(),
    plateNumber: z.string().trim().optional(),
    validFrom: z.coerce.date(),
    validTo: z.coerce.date(),
  })
  .refine((d) => d.validTo > d.validFrom, { message: 'validTo must be after validFrom.', path: ['validTo'] });

export const listVisitorPassesQuerySchema = z.object({
  propertyId: z.string().uuid().optional(),
  hostUserId: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
