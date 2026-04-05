import express, { Request, Response, NextFunction } from 'express';
import { prisma as prismaClient } from '../db';
const prisma = prismaClient as any;
import { authenticate } from '../middleware/auth';
import { z } from 'zod';

const router = express.Router();

// Validation Schemas
const createCulturalEventSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  eventType: z.string().min(1),
  startDate: z.string().or(z.date()),
  endDate: z.string().or(z.date()).optional().nullable(),
  location: z.string().optional(),
  region: z.string().optional(),
  isPublished: z.boolean().optional(),
  coverImageUrl: z.string().optional(),
  externalUrl: z.string().optional(),
});

const updateCulturalEventSchema = createCulturalEventSchema.partial();

const validate = (schema: z.ZodSchema) => (req: Request, res: Response, next: NextFunction) => {
  try {
    schema.parse(req.body);
    next();
  } catch (error) {
    return void res.status(400).json({ error: 'Validation failed', details: error });
  }
};

// Role check middleware
const canManageEvents = (req: Request, res: Response, next: NextFunction) => {
  const user = (req as any).user;
  const allowedRoles = ['admin', 'superadmin', 'elder', 'mentor'];
  if (!user || !allowedRoles.includes(user.role)) {
    return void res.status(403).json({ error: 'Insufficient permissions to manage events' });
  }
  next();
};

interface WhereClause {
  isPublished: boolean;
  startDate?: any;
  eventType?: string;
  region?: any;
  [key: string]: any;
}

// ============================================
// GET /cultural-events - List cultural events
// ============================================
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const { 
      month, 
      year, 
      category, // mapped to eventType
      region,
      page = 1, 
      limit = 50,
      upcoming = 'false',
    } = req.query;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);

    // Build query
    const where: WhereClause = { isPublished: true };

    // Filter by date range (month/year)
    if (month && year) {
      const startDate = new Date(parseInt(year as string), parseInt(month as string) - 1, 1);
      const endDate = new Date(parseInt(year as string), parseInt(month as string), 0, 23, 59, 59);
      where.startDate = { gte: startDate, lte: endDate };
    } else if (year) {
      const startDate = new Date(parseInt(year as string), 0, 1);
      const endDate = new Date(parseInt(year as string), 11, 31, 23, 59, 59);
      where.startDate = { gte: startDate, lte: endDate };
    }

    // Filter upcoming events
    if (upcoming === 'true') {
      where.startDate = { gte: new Date() };
    }

    // Filter by category (eventType)
    if (category) {
      where.eventType = category as string;
    }

    // Filter by region
    if (region) {
      where.region = { contains: region as string };
    }

    const [events, total] = await Promise.all([
      prisma.culturalEvent.findMany({
        where,
        skip,
        take,
        orderBy: { startDate: 'asc' },
      }),
      prisma.culturalEvent.count({ where }),
    ]);

    // Group by month for calendar view
    const grouped: Record<string, any[]> = {};
    events.forEach(event => {
      const key = event.startDate.toISOString().slice(0, 7); // YYYY-MM
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(event);
    });

    res.json({
      events,
      grouped,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        pages: Math.ceil(total / parseInt(limit as string)),
      },
    });
  } catch (error) {
    console.error('Get cultural events error:', error);
    res.status(500).json({ error: 'Failed to fetch cultural events' });
  }
});

// ============================================
// GET /cultural-events/categories - List event categories
// ============================================
router.get('/categories', authenticate, async (req: Request, res: Response) => {
  try {
    // Return predefined categories for Indigenous cultural events
    const categories = [
      { id: 'ceremony', name: 'Ceremony', description: 'Traditional ceremonies and sacred gatherings' },
      { id: 'celebration', name: 'Celebration', description: 'Community celebrations and festivals' },
      { id: 'naidoc', name: 'NAIDOC Week', description: 'NAIDOC Week events and activities' },
      { id: 'reconciliation', name: 'Reconciliation', description: 'Reconciliation events and activities' },
      { id: 'memorial', name: 'Memorial', description: 'Memorial days and remembrance events' },
      { id: 'education', name: 'Cultural Education', description: 'Educational workshops and learning events' },
      { id: 'art', name: 'Art & Performance', description: 'Art exhibitions, dance, and performances' },
      { id: 'language', name: 'Language', description: 'Language revival and teaching events' },
      { id: 'land', name: 'Land & Country', description: 'Land connection and country visits' },
      { id: 'health', name: 'Health & Wellbeing', description: 'Health and wellbeing community events' },
      { id: 'community', name: 'Community', description: 'General community gatherings' },
      { id: 'other', name: 'Other', description: 'Other cultural events' },
    ];

    res.json({ categories });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: 'Failed to get categories' });
  }
});

