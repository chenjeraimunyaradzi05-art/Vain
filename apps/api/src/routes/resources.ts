import express from 'express';
import { prisma } from '../db';
import { optionalAuth } from '../middleware/auth';

const router = express.Router();

type ViewerKey = string;

const anonBookmarks = new Set<string>();
const anonRatings = new Map<string, number>();

function viewerKey(req: any): ViewerKey {
  return req.user?.id ?? 'anon';
}

function parseTags(tags: string | null | undefined): string[] {
  if (!tags) return [];
  const trimmed = tags.trim();
  if (!trimmed) return [];
  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      return parsed.map((t) => String(t)).filter(Boolean);
    }
  } catch {
    // fall through
  }
  return trimmed
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
}

function isIndigenousResource(resource: { category: string; tags: string | null }): boolean {
  if (resource.category?.toLowerCase() === 'cultural') return true;
  const tags = parseTags(resource.tags);
  return tags.some((t) => t.toLowerCase().includes('indigenous') || t.toLowerCase().includes('aboriginal') || t.toLowerCase().includes('torres'));
}

function categoryIcon(category: string): string {
  const c = category.toLowerCase();
  if (c.includes('career')) return '💼';
  if (c.includes('training')) return '🎓';
  if (c.includes('wellness')) return '🧘';
  if (c.includes('cultural')) return '🪃';
  if (c.includes('legal')) return '⚖️';
  if (c.includes('finance')) return '💰';
  return '📚';
}

function mapResource(r: any, isBookmarked: boolean) {
  const tags = parseTags(r.tags);
  return {
    id: r.id,
    title: r.title,
    description: r.description ?? '',
    type: (r.type || 'article') as any,
    category: r.category,
    author: {
      id: r.authorId ?? 'system',
      name: r.author ?? 'Ngurra Pathways',
      avatar: undefined,
    },
    thumbnail: r.thumbnailUrl ?? undefined,
    url: r.contentUrl ?? '',
    downloadUrl: r.contentUrl ?? undefined,
    duration: undefined,
    readTime: undefined,
    publishedAt: (r.publishedAt ?? r.createdAt).toISOString(),
    views: r.views ?? 0,
    downloads: r.downloads ?? 0,
    rating: r.rating ?? 0,
    ratingCount: r.ratingCount ?? 0,
    isBookmarked,
    isPremium: false,
    isIndigenous: isIndigenousResource({ category: r.category, tags: r.tags }),
    tags,
  };
}

router.use(optionalAuth);

