// @ts-nocheck
import express from 'express';
import { z } from 'zod';
import { prisma as prismaClient } from '../db';
import auth from '../middleware/auth';

const prisma = prismaClient as any;
import { validateRequest } from '../middleware/validate';

const router = express.Router();

const createSavedSearchSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(100),
    searchType: z.enum(['job', 'candidate', 'organization']).default('job'),
    query: z.record(z.any()),
    alertEnabled: z.boolean().optional(),
    alertFrequency: z.enum(['daily', 'weekly', 'instant']).optional(),
  }),
});

const updateSavedSearchSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(100).optional(),
    query: z.record(z.any()).optional(),
    alertEnabled: z.boolean().optional(),
    alertFrequency: z.enum(['daily', 'weekly', 'instant']).optional(),
  }),
});

// ============================================
// GET /saved-searches - List user's saved searches
// ============================================
router.get('/', auth.authenticate, async (req: any, res: any) => {
  try {
    const userId = req.user.id;

    const savedSearches = await prisma.savedSearch.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    // Parse JSON query for each search
    const searches = savedSearches.map((s: any) => ({
      ...s,
      query: JSON.parse(s.query || '{}'),
    }));

    res.json({ savedSearches: searches });
  } catch (error) {
    console.error('List saved searches error:', error);
    res.status(500).json({ error: 'Failed to list saved searches' });
  }
});

// ============================================
// GET /saved-searches/:id - Get a specific saved search
// ============================================
router.get('/:id', auth.authenticate, async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const savedSearch = await prisma.savedSearch.findFirst({
      where: { id, userId },
    });

    if (!savedSearch) {
      return void res.status(404).json({ error: 'Saved search not found' });
    }

    res.json({
      ...savedSearch,
      query: JSON.parse(savedSearch.query || '{}'),
    });
  } catch (error) {
    console.error('Get saved search error:', error);
    res.status(500).json({ error: 'Failed to get saved search' });
  }
});

// ============================================
// POST /saved-searches - Create a new saved search
// ============================================
router.post('/', auth.authenticate, validateRequest(createSavedSearchSchema), async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    const { name, searchType, query, alertEnabled, alertFrequency } = req.body;

    // Check limit (max 10 saved searches per user)
    const existingCount = await prisma.savedSearch.count({
      where: { userId },
    });

    if (existingCount >= 10) {
      return void res.status(400).json({ 
        error: 'Maximum saved searches reached',
        message: 'You can have up to 10 saved searches. Please delete one to create a new one.',
      });
    }

    const savedSearch = await prisma.savedSearch.create({
      data: {
        userId,
        name,
        searchType: searchType || 'job',
        query: JSON.stringify(query),
        alertEnabled: alertEnabled ?? true,
        alertFrequency: alertFrequency || 'daily',
      },
    });

    res.status(201).json({
      ...savedSearch,
      query: JSON.parse(savedSearch.query),
    });
  } catch (error) {
    console.error('Create saved search error:', error);
    res.status(500).json({ error: 'Failed to create saved search' });
  }
});

// ============================================
// PUT /saved-searches/:id - Update a saved search
// ============================================
router.put('/:id', auth.authenticate, validateRequest(updateSavedSearchSchema), async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { name, query, alertEnabled, alertFrequency } = req.body;

    // Verify ownership
    const existing = await prisma.savedSearch.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      return void res.status(404).json({ error: 'Saved search not found' });
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (query !== undefined) updateData.query = JSON.stringify(query);
    if (alertEnabled !== undefined) updateData.alertEnabled = alertEnabled;
    if (alertFrequency !== undefined) updateData.alertFrequency = alertFrequency;

    const savedSearch = await prisma.savedSearch.update({
      where: { id },
      data: updateData,
    });

    res.json({
      ...savedSearch,
      query: JSON.parse(savedSearch.query),
    });
  } catch (error) {
    console.error('Update saved search error:', error);
    res.status(500).json({ error: 'Failed to update saved search' });
  }
});