// ============================================
// GET /cultural-events/significant-dates - Key dates in Indigenous calendar
// ============================================
router.get('/significant-dates', authenticate, async (req: Request, res: Response) => {
  try {
    const year = parseInt(req.query.year as string) || new Date().getFullYear();

    // Standard significant dates in the Indigenous Australian calendar
    const significantDates = [
      {
        date: `${year}-01-26`,
        name: 'Survival Day / Invasion Day',
        description: 'A day of mourning and reflection for First Nations peoples, marking the beginning of colonisation.',
        category: 'memorial',
        isNational: true,
      },
      {
        date: `${year}-02-13`,
        name: 'Anniversary of the National Apology',
        description: 'Commemorates the 2008 National Apology to the Stolen Generations.',
        category: 'reconciliation',
        isNational: true,
      },
      {
        date: `${year}-03-21`,
        name: 'Harmony Day',
        description: 'Celebrating cultural diversity and inclusiveness.',
        category: 'celebration',
        isNational: true,
      },
      {
        date: `${year}-05-26`,
        name: 'National Sorry Day',
        description: 'Remembers the Stolen Generations and acknowledges the hurt caused.',
        category: 'memorial',
        isNational: true,
      },
      {
        date: `${year}-05-27`,
        name: 'Start of National Reconciliation Week',
        description: 'Anniversary of the 1967 referendum.',
        category: 'reconciliation',
        isNational: true,
      },
      {
        date: `${year}-06-03`,
        name: 'Mabo Day',
        description: 'Commemorates the High Court Mabo decision recognising native title.',
        category: 'memorial',
        isNational: true,
      },
      {
        date: `${year}-07-01`, // First Sunday in July (approximate)
        name: 'Coming of the Light Festival',
        description: 'Celebrated in the Torres Strait Islands, marking the arrival of Christianity.',
        category: 'celebration',
        isNational: false,
        region: 'Torres Strait Islands',
      },
      {
        date: `${year}-07-07`, // First full week of July
        name: 'NAIDOC Week Begins',
        description: 'National week celebrating the history, culture and achievements of Aboriginal and Torres Strait Islander peoples.',
        category: 'naidoc',
        isNational: true,
      },
      {
        date: `${year}-08-04`,
        name: 'National Aboriginal and Torres Strait Islander Children\'s Day',
        description: 'Celebrating Aboriginal and Torres Strait Islander children.',
        category: 'celebration',
        isNational: true,
      },
      {
        date: `${year}-09-01`, // First week of September
        name: 'Indigenous Literacy Day',
        description: 'Raising awareness and funds for Indigenous literacy programs.',
        category: 'education',
        isNational: true,
      },
      {
        date: `${year}-11-13`,
        name: 'Aboriginal and Torres Strait Islander Veterans\' Day',
        description: 'Honouring Aboriginal and Torres Strait Islander service men and women.',
        category: 'memorial',
        isNational: true,
      },
    ];

    res.json({ 
      year,
      significantDates,
    });
  } catch (error) {
    console.error('Get significant dates error:', error);
    res.status(500).json({ error: 'Failed to get significant dates' });
  }
});

// ============================================
// GET /cultural-events/:id - Get single event
// ============================================
router.get('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const event = await prisma.culturalEvent.findUnique({
      where: { id },
    });

    if (!event) {
      return void res.status(404).json({ error: 'Event not found' });
    }

    res.json(event);
  } catch (error) {
    console.error('Get cultural event error:', error);
    res.status(500).json({ error: 'Failed to fetch event' });
  }
});

// ============================================
// POST /cultural-events - Create a cultural event
// ============================================
router.post('/', authenticate, canManageEvents, validate(createCulturalEventSchema), async (req: Request, res: Response) => {
  try {
    const { 
      title, 
      description, 
      category, // mapped to eventType
      startDate, 
      endDate,
      location,
      region,
      isPublic = true, // mapped to isPublished
      imageUrl, // mapped to coverImageUrl
      externalUrl,
    } = req.body;

    const user = (req as any).user;

    const event = await prisma.culturalEvent.create({
      data: {
        title,
        description,
        eventType: category || 'community',
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        location,
        region,
        isPublished: isPublic ?? true,
        coverImageUrl: imageUrl,
        externalUrl,
        createdBy: user.id,
      },
    });

    res.status(201).json(event);
  } catch (error) {
    console.error('Create cultural event error:', error);
    res.status(500).json({ error: 'Failed to create event' });
  }
});

