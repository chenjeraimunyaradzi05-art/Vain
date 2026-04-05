/**
 * Radar Scoring Service
 * 
 * Handles job matching and scoring for the Opportunity Radar
 */

import { prisma } from '../lib/database';

export interface RadarRule {
  id: string;
  location?: string;
  employmentType?: string;
  salaryMin?: number;
  salaryMax?: number;
  skills?: string[];
  industries?: string[];
  keywords?: string;
  matchScore: number;
}

export interface JobMatch {
  jobId: string;
  matchScore: number;
  matchedSkills: string[];
  matchedLocation: boolean;
  matchedSalary: boolean;
  matchedKeywords: boolean;
}

export class RadarScoringService {
  /**
   * Calculate match score between a radar rule and a job
   */
  static calculateMatchScore(rule: RadarRule, job: any): JobMatch {
    let score = 0;
    const matchedSkills: string[] = [];
    let matchedLocation = false;
    let matchedSalary = false;
    let matchedKeywords = false;

    // Location matching (20% weight)
    if (rule.location && job.location) {
      const jobLocation = job.location.toLowerCase();
      const ruleLocation = rule.location.toLowerCase();
      
      if (jobLocation.includes(ruleLocation) || ruleLocation.includes(jobLocation)) {
        score += 0.2;
        matchedLocation = true;
      }
    }

    // Employment type matching (20% weight)
    if (rule.employmentType && job.employmentType === rule.employmentType) {
      score += 0.2;
    }

    // Salary range matching (20% weight)
    if (rule.salaryMin && rule.salaryMax && job.salaryMin && job.salaryMax) {
      if (job.salaryMin >= rule.salaryMin && job.salaryMax <= rule.salaryMax) {
        score += 0.2;
        matchedSalary = true;
      } else if (job.salaryMin >= rule.salaryMin && job.salaryMin <= rule.salaryMax) {
        // Partial match - salary range overlaps
        score += 0.1;
        matchedSalary = true;
      }
    }

    // Skills matching (30% weight)
    if (rule.skills && rule.skills.length > 0 && job.skills) {
      const jobSkills = job.skills.map((js: any) => js.skill.name);
      const commonSkills = rule.skills.filter(skill => jobSkills.includes(skill));
      
      if (commonSkills.length > 0) {
        const skillScore = Math.min(commonSkills.length / Math.max(rule.skills.length, jobSkills.length), 1.0);
        score += skillScore * 0.3;
        matchedSkills = commonSkills;
      }
    }

    // Keywords matching (10% weight)
    if (rule.keywords && job.description) {
      const keywords = rule.keywords.toLowerCase().split(' ').filter(k => k.length > 2);
      const description = job.description.toLowerCase();
      
      if (keywords.length > 0) {
        const matchedKeywordCount = keywords.filter(keyword => description.includes(keyword)).length;
        if (matchedKeywordCount > 0) {
          score += (matchedKeywordCount / keywords.length) * 0.1;
          matchedKeywords = true;
        }
      }
    }

    return {
      jobId: job.id,
      matchScore: Math.min(score, 1.0),
      matchedSkills,
      matchedLocation,
      matchedSalary,
      matchedKeywords
    };
  }

