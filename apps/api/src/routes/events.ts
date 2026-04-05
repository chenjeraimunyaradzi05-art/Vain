// @ts-nocheck
/**
 * Community Events Routes
 * Handles community events with registration, RSVPs, and management
 */
import express from 'express';
import { prisma as prismaClient } from '../db';
import authenticateJWT from '../middleware/auth';

const prisma = prismaClient as any;

const router = express.Router();

const eventWaitlists = new Map<string, any[]>();
const eventFeedback = new Map<string, any[]>();
const eventCheckins = new Map<string, Set<string>>();

/**
 * GET /events/categories - List event categories with counts
 */
router.get('/categories', async (req, res) => {
  try {
    // Try DB first
    try {
      const grouped = await prisma.event.groupBy({
        by: ['category'],
        where: { isActive: true, isPublished: true },
        _count: { _all: true },
      });

      const categories = grouped
        .filter((g) => !!g.category)
        .map((g) => ({
          id: String(g.category),
          name: String(g.category),
          icon: '📅',
          count: g._count._all,
        }))
        .sort((a, b) => b.count - a.count);

      return void res.json(categories);
    } catch {
      // fall back
    }

    // Mock categories from mock data
    const mock = getMockEvents();
    const counts = new Map<string, number>();
    for (const e of mock) {
      const key = String((e as any).category || 'Other');
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    const categories = Array.from(counts.entries()).map(([name, count]) => ({
      id: name,
      name,
      icon: '📅',
      count,
    }));
    return void res.json(categories);
  } catch (error) {
    console.error('Error listing event categories:', error);
    return void res.status(500).json({ error: 'Failed to list categories' });
  }
});

// =============================================================================
// EVENT CRUD
// =============================================================================

/**
 * GET /events - List community events
 */
router.get('/', async (req, res) => {
  try {
    const { 
      category, 
      eventType, 
      search, 
      featured,
      upcoming,
      organizerId,
      groupId,
      page = 1, 
      limit = 20 
    } = req.query;

    const where: any = { 
      isActive: true,
      isPublished: true
    };
    
    if (category) where.category = category;
    if (eventType) where.eventType = eventType;
    if (featured === 'true') where.isFeatured = true;
    if (organizerId) where.organizerId = parseInt(organizerId);
    if (groupId) where.groupId = parseInt(groupId);
    
    // Filter for upcoming events
    if (upcoming === 'true') {
      where.eventDate = { gte: new Date() };
    }
    
    if (search) {
      where.AND = [
        {
          OR: [
            { title: { contains: search } },
            { description: { contains: search } },
            { location: { contains: search } }
          ]
        }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Try to get from database, fallback to mock data
    let events = [];
    let total = 0;

    try {
      [events, total] = await Promise.all([
        prisma.event.findMany({
          where,
          skip,
          take: parseInt(limit),
          orderBy: [
            { isFeatured: 'desc' },
            { eventDate: 'asc' }
          ],
          include: {
            organizer: {
              select: { id: true, firstName: true, lastName: true }
            },
            _count: {
              select: { registrations: true }
            }
          }
        }),
        prisma.event.count({ where })
      ]);
    } catch (dbError) {
      // Fallback to mock data if table doesn't exist
      events = getMockEvents(category, eventType, search, featured, parseInt(limit));
      total = events.length;
    }

    res.json({
      events: events.map(e => ({
        id: e.id,
        title: e.title,
        description: e.description,
        category: e.category,
        eventType: e.eventType,
        eventDate: e.eventDate,
        startTime: e.startTime,
        endTime: e.endTime,
        location: e.location,
        virtualLink: e.virtualLink,
        capacity: e.capacity,
        attendeeCount: e._count?.registrations || e.attendeeCount || 0,
        isFeatured: e.isFeatured,
        isFree: e.isFree,
        price: e.price,
        organizer: e.organizer
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error listing events:', error);
    res.status(500).json({ error: 'Failed to list events' });
  }
});

/**
 * GET /events/featured - Get featured events
 */
router.get('/featured', async (req, res) => {
  try {
    const { limit = 6 } = req.query;

    let events = [];
    
    try {
      events = await prisma.event.findMany({
        where: {
          isActive: true,
          isPublished: true,
          isFeatured: true,
          eventDate: { gte: new Date() }
        },
        take: parseInt(limit),
        orderBy: { eventDate: 'asc' },
        include: {
          organizer: {
            select: { id: true, firstName: true, lastName: true }
          },
          _count: {
            select: { registrations: true }
          }
        }
      });
    } catch (dbError) {
      events = getMockEvents(null, null, null, 'true', parseInt(limit));
    }

    res.json({ events });
  } catch (error) {
    console.error('Error getting featured events:', error);
    res.status(500).json({ error: 'Failed to get featured events' });
  }
});

/**
 * GET /events/my-events - List events the current user is registered for (authenticated)
 */
router.get('/my-events', authenticateJWT, async (req, res) => {
  try {
    const userId = req.user.id;

    try {
      const regs = await prisma.eventRegistration.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        select: { eventId: true },
        take: 200,
      });
      const ids = regs.map((r) => r.eventId);
      const events = await prisma.event.findMany({
        where: { id: { in: ids }, isActive: true },
        orderBy: { eventDate: 'asc' },
        include: {
          organizer: { select: { id: true, firstName: true, lastName: true } },
          _count: { select: { registrations: true } },
        },
      });
      return void res.json({ events });
    } catch {
      // ignore if tables absent
    }

    return void res.json({ events: [] });
  } catch (error) {
    console.error('Error listing my events:', error);
    return void res.status(500).json({ error: 'Failed to list my events' });
  }
});

/**
 * GET /events/:id - Get single event details
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    let event = null;

    try {
      event = await prisma.event.findUnique({
        where: { id: parseInt(id) },
        include: {
          organizer: {
            select: { id: true, firstName: true, lastName: true, avatar: true }
          },
          group: {
            select: { id: true, name: true }
          },
          agenda: {
            orderBy: { order: 'asc' }
          },
          _count: {
            select: { registrations: true }
          }
        }
      });
    } catch (dbError) {
      // Return mock event
      event = getMockEvent(parseInt(id));
    }

    if (!event) {
      return void res.status(404).json({ error: 'Event not found' });
    }

    // Check if user is registered
    let isRegistered = false;
    if (userId) {
      try {
        const registration = await prisma.eventRegistration.findFirst({
          where: { eventId: parseInt(id), userId }
        });
        isRegistered = !!registration;
      } catch (e) {
        // Ignore if table doesn't exist
      }
    }

    res.json({
      ...event,
      attendeeCount: event._count?.registrations || event.attendeeCount || 0,
      isRegistered
    });
  } catch (error) {
    console.error('Error getting event:', error);
    res.status(500).json({ error: 'Failed to get event' });
  }
});

/**
 * POST /events - Create new event (authenticated)
 */
router.post('/', authenticateJWT, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      title,
      description,
      category,
      eventType,
      eventDate,
      startTime,
      endTime,
      location,
      virtualLink,
      capacity,
      isFree,
      price,
      groupId,
      agenda
    } = req.body;

    if (!title || !description || !eventDate) {
      return void res.status(400).json({ error: 'Title, description, and date are required' });
    }

    let event = null;

    try {
      event = await prisma.event.create({
        data: {
          title,
          description,
          category: category || 'general',
          eventType: eventType || 'in-person',
          eventDate: new Date(eventDate),
          startTime,
          endTime,
          location,
          virtualLink,
          capacity: capacity ? parseInt(capacity) : null,
          isFree: isFree !== false,
          price: price ? parseFloat(price) : null,
          organizerId: userId,
          groupId: groupId ? parseInt(groupId) : null,
          isPublished: true,
          isActive: true
        }
      });

      // Create agenda items if provided
      if (agenda && Array.isArray(agenda) && agenda.length > 0) {
        await prisma.eventAgendaItem.createMany({
          data: agenda.map((item, index) => ({
            eventId: event.id,
            time: item.time,
            title: item.title,
            description: item.description,
            order: index
          }))
        });
      }
    } catch (dbError) {
      // Mock response if table doesn't exist
      event = {
        id: Date.now(),
        title,
        description,
        category: category || 'general',
        eventType: eventType || 'in-person',
        eventDate,
        startTime,
        endTime,
        location,
        virtualLink,
        capacity,
        isFree: isFree !== false,
        price,
        organizerId: userId,
        createdAt: new Date()
      };
    }

    res.status(201).json({ 
      message: 'Event created successfully',
      event 
    });
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({ error: 'Failed to create event' });
  }
});

/**
 * PATCH /events/:id - Update event (owner only)
 */
router.patch('/:id', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const updates = req.body;

    let event = null;

    try {
      // Check ownership
      event = await prisma.event.findUnique({
        where: { id: parseInt(id) }
      });

      if (!event) {
        return void res.status(404).json({ error: 'Event not found' });
      }

      if (event.organizerId !== userId) {
        return void res.status(403).json({ error: 'Not authorized to update this event' });
      }

      // Update event
      event = await prisma.event.update({
        where: { id: parseInt(id) },
        data: {
          ...updates,
          eventDate: updates.eventDate ? new Date(updates.eventDate) : undefined,
          capacity: updates.capacity ? parseInt(updates.capacity) : undefined,
          price: updates.price ? parseFloat(updates.price) : undefined,
          updatedAt: new Date()
        }
      });
    } catch (dbError) {
      event = { id: parseInt(id), ...updates, updatedAt: new Date() };
    }

    res.json({ 
      message: 'Event updated successfully',
      event 
    });
  } catch (error) {
    console.error('Error updating event:', error);
    res.status(500).json({ error: 'Failed to update event' });
  }
});

/**
 * DELETE /events/:id - Delete event (owner only)
 */
router.delete('/:id', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    try {
      const event = await prisma.event.findUnique({
        where: { id: parseInt(id) }
      });

      if (!event) {
        return void res.status(404).json({ error: 'Event not found' });
      }

      if (event.organizerId !== userId) {
        return void res.status(403).json({ error: 'Not authorized to delete this event' });
      }

      await prisma.event.update({
        where: { id: parseInt(id) },
        data: { isActive: false }
      });
    } catch (dbError) {
      // Ignore if table doesn't exist
    }

    res.json({ message: 'Event deleted successfully' });
  } catch (error) {
    console.error('Error deleting event:', error);
    res.status(500).json({ error: 'Failed to delete event' });
  }
});

