/**
 * Wellness Service
 * Phase 2 Steps 176-200: Wellness check-ins, cultural events, affirmations, sister matching
 */

import { prisma } from '../db';
import type { WellnessMood } from '@prisma/client';

// ==========================================
// Wellness Check-Ins (Steps 177-185)
// ==========================================

interface WellnessCheckInInput {
  mood: WellnessMood;
  moodNote?: string;
  energyLevel?: number;
  sleepHours?: number;
  sleepQuality?: number;
  stressLevel?: number;
  gratitude?: string;
  dailyGoals?: string[];
  selfCareActivities?: string[];
  connectedWithSomeone?: boolean;
  connectionNote?: string;
}

/**
 * Create or update today's wellness check-in
 */
export async function createCheckIn(userId: string, input: WellnessCheckInInput) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const checkIn = await prisma.wellnessCheckIn.upsert({
    where: {
      userId_date: {
        userId,
        date: today,
      },
    },
    create: {
      userId,
      date: today,
      mood: input.mood,
      moodNote: input.moodNote,
      energyLevel: input.energyLevel,
      sleepHours: input.sleepHours,
      sleepQuality: input.sleepQuality,
      stressLevel: input.stressLevel,
      gratitude: input.gratitude,
      dailyGoals: input.dailyGoals || [],
      selfCareActivities: input.selfCareActivities || [],
      connectedWithSomeone: input.connectedWithSomeone || false,
      connectionNote: input.connectionNote,
      goalsCompleted: [],
    },
    update: {
      mood: input.mood,
      moodNote: input.moodNote,
      energyLevel: input.energyLevel,
      sleepHours: input.sleepHours,
      sleepQuality: input.sleepQuality,
      stressLevel: input.stressLevel,
      gratitude: input.gratitude,
      dailyGoals: input.dailyGoals,
      selfCareActivities: input.selfCareActivities,
      connectedWithSomeone: input.connectedWithSomeone,
      connectionNote: input.connectionNote,
    },
  });

  return checkIn;
}

/**
 * Mark a goal as completed
 */
export async function completeGoal(userId: string, goal: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const checkIn = await prisma.wellnessCheckIn.findUnique({
    where: {
      userId_date: { userId, date: today },
    },
  });

  if (!checkIn) {
    throw new Error('No check-in found for today');
  }

  const goalsCompleted = [...(checkIn.goalsCompleted || [])];
  if (!goalsCompleted.includes(goal)) {
    goalsCompleted.push(goal);
  }

  return prisma.wellnessCheckIn.update({
    where: { id: checkIn.id },
    data: { goalsCompleted },
  });
}

/**
 * Get wellness history
 */