interface UpdateData {
  title?: string;
  description?: string;
  eventType?: string;
  startDate?: Date;
  endDate?: Date | null;
  location?: string;
  region?: string;
  isPublished?: boolean;
  coverImageUrl?: string;
  externalUrl?: string;
}

// ============================================
// PUT /cultural-events/:id - Update a cultural event
// ============================================
router.put('/:id', authenticate, canManageEvents, validate(updateCulturalEventSchema), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { 
      title, 
      description, 
      category, // mapped to eventType
      startDate, 
      endDate,
      location,
      region,
      isPublic, // mapped to isPublished
      isActive, // mapped to isPublished
      imageUrl, // mapped to coverImageUrl
      externalUrl,
    } = req.body;

    const existing = await prisma.culturalEvent.findUnique({
      where: { id },
    });

    if (!existing) {
      return void res.status(404).json({ error: 'Event not found' });
    }

    const user = (req as any).user;

    // Check ownership (admins can edit any, others can only edit their own)
    if (!['admin', 'superadmin'].includes(user.role) && existing.createdBy !== user.id) {
      return void res.status(403).json({ error: 'You can only edit events you created' });
    }

    const updateData: UpdateData = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (category !== undefined) updateData.eventType = category;
    if (startDate !== undefined) updateData.startDate = new Date(startDate);
    if (endDate !== undefined) updateData.endDate = endDate ? new Date(endDate) : null;
    if (location !== undefined) updateData.location = location;
    if (region !== undefined) updateData.region = region;
    if (isPublic !== undefined) updateData.isPublished = isPublic;
    if (isActive !== undefined) updateData.isPublished = isActive;
    if (imageUrl !== undefined) updateData.coverImageUrl = imageUrl;
    if (externalUrl !== undefined) updateData.externalUrl = externalUrl;

    const event = await prisma.culturalEvent.update({
      where: { id },
      data: updateData,
    });

    res.json(event);
  } catch (error) {
    console.error('Update cultural event error:', error);
    res.status(500).json({ error: 'Failed to update event' });
  }
});

// ============================================
// DELETE /cultural-events/:id - Delete a cultural event
// ============================================
router.delete('/:id', authenticate, canManageEvents, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const existing = await prisma.culturalEvent.findUnique({
      where: { id },
    });

    if (!existing) {
      return void res.status(404).json({ error: 'Event not found' });
    }

    const user = (req as any).user;

    // Check ownership (admins can delete any, others can only delete their own)
    if (!['admin', 'superadmin'].includes(user.role) && existing.createdBy !== user.id) {
      return void res.status(403).json({ error: 'You can only delete events you created' });
    }

    await prisma.culturalEvent.delete({
      where: { id },
    });

    res.json({ success: true, message: 'Event deleted' });
  } catch (error) {
    console.error('Delete cultural event error:', error);
    res.status(500).json({ error: 'Failed to delete event' });
  }
});

// ============================================
// GET /cultural-events/export/ical - Export events as iCal
// ============================================
router.get('/export/ical', authenticate, async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, category } = req.query;

    const where: WhereClause = { isPublished: true };
    
    if (startDate && endDate) {
      where.startDate = {
        gte: new Date(startDate as string),
        lte: new Date(endDate as string),
      };
    }
    
    if (category) {
      where.eventType = category as string;
    }

    const events = await prisma.culturalEvent.findMany({
      where,
      orderBy: { startDate: 'asc' },
      take: 100,
    });

    // Generate iCal format
    let ical = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Ngurra Pathways//Cultural Calendar//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:Ngurra Pathways Cultural Calendar
X-WR-TIMEZONE:Australia/Sydney
`;

    events.forEach(event => {
      const dtstart = event.startDate.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      const dtend = (event.endDate || event.startDate).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      const uid = `${event.id}@ngurrapathways.com.au`;
      
      ical += `BEGIN:VEVENT
UID:${uid}
DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z
DTSTART:${dtstart}
DTEND:${dtend}
SUMMARY:${event.title.replace(/,/g, '\\,')}
DESCRIPTION:${(event.description || '').replace(/\n/g, '\\n').replace(/,/g, '\\,')}
LOCATION:${(event.location || '').replace(/,/g, '\\,')}
CATEGORIES:${event.eventType}
END:VEVENT
`;
    });

    ical += 'END:VCALENDAR';

    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="cultural-calendar.ics"');
    res.send(ical);
  } catch (error) {
    console.error('Export iCal error:', error);
    res.status(500).json({ error: 'Failed to export calendar' });
  }
});

export default router;


