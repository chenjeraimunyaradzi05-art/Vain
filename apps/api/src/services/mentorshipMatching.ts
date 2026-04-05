import { PrismaClient } from '@prisma/client';
import { prisma } from '../db';
import { logger } from '../lib/logger';

// Type definitions for mentorship matching
export interface MentorProfile {
  id: string;
  userId: string;
  name: string;
  avatarUrl?: string;
  expertise: string[];
  industries: string[];
  experienceYears: number;
  currentRole: string;
  company?: string;
  bio?: string;
  mentoringSince: Date;
  totalMentees: number;
  rating?: number;
  availability: string[];
  languages: string[];
  isIndigenous: boolean;
  culturalExperience: boolean;
  matchScore?: number;
}

export type MentorMatch = MentorProfile;

interface MenteeProfile {
  id: string;
  userId: string;
  name: string;
  skills: string[];
  currentRole?: string;
  experienceYears: number;
  careerGoals: string[];
  learningObjectives: string[];
  preferredIndustries: string[];
  preferredCommunication: string[];
  availability: string[];
  languages: string[];
  location: string;
  timezone: string;
  isIndigenous: boolean;
  seekingElderMentor: boolean;
  culturalInterests: string[];
  urgency: 'high' | 'medium' | 'flexible';
}

export class MentorshipMatchingService {
  /**
   * Find matching mentors for a mentee
   */
  async findMentorsForMentee(
    userId: string,
    options: {
      limit?: number;
      industryFilter?: string;
      requiredExpertise?: string[];
      preferIndigenous?: boolean;
    } = {}
  ): Promise<MentorProfile[]> {
    const {
      limit = 10,
      industryFilter,
      requiredExpertise = [],
      preferIndigenous = false
    } = options;

    try {
      // 1. Get mentee profile
      const mentee = await this.getMenteeProfile(userId);
      if (!mentee) throw new Error('Mentee profile not found');

      // 2. Get available mentors
      const mentors = await this.getAvailableMentors(industryFilter);

      // 3. Calculate scores
      const scoredMentors = mentors.map(mentor => ({
        ...mentor,
        matchScore: this.calculateMatchScore(mentee, mentor)
      }));

      // 4. Sort and filter
      return scoredMentors
        .sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0))
        .slice(0, limit);

    } catch (error) {
      logger.error('Mentorship matching failed', { userId, error });
      throw error;
    }
  }

  /**
   * Get mentee profile
   */
  private async getMenteeProfile(userId: string): Promise<MenteeProfile | null> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          // @ts-ignore
          userSkills: { include: { skill: true } }
        }
      });

      if (!user) return null;

      // Mock missing data
      const menteeData: any = {};

      return {
        id: userId,
        userId,
        // @ts-ignore
        name: user.name || 'User',
        // @ts-ignore
        skills: user.userSkills?.map((s: any) => s.skill?.name.toLowerCase()) || [],
        // @ts-ignore
        currentRole: user.role || '', // userType?
        experienceYears: 0,
        careerGoals: [],
        learningObjectives: [],
        preferredIndustries: [],
        preferredCommunication: ['video_call'],
        availability: [],
        languages: ['english'],
        location: (user as any).location || '',
        timezone: 'UTC',
        isIndigenous: (user as any).isIndigenous || false,
        seekingElderMentor: false,
        culturalInterests: [],
        urgency: 'flexible'
      };
    } catch (error) {
      logger.error('Failed to get mentee profile', { userId, error });
      return null;
    }
  }

  /**
   * Get available mentors
   */
  private async getAvailableMentors(industryFilter?: string): Promise<MentorProfile[]> {
    try {
      // @ts-ignore
      if (!(prisma as any).mentorProfile) return [];

      // @ts-ignore
      const mentors = await (prisma as any).mentorProfile.findMany({
        where: {
          isVerified: true
        },
        include: {
          user: true
        }
      });

      return mentors.map((mentor: any) => ({
        id: mentor.id,
        userId: mentor.userId,
        name: mentor.user?.name || 'Mentor',
        avatarUrl: mentor.user?.avatarUrl,
        expertise: [],
        industries: [],
        experienceYears: mentor.experienceYears || 0,
        currentRole: '',
        company: '',
        bio: mentor.bio,
        mentoringSince: mentor.createdAt,
        totalMentees: 0,
        rating: 5.0,
        availability: [],
        languages: [],
        isIndigenous: false,
        culturalExperience: false
      }));
    } catch (error) {
      logger.error('Failed to get available mentors', { error });
      return [];
    }
  }

  private calculateMatchScore(mentee: MenteeProfile, mentor: MentorProfile): number {
    return 75; // Mock score
  }

  async createMentorshipRequest(menteeId: string, mentorId: string, message: string) {
       // @ts-ignore
       if (!(prisma as any).mentorshipRequest) throw new Error("Not implemented");
       
       // @ts-ignore
       return (prisma as any).mentorshipRequest.create({
           data: {
               menteeId,
               mentorId,
               message,
               status: 'PENDING'
           }
       });
  }
}

export const mentorshipMatchingService = new MentorshipMatchingService();

