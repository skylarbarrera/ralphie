import { Router, type Request, type Response, type NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { AuthService } from '../services/authService.js';
import { RegisterSchema, LoginSchema, ValidationError } from '../types/auth.js';
import { ZodError } from 'zod';

/**
 * Authentication routes
 *
 * Responsibilities:
 * - Handle HTTP concerns (request/response)
 * - Validate request body with Zod
 * - Call AuthService for business logic
 * - Format responses
 */
export function createAuthRoutes(authService: AuthService): Router {
  const router = Router();

  // Rate limiting: 5 attempts per 15 minutes per IP
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 requests per window
    message: 'Too many authentication attempts, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
  });

  /**
   * POST /api/auth/register
   *
   * Register a new user
   */
  router.post(
    '/register',
    limiter,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        // Validate request body with Zod
        const input = RegisterSchema.parse(req.body);

        // Call service layer
        const user = await authService.register(input);

        // Return 201 Created with user object
        res.status(201).json({ user });
      } catch (error) {
        // Zod validation errors
        if (error instanceof ZodError) {
          return next(new ValidationError(error.errors[0].message));
        }
        next(error);
      }
    }
  );

  /**
   * POST /api/auth/login
   *
   * Login existing user
   */
  router.post(
    '/login',
    limiter,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        // Validate request body with Zod
        const input = LoginSchema.parse(req.body);

        // Call service layer
        const { token, user } = await authService.login(input);

        // Set httpOnly cookie (XSS protection)
        res.cookie('token', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production', // HTTPS only in production
          sameSite: 'strict', // CSRF protection
          maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        });

        // Return 200 OK with user object
        res.status(200).json({ user });
      } catch (error) {
        // Zod validation errors
        if (error instanceof ZodError) {
          return next(new ValidationError(error.errors[0].message));
        }
        next(error);
      }
    }
  );

  return router;
}
