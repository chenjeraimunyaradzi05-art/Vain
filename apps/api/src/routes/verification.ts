// @ts-nocheck
'use strict';

/**
 * Elder Verification Routes
 * Phase 8C Step 74: Admin verification workflow.
 *
 * This implementation uses an in-memory fallback store so it works in dev/E2E
 * even if the Prisma model isn't present yet.
 */

import express from 'express';
import authenticateJWT from '../middleware/auth';
import { prisma } from '../db';

const router = express.Router();
const prismaAny = prisma as unknown as { elderVerification?: any };

function isAdmin(req) {
  return req.user?.userType === 'GOVERNMENT' ||
    (process.env.ADMIN_API_KEY && req.headers['x-admin-key'] === process.env.ADMIN_API_KEY);
}

function requireAdmin(req, res, next) {
  if (!isAdmin(req)) return void res.status(403).json({ error: 'Admin access required' });
  return next();
}

const memoryRequests = [];

function createMemoryRequest({ userId, name, community, region, contactEmail, notes }) {
  const reqObj = {
    id: `ev_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    userId: userId || null,
    name: name || null,
    community: community || null,
    region: region || null,
    contactEmail: contactEmail || null,
    notes: notes || null,
    status: 'pending',
    createdAt: new Date().toISOString(),
    reviewedAt: null,
    reviewedBy: null,
  };
  memoryRequests.unshift(reqObj);
  if (memoryRequests.length > 500) memoryRequests.pop();
  return reqObj;
}

// Submit verification request
router.post('/elder-request', authenticateJWT, async (req, res) => {
  try {
    const userId = req.user?.id;
    const { name, community, region, contactEmail, notes } = req.body || {};

    if (!name || !contactEmail) {
      return void res.status(400).json({ error: 'name and contactEmail are required' });
    }

    // If a Prisma model exists in some environments, use it.
    if (prismaAny.elderVerification) {
      const created = await prismaAny.elderVerification.create({
        data: {
          userId,
          name,
          community: community || null,
          region: region || null,
          contactEmail,
          notes: notes || null,
          status: 'pending',
        },
      });
      return void res.status(201).json({ request: created });
    }

    const created = createMemoryRequest({ userId, name, community, region, contactEmail, notes });
    return void res.status(201).json({ request: created });
  } catch (err) {
    console.error('Create elder verification request error:', err);
    return void res.status(500).json({ error: 'Failed to submit verification request' });
  }
});

// Admin: list pending requests
router.get('/admin/elder-requests', authenticateJWT, requireAdmin, async (req, res) => {
  try {
    if (prismaAny.elderVerification) {
      const requests = await prismaAny.elderVerification.findMany({
        where: { status: 'pending' },
        orderBy: { createdAt: 'desc' },
        take: 100,
      });
      return void res.json({ requests });
    }

    const requests = memoryRequests.filter((r) => r.status === 'pending').slice(0, 100);
    return void res.json({ requests });
  } catch (err) {
    console.error('List elder verification requests error:', err);
    return void res.status(500).json({ error: 'Failed to fetch requests' });
  }
});

// Admin: approve/reject
router.put('/admin/elder-requests/:id', authenticateJWT, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body || {};

    if (!['approved', 'rejected', 'pending'].includes(String(status))) {
      return void res.status(400).json({ error: 'Invalid status' });
    }

    const reviewer = req.user?.id || null;

    if (prismaAny.elderVerification) {
      const updated = await prismaAny.elderVerification.update({
        where: { id },
        data: {
          status,
          reviewedAt: status === 'pending' ? null : new Date(),
          reviewedBy: status === 'pending' ? null : reviewer,
        },
      });
      return void res.json({ request: updated });
    }

    const idx = memoryRequests.findIndex((r) => r.id === id);
    if (idx === -1) return void res.status(404).json({ error: 'Request not found' });

    memoryRequests[idx] = {
      ...memoryRequests[idx],
      status: String(status),
      reviewedAt: status === 'pending' ? null : new Date().toISOString(),
      reviewedBy: status === 'pending' ? null : reviewer,
    };

    return void res.json({ request: memoryRequests[idx] });
  } catch (err) {
    console.error('Review elder verification request error:', err);
    return void res.status(500).json({ error: 'Failed to review request' });
  }
});

export default router;



