import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../middleware/asyncHandler.js';
import { forbidden } from '../../utils/errors.js';
import {
  createPropertySchema,
  decidePropertySchema,
  listPropertiesQuerySchema,
  updatePropertySchema,
} from './properties.schemas.js';
import * as propertiesService from './properties.service.js';

const router = Router();
const idParam = z.object({ id: z.string().uuid() });

/**
 * @openapi
 * /api/properties:
 *   post:
 *     summary: Register a new property (pending approval)
 *     tags: [Properties]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Property created, pending approval }
 */
router.post(
  '/',
  requireAuth,
  requireRole('SUPER_ADMIN', 'SYSTEM_ADMIN', 'PROPERTY_OWNER'),
  validate({ body: createPropertySchema }),
  asyncHandler(async (req, res) => {
    res.status(201).json(await propertiesService.createProperty(req.body, req));
  })
);

/**
 * @openapi
 * /api/properties:
 *   get:
 *     summary: List properties
 *     tags: [Properties]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Paginated property list }
 */
router.get(
  '/',
  requireAuth,
  validate({ query: listPropertiesQuerySchema }),
  asyncHandler(async (req, res) => {
    res.json(await propertiesService.listProperties(req.query as unknown as z.infer<typeof listPropertiesQuerySchema>));
  })
);

/**
 * @openapi
 * /api/properties/{id}:
 *   get:
 *     summary: Get one property with zones, slots, and managers
 *     tags: [Properties]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Property detail }
 *       404: { description: Not found }
 */
router.get(
  '/:id',
  requireAuth,
  validate({ params: idParam }),
  asyncHandler(async (req, res) => {
    res.json(await propertiesService.getProperty(req.params.id));
  })
);

/**
 * @openapi
 * /api/properties/{id}:
 *   patch:
 *     summary: Update a property
 *     tags: [Properties]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Updated property }
 */
router.patch(
  '/:id',
  requireAuth,
  validate({ params: idParam, body: updatePropertySchema }),
  asyncHandler(async (req, res) => {
    const allowed =
      ['SUPER_ADMIN', 'SYSTEM_ADMIN'].includes(req.user!.role) ||
      (await propertiesService.userCanManageProperty(req.user!.id, req.user!.role, req.params.id));
    if (!allowed) throw forbidden();
    res.json(await propertiesService.updateProperty(req.params.id, req.body, req));
  })
);

/**
 * @openapi
 * /api/properties/{id}/decision:
 *   post:
 *     summary: Approve or reject a pending property application (System/Super Admin)
 *     tags: [Properties]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Decision recorded }
 */
router.post(
  '/:id/decision',
  requireAuth,
  requireRole('SUPER_ADMIN', 'SYSTEM_ADMIN'),
  validate({ params: idParam, body: decidePropertySchema }),
  asyncHandler(async (req, res) => {
    res.json(await propertiesService.decideProperty(req.params.id, req.body.status, req.body.reason, req));
  })
);

/**
 * @openapi
 * /api/properties/{id}:
 *   delete:
 *     summary: Soft-delete (deactivate) a property
 *     tags: [Properties]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       204: { description: Property deactivated }
 */
router.delete(
  '/:id',
  requireAuth,
  requireRole('SUPER_ADMIN', 'SYSTEM_ADMIN'),
  validate({ params: idParam }),
  asyncHandler(async (req, res) => {
    await propertiesService.softDeleteProperty(req.params.id, req);
    res.status(204).send();
  })
);

/**
 * @openapi
 * /api/properties/{id}/managers:
 *   post:
 *     summary: Assign a Property Manager to this property, with or without approval rights
 *     tags: [Properties]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Manager assignment created or updated }
 */
router.post(
  '/:id/managers',
  requireAuth,
  requireRole('SUPER_ADMIN', 'SYSTEM_ADMIN', 'PROPERTY_OWNER'),
  validate({ params: idParam, body: z.object({ userId: z.string().uuid(), canApprove: z.boolean().default(true) }) }),
  asyncHandler(async (req, res) => {
    res.json(await propertiesService.assignManager(req.params.id, req.body.userId, req.body.canApprove, req));
  })
);

export default router;
