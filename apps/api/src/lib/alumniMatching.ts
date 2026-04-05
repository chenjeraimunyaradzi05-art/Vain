// @ts-nocheck
/**
 * Alumni Mentor Matching System
 * 
 * Specialized matching for alumni mentors who:
 * - Have successfully transitioned through the platform
 * - Have success stories that resonate with mentees
 * - Share career paths, industries, or challenges with potential mentees
 * 
 * Additional matching factors:
 * - Success story alignment (similar starting point, aspirations)
 * - Career trajectory match (where alumni was → where mentee wants to go)
 * - Challenge/barrier similarity (remote work, career change, etc.)
 * - Time since placement (recent alumni have fresh insights)
 */

import { prisma } from '../db';
import { calculateMatchScore } from './mentorMatching';

/**
 * Additional weight constants for alumni-specific factors
 */
export const ALUMNI_WEIGHTS = {
  SUCCESS_STORY_MATCH: 20,      // Similar journey/outcome
  CAREER_TRAJECTORY: 15,        // Path alignment
  CHALLENGE_SIMILARITY: 15,     // Faced similar barriers
  RECENCY_BONUS: 10,            // More recent placements have fresh insights
  ENGAGEMENT_BONUS: 10,         // Active community member
};

interface MenteePreferences {
  country?: string | null;
  industry?: string | null;
  targetIndustry?: string | null;
  targetRole?: string | null;
  location?: string | null;
  skills?: string | string[] | null;
  goals?: string | null;
  challenges?: string | string[] | null;
  currentRole?: string | null;
  includeNonAlumni?: boolean;
}

interface AlumniData {
  country?: string | null;
  currentIndustry?: string | null;
  currentRole?: string | null;
  previousRole?: string | null;
  location?: string | null;
  skills?: string | null;
  availability?: string | null;
  rating?: number | null;
  successStory?: any;
  placementDate?: Date | null;
  challengesOvercome?: string | null;
  careerPath?: string | null;
  communityEngagement?: {
    forumPosts: number;
    helpfulReplies: number;
    sessionsCompleted: number;
  };
}

interface AlumniMatchResult {
  score: number;
  baseScore: number;
  alumniScore: number;
  breakdown: Record<string, number>;
}

/**
 * Calculate alumni-specific match score
 * @param {MenteePreferences} mentee - Mentee profile and preferences
 * @param {AlumniData} alumni - Alumni mentor with success story
 * @returns {AlumniMatchResult} - Score and breakdown
 */
export function calculateAlumniMatchScore(mentee: MenteePreferences, alumni: AlumniData): AlumniMatchResult {
  // Start with base mentor matching
  const baseResult = calculateMatchScore(mentee, {
    country: alumni.country,
    industry: alumni.currentIndustry,
    location: alumni.location,
    skills: alumni.skills,
    availability: alumni.availability,
    rating: alumni.rating,
  });
  
  let alumniScore = 0;
  const alumniBreakdown: Record<string, number> = {};
  
  // 1. Success Story Alignment (20 points)
  if (alumni.successStory && mentee.goals) {
    const storyScore = calculateStoryAlignment(mentee, alumni.successStory);
    alumniScore += Math.floor(ALUMNI_WEIGHTS.SUCCESS_STORY_MATCH * storyScore);
    alumniBreakdown.successStory = Math.floor(ALUMNI_WEIGHTS.SUCCESS_STORY_MATCH * storyScore);
  }
  
  // 2. Career Trajectory Match (15 points)
  if (alumni.careerPath && mentee.targetRole) {
    const trajectoryScore = calculateTrajectoryMatch(mentee, alumni);
    alumniScore += Math.floor(ALUMNI_WEIGHTS.CAREER_TRAJECTORY * trajectoryScore);
    alumniBreakdown.trajectory = Math.floor(ALUMNI_WEIGHTS.CAREER_TRAJECTORY * trajectoryScore);
  }
  
  // 3. Challenge/Barrier Similarity (15 points)
  if (alumni.challengesOvercome && mentee.challenges) {
    const challengeScore = calculateChallengeSimilarity(mentee.challenges, alumni.challengesOvercome);
    alumniScore += Math.floor(ALUMNI_WEIGHTS.CHALLENGE_SIMILARITY * challengeScore);
    alumniBreakdown.challenges = Math.floor(ALUMNI_WEIGHTS.CHALLENGE_SIMILARITY * challengeScore);
  }
  
  // 4. Recency Bonus (10 points)
  if (alumni.placementDate) {
    const recencyScore = calculateRecencyBonus(alumni.placementDate);
    alumniScore += Math.floor(ALUMNI_WEIGHTS.RECENCY_BONUS * recencyScore);
    alumniBreakdown.recency = Math.floor(ALUMNI_WEIGHTS.RECENCY_BONUS * recencyScore);
  }
  
  // 5. Community Engagement Bonus (10 points)
  if (alumni.communityEngagement) {
    const engagementScore = calculateEngagementBonus(alumni.communityEngagement);
    alumniScore += Math.floor(ALUMNI_WEIGHTS.ENGAGEMENT_BONUS * engagementScore);
    alumniBreakdown.engagement = Math.floor(ALUMNI_WEIGHTS.ENGAGEMENT_BONUS * engagementScore);
  }
  
  // Combine base and alumni scores (weighted 60/40)
  const combinedScore = Math.floor(baseResult.score * 0.6 + alumniScore * 0.4);
  
  return {
    score: Math.min(100, combinedScore),
    baseScore: baseResult.score,
    alumniScore,
    breakdown: {
      ...baseResult.breakdown,
      ...alumniBreakdown,
    },
  };
}

