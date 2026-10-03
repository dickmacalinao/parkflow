import { Router } from 'express';
import { asyncHandler } from '../../middleware/asyncHandler.js';
import { validate } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/auth.js';
import { authRateLimiter } from '../../middleware/rateLimiter.js';
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  refreshSchema,
  registerSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from './auth.schemas.js';
import * as authService from './auth.service.js';

const router = Router();
router.use(authRateLimiter);

/**
 * @openapi
 * /api/auth/register:
 *   post:
 *     summary: Register a new tenant or visitor account
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [firstName, lastName, email, propertyId, password]
 *             properties:
 *               firstName: { type: string, example: "Amara" }
 *               lastName: { type: string, example: "Okafor" }
 *               email: { type: string, example: "amara@example.com" }
 *               phone: { type: string, example: "+15551234567" }
 *               propertyId: { type: string, format: uuid, description: Active property assignment }
 *               password: { type: string, example: "Str0ngPass!" }
 *               role: { type: string, enum: [TENANT, VISITOR], default: TENANT }
 *     responses:
 *       201: { description: Account created, verification email sent }
 *       409: { description: Email already registered }
 */
router.post(
  '/register',
  validate({ body: registerSchema }),
  asyncHandler(async (req, res) => {
    const user = await authService.register(req.body);
    res.status(201).json({ user, message: 'Account created. Check your email to verify your address.' });
  })
);

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     summary: Log in with email and password
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string }
 *               password: { type: string }
 *     responses:
 *       200: { description: Access + refresh token pair }
 *       401: { description: Invalid credentials or unverified/locked account }
 */
router.post(
  '/login',
  validate({ body: loginSchema }),
  asyncHandler(async (req, res) => {
    const result = await authService.login(req.body.email, req.body.password, req);
    res.json(result);
  })
);

/**
 * @openapi
 * /api/auth/refresh:
 *   post:
 *     summary: Exchange a refresh token for a new access + refresh token pair (rotation)
 *     tags: [Auth]
 *     responses:
 *       200: { description: New token pair }
 *       401: { description: Refresh token invalid, revoked, or expired }
 */
router.post(
  '/refresh',
  validate({ body: refreshSchema }),
  asyncHandler(async (req, res) => {
    const result = await authService.refresh(req.body.refreshToken, req);
    res.json(result);
  })
);

/**
 * @openapi
 * /api/auth/logout:
 *   post:
 *     summary: Revoke a single refresh token (log out of this device)
 *     tags: [Auth]
 *     responses:
 *       204: { description: Logged out }
 */
router.post(
  '/logout',
  validate({ body: refreshSchema }),
  asyncHandler(async (req, res) => {
    await authService.logout(req.body.refreshToken);
    res.status(204).send();
  })
);

/**
 * @openapi
 * /api/auth/logout-all:
 *   post:
 *     summary: Revoke every refresh token for the current user (log out of all devices)
 *     tags: [Auth]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       204: { description: Logged out everywhere }
 */
router.post(
  '/logout-all',
  requireAuth,
  asyncHandler(async (req, res) => {
    await authService.logoutAllDevices(req.user!.id);
    res.status(204).send();
  })
);

/**
 * @openapi
 * /api/auth/sessions:
 *   get:
 *     summary: List this user's active sessions (multi-device login visibility)
 *     tags: [Auth]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Active sessions }
 */
router.get(
  '/sessions',
  requireAuth,
  asyncHandler(async (req, res) => {
    const sessions = await authService.listActiveSessions(req.user!.id);
    res.json({ sessions });
  })
);

/**
 * @openapi
 * /api/auth/verify-email:
 *   post:
 *     summary: Verify an email address using the token from the verification email
 *     tags: [Auth]
 *     responses:
 *       204: { description: Email verified, account activated }
 *       400: { description: Token invalid or expired }
 */
router.post(
  '/verify-email',
  validate({ body: verifyEmailSchema }),
  asyncHandler(async (req, res) => {
    await authService.verifyEmail(req.body.token);
    res.status(204).send();
  })
);

/**
 * @openapi
 * /api/auth/forgot-password:
 *   post:
 *     summary: Request a password reset email
 *     tags: [Auth]
 *     responses:
 *       200: { description: Generic confirmation (does not reveal whether the email exists) }
 */
router.post(
  '/forgot-password',
  validate({ body: forgotPasswordSchema }),
  asyncHandler(async (req, res) => {
    await authService.forgotPassword(req.body.email);
    res.json({ message: 'If that email is registered, a reset link has been sent.' });
  })
);

/**
 * @openapi
 * /api/auth/reset-password:
 *   post:
 *     summary: Reset a password using a token from the reset email
 *     tags: [Auth]
 *     responses:
 *       204: { description: Password changed, all sessions revoked }
 *       400: { description: Token invalid or expired }
 */
router.post(
  '/reset-password',
  validate({ body: resetPasswordSchema }),
  asyncHandler(async (req, res) => {
    await authService.resetPassword(req.body.token, req.body.password);
    res.status(204).send();
  })
);

/**
 * @openapi
 * /api/auth/change-password:
 *   post:
 *     summary: Change password while logged in
 *     tags: [Auth]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       204: { description: Password changed, all sessions revoked }
 *       400: { description: Current password incorrect }
 */
router.post(
  '/change-password',
  requireAuth,
  validate({ body: changePasswordSchema }),
  asyncHandler(async (req, res) => {
    await authService.changePassword(req.user!.id, req.body.currentPassword, req.body.newPassword);
    res.status(204).send();
  })
);

export default router;