// ============================================
// DELETE /saved-searches/:id - Delete a saved search
// ============================================
router.delete('/:id', auth.authenticate, async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    // Verify ownership
    const existing = await prisma.savedSearch.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      return void res.status(404).json({ error: 'Saved search not found' });
    }

    await prisma.savedSearch.delete({
      where: { id },
    });

    res.json({ success: true, message: 'Saved search deleted' });
  } catch (error) {
    console.error('Delete saved search error:', error);
    res.status(500).json({ error: 'Failed to delete saved search' });
  }
});

// ============================================
// POST /saved-searches/:id/run - Run a saved search
// ============================================
router.post('/:id/run', auth.authenticate, async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const savedSearch = await prisma.savedSearch.findFirst({
      where: { id, userId },
    });

    if (!savedSearch) {
      return void res.status(404).json({ error: 'Saved search not found' });
    }

    const query = JSON.parse(savedSearch.query || '{}');
    let results = [];
    let total = 0;

    if (savedSearch.searchType === 'job') {
      // Build job search query
      const where: any = { isActive: true };
      
      if (query.q) {
        where.OR = [
          { title: { contains: query.q } },
          { description: { contains: query.q } },
        ];
      }
      if (query.location) {
        where.location = { contains: query.location };
      }
      if (query.employment) {
        where.employment = query.employment;
      }
      if (query.salaryMin) {
        where.salaryLow = { gte: query.salaryMin };
      }

      [results, total] = await Promise.all([
        prisma.job.findMany({
          where,
          take: 20,
          orderBy: { postedAt: 'desc' },
          include: {
            user: {
              include: {
                companyProfile: {
                  select: { companyName: true },
                },
              },
            },
          },
        }),
        prisma.job.count({ where }),
      ]);

      // Transform results
      results = results.map(job => ({
        id: job.id,
        title: job.title,
        company: job.user?.companyProfile?.companyName || 'Company',
        location: job.location,
        employment: job.employment,
        salary: job.salaryLow && job.salaryHigh 
          ? `$${job.salaryLow.toLocaleString()} - $${job.salaryHigh.toLocaleString()}`
          : null,
        postedAt: job.postedAt,
        isFeatured: job.isFeatured,
      }));
    } else if (savedSearch.searchType === 'course') {
      // Course search
      const where = { isActive: true };
      
      if (query.q) {
        where.OR = [
          { title: { contains: query.q } },
          { description: { contains: query.q } },
        ];
      }
      if (query.category) {
        where.category = query.category;
      }
      if (query.isOnline !== undefined) {
        where.isOnline = query.isOnline;
      }

      [results, total] = await Promise.all([
        prisma.course.findMany({
          where,
          take: 20,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.course.count({ where }),
      ]);
    } else if (savedSearch.searchType === 'mentor') {
      // Mentor search
      const where = { active: true };
      
      if (query.industry) {
        where.industry = { contains: query.industry };
      }
      if (query.skills) {
        where.skills = { contains: query.skills };
      }

      [results, total] = await Promise.all([
        prisma.mentorProfile.findMany({
          where,
          take: 20,
          include: {
            user: {
              select: { email: true },
            },
          },
        }),
        prisma.mentorProfile.count({ where }),
      ]);
    }

    // Update match count
    await prisma.savedSearch.update({
      where: { id },
      data: { matchCount: total },
    });

    res.json({
      savedSearch: {
        ...savedSearch,
        query,
      },
      results,
      total,
    });
  } catch (error) {
    console.error('Run saved search error:', error);
    res.status(500).json({ error: 'Failed to run saved search' });
  }
});

