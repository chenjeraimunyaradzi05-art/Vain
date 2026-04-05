// @ts-nocheck
import { Router } from 'express';
import { z } from 'zod';
import { authenticate, authorize } from '../middleware/auth';
import { validateRequest } from '../middleware/validate';
import { submitApplicationSchema, updateApplicationStatusSchema } from '../lib/validation';
import { BadRequestError, NotFoundError, ForbiddenError } from '../lib/errors';
import { notificationService } from '../services/notificationService';
import { queueEmail } from '../lib/emailQueue';

const router = Router();

/**
 * @route GET /applications
 * @desc List applications (with filtering)
 * @access Private
 */
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { prisma } = req.app.locals;
    const userId = req.user!.id;
    const userRole = req.user!.role;
    const {
      page = '1',
      limit = '20',
      status,
      jobId,
      userId: filterUserId,
    } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10)));
    const skip = (pageNum - 1) * limitNum;

    // Build filters based on role
    const where: Record<string, unknown> = {};

    // Non-admin users can only see their own applications
    if (userRole !== 'admin' && userRole !== 'employer') {
      where.userId = userId;
    } else if (filterUserId && typeof filterUserId === 'string') {
      where.userId = filterUserId;
    }

    if (status && typeof status === 'string') {
      where.status = status;
    }

    if (jobId && typeof jobId === 'string') {
      where.jobId = jobId;
    }

    const [applications, total] = await Promise.all([
      prisma.application.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: {
          job: {
            select: {
              id: true,
              title: true,
              company: true,
              location: true,
              type: true,
            },
          },
          user: userRole === 'admin' || userRole === 'employer'
            ? {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                  avatar: true,
                },
              }
            : false,
        },
      }),
      prisma.application.count({ where }),
    ]);

    res.json({
      data: applications,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route POST /applications
 * @desc Create a new application
 * @access Private (Candidates)
 */
router.post('/', authenticate, validateRequest(z.object({ body: submitApplicationSchema })), async (req, res, next) => {
  try {
    const { prisma } = req.app.locals;
    const userId = req.user!.id;
    const { jobId, coverLetter, resumeUrl } = req.body;

    // Check if job exists and is active
    const job = await prisma.job.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      throw new NotFoundError('Job');
    }

    if (!job.isActive) {
      throw new BadRequestError('This job is no longer accepting applications');
    }

    // Check if user already applied
    const existingApplication = await prisma.application.findFirst({
      where: { userId, jobId },
    });

    if (existingApplication) {
      throw new BadRequestError('You have already applied for this job');
    }

    // Create application
    const application = await prisma.application.create({
      data: {
        userId,
        jobId,
        coverLetter,
        resumeUrl,
        status: 'pending',
      },
      include: {
        job: {
          select: {
            id: true,
            title: true,
            company: true,
          },
        },
      },
    });

    // Send notification to employer about new application
    try {
      // Get the employer/company owner for this job
      const job = await prisma.job.findUnique({
        where: { id: jobId },
        include: {
          company: {
            include: {
              members: {
                where: { role: { in: ['owner', 'admin', 'recruiter'] } },
                include: { user: { select: { id: true, email: true, firstName: true } } }
              }
            }
          }
        }
      });

      if (job?.company?.members) {
        const applicant = await prisma.user.findUnique({
          where: { id: userId },
          select: { firstName: true, lastName: true }
        });
        const applicantName = `${applicant?.firstName || ''} ${applicant?.lastName || ''}`.trim() || 'A candidate';

        for (const member of job.company.members) {
          // Send in-app notification
          await notificationService.send({
            userId: member.user.id,
            type: 'JOB_APPLICATION_UPDATE',
            title: 'New Job Application',
            body: `${applicantName} applied for ${job.title}`,
            data: { applicationId: application.id, jobId: job.id },
            actionUrl: `/employer/applications/${application.id}`,
            priority: 'MEDIUM'
          });

          // Queue email notification
          await queueEmail({
            to: member.user.email,
            subject: `New Application: ${job.title}`,
            template: 'new-application',
            templateData: {
              recipientName: member.user.firstName,
              applicantName,
              jobTitle: job.title,
              applicationUrl: `${process.env.WEB_URL || 'https://ngurrapathways.com.au'}/employer/applications/${application.id}`
            },
            userId: member.user.id,
            type: 'JOB_APPLICATION_UPDATE'
          });
        }
      }
    } catch (notifyError) {
      // Log but don't fail the request if notification fails
      console.error('Failed to send application notification:', notifyError);
    }

    res.status(201).json({ data: application });
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /applications/:id
 * @desc Get application by ID
 * @access Private (Owner, Employer, Admin)
 */
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const { prisma } = req.app.locals;
    const { id } = req.params;
    const userId = req.user!.id;
    const userRole = req.user!.role;

    const application = await prisma.application.findUnique({
      where: { id },
      include: {
        job: {
          select: {
            id: true,
            title: true,
            company: true,
            location: true,
            type: true,
            description: true,
          },
        },
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatar: true,
            bio: true,
            skills: true,
          },
        },
      },
    });

    if (!application) {
      throw new NotFoundError('Application');
    }

    // Check access
    const isOwner = application.userId === userId;
    const isAdmin = userRole === 'admin';
    
    // Check if user is the employer for this job
    let isEmployer = false;
    if (userRole === 'employer' && application.job?.company) {
      const companyMember = await prisma.companyMember.findFirst({
        where: {
          companyId: application.job.company.id,
          userId: userId,
          role: { in: ['owner', 'admin', 'recruiter'] }
        }
      });
      isEmployer = !!companyMember;
    }

    if (!isOwner && !isAdmin && !isEmployer) {
      throw new ForbiddenError('You do not have access to this application');
    }

    res.json({ data: application });
  } catch (error) {
    next(error);
  }
});

