/**
 * Saved Jobs Routes
 * 
 * Handles saving and unsaving jobs for users
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/database';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';

const router = Router();

// Validation schemas
const saveJobSchema = z.object({
  jobId: z.string().min(1, 'Job ID is required')
});

const listSavedJobsSchema = z.object({
  page: z.string().optional().transform(val => val ? parseInt(val) : 1),
  pageSize: z.string().optional().transform(val => val ? parseInt(val) : 20),
  sortBy: z.enum(['savedAt', 'title', 'company']).optional().default('savedAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc')
});

/**
 * POST /v1/saved-jobs
 * Save a job for the current user
 */
router.post('/', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const validatedData = saveJobSchema.parse(req.body);

    // Check if job exists
    const job = await prisma.job.findUnique({
      where: { id: validatedData.jobId },
      select: { id: true, title: true, status: true }
    });

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    if (job.status !== 'ACTIVE') {
      return res.status(400).json({ error: 'Cannot save inactive job' });
    }

    // Check if already saved
    const existingSaved = await prisma.savedJob.findUnique({
      where: {
        userId_jobId: {
          userId,
          jobId: validatedData.jobId
        }
      }
    });

    if (existingSaved) {
      return res.status(409).json({ error: 'Job already saved' });
    }

    // Save the job
    const savedJob = await prisma.savedJob.create({
      data: {
        userId,
        jobId: validatedData.jobId
      },
      include: {
        job: {
          include: {
            user: {
              select: {
                name: true,
                companyProfile: {
                  select: {
                    companyName: true
                  }
                }
              }
            }
          }
        }
      }
    });

    // Log telemetry event
    console.log(`TELEMETRY: job_saved`, {
      userId,
      jobId: validatedData.jobId,
      jobTitle: job.title,
      timestamp: new Date().toISOString()
    });

    res.status(201).json({
      success: true,
      data: {
        id: savedJob.id,
        jobId: savedJob.jobId,
        savedAt: savedJob.savedAt,
        job: savedJob.job
      }
    });

  } catch (error) {
    console.error('Error saving job:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation error',
        details: error.errors
      });
    }

    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to save job'
    });
  }
});

/**
 * DELETE /v1/saved-jobs/:jobId
 * Unsave a job for the current user
 */
router.delete('/:jobId', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { jobId } = req.params;

    // Check if saved job exists
    const savedJob = await prisma.savedJob.findUnique({
      where: {
        userId_jobId: {
          userId,
          jobId
        }
      }
    });

    if (!savedJob) {
      return res.status(404).json({ error: 'Saved job not found' });
    }

    // Delete the saved job
    await prisma.savedJob.delete({
      where: {
        userId_jobId: {
          userId,
          jobId
        }
      }
    });

    // Log telemetry event
    console.log(`TELEMETRY: job_unsaved`, {
      userId,
      jobId,
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      message: 'Job unsaved successfully'
    });

  } catch (error) {
    console.error('Error unsaving job:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to unsave job'
    });
  }
});

/**
 * GET /v1/saved-jobs
 * Get user's saved jobs with pagination
 */
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const validatedQuery = listSavedJobsSchema.parse(req.query);
    const { page, pageSize, sortBy, sortOrder } = validatedQuery;
    const skip = (page - 1) * pageSize;

    // Get saved jobs with job details
    const [savedJobs, total] = await Promise.all([
      prisma.savedJob.findMany({
        where: { userId },
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
          }
        },
        orderBy: {
          [sortBy]: sortOrder
        },
        skip,
        take: pageSize
      }),
      prisma.savedJob.count({
        where: { userId }
      })
    ]);

    // Format response
    const formattedJobs = savedJobs.map(saved => ({
      id: saved.id,
      savedAt: saved.savedAt,
      job: {
        id: saved.job.id,
        title: saved.job.title,
        description: saved.job.description,
        location: saved.job.location,
        employmentType: saved.job.employmentType,
        salaryMin: saved.job.salaryMin,
        salaryMax: saved.job.salaryMax,
        status: saved.job.status,
        createdAt: saved.job.createdAt,
        updatedAt: saved.job.updatedAt,
        company: saved.job.user.companyProfile ? {
          name: saved.job.user.companyProfile.companyName,
          logo: saved.job.user.companyProfile.logo,
          industry: saved.job.user.companyProfile.industry,
          location: saved.job.user.companyProfile.location
        } : {
          name: saved.job.user.name || 'Unknown Company'
        },
        skills: saved.job.skills.map(js => ({
          id: js.skill.id,
          name: js.skill.name,
          category: js.skill.category
        }))
      }
    }));

    res.json({
      success: true,
      data: {
        jobs: formattedJobs,
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
    console.error('Error fetching saved jobs:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch saved jobs'
    });
  }
});

/**
 * GET /v1/saved-jobs/:jobId/check
 * Check if a job is saved by the current user
 */
router.get('/:jobId/check', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { jobId } = req.params;

    const savedJob = await prisma.savedJob.findUnique({
      where: {
        userId_jobId: {
          userId,
          jobId
        }
      },
      select: { id: true, savedAt: true }
    });

    res.json({
      success: true,
      data: {
        isSaved: !!savedJob,
        savedAt: savedJob?.savedAt || null
      }
    });

  } catch (error) {
    console.error('Error checking saved job:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to check saved job status'
    });
  }
});

export default router;