// ============================================
// POST /saved-searches/:id/toggle-alert - Toggle alerts
// ============================================
router.post('/:id/toggle-alert', auth.authenticate, async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const existing = await prisma.savedSearch.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      return void res.status(404).json({ error: 'Saved search not found' });
    }

    const savedSearch = await prisma.savedSearch.update({
      where: { id },
      data: { alertEnabled: !existing.alertEnabled },
    });

    res.json({
      ...savedSearch,
      query: JSON.parse(savedSearch.query),
    });
  } catch (error) {
    console.error('Toggle alert error:', error);
    res.status(500).json({ error: 'Failed to toggle alert' });
  }
});

// ============================================
// Job Alert Processing (for scheduled jobs)
// ============================================

/**
 * Process job alerts for all users
 * Called by a scheduled job (cron)
 */
export async function processJobAlerts(frequency = 'daily') {
  try {
    console.log(`[JobAlerts] Processing ${frequency} alerts...`);

    // Get all enabled saved searches for this frequency
    const searches = await prisma.savedSearch.findMany({
      where: {
        alertEnabled: true,
        alertFrequency: frequency,
        searchType: 'job', // Only job alerts for now
      },
    });

    console.log(`[JobAlerts] Found ${searches.length} searches to process`);

    const results = {
      processed: 0,
      emailsSent: 0,
      errors: 0,
    };

    for (const search of searches) {
      try {
        const query = JSON.parse(search.query || '{}');
        const lastAlertAt = search.lastAlertAt || new Date(0);

        // Build query for new jobs since last alert
        const where: any = {
          isActive: true,
          postedAt: { gt: lastAlertAt },
        };

        if (query.q) {
          where.OR = [
            { title: { contains: query.q } },
            { description: { contains: query.q } },
          ];
        }
        if (query.location) {
          where.location = { contains: query.location };
        }
        if (query.employment) {
          where.employment = query.employment;
        }

        const newJobs = await prisma.job.findMany({
          where,
          take: 10,
          orderBy: { postedAt: 'desc' },
          include: {
            user: {
              include: {
                companyProfile: {
                  select: { companyName: true },
                },
              },
            },
          },
        });

        if (newJobs.length > 0) {
          // Get user info
          const user = await prisma.user.findUnique({
            where: { id: search.userId },
            include: {
              memberProfile: true,
            },
          });

          if (user) {
            // Queue email (would integrate with mailer)
            const emailData = {
              to: user.email,
              name: user.memberProfile?.phone ? 'Member' : user.email.split('@')[0],
              searchName: search.name,
              matchCount: newJobs.length,
              jobs: newJobs.map(job => ({
                title: job.title,
                company: job.user?.companyProfile?.companyName || 'Company',
                location: job.location || 'Remote',
                url: `https://ngurrapathways.com.au/jobs/${job.id}`,
                salary: job.salaryLow && job.salaryHigh
                  ? `$${job.salaryLow.toLocaleString()} - $${job.salaryHigh.toLocaleString()}`
                  : null,
              })),
              searchUrl: `https://ngurrapathways.com.au/jobs?saved=${search.id}`,
              unsubscribeUrl: `https://ngurrapathways.com.au/settings/notifications`,
            };

            // Queue to email system
            if (prisma.emailQueue) {
              await prisma.emailQueue.create({
                data: {
                  to: emailData.to,
                  toName: emailData.name,
                  subject: `${emailData.matchCount} new jobs matching "${emailData.searchName}"`,
                  templateKey: 'jobAlert',
                  templateData: JSON.stringify(emailData),
                  priority: 'normal',
                },
              });
              results.emailsSent++;
            }

            // Update last alert time
            await prisma.savedSearch.update({
              where: { id: search.id },
              data: {
                lastAlertAt: new Date(),
                matchCount: newJobs.length,
              },
            });
          }
        }

        results.processed++;
      } catch (err) {
        console.error(`[JobAlerts] Error processing search ${search.id}:`, err);
        results.errors++;
      }
    }

    console.log(`[JobAlerts] Completed: ${results.processed} processed, ${results.emailsSent} emails, ${results.errors} errors`);
    return results;
  } catch (error) {
    console.error('[JobAlerts] Processing error:', error);
    throw error;
  }
}

export default router;