/**
 * Calculate how well an alumni's success story aligns with mentee's goals
 */
function calculateStoryAlignment(mentee: MenteePreferences, successStory: any): number {
  let alignment = 0;
  
  // Check if story mentions similar industries
  const storyText = (successStory.story || successStory.content || '').toLowerCase();
  const menteeIndustry = (mentee.industry || mentee.targetIndustry || '').toLowerCase();
  
  if (menteeIndustry && storyText.includes(menteeIndustry)) {
    alignment += 0.4;
  }
  
  // Check for similar goals mentioned
  const goalKeywords = ['career change', 'first job', 'management', 'leadership', 
                        'remote work', 'community', 'business', 'skills', 'qualification'];
  
  const menteeGoals = (mentee.goals || '').toLowerCase();
  let goalMatches = 0;
  for (const keyword of goalKeywords) {
    if (menteeGoals.includes(keyword) && storyText.includes(keyword)) {
      goalMatches++;
    }
  }
  alignment += Math.min(0.4, goalMatches * 0.1);
  
  // Check if starting point was similar
  const startingKeywords = ['entry-level', 'career change', 'returning to work', 
                            'school leaver', 'remote', 'regional'];
  for (const keyword of startingKeywords) {
    if (menteeGoals.includes(keyword) && storyText.includes(keyword)) {
      alignment += 0.2;
      break;
    }
  }
  
  return Math.min(1.0, alignment);
}

/**
 * Calculate career trajectory match
 */
function calculateTrajectoryMatch(mentee: MenteePreferences, alumni: AlumniData): number {
  const menteeTarget = (mentee.targetRole || '').toLowerCase();
  const alumniCurrent = (alumni.currentRole || '').toLowerCase();
  const alumniPrevious = (alumni.previousRole || '').toLowerCase();
  
  // If mentee wants what alumni has achieved
  if (menteeTarget && alumniCurrent && alumniCurrent.includes(menteeTarget)) {
    return 1.0;
  }
  
  // If mentee is where alumni was
  if (alumniPrevious && mentee.currentRole) {
    const menteeCurrent = mentee.currentRole.toLowerCase();
    if (alumniPrevious.includes(menteeCurrent) || menteeCurrent.includes(alumniPrevious)) {
      return 0.8;
    }
  }
  
  // Same industry trajectory
  if (mentee.targetIndustry && alumni.currentIndustry) {
    if (mentee.targetIndustry.toLowerCase() === alumni.currentIndustry.toLowerCase()) {
      return 0.6;
    }
  }
  
  return 0.3;
}

/**
 * Calculate similarity of challenges faced
 */
function calculateChallengeSimilarity(menteeChallenges: string | string[], alumniChallenges: string | string[]): number {
  const parseArray = (val: string | string[]): string[] => {
    if (Array.isArray(val)) return val.map(v => v.toLowerCase());
    if (typeof val === 'string') return val.toLowerCase().split(',').map(s => s.trim());
    return [];
  };
  
  const mentee = parseArray(menteeChallenges);
  const alumni = parseArray(alumniChallenges);
  
  if (mentee.length === 0 || alumni.length === 0) return 0.5;
  
  // Common challenge categories
  const challengeCategories: Record<string, string[]> = {
    'remote_regional': ['remote', 'regional', 'rural', 'distance', 'isolation'],
    'career_change': ['career change', 'new industry', 'pivot', 'transition'],
    'confidence': ['confidence', 'imposter', 'self-doubt', 'anxiety'],
    'skills_gap': ['skills', 'training', 'qualification', 'experience'],
    'work_life': ['family', 'caring', 'balance', 'childcare'],
    'discrimination': ['discrimination', 'bias', 'racism', 'stereotypes'],
    'networking': ['networking', 'connections', 'mentorship', 'support'],
  };
  
  let matchedCategories = 0;
  for (const [category, keywords] of Object.entries(challengeCategories)) {
    const menteeHas = keywords.some(k => mentee.some(m => m.includes(k)));
    const alumniHas = keywords.some(k => alumni.some(a => a.includes(k)));
    if (menteeHas && alumniHas) {
      matchedCategories++;
    }
  }
  
  return Math.min(1.0, matchedCategories * 0.25);
}

