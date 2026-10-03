import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../middleware/asyncHandler.js';
import { createVisitorPassSchema, listVisitorPassesQuerySchema } from './visitorPasses.schemas.js';
import * as visitorPassesService from './visitorPasses.service.js';

const router = Router();

/**
 * @openapi
 * /api/visitor-passes:
 *   post:
 *     summary: Pre-register a guest and issue a digital visitor parking pass
 *     tags: [Visitor Passes]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Pass created with a QR code token }
 */
router.post(
  '/',
  requireAuth,
  validate({ body: createVisitorPassSchema }),
  asyncHandler(async (req, res) => {
    res.status(201).json(await visitorPassesService.createVisitorPass(req.body, req));
  })
);

router.get(
  '/',
  requireAuth,
  validate({ query: listVisitorPassesQuerySchema }),
  asyncHandler(async (req, res) => {
    const isStaff = ['SUPER_ADMIN', 'PROPERTY_MANAGER', 'PROPERTY_OWNER'].includes(req.user!.role);
    const filters = req.query as unknown as z.infer<typeof listVisitorPassesQuerySchema>;
    const scoped = isStaff ? filters : { ...filters, hostUserId: req.user!.id };
    res.json(await visitorPassesService.listVisitorPasses(scoped, req));
  })
);

/**
 * @openapi
 * /api/visitor-passes/validate:
 *   post:
 *     summary: Validate a visitor's QR code at the gate (Attendant)
 *     tags: [Visitor Passes]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Pass marked as used }
 *       400: { description: Expired, not-yet-valid, or already-used pass }
 */
router.post(
  '/validate',
  requireAuth,
  requireRole('PARKING_ATTENDANT', 'SUPER_ADMIN', 'PROPERTY_MANAGER'),
  validate({ body: z.object({ qrCodeToken: z.string().min(1) }) }),
  asyncHandler(async (req, res) => {
    res.json(await visitorPassesService.validateVisitorPass(req.body.qrCodeToken, req));
  })
);

export default router;
