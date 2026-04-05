/**
 * Employer Applications Routes
 * 
 * Employer-specific endpoints for managing applications to their jobs
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/database';
import { authenticate, authorize } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';

const router = Router();

// Validation schemas
const updateStatusSchema = z.object({
  status: z.enum(['SUBMITTED', 'VIEWED', 'SHORTLISTED', 'INTERVIEW', 'OFFERED', 'HIRED', 'REJECTED']),
  scheduledAt: z.string().datetime().optional(),
  notes: z.string().max(1000).optional()
});

const listApplicationsSchema = z.object({
  page: z.string().optional().transform(val => val ? parseInt(val) : 1),
  pageSize: z.string().optional().transform(val => val ? parseInt(val) : 20),
  status: z.enum(['SUBMITTED', 'VIEWED', 'SHORTLISTED', 'INTERVIEW', 'OFFERED', 'HIRED', 'REJECTED']).optional(),
  sortBy: z.enum(['createdAt', 'status', 'scheduledAt', 'updatedAt']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc')
});

/**
 * GET /v1/employer/applications
 * Get applications for employer's jobs
 */
router.get('/', authenticate, authorize(['COMPANY', 'ADMIN']), async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.userType;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const validatedQuery = listApplicationsSchema.parse(req.query);
    const { page, pageSize, status, sortBy, sortOrder } = validatedQuery;
    const skip = (page - 1) * pageSize;

    // Build where clause
    let whereClause: any = {};

    if (userRole === 'COMPANY') {
      // Employers can only see applications to their own jobs
      whereClause = {
        job: {
          userId
        }
      };
    } else {
      // Admin can see all applications
      whereClause = {};
    }

    if (status) {
      whereClause.status = status;
    }

    const [applications, total] = await Promise.all([
      prisma.jobApplication.findMany({
        where: whereClause,
        include: {
          job: {
            include: {
              user: {
                select: {
                  name: true,
                  companyProfile: {
                    select: {
                      companyName: true,
                      logo: true
                    }
                  }
                }
              }
            }
          },
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              name: true,
              avatarUrl: true
            }
          },
          resume: {
            select: {
              id: true,
              filename: true,
              url: true,
              uploadedAt: true
            }
          }
        },
        orderBy: {
          [sortBy]: sortOrder
        },
        skip,
        take: pageSize
      }),
      prisma.jobApplication.count({
        where: whereClause
      })
    ]);

    // Format response
    const formattedApplications = applications.map(app => ({
      id: app.id,
      status: app.status,
      coverLetter: app.coverLetter,
      scheduledAt: app.scheduledAt,
      createdAt: app.createdAt,
      updatedAt: app.updatedAt,
      job: {
        id: app.job.id,
        title: app.job.title,
        location: app.job.location,
        employmentType: app.job.employmentType,
        salaryMin: app.job.salaryMin,
        salaryMax: app.job.salaryMax,
        company: app.job.user.companyProfile ? {
          name: app.job.user.companyProfile.companyName,
          logo: app.job.user.companyProfile.logo
        } : {
          name: app.job.user.name || 'Unknown Company'
        }
      },
      applicant: {
        id: app.user.id,
        name: app.user.name || `${app.user.firstName} ${app.user.lastName}`.trim(),
        email: app.user.email,
        avatar: app.user.avatarUrl
      },
      resume: app.resume ? {
        id: app.resume.id,
        filename: app.resume.filename,
        url: app.resume.url,
        uploadedAt: app.resume.uploadedAt
      } : null
    }));

    res.json({
      success: true,
      data: {
        applications: formattedApplications,
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
    console.error('Error fetching employer applications:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch applications'
    });
  }
});

/**
 * GET /v1/employer/applications/:jobId
 * Get applications for a specific job
 */
