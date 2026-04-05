/**
 * Admin Job Management Routes
 * 
 * Administrative endpoints for job management, moderation, and analytics
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/database';
import { authenticate, authorize } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';

const router = Router();

// Validation schemas
const bulkActionSchema = z.object({
  jobIds: z.array(z.string()),
  action: z.enum(['suspend', 'activate', 'delete', 'feature', 'unfeature'])
});

const jobActionSchema = z.object({
  action: z.enum(['suspend', 'activate', 'delete', 'feature', 'unfeature'])
});

const listJobsSchema = z.object({
  page: z.string().optional().transform(val => val ? parseInt(val) : 1),
  limit: z.string().optional().transform(val => val ? parseInt(val) : 20),
  search: z.string().optional(),
  status: z.string().optional(),
  type: z.string().optional(),
  sortBy: z.string().optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc')
});

/**
 * GET /v1/admin/jobs/stats
 * Get job statistics for admin dashboard
 */
router.get('/stats', authenticate, authorize(['ADMIN', 'SUPER_ADMIN']), async (req: Request, res: Response) => {
  try {
    const [
      totalJobs,
      activeJobs,
      draftJobs,
      closedJobs,
      suspendedJobs,
      featuredJobs,
      urgentJobs,
      totalApplications,
      totalViews,
      avgSalary,
      popularLocations,
      popularTypes
    ] = await Promise.all([
      // Total jobs
      prisma.job.count(),
      // Active jobs
      prisma.job.count({ where: { status: 'ACTIVE' } }),
      // Draft jobs
      prisma.job.count({ where: { status: 'DRAFT' } }),
      // Closed jobs
      prisma.job.count({ where: { status: 'CLOSED' } }),
      // Suspended jobs
      prisma.job.count({ where: { status: 'SUSPENDED' } }),
      // Featured jobs
      prisma.job.count({ where: { isFeatured: true } }),
      // Urgent jobs
      prisma.job.count({ where: { isUrgent: true } }),
      // Total applications
      prisma.jobApplication.count(),
      // Total views (from job performance)
      prisma.jobPerformance.aggregate({
        _sum: { views: true }
      }),
      // Average salary
      prisma.job.aggregate({
        where: {
          salaryMin: { not: null },
          salaryMax: { not: null }
        },
        _avg: { salaryMin: true }
      }),
      // Popular locations
      prisma.job.groupBy({
        by: ['location'],
        where: { status: 'ACTIVE' },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 10
      }),
      // Popular employment types
      prisma.job.groupBy({
        by: ['employmentType'],
        where: { status: 'ACTIVE' },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } }
      })
    ]);

    const stats = {
      totalJobs,
      activeJobs,
      draftJobs,
      closedJobs,
      suspendedJobs,
      featuredJobs,
      urgentJobs,
      totalApplications,
      totalViews: totalViews._sum.views || 0,
      avgSalary: avgSalary._avg.salaryMin || 0,
      popularLocations: popularLocations.map(item => ({
        location: item.location,
        count: item._count.id
      })),
      popularTypes: popularTypes.map(item => ({
        type: item.employmentType,
        count: item._count.id
      }))
    };

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Error fetching job stats:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch job statistics'
    });
  }
});

/**
 * GET /v1/admin/jobs
 * Get all jobs with admin-level access and filtering
 */
router.get('/', authenticate, authorize(['ADMIN', 'SUPER_ADMIN']), async (req: Request, res: Response) => {
  try {
    const validatedQuery = listJobsSchema.parse(req.query);
    const { page, limit, search, status, type, sortBy, sortOrder } = validatedQuery;
    const skip = (page - 1) * limit;

    // Build where clause
    let whereClause: any = {};

    if (status) {
      whereClause.status = status;
    }

    if (type) {
      whereClause.employmentType = type;
    }

    if (search) {
      whereClause.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { location: { contains: search, mode: 'insensitive' } },
        {
          user: {
            companyProfile: {
              companyName: { contains: search, mode: 'insensitive' }
            }
          }
        }
      ];
    }

    const [jobs, total] = await Promise.all([
      prisma.job.findMany({
        where: whereClause,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              companyProfile: {
                select: {
                  companyName: true,
                  logo: true,
                  industry: true,
                  verified: true
                }
              }
            }
          },
          skills: {
            include: {
              skill: {
                select: {
                  id: true,
                  name: true,
                  category: true
                }
              }
            }
          },
          _count: {
            applications: true
          },
          orderBy: {
            [sortBy]: sortOrder
          },
          skip,
          take: limit
        }),
      prisma.job.count({ where: whereClause })
    ]);

    // Add view counts from job performance
    const jobIds = jobs.map(job => job.id);
    const viewCounts = await prisma.jobPerformance.findMany({
      where: { jobId: { in: jobIds } },
      select: { jobId: true, views: true }
    });

    const viewCountMap = viewCounts.reduce((acc, item) => {
      acc[item.jobId] = item.views;
      return acc;
    }, {} as Record<string, number>);

    // Add application counts
    const applicationCounts = await prisma.jobApplication.groupBy({
      by: ['jobId'],
      where: { jobId: { in: jobIds } },
      _count: { id: true }
    });

    const applicationCountMap = applicationCounts.reduce((acc, item) => {
      acc[item.jobId] = item._count.id;
      return acc;
    }, {} as Record<string, number>);

    const formattedJobs = jobs.map(job => ({
      id: job.id,
      title: job.title,
      description: job.description,
      location: job.location,
      employmentType: job.employmentType,
      salaryMin: job.salaryMin,
      salaryMax: job.salaryMax,
      status: job.status,
      userId: job.userId,
      user: job.user,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
      expiresAt: job.expiresAt,
      applicationCount: applicationCountMap[job.id] || 0,
      viewCount: viewCountMap[job.id] || 0,
      isFeatured: job.isFeatured,
      isUrgent: job.isUrgent,
      tags: job.tags || [],
      skills: job.skills
    }));

    res.json({
      success: true,
      data: {
        jobs: formattedJobs,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: page * limit < total,
          hasPrev: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Error fetching admin jobs:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch jobs'
    });
  }
});

