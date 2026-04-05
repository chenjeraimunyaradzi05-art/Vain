/**
 * Cultural Calendar Service
 * 
 * Manages Indigenous cultural events and significant dates for the Ngurra Pathways platform.
 * Provides culturally-sensitive scheduling, event discovery, and community engagement.
 * 
 * Features:
 * - Cultural event management (NAIDOC, Sorry Day, Reconciliation Week, etc.)
 * - Community event creation and discovery
 * - Elder-led cultural learning sessions
 * - Seasonal calendar based on traditional knowledge
 * - Event RSVP and attendance tracking
 * - Recurring cultural observances
 */

import { prisma as prismaClient } from '../lib/database';
import { logger } from '../lib/logger';
import { redisCache } from '../lib/redisCacheWrapper';
import { notificationService } from './notificationService';

const prisma = prismaClient as any;

// Types
export interface CulturalEvent {
  id: string;
  title: string;
  description: string;
  type: CulturalEventType;
  category: CulturalEventCategory;
  startDate: Date;
  endDate?: Date;
  isAllDay: boolean;
  isRecurring: boolean;
  recurrencePattern?: RecurrencePattern;
  location?: EventLocation;
  isOnline: boolean;
  meetingUrl?: string;
  organizer: EventOrganizer;
  coverImage?: string;
  culturalContext?: CulturalContext;
  attendeeCount: number;
  maxAttendees?: number;
  isPublic: boolean;
  communityRestricted?: string[]; // Specific communities only
  createdAt: Date;
  updatedAt: Date;
}

export type CulturalEventType = 
  | 'NATIONAL_OBSERVANCE'   // NAIDOC, Reconciliation Week, etc.
  | 'COMMUNITY_EVENT'       // Local community gatherings
  | 'CULTURAL_WORKSHOP'     // Learning sessions
  | 'ELDER_SESSION'         // Elder-led teachings
  | 'CEREMONY'              // Traditional ceremonies (sensitive)
  | 'ART_EXHIBITION'        // Cultural art events
  | 'MUSIC_PERFORMANCE'     // Cultural music/dance
  | 'CAREER_EVENT'          // Indigenous career fairs
  | 'NETWORKING'            // Professional networking
  | 'WELLNESS'              // Cultural wellness activities
  | 'LANGUAGE_CLASS'        // Language preservation classes
  | 'LAND_CONNECTION';      // On-country experiences

export type CulturalEventCategory =
  | 'CELEBRATION'
  | 'REMEMBRANCE'
  | 'EDUCATION'
  | 'CAREER'
  | 'WELLNESS'
  | 'COMMUNITY'
  | 'ARTS'
  | 'LANGUAGE';

export interface RecurrencePattern {
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
  interval: number;
  daysOfWeek?: number[];
  dayOfMonth?: number;
  monthOfYear?: number;
  endDate?: Date;
  count?: number;
}

export interface EventLocation {
  name: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  coordinates?: { lat: number; lng: number };
  traditionalName?: string; // Indigenous place name
  countryTerritory?: string; // Traditional country/territory
}

export interface EventOrganizer {
  id: string;
  name: string;
  type: 'USER' | 'ORGANIZATION' | 'ELDER' | 'COMMUNITY';
  avatar?: string;
  isVerified: boolean;
}

export interface CulturalContext {
  nations?: string[];           // Relevant Aboriginal/Torres Strait nations
  languages?: string[];         // Languages spoken/taught
  culturalProtocols?: string[]; // Protocols to observe
  elderInvolvement?: boolean;
  isWelcomeToAll: boolean;      // Open to non-Indigenous attendees
  specialConsiderations?: string;
}

export interface EventAttendee {
  id: string;
  userId: string;
  eventId: string;
  status: 'REGISTERED' | 'WAITLISTED' | 'ATTENDED' | 'CANCELLED' | 'NO_SHOW';
  registeredAt: Date;
  attendedAt?: Date;
}