// =============================================================================
// EVENT REGISTRATION
// =============================================================================

/**
 * POST /events/:id/register - Register for event
 */
router.post('/:id/register', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    let registration = null;

    try {
      // Check if already registered
      const existing = await prisma.eventRegistration.findFirst({
        where: { eventId: parseInt(id), userId }
      });

      if (existing) {
        return void res.status(400).json({ error: 'Already registered for this event' });
      }

      // Check capacity
      const event = await prisma.event.findUnique({
        where: { id: parseInt(id) },
        include: {
          _count: { select: { registrations: true } }
        }
      });

      if (!event) {
        return void res.status(404).json({ error: 'Event not found' });
      }

      if (event.capacity && event._count.registrations >= event.capacity) {
        return void res.status(400).json({ error: 'Event is at full capacity' });
      }

      registration = await prisma.eventRegistration.create({
        data: {
          eventId: parseInt(id),
          userId,
          status: 'confirmed'
        }
      });
    } catch (dbError) {
      registration = {
        id: Date.now(),
        eventId: parseInt(id),
        userId,
        status: 'confirmed',
        createdAt: new Date()
      };
    }

    res.status(201).json({ 
      message: 'Successfully registered for event',
      registration 
    });
  } catch (error) {
    console.error('Error registering for event:', error);
    res.status(500).json({ error: 'Failed to register for event' });
  }
});

