import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../middleware/asyncHandler.js';
import {
  createReservationSchema,
  decideReservationSchema,
  listReservationsQuerySchema,
} from './reservations.schemas.js';
import * as reservationsService from './reservations.service.js';

const router = Router();
const idParam = z.object({ id: z.string().uuid() });
const STAFF_ROLES = ['SUPER_ADMIN', 'SYSTEM_ADMIN', 'PROPERTY_MANAGER', 'PROPERTY_OWNER'] as const;

/**
 * @openapi
 * /api/reservations:
 *   post:
 *     summary: Request a parking reservation (starts as PENDING, awaiting approval)
 *     tags: [Reservations]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Reservation created }
 *       409: { description: Bay not available for that time range }
 */
router.post(
  '/',
  requireAuth,
  validate({ body: createReservationSchema }),
  asyncHandler(async (req, res) => {
    res.status(201).json(await reservationsService.createReservation(req.body, req));
  })
);

/**
 * @openapi
 * /api/reservations:
 *   get:
 *     summary: List reservations (own reservations for tenants/visitors, all for staff)
 *     tags: [Reservations]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Paginated reservation list }
 */
router.get(
  '/',
  requireAuth,
  validate({ query: listReservationsQuerySchema }),
  asyncHandler(async (req, res) => {
    const isStaff = (STAFF_ROLES as readonly string[]).includes(req.user!.role);
    const filters = req.query as unknown as z.infer<typeof listReservationsQuerySchema>;
    // Non-staff users can only ever see their own reservations, regardless of what they pass in requestedById.
    const scoped = isStaff ? filters : { ...filters, requestedById: req.user!.id };
    res.json(await reservationsService.listReservations(scoped));
  })
);

router.get(
  '/:id',
  requireAuth,
  validate({ params: idParam }),
  asyncHandler(async (req, res) => {
    const reservation = await reservationsService.getReservation(req.params.id);
    const isStaff = (STAFF_ROLES as readonly string[]).includes(req.user!.role);
    if (!isStaff && reservation.requestedById !== req.user!.id) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Reservation not found.' } });
    }
    res.json(reservation);
  })
);

/**
 * @openapi
 * /api/reservations/{id}/decision:
 *   post:
 *     summary: Approve or reject a pending reservation (Property Manager/Owner/Admin)
 *     tags: [Reservations]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Decision recorded, requester notified by email }
 */
router.post(
  '/:id/decision',
  requireAuth,
  requireRole(...STAFF_ROLES),
  validate({ params: idParam, body: decideReservationSchema }),
  asyncHandler(async (req, res) => {
    res.json(await reservationsService.decideReservation(req.params.id, req.body.status, req.body.reason, req));
  })
);

/**
 * @openapi
 * /api/reservations/{id}/cancel:
 *   post:
 *     summary: Cancel a reservation (owner or staff)
 *     tags: [Reservations]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Reservation cancelled, bay freed }
 */
router.post(
  '/:id/cancel',
  requireAuth,
  validate({ params: idParam }),
  asyncHandler(async (req, res) => {
    res.json(await reservationsService.cancelReservation(req.params.id, req));
  })
);

/**
 * @openapi
 * /api/reservations/check-in:
 *   post:
 *     summary: Check a vehicle in by scanning its confirmation code or QR token (Attendant)
 *     tags: [Reservations]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Reservation moved to CHECKED_IN, slot marked OCCUPIED }
 */
router.post(
  '/check-in',
  requireAuth,
  requireRole('PARKING_ATTENDANT', ...STAFF_ROLES),
  validate({ body: z.object({ code: z.string().min(1) }) }),
  asyncHandler(async (req, res) => {
    res.json(await reservationsService.checkIn(req.body.code, req));
  })
);

/**
 * @openapi
 * /api/reservations/{id}/check-out:
 *   post:
 *     summary: Check a vehicle out (Attendant)
 *     tags: [Reservations]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Reservation moved to CHECKED_OUT, slot freed }
 */
router.post(
  '/:id/check-out',
  requireAuth,
  requireRole('PARKING_ATTENDANT', ...STAFF_ROLES),
  validate({ params: idParam }),
  asyncHandler(async (req, res) => {
    res.json(await reservationsService.checkOut(req.params.id, req));
  })
);

export default router;
