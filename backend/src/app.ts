import express from 'express';
import type { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import swaggerUi from 'swagger-ui-express';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { swaggerSpec } from './config/swagger.js';
import { errorHandler } from './middleware/errorHandler.js';
import { apiRateLimiter } from './middleware/rateLimiter.js';

import authRoutes from './modules/auth/auth.routes.js';
import usersRoutes from './modules/users/users.routes.js';
import propertiesRoutes from './modules/properties/properties.routes.js';
import parkingRoutes from './modules/parking/parking.routes.js';
import reservationsRoutes from './modules/reservations/reservations.routes.js';
import visitorPassesRoutes from './modules/visitorPasses/visitorPasses.routes.js';
import notificationsRoutes from './modules/notifications/notifications.routes.js';
import auditRoutes from './modules/audit/audit.routes.js';

export function createApp() {
  const app = express();

  // Security headers (OWASP baseline): CSP, HSTS, no-sniff, frameguard, etc.
  app.use(helmet());
  app.use(cors({ origin: env.CLIENT_URL, credentials: true }));
  app.use(compression());
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(apiRateLimiter);

  app.use((req: Request, res: Response, next: NextFunction) => {
    const startedAt = Date.now();
    res.on('finish', () => {
      logger.info(`${req.method} ${req.originalUrl} -> ${res.statusCode} (${Date.now() - startedAt}ms)`);
    });
    next();
  });

  app.get('/health', (_req: Request, res: Response) => res.json({ status: 'ok', uptime: process.uptime() }));
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  app.get('/api/openapi.json', (_req: Request, res: Response) => res.json(swaggerSpec));

  app.use('/api/auth', authRoutes);
  app.use('/api/users', usersRoutes);
  app.use('/api/properties', propertiesRoutes);
  app.use('/api/parking', parkingRoutes);
  app.use('/api/reservations', reservationsRoutes);
  app.use('/api/visitor-passes', visitorPassesRoutes);
  app.use('/api/notifications', notificationsRoutes);
  app.use('/api/audit-logs', auditRoutes);

  app.use((req: Request, res: Response) => {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: `No route for ${req.method} ${req.originalUrl}` } });
  });

  app.use(errorHandler);

  return app;
}
