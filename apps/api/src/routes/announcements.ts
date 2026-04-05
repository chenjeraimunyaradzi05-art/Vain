"use strict";

/**
 * Announcements Routes (Step 49)
 * 
 * Platform-wide announcements for admins to communicate with users.
 * Supports targeting by role, dismissal tracking, and expiration.
 */

const express = require('express');
const { prisma } = require('../db');
const authenticateJWT = require('../middleware/auth');
const { validate, createAnnouncementSchema, updateAnnouncementSchema } = require('../lib/validation');

const router = express.Router();

// Role check middleware
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
    return void res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// ============================================
// GET /announcements - List active announcements for current user
// ============================================
router.get('/', authenticateJWT, async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const now = new Date();

    // Get dismissed announcement IDs for this user
    const dismissals = await prisma.announcementDismissal.findMany({
      where: { userId },
      select: { announcementId: true },
    });
    const dismissedIds = dismissals.map(d => d.announcementId);

    // Get active announcements targeting this user's role
    const announcements = await prisma.announcement.findMany({
      where: {
        isActive: true,
        id: { notIn: dismissedIds },
        AND: [
          {
            OR: [
              { startsAt: null },
              { startsAt: { lte: now } },
            ],
          },
          {
            OR: [
              { expiresAt: null },
              { expiresAt: { gt: now } },
            ],
          },
          {
            OR: [
              { targetRoles: null },
              { targetRoles: '' },
              { targetRoles: { contains: userRole } },
            ],
          }
        ],
      },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    // Parse targetRoles JSON for response
    const parsed = announcements.map(a => ({
      ...a,
      targetRoles: a.targetRoles ? JSON.parse(a.targetRoles) : [],
    }));

    res.json({ announcements: parsed });
  } catch (error) {
    console.error('List announcements error:', error);
    res.status(500).json({ error: 'Failed to list announcements' });
  }
});

// ============================================
// GET /announcements/all - List all announcements (admin only)
// ============================================
router.get('/all', authenticateJWT, requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20, includeExpired = false } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);

    const where: any = {};
    if (!includeExpired || includeExpired === 'false') {
      const now = new Date();
      where.OR = [
        { expiresAt: null },
        { expiresAt: { gt: now } },
      ];
    }

    const [announcements, total] = await Promise.all([
      prisma.announcement.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          author: {
            select: { email: true },
          },
          _count: {
            select: { dismissals: true },
          },
        },
      }),
      prisma.announcement.count({ where }),
    ]);

    const parsed = announcements.map(a => ({
      ...a,
      targetRoles: a.targetRoles ? JSON.parse(a.targetRoles) : [],
      dismissalCount: a._count.dismissals,
    }));

    res.json({
      announcements: parsed,
      pagination: {
        page: parseInt(page),
        limit: take,
        total,
        pages: Math.ceil(total / take),
      },
    });
  } catch (error) {
    console.error('List all announcements error:', error);
    res.status(500).json({ error: 'Failed to list announcements' });
  }
});

// ============================================
// GET /announcements/:id - Get a specific announcement
// ============================================
router.get('/:id', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;

    const announcement = await prisma.announcement.findUnique({
      where: { id },
      include: {
        author: {
          select: { email: true },
        },
      },
    });

    if (!announcement) {
      return void res.status(404).json({ error: 'Announcement not found' });
    }

    res.json({
      ...announcement,
      targetRoles: announcement.targetRoles ? JSON.parse(announcement.targetRoles) : [],
    });
  } catch (error) {
    console.error('Get announcement error:', error);
    res.status(500).json({ error: 'Failed to get announcement' });
  }
});

// ============================================
// POST /announcements - Create an announcement (admin only)
// ============================================
router.post('/', authenticateJWT, requireAdmin, validate(createAnnouncementSchema), async (req, res) => {
  try {
    const authorId = req.user.id;
    const { 
      title, 
      content, 
      type, 
      priority,
      targetRoles, 
      startsAt, 
      expiresAt,
      actionUrl,
      actionText,
    } = req.body;

    const announcement = await prisma.announcement.create({
      data: {
        title,
        content,
        type: type || 'info',
        priority: priority ?? 0,
        targetRoles: targetRoles ? JSON.stringify(targetRoles) : null,
        startsAt: startsAt ? new Date(startsAt) : null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        actionUrl,
        actionText,
        authorId,
        isActive: true,
      },
    });

    res.status(201).json({
      ...announcement,
      targetRoles: announcement.targetRoles ? JSON.parse(announcement.targetRoles) : [],
    });
  } catch (error) {
    console.error('Create announcement error:', error);
    res.status(500).json({ error: 'Failed to create announcement' });
  }
});

