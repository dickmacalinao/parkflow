import { z } from 'zod';
import { ReservationStatus, ReservationType } from '@prisma/client';

export const createReservationSchema = z
  .object({
    propertyId: z.string().uuid(),
    slotId: z.string().uuid(),
    vehicleId: z.string().uuid().optional(),
    type: z.nativeEnum(ReservationType).default(ReservationType.TENANT),
    startAt: z.coerce.date(),
    endAt: z.coerce.date(),
    notes: z.string().trim().optional(),
  })
  .refine((d) => d.endAt > d.startAt, { message: 'endAt must be after startAt.', path: ['endAt'] })
  .refine((d) => d.startAt.getTime() > Date.now() - 5 * 60 * 1000, {
    message: 'startAt cannot be in the past.',
    path: ['startAt'],
  });

export const decideReservationSchema = z.object({
  status: z.enum([ReservationStatus.APPROVED, ReservationStatus.REJECTED]),
  reason: z.string().trim().optional(),
});

export const listReservationsQuerySchema = z.object({
  propertyId: z.string().uuid().optional(),
  status: z.nativeEnum(ReservationStatus).optional(),
  requestedById: z.string().uuid().optional(),
  q: z.string().trim().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
