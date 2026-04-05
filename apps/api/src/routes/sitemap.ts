/**
 * Sitemap API Routes
 * 
 * Provides dynamic sitemap data for public listings (jobs, courses, events, mentors).
 * The frontend next-sitemap can consume these endpoints to generate dynamic sitemaps.
 */

import { Router, Request, Response } from 'express';
import { prisma } from '../db';
import * as cache from '../lib/redisCache';

const router = Router();

// Cache TTL for sitemap data (1 hour)
const SITEMAP_CACHE_TTL = 3600;

interface SitemapEntry {
  loc: string;
  lastmod: string;
  changefreq: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority: number;
}

/**
 * GET /sitemap/jobs
 * Returns all published job IDs for sitemap generation
 */
router.get('/jobs', async (req: Request, res: Response) => {
  try {
    // Try cache first
    const cached = await cache.get('sitemap:jobs');
    if (cached) {
      return void res.json(cached);
    }

    const jobs = await prisma.job.findMany({
      where: { 
        isActive: true,
        expiresAt: {
          gte: new Date()
        }
      },
      select: {
        id: true,
        updatedAt: true,
        createdAt: true,
      },
      orderBy: { updatedAt: 'desc' },
    });

    const entries: SitemapEntry[] = jobs.map((job) => ({
      loc: `/jobs/${job.id}`,
      lastmod: job.updatedAt.toISOString(),
      changefreq: 'daily' as const,
      priority: 0.9,
    }));

    const result = {
      entries,
      total: entries.length,
      generated: new Date().toISOString(),
    };

    // Cache the result
    await cache.set('sitemap:jobs', result, SITEMAP_CACHE_TTL);

    res.json(result);
  } catch (error) {
    console.error('Sitemap jobs error:', error);
    res.status(500).json({ error: 'Failed to generate jobs sitemap data' });
  }
});

/**
 * GET /sitemap/courses
 * Returns all published course IDs for sitemap generation
 */
router.get('/courses', async (req: Request, res: Response) => {
  try {
    // Try cache first
    const cached = await cache.get('sitemap:courses');
    if (cached) {
      return void res.json(cached);
    }

    const courses = await prisma.course.findMany({
      where: { 
        isActive: true 
      },
      select: {
        id: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: 'desc' },
    });

    const entries: SitemapEntry[] = courses.map((course) => ({
      loc: `/courses/${course.id}`,
      lastmod: course.updatedAt.toISOString(),
      changefreq: 'weekly' as const,
      priority: 0.8,
    }));

    const result = {
      entries,
      total: entries.length,
      generated: new Date().toISOString(),
    };

    // Cache the result
    await cache.set('sitemap:courses', result, SITEMAP_CACHE_TTL);

    res.json(result);
  } catch (error) {
    console.error('Sitemap courses error:', error);
    res.status(500).json({ error: 'Failed to generate courses sitemap data' });
  }
});

/**
 * GET /sitemap/events
 * Returns upcoming cultural events for sitemap generation
 */
router.get('/events', async (req: Request, res: Response) => {
  try {
    // Try cache first
    const cached = await cache.get('sitemap:events');
    if (cached) {
      return void res.json(cached);
    }

    const events = await prisma.culturalEvent.findMany({
      where: { 
        isPublic: true,
        startDate: {
          gte: new Date()
        }
      },
      select: {
        id: true,
        updatedAt: true,
      },
      orderBy: { startDate: 'asc' },
    });

    const entries: SitemapEntry[] = events.map((event) => ({
      loc: `/events/${event.id}`,
      lastmod: event.updatedAt.toISOString(),
      changefreq: 'daily' as const,
      priority: 0.7,
    }));

    const result = {
      entries,
      total: entries.length,
      generated: new Date().toISOString(),
    };

    // Cache the result
    await cache.set('sitemap:events', result, SITEMAP_CACHE_TTL);

    res.json(result);
  } catch (error) {
    console.error('Sitemap events error:', error);
    res.status(500).json({ error: 'Failed to generate events sitemap data' });
  }
});

/**
 * GET /sitemap/mentors
 * Returns published mentor profiles for sitemap generation
 */
router.get('/mentors', async (req: Request, res: Response) => {
  try {
    // Try cache first
    const cached = await cache.get('sitemap:mentors');
    if (cached) {
      return void res.json(cached);
    }

    const mentors = await prisma.mentorProfile.findMany({
      where: { 
        active: true 
      },
      select: {
        id: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: 'desc' },
    });

    const entries: SitemapEntry[] = mentors.map((mentor) => ({
      loc: `/mentors/${mentor.id}`,
      lastmod: mentor.updatedAt.toISOString(),
      changefreq: 'weekly' as const,
      priority: 0.8,
    }));

    const result = {
      entries,
      total: entries.length,
      generated: new Date().toISOString(),
    };

    // Cache the result
    await cache.set('sitemap:mentors', result, SITEMAP_CACHE_TTL);

    res.json(result);
  } catch (error) {
    console.error('Sitemap mentors error:', error);
    res.status(500).json({ error: 'Failed to generate mentors sitemap data' });
  }
});

/**
 * GET /sitemap/all
 * Returns combined sitemap data for all public content
 */
router.get('/all', async (req: Request, res: Response) => {
  try {
    // Try cache first
    const cached = await cache.get('sitemap:all');
    if (cached) {
      return void res.json(cached);
    }

    const [jobs, courses, events, mentors] = await Promise.all([
      prisma.job.findMany({
        where: { 
          isActive: true,
          expiresAt: { gte: new Date() }
        },
        select: { id: true, updatedAt: true },
      }),
      prisma.course.findMany({
        where: { isActive: true },
        select: { id: true, updatedAt: true },
      }),
      prisma.culturalEvent.findMany({
        where: { 
          isPublic: true,
          startDate: { gte: new Date() }
        },
        select: { id: true, updatedAt: true },
      }),
      prisma.mentorProfile.findMany({
        where: { active: true },
        select: { id: true, updatedAt: true },
      }),
    ]);

    const result = {
      jobs: jobs.map(j => ({ loc: `/jobs/${j.id}`, lastmod: j.updatedAt.toISOString() })),
      courses: courses.map(c => ({ loc: `/courses/${c.id}`, lastmod: c.updatedAt.toISOString() })),
      events: events.map(e => ({ loc: `/events/${e.id}`, lastmod: e.updatedAt.toISOString() })),
      mentors: mentors.map(m => ({ loc: `/mentors/${m.id}`, lastmod: m.updatedAt.toISOString() })),
      totals: {
        jobs: jobs.length,
        courses: courses.length,
        events: events.length,
        mentors: mentors.length,
        total: jobs.length + courses.length + events.length + mentors.length,
      },
      generated: new Date().toISOString(),
    };

    // Cache the result
    await cache.set('sitemap:all', result, SITEMAP_CACHE_TTL);

    res.json(result);
  } catch (error) {
    console.error('Sitemap all error:', error);
    res.status(500).json({ error: 'Failed to generate combined sitemap data' });
  }
});

export default router;

