import { AuditAction, ReservationStatus, Role, SlotApprovalStatus, type ReservationType } from '@prisma/client';
import type { Request } from 'express';
import { prisma } from '../../lib/prisma.js';
import { badRequest, conflict, forbidden, notFound } from '../../utils/errors.js';
import { generateOpaqueToken } from '../../utils/tokens.js';
import { recordAudit } from '../audit/audit.service.js';
import { emailTemplates, sendEmail } from '../../lib/email.js';
import { assertRequestPropertyAccess, getAssignedPropertyId } from '../properties/propertyAccess.js';
import { env } from '../../config/env.js';

function generateCode(): string {
  return 'RES-' + generateOpaqueToken().slice(0, 8).toUpperCase();
}

function hoursBetween(a: Date, b: Date): number {
  return (b.getTime() - a.getTime()) / 3_600_000;
}

/** Prices a stay from the slot's hourly/daily rate, preferring the daily rate once a stay reaches 24h. */
function priceStay(slot: { hourlyRate: unknown; dailyRate: unknown }, startAt: Date, endAt: Date): number {
  const hours = hoursBetween(startAt, endAt);
  const daily = Number(slot.dailyRate);
  const hourly = slot.hourlyRate ? Number(slot.hourlyRate) : daily / 24;

  const fullDays = Math.floor(hours / 24);
  const remainderHours = hours - fullDays * 24;
  const total = fullDays * daily + Math.min(remainderHours * hourly, daily);
  return Math.round(total * 100) / 100;
}

async function assertReservationAccess(
  req: Request,
  reservation: { propertyId: string; slotId: string },
): Promise<void> {
  if (!req.user) throw forbidden();
  if (req.user.role === Role.SUPER_ADMIN) return;

  const assignedPropertyId = await getAssignedPropertyId(req.user.id, req.user.role);
  if (reservation.propertyId !== assignedPropertyId) throw notFound('Reservation not found.');

  if (req.user.role === Role.PROPERTY_OWNER) {
    const ownedSlot = await prisma.parkingSlot.findFirst({
      where: {
        id: reservation.slotId,
        ownerUserId: req.user.id,
        deletedAt: null,
      },
      select: { id: true },
    });
    if (!ownedSlot) throw notFound('Reservation not found.');
  }
}