// GET /resources?category=&type=&q=&page=&limit=
router.get('/', async (req, res, next) => {
  try {
    const q = typeof req.query.q === 'string' ? req.query.q : '';
    const category = typeof req.query.category === 'string' ? req.query.category : '';
    const type = typeof req.query.type === 'string' ? req.query.type : '';
    const page = Math.max(1, parseInt(String(req.query.page ?? '1'), 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit ?? '12'), 10) || 12));

    const where: any = { isPublished: true };
    if (category) where.category = category;
    if (type) where.type = type;
    if (q) {
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [total, items] = await Promise.all([
      prisma.resource.count({ where }),
      prisma.resource.findMany({
        where,
        orderBy: [{ isFeatured: 'desc' }, { publishedAt: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    const ids = items.map((r) => r.id);

    let bookmarkedIds = new Set<string>();
    if ((req as any).user?.id) {
      const bookmarks = await prisma.resourceBookmark.findMany({
        where: { userId: (req as any).user.id, resourceId: { in: ids } },
        select: { resourceId: true },
      });
      bookmarkedIds = new Set(bookmarks.map((b) => b.resourceId));
    } else {
      bookmarkedIds = anonBookmarks;
    }

    const resources = items.map((r) => mapResource(r, bookmarkedIds.has(r.id)));

    res.json({ resources, total });
  } catch (error) {
    next(error);
  }
});

// GET /resources/categories
router.get('/categories', async (req, res, next) => {
  try {
    const grouped = await prisma.resource.groupBy({
      by: ['category'],
      where: { isPublished: true },
      _count: { _all: true },
    });

    const categories = grouped
      .map((g) => ({
        id: g.category,
        name: g.category,
        icon: categoryIcon(g.category),
        count: g._count._all,
      }))
      .sort((a, b) => b.count - a.count);

    res.json(categories);
  } catch (error) {
    next(error);
  }
});

// GET /resources/bookmarked
router.get('/bookmarked', async (req, res, next) => {
  try {
    const userId = (req as any).user?.id as string | undefined;

    if (process.env.NODE_ENV === 'production' && !userId) {
      return void res.status(401).json({ error: 'Authentication required' });
    }

    if (!userId) {
      const ids = Array.from(anonBookmarks);
      const resources = await prisma.resource.findMany({ where: { id: { in: ids }, isPublished: true } });
      return void res.json(resources.map((r) => mapResource(r, true)));
    }

    const bookmarks = await prisma.resourceBookmark.findMany({
      where: { userId },
      select: { resourceId: true },
      orderBy: { createdAt: 'desc' },
    });
    const ids = bookmarks.map((b) => b.resourceId);

    const resources = await prisma.resource.findMany({
      where: { id: { in: ids }, isPublished: true },
    });

    res.json(resources.map((r) => mapResource(r, true)));
  } catch (error) {
    next(error);
  }
});

// GET /resources/:id
router.get('/:id', async (req, res, next) => {
  try {
    const r = await prisma.resource.findUnique({ where: { id: req.params.id } });
    if (!r || !r.isPublished) return void res.status(404).json({ error: 'Not found' });

    const userId = (req as any).user?.id as string | undefined;
    const isBookmarked = userId
      ? !!(await prisma.resourceBookmark.findUnique({
          where: { userId_resourceId: { userId, resourceId: r.id } },
        }))
      : anonBookmarks.has(r.id);

    // best-effort view increment
    prisma.resource.update({ where: { id: r.id }, data: { views: { increment: 1 } } }).catch(() => undefined);

    res.json(mapResource(r, isBookmarked));
  } catch (error) {
    next(error);
  }
});

// POST /resources/:id/bookmark
router.post('/:id/bookmark', async (req, res, next) => {
  try {
    const resourceId = req.params.id;
    const userId = (req as any).user?.id as string | undefined;

    if (process.env.NODE_ENV === 'production' && !userId) {
      return void res.status(401).json({ error: 'Authentication required' });
    }

    if (!userId) {
      anonBookmarks.add(resourceId);
      return void res.json({ ok: true, bookmarked: true });
    }

    await prisma.resourceBookmark.upsert({
      where: { userId_resourceId: { userId, resourceId } },
      create: { userId, resourceId },
      update: {},
    });

    res.json({ ok: true, bookmarked: true });
  } catch (error) {
    next(error);
  }
});

// DELETE /resources/:id/bookmark
router.delete('/:id/bookmark', async (req, res, next) => {
  try {
    const resourceId = req.params.id;
    const userId = (req as any).user?.id as string | undefined;

    if (process.env.NODE_ENV === 'production' && !userId) {
      return void res.status(401).json({ error: 'Authentication required' });
    }

    if (!userId) {
      anonBookmarks.delete(resourceId);
      return void res.json({ ok: true, bookmarked: false });
    }

    await prisma.resourceBookmark.delete({
      where: { userId_resourceId: { userId, resourceId } },
    }).catch(() => undefined);

    res.json({ ok: true, bookmarked: false });
  } catch (error) {
    next(error);
  }
});

// POST /resources/:id/rate { rating: 1-5 }
router.post('/:id/rate', async (req, res, next) => {
  try {
    const resourceId = req.params.id;
    const rating = Math.max(1, Math.min(5, parseInt(String(req.body?.rating ?? '0'), 10) || 0));
    if (!rating) return void res.status(400).json({ error: 'Invalid rating' });

    const userId = (req as any).user?.id as string | undefined;

    if (process.env.NODE_ENV === 'production' && !userId) {
      return void res.status(401).json({ error: 'Authentication required' });
    }

    if (!userId) {
      anonRatings.set(resourceId, rating);
      return void res.json({ ok: true });
    }

    await prisma.resourceRating.upsert({
      where: { userId_resourceId: { userId, resourceId } },
      create: { userId, resourceId, rating },
      update: { rating },
    });

    const agg = await prisma.resourceRating.aggregate({
      where: { resourceId },
      _avg: { rating: true },
      _count: { _all: true },
    });

    await prisma.resource.update({
      where: { id: resourceId },
      data: {
        rating: agg._avg.rating ?? 0,
        ratingCount: agg._count._all,
      },
    });

    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

// POST /resources/:id/download
router.post('/:id/download', async (req, res, next) => {
  try {
    const resourceId = req.params.id;
    await prisma.resource.update({ where: { id: resourceId }, data: { downloads: { increment: 1 } } }).catch(() => undefined);
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

// GET /resources/personalized - Get resources based on user's foundation preferences
router.get('/personalized/for-me', async (req, res, next) => {
  try {
    const userId = (req as any).user?.id as string | undefined;
    const limit = Math.min(20, Math.max(1, parseInt(String(req.query.limit ?? '12'), 10)));

    // Default categories to show if user has no preferences
    let categories: string[] = ['Career', 'Training', 'Wellness'];

    if (userId) {
      // Get user's foundation preferences
      const profile = await prisma.memberProfile.findUnique({
        where: { userId },
        include: { foundationPreferences: true },
      });

      const prefs = profile?.foundationPreferences;
      if (prefs) {
        categories = [];
        
        // Map preferences to resource categories
        if (prefs.businessFoundation || prefs.legalStartups || prefs.businessFormation) {
          categories.push('Business', 'Entrepreneurship', 'Startup');
        }
        if (prefs.legalStartups) {
          categories.push('Legal');
        }
        if (prefs.basicAccountingBudget) {
          categories.push('Finance', 'Accounting', 'Budgeting');
        }
        if (prefs.mortgagesHomeOwnership) {
          categories.push('Property', 'Home Ownership', 'Real Estate');
        }
        if (prefs.investingStocks || prefs.preciousMetals) {
          categories.push('Investing', 'Wealth', 'Finance');
        }
        if (prefs.financialWellbeing) {
          categories.push('Financial Wellness', 'Money Management', 'Wellness');
        }

        // Remove duplicates
        categories = [...new Set(categories)];

        // If no preferences selected, use defaults
        if (categories.length === 0) {
          categories = ['Career', 'Training', 'Wellness'];
        }
      }
    }

    // Build query to find matching resources
    const where: any = {
      isPublished: true,
      OR: categories.map(cat => ({
        OR: [
          { category: { contains: cat, mode: 'insensitive' } },
          { tags: { contains: cat, mode: 'insensitive' } },
          { title: { contains: cat, mode: 'insensitive' } },
        ],
      })),
    };

    const resources = await prisma.resource.findMany({
      where,
      orderBy: [
        { isFeatured: 'desc' },
        { rating: 'desc' },
        { views: 'desc' },
        { publishedAt: 'desc' },
      ],
      take: limit,
    });

    // Get bookmarks
    let bookmarkedIds = new Set<string>();
    if (userId) {
      const bookmarks = await prisma.resourceBookmark.findMany({
        where: { userId, resourceId: { in: resources.map(r => r.id) } },
        select: { resourceId: true },
      });
      bookmarkedIds = new Set(bookmarks.map(b => b.resourceId));
    }

    res.json({
      resources: resources.map(r => mapResource(r, bookmarkedIds.has(r.id))),
      categories,
      total: resources.length,
    });
  } catch (error) {
    next(error);
  }
});

export default router;


