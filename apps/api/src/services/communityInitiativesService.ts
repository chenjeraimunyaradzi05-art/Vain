/**
 * Community Initiatives Service
 * 
 * Manages community-driven programs, initiatives, and development projects
 * for Aboriginal and Torres Strait Islander communities.
 * 
 * Features:
 * - Community programs and projects management
 * - Volunteer coordination
 * - Grant and funding tracking
 * - Impact measurement
 * - Community partnerships
 * - Elder-led initiatives
 * - Youth programs
 * - Cultural preservation projects
 */

import { prisma as prismaClient } from '../lib/database';
import { logger } from '../lib/logger';
import { redisCache } from '../lib/redisCacheWrapper';

const prisma = prismaClient as any;

// Types
export interface CommunityInitiative {
  id: string;
  title: string;
  description: string;
  type: InitiativeType;
  category: InitiativeCategory;
  status: InitiativeStatus;
  
  // Organization
  organizerId: string;
  organizerName?: string;
  partnerOrganizations?: string[];
  communityId?: string;
  nation?: string;
  region: string;
  
  // Timeline
  startDate: Date;
  endDate?: Date;
  milestones?: Milestone[];
  
  // Participation
  maxParticipants?: number;
  currentParticipants: number;
  volunteers: Volunteer[];
  
  // Funding
  fundingGoal?: number;
  fundingRaised?: number;
  fundingSources?: string[];
  
  // Impact
  impactMetrics?: ImpactMetric[];
  successStories?: string[];
  
  // Media
  imageUrl?: string;
  videoUrl?: string;
  documents?: Document[];
  
  // Metadata
  tags: string[];
  isElderLed: boolean;
  isYouthFocused: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type InitiativeType =
  | 'PROGRAM'
  | 'PROJECT'
  | 'EVENT'
  | 'CAMPAIGN'
  | 'WORKSHOP'
  | 'MENTORSHIP'
  | 'TRAINING'
  | 'CULTURAL_PRESERVATION'
  | 'LANGUAGE_REVITALIZATION'
  | 'LAND_CARE'
  | 'HEALTH_WELLBEING'
  | 'EDUCATION'
  | 'ECONOMIC_DEVELOPMENT';

export type InitiativeCategory =
  | 'EMPLOYMENT'
  | 'EDUCATION'
  | 'CULTURE'
  | 'HEALTH'
  | 'ENVIRONMENT'
  | 'YOUTH'
  | 'ELDERS'
  | 'WOMEN'
  | 'BUSINESS'
  | 'TECHNOLOGY'
  | 'ARTS'
  | 'SPORTS'
  | 'HOUSING'
  | 'JUSTICE';

export type InitiativeStatus =
  | 'DRAFT'
  | 'PROPOSED'
  | 'APPROVED'
  | 'ACTIVE'
  | 'ON_HOLD'
  | 'COMPLETED'
  | 'CANCELLED';

export interface Milestone {
  id: string;
  title: string;
  description?: string;
  targetDate: Date;
  completedDate?: Date;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'DELAYED';
}

export interface Volunteer {
  id: string;
  userId: string;
  name: string;
  role: string;
  hoursContributed: number;
  joinedAt: Date;
  status: 'ACTIVE' | 'INACTIVE' | 'COMPLETED';
}

export interface ImpactMetric {
  name: string;
  description?: string;
  target: number;
  current: number;
  unit: string;
}

export interface Document {
  id: string;
  title: string;
  type: 'PROPOSAL' | 'REPORT' | 'BUDGET' | 'MEDIA' | 'OTHER';
  url: string;
  uploadedAt: Date;
}

export interface VolunteerOpportunity {
  id: string;
  initiativeId: string;
  title: string;
  description: string;
  skillsRequired: string[];
  timeCommitment: string;
  location: string;
  isRemote: boolean;
  spotsAvailable: number;
  deadline?: Date;
}

export interface GrantOpportunity {
  id: string;
  title: string;
  description: string;
  fundingBody: string;
  amount: number;
  deadline: Date;
  eligibility: string[];
  categories: InitiativeCategory[];
  applicationUrl?: string;
  isActive: boolean;
}

// Filter options
export interface InitiativeFilters {
  type?: InitiativeType;
  category?: InitiativeCategory;
  status?: InitiativeStatus;
  region?: string;
  isElderLed?: boolean;
  isYouthFocused?: boolean;
  hasVolunteerOpportunities?: boolean;
  startDateAfter?: Date;
  startDateBefore?: Date;
  search?: string;
}

class CommunityInitiativesService {
  private static instance: CommunityInitiativesService;
  private cachePrefix = 'community_init:';
  private cacheTTL = 1800; // 30 minutes