// National cultural dates (Australian context)
const NATIONAL_CULTURAL_DATES: Array<{
  name: string;
  description: string;
  startDate: { month: number; day: number };
  endDate?: { month: number; day: number };
  type: CulturalEventType;
  category: CulturalEventCategory;
  isRecurring: boolean;
}> = [
  {
    name: 'National Sorry Day',
    description: 'A day of remembrance for the mistreatment of Aboriginal and Torres Strait Islander people who were forcibly removed from their families and communities.',
    startDate: { month: 5, day: 26 },
    type: 'NATIONAL_OBSERVANCE',
    category: 'REMEMBRANCE',
    isRecurring: true,
  },
  {
    name: 'National Reconciliation Week',
    description: 'A time for all Australians to learn about our shared histories, cultures, and achievements, and to explore how each of us can contribute to achieving reconciliation.',
    startDate: { month: 5, day: 27 },
    endDate: { month: 6, day: 3 },
    type: 'NATIONAL_OBSERVANCE',
    category: 'CELEBRATION',
    isRecurring: true,
  },
  {
    name: 'Mabo Day',
    description: 'Commemorates the historic High Court Mabo decision that recognized native title rights of Aboriginal and Torres Strait Islander peoples.',
    startDate: { month: 6, day: 3 },
    type: 'NATIONAL_OBSERVANCE',
    category: 'CELEBRATION',
    isRecurring: true,
  },
  {
    name: 'NAIDOC Week',
    description: 'A celebration of the history, culture, and achievements of Aboriginal and Torres Strait Islander peoples.',
    startDate: { month: 7, day: 7 }, // First Sunday in July (approximate)
    endDate: { month: 7, day: 14 },
    type: 'NATIONAL_OBSERVANCE',
    category: 'CELEBRATION',
    isRecurring: true,
  },
  {
    name: 'International Day of the World\'s Indigenous Peoples',
    description: 'A UN-designated day to raise awareness and protect the rights of the world\'s indigenous population.',
    startDate: { month: 8, day: 9 },
    type: 'NATIONAL_OBSERVANCE',
    category: 'CELEBRATION',
    isRecurring: true,
  },
  {
    name: 'National Aboriginal and Torres Strait Islander Children\'s Day',
    description: 'A day to celebrate Aboriginal and Torres Strait Islander children, their cultures and communities.',
    startDate: { month: 8, day: 4 },
    type: 'NATIONAL_OBSERVANCE',
    category: 'CELEBRATION',
    isRecurring: true,
  },
  {
    name: 'Anniversary of the National Apology',
    description: 'Marks the anniversary of the formal apology to the Stolen Generations by Prime Minister Kevin Rudd in 2008.',
    startDate: { month: 2, day: 13 },
    type: 'NATIONAL_OBSERVANCE',
    category: 'REMEMBRANCE',
    isRecurring: true,
  },
  {
    name: 'Close the Gap Day',
    description: 'A national day of action to achieve Indigenous health equality by 2030.',
    startDate: { month: 3, day: 21 },
    type: 'NATIONAL_OBSERVANCE',
    category: 'WELLNESS',
    isRecurring: true,
  },
];

class CulturalCalendarService {
  private static instance: CulturalCalendarService;
  private cachePrefix = 'cultural_calendar:';
  private cacheTTL = 3600; // 1 hour

  static getInstance(): CulturalCalendarService {
    if (!CulturalCalendarService.instance) {
      CulturalCalendarService.instance = new CulturalCalendarService();
    }
    return CulturalCalendarService.instance;
  }

  /**
   * Get upcoming cultural events
   */
  async getUpcomingEvents(options: {
    limit?: number;
    offset?: number;
    type?: CulturalEventType;
    category?: CulturalEventCategory;
    location?: string;
    isOnline?: boolean;
    startFrom?: Date;
    endBefore?: Date;
  } = {}): Promise<{ events: CulturalEvent[]; total: number }> {
    const { limit = 20, offset = 0, startFrom = new Date() } = options;

    try {
      const cacheKey = `${this.cachePrefix}upcoming:${JSON.stringify(options)}`;
      const cached = await redisCache.get(cacheKey);
      if (cached) {
        return JSON.parse(cached as string);
      }

      // Build where clause
      const where: any = {
        startDate: { gte: startFrom },
        isPublic: true,
      };

      if (options.type) where.type = options.type;
      if (options.category) where.category = options.category;
      if (options.isOnline !== undefined) where.isOnline = options.isOnline;
      if (options.endBefore) where.startDate.lte = options.endBefore;
      if (options.location) {
        where.OR = [
          { location: { contains: options.location, mode: 'insensitive' } },
          { city: { contains: options.location, mode: 'insensitive' } },
          { state: { contains: options.location, mode: 'insensitive' } },
        ];
      }

      const [events, total] = await Promise.all([
        prisma.culturalEvent.findMany({
          where,
          orderBy: { startDate: 'asc' },
          take: limit,
          skip: offset,
          include: {
            organizer: {
              select: { id: true, name: true },
            },
            _count: {
              select: { attendees: true },
            },
          },
        }),
        prisma.culturalEvent.count({ where }),
      ]);

      const formattedEvents = events.map(this.formatEvent);
      const result = { events: formattedEvents, total };

      await redisCache.set(cacheKey, JSON.stringify(result), this.cacheTTL);
      return result;
    } catch (error: any) {
      logger.error('Failed to fetch upcoming events', { error: error.message });
      throw error;
    }
  }

