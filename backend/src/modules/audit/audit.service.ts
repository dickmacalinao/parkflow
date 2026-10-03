import type { Request } from 'express';
import { AuditAction } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';

interface RecordAuditInput {
  req?: Request;
  actorId?: string | null;
  propertyId?: string | null;
  action: AuditAction;
  entityType: string;
  entityId?: string | null;
  description?: string;
  before?: unknown;
  after?: unknown;
}

/** Writes one immutable audit trail row. Never throws - a failed audit write should not fail the request. */
export async function recordAudit(input: RecordAuditInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: input.actorId ?? input.req?.user?.id ?? null,
        propertyId: input.propertyId ?? null,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        description: input.description,
        ipAddress: input.req?.ip,
        userAgent: input.req?.headers['user-agent'],
        before: input.before as never,
        after: input.after as never,
      },
    });
  } catch {
    // Intentionally swallowed - see docstring.
  }
}

export interface ListAuditFilters {
  propertyId?: string;
  actorId?: string;
  entityType?: string;
  action?: AuditAction;
  limit: number;
  offset: number;
}

export async function listAuditLogs(filters: ListAuditFilters) {
  const where = {
    propertyId: filters.propertyId,
    actorId: filters.actorId,
    entityType: filters.entityType,
    action: filters.action,
  };
  const [rows, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: filters.limit,
      skip: filters.offset,
      include: { actor: { select: { id: true, firstName: true, lastName: true, email: true } } },
    }),
    prisma.auditLog.count({ where }),
  ]);
  return { rows, total };
}