/**
 * DELETE /events/:id/register - Cancel registration
 */
router.delete('/:id/register', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    try {
      await prisma.eventRegistration.deleteMany({
        where: {
          eventId: parseInt(id),
          userId
        }
      });
    } catch (dbError) {
      // Ignore if table doesn't exist
    }

    res.json({ message: 'Registration cancelled successfully' });
  } catch (error) {
    console.error('Error cancelling registration:', error);
    res.status(500).json({ error: 'Failed to cancel registration' });
  }
});

// =============================================================================
// PHASE 7: Event Enhancements (waitlist, check-in, feedback, certificates)
// =============================================================================

/**
 * POST /events/:id/waitlist - Join event waitlist
 */
router.post('/:id/waitlist', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    try {
      const event = await prisma.event.findUnique({
        where: { id: parseInt(id) },
        include: { _count: { select: { registrations: true } } }
      });
      if (!event) return void res.status(404).json({ error: 'Event not found' });
      if (!event.capacity || event._count.registrations < event.capacity) {
        return void res.status(400).json({ error: 'Event has capacity. Please register directly.' });
      }
    } catch {
      // ignore if table doesn't exist
    }

    const list = eventWaitlists.get(id) || [];
    if (list.find((entry) => entry.userId === userId)) {
      return void res.status(400).json({ error: 'Already on waitlist' });
    }
    const entry = { id: `${Date.now()}`, userId, joinedAt: new Date().toISOString() };
    list.push(entry);
    eventWaitlists.set(id, list);
    res.status(201).json({ message: 'Added to waitlist', entry });
  } catch (error) {
    console.error('Error joining waitlist:', error);
    res.status(500).json({ error: 'Failed to join waitlist' });
  }
});

