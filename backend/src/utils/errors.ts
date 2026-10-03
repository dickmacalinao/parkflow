export class AppError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const badRequest = (message: string, details?: unknown) => new AppError(400, 'BAD_REQUEST', message, details);
export const unauthorized = (message = 'Authentication required.') => new AppError(401, 'UNAUTHORIZED', message);
export const forbidden = (message = 'You do not have permission to do this.') => new AppError(403, 'FORBIDDEN', message);
export const notFound = (message: string) => new AppError(404, 'NOT_FOUND', message);
export const conflict = (message: string, details?: unknown) => new AppError(409, 'CONFLICT', message, details);
export const tooManyRequests = (message = 'Too many requests. Try again later.') =>
  new AppError(429, 'RATE_LIMITED', message);
