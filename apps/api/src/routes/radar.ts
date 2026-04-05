/**
 * Opportunity Radar Routes
 * 
 * Handles job matching, radar rules, and notification management
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/database';
import { authenticate, authorize } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';

const router = Router();

// Validation schemas
const radarRuleSchema = z.object({
  name: z.string().min(1, 'Rule name is required').max(100),
  location: z.string().optional(),
  employmentType: z.enum(['FULL_TIME', 'PART_TIME', 'CONTRACT', 'CASUAL', 'APPRENTICESHIP', 'TRAINEESHIP']).optional(),
  salaryMin: z.number().min(0).optional(),
  salaryMax: z.number().min(0).optional(),
  skills: z.array(z.string()).optional(),
  industries: z.array(z.string()).optional(),
  keywords: z.string().optional(),
  matchScore: z.number().min(0).max(1).default(0.8),
  isActive: z.boolean().default(true)
});

const updateRadarRuleSchema = radarRuleSchema.partial();

const listRadarRulesSchema = z.object({
  page: z.string().optional().transform(val => val ? parseInt(val) : 1),
  pageSize: z.string().optional().transform(val => val ? parseInt(val) : 20),
  isActive: z.boolean().optional()
});

const listMatchesSchema = z.object({
  page: z.string().optional().transform(val => val ? parseInt(val) : 1),
  pageSize: z.string().optional().transform(val => val ? parseInt(val) : 20),
  minScore: z.number().min(0).max(1).optional().default(0.5)
});

/**
 * POST /v1/radar/rules
 * Create a new radar rule
 */
router.post('/rules', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const validatedData = radarRuleSchema.parse(req.body);

    // Check if rule name is unique for this user
    const existingRule = await prisma.radarRule.findFirst({
      where: {
        userId,
        name: validatedData.name
      }
    });

    if (existingRule) {
      return res.status(409).json({ error: 'Rule name already exists' });
    }

    const radarRule = await prisma.radarRule.create({
      data: {
        userId,
        ...validatedData,
        skills: validatedData.skills ? JSON.stringify(validatedData.skills) : null,
        industries: validatedData.industries ? JSON.stringify(validatedData.industries) : null
      }
    });

    // Log telemetry event
    console.log(`TELEMETRY: radar_rule_created`, {
      userId,
      ruleId: radarRule.id,
      ruleName: radarRule.name,
      timestamp: new Date().toISOString()
    });

    res.status(201).json({
      success: true,
      data: {
        id: radarRule.id,
        name: radarRule.name,
        location: radarRule.location,
        employmentType: radarRule.employmentType,
        salaryMin: radarRule.salaryMin,
        salaryMax: radarRule.salaryMax,
        skills: radarRule.skills ? JSON.parse(radarRule.skills) : [],
        industries: radarRule.industries ? JSON.parse(radarRule.industries) : [],
        keywords: radarRule.keywords,
        matchScore: radarRule.matchScore,
        isActive: radarRule.isActive,
        createdAt: radarRule.createdAt
      }
    });

  } catch (error) {
    console.error('Error creating radar rule:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation error',
        details: error.errors
      });
    }

    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to create radar rule'
    });
  }
});

/**
 * GET /v1/radar/rules
 * List user's radar rules
 */
router.get('/rules', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const validatedQuery = listRadarRulesSchema.parse(req.query);
    const { page, pageSize, isActive } = validatedQuery;
    const skip = (page - 1) * pageSize;

    let whereClause: any = { userId };
    if (isActive !== undefined) {
      whereClause.isActive = isActive;
    }

    const [rules, total] = await Promise.all([
      prisma.radarRule.findMany({
        where: whereClause,
        orderBy: {
          createdAt: 'desc'
        },
        skip,
        take: pageSize
      }),
      prisma.radarRule.count({
        where: whereClause
      })
    ]);

    const formattedRules = rules.map(rule => ({
      id: rule.id,
      name: rule.name,
      location: rule.location,
      employmentType: rule.employmentType,
      salaryMin: rule.salaryMin,
      salaryMax: rule.salaryMax,
      skills: rule.skills ? JSON.parse(rule.skills) : [],
      industries: rule.industries ? JSON.parse(rule.industries) : [],
      keywords: rule.keywords,
      matchScore: rule.matchScore,
      isActive: rule.isActive,
      createdAt: rule.createdAt,
      updatedAt: rule.updatedAt
    }));

    res.json({
      success: true,
      data: {
        rules: formattedRules,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
          hasNext: page * pageSize < total,
          hasPrev: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Error fetching radar rules:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch radar rules'
    });
  }
});

