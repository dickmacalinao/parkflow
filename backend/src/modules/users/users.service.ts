import { AuditAction, Role, UserStatus } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { badRequest, notFound } from '../../utils/errors.js';
import { hashPassword } from '../../utils/password.js';
import { generateOpaqueToken } from '../../utils/tokens.js';
import { emailTemplates, sendEmail } from '../../lib/email.js';
import { env } from '../../config/env.js';
import { recordAudit } from '../audit/audit.service.js';
import type { Request } from 'express';

const PUBLIC_FIELDS = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  phone: true,
  avatarUrl: true,
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

export async function updateProfile(userId: string, data: Partial<{ firstName: string; lastName: string; phone: string; avatarUrl: string; preferences: Record<string, unknown> }>) {
  const user = await prisma.user.update({
    where: { id: userId },
    data: { ...data, updatedBy: userId },
    select: PUBLIC_FIELDS,
  });
  return user;
}

export async function listUsers(filters: { role?: Role; status?: UserStatus; q?: string; page: number; pageSize: number }) {
  const where = {
    deletedAt: null,
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
 * System Admin invites a Property Manager or Property Owner (or a Super Admin invites any role).
 * Creates the account in PENDING_VERIFICATION status with a random unusable password and sends
 * a "set your password" link that reuses the email-verification token flow.
 */
export async function inviteUser(
  input: { firstName: string; lastName: string; email: string; role: Role; propertyId?: string },
  req: Request
) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) throw badRequest('A user with this email already exists.');

  if (input.role === Role.PROPERTY_MANAGER && !input.propertyId) {
    throw badRequest('propertyId is required when inviting a Property Manager.');
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

/** Soft delete: keeps the row (and its history/FKs) but excludes it from normal queries. */
export async function softDeleteUser(targetUserId: string, req: Request) {
  await prisma.user.update({ where: { id: targetUserId }, data: { deletedAt: new Date(), updatedBy: req.user?.id } });
  await recordAudit({ req, action: AuditAction.DELETE, entityType: 'User', entityId: targetUserId });
}
