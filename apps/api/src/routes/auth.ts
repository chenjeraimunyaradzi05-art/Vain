/**
 * Authentication Routes
 * 
 * Handles user registration, login, logout, and session management.
 */
import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../db';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { BadRequestError, UnauthorizedError, NotFoundError } from '../lib/errors';
import { changePasswordSchema, forgotPasswordSchema, resetPasswordSchema } from '../lib/validation';
import { emailService } from '../services/emailService';
import { redisCache } from '../lib/redisCacheWrapper';
import { authenticate } from '../middleware/auth';

const router = Router();

// Secure JWT secret handling - NEVER use weak fallback in production
function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET || process.env.DEV_JWT_SECRET;
  
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('FATAL: JWT_SECRET must be set in production');
    }
    console.warn('⚠️  Using development JWT secret - set JWT_SECRET for production!');
    return 'ngurra-dev-secret-minimum-32-chars';
  }
  
  if (secret.length < 32 && process.env.NODE_ENV === 'production') {
    throw new Error('FATAL: JWT_SECRET must be at least 32 characters');
  }
  
  return secret;
}

const JWT_SECRET = getJwtSecret();
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// Account lockout: track failed login attempts per email (in-memory)
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const failedAttempts = new Map<string, { count: number; firstAttempt: number }>();

function recordFailedAttempt(email: string): void {
  const now = Date.now();
  const record = failedAttempts.get(email);
  if (!record || now - record.firstAttempt > LOCKOUT_WINDOW_MS) {
    failedAttempts.set(email, { count: 1, firstAttempt: now });
  } else {
    record.count++;
  }
}

function isAccountLocked(email: string): boolean {
  const record = failedAttempts.get(email);
  if (!record) return false;
  if (Date.now() - record.firstAttempt > LOCKOUT_WINDOW_MS) {
    failedAttempts.delete(email);
    return false;
  }
  return record.count >= MAX_FAILED_ATTEMPTS;
}

function clearFailedAttempts(email: string): void {
  failedAttempts.delete(email);
}

// Cleanup stale lockout entries every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [email, record] of failedAttempts) {
    if (now - record.firstAttempt > LOCKOUT_WINDOW_MS) {
      failedAttempts.delete(email);
    }
  }
}, 10 * 60 * 1000);

