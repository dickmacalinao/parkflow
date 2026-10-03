import { Router } from 'express';
import { z } from 'zod';
import { AuditAction } from '@prisma/client';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../middleware/asyncHandler.js';
import { listAuditLogs } from './audit.service.js';

const router = Router();

const listQuerySchema = z.object({
  propertyId: z.string().uuid().optional(),
  actorId: z.string().uuid().optional(),
  entityType: z.string().optional(),
  action: z.nativeEnum(AuditAction).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  offset: z.coerce.number().int().min(0).default(0),
});

/**
 * @openapi
 * /api/audit-logs:
 *   get:
 *     summary: List audit trail entries (Super Admin only)
 *     tags: [Audit]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Paginated audit log entries }
 */
router.get(
  '/',
  requireAuth,
  requireRole('SUPER_ADMIN'),
  validate({ query: listQuerySchema }),
  asyncHandler(async (req, res) => {
    const result = await listAuditLogs(req.query as unknown as z.infer<typeof listQuerySchema>);
    res.json(result);
  })
);

export default router;
