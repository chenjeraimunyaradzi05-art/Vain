/**
 * Jobs Service Facade
 * 
 * Provides functional interface to job operations.
 */

import { prisma } from '../db';
import { JobService } from './jobService';

export interface JobSearchParams {
  query?: string;
  location?: string;
  jobType?: string[];
  experienceLevel?: string[];
  salaryMin?: number;
  salaryMax?: number;
  remote?: boolean;
  indigenous?: boolean;
  page?: number;
  limit?: number;
  sortBy?: 'relevance' | 'date' | 'salary';
}

export interface Job {
  id: string;
  title: string;
  description: string;
  company?: {
    id: string;
    name: string;
    verified?: boolean;
  };
  location: string;
  remote?: boolean;
  jobType: string;
  experienceLevel?: string;
  salaryMin?: number;
  salaryMax?: number;
  requirements?: string[];
  benefits?: string[];
  skills?: string[];
  isActive: boolean;
  isFeatured?: boolean;
  viewCount?: number;
  applicationCount?: number;
  postedAt: Date;
}

/**
 * Search jobs with filters
 */
export async function searchJobs(params: JobSearchParams): Promise<{
  jobs: Job[];
  total: number;
  facets: any;
  hasMore: boolean;
}> {
  const { 
    query = '', 
    location = '', 
    jobType = [],
    experienceLevel = [],
    salaryMin,
    salaryMax,
    remote,
    indigenous,
    page = 1, 
    limit = 20,
    sortBy = 'relevance',
  } = params;

  const where: any = { isActive: true };

  if (query) {
    where.OR = [
      { title: { contains: query, mode: 'insensitive' } },
      { description: { contains: query, mode: 'insensitive' } },
    ];
  }

  if (location) {
    where.location = { contains: location, mode: 'insensitive' };
  }

  if (jobType.length > 0) {
    where.employment = { in: jobType };
  }

  if (salaryMin) {
    where.salaryLow = { gte: salaryMin };
  }

  if (salaryMax) {
    where.salaryHigh = { lte: salaryMax };
  }

  // Determine sort order
  let orderBy: any = { postedAt: 'desc' };
  if (sortBy === 'salary') {
    orderBy = { salaryHigh: 'desc' };
  }

  const [total, jobs] = await Promise.all([
    prisma.job.count({ where }),
    prisma.job.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
      include: {
        user: {
          select: {
            companyProfile: {
              select: {
                id: true,
                companyName: true,
                verified: true,
              }
            }
          }
        }
      }
    }),
  ]);

  // Transform jobs to expected format
  const transformedJobs = jobs.map(job => ({
    id: job.id,
    title: job.title,
    description: job.description,
    company: job.user?.companyProfile ? {
      id: job.user.companyProfile.id,
      name: job.user.companyProfile.companyName,
      verified: job.user.companyProfile.verified || false,
    } : undefined,
    location: job.location || '',
    remote: false, // Default
    jobType: job.employment || 'full-time',
    salaryMin: job.salaryLow || undefined,
    salaryMax: job.salaryHigh || undefined,
    isActive: job.isActive,
    isFeatured: job.isFeatured,
    postedAt: job.postedAt || job.createdAt,
  }));

  // Generate facets
  const facets = {
    jobTypes: await prisma.job.groupBy({
      by: ['employment'],
      where: { isActive: true },
      _count: { employment: true },
    }),
    locations: await prisma.job.groupBy({
      by: ['location'],
      where: { isActive: true, location: { not: null } },
      _count: { location: true },
      take: 10,
    }),
  };

  return {
    jobs: transformedJobs as any,
    total,
    facets,
    hasMore: page * limit < total,
  };
}

/**
 * Get job by ID
 */
export async function getJobById(jobId: string): Promise<Job | null> {
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: {
      user: {
        select: {
          companyProfile: {
            select: {
              id: true,
              companyName: true,
              verified: true,
            }
          }
        }
      }
    }
  });

  if (!job) return null;

  return {
    id: job.id,
    title: job.title,
    description: job.description,
    company: job.user?.companyProfile ? {
      id: job.user.companyProfile.id,
      name: job.user.companyProfile.companyName,
      verified: job.user.companyProfile.verified || false,
    } : undefined,
    location: job.location || '',
    jobType: job.employment || 'full-time',
    isActive: job.isActive,
    isFeatured: job.isFeatured,
    postedAt: job.postedAt || job.createdAt,
  };
}

/**
 * Increment view count for a job
 */
export async function incrementViewCount(jobId: string): Promise<void> {
  await prisma.job.update({
    where: { id: jobId },
    data: { viewCount: { increment: 1 } },
  });
}

/**
 * Apply to a job
 */