  /**
   * Find matching jobs for a radar rule
   */
  static async findMatchingJobs(rule: RadarRule, limit: number = 50): Promise<JobMatch[]> {
    // Build where clause based on rule criteria
    let whereClause: any = {
      status: 'ACTIVE'
    };

    // Add location filter if specified
    if (rule.location) {
      whereClause.location = {
        contains: rule.location,
        mode: 'insensitive'
      };
    }

    // Add employment type filter if specified
    if (rule.employmentType) {
      whereClause.employmentType = rule.employmentType;
    }

    // Add salary range filter if specified
    if (rule.salaryMin && rule.salaryMax) {
      whereClause.AND = [
        {
          salaryMin: {
            gte: rule.salaryMin
          }
        },
        {
          salaryMax: {
            lte: rule.salaryMax
          }
        }
      ];
    }

    // Get matching jobs
    const jobs = await prisma.job.findMany({
      where: whereClause,
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
      take: limit,
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Calculate match scores
    const matches = jobs.map(job => this.calculateMatchScore(rule, job));

    // Filter by minimum match score
    const filteredMatches = matches.filter(match => match.matchScore >= rule.matchScore);

    // Sort by match score (highest first)
    return filteredMatches.sort((a, b) => b.matchScore - a.matchScore);
  }

  /**
   * Update radar matches for a user
   */
  static async updateRadarMatches(userId: string): Promise<void> {
    // Get active radar rules for the user
    const radarRules = await prisma.radarRule.findMany({
      where: {
        userId,
        isActive: true
      }
    });

    if (radarRules.length === 0) {
      return;
    }

    // Clear existing matches
    await prisma.radarMatch.deleteMany({
      where: {
        userId
      }
    });

    // Find matches for each rule
    const allMatches: any[] = [];
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // Expires in 24 hours

    for (const rule of radarRules) {
      const matches = await this.findMatchingJobs(rule);
      
      for (const match of matches) {
        allMatches.push({
          userId,
          radarRuleId: rule.id,
          jobId: match.jobId,
          matchScore: match.matchScore,
          matchedSkills: JSON.stringify(match.matchedSkills),
          matchedLocation: match.matchedLocation,
          matchedSalary: match.matchedSalary,
          matchedKeywords: match.matchedKeywords,
          expiresAt
        });
      }
    }

    // Create new matches in batches
    if (allMatches.length > 0) {
      await prisma.radarMatch.createMany({
        data: allMatches
      });
    }

    console.log(`TELEMETRY: radar_matches_updated`, {
      userId,
      totalRules: radarRules.length,
      totalMatches: allMatches.length,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Get top matches for a user
   */
  static async getTopMatches(userId: string, limit: number = 20, minScore: number = 0.5): Promise<any[]> {
    const now = new Date();
    
    const matches = await prisma.radarMatch.findMany({
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
      take: limit
    });

    return matches.map(match => ({
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
  }

  /**
   * Create notifications for new matches
   */
  static async createMatchNotifications(userId: string): Promise<void> {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    // Get new matches from the last hour
    const newMatches = await prisma.radarMatch.findMany({
      where: {
        userId,
        createdAt: {
          gte: oneHourAgo
        },
        expiresAt: {
          gt: now
        }
      },
      include: {
        job: {
          select: {
            id: true,
            title: true
          }
        },
        radarRule: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    // Create notifications for new matches
    for (const match of newMatches) {
      await prisma.radarNotification.create({
        data: {
          userId,
          radarRuleId: match.radarRuleId,
          jobId: match.jobId,
          type: 'NEW_MATCH',
          title: 'New Job Match',
          message: `A new job "${match.job.title}" matches your radar rule "${match.radarRule.name}"`,
          actionUrl: `/jobs/${match.jobId}`
        }
      });
    }

    if (newMatches.length > 0) {
      console.log(`TELEMETRY: radar_notifications_created`, {
        userId,
        notificationCount: newMatches.length,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Generate daily digest for a user
   */
  static async generateDailyDigest(userId: string): Promise<void> {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD format
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);

    // Get matches from the last 24 hours
    const recentMatches = await this.getTopMatches(userId, 10, 0.3);

    // Count new vs updated matches
    const newMatches = await prisma.radarMatch.count({
      where: {
        userId,
        createdAt: {
          gte: yesterday
        },
        expiresAt: {
          gt: today
        }
      }
    });

    const totalMatches = await prisma.radarMatch.count({
      where: {
        userId,
        expiresAt: {
          gt: today
        }
      }
    });

    // Get or create today's digest
    let digest = await prisma.radarDigest.findUnique({
      where: {
        userId,
        date: todayStr
      }
    });

    if (!digest) {
      digest = await prisma.radarDigest.create({
        data: {
          userId,
          date: todayStr
        }
      });
    }

    // Update digest with current data
    const updatedDigest = await prisma.radarDigest.update({
      where: { id: digest.id },
      data: {
        totalMatches,
        newMatches,
        updatedMatches: totalMatches - newMatches,
        sampleJobs: recentMatches.slice(0, 5).map(match => ({
          jobId: match.job.id,
          title: match.job.title,
          company: match.job.company?.name || 'Unknown Company',
          matchScore: match.matchScore,
          radarRule: match.radarRule.name
        })),
        sentAt: new Date()
      }
    });

    console.log(`TELEMETRY: radar_digest_generated`, {
      userId,
      digestId: updatedDigest.id,
      date: todayStr,
      totalMatches,
      newMatches,
      timestamp: new Date().toISOString()
    });
  }
}
