import { AuditAction, Role, UserStatus, type Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { badRequest, forbidden, notFound } from '../../utils/errors.js';
import { hashPassword } from '../../utils/password.js';
import { generateOpaqueToken } from '../../utils/tokens.js';
import { emailTemplates, sendEmail } from '../../lib/email.js';
import { env } from '../../config/env.js';
import { recordAudit } from '../audit/audit.service.js';
import type { Request } from 'express';
import { assertPropertyAccess, getAssignedPropertyId } from '../properties/propertyAccess.js';

const PUBLIC_FIELDS = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  phone: true,
  avatarUrl: true,
  propertyId: true,
  role: true,
  status: true,
  preferences: true,
  lastLoginAt: true,
  createdAt: true,
} as const;

export async function getProfile(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: PUBLIC_FIELDS });
  if (!user) throw notFound('User not found.');
  return user;
}

export async function updateProfile(
  userId: string,
  data: Pick<Prisma.UserUpdateInput, 'firstName' | 'lastName' | 'phone' | 'avatarUrl' | 'preferences'>,
  req: Request
) {
  const user = await prisma.user.update({
    where: { id: userId },
    data: { ...data, updatedBy: userId },
    select: PUBLIC_FIELDS,
  });
  await recordAudit({ req, action: AuditAction.UPDATE, entityType: 'User', entityId: userId });
  return user;
}

export async function listUsers(
  filters: { role?: Role; status?: UserStatus; propertyId?: string; q?: string; page: number; pageSize: number },
  requestingUser: { id: string; role: Role },
) {
  const assignedPropertyId = await getAssignedPropertyId(requestingUser.id, requestingUser.role);
  const propertyId = assignedPropertyId ?? filters.propertyId;
  const where = {
    deletedAt: null,
    ...(propertyId ? { propertyId } : {}),
    role: filters.role,
    status: filters.status,
    ...(filters.q
      ? {
          OR: [
            { firstName: { contains: filters.q, mode: 'insensitive' as const } },
            { lastName: { contains: filters.q, mode: 'insensitive' as const } },
            { email: { contains: filters.q, mode: 'insensitive' as const } },
          ],
        }
      : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: PUBLIC_FIELDS,
      orderBy: { createdAt: 'desc' },
      skip: (filters.page - 1) * filters.pageSize,
      take: filters.pageSize,
    }),
    prisma.user.count({ where }),
  ]);

  return { rows, total, page: filters.page, pageSize: filters.pageSize };
}

/**
 * Property Managers invite users to their assigned property; Super Admin can invite globally.
 * Creates the account in PENDING_VERIFICATION status with a random unusable password and sends
 * a "set your password" link that reuses the email-verification token flow.
 */
export async function inviteUser(
  input: { firstName: string; lastName: string; email: string; role: Role; propertyId?: string },
  req: Request
) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) throw badRequest('A user with this email already exists.');

  if (input.role === Role.SUPER_ADMIN && req.user?.role !== Role.SUPER_ADMIN) {
    throw badRequest('Only a Super Admin can invite another Super Admin.');
  }

  const property = input.propertyId
    ? await prisma.property.findFirst({ where: { id: input.propertyId, status: 'ACTIVE', deletedAt: null }, select: { id: true } })
    : null;
  if (input.role !== Role.SUPER_ADMIN && !property) throw badRequest('Choose an active property for this user.');
  if (input.role === Role.SUPER_ADMIN && property) throw badRequest('Super Admin accounts cannot be assigned to a property.');
  if (req.user?.role !== Role.SUPER_ADMIN && property?.id !== (await getAssignedPropertyId(req.user!.id, req.user!.role))) {
    throw forbidden('You can only assign users to your assigned property.');
  }

  const temporaryPassword = generateOpaqueToken();
  const passwordHash = await hashPassword(temporaryPassword);
  const emailVerificationToken = generateOpaqueToken();

  const user = await prisma.user.create({
    data: {
      email: input.email,
      firstName: input.firstName,
      lastName: input.lastName,
      role: input.role,
      propertyId: property?.id ?? null,
      status: UserStatus.PENDING_VERIFICATION,
      passwordHash,
      emailVerificationToken,
      emailVerificationExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      createdBy: req.user?.id,
    },
  });

  if (input.role === Role.PROPERTY_MANAGER && input.propertyId) {
    await prisma.propertyManager.create({
      data: { propertyId: input.propertyId, userId: user.id },
    });
  }
  if (input.role === Role.PROPERTY_OWNER && input.propertyId) {
    await prisma.property.update({ where: { id: input.propertyId }, data: { ownerId: user.id } });
  }

  const link = `${env.CLIENT_URL}/accept-invite?token=${emailVerificationToken}`;
  const tpl = emailTemplates.propertyInvite(user.firstName, link, input.role);
  await sendEmail({ to: user.email, ...tpl });

  await recordAudit({ req, action: AuditAction.CREATE, entityType: 'User', entityId: user.id, description: `Invited as ${input.role}` });

  return { id: user.id, email: user.email, role: user.role, status: user.status };
}