/**
 * @route PATCH /applications/:id
 * @desc Update application status
 * @access Private (Employer, Admin)
 */
router.patch('/:id', authenticate, validateRequest(z.object({ body: updateApplicationStatusSchema })), async (req, res, next) => {
  try {
    const { prisma } = req.app.locals;
    const { id } = req.params;
    const userId = req.user!.id;
    const userRole = req.user!.role;
    const { status, notes } = req.body;

    const application = await prisma.application.findUnique({
      where: { id },
      include: { job: true },
    });

    if (!application) {
      throw new NotFoundError('Application');
    }

    // Check access - only admin or employer can update status
    const isAdmin = userRole === 'admin';
    const isOwner = application.userId === userId;

    // Check if user is an employer for this job
    let isEmployer = false;
    if (application.job?.companyId) {
      const companyMember = await prisma.companyMember.findFirst({
        where: {
          companyId: application.job.companyId,
          userId: userId,
          role: { in: ['owner', 'admin', 'recruiter'] }
        }
      });
      isEmployer = !!companyMember;
    }

    // Owners can only withdraw, not change status
    if (isOwner && !isAdmin && !isEmployer) {
      if (status && status !== 'withdrawn') {
        throw new ForbiddenError('You can only withdraw your application');
      }
    } else if (!isAdmin && !isEmployer) {
      throw new ForbiddenError('You do not have access to update this application');
    }

    const updateData: Record<string, unknown> = {};
    if (status) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;

    const updatedApplication = await prisma.application.update({
      where: { id },
      data: updateData,
      include: {
        job: {
          select: {
            id: true,
            title: true,
            company: true,
          },
        },
      },
    });

    // Send notification to applicant about status change
    try {
      const statusMessages: Record<string, string> = {
        reviewed: 'Your application has been reviewed',
        shortlisted: 'Great news! You\'ve been shortlisted',
        interview: 'You\'ve been invited for an interview',
        offered: 'Congratulations! You\'ve received a job offer',
        rejected: 'Application update',
        withdrawn: 'Your application has been withdrawn'
      };

      const applicant = await prisma.user.findUnique({
        where: { id: application.userId },
        select: { id: true, email: true, firstName: true }
      });

      if (applicant && status && status !== 'withdrawn') {
        // Determine notification type based on status
        const notificationType = status === 'interview' ? 'INTERVIEW_SCHEDULED' 
          : status === 'offered' ? 'OFFER_RECEIVED' 
          : 'JOB_APPLICATION_UPDATE';

        // Send in-app notification
        await notificationService.send({
          userId: applicant.id,
          type: notificationType,
          title: statusMessages[status] || 'Application Status Update',
          body: `${updatedApplication.job.title} at ${updatedApplication.job.company}`,
          data: { applicationId: id, jobId: application.jobId, status },
          actionUrl: `/applications/${id}`,
          priority: ['shortlisted', 'interview', 'offered'].includes(status) ? 'HIGH' : 'MEDIUM'
        });

        // Queue email notification
        await queueEmail({
          to: applicant.email,
          subject: `${statusMessages[status] || 'Application Update'} - ${updatedApplication.job.title}`,
          template: 'application-status-update',
          templateData: {
            recipientName: applicant.firstName,
            jobTitle: updatedApplication.job.title,
            companyName: updatedApplication.job.company,
            status,
            statusMessage: statusMessages[status],
            applicationUrl: `${process.env.WEB_URL || 'https://ngurrapathways.com.au'}/applications/${id}`,
            notes: notes || undefined
          },
          userId: applicant.id,
          type: notificationType
        });
      }
    } catch (notifyError) {
      // Log but don't fail the request if notification fails
      console.error('Failed to send status update notification:', notifyError);
    }

    res.json({ data: updatedApplication });
  } catch (error) {
    next(error);
  }
});

/**
 * @route DELETE /applications/:id
 * @desc Delete/withdraw application
 * @access Private (Owner, Admin)
 */
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const { prisma } = req.app.locals;
    const { id } = req.params;
    const userId = req.user!.id;
    const userRole = req.user!.role;

    const application = await prisma.application.findUnique({
      where: { id },
    });

    if (!application) {
      throw new NotFoundError('Application');
    }

    // Check access
    const isOwner = application.userId === userId;
    const isAdmin = userRole === 'admin';

    if (!isOwner && !isAdmin) {
      throw new ForbiddenError('You do not have access to this application');
    }

    // Soft delete - set status to withdrawn
    await prisma.application.update({
      where: { id },
      data: { status: 'withdrawn' },
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /applications/stats
 * @desc Get application statistics
 * @access Private (Admin)
 */
router.get('/stats', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const { prisma } = req.app.locals;
    const { startDate, endDate } = req.query;

    const dateFilter: Record<string, unknown> = {};
    if (startDate) {
      dateFilter.gte = new Date(startDate as string);
    }
    if (endDate) {
      dateFilter.lte = new Date(endDate as string);
    }

    const where: Record<string, unknown> = {};
    if (Object.keys(dateFilter).length > 0) {
      where.createdAt = dateFilter;
    }

    // Get counts by status
    const statusCounts = await prisma.application.groupBy({
      by: ['status'],
      where,
      _count: true,
    });

    // Get total
    const total = await prisma.application.count({ where });

    // Get recent applications
    const recentApplications = await prisma.application.count({
      where: {
        ...where,
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
        },
      },
    });

    res.json({
      data: {
        total,
        recentApplications,
        byStatus: statusCounts.reduce((acc, item) => {
          acc[item.status] = item._count;
          return acc;
        }, {} as Record<string, number>),
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
