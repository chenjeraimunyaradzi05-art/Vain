import { PrismaClient, User, Job } from '@prisma/client';
import { prisma } from '../db';
import { logger } from '../lib/logger';

// Type definitions for matching
export interface UserProfile {
  id: string;
  skills: string[];
  experienceYears: number;
  experienceLevel: 'entry' | 'mid' | 'senior' | 'expert';
  location: string;
  remotePreference: 'remote' | 'onsite' | 'hybrid' | 'flexible';
  salaryExpectation?: { min: number; max: number };
  industries: string[];
  preferredCompanySize?: string[];
  isIndigenous: boolean;
  culturalPreferences: string[];
  careerGoals: string[];
}

export interface JobListing {
  id: string;
  title: string;
  description: string;
  requiredSkills: string[];
  preferredSkills: string[];
  experienceLevel: 'entry' | 'mid' | 'senior' | 'expert';
  experienceYears: { min: number; max: number };
  location: string;
  remoteType: 'remote' | 'onsite' | 'hybrid';
  salary?: { min: number; max: number };
  industry: string;
  companyId: string;
  companyName: string;
  isIndigenousOwned: boolean;
  indigenousFriendly: boolean;
  culturalElements: string[];
  createdAt: Date;
  companyRating?: number;
}

export interface JobMatchScore {
  jobId: string;
  score: number; // 0-100
  breakdown: ScoreBreakdown;
  matchTier: 'perfect' | 'high' | 'good' | 'moderate' | 'low';
}

export interface ScoreBreakdown {
  skillsMatch: number;
  experienceMatch: number;
  locationMatch: number;
  industryMatch: number;
  culturalFit: number;
  companyReputation: number;
  salaryMatch: number;
  careerPathAlignment: number;
  indigenousEmployerBonus: number;
  recencyBonus: number;
}