  static getInstance(): CommunityInitiativesService {
    if (!CommunityInitiativesService.instance) {
      CommunityInitiativesService.instance = new CommunityInitiativesService();
    }
    return CommunityInitiativesService.instance;
  }

  /**
   * Create a new community initiative
   */
  async createInitiative(
    organizerId: string,
    data: {
      title: string;
      description: string;
      type: InitiativeType;
      category: InitiativeCategory;
      region: string;
      startDate: Date;
      endDate?: Date;
      maxParticipants?: number;
      fundingGoal?: number;
      tags?: string[];
      nation?: string;
      isElderLed?: boolean;
      isYouthFocused?: boolean;
      partnerOrganizations?: string[];
    }
  ): Promise<CommunityInitiative> {
    try {
      const initiative = await prisma.communityInitiative.create({
        data: {
          ...data,
          organizerId,
          status: 'DRAFT',
          currentParticipants: 0,
          tags: data.tags || [],
          isElderLed: data.isElderLed || false,
          isYouthFocused: data.isYouthFocused || false,
        },
        include: {
          organizer: {
            select: { id: true, name: true },
          },
        },
      });

      logger.info('Community initiative created', {
        initiativeId: initiative.id,
        organizerId,
        type: data.type,
      });

      await this.invalidateCache();

      return {
        ...initiative,
        organizerName: (initiative.organizer as any)?.name,
        volunteers: [],
        milestones: [],
      } as CommunityInitiative;
    } catch (error: any) {
      logger.error('Failed to create initiative', { error: error.message, organizerId });
      throw error;
    }
  }

  /**
   * Get initiative by ID
   */
  async getInitiativeById(initiativeId: string): Promise<CommunityInitiative | null> {
    try {
      const initiative = await prisma.communityInitiative.findUnique({
        where: { id: initiativeId },
        include: {
          organizer: {
            select: { id: true, name: true },
          },
          volunteers: {
            include: {
              user: { select: { id: true, name: true } },
            },
          },
          milestones: true,
        },
      });

      if (!initiative) return null;

      return {
        ...initiative,
        organizerName: (initiative.organizer as any)?.name,
        volunteers: initiative.volunteers?.map((v: any) => ({
          id: v.id,
          userId: v.userId,
          name: v.user?.name || 'Unknown',
          role: v.role,
          hoursContributed: v.hoursContributed || 0,
          joinedAt: v.joinedAt,
          status: v.status,
        })) || [],
      } as CommunityInitiative;
    } catch (error: any) {
      logger.error('Failed to get initiative', { error: error.message, initiativeId });
      return null;
    }
  }

  /**
   * Get all initiatives with filters
   */
  async getInitiatives(
    filters: InitiativeFilters = {},
    options: { limit?: number; offset?: number; sortBy?: string } = {}
  ): Promise<{ initiatives: CommunityInitiative[]; total: number }> {
    const { limit = 20, offset = 0, sortBy = 'createdAt' } = options;

    try {
      const where: any = {};

      if (filters.type) where.type = filters.type;
      if (filters.category) where.category = filters.category;
      if (filters.status) where.status = filters.status;
      if (filters.region) where.region = { contains: filters.region, mode: 'insensitive' };
      if (filters.isElderLed !== undefined) where.isElderLed = filters.isElderLed;
      if (filters.isYouthFocused !== undefined) where.isYouthFocused = filters.isYouthFocused;
      
      if (filters.startDateAfter || filters.startDateBefore) {
        where.startDate = {};
        if (filters.startDateAfter) where.startDate.gte = filters.startDateAfter;
        if (filters.startDateBefore) where.startDate.lte = filters.startDateBefore;
      }

      if (filters.search) {
        where.OR = [
          { title: { contains: filters.search, mode: 'insensitive' } },
          { description: { contains: filters.search, mode: 'insensitive' } },
          { tags: { has: filters.search } },
        ];
      }

      const [initiatives, total] = await Promise.all([
        prisma.communityInitiative.findMany({
          where,
          include: {
            organizer: { select: { id: true, name: true } },
            _count: { select: { volunteers: true } },
          },
          orderBy: { [sortBy]: 'desc' },
          take: limit,
          skip: offset,
        }),
        prisma.communityInitiative.count({ where }),
      ]);

      return {
        initiatives: initiatives.map((i: any) => ({
          ...i,
          organizerName: i.organizer?.name,
          volunteerCount: i._count?.volunteers || 0,
          volunteers: [],
        })) as CommunityInitiative[],
        total,
      };
    } catch (error: any) {
      logger.error('Failed to get initiatives', { error: error.message, filters });
      return { initiatives: [], total: 0 };
    }
  }

