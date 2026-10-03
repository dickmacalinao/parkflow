import { AuditAction } from '@prisma/client';
import type { Request } from 'express';
import { prisma } from '../../lib/prisma.js';
import { badRequest, notFound } from '../../utils/errors.js';
import { generateOpaqueToken } from '../../utils/tokens.js';
import { recordAudit } from '../audit/audit.service.js';
import { assertRequestPropertyAccess, getAssignedPropertyId } from '../properties/propertyAccess.js';

/** A tenant/resident pre-registers a guest; the pass is the guest's digital parking permit. */
export async function createVisitorPass(
  input: { propertyId: string; visitorName: string; visitorPhone?: string; plateNumber?: string; validFrom: Date; validTo: Date },
  req: Request
) {
  await assertRequestPropertyAccess(req, input.propertyId, false);
  const pass = await prisma.visitorPass.create({
    data: { ...input, hostUserId: req.user!.id, qrCodeToken: generateOpaqueToken() },
  });
  await recordAudit({ req, action: AuditAction.CREATE, entityType: 'VisitorPass', entityId: pass.id, propertyId: input.propertyId });
  return pass;
}

export async function listVisitorPasses(filters: { propertyId?: string; hostUserId?: string; page: number; pageSize: number }, req: Request) {
  const propertyId = req.user?.role === 'SUPER_ADMIN'
    ? filters.propertyId
    : await getAssignedPropertyId(req.user!.id, req.user!.role);
  const where = {
    deletedAt: null,
    ...(propertyId ? { propertyId } : {}),
    hostUserId: filters.hostUserId,
  };
  const [rows, total] = await Promise.all([
    prisma.visitorPass.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (filters.page - 1) * filters.pageSize,
      take: filters.pageSize,
    }),
    prisma.visitorPass.count({ where }),
  ]);
  return { rows, total, page: filters.page, pageSize: filters.pageSize };
}

/** Attendant validates a visitor's QR code at the gate. One-time use: usedAt is stamped on first scan. */
export async function validateVisitorPass(qrCodeToken: string, req: Request) {
  const pass = await prisma.visitorPass.findUnique({ where: { qrCodeToken } });
  if (!pass || pass.deletedAt) throw notFound('No visitor pass matches this code.');
  await assertRequestPropertyAccess(req, pass.propertyId);

  const now = new Date();
  if (now < pass.validFrom || now > pass.validTo) throw badRequest('This pass is not valid at this time.');
  if (pass.usedAt) throw badRequest('This pass has already been used.');

  const updated = await prisma.visitorPass.update({ where: { id: pass.id }, data: { usedAt: now } });
  await recordAudit({ req, action: AuditAction.UPDATE, entityType: 'VisitorPass', entityId: pass.id, description: 'Validated at gate' });
  return updated;
}