export async function createReservation(
  input: { propertyId: string; slotId: string; vehicleId?: string; type: ReservationType; startAt: Date; endAt: Date; notes?: string },
  req: Request
) {
  await assertRequestPropertyAccess(req, input.propertyId, false);
  const property = await prisma.property.findFirst({
    where: { id: input.propertyId, status: 'ACTIVE', deletedAt: null },
    select: { id: true, name: true },
  });
  if (!property) throw badRequest('Reservations are available only at active properties.');
  const slot = await prisma.parkingSlot.findFirst({
    where: {
      id: input.slotId,
      deletedAt: null,
      approvalStatus: SlotApprovalStatus.APPROVED,
      zone: { propertyId: input.propertyId, deletedAt: null },
    },
  });
  if (!slot) throw notFound('Parking slot not found for this property.');
  if (slot.status === 'BLOCKED' || slot.status === 'INACTIVE') {
    throw conflict('This bay is not available for booking.');
  }

  // Fast, friendly pre-check. The database's exclusion constraint (see
  // prisma/sql/add-reservation-overlap-constraint.sql) is the real guarantee against a
  // race condition between two near-simultaneous bookings for the same bay.
  const overlapping = await prisma.reservation.findFirst({
    where: {
      slotId: input.slotId,
      status: { notIn: [ReservationStatus.REJECTED, ReservationStatus.CANCELLED, ReservationStatus.EXPIRED, ReservationStatus.NO_SHOW] },
      startAt: { lt: input.endAt },
      endAt: { gt: input.startAt },
    },
  });
  if (overlapping) throw conflict('This bay is already reserved for part of that time range.');

  if (input.vehicleId) {
    const vehicle = await prisma.vehicle.findFirst({ where: { id: input.vehicleId, ownerUserId: req.user!.id } });
    if (!vehicle) throw badRequest('Vehicle not found or does not belong to you.');
  }

  const amount = priceStay(slot, input.startAt, input.endAt);

  try {
    const reservation = await prisma.reservation.create({
      data: {
        code: generateCode(),
        propertyId: input.propertyId,
        slotId: input.slotId,
        vehicleId: input.vehicleId,
        requestedById: req.user!.id,
        type: input.type,
        startAt: input.startAt,
        endAt: input.endAt,
        rate: slot.dailyRate,
        amount,
        notes: input.notes,
        qrCodeToken: generateOpaqueToken(),
        createdBy: req.user!.id,
      },
    });

    await prisma.parkingSlot.update({ where: { id: input.slotId }, data: { status: 'RESERVED' } });

    const slotOwner = await prisma.user.findUnique({
      where: { id: slot.ownerUserId as string },
      select: {
        firstName: true,
        email: true,
      },
    });
    if (!slotOwner) throw notFound('User not found.');

    const slotDetails = await prisma.parkingSlot.findUnique({
      where: { id: input.slotId },
      select: {
        code: true,
      },
    });
    if (!slotDetails) throw notFound('Parking slot not found.');

    const link = env.CLIENT_URL;
    const tpl = emailTemplates.createReservation(
      slotOwner.firstName,
      property.name,
      slotDetails.code,
      link
    );
    await sendEmail({ to: slotOwner.email, ...tpl });

    await recordAudit({ req, action: AuditAction.CREATE, entityType: 'Reservation', entityId: reservation.id, propertyId: input.propertyId });

    return reservation;
  } catch (err) {
    const pgErr = err as { code?: string; meta?: { message?: string } };
    // 23P01 = exclusion_violation, raised by the overlap constraint if the pre-check above
    // lost a race against a concurrent booking for the same bay.
    if (pgErr.code === '23P01' || pgErr.meta?.message?.includes('reservations_no_overlap')) {
      throw conflict('This bay was just booked for part of that time range. Please choose another.');
    }
    throw err;
  }
}

export async function listReservations(filters: {
  propertyId?: string;
  status?: ReservationStatus;
  requestedById?: string;
  q?: string;
  page: number;
  pageSize: number;
}, req: Request) {
  const assignedPropertyId = req.user?.role === 'SUPER_ADMIN'
    ? filters.propertyId
    : await getAssignedPropertyId(req.user!.id, req.user!.role);
  const where = {
    deletedAt: null,
    ...(assignedPropertyId ? { propertyId: assignedPropertyId } : {}),
    ...(req.user!.role === Role.PROPERTY_OWNER
      ? { slot: { ownerUserId: req.user!.id } }
      : {}),
    status: filters.status,
    requestedById:
      ['TENANT', 'VISITOR'].includes(req.user!.role)
        ? req.user!.id
        : filters.requestedById,
    ...(filters.q
      ? {
          OR: [
            { code: { contains: filters.q, mode: 'insensitive' as const } },
            { slot: { code: { contains: filters.q, mode: 'insensitive' as const } } },
          ],
        }
      : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.reservation.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (filters.page - 1) * filters.pageSize,
      take: filters.pageSize,
      include: {
        slot: { select: { id: true, code: true, type: true } },
        property: { select: { id: true, name: true } },
        requestedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
        vehicle: { select: { id: true, plateNumber: true } },
      },
    }),
    prisma.reservation.count({ where }),
  ]);

  return { rows, total, page: filters.page, pageSize: filters.pageSize };
}

export async function getReservation(id: string, req: Request) {
  const reservation = await prisma.reservation.findFirst({
    where: { id, deletedAt: null },
    include: {
      slot: true,
      property: { select: { id: true, name: true } },
      requestedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
      vehicle: true,
      payment: true,
    },
  });
  if (!reservation) throw notFound('Reservation not found.');
  await assertReservationAccess(req, reservation);
  return reservation;
}