  /**
   * Update initiative
   */
  async updateInitiative(
    initiativeId: string,
    userId: string,
    updates: Partial<CommunityInitiative>
  ): Promise<CommunityInitiative | null> {
    try {
      // Check ownership
      const existing = await prisma.communityInitiative.findUnique({
        where: { id: initiativeId },
      });

      if (!existing || existing.organizerId !== userId) {
        throw new Error('Not authorized to update this initiative');
      }

      const updated = await prisma.communityInitiative.update({
        where: { id: initiativeId },
        data: {
          ...updates,
          updatedAt: new Date(),
        },
        include: {
          organizer: { select: { id: true, name: true } },
        },
      });

      await this.invalidateCache();

      logger.info('Initiative updated', { initiativeId, userId });

      return {
        ...updated,
        organizerName: (updated.organizer as any)?.name,
        volunteers: [],
      } as CommunityInitiative;
    } catch (error: any) {
      logger.error('Failed to update initiative', { error: error.message, initiativeId });
      throw error;
    }
  }

  /**
   * Join an initiative as volunteer
   */
  async joinAsVolunteer(
    initiativeId: string,
    userId: string,
    role: string
  ): Promise<Volunteer> {
    try {
      // Check if already a volunteer
      const existing = await prisma.initiativeVolunteer.findFirst({
        where: { initiativeId, userId },
      });

      if (existing) {
        throw new Error('Already a volunteer for this initiative');
      }

      const volunteer = await prisma.initiativeVolunteer.create({
        data: {
          initiativeId,
          userId,
          role,
          hoursContributed: 0,
          status: 'ACTIVE',
        },
        include: {
          user: { select: { id: true, name: true } },
        },
      });

      // Update participant count
      await prisma.communityInitiative.update({
        where: { id: initiativeId },
        data: { currentParticipants: { increment: 1 } },
      });

      logger.info('Volunteer joined initiative', { initiativeId, userId, role });

      return {
        id: volunteer.id,
        userId: volunteer.userId,
        name: (volunteer.user as any)?.name || 'Unknown',
        role: volunteer.role,
        hoursContributed: volunteer.hoursContributed,
        joinedAt: volunteer.createdAt,
        status: volunteer.status as 'ACTIVE',
      };
    } catch (error: any) {
      logger.error('Failed to join initiative', { error: error.message, initiativeId, userId });
      throw error;
    }
  }

  /**
   * Log volunteer hours
   */
  async logVolunteerHours(
    initiativeId: string,
    userId: string,
    hours: number,
    description?: string
  ): Promise<void> {
    try {
      const volunteer = await prisma.initiativeVolunteer.findFirst({
        where: { initiativeId, userId },
      });

      if (!volunteer) {
        throw new Error('Not a volunteer for this initiative');
      }

      await prisma.initiativeVolunteer.update({
        where: { id: volunteer.id },
        data: {
          hoursContributed: { increment: hours },
        },
      });

      // Log the activity
      await prisma.volunteerActivity.create({
        data: {
          volunteerId: volunteer.id,
          hours,
          description,
        },
      });

      logger.info('Volunteer hours logged', { initiativeId, userId, hours });
    } catch (error: any) {
      logger.error('Failed to log hours', { error: error.message, initiativeId, userId });
      throw error;
    }
  }

  /**
   * Add a milestone to an initiative
   */
  async addMilestone(
    initiativeId: string,
    userId: string,
    milestone: { title: string; description?: string; targetDate: Date }
  ): Promise<Milestone> {
    try {
      // Verify ownership
      const initiative = await prisma.communityInitiative.findUnique({
        where: { id: initiativeId },
      });

      if (!initiative || initiative.organizerId !== userId) {
        throw new Error('Not authorized');
      }

      const newMilestone = await prisma.initiativeMilestone.create({
        data: {
          ...milestone,
          initiativeId,
          status: 'PENDING',
        },
      });

      return newMilestone as unknown as Milestone;
    } catch (error: any) {
      logger.error('Failed to add milestone', { error: error.message, initiativeId });
      throw error;
    }
  }

