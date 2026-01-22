import type { Request, Response, NextFunction } from 'express';
import { ValidationError, ConflictError, UnauthorizedError } from '../types/auth.js';

/**
 * Centralized error handling middleware
 *
 * Maps custom errors to appropriate HTTP status codes
 * and formats error responses consistently.
 */
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Log error for debugging (in production, use proper logging service)
  console.error(`[${new Date().toISOString()}] Error:`, err);

  // Validation errors → 400 Bad Request
  if (err instanceof ValidationError) {
    res.status(400).json({
      error: 'Validation failed',
      message: err.message,
    });
    return;
  }

  // Conflict errors (e.g., duplicate email) → 409 Conflict
  if (err instanceof ConflictError) {
    res.status(409).json({
      error: 'Conflict',
      message: err.message,
    });
    return;
  }

  // Unauthorized errors (e.g., invalid credentials) → 401 Unauthorized
  if (err instanceof UnauthorizedError) {
    res.status(401).json({
      error: 'Unauthorized',
      message: err.message,
    });
    return;
  }

  // Default: 500 Internal Server Error
  // Don't expose stack trace or internal details in production
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'production'
      ? 'An unexpected error occurred'
      : err.message,
  });
}