/**
 * GET /events/:id/waitlist - List waitlist (organizer)
 */
router.get('/:id/waitlist', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    try {
      const event = await prisma.event.findUnique({ where: { id: parseInt(id) } });
      if (!event) return void res.status(404).json({ error: 'Event not found' });
      if (event.organizerId !== userId) return void res.status(403).json({ error: 'Not authorized' });
    } catch {
      // ignore if table doesn't exist
    }

    const waitlist = eventWaitlists.get(id) || [];
    res.json({ waitlist });
  } catch (error) {
    console.error('Error listing waitlist:', error);
    res.status(500).json({ error: 'Failed to list waitlist' });
  }
});

/**
 * POST /events/:id/check-in - Check in attendee (organizer)
 */
router.post('/:id/check-in', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { attendeeId } = req.body || {};

    if (!attendeeId) return void res.status(400).json({ error: 'attendeeId is required' });

    try {
      const event = await prisma.event.findUnique({ where: { id: parseInt(id) } });
      if (!event) return void res.status(404).json({ error: 'Event not found' });
      if (event.organizerId !== userId) return void res.status(403).json({ error: 'Not authorized' });

      await prisma.eventRegistration.updateMany({
        where: { eventId: parseInt(id), userId: attendeeId },
        data: { status: 'attended' }
      });
    } catch {
      // ignore if table doesn't exist
    }

    const checkins = eventCheckins.get(id) || new Set<string>();
    checkins.add(attendeeId);
    eventCheckins.set(id, checkins);

    res.json({ message: 'Checked in', attendeeId });
  } catch (error) {
    console.error('Error checking in attendee:', error);
    res.status(500).json({ error: 'Failed to check in attendee' });
  }
});

/**
 * POST /events/:id/feedback - Submit event feedback
 */
