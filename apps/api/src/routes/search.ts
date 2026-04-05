import express from 'express';
import { prisma } from '../db';
import { optionalAuth } from '../middleware/auth';

const router = express.Router();

// Maximum results per entity type
const MAX_RESULTS_PER_TYPE = 10;
const MAX_TOTAL_RESULTS = 50;

/**
 * GET /search
 * Unified search across all content types
 * 
 * Query params:
 * - q: Search query (required)
 * - types: Comma-separated types to search (jobs,mentors,courses,forums,stories,organizations)
 * - limit: Max results per type (default: 10, max: 20)
 * - page: Pagination (default: 1)
 */
router.get('/', optionalAuth, async (req: any, res: any) => {
  try {
    const query = String(req.query.q || '').trim();
    
    if (!query || query.length < 2) {
      return void res.status(400).json({ 
        error: 'Search query must be at least 2 characters' 
      });
    }

    // Parse requested types
    const typesParam = String(req.query.types || 'all').toLowerCase();
    const requestedTypes = typesParam === 'all' 
      ? ['jobs', 'mentors', 'courses', 'forums', 'stories', 'organizations', 'events']
      : typesParam.split(',').map(t => t.trim());

    const limit = Math.min(
      Math.max(1, Number(req.query.limit) || MAX_RESULTS_PER_TYPE),
      20
    );
    const page = Math.max(1, Number(req.query.page) || 1);
    const skip = (page - 1) * limit;

    const results: any = {};
    const counts: any = {};

    // Search Jobs
    if (requestedTypes.includes('jobs')) {
      const jobWhere: any = {
        isActive: true,
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
          { location: { contains: query, mode: 'insensitive' } }
        ]
      };

      const [jobs, jobCount] = await Promise.all([
        prisma.job.findMany({
          where: jobWhere,
          select: {
            id: true,
            title: true,
            location: true,
            employment: true,
            salaryLow: true,
            salaryHigh: true,
            isFeatured: true,
            postedAt: true,
            user: {
              select: {
                companyProfile: {
                  select: { companyName: true, isVerified: true }
                }
              }
            }
          },
          orderBy: [{ isFeatured: 'desc' }, { postedAt: 'desc' }],
          take: limit,
          skip
        }),
        prisma.job.count({ where: jobWhere })
      ]);

      results.jobs = jobs.map((job: any) => ({
        id: job.id,
        title: job.title,
        location: job.location,
        employment: job.employment,
        salaryRange: job.salaryLow && job.salaryHigh 
          ? `$${job.salaryLow.toLocaleString()} - $${job.salaryHigh.toLocaleString()}`
          : null,
        companyName: job.user?.companyProfile?.companyName || 'Company',
        isVerified: job.user?.companyProfile?.isVerified || false,
        isFeatured: job.isFeatured,
        postedAt: job.postedAt
      }));
      counts.jobs = jobCount;
    }

    // Search Mentors
    if (requestedTypes.includes('mentors')) {
      const mentorWhere: any = {
        active: true,
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { title: { contains: query, mode: 'insensitive' } },
          { skills: { contains: query, mode: 'insensitive' } },
          { industry: { contains: query, mode: 'insensitive' } },
          { bio: { contains: query, mode: 'insensitive' } }
        ]
      };

      const [mentors, mentorCount] = await Promise.all([
        prisma.mentorProfile.findMany({
          where: mentorWhere,
          select: {
            id: true,
            name: true,
            title: true,
            skills: true,
            industry: true,
            location: true,
            avatar: true,
            avatarUrl: true
          },
          take: limit,
          skip
        }),
        prisma.mentorProfile.count({ where: mentorWhere })
      ]);

      results.mentors = mentors.map((mentor: any) => ({
        id: mentor.id,
        name: mentor.name || 'Mentor',
        title: mentor.title,
        skills: mentor.skills ? mentor.skills.split(',').slice(0, 3) : [],
        industry: mentor.industry,
        location: mentor.location,
        avatar: mentor.avatarUrl || mentor.avatar
      }));
      counts.mentors = mentorCount;
    }

    // Search Courses
    if (requestedTypes.includes('courses')) {
      const courseWhere: any = {
        isActive: true,
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
          { category: { contains: query, mode: 'insensitive' } },
          { qualification: { contains: query, mode: 'insensitive' } },
          { providerName: { contains: query, mode: 'insensitive' } }
        ]
      };

      const [courses, courseCount] = await Promise.all([
        prisma.course.findMany({
          where: courseWhere,
          select: {
            id: true,
            title: true,
            category: true,
            duration: true,
            providerName: true,
            isOnline: true,
            priceInCents: true,
            price: true
          },
          take: limit,
          skip
        }),
        prisma.course.count({ where: courseWhere })
      ]);

      results.courses = courses.map((course: any) => ({
        id: course.id,
        title: course.title,
        category: course.category,
        duration: course.duration,
        provider: course.providerName,
        isOnline: course.isOnline,
        price: course.priceInCents 
          ? `$${(course.priceInCents / 100).toFixed(2)}`
          : course.price 
            ? `$${course.price}`
            : 'Free'
      }));
      counts.courses = courseCount;
    }

    // Search Forum Threads
    if (requestedTypes.includes('forums')) {
      const forumWhere: any = {
        isClosed: false,
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { content: { contains: query, mode: 'insensitive' } }
        ]
      };

      const [threads, threadCount] = await Promise.all([
        prisma.forumThread.findMany({
          where: forumWhere,
          select: {
            id: true,
            title: true,
            slug: true,
            viewCount: true,
            createdAt: true,
            category: {
              select: { name: true, slug: true }
            },
            _count: { select: { replies: true } }
          },
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip
        }),
        prisma.forumThread.count({ where: forumWhere })
      ]);

      results.forums = threads.map((thread: any) => ({
        id: thread.id,
        title: thread.title,
        slug: thread.slug,
        category: thread.category?.name,
        categorySlug: thread.category?.slug,
        replyCount: thread._count.replies,
        viewCount: thread.viewCount,
        createdAt: thread.createdAt
      }));
      counts.forums = threadCount;
    }

    // Search Success Stories
    if (requestedTypes.includes('stories')) {
      const storyWhere: any = {
        status: 'approved',
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { content: { contains: query, mode: 'insensitive' } },
          { company: { contains: query, mode: 'insensitive' } },
          { role: { contains: query, mode: 'insensitive' } }
        ]
      };

      const [stories, storyCount] = await Promise.all([
        prisma.successStory.findMany({
          where: storyWhere,
          select: {
            id: true,
            title: true,
            outcome: true,
            company: true,
            role: true,
            imageUrl: true,
            createdAt: true
          },
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip
        }),
        prisma.successStory.count({ where: storyWhere })
      ]);

      results.stories = stories.map((story: any) => ({
        id: story.id,
        title: story.title,
        outcome: story.outcome,
        company: story.company,
        role: story.role,
        imageUrl: story.imageUrl,
        createdAt: story.createdAt
      }));
      counts.stories = storyCount;
    }

    // Search Organizations
    if (requestedTypes.includes('organizations')) {
      const orgWhere: any = {
        isActive: true,
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
          { tagline: { contains: query, mode: 'insensitive' } }
        ]
      };

      try {
        const [orgs, orgCount] = await Promise.all([
          prisma.organizationPage.findMany({
            where: orgWhere,
            select: {
              id: true,
              name: true,
              tagline: true,
              city: true,
              state: true,
              logoUrl: true,
              isVerified: true,
              followerCount: true
            },
            orderBy: { followerCount: 'desc' },
            take: limit,
            skip
          }),
          prisma.organizationPage.count({ where: orgWhere })
        ]);

        results.organizations = orgs.map((org: any) => ({
          id: org.id,
          name: org.name,
          tagline: org.tagline,
          industry: null,
          location: org.city && org.state ? `${org.city}, ${org.state}` : null,
          logo: org.logoUrl,
          isVerified: org.isVerified,
          followers: org.followerCount
        }));
        counts.organizations = orgCount;
      } catch (err) {
        // Organization model may not exist - skip silently
        results.organizations = [];
        counts.organizations = 0;
      }
    }

    // Search Events
    if (requestedTypes.includes('events')) {
      const eventWhere: any = {
        status: 'published',
        endDate: { gte: new Date() }, // Only future/ongoing events
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
          { location: { contains: query, mode: 'insensitive' } }
        ]
      };

      try {
        const [events, eventCount] = await Promise.all([
          prisma.groupEvent.findMany({
            where: eventWhere,
            select: {
              id: true,
              title: true,
              description: true,
              location: true,
              isOnline: true,
              startDate: true,
              endDate: true,
              attendeeCount: true
            },
            orderBy: { startDate: 'asc' },
            take: limit,
            skip
          }),
          prisma.groupEvent.count({ where: eventWhere })
        ]);

        results.events = events.map((event: any) => ({
          id: event.id,
          title: event.title,
          description: event.description?.substring(0, 150),
          location: event.isOnline ? 'Online' : event.location,
          startTime: event.startDate,
          endTime: event.endDate,
          attendees: event.attendeeCount,
          coverImage: null
        }));
        counts.events = eventCount;
      } catch (err) {
        // Event model may not exist - skip silently
        results.events = [];
        counts.events = 0;
      }
    }

    // Calculate total count
    const totalCount = Object.values(counts).reduce((sum: any, count: any) => sum + count, 0);

    res.json({
      query,
      page,
      limit,
      totalCount,
      counts,
      results
    });

  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ error: 'Search failed' });
  }
});

