import { z } from 'zod';
import { SlotStatus, SlotType } from '@prisma/client';

export const createZoneSchema = z.object({
  propertyId: z.string().uuid(),
  name: z.string().trim().min(1),
  description: z.string().trim().optional(),
  sortOrder: z.number().int().default(0),
});

export const updateZoneSchema = createZoneSchema.partial().omit({ propertyId: true });

export const createSlotSchema = z.object({
  zoneId: z.string().uuid(),
  code: z.string().trim().min(1),
  type: z.nativeEnum(SlotType).default(SlotType.STANDARD),
  hourlyRate: z.number().min(0).optional(),
  dailyRate: z.number().min(0),
  monthlyRate: z.number().min(0).optional(),
  isEvCharging: z.boolean().default(false),
});

export const bulkCreateSlotsSchema = z.object({
  zoneId: z.string().uuid(),
  prefix: z.string().trim().min(1),
  count: z.number().int().min(1).max(500),
  startNumber: z.number().int().min(1).default(1),
  type: z.nativeEnum(SlotType).default(SlotType.STANDARD),
  dailyRate: z.number().min(0),
  hourlyRate: z.number().min(0).optional(),
});

export const updateSlotSchema = createSlotSchema.partial().omit({ zoneId: true });

export const slotStatusSchema = z.object({ status: z.nativeEnum(SlotStatus) });

export const listSlotsQuerySchema = z.object({
  propertyId: z.string().uuid().optional(),
  zoneId: z.string().uuid().optional(),
  status: z.nativeEnum(SlotStatus).optional(),
  type: z.nativeEnum(SlotType).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
});
