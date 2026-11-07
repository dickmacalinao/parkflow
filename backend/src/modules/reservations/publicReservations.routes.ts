import { Router } from 'express';
import { z } from 'zod';
import { AuditAction, PaymentMethod, PaymentStatus, ReservationStatus, ReservationType, Role, SlotApprovalStatus, SlotStatus, UserStatus } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { asyncHandler } from '../../middleware/asyncHandler.js';
import { authRateLimiter } from '../../middleware/rateLimiter.js';
import { validate } from '../../middleware/validate.js';
import { badRequest, conflict, notFound } from '../../utils/errors.js';
import { generateOpaqueToken } from '../../utils/tokens.js';
import { recordAudit } from '../audit/audit.service.js';
import { isSlotBookableByOthers } from '../parking/slotAvailability.js';
import { emailTemplates, sendEmail } from '../../lib/email.js';
import { env } from '../../config/env.js';

const router = Router();
const scopeSchema = z.object({ kind: z.enum(['owner', 'property']), id: z.string().uuid() });
const rangeSchema = z.object({ startAt: z.coerce.date(), endAt: z.coerce.date() })
  .refine((value) => value.endAt > value.startAt, { message: 'End must be after start.' })
  .refine((value) => value.startAt.getTime() > Date.now() - 300000, { message: 'Start cannot be in the past.' });
const bookingSchema = z.object({
  slotId: z.string().uuid(),
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(254),
  phone: z.string().trim().min(1).max(32),
  plate: z.string().trim().min(1).max(32),
  method: z.nativeEnum(PaymentMethod),
  providerRef: z.string().trim().min(1).max(32),
  startAt: z.coerce.date(),
  endAt: z.coerce.date(),
}).refine((value) => value.endAt > value.startAt, { message: 'End must be after start.' })
  .refine((value) => value.startAt.getTime() > Date.now() - 300000, { message: 'Start cannot be in the past.' });

async function resolveScope(kind: string, id: string) {
  if (kind === 'owner') {
    const owner = await prisma.user.findFirst({ where: { id, role: Role.PROPERTY_OWNER, status: UserStatus.ACTIVE, deletedAt: null }, select: { id: true, propertyId: true } });
    if (!owner?.propertyId) throw notFound('Owner not found.');
    const property = await prisma.property.findFirst({ where: { id: owner.propertyId, status: 'ACTIVE', deletedAt: null }, select: { id: true, name: true, timezone: true } });
    if (!property) throw notFound('Property not found.');
    return { property, ownerId: owner.id };
  }
  const property = await prisma.property.findFirst({ where: { id, status: 'ACTIVE', deletedAt: null }, select: { id: true, name: true, timezone: true } });
  if (!property) throw notFound('Property not found.');
  return { property, ownerId: undefined };
}

router.get('/:kind/:id/slots', validate({ params: scopeSchema, query: rangeSchema }), asyncHandler(async (req, res) => {
  const { property, ownerId } = await resolveScope(req.params.kind, req.params.id);
  const { startAt, endAt } = req.query as unknown as z.infer<typeof rangeSchema>;
  const slots = await prisma.parkingSlot.findMany({
    where: {
      deletedAt: null, approvalStatus: SlotApprovalStatus.APPROVED,
      status: { in: [SlotStatus.AVAILABLE, SlotStatus.RESERVED] },
      ...(ownerId ? { ownerUserId: ownerId } : {}),
      zone: { propertyId: property.id, deletedAt: null },
      reservations: { none: { deletedAt: null, status: { notIn: [ReservationStatus.REJECTED, ReservationStatus.CANCELLED, ReservationStatus.EXPIRED, ReservationStatus.NO_SHOW] }, startAt: { lt: endAt }, endAt: { gt: startAt } } },
    },
    include: { zone: { select: { name: true } }, owner: { select: { paymentInfo: true, deletedAt: true } } }, orderBy: { code: 'asc' },
  });
  res.json({ property: { name: property.name }, slots: slots.filter((slot) => isSlotBookableByOthers(slot, property.timezone, startAt, endAt)).map((slot) => ({ id: slot.id, code: slot.code, zone: slot.zone.name, dailyRate: slot.dailyRate, hourlyRate: slot.hourlyRate, paymentInfo: slot.owner && !slot.owner.deletedAt ? slot.owner.paymentInfo : null })) });
}));