router.get('/:jobId', authenticate, authorize(['COMPANY', 'ADMIN']), async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.userType;
    const { jobId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Verify job ownership (for COMPANY role)
    if (userRole === 'COMPANY') {
      const job = await prisma.job.findUnique({
        where: { id: jobId },
        select: { userId: true }
      });

      if (!job || job.userId !== userId) {
        return res.status(403).json({ error: 'Forbidden' });
      }
    }

    const applications = await prisma.jobApplication.findMany({
      where: { jobId },
      include: {
        job: {
          include: {
            user: {
              select: {
                name: true,
                companyProfile: {
                  select: {
                    companyName: true,
                    logo: true
                  }
                }
              }
            }
          }
        },
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            name: true,
            avatarUrl: true
          }
        },
        resume: {
          select: {
            id: true,
            filename: true,
            url: true,
            uploadedAt: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    const formattedApplications = applications.map(app => ({
      id: app.id,
      status: app.status,
      coverLetter: app.coverLetter,
      scheduledAt: app.scheduledAt,
      createdAt: app.createdAt,
      updatedAt: app.updatedAt,
      job: {
        id: app.job.id,
        title: app.job.title,
        company: app.job.user.companyProfile ? {
          name: app.job.user.companyProfile.companyName,
          logo: app.job.user.companyProfile.logo
        } : {
          name: app.job.user.name || 'Unknown Company'
        }
      },
      applicant: {
        id: app.user.id,
        name: app.user.name || `${app.user.firstName} ${app.user.lastName}`.trim(),
        email: app.user.email,
        avatar: app.user.avatarUrl
      },
      resume: app.resume ? {
        id: app.resume.id,
        filename: app.resume.filename,
        url: app.resume.url,
        uploadedAt: app.resume.uploadedAt
      } : null
    }));

    res.json({
      success: true,
      data: {
        applications: formattedApplications,
        total: formattedApplications.length
      }
    });

  } catch (error) {
    console.error('Error fetching job applications:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch job applications'
    });
  }
});

/**
 * PATCH /v1/employer/applications/:id/status
 * Update application status (employer only)
 */
router.patch('/:id/status', authenticate, authorize(['COMPANY', 'ADMIN']), async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.userType;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const validatedData = updateStatusSchema.parse(req.body);

    // Get the application
    const application = await prisma.jobApplication.findUnique({
      where: { id },
      include: {
        job: {
          select: {
            userId: true,
            title: true
          }
        },
        user: {
          select: {
            id: true,
            email: true,
            name: true
          }
        }
      }
    });

    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    // Verify job ownership (for COMPANY role)
    if (userRole === 'COMPANY' && application.job.userId !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Update the application
    const updatedApplication = await prisma.jobApplication.update({
      where: { id },
      data: {
        status: validatedData.status,
        scheduledAt: validatedData.scheduledAt ? new Date(validatedData.scheduledAt) : undefined,
        updatedAt: new Date()
      },
      include: {
        job: {
          select: {
            id: true,
            title: true
          }
        },
        user: {
          select: {
            id: true,
            email: true,
            name: true
          }
        }
      }
    });

    // Log telemetry event
    console.log(`TELEMETRY: application_status_updated`, {
      applicationId: id,
      jobId: application.jobId,
      userId: application.userId,
      oldStatus: application.status,
      newStatus: validatedData.status,
      updatedBy: userId,
      updatedByRole: userRole,
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      data: {
        id: updatedApplication.id,
        status: updatedApplication.status,
        scheduledAt: updatedApplication.scheduledAt,
        updatedAt: updatedApplication.updatedAt,
        job: {
          id: updatedApplication.job.id,
          title: updatedApplication.job.title
        },
        applicant: {
          id: updatedApplication.user.id,
          name: updatedApplication.user.name,
          email: updatedApplication.user.email
        }
      }
    });

  } catch (error) {
    console.error('Error updating application status:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation error',
        details: error.errors
      });
    }

    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to update application status'
    });
  }
});

/**
 * GET /v1/employer/applications/stats
 * Get application statistics for employer
 */
router.get('/stats', authenticate, authorize(['COMPANY', 'ADMIN']), async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.userType;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Build where clause for employer's jobs
    let jobWhereClause: any = {};
    
    if (userRole === 'COMPANY') {
      jobWhereClause = {
        userId
      };
    }

    // Get application statistics
    const stats = await prisma.jobApplication.groupBy({
      by: ['status'],
      where: {
        job: jobWhereClause
      },
      _count: {
        id: true
      }
    });

    // Get total applications
    const totalApplications = await prisma.jobApplication.count({
      where: {
        job: jobWhereClause
      }
    });

    // Get recent applications
    const recentApplications = await prisma.jobApplication.findMany({
      where: {
        job: jobWhereClause
      },
      include: {
        job: {
          select: {
            title: true
          }
        },
        user: {
          select: {
            name: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 5
    });

    const formattedStats = stats.reduce((acc, stat) => {
      acc[stat.status] = stat._count.id;
      return acc;
    }, {} as Record<string, number>);

    res.json({
      success: true,
      data: {
        totalApplications,
        statusBreakdown: formattedStats,
        recentApplications: recentApplications.map(app => ({
          id: app.id,
          status: app.status,
          jobTitle: app.job.title,
          applicantName: app.user.name,
          createdAt: app.createdAt
        }))
      }
    });

  } catch (error) {
    console.error('Error fetching application stats:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch application statistics'
    });
  }
});

export default router;