/**
 * Calculate recency bonus (more recent placements = fresher insights)
 */
function calculateRecencyBonus(placementDate: Date): number {
  const date = new Date(placementDate);
  const now = new Date();
  const monthsAgo = (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24 * 30);
  
  if (monthsAgo <= 6) return 1.0;      // Very recent
  if (monthsAgo <= 12) return 0.8;     // Within a year
  if (monthsAgo <= 24) return 0.6;     // Within 2 years
  if (monthsAgo <= 36) return 0.4;     // Within 3 years
  return 0.2;                           // Older but still valuable
}

/**
 * Calculate engagement bonus based on community activity
 */
function calculateEngagementBonus(engagement: { forumPosts: number; helpfulReplies: number; sessionsCompleted: number }): number {
  let score = 0;
  
  if (engagement.forumPosts > 10) score += 0.3;
  else if (engagement.forumPosts > 5) score += 0.2;
  else if (engagement.forumPosts > 0) score += 0.1;
  
  if (engagement.helpfulReplies > 5) score += 0.3;
  else if (engagement.helpfulReplies > 0) score += 0.2;
  
  if (engagement.sessionsCompleted > 10) score += 0.4;
  else if (engagement.sessionsCompleted > 5) score += 0.3;
  else if (engagement.sessionsCompleted > 0) score += 0.2;
  
  return Math.min(1.0, score);
}

/**
 * Find matching alumni mentors for a mentee
 * @param {string} menteeId - The mentee's user ID
 * @param {MenteePreferences} preferences - Matching preferences
 * @param {number} limit - Max results
 * @returns {Promise<Array>} - Ranked list of alumni mentors
 */
export async function findMatchingAlumniMentors(menteeId: string, preferences: MenteePreferences = {}, limit = 10) {
  // Get mentee profile
  const mentee = await prisma.user.findUnique({
    where: { id: menteeId },
    include: {
      memberProfile: true,
      userSkills: { include: { skill: true } },
    },
  });
  
  if (!mentee) {
    throw new Error('Mentee not found');
  }
  
  const menteePrefs: MenteePreferences = {
    country: preferences.country || mentee.memberProfile?.mobNation,
    industry: preferences.industry || mentee.memberProfile?.careerInterest,
    targetIndustry: preferences.targetIndustry || mentee.memberProfile?.careerInterest,
    targetRole: preferences.targetRole,
    location: preferences.location || null,
    skills: mentee.userSkills?.map(s => s.skill?.name).join(','),
    goals: preferences.goals || mentee.memberProfile?.bio,
    challenges: preferences.challenges,
    currentRole: mentee.memberProfile?.skillLevel,
  };
  
  // Find alumni mentors (mentors with success stories)
  const alumniMentors = await prisma.user.findMany({
    where: {
      userType: 'MENTOR',
      mentorProfile: { isNot: null },
    },
    include: {
      mentorProfile: true,
      mentorSessions: {
        where: { status: { in: ['scheduled', 'SCHEDULED'] } },
      },
    },
  });
  
  // Get success stories for these mentors
  const successStories = await prisma.successStory.findMany({
    where: {
      userId: { in: alumniMentors.map(m => m.id) },
      status: 'approved',
    },
  });
  const storyMap = new Map(successStories.map(s => [s.userId, s]));
  
  // Get mentor ratings
  const ratings = await prisma.mentorSession.groupBy({
    by: ['mentorId'],
    where: { rating: { not: null } },
    _avg: { rating: true },
    _count: { rating: true },
  });
  const ratingMap = new Map(ratings.map(r => [r.mentorId, { avg: r._avg.rating, count: r._count.rating }]));
  
  // Get forum engagement
  const forumActivity = await prisma.forumReply.groupBy({
    by: ['authorId'],
    where: { authorId: { in: alumniMentors.map(m => m.id) } },
    _count: true,
  });
  const forumMap = new Map(forumActivity.map(f => [f.authorId, f._count]));
  
  // Score and rank alumni mentors
  const scoredMentors = alumniMentors
    .filter(mentor => mentor.mentorSessions.length < 5) // Has capacity
    .filter(mentor => storyMap.has(mentor.id) || preferences.includeNonAlumni) // Has success story
    .map(mentor => {
      const story = storyMap.get(mentor.id);
      const alumniData: AlumniData = {
        country: mentor.mentorProfile?.expertise || null,
        currentIndustry: extractIndustryFromBio(mentor.mentorProfile?.bio),
        currentRole: extractRoleFromBio(mentor.mentorProfile?.bio),
        previousRole: null,
        location: null,
        skills: mentor.mentorProfile?.expertise,
        availability: 'Flexible',
        rating: ratingMap.get(mentor.id)?.avg || null,
        successStory: story,
        placementDate: story?.createdAt || null,
        challengesOvercome: story?.story?.match(/challenge[s]?:?\s*([^.]+)/i)?.[1] || null,
        careerPath: story?.story || null,
        communityEngagement: {
          forumPosts: forumMap.get(mentor.id) || 0,
          helpfulReplies: 0, // Would need additional query
          sessionsCompleted: ratingMap.get(mentor.id)?.count || 0,
        },
      };
      
      const result = calculateAlumniMatchScore(menteePrefs, alumniData);
      
      return {
        id: mentor.id,
        name: mentor.mentorProfile?.expertise?.split(',')[0] || mentor.email.split('@')[0],
        email: mentor.email,
        expertise: mentor.mentorProfile?.expertise,
        bio: mentor.mentorProfile?.bio,
        isAlumni: !!story,
        successStory: story ? {
          id: story.id,
          title: story.title,
          snippet: story.story?.substring(0, 200) + '...',
          outcome: story.outcome,
        } : null,
        matchScore: result.score,
        baseScore: result.baseScore,
        alumniScore: result.alumniScore,
        matchBreakdown: result.breakdown,
        rating: ratingMap.get(mentor.id)?.avg?.toFixed(1) || null,
        ratingCount: ratingMap.get(mentor.id)?.count || 0,
        activeMatches: mentor.mentorSessions.length,
        maxCapacity: 5,
        badges: story ? ['Alumni Mentor', 'Success Story'] : ['Mentor'],
      };
    })
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, limit);
  
  return scoredMentors;
}

