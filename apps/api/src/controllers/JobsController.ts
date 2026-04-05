// @ts-nocheck
/**
 * Jobs Controller
 * 
 * Handles job listing, search, creation, and management.
 * Business logic extracted from routes/jobs.ts
 */

import { Request, Response } from 'express';
import { BaseController, asyncHandler } from './BaseController';
import { JobService } from '../services/jobService';
import { PreApplyService } from '../services/preApplyService';
import { jobPerformanceService } from '../services/jobPerformanceService';
import * as cache from '../lib/redisCache';
import { prisma } from '../db';
import { logger } from '../lib/logger';

// Cache TTL for public job listings (5 minutes)
const JOBS_CACHE_TTL = 300;

class JobsController extends BaseController {
  /**
   * Generate cache key for job listings
   */
  private getCacheKey(query: Record<string, any>): string {
    const {
      page = 1,
      pageSize = 20,
      q = '',
      location = '',
      employment = '',
      minSalary = '',
      maxSalary = '',
      skills = '',
      companyVerified = '',
      rapLevel = '',
      featured = '',
    } = query;
    return `jobs:list:${page}:${pageSize}:${q}:${location}:${employment}:${minSalary}:${maxSalary}:${skills}:${companyVerified}:${rapLevel}:${featured}`;
  }

  /**
   * GET /jobs
   * List jobs with filtering and pagination
   */
  list = asyncHandler(async (req: Request, res: Response) => {
    const { page, pageSize, skip } = this.getPagination(req);
    
    // Generate cache key
    const cacheKey = this.getCacheKey({
      page,
      pageSize,
      q: req.query.q,
      location: req.query.location,
      employment: req.query.employment,
      minSalary: req.query.minSalary,
      maxSalary: req.query.maxSalary,
      skills: req.query.skills,
      companyVerified: req.query.companyVerified,
      rapLevel: req.query.rapLevel,
      featured: req.query.featured,
    });

    // Try cache first
    const cached = await cache.get(cacheKey);
    if (cached) {
      return void res.json(cached);
    }
    
    const result = await JobService.findAll({
      page,
      pageSize,
      query: req.query.q as string,
      location: req.query.location as string,
      employmentType: req.query.employment as string,
      minSalary: req.query.minSalary ? Number(req.query.minSalary) : undefined,
      maxSalary: req.query.maxSalary ? Number(req.query.maxSalary) : undefined,
      skills: req.query.skills ? String(req.query.skills).split(',').map(s => s.trim()).filter(Boolean) : [],
      companyVerified: req.query.companyVerified ? String(req.query.companyVerified) === 'true' : undefined,
      rapLevel: req.query.rapLevel as string,
      featured: req.query.featured ? String(req.query.featured) === 'true' : undefined,
    });

    // Cache the result
    await cache.set(cacheKey, result, JOBS_CACHE_TTL);

    return void res.json(result);
  });

  /**
   * GET /jobs/:id
   * Get single job by ID
   */
  getById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const job = await JobService.findById(id);
    
    if (!job) {
      return this.notFound(res, 'Job');
    }

    // Track job view if user is authenticated
    const user = this.getUser(req);
    if (user) {
      await jobPerformanceService.trackEvent({
        jobId: id,
        eventType: 'view',
        userId: user.id
      }).catch(err => {
        console.error('Failed to track job view', err);
      });
    }

