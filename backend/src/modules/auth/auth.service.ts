import { Role, UserStatus, AuditAction } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { hashPassword, verifyPassword } from '../../utils/password.js';
import {
  generateOpaqueToken,
  generateRefreshToken,
  hashToken,
  signAccessToken,
} from '../../utils/tokens.js';
import { badRequest, conflict, unauthorized } from '../../utils/errors.js';
import { sendEmail, emailTemplates } from '../../lib/email.js';
import { env } from '../../config/env.js';
import { recordAudit } from '../audit/audit.service.js';
import type { Request } from 'express';

const MAX_FAILED_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000;
const EMAIL_VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;
const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function publicUser(user: {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  status: UserStatus;
  avatarUrl: string | null;
  propertyId: string | null;
  buildingNo: string | null;
  floorNo: string | null;
  unitNo: string | null;
}) {
  const { id, email, firstName, lastName, role, status, avatarUrl, propertyId, buildingNo, floorNo, unitNo } = user;
  return { id, email, firstName, lastName, role, status, avatarUrl, propertyId, buildingNo, floorNo, unitNo };
}

export async function register(input: {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  propertyId: string;
  password: string;
  role: 'TENANT' | 'VISITOR';
}) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) throw conflict('An account with this email already exists.');

  const property = await prisma.property.findFirst({
    where: { id: input.propertyId, status: 'ACTIVE', deletedAt: null },
    select: { id: true },
  });
  if (!property) throw badRequest('Choose an active property.');

  const passwordHash = await hashPassword(input.password);
  const emailVerificationToken = generateOpaqueToken();

  const user = await prisma.user.create({
    data: {
      email: input.email,
      passwordHash,
      firstName: input.firstName,
      lastName: input.lastName,
      phone: input.phone,
      role: input.role,
      propertyId: property.id,
      status: UserStatus.PENDING_VERIFICATION,
      emailVerificationToken,
      emailVerificationExpiresAt: new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS),
    },
  });

  const link = `${env.CLIENT_URL}/verify-email?token=${emailVerificationToken}`;
  const tpl = emailTemplates.verifyEmail(user.firstName, link);
  await sendEmail({ to: user.email, ...tpl });

  await recordAudit({ actorId: user.id, action: AuditAction.CREATE, entityType: 'User', entityId: user.id, description: 'User registered' });

  return publicUser(user);
}

async function issueTokenPair(userId: string, role: Role, req?: Request) {
  const accessToken = signAccessToken({ sub: userId, role });
  const refreshToken = generateRefreshToken();

  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash: hashToken(refreshToken),
      deviceInfo: req?.headers['user-agent']?.toString(),
      ipAddress: req?.ip,
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
    },
  });

  return { accessToken, refreshToken };
}

export async function login(email: string, password: string, req?: Request) {
  const user = await prisma.user.findUnique({ where: { email } });

  // Same generic error whether the email doesn't exist or the password is wrong - avoids
  // leaking which emails are registered.
  const invalidCredentials = () => unauthorized('Invalid email or password.');

  if (!user || user.deletedAt) {
    await recordAudit({ req, action: AuditAction.LOGIN_FAILED, entityType: 'User', description: `Login attempt for unknown email ${email}` });
    throw invalidCredentials();
  }

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    throw unauthorized('Account temporarily locked due to repeated failed logins. Try again later.');
  }

  if (user.status === UserStatus.SUSPENDED || user.status === UserStatus.DEACTIVATED) {
    throw unauthorized('This account is no longer active. Contact your administrator.');
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    const attempts = user.failedLoginAttempts + 1;
    const lockedUntil = attempts >= MAX_FAILED_LOGIN_ATTEMPTS ? new Date(Date.now() + LOCKOUT_DURATION_MS) : null;
    await prisma.user.update({ where: { id: user.id }, data: { failedLoginAttempts: attempts, lockedUntil } });
    await recordAudit({ req, actorId: user.id, action: AuditAction.LOGIN_FAILED, entityType: 'User', entityId: user.id });
    throw invalidCredentials();
  }

  if (user.status === UserStatus.PENDING_VERIFICATION) {
    throw unauthorized('Please verify your email before logging in.');
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { failedLoginAttempts: 0, lockedUntil: null, lastLoginAt: new Date() },
  });

  const tokens = await issueTokenPair(user.id, user.role, req);
  await recordAudit({ req, actorId: user.id, action: AuditAction.LOGIN, entityType: 'User', entityId: user.id });

  return { user: publicUser(user), ...tokens };
}

export async function refresh(refreshToken: string, req?: Request) {
  const tokenHash = hashToken(refreshToken);
  const stored = await prisma.refreshToken.findUnique({ where: { tokenHash }, include: { user: true } });

  if (!stored || stored.revokedAt || stored.expiresAt < new Date() || stored.user.deletedAt) {
    throw unauthorized('Refresh token is invalid or expired. Please log in again.');
  }

  // Rotate: revoke the used token and issue a brand new pair. Limits the blast radius if a
  // refresh token is ever stolen (replay is detectable - the old token becomes unusable).
  await prisma.refreshToken.update({ where: { id: stored.id }, data: { revokedAt: new Date() } });

  const tokens = await issueTokenPair(stored.user.id, stored.user.role, req);
  return { user: publicUser(stored.user), ...tokens };
}

export async function logout(refreshToken: string): Promise<void> {
  const tokenHash = hashToken(refreshToken);
  await prisma.refreshToken.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

/** Revokes every refresh token for a user - "log out of all devices". */
export async function logoutAllDevices(userId: string): Promise<void> {
  await prisma.refreshToken.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
}

export async function listActiveSessions(userId: string) {
  return prisma.refreshToken.findMany({
    where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
    select: { id: true, deviceInfo: true, ipAddress: true, createdAt: true, expiresAt: true },
    orderBy: { createdAt: 'desc' },
  });
}

export async function verifyEmail(token: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { emailVerificationToken: token } });
  if (!user || !user.emailVerificationExpiresAt || user.emailVerificationExpiresAt < new Date()) {
    throw badRequest('This verification link is invalid or has expired.');
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      status: UserStatus.ACTIVE,
      emailVerifiedAt: new Date(),
      emailVerificationToken: null,
      emailVerificationExpiresAt: null,
    },
  });
}

export async function forgotPassword(email: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { email } });
  // Always respond the same way regardless of whether the email exists (prevents account enumeration);
  // the controller sends a generic "if that email exists..." message either way.
  if (!user || user.deletedAt) return;

  const token = generateOpaqueToken();
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordResetToken: token, passwordResetExpiresAt: new Date(Date.now() + PASSWORD_RESET_TTL_MS) },
  });

  const link = `${env.CLIENT_URL}/reset-password?token=${token}`;
  const tpl = emailTemplates.resetPassword(user.firstName, link);
  await sendEmail({ to: user.email, ...tpl });
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { passwordResetToken: token } });
  if (!user || !user.passwordResetExpiresAt || user.passwordResetExpiresAt < new Date()) {
    throw badRequest('This reset link is invalid or has expired.');
  }

  const passwordHash = await hashPassword(newPassword);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash, passwordResetToken: null, passwordResetExpiresAt: null },
  });

  // Invalidate every existing session: a password reset should log the user out everywhere.
  await logoutAllDevices(user.id);
}

export async function changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const valid = await verifyPassword(currentPassword, user.passwordHash);
  if (!valid) throw badRequest('Current password is incorrect.');

  const passwordHash = await hashPassword(newPassword);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
  await logoutAllDevices(userId);
}