/** Property Manager / Owner approves or rejects a pending reservation. */
export async function decideReservation(
  id: string,
  status: 'APPROVED' | 'REJECTED',
  reason: string | undefined,
  req: Request
) {
  const reservation = await prisma.reservation.findUnique({
    where: { id },
    include: { requestedBy: true, property: true, slot: true },
  });
  if (!reservation) throw notFound('Reservation not found.');
  await assertReservationAccess(req, reservation);
  if (reservation.status !== ReservationStatus.PENDING) {
    throw conflict(`Only pending reservations can be decided (current status: ${reservation.status}).`);
  }

  const updated = await prisma.reservation.update({
    where: { id },
    data: { status, decidedById: req.user!.id, decidedAt: new Date(), decisionReason: reason },
  });

  if (status === ReservationStatus.REJECTED) {
    await prisma.parkingSlot.update({ where: { id: reservation.slotId }, data: { status: 'AVAILABLE' } });
  }

  const tpl = emailTemplates.reservationDecision(
    reservation.requestedBy.firstName,
    status === ReservationStatus.APPROVED,
    reservation.property.name,
    reservation.slot.code
  );
  await sendEmail({ to: reservation.requestedBy.email, ...tpl });

  await recordAudit({
    req,
    action: status === ReservationStatus.APPROVED ? AuditAction.APPROVE : AuditAction.REJECT,
    entityType: 'Reservation',
    entityId: id,
    propertyId: reservation.propertyId,
    description: reason,
  });

  return updated;
}

export async function cancelReservation(id: string, req: Request) {
  const reservation = await prisma.reservation.findUnique({ where: { id } });
  if (!reservation) throw notFound('Reservation not found.');
  await assertReservationAccess(req, reservation);

  const isOwner = reservation.requestedById === req.user!.id;
  const isStaff = ['SUPER_ADMIN', 'PROPERTY_MANAGER', 'PROPERTY_OWNER'].includes(req.user!.role);
  if (!isOwner && !isStaff) throw forbidden();

  if (
    reservation.status === ReservationStatus.CANCELLED ||
    reservation.status === ReservationStatus.COMPLETED ||
    reservation.status === ReservationStatus.CHECKED_OUT
  ) {
    throw conflict(`Reservation already ${reservation.status.toLowerCase()}.`);
  }

  const updated = await prisma.reservation.update({ where: { id }, data: { status: ReservationStatus.CANCELLED } });
  await prisma.parkingSlot.update({ where: { id: reservation.slotId }, data: { status: 'AVAILABLE' } });
  await recordAudit({ req, action: AuditAction.UPDATE, entityType: 'Reservation', entityId: id, description: 'Cancelled' });

  return updated;
}

/** Parking Attendant scans the QR code / confirmation code at the gate to check a vehicle in. */
export async function checkIn(codeOrQr: string, req: Request) {
  const reservation = await prisma.reservation.findFirst({
    where: { OR: [{ code: codeOrQr }, { qrCodeToken: codeOrQr }] },
  });
  if (!reservation) throw notFound('No reservation matches this code.');
  await assertReservationAccess(req, reservation);
  if (reservation.status !== ReservationStatus.APPROVED) {
    throw conflict(`Reservation must be APPROVED to check in (current status: ${reservation.status}).`);
  }

  const updated = await prisma.reservation.update({
    where: { id: reservation.id },
    data: { status: ReservationStatus.CHECKED_IN, checkedInAt: new Date() },
  });
  await prisma.parkingSlot.update({ where: { id: reservation.slotId }, data: { status: 'OCCUPIED' } });
  await recordAudit({ req, action: AuditAction.UPDATE, entityType: 'Reservation', entityId: reservation.id, description: 'Checked in' });

  return updated;
}

export async function checkOut(id: string, req: Request) {
  const reservation = await prisma.reservation.findUnique({ where: { id } });
  if (!reservation) throw notFound('Reservation not found.');
  await assertReservationAccess(req, reservation);
  if (reservation.status !== ReservationStatus.CHECKED_IN) {
    throw conflict('Reservation must be CHECKED_IN to check out.');
  }

  const updated = await prisma.reservation.update({
    where: { id },
    data: { status: ReservationStatus.CHECKED_OUT, checkedOutAt: new Date() },
  });
  await prisma.parkingSlot.update({ where: { id: reservation.slotId }, data: { status: 'AVAILABLE' } });
  await recordAudit({ req, action: AuditAction.UPDATE, entityType: 'Reservation', entityId: id, description: 'Checked out' });

  return updated;
}
