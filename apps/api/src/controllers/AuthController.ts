// @ts-nocheck
/**
 * Authentication Controller
 * 
 * Handles user registration, login, logout, and token refresh.
 * Business logic extracted from routes/auth.ts
 */

import { Request, Response } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../db';
import { BaseController, asyncHandler } from './BaseController';
import { logger } from '../lib/logger';

// Validation schemas
const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  userType: z.enum(['MEMBER', 'COMPANY', 'MENTOR', 'TAFE']).default('MEMBER'),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

// Secure JWT secret handling
function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET || process.env.DEV_JWT_SECRET;
  
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('FATAL: JWT_SECRET must be set in production');
    }
    console.warn('⚠️  Using development JWT secret - set JWT_SECRET for production!');
    return 'ngurra-dev-secret-minimum-32-chars';
  }
  
  return secret;
}

const JWT_SECRET = getJwtSecret();
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

class AuthController extends BaseController {
  /**
   * Generate JWT token for a user
   */
  private generateToken(user: { id: string; email: string; userType: string }): string {
    return jwt.sign(
      { id: user.id, email: user.email, userType: user.userType },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
  }

  /**
   * POST /auth/register
   * Register a new user
   */
  register = asyncHandler(async (req: Request, res: Response) => {
    const validation = registerSchema.safeParse(req.body);
    if (!validation.success) {
      return this.error(res, 'Validation failed', 400, validation.error.flatten().fieldErrors);
    }

    const { email, password, firstName, lastName, userType } = validation.data;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      return this.error(res, 'An account with this email already exists', 409);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user with member profile
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        name: `${firstName} ${lastName}`,
        userType: userType as any,
        passwordHash: hashedPassword,
        memberProfile: userType === 'MEMBER' ? {
          create: {},
        } : undefined,
        companyProfile: userType === 'COMPANY' ? {
          create: {
            companyName: `${firstName} ${lastName}'s Company`,
            industry: 'Other',
          },
        } : undefined,
      },
      select: {
        id: true,
        email: true,
        name: true,
        userType: true,
      },
    });

    // Generate token
    const token = this.generateToken(user);

    logger.info('User registered', { userId: user.id, email: user.email });

    return this.success(res, {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        userType: user.userType,
      },
    }, 'Registration successful', 201);
  });

  /**
   * POST /auth/login
   * Authenticate user and return token
   */
  login = asyncHandler(async (req: Request, res: Response) => {
    const validation = loginSchema.safeParse(req.body);
    if (!validation.success) {
      return this.error(res, 'Validation failed', 400, validation.error.flatten().fieldErrors);
    }

    const { email, password } = validation.data;

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: {
        id: true,
        email: true,
        name: true,
        userType: true,
        passwordHash: true,
      },
    });

    if (!user || !user.passwordHash) {
      // Don't reveal whether email exists
      return this.error(res, 'Invalid email or password', 401);
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      logger.warn('Failed login attempt', { email: email.toLowerCase() });
      return this.error(res, 'Invalid email or password', 401);
    }

    // Generate token
    const token = this.generateToken(user);

    logger.info('User logged in', { userId: user.id, email: user.email });

    return this.success(res, {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        userType: user.userType,
      },
    }, 'Login successful');
  });

  /**
   * POST /auth/logout
   * Invalidate user session (client-side token removal)
   */
  logout = asyncHandler(async (req: Request, res: Response) => {
    // JWT is stateless, so logout is handled client-side
    // In future, could add token to blocklist in Redis
    
    const user = this.getUser(req);
    if (user) {
      logger.info('User logged out', { userId: user.id });
    }

    return this.success(res, null, 'Logged out successfully');
  });

  /**
   * GET /auth/me
   * Get current authenticated user
   */
  me = asyncHandler(async (req: Request, res: Response) => {
    const authUser = this.requireUser(req);

    const user = await prisma.user.findUnique({
      where: { id: authUser.id },
      select: {
        id: true,
        email: true,
        name: true,
        userType: true,
        createdAt: true,
        memberProfile: {
          select: {
            firstName: true,
            lastName: true,
            bio: true,
            location: true,
            avatarUrl: true,
          },
        },
        companyProfile: {
          select: {
            name: true,
            description: true,
            logoUrl: true,
            isVerified: true,
          },
        },
      },
    });

    if (!user) {
      return this.notFound(res, 'User');
    }

    return this.success(res, user);
  });

  /**
   * POST /auth/refresh
   * Refresh JWT token
   */
  refresh = asyncHandler(async (req: Request, res: Response) => {
    const authUser = this.requireUser(req);

    // Generate new token
    const token = this.generateToken({
      id: authUser.id,
      email: authUser.email,
      userType: authUser.userType,
    });

    return this.success(res, { token }, 'Token refreshed');
  });

  /**
   * POST /auth/forgot-password
   * Request password reset
   */
  forgotPassword = asyncHandler(async (req: Request, res: Response) => {
    const { email } = req.body;

    if (!email) {
      return this.error(res, 'Email is required', 400);
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    // Always return success to prevent email enumeration
    if (user) {
      // TODO: Generate reset token and send email
      logger.info('Password reset requested', { email: email.toLowerCase() });
    }

    return this.success(res, null, 'If an account exists with this email, a reset link has been sent');
  });
}

export const authController = new AuthController();
export default authController;
