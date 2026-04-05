/**
 * Onboarding Purpose Routes
 * 
 * Simplified purpose wizard for Work-first onboarding
 * POST /v1/onboarding/purpose
 * GET /v1/me/purpose
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/database';
import { authenticateToken } from '../lib/auth';

const router = Router();

// Validation schemas
const purposeSchema = z.object({
  primary: z.enum(['work', 'learning', 'mentorship', 'community'], {
    required_error: 'Primary purpose is required',
    invalid_type_error: 'Invalid primary purpose'
  }),
  secondary: z.enum(['work', 'learning', 'mentorship', 'community']).optional()
});

/**
 * POST /v1/onboarding/purpose
 * Save user's onboarding purpose
 */
router.post('/purpose', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Validate request body
    const validatedData = purposeSchema.parse(req.body);

    // Check if purpose already exists
    const existingPurpose = await prisma.userPurpose.findUnique({
      where: { userId }
    });

    let userPurpose;
    if (existingPurpose) {
      // Update existing purpose
      userPurpose = await prisma.userPurpose.update({
        where: { userId },
        data: {
          primary: validatedData.primary,
          secondary: validatedData.secondary,
          updatedAt: new Date()
        }
      });
    } else {
      // Create new purpose
      userPurpose = await prisma.userPurpose.create({
        data: {
          userId,
          primary: validatedData.primary,
          secondary: validatedData.secondary
        }
      });
    }

    // Log telemetry event
    console.log(`TELEMETRY: purpose_set`, {
      userId,
      primary: validatedData.primary,
      secondary: validatedData.secondary,
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      data: {
        id: userPurpose.id,
        primary: userPurpose.primary,
        secondary: userPurpose.secondary,
        completedAt: userPurpose.completedAt
      }
    });

  } catch (error) {
    console.error('Error saving onboarding purpose:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation error',
        details: error.errors
      });
    }

    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to save onboarding purpose'
    });
  }
});

/**
 * GET /v1/me/purpose
 * Get user's onboarding purpose
 */
router.get('/purpose', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userPurpose = await prisma.userPurpose.findUnique({
      where: { userId }
    });

    if (!userPurpose) {
      return res.json({
        hasPurpose: false,
        data: null
      });
    }

    res.json({
      hasPurpose: true,
      data: {
        id: userPurpose.id,
        primary: userPurpose.primary,
        secondary: userPurpose.secondary,
        completedAt: userPurpose.completedAt,
        updatedAt: userPurpose.updatedAt
      }
    });

  } catch (error) {
    console.error('Error fetching onboarding purpose:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch onboarding purpose'
    });
  }
});

/**
 * GET /v1/onboarding/purpose-options
 * Get available purpose options (for UI)
 */
router.get('/purpose-options', (req: Request, res: Response) => {
  const options = [
    {
      value: 'work',
      label: 'Find Work',
      description: 'Looking for job opportunities and employment',
      icon: '💼',
      features: ['Job matching', 'Applications tracking', 'Employer connections']
    },
    {
      value: 'learning',
      label: 'Learn Skills',
      description: 'Building skills through courses and training',
      icon: '📚',
      features: ['Course recommendations', 'Skill tracking', 'Certification pathways']
    },
    {
      value: 'mentorship',
      label: 'Get Guidance',
      description: 'Connect with mentors and career advisors',
      icon: '🌟',
      features: ['Mentor matching', 'Career guidance', 'Professional support']
    },
    {
      value: 'community',
      label: 'Connect & Support',
      description: 'Join community discussions and support networks',
      icon: '🤝',
      features: ['Community forums', 'Peer support', 'Networking opportunities']
    }
  ];

  res.json({
    options,
    metadata: {
      total: options.length,
      version: '1.0.0'
    }
  });
});

export default router;