/**
 * GET /search/suggestions
 * Get search suggestions/autocomplete
 */
router.get('/suggestions', async (req: any, res: any) => {
  try {
    const query = String(req.query.q || '').trim();
    
    if (query.length < 2) {
      return void res.json({ suggestions: [] });
    }

    // Get suggestions from recent job titles and skills
    const [jobs, skills] = await Promise.all([
      prisma.job.findMany({
        where: {
          isActive: true,
          title: { contains: query, mode: 'insensitive' }
        },
        select: { title: true },
        distinct: ['title'],
        take: 5
      }),
      prisma.skill.findMany({
        where: {
          name: { contains: query, mode: 'insensitive' }
        },
        select: { name: true },
        take: 5
      })
    ]);

    const suggestions = [
      ...jobs.map((j: any) => ({ type: 'job', text: j.title })),
      ...skills.map((s: any) => ({ type: 'skill', text: s.name }))
    ].slice(0, 10);

    res.json({ suggestions });

  } catch (err) {
    console.error('Search suggestions error:', err);
    res.json({ suggestions: [] });
  }
});

/**
 * GET /search/trending
 * Get trending searches and topics
 */
router.get('/trending', async (req: any, res: any) => {
  try {
    // Get recently viewed/popular content
    const [popularJobs, popularSkills] = await Promise.all([
      prisma.job.findMany({
        where: { isActive: true },
        select: { title: true, viewCount: true },
        orderBy: { viewCount: 'desc' },
        take: 5
      }),
      prisma.skill.findMany({
        where: { isActive: true },
        select: { name: true, category: true },
        take: 5
      })
    ]);

    res.json({
      trending: {
        jobs: popularJobs.map((j: any) => j.title),
        skills: popularSkills.map((s: any) => s.name),
        topics: [
          'First Nations Employment',
          'Mentorship Programs',
          'TAFE Courses',
          'RAP Certification',
          'Career Development'
        ]
      }
    });

  } catch (err) {
    console.error('Trending search error:', err);
    res.json({ trending: { jobs: [], skills: [], topics: [] } });
  }
});