export async function getWellnessHistory(
  userId: string,
  options?: { days?: number; startDate?: Date; endDate?: Date }
) {
  const days = options?.days || 30;
  const endDate = options?.endDate || new Date();
  const startDate = options?.startDate || new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const checkIns = await prisma.wellnessCheckIn.findMany({
    where: {
      userId,
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
    orderBy: { date: 'desc' },
  });

  return checkIns;
}

/**
 * Get wellness insights/analytics
 */
export async function getWellnessInsights(userId: string, days = 30) {
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const checkIns = await prisma.wellnessCheckIn.findMany({
    where: {
      userId,
      date: { gte: startDate },
    },
  });

  if (checkIns.length === 0) {
    return null;
  }

  // Calculate averages
  const moodCounts: Record<string, number> = {};
  let totalEnergy = 0;
  let totalSleep = 0;
  let totalStress = 0;
  let energyCount = 0;
  let sleepCount = 0;
  let stressCount = 0;
  let connectionDays = 0;

  checkIns.forEach(c => {
    moodCounts[c.mood] = (moodCounts[c.mood] || 0) + 1;
    if (c.energyLevel) {
      totalEnergy += c.energyLevel;
      energyCount++;
    }
    if (c.sleepHours) {
      totalSleep += c.sleepHours;
      sleepCount++;
    }
    if (c.stressLevel) {
      totalStress += c.stressLevel;
      stressCount++;
    }
    if (c.connectedWithSomeone) {
      connectionDays++;
    }
  });

  const dominantMood = Object.entries(moodCounts).sort((a, b) => b[1] - a[1])[0]?.[0];

  return {
    totalCheckIns: checkIns.length,
    dominantMood,
    moodDistribution: moodCounts,
    averageEnergy: energyCount > 0 ? totalEnergy / energyCount : null,
    averageSleep: sleepCount > 0 ? totalSleep / sleepCount : null,
    averageStress: stressCount > 0 ? totalStress / stressCount : null,
    connectionDays,
    connectionRate: connectionDays / checkIns.length,
  };
}

/**
 * Get today's check-in
 */
export async function getTodayCheckIn(userId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return prisma.wellnessCheckIn.findUnique({
    where: {
      userId_date: { userId, date: today },
    },
  });
}

// ==========================================
// Self-Care Activities
// ==========================================

export const SELF_CARE_ACTIVITIES = [
  'meditation',
  'exercise',
  'journaling',
  'reading',
  'nature_walk',
  'yoga',
  'creative_activity',
  'music',
  'cooking',
  'bath_self_care',
  'social_time',
  'therapy_session',
  'cultural_practice',
  'rest',
  'hobby',
  'digital_detox',
];

// ==========================================
// Cultural Events (Steps 186-190)
// ==========================================

interface CreateEventInput {
  title: string;
  description?: string;
  eventType: string;
  startDate: Date;
  endDate?: Date;
  isAllDay?: boolean;
  timezone?: string;
  location?: string;
  isOnline?: boolean;
  meetingUrl?: string;
  nation?: string;
  isRestricted?: boolean;
  restrictionNote?: string;
  maxAttendees?: number;
  isPublic?: boolean;
}

/**
 * Create a cultural event
 */
export async function createCulturalEvent(organizerId: string, input: CreateEventInput) {
  const event = await prisma.culturalEvent.create({
    data: {
      organizerId,
      title: input.title,
      description: input.description,
      eventType: input.eventType,
      startDate: input.startDate,
      endDate: input.endDate,
      isAllDay: input.isAllDay ?? true,
      timezone: input.timezone || 'Australia/Sydney',
      location: input.location,
      isOnline: input.isOnline || false,
      meetingUrl: input.meetingUrl,
      nation: input.nation,
      isRestricted: input.isRestricted || false,
      restrictionNote: input.restrictionNote,
      maxAttendees: input.maxAttendees,
      isPublic: input.isPublic ?? true,
    },
  });

  return event;
}

/**
 * Get upcoming cultural events
 */
export async function getUpcomingEvents(options?: {
  eventType?: string;
  nation?: string;
  includeRestricted?: boolean;
  limit?: number;
}) {
  const where: any = {
    isPublic: true,
    startDate: { gte: new Date() },
  };

  if (options?.eventType) {
    where.eventType = options.eventType;
  }
  if (options?.nation) {
    where.nation = options.nation;
  }
  if (!options?.includeRestricted) {
    where.isRestricted = false;
  }

  return prisma.culturalEvent.findMany({
    where,
    orderBy: { startDate: 'asc' },
    take: options?.limit || 20,
    include: {
      organizer: {
        select: {
          id: true,
          name: true,
        },
      },
      _count: {
        select: { attendees: true },
      },
    },
  });
}

/**
 * RSVP to an event
 */
export async function rsvpToEvent(
  userId: string,
  eventId: string,
  status: 'going' | 'maybe' | 'interested'
) {
  const event = await prisma.culturalEvent.findUnique({
    where: { id: eventId },
    include: { _count: { select: { attendees: true } } },
  });

  if (!event) {
    throw new Error('Event not found');
  }

  if (event.maxAttendees && event._count.attendees >= event.maxAttendees && status === 'going') {
    throw new Error('Event is full');
  }

  const attendee = await prisma.culturalEventAttendee.upsert({
    where: {
      eventId_userId: { eventId, userId },
    },
    create: {
      eventId,
      userId,
      status,
    },
    update: {
      status,
    },
  });

  // Update attendee count
  const goingCount = await prisma.culturalEventAttendee.count({
    where: { eventId, status: 'going' },
  });

  await prisma.culturalEvent.update({
    where: { id: eventId },
    data: { attendeeCount: goingCount },
  });

  return attendee;
}

/**
 * Get user's events
 */
export async function getUserEvents(userId: string) {
  const attendances = await prisma.culturalEventAttendee.findMany({
    where: { userId },
    include: {
      event: true,
    },
    orderBy: { event: { startDate: 'asc' } },
  });

  return attendances;
}

// ==========================================
// Affirmations (Steps 191-195)
// ==========================================

/**
 * Get a random daily affirmation
 */
export async function getDailyAffirmation(options?: {
  category?: string;
  isFirstNations?: boolean;
}) {
  const where: any = { isActive: true };

  if (options?.category) {
    where.category = options.category;
  }
  if (options?.isFirstNations) {
    where.isFirstNations = true;
  }

  // Get count for random selection
  const count = await prisma.dailyAffirmation.count({ where });
  if (count === 0) return null;

  const skip = Math.floor(Math.random() * count);

  const affirmation = await prisma.dailyAffirmation.findFirst({
    where,
    skip,
  });

  // Increment view count
  if (affirmation) {
    await prisma.dailyAffirmation.update({
      where: { id: affirmation.id },
      data: { viewCount: { increment: 1 } },
    });
  }

  return affirmation;
}

/**
 * Like an affirmation
 */
export async function likeAffirmation(affirmationId: string) {
  return prisma.dailyAffirmation.update({
    where: { id: affirmationId },
    data: { likeCount: { increment: 1 } },
  });
}

/**
 * Get affirmations by category
 */
export async function getAffirmationsByCategory(category: string, limit = 10) {
  return prisma.dailyAffirmation.findMany({
    where: { category, isActive: true },
    orderBy: { likeCount: 'desc' },
    take: limit,
  });
}

// ==========================================
// Sister Matching (Steps 196-200)
// ==========================================

interface RequestMatchInput {
  targetUserId: string;
  matchReason?: string;
}

/**
 * Request a sister match (peer connection)
 */
export async function requestSisterMatch(initiatorId: string, input: RequestMatchInput) {
  // Check if match already exists
  const existing = await prisma.sisterMatch.findFirst({
    where: {
      OR: [
        { user1Id: initiatorId, user2Id: input.targetUserId },
        { user1Id: input.targetUserId, user2Id: initiatorId },
      ],
    },
  });

  if (existing) {
    if (existing.status === 'ended') {
      // Allow re-matching if previous match ended
      return prisma.sisterMatch.update({
        where: { id: existing.id },
        data: {
          status: 'pending',
          initiatedBy: initiatorId,
          matchReason: input.matchReason,
          acceptedAt: null,
        },
      });
    }
    throw new Error('A connection already exists');
  }

  const match = await prisma.sisterMatch.create({
    data: {
      user1Id: initiatorId,
      user2Id: input.targetUserId,
      initiatedBy: initiatorId,
      matchReason: input.matchReason,
      status: 'pending',
    },
  });

  return match;
}

/**
 * Respond to a sister match request
 */
export async function respondToMatch(
  matchId: string,
  userId: string,
  accept: boolean
) {
  const match = await prisma.sisterMatch.findUnique({
    where: { id: matchId },
  });

  if (!match) {
    throw new Error('Match not found');
  }

  // Must be the recipient
  const isRecipient = 
    (match.user1Id === userId && match.initiatedBy !== userId) ||
    (match.user2Id === userId && match.initiatedBy !== userId);

  if (!isRecipient) {
    throw new Error('You cannot respond to this request');
  }

  return prisma.sisterMatch.update({
    where: { id: matchId },
    data: {
      status: accept ? 'accepted' : 'declined',
      acceptedAt: accept ? new Date() : null,
    },
  });
}

/**
 * Get user's sister matches
 */
export async function getSisterMatches(userId: string, status?: string) {
  const matches = await prisma.sisterMatch.findMany({
    where: {
      OR: [{ user1Id: userId }, { user2Id: userId }],
      ...(status && { status }),
    },
    include: {
      user1: {
        select: {
          id: true,
          name: true,
          avatarUrl: true,
        },
      },
      user2: {
        select: {
          id: true,
          name: true,
          avatarUrl: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Transform to show the "other" user
  return matches.map(match => ({
    ...match,
    otherUser: match.user1Id === userId ? match.user2 : match.user1,
    isInitiator: match.initiatedBy === userId,
  }));
}

/**
 * Get pending match requests
 */
export async function getPendingMatchRequests(userId: string) {
  const matches = await prisma.sisterMatch.findMany({
    where: {
      OR: [{ user1Id: userId }, { user2Id: userId }],
      status: 'pending',
      initiatedBy: { not: userId }, // Requests sent TO this user
    },
    include: {
      user1: {
        select: { id: true, name: true, avatarUrl: true },
      },
      user2: {
        select: { id: true, name: true, avatarUrl: true },
      },
    },
  });

  return matches.map(match => ({
    ...match,
    fromUser: match.user1Id === match.initiatedBy ? match.user1 : match.user2,
  }));
}

/**
 * End a sister match
 */
export async function endSisterMatch(matchId: string, userId: string) {
  const match = await prisma.sisterMatch.findUnique({
    where: { id: matchId },
  });

  if (!match || (match.user1Id !== userId && match.user2Id !== userId)) {
    throw new Error('Match not found');
  }

  return prisma.sisterMatch.update({
    where: { id: matchId },
    data: { status: 'ended' },
  });
}

/**
 * Record interaction with sister match
 */
export async function recordMatchInteraction(matchId: string, userId: string) {
  const match = await prisma.sisterMatch.findUnique({
    where: { id: matchId },
  });

  if (!match || (match.user1Id !== userId && match.user2Id !== userId)) {
    throw new Error('Match not found');
  }

  return prisma.sisterMatch.update({
    where: { id: matchId },
    data: { lastInteractionAt: new Date() },
  });
}

export const wellnessService = {
  createCheckIn,
  completeGoal,
  getWellnessHistory,
  getWellnessInsights,
  getTodayCheckIn,
  SELF_CARE_ACTIVITIES,
  createCulturalEvent,
  getUpcomingEvents,
  rsvpToEvent,
  getUserEvents,
  getDailyAffirmation,
  likeAffirmation,
  getAffirmationsByCategory,
  requestSisterMatch,
  respondToMatch,
  getSisterMatches,
  getPendingMatchRequests,
  endSisterMatch,
  recordMatchInteraction,
};
