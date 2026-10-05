import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../middleware/asyncHandler.js';
import {
  bulkCreateSlotsSchema,
  createSlotSchema,
  createZoneSchema,
  listSlotsQuerySchema,
  reviewSlotSchema,
  slotStatusSchema,
  updateSlotSchema,
  updateZoneSchema,
} from './parking.schemas.js';
import * as parkingService from './parking.service.js';

const router = Router();
const idParam = z.object({ id: z.string().uuid() });
const MANAGE_ROLES = ['SUPER_ADMIN', 'PROPERTY_OWNER', 'PROPERTY_MANAGER'] as const;

/**
 * @openapi
 * /api/parking/zones:
 *   post:
 *     summary: Create a parking zone within a property
 *     tags: [Parking]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Zone created }
 */
router.post(
  '/zones',
  requireAuth,
  requireRole(...MANAGE_ROLES),
  validate({ body: createZoneSchema }),
  asyncHandler(async (req, res) => {
    res.status(201).json(await parkingService.createZone(req.body, req));
  })
);

/**
 * @openapi
 * /api/parking/zones:
 *   get:
 *     summary: List zones for a property
 *     tags: [Parking]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: propertyId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Zones with slot counts }
 */
router.get(
  '/zones',
  requireAuth,
  validate({ query: z.object({ propertyId: z.string().uuid() }) }),
  asyncHandler(async (req, res) => {
    res.json(await parkingService.listZones(req.query.propertyId as string, req));
  })
);

router.patch(
  '/zones/:id',
  requireAuth,
  requireRole(...MANAGE_ROLES),
  validate({ params: idParam, body: updateZoneSchema }),
  asyncHandler(async (req, res) => {
    res.json(await parkingService.updateZone(req.params.id, req.body, req));
  })
);

router.delete(
  '/zones/:id',
  requireAuth,
  requireRole(...MANAGE_ROLES),
  validate({ params: idParam }),
  asyncHandler(async (req, res) => {
    await parkingService.deleteZone(req.params.id, req);
    res.status(204).send();
  })
);

/**
 * @openapi
 * /api/parking/slots:
 *   post:
 *     summary: Create a single parking slot
 *     tags: [Parking]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Slot created }
 */
router.post(
  '/slots',
  requireAuth,
  requireRole(...MANAGE_ROLES),
  validate({ body: createSlotSchema }),
  asyncHandler(async (req, res) => {
    res.status(201).json(await parkingService.createSlot(req.body, req));
  })
);

/**
 * @openapi
 * /api/parking/slots/bulk:
 *   post:
 *     summary: Generate a numbered range of slots in one zone (e.g. A-01..A-24)
 *     tags: [Parking]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Number of slots created }
 */
router.post(
  '/slots/bulk',
  requireAuth,
  requireRole(...MANAGE_ROLES),
  validate({ body: bulkCreateSlotsSchema }),
  asyncHandler(async (req, res) => {
    res.status(201).json(await parkingService.bulkCreateSlots(req.body, req));
  })
);

/**
 * @openapi
 * /api/parking/slots:
 *   get:
 *     summary: List parking slots, filterable by property, zone, status, or type
 *     tags: [Parking]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Paginated slot list }
 */
router.get(
  '/slots/mine',
  requireAuth,
  requireRole('PROPERTY_OWNER'),
  asyncHandler(async (req, res) => {
    res.json(await parkingService.listMySlots(req));
  })
);

router.get(
  '/slots/pending-verification',
  requireAuth,
  requireRole('PROPERTY_MANAGER'),
  asyncHandler(async (req, res) => {
    res.json(await parkingService.listPendingSlotsForVerification(req));
  })
);

router.patch(
  '/slots/:id/approval',
  requireAuth,
  requireRole('PROPERTY_MANAGER'),
  validate({ params: idParam, body: reviewSlotSchema }),
  asyncHandler(async (req, res) => {
    res.json(await parkingService.reviewSlot(req.params.id, req.body.decision, req.body.reason, req));
  })
);

router.get(
  '/slots',
  requireAuth,
  validate({ query: listSlotsQuerySchema }),
  asyncHandler(async (req, res) => {
    res.json(await parkingService.listSlots(req.query as unknown as z.infer<typeof listSlotsQuerySchema>, req));
  })
);

router.patch(
  '/slots/:id',
  requireAuth,
  requireRole(...MANAGE_ROLES),
  validate({ params: idParam, body: updateSlotSchema }),
  asyncHandler(async (req, res) => {
    res.json(await parkingService.updateSlot(req.params.id, req.body, req));
  })
);

/**
 * @openapi
 * /api/parking/slots/{id}/status:
 *   patch:
 *     summary: Block a slot for maintenance, or bring it back into service
 *     tags: [Parking]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Updated slot }
 */
router.patch(
  '/slots/:id/status',
  requireAuth,
  requireRole(...MANAGE_ROLES, 'PARKING_ATTENDANT'),
  validate({ params: idParam, body: slotStatusSchema }),
  asyncHandler(async (req, res) => {
    res.json(await parkingService.setSlotStatus(req.params.id, req.body.status, req));
  })
);

router.delete(
  '/slots/:id',
  requireAuth,
  requireRole(...MANAGE_ROLES),
  validate({ params: idParam }),
  asyncHandler(async (req, res) => {
    await parkingService.deleteSlot(req.params.id, req);
    res.status(204).send();
  })
);

export default router;