// ============================================
// Phase D: Advanced Search Features (Steps 31-40)
// ============================================

// Import advanced search modules
let elasticsearch: any, semanticSearch: any, locationSearch: any, searchAnalytics: any, searchPerformance: any;
try {
  elasticsearch = require('../lib/elasticsearch');
  semanticSearch = require('../lib/semanticSearch');
  locationSearch = require('../lib/locationSearch');
  searchAnalytics = require('../lib/searchAnalytics');
  searchPerformance = require('../lib/searchPerformance');
} catch (e: any) {
  console.log('Advanced search modules not fully loaded:', e.message);
}

/**
 * GET /search/advanced
 * Advanced search with Elasticsearch and semantic search
 */
router.get('/advanced', optionalAuth, async (req: any, res: any) => {
  try {
    const { 
      q: query, 
      type = 'jobs',
      mode = 'keyword', // keyword, semantic, hybrid
      page = 1,
      limit = 20,
      ...filters 
    } = req.query;

    if (!query || query.length < 2) {
      return void res.status(400).json({ error: 'Query required' });
    }

    const startTime = Date.now();
    let result;

    // Use appropriate search mode
    if (mode === 'semantic' && semanticSearch?.isAvailable()) {
      result = await semanticSearch.semanticSearch(query, type, {
        limit: Number(limit),
        filters,
        userId: req.user?.id
      });
    } else if (mode === 'hybrid' && semanticSearch?.isAvailable()) {
      result = await semanticSearch.hybridSearch(query, type, {
        limit: Number(limit),
        ...filters
      });
    } else if (elasticsearch?.isAvailable()) {
      result = await elasticsearch.search(type, {
        query,
        filters,
        from: (page - 1) * limit,
        size: Number(limit),
        userId: req.user?.id
      });
    } else {
      // Fallback to database search
      return void res.redirect(`/search?q=${encodeURIComponent(query)}&types=${type}`);
    }

    // Track search analytics
    if (searchAnalytics) {
      searchAnalytics.trackSearch({
        query,
        indexType: type,
        searchType: mode,
        resultCount: result.total || 0,
        userId: req.user?.id,
        duration: Date.now() - startTime
      });
    }

    res.json({
      ...result,
      mode,
      duration: Date.now() - startTime
    });

  } catch (err) {
    console.error('Advanced search error:', err);
    res.status(500).json({ error: 'Search failed' });
  }
});

