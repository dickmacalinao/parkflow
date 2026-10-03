import type { Role } from '@prisma/client';
import type { Request } from 'express';
import { prisma } from '../../lib/prisma.js';
import { forbidden } from '../../utils/errors.js';

export async function getAssignedPropertyId(userId: string, role: Role): Promise<string | null> {
  if (role === 'SUPER_ADMIN') return null;

  const user = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
    select: {
      propertyId: true,
      assignedProperty: { select: { deletedAt: true } },
    },
  });
  if (!user?.propertyId || !user.assignedProperty || user.assignedProperty.deletedAt) {
    throw forbidden('Your account is not assigned to an available property. Contact an administrator.');
  }
  return user.propertyId;
}

export async function assertPropertyAccess(
  userId: string,
  role: Role,
  propertyId: string,
  superAdminGlobal = true,
): Promise<void> {
  if (role === 'SUPER_ADMIN') {
    if (superAdminGlobal) return;
    throw forbidden('A property assignment is required for this action.');
  }

  const assignedPropertyId = await getAssignedPropertyId(userId, role);
  if (assignedPropertyId !== propertyId) throw forbidden('You can only access your assigned property.');
}

export async function assertRequestPropertyAccess(req: Request, propertyId: string, superAdminGlobal = true): Promise<void> {
  if (!req.user) throw forbidden();
  await assertPropertyAccess(req.user.id, req.user.role, propertyId, superAdminGlobal);
}