/**
 * POST /v1/admin/jobs/bulk
 * Perform bulk actions on multiple jobs
 */
router.post('/bulk', authenticate, authorize(['ADMIN', 'SUPER_ADMIN']), async (req: Request, res: Response) => {
  try {
    const validatedData = bulkActionSchema.parse(req.body);
    const { jobIds, action } = validatedData;

    let updateData: any = {};
    let successCount = 0;

    switch (action) {
      case 'suspend':
        updateData = { status: 'SUSPENDED' };
        break;
      case 'activate':
        updateData = { status: 'ACTIVE' };
        break;
      case 'delete':
        // For delete, we'll handle separately
        break;
      case 'feature':
        updateData = { isFeatured: true };
        break;
      case 'unfeature':
        updateData = { isFeatured: false };
        break;
    }

    if (action === 'delete') {
      // Delete jobs and related data
      const result = await prisma.job.deleteMany({
        where: { id: { in: jobIds } }
      });
      successCount = result.count;
    } else {
      // Update jobs
      const result = await prisma.job.updateMany({
        where: { id: { in: jobIds } },
        data: updateData
      });
      successCount = result.count;
    }

    // Log telemetry event
    console.log(`TELEMETRY: admin_bulk_job_action`, {
      action,
      jobCount: jobIds.length,
      successCount,
      performedBy: req.user?.id,
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      data: {
        action,
        affectedJobs: successCount,
        requestedJobs: jobIds.length
      }
    });

  } catch (error) {
    console.error('Error performing bulk job action:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to perform bulk action'
    });
  }
});

/**
 * PATCH /v1/admin/jobs/:id
 * Perform individual job actions
 */
router.patch('/:id', authenticate, authorize(['ADMIN', 'SUPER_ADMIN']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const validatedData = jobActionSchema.parse(req.body);
    const { action } = validatedData;

    let updateData: any = {};

    switch (action) {
      case 'suspend':
        updateData = { status: 'SUSPENDED' };
        break;
      case 'activate':
        updateData = { status: 'ACTIVE' };
        break;
      case 'delete':
        // Handle delete separately
        break;
      case 'feature':
        updateData = { isFeatured: true };
        break;
      case 'unfeature':
        updateData = { isFeatured: false };
        break;
    }

    let result;
    if (action === 'delete') {
      result = await prisma.job.delete({
        where: { id }
      });
    } else {
      result = await prisma.job.update({
        where: { id },
        data: updateData
      });
    }

    // Log telemetry event
    console.log(`TELEMETRY: admin_job_action`, {
      jobId: id,
      action,
      performedBy: req.user?.id,
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Error performing job action:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to perform job action'
    });
  }
});

/**
 * GET /v1/admin/jobs/:id/analytics
 * Get detailed analytics for a specific job
 */