/**
 * PATCH /v1/radar/rules/:id
 * Update a radar rule
 */
router.patch('/rules/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const validatedData = updateRadarRuleSchema.parse(req.body);

    // Verify rule ownership
    const existingRule = await prisma.radarRule.findUnique({
      where: { id }
    });

    if (!existingRule) {
      return res.status(404).json({ error: 'Radar rule not found' });
    }

    if (existingRule.userId !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const updatedRule = await prisma.radarRule.update({
      where: { id },
      data: {
        ...validatedData,
        skills: validatedData.skills !== undefined ? JSON.stringify(validatedData.skills) : undefined,
        industries: validatedData.industries !== undefined ? JSON.stringify(validatedData.industries) : undefined
      }
    });

    // Log telemetry event
    console.log(`TELEMETRY: radar_rule_updated`, {
      userId,
      ruleId: updatedRule.id,
      ruleName: updatedRule.name,
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      data: {
        id: updatedRule.id,
        name: updatedRule.name,
        location: updatedRule.location,
        employmentType: updatedRule.employmentType,
        salaryMin: updatedRule.salaryMin,
        salaryMax: updatedRule.salaryMax,
        skills: updatedRule.skills ? JSON.parse(updatedRule.skills) : [],
        industries: updatedRule.industries ? JSON.parse(updatedRule.industries) : [],
        keywords: updatedRule.keywords,
        matchScore: updatedRule.matchScore,
        isActive: updatedRule.isActive,
        updatedAt: updatedRule.updatedAt
      }
    });

  } catch (error) {
    console.error('Error updating radar rule:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation error',
        details: error.errors
      });
    }

    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to update radar rule'
    });
  }
});

/**
 * DELETE /v1/radar/rules/:id
 * Delete a radar rule
 */
router.delete('/rules/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Verify rule ownership
    const existingRule = await prisma.radarRule.findUnique({
      where: { id }
    });

    if (!existingRule) {
      return res.status(404).json({ error: 'Radar rule not found' });
    }

    if (existingRule.userId !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Delete related data
    await prisma.radarMatch.deleteMany({
      where: { radarRuleId: id }
    });

    await prisma.radarNotification.deleteMany({
      where: { radarRuleId: id }
    });

    await prisma.radarRule.delete({
      where: { id }
    });

    // Log telemetry event
    console.log(`TELEMETRY: radar_rule_deleted`, {
      userId,
      ruleId: existingRule.id,
      ruleName: existingRule.name,
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      message: 'Radar rule deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting radar rule:', error);
    res.status(500).json({
      error: 'internal server error',
      message: 'Failed to delete radar rule'
    });
  }
});

/**
 * GET /v1/radar/matches
 * Get radar matches for user
 */
router.get('/matches', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const validatedQuery = listMatchesSchema.parse(req.query);
    const { page, pageSize, minScore } = validatedQuery;
    const skip = (page - 1) * pageSize;

    // Get active radar rules for this user
    const radarRules = await prisma.radarRule.findMany({
      where: {
        userId,
        isActive: true
      }
    });

    if (radarRules.length === 0) {
      return res.json({
        success: true,
        data: {
          matches: [],
          pagination: {
            page,
            pageSize,
            total: 0,
            totalPages: 0,
            hasNext: false,
            hasPrev: false
          }
        }
      });
    }

    // Get cached matches that haven't expired
    const now = new Date();
    const [matches, total] = await Promise.all([
      prisma.radarMatch.findMany({
        where: {
          userId,
          matchScore: {
            gte: minScore
          },
          expiresAt: {
            gt: now
          }
        },
        include: {
          job: {
            include: {
              user: {
                select: {
                  name: true,
                  companyProfile: {
                    select: {
                      companyName: true,
                      logo: true,
                      industry: true,
                      location: true
                    }
                  }
                }
              },
              skills: {
                include: {
                  skill: {
                    select: {
                      name: true,
                      category: true
                    }
                  }
                }
              }
            }
          },
          radarRule: {
            select: {
              id: true,
              name: true
            }
          }
        },
        orderBy: {
          matchScore: 'desc',
          createdAt: 'desc'
        },
        skip,
        take: pageSize
      }),
      prisma.radarMatch.count({
        where: {
          userId,
          matchScore: {
            gte: minScore
          },
          expiresAt: {
            gt: now
          }
        }
      })
    ]);

    const formattedMatches = matches.map(match => ({
      id: match.id,
      matchScore: match.matchScore,
      matchedSkills: match.matchedSkills ? JSON.parse(match.matchedSkills) : [],
      matchedLocation: match.matchedLocation,
      matchedSalary: match.matchedSalary,
      matchedKeywords: match.matchedKeywords,
      createdAt: match.createdAt,
      expiresAt: match.expiresAt,
      job: {
        id: match.job.id,
        title: match.job.title,
        description: match.job.description,
        location: match.job.location,
        employmentType: match.job.employmentType,
        salaryMin: match.job.salaryMin,
        salaryMax: match.job.salaryMax,
        status: match.job.status,
        createdAt: match.job.createdAt,
        company: match.job.user.companyProfile ? {
          name: match.job.user.companyProfile.companyName,
          logo: match.job.user.companyProfile.logo,
          industry: match.job.user.companyProfile.industry,
          location: match.job.user.companyProfile.location
        } : {
          name: match.job.user.name || 'Unknown Company'
        },
        skills: match.job.skills.map(js => ({
          id: js.skill.id,
          name: js.skill.name,
          category: js.skill.category
        }))
      },
      radarRule: {
        id: match.radarRule.id,
        name: match.radarRule.name
      }
    }));

    res.json({
      success: true,
      data: {
        matches: formattedMatches,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
          hasNext: page * pageSize < total,
          hasPrev: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Error fetching radar matches:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch radar matches'
    });
  }
});