router.post('/:kind/:id/reservations', authRateLimiter, validate({ params: scopeSchema, body: bookingSchema }), asyncHandler(async (req, res) => {
  const { property, ownerId } = await resolveScope(req.params.kind, req.params.id);
  const input = req.body as z.infer<typeof bookingSchema>;
  const slot = await prisma.parkingSlot.findFirst({ where: { id: input.slotId, deletedAt: null, approvalStatus: SlotApprovalStatus.APPROVED, status: { in: [SlotStatus.AVAILABLE, SlotStatus.RESERVED] }, ...(ownerId ? { ownerUserId: ownerId } : {}), zone: { propertyId: property.id, deletedAt: null } } });
  if (!slot) throw notFound('Parking slot not found.');
  if (!isSlotBookableByOthers(slot, property.timezone, input.startAt, input.endAt)) throw conflict('This slot is not available for the selected dates.');
  const overlapping = await prisma.reservation.findFirst({ where: { slotId: slot.id, deletedAt: null, status: { notIn: [ReservationStatus.REJECTED, ReservationStatus.CANCELLED, ReservationStatus.EXPIRED, ReservationStatus.NO_SHOW] }, startAt: { lt: input.endAt }, endAt: { gt: input.startAt } }, select: { id: true } });
  if (overlapping) throw conflict('This slot is already reserved for part of that time.');
  const hours = (input.endAt.getTime() - input.startAt.getTime()) / 3600000;
  const daily = Number(slot.dailyRate);
  const hourly = slot.hourlyRate ? Number(slot.hourlyRate) : daily / 24;
  const amount = Math.round((Math.floor(hours / 24) * daily + Math.min((hours % 24) * hourly, daily)) * 100) / 100;
  try {
    const reservation = await prisma.$transaction(async (transaction) => {
      const created = await transaction.reservation.create({ data: { code: `RES-${generateOpaqueToken().slice(0, 8).toUpperCase()}`, propertyId: property.id, slotId: slot.id, type: ReservationType.VISITOR, startAt: input.startAt, endAt: input.endAt, rate: slot.dailyRate, amount, guestName: input.name, guestEmail: input.email, guestPhone: input.phone, guestPlate: input.plate.toUpperCase(), qrCodeToken: generateOpaqueToken(), payment: { create: { amount, method: input.method, status: PaymentStatus.PENDING, providerRef: input.providerRef, paidAt: new Date() } } } });
      await transaction.parkingSlot.update({ where: { id: slot.id }, data: { status: SlotStatus.RESERVED } });
      return created;
    });
    await recordAudit({ req, action: AuditAction.CREATE, entityType: 'Reservation', entityId: reservation.id, propertyId: property.id });
    if (slot.ownerUserId) {
      const owner = await prisma.user.findFirst({ where: { id: slot.ownerUserId, deletedAt: null }, select: { firstName: true, email: true } });
      if (owner) await sendEmail({ to: owner.email, ...emailTemplates.createReservation(owner.firstName, property.name, slot.code, env.CLIENT_URL) });
    }
    await sendEmail({ to: input.email, subject: 'Your ParkFlow reservation request', html: `<p>Your reservation request ${reservation.code} is pending approval.</p>` });
    res.status(201).json({ code: reservation.code, status: reservation.status, amount: reservation.amount });
  } catch (error) {
    const databaseError = error as { code?: string; meta?: { message?: string } };
    if (databaseError.code === '23P01' || databaseError.meta?.message?.includes('reservations_no_overlap')) throw conflict('This slot was just booked.');
    throw error;
  }
}));

router.use((_req, _res, next) => next(badRequest('An owner or property is required.')));
export default router;