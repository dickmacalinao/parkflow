import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../middleware/asyncHandler.js';
import * as notificationsService from './notifications.service.js';

const router = Router();
const pagingSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

/**
 * @openapi
 * /api/notifications:
 *   get:
 *     summary: List the current user's in-app notifications
 *     tags: [Notifications]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Paginated notifications with an unread count }
 */
router.get(
  '/',
  requireAuth,
  validate({ query: pagingSchema }),
  asyncHandler(async (req, res) => {
    const { page, pageSize } = req.query as unknown as z.infer<typeof pagingSchema>;
    res.json(await notificationsService.listMyNotifications(req.user!.id, page, pageSize));
  })
);

router.post(
  '/:id/read',
  requireAuth,
  validate({ params: z.object({ id: z.string().uuid() }) }),
  asyncHandler(async (req, res) => {
    await notificationsService.markRead(req.user!.id, req.params.id);
    res.status(204).send();
  })
);

router.post(
  '/read-all',
  requireAuth,
  asyncHandler(async (req, res) => {
    await notificationsService.markAllRead(req.user!.id);
    res.status(204).send();
  })
);

export default router;