export class JobMatchingService {
  /**
   * Find matching jobs for a candidate
   */
  async findMatchesForCandidate(
    userId: string,
    options: {
      limit?: number;
      minScore?: number;
      excludeApplied?: boolean;
      includeRemote?: boolean;
    } = {}
  ): Promise<JobMatchScore[]> {
    const {
      limit = 20,
      minScore = 60,
      excludeApplied = true,
      includeRemote = true
    } = options;

    try {
      // 1. Get user profile
      const userProfile = await this.getUserProfile(userId);
      if (!userProfile) throw new Error('User profile not found');

      // 2. Get available jobs
      const jobs = await this.getAvailableJobs(userId, excludeApplied, includeRemote);

      // 3. Calculate match scores
      const matches = jobs
        .map(job => this.calculateMatchScore(userProfile, job))
        .filter(match => match.score >= minScore)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);

      // 4. Log matching operation for analytics
      // await this.logMatchingOperation(userId, matches.length);

      return matches;
    } catch (error) {
      logger.error('Job matching failed', { userId, error });
      throw error;
    }
  }

  /**
   * Find matching candidates for a job
   */
  async findMatchesForJob(
    jobId: string,
    options: {
      limit?: number;
      minScore?: number;
    } = {}
  ) {
    // Implementation would be similar but inverted
    // For now returning empty array as this is a complex query
    return [];
  }

  /**
   * Get user profile with all necessary matching data
   */
  private async getUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          // @ts-ignore: Relation might be userSkills
          userSkills: { include: { skill: true } }
        }
      });

      if (!user) return null;

      // Extract skills
      const skills = (user as any).userSkills?.map((s: any) => s.skill?.name.toLowerCase()) || [];

      // Calculate experience level (Mock implementation as Experience model missing)
      const experienceYears = 0; 
      const experienceLevel = this.mapExperienceLevel(experienceYears);

      return {
        id: userId,
        skills,
        experienceYears,
        experienceLevel,
        location: (user as any).location || '',
        remotePreference: 'flexible',
        salaryExpectation: undefined,
        industries: [],
        preferredCompanySize: [],
        isIndigenous: (user as any).isIndigenous || false,
        culturalPreferences: [],
        careerGoals: []
      };
    } catch (error) {
      logger.error('Failed to get user profile', { userId, error });
      return null;
    }
  }

  /**
   * Get available jobs
   */
  private async getAvailableJobs(
    userId: string,
    excludeApplied: boolean,
    includeRemote: boolean
  ): Promise<JobListing[]> {
    try {
      // Get applied job IDs if needed
      let appliedJobIds: string[] = [];
      if (excludeApplied) {
        // @ts-ignore: jobApplication vs application 
        if ((prisma as any).jobApplication) {
             const applications = await (prisma as any).jobApplication.findMany({
                where: { userId },
                select: { jobId: true }
             });
             appliedJobIds = applications.map((a: any) => a.jobId);
        }
      }

      // Query jobs
      const jobs = await prisma.job.findMany({
        where: {
          status: 'APPROVED', // Assuming APPROVED is the active status
          id: excludeApplied ? { notIn: appliedJobIds } : undefined,
        } as any,
        include: {
          company: {
            select: {
              id: true,
              companyName: true,
            }
          },
        } as any,
        orderBy: { createdAt: 'desc' },
        take: 500 // Limit for performance
      });

      return jobs.map((job: any) => ({
        id: job.id,
        title: job.title,
        description: job.description || '',
        requiredSkills: [], // job.skills?.filter(s => s.required).map(s => s.name.toLowerCase()) || [],
        preferredSkills: [], // job.skills?.filter(s => !s.required).map(s => s.name.toLowerCase()) || [],
        experienceLevel: 'mid', // job.experienceLevel || 'mid',
        experienceYears: { 
          min: 0, // job.minExperience || 0, 
          max: 10 // job.maxExperience || 10 
        },
        location: job.location || '',
        remoteType: 'onsite', // job.remoteType || 'onsite',
        salary: undefined,
        industry: '', // job.industry || '',
        companyId: job.company?.id || '',
        companyName: job.company?.companyName || 'Unknown Company',
        isIndigenousOwned: false, // job.company.isIndigenousOwned || false,
        indigenousFriendly: false, // job.indigenousFriendly || false,
        culturalElements: [], // job.culturalElements || [],
        createdAt: job.createdAt,
        companyRating: undefined // job.company.rating || undefined
      }));
    } catch (error) {
      logger.error('Failed to get available jobs', { error });
      return [];
    }
  }

  /**
   * Calculate match score between user and job
   */
  private calculateMatchScore(user: UserProfile, job: JobListing): JobMatchScore {
    // Simplified matching logic for now
    const breakdown: ScoreBreakdown = {
      skillsMatch: 0,
      experienceMatch: 0,
      locationMatch: 0,
      industryMatch: 0,
      culturalFit: 0,
      companyReputation: 0,
      salaryMatch: 0,
      careerPathAlignment: 0,
      indigenousEmployerBonus: 0,
      recencyBonus: 0
    };

    // Calculate score
    let score = 50; // Base score
    
    // Skills match
    if (job.requiredSkills.length > 0) {
        const matched = job.requiredSkills.filter(s => user.skills.includes(s)).length;
        breakdown.skillsMatch = (matched / job.requiredSkills.length) * 30;
        score += breakdown.skillsMatch;
    }

    return {
      jobId: job.id,
      score: Math.min(100, Math.round(score)),
      breakdown,
      matchTier: this.getMatchTier(score)
    };
  }

  private mapExperienceLevel(years: number): 'entry' | 'mid' | 'senior' | 'expert' {
    if (years < 2) return 'entry';
    if (years < 5) return 'mid';
    if (years < 8) return 'senior';
    return 'expert';
  }

  private getMatchTier(score: number): 'perfect' | 'high' | 'good' | 'moderate' | 'low' {
    if (score >= 90) return 'perfect';
    if (score >= 80) return 'high';
    if (score >= 70) return 'good';
    if (score >= 50) return 'moderate';
    return 'low';
  }

  private calculateExperienceYears(experience: any[]): number {
      return 0;
  }
}

export const jobMatchingService = new JobMatchingService();