/**
 * Extract industry from mentor bio
 */
function extractIndustryFromBio(bio: string | null | undefined): string | null {
  if (!bio) return null;
  
  const industryPatterns = [
    /industry:?\s*(\w+)/i,
    /work(?:ing|s)?\s+in\s+(\w+)/i,
    /(?:experience in|specializ(?:e|ing) in)\s+(\w+)/i,
  ];
  
  for (const pattern of industryPatterns) {
    const match = bio.match(pattern);
    if (match) return match[1];
  }
  
  return null;
}

/**
 * Extract role from mentor bio
 */
function extractRoleFromBio(bio: string | null | undefined): string | null {
  if (!bio) return null;
  
  const rolePatterns = [
    /(?:currently|work(?:ing)?)\s+as\s+(?:a|an)?\s*(\w+\s*\w*)/i,
    /role:?\s*(\w+\s*\w*)/i,
    /(\w+\s*manager|\w+\s*lead|\w+\s*director)/i,
  ];
  
  for (const pattern of rolePatterns) {
    const match = bio.match(pattern);
    if (match) return match[1];
  }
  
  return null;
}

/**
 * Get featured alumni mentors for browse page
 */
export async function getFeaturedAlumniMentors(limit = 8) {
  // Get mentors with approved success stories
  const alumniWithStories = await prisma.successStory.findMany({
    where: {
      status: 'approved',
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: limit * 2,
  });
  
  // Get ratings
  const mentorIds = alumniWithStories.map(s => s.userId);
  const ratings = await prisma.mentorSession.groupBy({
    by: ['mentorId'],
    where: { 
      mentorId: { in: mentorIds },
      rating: { not: null },
    },
    _avg: { rating: true },
    _count: { rating: true },
  });
  const ratingMap = new Map(ratings.map(r => [r.mentorId, { avg: r._avg.rating, count: r._count.rating }]));
  
  // Get session counts
  const sessionCounts = await prisma.mentorSession.groupBy({
    by: ['mentorId'],
    where: { 
      mentorId: { in: mentorIds },
      status: { in: ['scheduled', 'SCHEDULED'] },
    },
    _count: true,
  });
  const countMap = new Map(sessionCounts.map(s => [s.mentorId, s._count]));
  
  return alumniWithStories
    .filter(s => (countMap.get(s.userId || '') || 0) < 5) // Has capacity
    .map(story => ({
      id: story.userId || story.memberId,
      name: story.authorName || 'Mentor',
      expertise: story.role || '',
      bio: story.content || story.story || '',
      isAlumni: true,
      successStory: {
        id: story.id,
        title: story.title,
        snippet: story.story?.substring(0, 150) + '...',
        outcome: story.outcome,
        featuredImage: story.imageUrl,
      },
      rating: ratingMap.get(story.userId || '')?.avg?.toFixed(1) || '4.5',
      ratingCount: ratingMap.get(story.userId || '')?.count || 0,
      activeMatches: countMap.get(story.userId || '') || 0,
      maxCapacity: 5,
      badges: ['Alumni Mentor', 'Success Story'],
    }))
    .slice(0, limit);
}
