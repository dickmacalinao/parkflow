import { AuditAction, PropertyStatus, type PropertyType } from '@prisma/client';
import type { Request } from 'express';
import { prisma } from '../../lib/prisma.js';
import { notFound } from '../../utils/errors.js';
import { recordAudit } from '../audit/audit.service.js';

const WITH_RELATIONS = {
  owner: { select: { id: true, firstName: true, lastName: true, email: true } },
  managers: { include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } } },
  zones: { include: { slots: true } },
} as const;

export async function createProperty(data: Record<string, unknown>, req: Request) {
  const property = await prisma.property.create({
    data: { ...data, createdBy: req.user?.id } as Parameters<typeof prisma.property.create>[0]['data'],
  });
  await recordAudit({ req, action: AuditAction.CREATE, entityType: 'Property', entityId: property.id, propertyId: property.id });
  return property;
}

export async function listProperties(filters: { status?: PropertyStatus; type?: PropertyType; q?: string; page: number; pageSize: number }) {
  const where = {
    deletedAt: null,
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
      include: { owner: { select: { id: true, firstName: true, lastName: true } }, _count: { select: { zones: true } } },
    }),
    prisma.property.count({ where }),
  ]);
  return { rows, total, page: filters.page, pageSize: filters.pageSize };
}

export async function getProperty(id: string) {
  const property = await prisma.property.findFirst({ where: { id, deletedAt: null }, include: WITH_RELATIONS });
  if (!property) throw notFound('Property not found.');
  return property;
}

export async function updateProperty(id: string, data: Record<string, unknown>, req: Request) {
  const property = await prisma.property.update({
    where: { id },
    data: { ...data, updatedBy: req.user?.id } as Parameters<typeof prisma.property.update>[0]['data'],
  });
  await recordAudit({ req, action: AuditAction.UPDATE, entityType: 'Property', entityId: id, propertyId: id });
  return property;
}

/** System Admin approves or rejects a pending property/owner application. */
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
  await prisma.property.update({ where: { id }, data: { deletedAt: new Date(), updatedBy: req.user?.id } });
  await recordAudit({ req, action: AuditAction.DELETE, entityType: 'Property', entityId: id, propertyId: id });
}

export async function assignManager(propertyId: string, userId: string, canApprove: boolean, req: Request) {
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
  if (role === 'SUPER_ADMIN' || role === 'SYSTEM_ADMIN') return true;
  const property = await prisma.property.findUnique({ where: { id: propertyId }, select: { ownerId: true } });
  if (property?.ownerId === userId) return true;
  const managerLink = await prisma.propertyManager.findUnique({ where: { propertyId_userId: { propertyId, userId } } });
  return !!managerLink;
}