  /**
   * Update milestone status
   */
  async updateMilestoneStatus(
    milestoneId: string,
    status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'DELAYED',
    userId: string
  ): Promise<void> {
    try {
      const milestone = await prisma.initiativeMilestone.findUnique({
        where: { id: milestoneId },
        include: { initiative: true },
      });

      if (!milestone || (milestone.initiative as any)?.organizerId !== userId) {
        throw new Error('Not authorized');
      }

      await prisma.initiativeMilestone.update({
        where: { id: milestoneId },
        data: {
          status,
          completedDate: status === 'COMPLETED' ? new Date() : null,
        },
      });
    } catch (error: any) {
      logger.error('Failed to update milestone', { error: error.message, milestoneId });
      throw error;
    }
  }

  /**
   * Get volunteer opportunities
   */
  async getVolunteerOpportunities(
    filters: { region?: string; skills?: string[]; isRemote?: boolean } = {}
  ): Promise<VolunteerOpportunity[]> {
    try {
      const where: any = {
        initiative: { status: 'ACTIVE' },
        spotsAvailable: { gt: 0 },
      };

      if (filters.isRemote !== undefined) where.isRemote = filters.isRemote;
      if (filters.region) where.location = { contains: filters.region, mode: 'insensitive' };

      const opportunities = await prisma.volunteerOpportunity.findMany({
        where,
        include: {
          initiative: { select: { id: true, title: true } },
        },
        orderBy: { deadline: 'asc' },
      });

      // Filter by skills if provided
      let result = opportunities.map((o: any) => ({
        id: o.id,
        initiativeId: o.initiativeId,
        title: o.title,
        description: o.description,
        skillsRequired: o.skillsRequired || [],
        timeCommitment: o.timeCommitment,
        location: o.location,
        isRemote: o.isRemote,
        spotsAvailable: o.spotsAvailable,
        deadline: o.deadline,
      }));

      if (filters.skills?.length) {
        result = result.filter(o =>
          filters.skills!.some(skill =>
            o.skillsRequired.some((s: string) => s.toLowerCase().includes(skill.toLowerCase()))
          )
        );
      }

      return result;
    } catch (error: any) {
      logger.error('Failed to get volunteer opportunities', { error: error.message });
      return [];
    }
  }

  /**
   * Get grant opportunities
   */
  async getGrantOpportunities(
    category?: InitiativeCategory
  ): Promise<GrantOpportunity[]> {
    try {
      const where: any = {
        isActive: true,
        deadline: { gte: new Date() },
      };

      if (category) {
        where.categories = { has: category };
      }

      const grants = await prisma.grantOpportunity.findMany({
        where,
        orderBy: { deadline: 'asc' },
      });

      return grants as GrantOpportunity[];
    } catch (error: any) {
      logger.error('Failed to get grant opportunities', { error: error.message });
      return [];
    }
  }

  /**
   * Add grant opportunity (admin only)
   */
  async addGrantOpportunity(grant: Omit<GrantOpportunity, 'id'>): Promise<GrantOpportunity> {
    try {
      const newGrant = await prisma.grantOpportunity.create({
        data: grant,
      });

      logger.info('Grant opportunity added', { grantId: newGrant.id, title: grant.title });
      return newGrant as GrantOpportunity;
    } catch (error: any) {
      logger.error('Failed to add grant', { error: error.message });
      throw error;
    }
  }

  /**
   * Get initiatives by community/nation
   */
  async getInitiativesByNation(nation: string): Promise<CommunityInitiative[]> {
    try {
      const initiatives = await prisma.communityInitiative.findMany({
        where: {
          nation: { contains: nation, mode: 'insensitive' },
          status: { in: ['ACTIVE', 'APPROVED'] },
        },
        include: {
          organizer: { select: { id: true, name: true } },
        },
        orderBy: { startDate: 'desc' },
      });

      return initiatives.map((i: any) => ({
        ...i,
        organizerName: i.organizer?.name,
        volunteers: [],
      })) as CommunityInitiative[];
    } catch (error: any) {
      logger.error('Failed to get initiatives by nation', { error: error.message, nation });
      return [];
    }
  }

  /**
   * Get elder-led initiatives
   */
  async getElderLedInitiatives(): Promise<CommunityInitiative[]> {
    return (await this.getInitiatives({ isElderLed: true, status: 'ACTIVE' })).initiatives;
  }

  /**
   * Get youth-focused initiatives
   */
  async getYouthInitiatives(): Promise<CommunityInitiative[]> {
    return (await this.getInitiatives({ isYouthFocused: true, status: 'ACTIVE' })).initiatives;
  }