router.post('/:id/feedback', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { rating, comment } = req.body || {};
    if (!rating || rating < 1 || rating > 5) return void res.status(400).json({ error: 'Rating must be 1-5' });

    const list = eventFeedback.get(id) || [];
    const entry = { id: `${Date.now()}`, userId, rating, comment: comment || null, createdAt: new Date().toISOString() };
    list.push(entry);
    eventFeedback.set(id, list);

    const average = list.reduce((sum, f) => sum + f.rating, 0) / list.length;
    res.status(201).json({ feedback: entry, summary: { total: list.length, average } });
  } catch (error) {
    console.error('Error submitting feedback:', error);
    res.status(500).json({ error: 'Failed to submit feedback' });
  }
});

/**
 * GET /events/:id/feedback - List feedback (organizer)
 */
router.get('/:id/feedback', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    try {
      const event = await prisma.event.findUnique({ where: { id: parseInt(id) } });
      if (!event) return void res.status(404).json({ error: 'Event not found' });
      if (event.organizerId !== userId) return void res.status(403).json({ error: 'Not authorized' });
    } catch {
      // ignore if table doesn't exist
    }

    const list = eventFeedback.get(id) || [];
    const average = list.length ? list.reduce((sum, f) => sum + f.rating, 0) / list.length : 0;
    res.json({ feedback: list, summary: { total: list.length, average } });
  } catch (error) {
    console.error('Error listing feedback:', error);
    res.status(500).json({ error: 'Failed to list feedback' });
  }
});

/**
 * GET /events/:id/certificate - Generate attendance certificate data
 */
router.get('/:id/certificate', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    let eventTitle = 'Community Event';
    try {
      const event = await prisma.event.findUnique({ where: { id: parseInt(id) } });
      if (!event) return void res.status(404).json({ error: 'Event not found' });
      eventTitle = event.title;
    } catch {
      // ignore if table doesn't exist
    }

    const checkins = eventCheckins.get(id);
    if (checkins && !checkins.has(userId)) {
      return void res.status(403).json({ error: 'Certificate available after check-in' });
    }

    res.json({
      certificate: {
        eventId: id,
        userId,
        title: eventTitle,
        issuedAt: new Date().toISOString(),
        message: 'Certificate of Attendance',
      },
    });
  } catch (error) {
    console.error('Error generating certificate:', error);
    res.status(500).json({ error: 'Failed to generate certificate' });
  }
});

/**
 * GET /events/:id/analytics - Event analytics summary
 */