export async function updateUserStatus(targetUserId: string, status: UserStatus, req: Request) {
  const target = await prisma.user.findFirst({ where: { id: targetUserId, deletedAt: null }, select: { propertyId: true } });
  if (!target) throw notFound('User not found.');
  if (req.user?.role === Role.PROPERTY_MANAGER && targetUserId === req.user.id) {
    throw forbidden('Property Managers cannot change their own account status.');
  }
  if (req.user?.role !== Role.SUPER_ADMIN) {
    if (!target.propertyId) throw forbidden();
    await assertPropertyAccess(req.user!.id, req.user!.role, target.propertyId);
  }
  const user = await prisma.user.update({ where: { id: targetUserId }, data: { status, updatedBy: req.user?.id } });
  await recordAudit({
    req,
    action: AuditAction.UPDATE,
    entityType: 'User',
    entityId: targetUserId,
    description: `Status changed to ${status}`,
  });
  return { id: user.id, status: user.status };
}

export async function updateUserProperty(targetUserId: string, propertyId: string | null, req: Request) {
  const target = await prisma.user.findFirst({
    where: { id: targetUserId, deletedAt: null },
    select: { id: true, role: true, propertyId: true },
  });
  if (!target) throw notFound('User not found.');
  if (target.role === Role.SUPER_ADMIN) {
    if (propertyId !== null) throw badRequest('Super Admin accounts cannot be assigned to a property.');
  } else {
    if (!propertyId) throw badRequest('A property is required for this user.');
    const property = await prisma.property.findFirst({
      where: { id: propertyId, status: 'ACTIVE', deletedAt: null },
      select: { id: true },
    });
    if (!property) throw badRequest('Choose an active property.');
  }

  await prisma.$transaction(async (tx) => {
    if (target.role === Role.PROPERTY_OWNER && target.propertyId) {
      await tx.property.updateMany({ where: { id: target.propertyId, ownerId: targetUserId }, data: { ownerId: null } });
    }
    if (target.role === Role.PROPERTY_MANAGER) {
      await tx.propertyManager.deleteMany({ where: { userId: targetUserId, propertyId: { not: propertyId ?? '' } } });
    }
    if (target.role === Role.PROPERTY_OWNER && propertyId) {
      const property = await tx.property.findUnique({ where: { id: propertyId }, select: { ownerId: true } });
      if (property?.ownerId && property.ownerId !== targetUserId) throw badRequest('That property already has a different owner.');
      await tx.property.update({ where: { id: propertyId }, data: { ownerId: targetUserId } });
    }
    if (target.role === Role.PROPERTY_MANAGER && propertyId) {
      await tx.propertyManager.upsert({
        where: { propertyId_userId: { propertyId, userId: targetUserId } },
        update: {},
        create: { propertyId, userId: targetUserId },
      });
    }
    await tx.user.update({ where: { id: targetUserId }, data: { propertyId, updatedBy: req.user?.id } });
  });

  await recordAudit({
    req,
    action: AuditAction.UPDATE,
    entityType: 'User',
    entityId: targetUserId,
    description: propertyId ? `Assigned to property ${propertyId}` : 'Property assignment removed for Super Admin',
  });
  return { id: targetUserId, propertyId };
}

/** Soft delete: keeps the row (and its history/FKs) but excludes it from normal queries. */
export async function softDeleteUser(targetUserId: string, req: Request) {
  await prisma.user.update({ where: { id: targetUserId }, data: { deletedAt: new Date(), updatedBy: req.user?.id } });
  await recordAudit({ req, action: AuditAction.DELETE, entityType: 'User', entityId: targetUserId });
}
