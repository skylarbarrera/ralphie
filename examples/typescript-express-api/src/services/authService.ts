import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import {
  type User,
  type UserRecord,
  type UserRepository,
  type RegisterInput,
  type LoginInput,
  ConflictError,
  UnauthorizedError,
} from '../types/auth.js';

/**
 * Authentication service containing business logic
 *
 * Responsibilities:
 * - Password hashing with bcrypt
 * - JWT token generation
 * - User registration workflow
 * - User login workflow
 *
 * This layer is independent of HTTP concerns (Express) and
 * depends on the UserRepository interface (not implementation).
 */
export class AuthService {
  private readonly BCRYPT_ROUNDS = 12; // Cost factor for bcrypt
  private readonly JWT_SECRET: string;
  private readonly JWT_EXPIRES_IN = '7d';

  constructor(
    private readonly userRepo: UserRepository,
    jwtSecret: string
  ) {
    this.JWT_SECRET = jwtSecret;
  }

  /**
   * Register a new user
   *
   * @param input - Validated registration data
   * @returns User object (without password hash)
   * @throws ConflictError if email already exists
   */
  async register(input: RegisterInput): Promise<User> {
    // Check for existing user
    const existing = await this.userRepo.findByEmail(input.email);
    if (existing) {
      throw new ConflictError('Email already registered');
    }

    // Hash password with bcrypt (cost factor 12)
    const passwordHash = await bcrypt.hash(input.password, this.BCRYPT_ROUNDS);

    // Create user in database
    const userRecord = await this.userRepo.create(input.email, passwordHash);

    // Return user WITHOUT password hash
    return this.sanitizeUser(userRecord);
  }

  /**
   * Login existing user
   *
   * @param input - Validated login credentials
   * @returns JWT token and user object
   * @throws UnauthorizedError if credentials are invalid
   */
  async login(input: LoginInput): Promise<{ token: string; user: User }> {
    // Find user by email
    const userRecord = await this.userRepo.findByEmail(input.email);
    if (!userRecord) {
      // Don't reveal whether email exists (security best practice)
      throw new UnauthorizedError('Invalid credentials');
    }

    // Verify password with bcrypt
    const isValid = await bcrypt.compare(input.password, userRecord.passwordHash);
    if (!isValid) {
      throw new UnauthorizedError('Invalid credentials');
    }

    // Generate JWT token
    const token = this.generateToken(userRecord.id);

    return {
      token,
      user: this.sanitizeUser(userRecord),
    };
  }

  /**
   * Generate JWT token for user
   */
  private generateToken(userId: string): string {
    return jwt.sign(
      { userId },
      this.JWT_SECRET,
      { expiresIn: this.JWT_EXPIRES_IN }
    );
  }

  /**
   * Remove sensitive data from user record
   */
  private sanitizeUser(userRecord: UserRecord): User {
    const { passwordHash, ...user } = userRecord;
    return user;
  }
}