  /**
   * Get cultural events for a specific month
   */
  async getEventsForMonth(year: number, month: number): Promise<CulturalEvent[]> {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    try {
      const cacheKey = `${this.cachePrefix}month:${year}-${month}`;
      const cached = await redisCache.get(cacheKey);
      if (cached) {
        return JSON.parse(cached as string);
      }

      const events = await prisma.culturalEvent.findMany({
        where: {
          OR: [
            { startDate: { gte: startDate, lte: endDate } },
            { endDate: { gte: startDate, lte: endDate } },
          ],
          isPublic: true,
        },
        orderBy: { startDate: 'asc' },
        include: {
          organizer: {
            select: { id: true, name: true },
          },
          _count: {
            select: { attendees: true },
          },
        },
      });

      // Add national dates for this month
      const nationalEvents = this.getNationalEventsForMonth(year, month);
      const allEvents = [...events.map(this.formatEvent), ...nationalEvents];
      allEvents.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

      await redisCache.set(cacheKey, JSON.stringify(allEvents), this.cacheTTL);
      return allEvents;
    } catch (error: any) {
      logger.error('Failed to fetch events for month', { error: error.message, year, month });
      throw error;
    }
  }

  /**
   * Get national cultural events for a specific month
   */
  private getNationalEventsForMonth(year: number, month: number): CulturalEvent[] {
    return NATIONAL_CULTURAL_DATES
      .filter(date => date.startDate.month === month)
      .map(date => ({
        id: `national-${date.name.toLowerCase().replace(/\s+/g, '-')}-${year}`,
        title: date.name,
        description: date.description,
        type: date.type,
        category: date.category,
        startDate: new Date(year, date.startDate.month - 1, date.startDate.day),
        endDate: date.endDate 
          ? new Date(year, date.endDate.month - 1, date.endDate.day, 23, 59, 59)
          : undefined,
        isAllDay: true,
        isRecurring: true,
        isOnline: false,
        organizer: {
          id: 'system',
          name: 'Ngurra Pathways',
          type: 'ORGANIZATION' as const,
          isVerified: true,
        },
        attendeeCount: 0,
        isPublic: true,
        culturalContext: {
          isWelcomeToAll: true,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      }));
  }

  /**
   * Create a new cultural event
   */
  async createEvent(organizerId: string, data: {
    title: string;
    description: string;
    type: CulturalEventType;
    category: CulturalEventCategory;
    startDate: Date;
    endDate?: Date;
    isAllDay?: boolean;
    isOnline?: boolean;
    meetingUrl?: string;
    location?: Partial<EventLocation>;
    coverImage?: string;
    culturalContext?: Partial<CulturalContext>;
    maxAttendees?: number;
    isPublic?: boolean;
    communityRestricted?: string[];
  }): Promise<CulturalEvent> {
    try {
      const event = await prisma.culturalEvent.create({
        data: {
          title: data.title,
          description: data.description,
          type: data.type,
          category: data.category,
          startDate: data.startDate,
          endDate: data.endDate,
          isAllDay: data.isAllDay ?? false,
          isOnline: data.isOnline ?? false,
          meetingUrl: data.meetingUrl,
          location: data.location?.name,
          city: data.location?.city,
          state: data.location?.state,
          traditionalName: data.location?.traditionalName,
          countryTerritory: data.location?.countryTerritory,
          coverImage: data.coverImage,
          culturalContext: data.culturalContext ? JSON.stringify(data.culturalContext) : undefined,
          maxAttendees: data.maxAttendees,
          isPublic: data.isPublic ?? true,
          communityRestricted: data.communityRestricted ? JSON.stringify(data.communityRestricted) : undefined,
          organizerId,
        },
        include: {
          organizer: {
            select: { id: true, name: true },
          },
        },
      });

      // Invalidate cache
      await this.invalidateCache();

      logger.info('Cultural event created', { eventId: event.id, title: event.title });
      return this.formatEvent(event);
    } catch (error: any) {
      logger.error('Failed to create event', { error: error.message });
      throw error;
    }
  }

  /**
   * Register for an event
   */
  async registerForEvent(userId: string, eventId: string): Promise<EventAttendee> {
    try {
      const event = await prisma.culturalEvent.findUnique({
        where: { id: eventId },
        include: {
          _count: { select: { attendees: true } },
        },
      });

      if (!event) {
        throw new Error('Event not found');
      }

      // Check capacity
      if (event.maxAttendees && event._count.attendees >= event.maxAttendees) {
        // Add to waitlist
        const attendee = await prisma.eventAttendee.create({
          data: {
            userId,
            eventId,
            status: 'WAITLISTED',
          },
        });
        return attendee as EventAttendee;
      }

      // Check if already registered
      const existing = await prisma.eventAttendee.findFirst({
        where: { userId, eventId },
      });

      if (existing) {
        throw new Error('Already registered for this event');
      }

      const attendee = await prisma.eventAttendee.create({
        data: {
          userId,
          eventId,
          status: 'REGISTERED',
        },
      });

      logger.info('User registered for event', { userId, eventId });
      return attendee as EventAttendee;
    } catch (error: any) {
      logger.error('Failed to register for event', { error: error.message, userId, eventId });
      throw error;
    }
  }

  /**
   * Cancel event registration
   */
  async cancelRegistration(userId: string, eventId: string): Promise<void> {
    try {
      await prisma.eventAttendee.updateMany({
        where: { userId, eventId },
        data: { status: 'CANCELLED' },
      });

      // Check waitlist and promote if applicable
      const event = await prisma.culturalEvent.findUnique({
        where: { id: eventId },
        include: {
          attendees: {
            where: { status: 'WAITLISTED' },
            orderBy: { registeredAt: 'asc' },
            take: 1,
          },
        },
      });

      if (event?.attendees.length) {
        const promotedAttendee = await prisma.eventAttendee.update({
          where: { id: event.attendees[0].id },
          data: { status: 'REGISTERED' },
        });
        
        // Send notification to promoted user
        try {
          await notificationService.send({
            userId: promotedAttendee.userId,
            type: 'CULTURAL_EVENT',
            title: 'You\'re Off the Waitlist!',
            body: `A spot opened up for ${event.title}. You're now registered!`,
            data: { eventId, eventTitle: event.title },
            actionUrl: `/events/${eventId}`,
            priority: 'HIGH'
          });
        } catch (notifyError) {
          logger.error('Failed to send waitlist promotion notification', { error: notifyError });
        }
      }

      logger.info('User cancelled event registration', { userId, eventId });
    } catch (error: any) {
      logger.error('Failed to cancel registration', { error: error.message, userId, eventId });
      throw error;
    }
  }

  /**
   * Get user's registered events
   */
  async getUserEvents(userId: string, options: {
    status?: 'upcoming' | 'past' | 'all';
    limit?: number;
  } = {}): Promise<CulturalEvent[]> {
    const { status = 'upcoming', limit = 50 } = options;
    const now = new Date();

    const where: any = {
      attendees: {
        some: {
          userId,
          status: { in: ['REGISTERED', 'ATTENDED'] },
        },
      },
    };

    if (status === 'upcoming') {
      where.startDate = { gte: now };
    } else if (status === 'past') {
      where.startDate = { lt: now };
    }

    const events = await prisma.culturalEvent.findMany({
      where,
      orderBy: { startDate: status === 'past' ? 'desc' : 'asc' },
      take: limit,
      include: {
        organizer: {
          select: { id: true, name: true },
        },
        _count: {
          select: { attendees: true },
        },
      },
    });

    return events.map(this.formatEvent);
  }

  /**
   * Get event recommendations based on user preferences
   */
  async getRecommendedEvents(userId: string, limit = 10): Promise<CulturalEvent[]> {
    try {
      // Get user's cultural preferences
      const profile = await prisma.memberProfile.findUnique({
        where: { userId },
        select: {
          indigenousAffiliation: true,
          culturalInterests: true,
          location: true,
        },
      });

      // Get events user hasn't registered for
      const events = await prisma.culturalEvent.findMany({
        where: {
          startDate: { gte: new Date() },
          isPublic: true,
          NOT: {
            attendees: {
              some: { userId },
            },
          },
        },
        orderBy: { startDate: 'asc' },
        take: limit * 2, // Get more for filtering
        include: {
          organizer: {
            select: { id: true, name: true },
          },
          _count: {
            select: { attendees: true },
          },
        },
      });

      // Score and sort by relevance
      const scored = events
        .map(event => ({
          event,
          score: this.calculateRelevanceScore(event, profile),
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);

      return scored.map(s => this.formatEvent(s.event));
    } catch (error: any) {
      logger.error('Failed to get recommended events', { error: error.message, userId });
      return [];
    }
  }

  /**
   * Calculate relevance score for event recommendation
   */
  private calculateRelevanceScore(event: any, profile: any): number {
    let score = 0;

    // Location match
    if (profile?.location && event.city) {
      if (event.city.toLowerCase().includes(profile.location.toLowerCase())) {
        score += 30;
      } else if (event.state?.toLowerCase() === profile.location.toLowerCase()) {
        score += 15;
      }
    }

    // Online events get bonus for accessibility
    if (event.isOnline) {
      score += 10;
    }

    // Cultural interests match
    if (profile?.culturalInterests) {
      try {
        const interests = JSON.parse(profile.culturalInterests);
        if (interests.includes(event.category)) {
          score += 25;
        }
      } catch {
        // Ignore parse errors
      }
    }

    // Upcoming events within 30 days get priority
    const daysUntil = Math.ceil(
      (new Date(event.startDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    if (daysUntil <= 30) {
      score += Math.max(0, 30 - daysUntil);
    }

    // Popular events
    score += Math.min(event._count?.attendees || 0, 20);

    return score;
  }

  /**
   * Format database event to CulturalEvent
   */
  private formatEvent(dbEvent: any): CulturalEvent {
    return {
      id: dbEvent.id,
      title: dbEvent.title,
      description: dbEvent.description,
      type: dbEvent.type,
      category: dbEvent.category,
      startDate: dbEvent.startDate,
      endDate: dbEvent.endDate,
      isAllDay: dbEvent.isAllDay,
      isRecurring: dbEvent.isRecurring || false,
      location: dbEvent.location ? {
        name: dbEvent.location,
        city: dbEvent.city,
        state: dbEvent.state,
        traditionalName: dbEvent.traditionalName,
        countryTerritory: dbEvent.countryTerritory,
      } : undefined,
      isOnline: dbEvent.isOnline,
      meetingUrl: dbEvent.meetingUrl,
      organizer: dbEvent.organizer ? {
        id: dbEvent.organizer.id,
        name: dbEvent.organizer.name,
        type: 'USER',
        isVerified: false,
      } : {
        id: 'system',
        name: 'Ngurra Pathways',
        type: 'ORGANIZATION',
        isVerified: true,
      },
      coverImage: dbEvent.coverImage,
      culturalContext: dbEvent.culturalContext 
        ? JSON.parse(dbEvent.culturalContext) 
        : undefined,
      attendeeCount: dbEvent._count?.attendees || 0,
      maxAttendees: dbEvent.maxAttendees,
      isPublic: dbEvent.isPublic,
      communityRestricted: dbEvent.communityRestricted 
        ? JSON.parse(dbEvent.communityRestricted) 
        : undefined,
      createdAt: dbEvent.createdAt,
      updatedAt: dbEvent.updatedAt,
    };
  }

  /**
   * Invalidate calendar cache
   */
  private async invalidateCache(): Promise<void> {
    // Clear cache keys matching pattern
    await redisCache.delete(`${this.cachePrefix}*`);
  }
}

// Export singleton instance
export const culturalCalendarService = CulturalCalendarService.getInstance();

// Export class for testing
export { CulturalCalendarService };


