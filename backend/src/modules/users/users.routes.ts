import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../middleware/asyncHandler.js';
import { z } from 'zod';
import {
  inviteUserSchema,
  listUsersQuerySchema,
  updateProfileSchema,
  updateUserPropertySchema,
  updateUserStatusSchema,
} from './users.schemas.js';
import * as usersService from './users.service.js';

const router = Router();

/**
 * @openapi
 * /api/users/me:
 *   get:
 *     summary: Get the current user's profile
 *     tags: [Users]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Current user profile }
 */
router.get('/me', requireAuth, asyncHandler(async (req, res) => {
  res.json(await usersService.getProfile(req.user!.id));
}));

/**
 * @openapi
 * /api/users/me:
 *   patch:
 *     summary: Update the current user's profile
 *     tags: [Users]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Updated profile }
 */
router.patch(
  '/me',
  requireAuth,
  validate({ body: updateProfileSchema }),
  asyncHandler(async (req, res) => {
    res.json(await usersService.updateProfile(req.user!.id, req.body, req));
  })
);

/**
 * @openapi
 * /api/users:
 *   get:
 *     summary: List users (admin)
 *     tags: [Users]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Paginated user list }
 */
router.get(
  '/',
  requireAuth,
  requireRole('SUPER_ADMIN', 'SYSTEM_ADMIN', 'PROPERTY_MANAGER'),
  validate({ query: listUsersQuerySchema }),
  asyncHandler(async (req, res) => {
    res.json(await usersService.listUsers(
      req.query as unknown as z.infer<typeof listUsersQuerySchema>,
      req.user!,
    ));
  })
);

/**
 * @openapi
 * /api/users/invite:
 *   post:
 *     summary: Invite a Property Manager or Property Owner (System/Super Admin)
 *     tags: [Users]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Invitation sent }
 */
router.post(
  '/invite',
  requireAuth,
  requireRole('SUPER_ADMIN', 'SYSTEM_ADMIN'),
  validate({ body: inviteUserSchema }),
  asyncHandler(async (req, res) => {
    res.status(201).json(await usersService.inviteUser(req.body, req));
  })
);

/**
 * @openapi
 * /api/users/{id}/status:
 *   patch:
 *     summary: Activate, suspend, or deactivate a user (admin)
 *     tags: [Users]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Updated status }
 */
router.patch(
  '/:id/property',
  requireAuth,
  requireRole('SUPER_ADMIN'),
  validate({ body: updateUserPropertySchema, params: z.object({ id: z.string().uuid() }) }),
  asyncHandler(async (req, res) => {
    res.json(await usersService.updateUserProperty(req.params.id, req.body.propertyId, req));
  })
);

router.patch(
  '/:id/status',
  requireAuth,
  requireRole('SUPER_ADMIN', 'SYSTEM_ADMIN'),
  validate({ body: updateUserStatusSchema, params: z.object({ id: z.string().uuid() }) }),
  asyncHandler(async (req, res) => {
    res.json(await usersService.updateUserStatus(req.params.id, req.body.status, req));
  })
);

/**
 * @openapi
 * /api/users/{id}:
 *   delete:
 *     summary: Soft-delete a user (Super Admin only)
 *     tags: [Users]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       204: { description: User deactivated and soft-deleted }
 */
router.delete(
  '/:id',
  requireAuth,
  requireRole('SUPER_ADMIN'),
  validate({ params: z.object({ id: z.string().uuid() }) }),
  asyncHandler(async (req, res) => {
    await usersService.softDeleteUser(req.params.id, req);
    res.status(204).send();
  })
);

export default router;
