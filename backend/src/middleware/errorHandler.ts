import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { AppError } from '../utils/errors.js';
import { logger } from '../config/logger.js';

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Invalid request.', details: err.flatten() },
    });
    return;
  }

  if (err instanceof AppError) {
    if (err.status >= 500) logger.error(err.message, { stack: err.stack, path: req.path });
    res.status(err.status).json({ error: { code: err.code, message: err.message, details: err.details } });
    return;
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      res.status(409).json({ error: { code: 'CONFLICT', message: 'A record with these values already exists.' } });
      return;
    }
    if (err.code === 'P2025') {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Record not found.' } });
      return;
    }
  }

  logger.error('Unhandled error', { err, path: req.path });
  res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Something went wrong on our end.' } });
}
