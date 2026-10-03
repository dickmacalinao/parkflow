import { AuditAction, SlotStatus, type SlotType } from '@prisma/client';
import type { Request } from 'express';
import { prisma } from '../../lib/prisma.js';
import { notFound } from '../../utils/errors.js';
import { recordAudit } from '../audit/audit.service.js';
import { assertRequestPropertyAccess, getAssignedPropertyId } from '../properties/propertyAccess.js';

async function assertZoneAccess(req: Request, zoneId: string): Promise<string> {
  const zone = await prisma.parkingZone.findFirst({ where: { id: zoneId, deletedAt: null }, select: { propertyId: true } });
  if (!zone) throw notFound('Parking zone not found.');
  await assertRequestPropertyAccess(req, zone.propertyId);
  return zone.propertyId;
}

async function assertSlotAccess(req: Request, slotId: string): Promise<string> {
  const slot = await prisma.parkingSlot.findFirst({
    where: { id: slotId, deletedAt: null },
    select: { zone: { select: { propertyId: true } } },
  });
  if (!slot) throw notFound('Parking slot not found.');
  await assertRequestPropertyAccess(req, slot.zone.propertyId);
  return slot.zone.propertyId;
}

export async function createZone(data: { propertyId: string; name: string; description?: string; sortOrder: number }, req: Request) {
  await assertRequestPropertyAccess(req, data.propertyId);
  const zone = await prisma.parkingZone.create({ data });
  await recordAudit({ req, action: AuditAction.CREATE, entityType: 'ParkingZone', entityId: zone.id, propertyId: data.propertyId });
  return zone;
}

export async function listZones(propertyId: string, req: Request) {
  await assertRequestPropertyAccess(req, propertyId);
  return prisma.parkingZone.findMany({
    where: { propertyId, deletedAt: null },
    orderBy: { sortOrder: 'asc' },
    include: { _count: { select: { slots: true } } },
  });
}

export async function updateZone(id: string, data: Record<string, unknown>, req: Request) {
  await assertZoneAccess(req, id);
  const zone = await prisma.parkingZone.update({ where: { id }, data });
  await recordAudit({ req, action: AuditAction.UPDATE, entityType: 'ParkingZone', entityId: id });
  return zone;
}

export async function deleteZone(id: string, req: Request) {
  await assertZoneAccess(req, id);
  await prisma.parkingZone.update({ where: { id }, data: { deletedAt: new Date() } });
  await recordAudit({ req, action: AuditAction.DELETE, entityType: 'ParkingZone', entityId: id });
}

export async function createSlot(
  data: { zoneId: string; code: string; type: SlotType; hourlyRate?: number; dailyRate: number; monthlyRate?: number; isEvCharging: boolean },
  req: Request
) {
  await assertZoneAccess(req, data.zoneId);
  const slot = await prisma.parkingSlot.create({ data });
  await recordAudit({ req, action: AuditAction.CREATE, entityType: 'ParkingSlot', entityId: slot.id });
  return slot;
}

/** Generates a numbered range of slots in one zone, e.g. prefix "A-" + 1..24 -> A-01 .. A-24. */
export async function bulkCreateSlots(
  input: { zoneId: string; prefix: string; count: number; startNumber: number; type: SlotType; dailyRate: number; hourlyRate?: number },
  req: Request
) {
  await assertZoneAccess(req, input.zoneId);
  const codes = Array.from({ length: input.count }, (_, i) => {
    const n = input.startNumber + i;
    return `${input.prefix}${String(n).padStart(2, '0')}`;
  });

  const result = await prisma.parkingSlot.createMany({
    data: codes.map((code) => ({
      zoneId: input.zoneId,
      code,
      type: input.type,
      dailyRate: input.dailyRate,
      hourlyRate: input.hourlyRate,
    })),
    skipDuplicates: true,
  });

  await recordAudit({ req, action: AuditAction.CREATE, entityType: 'ParkingSlot', description: `Bulk created ${result.count} slots in zone ${input.zoneId}` });
  return { created: result.count };
}

export async function listSlots(
  filters: { propertyId?: string; zoneId?: string; status?: SlotStatus; type?: SlotType; page: number; pageSize: number },
  req: Request,
) {
  const assignedPropertyId = req.user?.role === 'SUPER_ADMIN'
    ? filters.propertyId
    : await getAssignedPropertyId(req.user!.id, req.user!.role);
  const where = {
    deletedAt: null,
    zoneId: filters.zoneId,
    status: filters.status,
    type: filters.type,
    ...(assignedPropertyId ? { zone: { propertyId: assignedPropertyId } } : {}),
  };
  const [rows, total] = await Promise.all([
    prisma.parkingSlot.findMany({
      where,
      orderBy: { code: 'asc' },
      skip: (filters.page - 1) * filters.pageSize,
      take: filters.pageSize,
      include: { zone: { select: { id: true, name: true, propertyId: true } } },
    }),
    prisma.parkingSlot.count({ where }),
  ]);
  return { rows, total, page: filters.page, pageSize: filters.pageSize };
}

export async function updateSlot(id: string, data: Record<string, unknown>, req: Request) {
  await assertSlotAccess(req, id);
  const slot = await prisma.parkingSlot.update({ where: { id }, data });
  await recordAudit({ req, action: AuditAction.UPDATE, entityType: 'ParkingSlot', entityId: id });
  return slot;
}

/** Toggles a slot between AVAILABLE and BLOCKED (maintenance), refusing to block a slot that's currently occupied. */
export async function setSlotStatus(id: string, status: SlotStatus, req: Request) {
  await assertSlotAccess(req, id);
  const slot = await prisma.parkingSlot.findUnique({ where: { id } });
  if (!slot) throw notFound('Slot not found.');

  const updated = await prisma.parkingSlot.update({ where: { id }, data: { status } });
  await recordAudit({ req, action: AuditAction.UPDATE, entityType: 'ParkingSlot', entityId: id, description: `Status -> ${status}` });
  return updated;
}

export async function deleteSlot(id: string, req: Request) {
  await assertSlotAccess(req, id);
  await prisma.parkingSlot.update({ where: { id }, data: { deletedAt: new Date(), status: SlotStatus.INACTIVE } });
  await recordAudit({ req, action: AuditAction.DELETE, entityType: 'ParkingSlot', entityId: id });
}