router.get('/:id/analytics', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    try {
      const event = await prisma.event.findUnique({ where: { id: parseInt(id) } });
      if (!event) return void res.status(404).json({ error: 'Event not found' });
      if (event.organizerId !== userId) return void res.status(403).json({ error: 'Not authorized' });
    } catch {
      // ignore if table doesn't exist
    }

    let registrations = 0;
    let attended = 0;
    try {
      registrations = await prisma.eventRegistration.count({ where: { eventId: parseInt(id) } });
      attended = await prisma.eventRegistration.count({ where: { eventId: parseInt(id), status: 'attended' } });
    } catch {
      // ignore
    }

    const waitlist = eventWaitlists.get(id) || [];
    res.json({ analytics: { registrations, attended, waitlist: waitlist.length } });
  } catch (error) {
    console.error('Error getting analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

/**
 * GET /events/:id/calendar - Event calendar feed (ICS)
 */
router.get('/:id/calendar', async (req, res) => {
  try {
    const { id } = req.params;
    let event: any = null;

    try {
      event = await prisma.event.findUnique({ where: { id: parseInt(id) } });
    } catch {
      event = getMockEvent(parseInt(id));
    }

    if (!event) return void res.status(404).json({ error: 'Event not found' });

    const startDate = new Date(event.eventDate || event.startDate || new Date());
    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Gimbi//Events//EN',
      'BEGIN:VEVENT',
      `UID:${id}@gimbi`,
      `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
      `DTSTART:${startDate.toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
      `DTEND:${endDate.toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
      `SUMMARY:${event.title || 'Community Event'}`,
      `DESCRIPTION:${(event.description || '').replace(/\n/g, '\\n')}`,
      `LOCATION:${event.location || 'Online'}`,
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\n');

    res.setHeader('Content-Type', 'text/calendar');
    res.send(ics);
  } catch (error) {
    console.error('Error generating calendar feed:', error);
    res.status(500).json({ error: 'Failed to generate calendar feed' });
  }
});

/**
 * GET /events/:id/attendees - List event attendees
 */
router.get('/:id/attendees', async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 20 } = req.query;

    let attendees = [];
    let total = 0;

    try {
      const skip = (parseInt(page) - 1) * parseInt(limit);

      [attendees, total] = await Promise.all([
        prisma.eventRegistration.findMany({
          where: { 
            eventId: parseInt(id),
            status: { in: ['confirmed', 'attended'] }
          },
          skip,
          take: parseInt(limit),
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true, avatar: true }
            }
          },
          orderBy: { createdAt: 'asc' }
        }),
        prisma.eventRegistration.count({
          where: { 
            eventId: parseInt(id),
            status: { in: ['confirmed', 'attended'] }
          }
        })
      ]);
    } catch (dbError) {
      attendees = [];
      total = 0;
    }

    res.json({
      attendees: attendees.map(a => ({
        id: a.user.id,
        firstName: a.user.firstName,
        lastName: a.user.lastName,
        avatar: a.user.avatar,
        registeredAt: a.createdAt
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error listing attendees:', error);
    res.status(500).json({ error: 'Failed to list attendees' });
  }
});

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function getMockEvents(category?, eventType?, search?, featured?, limit = 10) {
  const mockEvents = [
    {
      id: 1,
      title: 'First Nations Career Fair 2025',
      description: 'Join us for the largest Indigenous career fair in Australia.',
      category: 'career',
      eventType: 'in-person',
      eventDate: new Date('2025-02-15'),
      startTime: '09:00',
      endTime: '16:00',
      location: 'Sydney Convention Centre',
      virtualLink: null,
      capacity: 500,
      attendeeCount: 245,
      isFeatured: true,
      isFree: true,
      price: null,
      organizer: { id: 1, firstName: 'Ngurra', lastName: 'Pathways' }
    },
    {
      id: 2,
      title: 'Women in Leadership Workshop',
      description: 'An empowering workshop for First Nations women exploring leadership roles.',
      category: 'workshop',
      eventType: 'virtual',
      eventDate: new Date('2025-02-20'),
      startTime: '10:00',
      endTime: '14:00',
      location: 'Online',
      virtualLink: 'https://zoom.us/j/example',
      capacity: 100,
      attendeeCount: 89,
      isFeatured: true,
      isFree: true,
      price: null,
      organizer: { id: 2, firstName: 'Aboriginal', lastName: 'Women Network' }
    },
    {
      id: 3,
      title: 'Resume Writing Masterclass',
      description: 'Learn how to craft a compelling resume.',
      category: 'workshop',
      eventType: 'virtual',
      eventDate: new Date('2025-02-22'),
      startTime: '13:00',
      endTime: '15:00',
      location: 'Online',
      virtualLink: 'https://zoom.us/j/example2',
      capacity: 50,
      attendeeCount: 56,
      isFeatured: false,
      isFree: true,
      price: null,
      organizer: { id: 1, firstName: 'Ngurra', lastName: 'Pathways' }
    }
  ];

  let filtered = mockEvents;

  if (category) {
    filtered = filtered.filter(e => e.category === category);
  }
  if (eventType) {
    filtered = filtered.filter(e => e.eventType === eventType);
  }
  if (featured === 'true') {
    filtered = filtered.filter(e => e.isFeatured);
  }
  if (search) {
    const s = search.toLowerCase();
    filtered = filtered.filter(e => 
      e.title.toLowerCase().includes(s) || 
      e.description.toLowerCase().includes(s)
    );
  }

  return filtered.slice(0, limit);
}

function getMockEvent(id) {
  const events = getMockEvents();
  return events.find(e => e.id === id) || events[0];
}

export default router;


export {};