/**
 * GET /search/similar/:type/:id
 * Find similar items (jobs like this, etc.)
 */
router.get('/similar/:type/:id', async (req: any, res: any) => {
  try {
    const { type, id } = req.params;
    const { limit = 5 } = req.query;

    let similar = [];

    if (type === 'jobs' && semanticSearch?.isAvailable()) {
      const result = await semanticSearch.findSimilarJobs(id, { limit: Number(limit) });
      similar = result.similarJobs || [];
    } else if (elasticsearch?.isAvailable()) {
      similar = await elasticsearch.findSimilar(type, id, Number(limit));
    }

    res.json({ similar, referenceId: id, type });

  } catch (err) {
    console.error('Similar search error:', err);
    res.json({ similar: [], referenceId: req.params.id });
  }
});

/**
 * GET /search/location/autocomplete
 * Location autocomplete for Australian cities
 */
router.get('/location/autocomplete', async (req: any, res: any) => {
  try {
    const { q, limit = 10 } = req.query;

    if (!locationSearch) {
      return void res.json({ suggestions: [] });
    }

    const suggestions = await locationSearch.autocomplete(q, Number(limit));
    res.json({ suggestions });

  } catch (err) {
    console.error('Location autocomplete error:', err);
    res.json({ suggestions: [] });
  }
});

/**
 * GET /search/jobs/nearby
 * Search jobs near a location
 */