/**
 * GET /v1/radar/notifications
 * Get radar notifications for user
 */
router.get('/notifications', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const notifications = await prisma.radarNotification.findMany({
      where: { userId },
      include: {
        radarRule: {
          select: {
            id: true,
            name: true
          }
        },
        job: {
          select: {
            id: true,
            title: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 50
    });

    const formattedNotifications = notifications.map(notification => ({
      id: notification.id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      actionUrl: notification.actionUrl,
      isRead: notification.isRead,
      createdAt: notification.createdAt,
      radarRule: {
        id: notification.radarRule.id,
        name: notification.radarRule.name
      },
      job: {
        id: notification.job.id,
        title: notification.job.title
      }
    }));

    res.json({
      success: true,
      data: formattedNotifications
    });

  } catch (error) {
    console.error('Error fetching radar notifications:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch radar notifications'
    });
  }
});

/**
 * POST /v1/radar/rules/:id/test
 * Test a radar rule against current jobs
 */
router.post('/rules/:id/test', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Verify rule ownership
    const radarRule = await prisma.radarRule.findUnique({
      where: { id }
    });

    if (!radarRule || radarRule.userId !== userId) {
      return res.status(404).json({ error: 'Radar rule not found' });
    }

    // Get active jobs for testing
    const activeJobs = await prisma.job.findMany({
      where: {
        status: 'ACTIVE'
      },
      include: {
        user: {
          select: {
            name: true,
            companyProfile: {
              select: {
                companyName: true,
                logo: true,
                industry: true,
                location: true
              }
            }
          }
        },
        skills: {
          include: {
            skill: {
              select: {
                name: true,
                category: true
              }
            }
          }
        }
      },
      take: 10 // Limit test results
    });

    // Simple matching algorithm
    const testResults = activeJobs.map(job => {
      let score = 0;
      let matchedSkills: string[] = [];
      let matchedLocation = false;
      let matchedSalary = false;
      let matchedKeywords = false;

      // Location matching
      if (radarRule.location && job.location.toLowerCase().includes(radarRule.location.toLowerCase())) {
        score += 0.2;
        matchedLocation = true;
      }

      // Employment type matching
      if (radarRule.employmentType && job.employmentType === radarRule.employmentType) {
        score += 0.2;
      }

      // Salary range matching
      if (radarRule.salaryMin && radarRule.salaryMax) {
        if (job.salaryMin >= radarRule.salaryMin && job.salaryMax <= radarRule.salaryMax) {
          score += 0.2;
          matchedSalary = true;
        }
      }

      // Skills matching
      if (radarRule.skills && job.skills.length > 0) {
        const ruleSkills = radarRule.skills;
        const jobSkills = job.skills.map(js => js.skill.name);
        const commonSkills = ruleSkills.filter(skill => jobSkills.includes(skill));
        score += (commonSkills.length / Math.max(ruleSkills.length, jobSkills.length)) * 0.3;
        if (commonSkills.length > 0) {
          matchedSkills = commonSkills;
        }
      }

      // Keywords matching
      if (radarRule.keywords && job.description) {
        const keywords = radarRule.keywords.toLowerCase().split(' ');
        const description = job.description.toLowerCase();
        const matchedKeywordCount = keywords.filter(keyword => description.includes(keyword)).length;
        if (matchedKeywordCount > 0) {
          score += (matchedKeywordCount / keywords.length) * 0.1;
          matchedKeywords = true;
        }
      }

      return {
        jobId: job.id,
        title: job.title,
        score: Math.min(score, 1.0),
        matchedSkills,
        matchedLocation,
        matchedSalary,
        matchedKeywords,
        company: job.user.companyProfile ? {
          name: job.user.companyProfile.companyName,
          logo: job.user.companyProfile.logo,
          industry: job.user.companyProfile.industry,
          location: job.user.companyProfile.location
        } : {
          name: job.user.name || 'Unknown Company'
        }
      };
    }).filter(result => result.score >= radarRule.matchScore);

    res.json({
      success: true,
      data: {
        ruleId: radarRule.id,
        ruleName: radarRule.name,
        matchScore: radarRule.matchScore,
        testResults,
        totalJobs: activeJobs.length,
        matchingJobs: testResults.length,
        averageScore: testResults.length > 0 ? testResults.reduce((sum, result) => sum + result.score, 0) / testResults.length : 0
      }
    });

  } catch (error) {
    console.error('Error testing radar rule:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to test radar rule'
    });
  }
});