// ============================================
// PUT /announcements/:id - Update an announcement (admin only)
// ============================================
router.put('/:id', authenticateJWT, requireAdmin, validate(updateAnnouncementSchema), async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      title, 
      content, 
      type, 
      priority,
      targetRoles, 
      startsAt, 
      expiresAt,
      actionUrl,
      actionText,
      isActive,
    } = req.body;

    const existing = await prisma.announcement.findUnique({
      where: { id },
    });

    if (!existing) {
      return void res.status(404).json({ error: 'Announcement not found' });
    }

    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (content !== undefined) updateData.content = content;
    if (type !== undefined) updateData.type = type;
    if (priority !== undefined) updateData.priority = priority;
    if (targetRoles !== undefined) updateData.targetRoles = JSON.stringify(targetRoles);
    if (startsAt !== undefined) updateData.startsAt = startsAt ? new Date(startsAt) : null;
    if (expiresAt !== undefined) updateData.expiresAt = expiresAt ? new Date(expiresAt) : null;
    if (actionUrl !== undefined) updateData.actionUrl = actionUrl;
    if (actionText !== undefined) updateData.actionText = actionText;
    if (isActive !== undefined) updateData.isActive = isActive;

    const announcement = await prisma.announcement.update({
      where: { id },
      data: updateData,
    });

    res.json({
      ...announcement,
      targetRoles: announcement.targetRoles ? JSON.parse(announcement.targetRoles) : [],
    });
  } catch (error) {
    console.error('Update announcement error:', error);
    res.status(500).json({ error: 'Failed to update announcement' });
  }
});

// ============================================
// DELETE /announcements/:id - Delete an announcement (admin only)
// ============================================
router.delete('/:id', authenticateJWT, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await prisma.announcement.findUnique({
      where: { id },
    });

    if (!existing) {
      return void res.status(404).json({ error: 'Announcement not found' });
    }

    // Delete dismissals first (cascade)
    await prisma.announcementDismissal.deleteMany({
      where: { announcementId: id },
    });

    await prisma.announcement.delete({
      where: { id },
    });

    res.json({ success: true, message: 'Announcement deleted' });
  } catch (error) {
    console.error('Delete announcement error:', error);
    res.status(500).json({ error: 'Failed to delete announcement' });
  }
});

// ============================================
// POST /announcements/:id/dismiss - Dismiss an announcement for current user
// ============================================
router.post('/:id/dismiss', authenticateJWT, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    // Check announcement exists
    const announcement = await prisma.announcement.findUnique({
      where: { id },
    });

    if (!announcement) {
      return void res.status(404).json({ error: 'Announcement not found' });
    }

    // Check if already dismissed
    const existing = await prisma.announcementDismissal.findUnique({
      where: {
        announcementId_userId: {
          announcementId: id,
          userId,
        },
      },
    });

    if (existing) {
      return void res.json({ success: true, message: 'Already dismissed' });
    }

    await prisma.announcementDismissal.create({
      data: {
        announcementId: id,
        userId,
      },
    });

    res.json({ success: true, message: 'Announcement dismissed' });
  } catch (error) {
    console.error('Dismiss announcement error:', error);
    res.status(500).json({ error: 'Failed to dismiss announcement' });
  }
});

// ============================================
// GET /announcements/:id/stats - Get announcement stats (admin only)
// ============================================
router.get('/:id/stats', authenticateJWT, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const announcement = await prisma.announcement.findUnique({
      where: { id },
      include: {
        _count: {
          select: { dismissals: true },
        },
      },
    });

    if (!announcement) {
      return void res.status(404).json({ error: 'Announcement not found' });
    }

    const targetRoles = announcement.targetRoles ? JSON.parse(announcement.targetRoles) : [];
    
    // Get total potential audience
    let audienceCount;
    if (targetRoles.length === 0) {
      audienceCount = await prisma.user.count();
    } else {
      audienceCount = await prisma.user.count({
        where: { role: { in: targetRoles } },
      });
    }

    res.json({
      id: announcement.id,
      title: announcement.title,
      dismissalCount: announcement._count.dismissals,
      audienceCount,
      dismissalRate: audienceCount > 0 
        ? ((announcement._count.dismissals / audienceCount) * 100).toFixed(2) + '%'
        : '0%',
      createdAt: announcement.createdAt,
      expiresAt: announcement.expiresAt,
      isActive: announcement.isActive,
    });
  } catch (error) {
    console.error('Get announcement stats error:', error);
    res.status(500).json({ error: 'Failed to get announcement stats' });
  }
});

export default router;