router.get('/:id/analytics', authenticate, authorize(['ADMIN', 'SUPER_ADMIN']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Get job details
    const job = await prisma.job.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            companyProfile: {
              select: {
                companyName: true,
                industry: true,
                location: true
              }
            }
          }
        }
      }
    });

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    // Get analytics data
    const [
      applicationStats,
      viewStats,
      applicationStatusBreakdown,
      dailyApplications,
      dailyViews
    ] = await Promise.all([
      // Application statistics
      prisma.jobApplication.groupBy({
        by: ['status'],
        where: { jobId: id },
        _count: { id: true }
      }),
      // View statistics
      prisma.jobPerformance.findUnique({
        where: { jobId: id },
        select: { views: true, clickThroughRate: true }
      }),
      // Application status breakdown
      prisma.jobApplication.groupBy({
        by: ['status'],
        where: { jobId: id },
        _count: { id: true }
      }),
      // Daily applications (last 30 days)
      prisma.$queryRaw`
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as count
        FROM job_applications 
        WHERE job_id = ${id}
          AND created_at >= NOW() - INTERVAL '30 days'
        GROUP BY DATE(created_at)
        ORDER BY date DESC
      `,
      // Daily views (last 30 days)
      prisma.$queryRaw`
        SELECT 
          DATE(created_at) as date,
          SUM(views) as count
        FROM job_performance 
        WHERE job_id = ${id}
          AND created_at >= NOW() - INTERVAL '30 days'
        GROUP BY DATE(created_at)
        ORDER BY date DESC
      `
    ]);

    const analytics = {
      job: {
        id: job.id,
        title: job.title,
        company: job.user.companyProfile?.companyName || 'N/A',
        industry: job.user.companyProfile?.industry || 'N/A',
        location: job.location,
        employmentType: job.employmentType,
        salaryMin: job.salaryMin,
        salaryMax: job.salaryMax,
        status: job.status,
        createdAt: job.createdAt,
        isFeatured: job.isFeatured,
        isUrgent: job.isUrgent
      },
      applications: {
        total: applicationStats.reduce((sum, stat) => sum + stat._count.id, 0),
        byStatus: applicationStats.reduce((acc, stat) => {
          acc[stat.status] = stat._count.id;
          return acc;
        }, {} as Record<string, number>),
        daily: dailyApplications
      },
      views: {
        total: viewStats?.views || 0,
        clickThroughRate: viewStats?.clickThroughRate || 0,
        daily: dailyViews
      },
      conversionRate: viewStats?.views ? 
        (applicationStats.reduce((sum, stat) => sum + stat._count.id, 0) / viewStats.views * 100) : 0
    };

    res.json({
      success: true,
      data: analytics
    });

  } catch (error) {
    console.error('Error fetching job analytics:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch job analytics'
    });
  }
});

/**
 * GET /v1/admin/jobs/reports
 * Get jobs that need attention (flagged, reported, etc.)
 */
router.get('/reports', authenticate, authorize(['ADMIN', 'SUPER_ADMIN']), async (req: Request, res: Response) => {
  try {
    // Get jobs with issues
    const [
      suspendedJobs,
      expiredJobs,
      jobsWithHighApplications,
      jobsWithNoApplications,
      flaggedJobs
    ] = await Promise.all([
      // Suspended jobs
      prisma.job.findMany({
        where: { status: 'SUSPENDED' },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              companyProfile: {
                select: { companyName: true }
              }
            }
          }
        },
        take: 10,
        orderBy: { updatedAt: 'desc' }
      }),
      // Expired jobs
      prisma.job.findMany({
        where: {
          expiresAt: { lt: new Date() },
          status: 'ACTIVE'
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              companyProfile: {
                select: { companyName: true }
              }
            }
          }
        },
        take: 10,
        orderBy: { expiresAt: 'asc' }
      }),
      // Jobs with high application count (potential spam)
      prisma.job.findMany({
        where: {
          status: 'ACTIVE'
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              companyProfile: {
                select: { companyName: true }
              }
            }
          },
          _count: {
            applications: true
          }
        },
        orderBy: {
          applications: {
            _count: 'desc'
          }
        },
        take: 10
      }),
      // Jobs with no applications for a while
      prisma.job.findMany({
        where: {
          status: 'ACTIVE',
          createdAt: {
            lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // 30 days ago
          }
        },
        include: [
          {
            user: {
              select: {
                id: true,
                email: true,
                companyProfile: {
                  select: { companyName: true }
                }
              }
            }
          },
          {
            applications: {
              select: {
                id: true
              },
              where: {
                createdAt: {
                  gt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
                }
              }
            }
          }
        ],
        having: {
          applications: {
            every: {
              applications: {
                equals: []
              }
            }
          }
        },
        take: 10,
        orderBy: { createdAt: 'asc' }
      })
    ]);

    // Filter jobs with no applications
    const jobsWithNoApplications = expiredJobs.filter(job => job.applications.length === 0);

    const reports = {
      suspendedJobs: suspendedJobs.map(job => ({
        id: job.id,
        title: job.title,
        company: job.user.companyProfile?.companyName || 'N/A',
        email: job.user.email,
        issue: 'suspended',
        date: job.updatedAt
      })),
      expiredJobs: expiredJobs.map(job => ({
        id: job.id,
        title: job.title,
        company: job.user.companyProfile?.companyName || 'N/A',
        email: job.user.email,
        issue: 'expired',
        date: job.expiresAt
      })),
      highApplicationJobs: jobsWithHighApplications
        .filter(job => job._count.applications > 100)
        .map(job => ({
          id: job.id,
          title: job.title,
          company: job.user.companyProfile?.companyName || 'N/A',
          email: job.user.email,
          issue: 'high_applications',
          applicationCount: job._count.applications,
          date: job.createdAt
        })),
      noApplicationJobs: jobsWithNoApplications.map(job => ({
        id: job.id,
        title: job.title,
        company: job.user.companyProfile?.companyName || 'N/A',
        email: job.user.email,
        issue: 'no_applications',
        daysSinceCreation: Math.floor((Date.now() - new Date(job.createdAt).getTime()) / (1000 * 60 * 60 * 24)),
        date: job.createdAt
      }))
    };

    res.json({
      success: true,
      data: reports
    });

  } catch (error) {
    console.error('Error fetching job reports:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch job reports'
    });
  }
});

export default router;
