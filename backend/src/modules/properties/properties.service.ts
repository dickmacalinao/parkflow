import { AuditAction, PropertyStatus, type PropertyType, type Role } from '@prisma/client';
import type { Request } from 'express';
import { prisma } from '../../lib/prisma.js';
import { badRequest, notFound } from '../../utils/errors.js';
import { recordAudit } from '../audit/audit.service.js';
import { assertPropertyAccess, getAssignedPropertyId } from './propertyAccess.js';

const WITH_RELATIONS = {
  owner: { select: { id: true, firstName: true, lastName: true, email: true } },
  managers: { include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } } },
  zones: { include: { slots: true } },
} as const;

export async function createProperty(data: Record<string, unknown>, req: Request) {
  const ownerId = req.user?.role === 'PROPERTY_OWNER'
    ? req.user.id
    : typeof data.ownerId === 'string' ? data.ownerId : undefined;
  const property = await prisma.$transaction(async (tx) => {
    const created = await tx.property.create({
      data: { ...data, ownerId, createdBy: req.user?.id } as Parameters<typeof prisma.property.create>[0]['data'],
    });
    if (ownerId) {
      const owner = await tx.user.findFirst({ where: { id: ownerId, deletedAt: null }, select: { role: true } });
      if (!owner || owner.role !== 'PROPERTY_OWNER') throw badRequest('The assigned owner account was not found.');
      await tx.user.update({ where: { id: ownerId }, data: { propertyId: created.id, updatedBy: req.user?.id } });
    }
    return created;
  });
  await recordAudit({ req, action: AuditAction.CREATE, entityType: 'Property', entityId: property.id, propertyId: property.id });
  return property;
}

export async function listAvailableProperties() {
  return prisma.property.findMany({
    where: { status: PropertyStatus.ACTIVE, deletedAt: null },
    select: { id: true, name: true, type: true, city: true, state: true },
    orderBy: { name: 'asc' },
  });
}

export async function listProperties(
  filters: { status?: PropertyStatus; type?: PropertyType; q?: string; page: number; pageSize: number },
  user: { id: string; role: Role },
) {
  const assignedPropertyId = await getAssignedPropertyId(user.id, user.role);
  const where = {
    deletedAt: null,
    ...(assignedPropertyId ? { id: assignedPropertyId } : {}),
    status: filters.status,
    type: filters.type,
    ...(filters.q ? { name: { contains: filters.q, mode: 'insensitive' as const } } : {}),
  };
  const [rows, total] = await Promise.all([
    prisma.property.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (filters.page - 1) * filters.pageSize,
      take: filters.pageSize,
      include: {
        owner: { select: { id: true, firstName: true, lastName: true } },
        managers: { select: { userId: true } },
        _count: { select: { zones: true } },
      },
    }),
    prisma.property.count({ where }),
  ]);
  return { rows, total, page: filters.page, pageSize: filters.pageSize };
}

export async function getProperty(id: string, user: { id: string; role: Role }) {
  await assertPropertyAccess(user.id, user.role, id);
  const property = await prisma.property.findFirst({ where: { id, deletedAt: null }, include: WITH_RELATIONS });
  if (!property) throw notFound('Property not found.');
  return property;
}

export async function updateProperty(id: string, data: Record<string, unknown>, req: Request) {
  const result = await prisma.property.updateMany({
    where: { id, deletedAt: null },
    data: { ...data, updatedBy: req.user?.id } as Parameters<typeof prisma.property.updateMany>[0]['data'],
  });
  if (!result.count) throw notFound('Property not found.');
  const property = await prisma.property.findFirst({ where: { id, deletedAt: null } });
  if (!property) throw notFound('Property not found.');
  await recordAudit({ req, action: AuditAction.UPDATE, entityType: 'Property', entityId: id, propertyId: id });
  return property;
}

/** Super Admin approves or rejects a pending property/owner application. */
export async function decideProperty(id: string, status: PropertyStatus.ACTIVE | PropertyStatus.REJECTED, reason: string | undefined, req: Request) {
  const property = await prisma.property.update({
    where: { id },
    data: { status, updatedBy: req.user?.id },
  });
  await recordAudit({
    req,
    action: status === PropertyStatus.ACTIVE ? AuditAction.APPROVE : AuditAction.REJECT,
    entityType: 'Property',
    entityId: id,
    propertyId: id,
    description: reason,
  });
  return property;
}

export async function softDeleteProperty(id: string, req: Request) {
  const result = await prisma.property.updateMany({
    where: { id, deletedAt: null },
    data: { deletedAt: new Date(), updatedBy: req.user?.id },
  });
  if (!result.count) throw notFound('Property not found.');
  await recordAudit({ req, action: AuditAction.DELETE, entityType: 'Property', entityId: id, propertyId: id });
}

export async function assignManager(propertyId: string, userId: string, canApprove: boolean, req: Request) {
  const assignee = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
    select: { role: true, propertyId: true },
  });
  if (!assignee || assignee.role !== 'PROPERTY_MANAGER' || assignee.propertyId !== propertyId) {
    throw notFound('A Property Manager assigned to this property was not found.');
  }
  const link = await prisma.propertyManager.upsert({
    where: { propertyId_userId: { propertyId, userId } },
    update: { canApprove },
    create: { propertyId, userId, canApprove },
  });
  await recordAudit({ req, action: AuditAction.UPDATE, entityType: 'PropertyManager', entityId: link.id, propertyId });
  return link;
}

/** True if the user manages (or owns, or is a platform admin for) this property - used for row-level authorization. */
export async function userCanManageProperty(userId: string, role: string, propertyId: string): Promise<boolean> {
  if (role === 'SUPER_ADMIN') return true;
  const assignedPropertyId = await getAssignedPropertyId(userId, role as Role);
  if (assignedPropertyId !== propertyId) return false;
  const property = await prisma.property.findFirst({ where: { id: propertyId, deletedAt: null }, select: { ownerId: true } });
  if (property?.ownerId === userId) return true;
  const managerLink = await prisma.propertyManager.findUnique({ where: { propertyId_userId: { propertyId, userId } } });
  return !!managerLink;
}
