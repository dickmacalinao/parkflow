import { z } from 'zod';
import { PropertyStatus, PropertyType } from '@prisma/client';

export const createPropertySchema = z.object({
  name: z.string().trim().min(1),
  type: z.nativeEnum(PropertyType),
  addressLine1: z.string().trim().min(1),
  addressLine2: z.string().trim().optional(),
  city: z.string().trim().min(1),
  state: z.string().trim().min(1),
  postalCode: z.string().trim().min(1),
  country: z.string().trim().min(1),
  timezone: z.string().trim().default('UTC'),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  ownerId: z.string().uuid().optional(),
  settings: z.record(z.unknown()).optional(),
});

export const updatePropertySchema = createPropertySchema.partial();

export const decidePropertySchema = z.object({
  status: z.enum([PropertyStatus.ACTIVE, PropertyStatus.REJECTED]),
  reason: z.string().trim().optional(),
});

export const listPropertiesQuerySchema = z.object({
  status: z.nativeEnum(PropertyStatus).optional(),
  type: z.nativeEnum(PropertyType).optional(),
  q: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
