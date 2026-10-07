import { z } from 'zod';

export const newReservationSchema = z
  .object({
    slotId: z.string().uuid('Choose a bay.'),
    startAt: z.string().min(1, 'Start date/time is required.'),
    endAt: z.string().min(1, 'End date/time is required.'),
    plateNumber: z.string().trim().max(32).min(1, 'Plate number is required.'),
    notes: z.string().optional(),
  })
  .refine((d) => new Date(d.endAt) > new Date(d.startAt), { message: 'End must be after start.', path: ['endAt'] });

export type NewReservationInput = z.infer<typeof newReservationSchema>;
