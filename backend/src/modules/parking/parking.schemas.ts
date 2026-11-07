import { z } from 'zod';
import { SlotStatus, SlotType } from '@prisma/client';

export const createZoneSchema = z.object({
  propertyId: z.string().uuid(),
  name: z.string().trim().min(1),
  description: z.string().trim().optional(),
  sortOrder: z.number().int().default(0),
});

export const updateZoneSchema = createZoneSchema
  .partial()
  .omit({ propertyId: true })
  .extend({ description: z.string().trim().nullable().optional() });

const timeOfDay = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use HH:mm.');

const slotBaseSchema = z.object({
  zoneId: z.string().uuid(),
  code: z.string().trim().min(1),
  type: z.nativeEnum(SlotType).default(SlotType.STANDARD),
  hourlyRate: z.number().min(0).optional(),
  dailyRate: z.number().min(0),
  monthlyRate: z.number().min(0).optional(),
  isEvCharging: z.boolean().default(false),
  isShared: z.boolean().default(false),
  availableDays: z.array(z.number().int().min(0).max(6)).default([]),
  availableFromDate: z.coerce.date().nullable().optional(),
  availableToDate: z.coerce.date().nullable().optional(),
  availableStartTime: timeOfDay.nullable().optional(),
  availableEndTime: timeOfDay.nullable().optional(),
});

type SharingFields = {
  availableFromDate?: Date | null;
  availableToDate?: Date | null;
  availableStartTime?: string | null;
  availableEndTime?: string | null;
};

function validateSharing(data: SharingFields, ctx: z.RefinementCtx) {
  if (data.availableFromDate && data.availableToDate && data.availableToDate < data.availableFromDate) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['availableToDate'], message: 'End date must not be before start date.' });
  }
  if (Boolean(data.availableStartTime) !== Boolean(data.availableEndTime)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['availableEndTime'], message: 'Provide both start and end time.' });
  } else if (data.availableStartTime && data.availableEndTime && data.availableEndTime <= data.availableStartTime) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['availableEndTime'], message: 'End time must be after start time.' });
  }
}

export const createSlotSchema = slotBaseSchema.superRefine(validateSharing);

export const bulkCreateSlotsSchema = z.object({
  zoneId: z.string().uuid(),
  prefix: z.string().trim().min(1),
  count: z.number().int().min(1).max(500),
  startNumber: z.number().int().min(1).default(1),
  type: z.nativeEnum(SlotType).default(SlotType.STANDARD),
  dailyRate: z.number().min(0),
  hourlyRate: z.number().min(0).optional(),
});

export const updateSlotSchema = slotBaseSchema.partial().omit({ zoneId: true }).superRefine(validateSharing);

export const slotStatusSchema = z.object({ status: z.nativeEnum(SlotStatus) });

export const reviewSlotSchema = z.object({
  decision: z.enum(['APPROVED', 'REJECTED']),
  reason: z.string().trim().optional(),
});

export const listSlotsQuerySchema = z.object({
  propertyId: z.string().uuid().optional(),
  zoneId: z.string().uuid().optional(),
  status: z.nativeEnum(SlotStatus).optional(),
  type: z.nativeEnum(SlotType).optional(),
  startAt: z.coerce.date().optional(),
  endAt: z.coerce.date().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
}).superRefine((filters, ctx) => {
  if (Boolean(filters.startAt) !== Boolean(filters.endAt)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['endAt'],
      message: 'Start and end are both required for availability checks.',
    });
  }
  if (filters.startAt && filters.endAt && filters.endAt <= filters.startAt) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['endAt'],
      message: 'End must be after start.',
    });
  }
});