  /**
   * Record impact metric
   */
  async recordImpact(
    initiativeId: string,
    metric: { name: string; current: number; notes?: string }
  ): Promise<void> {
    try {
      await prisma.impactMetric.upsert({
        where: {
          initiativeId_name: { initiativeId, name: metric.name },
        },
        create: {
          initiativeId,
          name: metric.name,
          current: metric.current,
          notes: metric.notes,
        },
        update: {
          current: metric.current,
          notes: metric.notes,
          updatedAt: new Date(),
        },
      });

      logger.info('Impact metric recorded', { initiativeId, metric: metric.name });
    } catch (error: any) {
      logger.error('Failed to record impact', { error: error.message, initiativeId });
    }
  }

  /**
   * Get community impact report
   */
  async getImpactReport(
    filters: { region?: string; category?: InitiativeCategory; dateRange?: { start: Date; end: Date } } = {}
  ): Promise<{
    totalInitiatives: number;
    activeInitiatives: number;
    completedInitiatives: number;
    totalVolunteers: number;
    totalVolunteerHours: number;
    fundingRaised: number;
    impactByCategory: Record<string, any>;
    topInitiatives: CommunityInitiative[];
  }> {
    try {
      const where: any = {};
      if (filters.region) where.region = { contains: filters.region, mode: 'insensitive' };
      if (filters.category) where.category = filters.category;

      const [
        total,
        active,
        completed,
        volunteerStats,
        fundingStats,
      ] = await Promise.all([
        prisma.communityInitiative.count({ where }),
        prisma.communityInitiative.count({ where: { ...where, status: 'ACTIVE' } }),
        prisma.communityInitiative.count({ where: { ...where, status: 'COMPLETED' } }),
        prisma.initiativeVolunteer.aggregate({
          where: { initiative: where },
          _count: { userId: true },
          _sum: { hoursContributed: true },
        }),
        prisma.communityInitiative.aggregate({
          where,
          _sum: { fundingRaised: true },
        }),
      ]);

      // Get top initiatives by participation
      const topInitiatives = await prisma.communityInitiative.findMany({
        where: { ...where, status: 'ACTIVE' },
        orderBy: { currentParticipants: 'desc' },
        take: 5,
        include: {
          organizer: { select: { id: true, name: true } },
        },
      });

      return {
        totalInitiatives: total,
        activeInitiatives: active,
        completedInitiatives: completed,
        totalVolunteers: volunteerStats._count.userId || 0,
        totalVolunteerHours: volunteerStats._sum.hoursContributed || 0,
        fundingRaised: fundingStats._sum.fundingRaised || 0,
        impactByCategory: {}, // Would aggregate by category
        topInitiatives: topInitiatives.map((i: any) => ({
          ...i,
          organizerName: i.organizer?.name,
          volunteers: [],
        })) as CommunityInitiative[],
      };
    } catch (error: any) {
      logger.error('Failed to get impact report', { error: error.message });
      return {
        totalInitiatives: 0,
        activeInitiatives: 0,
        completedInitiatives: 0,
        totalVolunteers: 0,
        totalVolunteerHours: 0,
        fundingRaised: 0,
        impactByCategory: {},
        topInitiatives: [],
      };
    }
  }

  /**
   * Get user's volunteer history
   */
  async getUserVolunteerHistory(userId: string): Promise<{
    totalHours: number;
    initiativesCount: number;
    history: Array<{
      initiativeId: string;
      initiativeTitle: string;
      role: string;
      hoursContributed: number;
      status: string;
    }>;
  }> {
    try {
      const volunteers = await prisma.initiativeVolunteer.findMany({
        where: { userId },
        include: {
          initiative: { select: { id: true, title: true } },
        },
      });

      const totalHours = volunteers.reduce((sum, v) => sum + (v.hoursContributed || 0), 0);

      return {
        totalHours,
        initiativesCount: volunteers.length,
        history: volunteers.map((v: any) => ({
          initiativeId: v.initiativeId,
          initiativeTitle: v.initiative?.title || 'Unknown',
          role: v.role,
          hoursContributed: v.hoursContributed || 0,
          status: v.status,
        })),
      };
    } catch (error: any) {
      logger.error('Failed to get volunteer history', { error: error.message, userId });
      return { totalHours: 0, initiativesCount: 0, history: [] };
    }
  }

  /**
   * Invalidate cache
   */
  private async invalidateCache(): Promise<void> {
    try {
      // In production, would clear specific cache keys
      await redisCache.delete(`${this.cachePrefix}*`);
    } catch (error) {
      // Ignore cache errors
    }
  }
}

// Export singleton instance
export const communityInitiativesService = CommunityInitiativesService.getInstance();

// Export class for testing
export { CommunityInitiativesService };
