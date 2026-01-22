import { z } from 'zod';

/**
 * User domain model (without sensitive data)
 */
export interface User {
  id: string;
  email: string;
  createdAt: Date;
}

/**
 * Internal user model (includes password hash)
 */
export interface UserRecord extends User {
  passwordHash: string;
}

/**
 * Registration request schema with Zod validation
 */
export const RegisterSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
});

export type RegisterInput = z.infer<typeof RegisterSchema>;

/**
 * Login request schema
 */
export const LoginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

export type LoginInput = z.infer<typeof LoginSchema>;

/**
 * User repository interface (dependency inversion)
 */
export interface UserRepository {
  findByEmail(email: string): Promise<UserRecord | null>;
  create(email: string, passwordHash: string): Promise<UserRecord>;
}

/**
 * Custom error classes for consistent error handling
 */
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class ConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConflictError';
  }
}

export class UnauthorizedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnauthorizedError';
  }
}