/**
 * GET /v1/radar/digest
 * Get radar digest for user
 */
router.get('/digest', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD format

    // Get or create today's digest
    let digest = await prisma.radarDigest.findUnique({
      where: {
        userId,
        date: todayStr
      }
    });

    if (!digest) {
      // Create empty digest for today
      digest = await prisma.radarDigest.create({
        data: {
          userId,
          date: todayStr
        }
      });
    }

    // Get recent matches for digest
    const now = new Date();
    const recentMatches = await prisma.radarMatch.findMany({
      where: {
        userId,
        expiresAt: {
          gt: now
        }
      },
      include: {
        job: {
          select: {
            id: true,
            title: true,
            location: job.location,
            salaryMin: job.salaryMin,
            salaryMax: job.salaryMax
          }
        },
        radarRule: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: {
        matchScore: 'desc'
      },
      take: 5
    });

    // Update digest with current data
    const totalMatches = await prisma.radarMatch.count({
      where: {
        userId,
        expiresAt: {
          gt: now
        }
      }
    });

    const newMatchesCount = await prisma.radarMatch.count({
      where: {
        userId,
        createdAt: {
          gte: today,
        lt: now
        }
      }
    });

    const updatedDigest = await prisma.radarDigest.update({
      where: { id: digest.id },
      data: {
        totalMatches,
        newMatches: newMatchesCount,
        updatedMatches: totalMatches - newMatchesCount,
        sampleJobs: recentMatches.map(match => ({
          jobId: match.job.id,
          title: match.job.title,
          company: match.job.user.companyProfile?.companyName || 'Unknown Company',
          matchScore: match.matchScore,
          radarRule: match.radarRule.name
        }))
      }
    });

    // Mark digest as sent
    if (!digest.sentAt) {
      await prisma.radarDigest.update({
        where: { id: digest.id },
        data: {
          sentAt: new Date()
        }
      });
    }

    // Log telemetry event
    console.log(`TELEMETRY: radar_digest_generated`, {
      userId,
      digestId: updatedDigest.id,
      date: todayStr,
      totalMatches,
      newMatches: newMatchesCount,
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      data: {
        id: updatedDigest.id,
        date: updatedDigest.date,
        totalMatches: updatedDigest.totalMatches,
        newMatches: updatedDigest.newMatches,
        updatedMatches: updatedDigest.updatedMatches,
        sampleJobs: updatedDigest.sampleJobs,
        sentAt: updatedDigest.sentAt,
        isRead: updatedDigest.isRead
      }
    });

  } catch (error) {
    console.error('Error fetching radar digest:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch radar digest'
    });
  }
});

/**
 * PATCH /v1/radar/digest/:id/read
 * Mark digest as read
 */
router.patch('/digest/:id/read', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Verify digest ownership
    const digest = await prisma.radarDigest.findUnique({
      where: { id }
    });

    if (!digest || digest.userId !== userId) {
      return res.status(404).json({ error: 'Digest not found' });
    }

    const updatedDigest = await prisma.radarDigest.update({
      where: { id },
      data: {
        isRead: true
      }
    });

    res.json({
      success: true,
      data: {
        id: updatedDigest.id,
        isRead: updatedDigest.isRead
      }
    });

  } catch (error) {
    console.error('Error marking digest as read:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to mark digest as read'
    });
  }
});

export default router;