router.get('/jobs/nearby', optionalAuth, async (req: any, res: any) => {
  try {
    const { location, distance = 50, ...filters } = req.query;

    if (!location) {
      return void res.status(400).json({ error: 'Location required' });
    }

    if (!locationSearch) {
      return void res.status(503).json({ error: 'Location search not available' });
    }

    // Get all active jobs
    const jobs = await prisma.job.findMany({
      where: { isActive: true, ...filters },
      include: {
        user: { select: { companyProfile: { select: { companyName: true } } } }
      },
      take: 200
    });

    // Filter by distance
    const result = await locationSearch.filterByDistance(jobs, location, Number(distance));

    res.json({
      jobs: result.jobs?.slice(0, 50) || [],
      origin: result.origin,
      maxDistance: Number(distance),
      total: result.jobs?.length || 0
    });

  } catch (err) {
    console.error('Nearby jobs search error:', err);
    res.status(500).json({ error: 'Search failed' });
  }
});

/**
 * GET /search/jobs/map
 * Get jobs formatted for map view
 */
router.get('/jobs/map', async (req: any, res: any) => {
  try {
    const { north, south, east, west } = req.query;

    if (!locationSearch) {
      return void res.json({ markers: [], totalJobs: 0 });
    }

    let jobs;
    if (north && south && east && west) {
      // Get jobs in bounding box
      jobs = await locationSearch.getJobsInBounds(prisma, {
        north: Number(north),
        south: Number(south),
        east: Number(east),
        west: Number(west)
      });
    } else {
      // Get all jobs with locations
      jobs = await prisma.job.findMany({
        where: { isActive: true },
        select: {
          id: true,
          title: true,
          location: true,
          user: { select: { companyProfile: { select: { companyName: true } } } }
        },
        take: 500
      });
    }

    const mapData = locationSearch.formatForMapView(jobs);
    res.json(mapData);

  } catch (err) {
    console.error('Map jobs error:', err);
    res.json({ markers: [], totalJobs: 0 });
  }
});

/**
 * POST /search/track-click
 * Track when user clicks a search result
 */
router.post('/track-click', optionalAuth, async (req: any, res: any) => {
  try {
    const { searchId, clickedId, position } = req.body;

    if (searchAnalytics && searchId) {
      await searchAnalytics.trackClick(searchId, clickedId, position);
    }

    res.json({ success: true });

  } catch (err) {
    res.json({ success: false });
  }
});

/**
 * GET /search/analytics (Admin only)
 * Get search analytics dashboard data
 */
router.get('/analytics', optionalAuth, async (req: any, res: any) => {
  try {
    // Check if user is admin
    if (!req.user?.role || req.user.role !== 'ADMIN') {
      return void res.status(403).json({ error: 'Admin access required' });
    }

    if (!searchAnalytics) {
      return void res.json({ error: 'Analytics not available' });
    }

    const { days = 30 } = req.query;
    const startDate = new Date(Date.now() - Number(days) * 24 * 60 * 60 * 1000);

    const data = await searchAnalytics.getDashboardData({ startDate });
    res.json(data);

  } catch (err) {
    console.error('Search analytics error:', err);
    res.status(500).json({ error: 'Failed to get analytics' });
  }
});

/**
 * GET /search/health
 * Check search system health
 */
router.get('/health', async (req: any, res: any) => {
  try {
    const health: any = {
      elasticsearch: elasticsearch?.isAvailable() || false,
      semanticSearch: semanticSearch?.isAvailable() || false,
      locationSearch: !!locationSearch,
      analytics: !!searchAnalytics
    };

    if (elasticsearch?.isAvailable()) {
      health.elasticsearchDetails = await elasticsearch.health();
    }

    if (searchPerformance?.performanceMonitor) {
      health.performance = searchPerformance.performanceMonitor.getStats();
    }

    res.json(health);

  } catch (err: any) {
    console.error('Search health check error:', err);
    res.json({ error: err.message });
  }
});

export default router;