// Validation schemas
const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  firstName: z.string().min(1, 'First name is required').optional(),
  lastName: z.string().min(1, 'Last name is required').optional(),
  name: z.string().min(1, 'Name is required').optional(),
  userType: z.enum(['MEMBER', 'COMPANY', 'MENTOR', 'TAFE', 'SEEKER']).default('MEMBER'),
  gender: z.string().optional(),
  inviteCode: z.string().optional(),
}).refine((data) => data.name || (data.firstName && data.lastName), {
  message: 'Name is required',
  path: ['name'],
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

/**
 * Generate JWT token for a user
 */
function generateToken(user: { id: string; email: string; userType: string }): string {
  return jwt.sign(
    { id: user.id, email: user.email, userType: user.userType },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions
  );
}

/**
 * @route POST /auth/register
 * @desc Register a new user
 * @access Public
 */
router.post('/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validation = registerSchema.safeParse(req.body);
    if (!validation.success) {
      return void res.status(400).json({
        error: 'Validation failed',
        details: validation.error.flatten().fieldErrors,
      });
    }

    const { email, password, firstName, lastName, name, userType, gender, inviteCode } = validation.data;
    const normalizedUserType = userType === 'SEEKER' ? 'MEMBER' : userType;
    const resolvedName = name || `${firstName || ''} ${lastName || ''}`.trim();
    const nameParts = resolvedName.split(' ').filter(Boolean);
    const resolvedFirstName = nameParts[0] || 'User';
    const resolvedLastName = nameParts.slice(1).join(' ');

    // ENFORCE FEMALE ONLY POLICY
    if (gender && gender !== 'FEMALE') {
       return void res.status(403).json({
         error: 'Access Restricted',
         message: 'Ngurra Pathways is currently restricted to female registration only for cultural safety reasons.'
       });
    }
    
    // Check Invite Code (Simple Check for now, integration with Invitation model later)
    // If an invite code is provided, we will mark the user as 'VERIFIED' or similar later.
    // For now, if they provide a code that looks like a VIP code, we might auto-approve.
    // But per requirements, they might still need subscription.
    // We will just log it for now as the Invitation model is being deployed.
    if (inviteCode) {
         // TODO: Check Validation against Invitation model
         console.log(`User registered with invite code: ${inviteCode}`);
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      return void res.status(409).json({
        error: 'User already exists',
        message: 'An account with this email already exists. Please sign in.',
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user with member profile
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        name: resolvedName,
        userType: normalizedUserType as any,
        password: hashedPassword,
        memberProfile: normalizedUserType === 'MEMBER' ? {
          create: {
            phone: null,
            mobNation: null,
            skillLevel: null,
            careerInterest: null,
            bio: null,
          },
        } : undefined,
      },
      select: {
        id: true,
        email: true,
        name: true,
        userType: true,
        createdAt: true,
      },
    });

    // Generate token
    const token = generateToken(user);

    const responseUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      userType: user.userType,
      profile: {
        firstName: resolvedFirstName,
        lastName: resolvedLastName,
      },
    };

    // Set HttpOnly cookie for session recovery on page reload
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/',
    });

    res.status(201).json({
      message: 'Registration successful',
      user: responseUser,
      token,
      data: {
        user: responseUser,
        token,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route POST /auth/login
 * @desc Login user and return token
 * @access Public
 */
router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validation = loginSchema.safeParse(req.body);
    if (!validation.success) {
      return void res.status(400).json({
        error: 'Validation failed',
        details: validation.error.flatten().fieldErrors,
      });
    }

    const { email, password } = validation.data;
    const normalizedEmail = email.toLowerCase();

    // Check account lockout
    if (isAccountLocked(normalizedEmail)) {
      return void res.status(429).json({
        error: 'Account temporarily locked',
        message: 'Too many failed login attempts. Please try again in 15 minutes.',
      });
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: {
        id: true,
        email: true,
        name: true,
        userType: true,
        avatarUrl: true,
        memberProfile: {
          select: {
            phone: true,
            bio: true,
          },
        },
      },
    });

    if (!user) {
      recordFailedAttempt(normalizedEmail);
      return void res.status(401).json({
        error: 'Invalid credentials',
        message: 'Email or password is incorrect.',
      });
    }

    const credentials = await prisma.$queryRaw<
      { password: string | null }[]
    >`SELECT "password" FROM "User" WHERE id = ${user.id} LIMIT 1`;

    const passwordHash = credentials[0]?.password || null;

    if (!passwordHash) {
      recordFailedAttempt(normalizedEmail);
      return void res.status(401).json({
        error: 'Invalid credentials',
        message: 'Email or password is incorrect.',
      });
    }

    const isValidPassword = await bcrypt.compare(password, passwordHash);
    if (!isValidPassword) {
      recordFailedAttempt(normalizedEmail);
      return void res.status(401).json({
        error: 'Invalid credentials',
        message: 'Email or password is incorrect.',
      });
    }

    // Clear failed attempts on successful login
    clearFailedAttempts(normalizedEmail);

    // Generate token
    const token = generateToken(user);

    // Parse name into first/last
    const nameParts = (user.name || '').split(' ');
    const firstName = nameParts[0] || 'User';
    const lastName = nameParts.slice(1).join(' ') || '';

    const responseUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      userType: user.userType,
      profile: {
        firstName,
        lastName,
        avatar: user.avatarUrl,
      },
    };

    // Set HttpOnly cookie for session recovery on page reload
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/',
    });

    res.json({
      message: 'Login successful',
      user: responseUser,
      token,
      data: {
        user: responseUser,
        token,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /auth/me
 * @desc Get current user from token
 * @access Private
 */
router.get('/me', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Extract token from Authorization header or cookie (session recovery)
    let token: string | null = null;
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else if (req.cookies?.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return void res.status(401).json({ error: 'No token provided' });
    }

    let decoded: any;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return void res.status(401).json({ error: 'Invalid or expired token' });
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        email: true,
        name: true,
        userType: true,
        avatarUrl: true,
        memberProfile: {
          select: {
            phone: true,
            bio: true,
          },
        },
      },
    });

    if (!user) {
      return void res.status(404).json({ error: 'User not found' });
    }

    const nameParts = (user.name || '').split(' ');
    const firstName = nameParts[0] || 'User';
    const lastName = nameParts.slice(1).join(' ') || '';

    // Issue a fresh token so the client can restore its in-memory token after page reload
    const freshToken = generateToken(user);

    res.json({
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        userType: user.userType,
        token: freshToken,
        profile: {
          firstName,
          lastName,
          avatar: user.avatarUrl,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route POST /auth/change-password
 * @desc Change password for authenticated user
 * @access Private
 */
router.post('/change-password', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validation = changePasswordSchema.safeParse(req.body);
    if (!validation.success) {
      return void res.status(400).json({
        error: 'Validation failed',
        details: validation.error.flatten().fieldErrors,
      });
    }

    const { currentPassword, newPassword } = validation.data;
    const userId = (req as any).user?.id as string | undefined;

    if (!userId) {
      return void res.status(401).json({ error: 'Unauthorized' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, userType: true, password: true },
    });

    if (!user || !user.password) {
      return void res.status(404).json({ error: 'User not found' });
    }

    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      return void res.status(401).json({ error: 'Current password is incorrect' });
    }

    if (currentPassword === newPassword) {
      return void res.status(400).json({ error: 'New password must be different from current password' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    const freshToken = generateToken({
      id: user.id,
      email: user.email,
      userType: String(user.userType),
    });

    // Rotate cookie token to keep session continuity after password change.
    res.cookie('token', freshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    });

    return void res.json({
      message: 'Password changed successfully',
      token: freshToken,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route POST /auth/forgot-password
 * @desc Request password reset (always returns success)
 * @access Public
 */
router.post('/forgot-password', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validation = forgotPasswordSchema.safeParse(req.body);
    if (!validation.success) {
      return void res.status(400).json({
        error: 'Validation failed',
        details: validation.error.flatten().fieldErrors,
      });
    }

    const email = validation.data.email.toLowerCase();
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, name: true },
    });

    if (user) {
      const token = crypto.randomBytes(32).toString('hex');
      const tokenKey = `password_reset:${token}`;
      const userKey = `password_reset:user:${user.id}`;
      const ttlSeconds = 60 * 60; // 1 hour

      // Invalidate any existing token for this user
      const previousToken = await redisCache.get<string>(userKey);
      if (previousToken) {
        await redisCache.delete(`password_reset:${previousToken}`);
      }

      await redisCache.set(tokenKey, { userId: user.id, email: user.email }, ttlSeconds);
      await redisCache.set(userKey, token, ttlSeconds);

      const firstName = (user.name || 'there').split(' ')[0];
      try {
        await emailService.sendPasswordReset(user.email, firstName, token);
      } catch (err) {
        console.error('Failed to send password reset email', err);
      }
    }

    // Always return success to prevent email enumeration
    return void res.json({
      message: 'If an account exists with this email, a reset link has been sent.',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route POST /auth/reset-password
 * @desc Reset password using token
 * @access Public
 */
router.post('/reset-password', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validation = resetPasswordSchema.safeParse(req.body);
    if (!validation.success) {
      return void res.status(400).json({
        error: 'Validation failed',
        details: validation.error.flatten().fieldErrors,
      });
    }

    const { token, password } = validation.data;
    const tokenKey = `password_reset:${token}`;
    const record = await redisCache.get<{ userId: string; email: string }>(tokenKey);

    if (!record?.userId) {
      return void res.status(400).json({ error: 'Invalid or expired reset token.' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    await prisma.user.update({
      where: { id: record.userId },
      data: { password: hashedPassword },
    });

    await redisCache.delete(tokenKey);
    await redisCache.delete(`password_reset:user:${record.userId}`);

    return void res.json({ message: 'Password reset successful. You can now sign in.' });
  } catch (error) {
    next(error);
  }
});

/**
 * @route POST /auth/logout
 * @desc Logout user (client-side token removal)
 * @access Private
 */
router.post('/logout', authenticate, (_req: Request, res: Response) => {
  // Clear the HttpOnly session cookie
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  });
  res.json({ message: 'Logout successful' });
});

export default router;