    return this.success(res, job);
  });

  /**
   * GET /jobs/matches
   * Get AI-matched jobs for authenticated user
   */
  getMatches = asyncHandler(async (req: Request, res: Response) => {
    const user = this.requireUser(req);
    const { limit = '20', location, employment, skills, minSalary, maxSalary } = req.query;

    // Get user's skills
    const userSkills = await prisma.userSkill.findMany({
      where: { userId: user.id },
      include: { skill: { select: { name: true } } },
    });

    const skillNames = (skills ? String(skills).split(',').map(s => s.trim()).filter(Boolean) : [])
      .concat(userSkills.map((s) => s.skill?.name).filter(Boolean) as string[]);

    // Build query
    const where: any = { isActive: true };
    if (location) where.location = { contains: String(location), mode: 'insensitive' };
    if (employment) where.employment = String(employment);
    if (minSalary) {
      where.OR = [
        ...(where.OR || []),
        { salaryHigh: { gte: Number(minSalary) } },
        { salaryLow: { gte: Number(minSalary) } },
      ];
    }
    if (maxSalary) {
      where.OR = [
        ...(where.OR || []),
        { salaryLow: { lte: Number(maxSalary) } },
        { salaryHigh: { lte: Number(maxSalary) } },
      ];
    }
    if (skillNames.length > 0) {
      where.jobSkills = {
        some: {
          OR: skillNames.map((skill) => ({
            skill: { name: { contains: skill, mode: 'insensitive' } },
          })),
        },
      };
    }

    const jobs = await prisma.job.findMany({
      where,
      take: Math.min(50, Number(limit)),
      orderBy: { postedAt: 'desc' },
      include: {
        user: { select: { id: true, email: true, companyProfile: true } },
        jobSkills: { include: { skill: true } },
      },
    });

    // Calculate match scores
    const matches = jobs.map((job) => {
      const jobSkills = job.jobSkills.map((js) => js.skill?.name).filter(Boolean) as string[];
      const sharedSkills = skillNames.filter((skill) =>
        jobSkills.some((js) => js.toLowerCase().includes(skill.toLowerCase()))
      );
      const skillScore = jobSkills.length ? (sharedSkills.length / jobSkills.length) * 40 : 10;
      const verifiedBonus = job.user?.companyProfile?.isVerified ? 5 : 0;
      const rapBonus = job.user?.companyProfile?.rapCertificationLevel ? 5 : 0;
      const matchScore = Math.min(100, Math.round(skillScore + verifiedBonus + rapBonus + 40));

      return {
        ...job,
        matchScore,
        matchedSkills: sharedSkills,
      };
    });

    // Sort by match score
    matches.sort((a, b) => b.matchScore - a.matchScore);

    return this.success(res, matches);
  });

  /**
   * POST /jobs
   * Create a new job listing
   */
  create = asyncHandler(async (req: Request, res: Response) => {
    const user = this.requireUser(req);
    
    if (user.userType !== 'COMPANY' && user.userType !== 'ADMIN') {
      return this.forbidden(res, 'Only companies can create job listings');
    }

    const job = await JobService.create({
      ...req.body,
      userId: user.id,
    });

    // Invalidate job list cache
    await cache.deletePattern('jobs:list:*');

    logger.info('Job created', { jobId: job.id, userId: user.id });

    return this.success(res, job, 'Job created successfully', 201);
  });

  /**
   * PUT /jobs/:id
   * Update a job listing
   */
  update = asyncHandler(async (req: Request, res: Response) => {
    const user = this.requireUser(req);
    const { id } = req.params;

    // Check ownership
    const existingJob = await prisma.job.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!existingJob) {
      return this.notFound(res, 'Job');
    }

    if (existingJob.userId !== user.id && user.userType !== 'ADMIN') {
      return this.forbidden(res, 'You can only edit your own job listings');
    }

    const job = await JobService.update(id, req.body);

    // Invalidate caches
    await cache.deletePattern('jobs:list:*');
    await cache.del(`jobs:${id}`);

    logger.info('Job updated', { jobId: id, userId: user.id });

    return this.success(res, job, 'Job updated successfully');
  });

  /**
   * DELETE /jobs/:id
   * Delete a job listing
   */
  delete = asyncHandler(async (req: Request, res: Response) => {
    const user = this.requireUser(req);
    const { id } = req.params;

    // Check ownership
    const existingJob = await prisma.job.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!existingJob) {
      return this.notFound(res, 'Job');
    }

    if (existingJob.userId !== user.id && user.userType !== 'ADMIN') {
      return this.forbidden(res, 'You can only delete your own job listings');
    }

    await prisma.job.delete({ where: { id } });

    // Invalidate caches
    await cache.deletePattern('jobs:list:*');
    await cache.del(`jobs:${id}`);

    logger.info('Job deleted', { jobId: id, userId: user.id });

    return this.success(res, null, 'Job deleted successfully');
  });

  /**
   * POST /jobs/:id/apply
   * Apply for a job
   */
  apply = asyncHandler(async (req: Request, res: Response) => {
    const user = this.requireUser(req);
    const { id } = req.params;

    // Check if job exists and is active
    const job = await prisma.job.findUnique({
      where: { id },
      select: { id: true, isActive: true, title: true },
    });

    if (!job) {
      return this.notFound(res, 'Job');
    }

    if (!job.isActive) {
      return this.error(res, 'This job is no longer accepting applications', 400);
    }

    // Check for existing application
    const existingApplication = await prisma.application.findUnique({
      where: {
        userId_jobId: {
          userId: user.id,
          jobId: id,
        },
      },
    });

    if (existingApplication) {
      return this.error(res, 'You have already applied for this job', 409);
    }

    // Create application
    const application = await prisma.application.create({
      data: {
        userId: user.id,
        jobId: id,
        status: 'PENDING',
        coverLetter: req.body.coverLetter,
        resumeUrl: req.body.resumeUrl,
      },
    });

    // Track application event
    await jobPerformanceService.trackJobApplication(id, user.id).catch(err => {
      logger.debug('Failed to track application', { error: err.message });
    });

    logger.info('Job application submitted', { jobId: id, userId: user.id, applicationId: application.id });

    return this.success(res, application, 'Application submitted successfully', 201);
  });

  /**
   * POST /jobs/:id/save
   * Save a job for later
   */
  save = asyncHandler(async (req: Request, res: Response) => {
    const user = this.requireUser(req);
    const { id } = req.params;

    const savedJob = await prisma.savedJob.upsert({
      where: {
        userId_jobId: {
          userId: user.id,
          jobId: id,
        },
      },
      create: {
        userId: user.id,
        jobId: id,
      },
      update: {},
    });

    return this.success(res, savedJob, 'Job saved');
  });

  /**
   * DELETE /jobs/:id/save
   * Unsave a job
   */
  unsave = asyncHandler(async (req: Request, res: Response) => {
    const user = this.requireUser(req);
    const { id } = req.params;

    await prisma.savedJob.deleteMany({
      where: {
        userId: user.id,
        jobId: id,
      },
    });

    return this.success(res, null, 'Job unsaved');
  });
}

export const jobsController = new JobsController();
export default jobsController;

