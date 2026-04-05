import { prisma } from '../db';

export interface PaginationOptions {
  page?: number;
  pageSize?: number;
  query?: string;
  location?: string;
  employmentType?: string;
  minSalary?: number;
  maxSalary?: number;
  skills?: string[];
  companyVerified?: boolean;
  rapLevel?: string;
  featured?: boolean;
}

export interface JobFilters extends PaginationOptions {}

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

export interface CreateJobInput {
  title: string;
  description: string;
  company: string;
  location: string;
  employment: string;
  salaryMin?: number;
  salaryMax?: number;
  requirements?: string;
  benefits?: string;
  [key: string]: any; // Allow other properties for now
}

export interface UpdateJobInput extends Partial<CreateJobInput> {}

export class JobService {
  static async findAll({ 
    page = 1, 
    pageSize = 20, 
    query = '', 
    location = '', 
    employmentType = '',
    minSalary,
    maxSalary,
    skills = [],
    companyVerified,
    rapLevel,
    featured,
  }: PaginationOptions) {
    const where: any = { isActive: true };

    if (query) {
      where.OR = [
        { title: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } }
      ];
    }

    if (location) {
      where.location = { contains: location, mode: 'insensitive' };
    }

    if (employmentType) {
      where.employment = employmentType;
    }

    if (featured !== undefined) {
      where.isFeatured = featured;
    }

    if (minSalary !== undefined) {
      where.OR = [
        ...(where.OR || []),
        { salaryHigh: { gte: minSalary } },
        { salaryLow: { gte: minSalary } },
      ];
    }

    if (maxSalary !== undefined) {
      where.OR = [
        ...(where.OR || []),
        { salaryLow: { lte: maxSalary } },
        { salaryHigh: { lte: maxSalary } },
      ];
    }

    if (skills.length > 0) {
      where.jobSkills = {
        some: {
          OR: skills.map((skill) => ({
            skill: { name: { contains: skill, mode: 'insensitive' } },
          })),
        },
      };
    }

    if (companyVerified !== undefined || rapLevel) {
      where.user = {
        companyProfile: {
          ...(companyVerified !== undefined ? { isVerified: companyVerified } : {}),
          ...(rapLevel ? { rapCertificationLevel: rapLevel } : {}),
        },
      };
    }

    const [total, jobs] = await Promise.all([
      prisma.job.count({ where }),
      prisma.job.findMany({
        where,
        orderBy: [
          { isFeatured: 'desc' },
          { postedAt: 'desc' }
        ],
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          user: {
            select: { 
              id: true, 
              email: true,
              companyProfile: true
            }
          },
          jobSkills: {
            include: { skill: true }
          }
        }
      })
    ]);

    // Post-processing (e.g. checking featured expiry)
    const now = new Date();
    const processedJobs = jobs.map(job => {
      const isFeatured = job.isFeatured && job.featuredUntil ? new Date(job.featuredUntil) > now : false;
      const companyProfile = job.user?.companyProfile;
      
      return {
        ...job,
        isFeatured,
        company: companyProfile ? {
          id: companyProfile.id,
          companyName: companyProfile.companyName,
          logo: (companyProfile as any).logo, // Cast as any until types are regenerated
          industry: companyProfile.industry,
          description: companyProfile.description,
          website: companyProfile.website,
          location: `${companyProfile.city || ''}, ${companyProfile.state || ''}`.replace(/^, |, $/g, ''),
          isVerified: companyProfile.isVerified,
          rapCertificationLevel: companyProfile.rapCertificationLevel,
          createdAt: companyProfile.createdAt,
        } : undefined,
        skills: job.jobSkills?.map((js: any) => js.skill?.name).filter(Boolean) || [],
      };
    });

    return {
      data: processedJobs,
      meta: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize)
      }
    };
  }

  static async findById(id: string) {
    const job = await prisma.job.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, email: true },
          include: { companyProfile: true }
        }
      }
    });

    if (!job) return null;

    const companyProfile = job.user?.companyProfile;
    
    return {
      ...job,
      company: companyProfile ? {
        id: companyProfile.id,
        companyName: companyProfile.companyName,
        logo: (companyProfile as any).logo, // Cast as any until types are regenerated
        industry: companyProfile.industry,
        description: companyProfile.description,
        website: companyProfile.website,
        location: `${companyProfile.city || ''}, ${companyProfile.state || ''}`.replace(/^, |, $/g, ''),
        isVerified: companyProfile.isVerified,
        rapCertificationLevel: companyProfile.rapCertificationLevel,
        createdAt: companyProfile.createdAt,
      } : undefined
    };
  }

  static async findByUser(userId: string) {
    return prisma.job.findMany({
      where: { userId },
      orderBy: { postedAt: 'desc' },
      include: {
        _count: {
          select: { applications: true }
        }
      }
    });
  }

  static async create(data: any, userId: string) {
    return prisma.job.create({
      data: {
        ...data,
        userId,
        postedAt: new Date(),
        isActive: true
      }
    });
  }

  static async update(id: string, data: any, userId: string) {
    // First verify the job exists
    const existing = await prisma.job.findUnique({ where: { id } });
    if (!existing) {
      return null;
    }

    return prisma.job.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
      }
    });
  }

  static async delete(id: string, userId: string): Promise<boolean> {
    // First verify the job exists
    const existing = await prisma.job.findUnique({ where: { id } });
    if (!existing) {
      return false;
    }

    // Soft delete by setting isActive to false
    await prisma.job.update({
      where: { id },
      data: { 
        isActive: false,
        updatedAt: new Date(),
      }
    });

    return true;
  }

  static async getOwner(id: string): Promise<string | null> {
    const job = await prisma.job.findUnique({
      where: { id },
      select: { userId: true }
    });
    return job?.userId || null;
  }

  static async getFeaturedJobs(limit: number = 5) {
    const now = new Date();
    return prisma.job.findMany({
      where: {
        isActive: true,
        isFeatured: true,
        featuredUntil: { gt: now }
      },
      take: limit,
      orderBy: { featuredUntil: 'asc' },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            companyProfile: true
          }
        }
      }
    });
  }

  static async applyToJob(jobId: string, userId: string) {
    // Check if already applied
    const existing = await prisma.jobApplication.findFirst({
      where: { jobId, userId }
    });

    if (existing) {
      throw new Error('Already applied to this job');
    }

    return prisma.jobApplication.create({
      data: {
        jobId,
        userId,
        status: 'SUBMITTED'
      }
    });
  }

  static async getJobStats(companyId: string) {
    // This assumes jobs are linked to a user who is linked to a company
    // But the schema seems to link jobs to user directly.
    // We might need to find all jobs for users in this company.
    // For now, let's assume companyId is actually userId or we find jobs by companyId if it exists on Job.
    
    // Based on findAll, jobs have a user which has a companyProfile.
    // So we need to find jobs where user.companyProfile.id === companyId
    
    const jobs = await prisma.job.findMany({
      where: {
        user: {
          companyProfile: {
            id: companyId
          }
        }
      },
      select: { id: true }
    });
    
    const jobIds = jobs.map(j => j.id);
    
    const totalJobs = jobIds.length;
    const activeJobs = await prisma.job.count({
      where: {
        id: { in: jobIds },
        isActive: true
      }
    });
    
    const totalApplications = await prisma.jobApplication.count({
      where: {
        jobId: { in: jobIds }
      }
    });

    return {
      totalJobs,
      activeJobs,
      totalApplications
    };
  }
}