export async function applyToJob(
  jobId: string,
  userId: string,
  application: {
    coverLetter?: string;
    resumeUrl?: string;
  }
): Promise<{ id: string; status: string }> {
  // Check if job exists and is active
  const job = await prisma.job.findUnique({
    where: { id: jobId },
  });

  if (!job) {
    throw new Error('Job not found');
  }

  if (!job.isActive) {
    throw new Error('Job is no longer accepting applications');
  }

  // Check for existing application
  const existing = await prisma.jobApplication.findFirst({
    where: {
      jobId,
      userId,
    },
  });

  if (existing) {
    throw new Error('You have already applied to this job');
  }

  // Create application
  const newApplication = await prisma.jobApplication.create({
    data: {
      jobId,
      userId,
      coverLetter: application.coverLetter,
      resumeUrl: application.resumeUrl,
      status: 'SUBMITTED',
    },
  });

  return {
    id: newApplication.id,
    status: newApplication.status,
  };
}

/**
 * Save a job for later
 */
export async function saveJob(userId: string, jobId: string): Promise<{ id: string }> {
  // Check if already saved
  const existing = await prisma.savedJob.findFirst({
    where: { userId, jobId },
  });

  if (existing) {
    // Already saved, just return it
    return { id: existing.id };
  }

  const saved = await prisma.savedJob.create({
    data: {
      userId,
      jobId,
    },
  });

  return { id: saved.id };
}

/**
 * Unsave a job
 */
export async function unsaveJob(userId: string, jobId: string): Promise<void> {
  const saved = await prisma.savedJob.findFirst({
    where: { userId, jobId },
  });

  if (saved) {
    await prisma.savedJob.delete({
      where: { id: saved.id },
    });
  }
}

/**
 * Get user's saved jobs
 */
export async function getSavedJobs(userId: string): Promise<Job[]> {
  const savedJobs = await prisma.savedJob.findMany({
    where: { userId },
    include: {
      job: {
        include: {
          user: {
            select: {
              companyProfile: {
                select: {
                  id: true,
                  companyName: true,
                  verified: true,
                }
              }
            }
          }
        }
      }
    },
    orderBy: { createdAt: 'desc' },
  });

  return savedJobs.map(saved => ({
    id: saved.job.id,
    title: saved.job.title,
    description: saved.job.description,
    company: saved.job.user?.companyProfile ? {
      id: saved.job.user.companyProfile.id,
      name: saved.job.user.companyProfile.companyName,
      verified: saved.job.user.companyProfile.verified || false,
    } : undefined,
    location: saved.job.location || '',
    jobType: saved.job.employment || 'full-time',
    isActive: saved.job.isActive,
    postedAt: saved.job.postedAt || saved.job.createdAt,
  }));
}

/**
 * Get job recommendations for a user based on their profile
 */
export async function getJobRecommendations(
  userId: string,
  limit: number = 10
): Promise<Job[]> {
  // Get user profile and skills
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      memberProfile: true,
      userSkills: {
        include: {
          skill: true,
        }
      }
    }
  });

  if (!user) {
    throw new Error('User not found');
  }

  // Simple recommendation: get recent jobs matching user interests
  const where: any = { isActive: true };
  
  // If user has career interest, filter by it
  if (user.memberProfile?.careerInterest) {
    where.OR = [
      { title: { contains: user.memberProfile.careerInterest, mode: 'insensitive' } },
      { description: { contains: user.memberProfile.careerInterest, mode: 'insensitive' } },
    ];
  }

  const jobs = await prisma.job.findMany({
    where,
    orderBy: { postedAt: 'desc' },
    take: limit,
    include: {
      user: {
        select: {
          companyProfile: {
            select: {
              id: true,
              companyName: true,
              verified: true,
            }
          }
        }
      }
    }
  });

  return jobs.map(job => ({
    id: job.id,
    title: job.title,
    description: job.description,
    company: job.user?.companyProfile ? {
      id: job.user.companyProfile.id,
      name: job.user.companyProfile.companyName,
      verified: job.user.companyProfile.verified || false,
    } : undefined,
    location: job.location || '',
    jobType: job.employment || 'full-time',
    isActive: job.isActive,
    postedAt: job.postedAt || job.createdAt,
  }));
}

/**
 * Create a new job posting
 */
export async function createJob(
  userId: string,
  data: {
    title: string;
    description: string;
    location?: string;
    employment?: string;
    salaryMin?: number;
    salaryMax?: number;
    requirements?: string;
    benefits?: string;
  }
): Promise<Job> {
  const job = await prisma.job.create({
    data: {
      userId,
      title: data.title,
      description: data.description,
      location: data.location,
      employment: data.employment,
      salaryLow: data.salaryMin,
      salaryHigh: data.salaryMax,
      requirements: data.requirements,
      benefits: data.benefits,
      isActive: true,
    },
  });

  return {
    id: job.id,
    title: job.title,
    description: job.description,
    location: job.location || '',
    jobType: job.employment || 'full-time',
    isActive: job.isActive,
    postedAt: job.createdAt,
  };
}
