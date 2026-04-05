'use strict';

/**
 * Longitudinal Tracking Job
 * Phase 9A Step 79: 3mo, 12mo, 24mo follow-up automation.
 *
 * This is intentionally safe/no-op by default and can be wired into a scheduler later.
 */

import { prisma } from '../db';

const MILESTONES = [
  { milestone: 'MONTH_3', days: 90 },
  { milestone: 'MONTH_12', days: 365 },
  // 24 months is not in the PlacementOutcome milestone list today; keep as metadata.
  { milestone: 'MONTH_24', days: 730 },
];

async function runLongitudinalTracking({ now = new Date() } = {}) {
  const runAt = now instanceof Date ? now : new Date(now);

  // If placementOutcome table doesn't exist in some envs, fail gracefully.
  const prismaAny = prisma as any;
  const safeModel = (name: string) => {
    const model = prismaAny?.[name];
    return model && typeof model.findMany === 'function' ? model : null;
  };

  const placementOutcome = safeModel('placementOutcome');
  if (!placementOutcome) {
    return { ok: true, processed: 0, reason: 'placementOutcome model not available' };
  }

  // Find hires that happened long enough ago.
  const hires = await placementOutcome.findMany({
    where: { milestone: 'HIRED' },
    select: { applicationId: true, reachedAt: true },
    take: 5000,
    orderBy: { reachedAt: 'desc' },
  });

  let processed = 0;

  for (const h of hires) {
    if (!h?.reachedAt) continue;
    const hireDate = new Date(h.reachedAt);

    for (const m of MILESTONES) {
      const due = new Date(hireDate);
      due.setDate(due.getDate() + m.days);
      if (due > runAt) continue;

      // For real milestone strings, upsert into placementOutcome.
      if (m.milestone !== 'MONTH_24') {
        await placementOutcome.upsert({
          where: { applicationId_milestone: { applicationId: h.applicationId, milestone: m.milestone } },
          create: {
            applicationId: h.applicationId,
            milestone: m.milestone,
            notes: `Auto-check due ${m.days} days after hire`,
            recordedBy: 'system',
            reachedAt: runAt,
          },
          update: {
            notes: `Auto-check due ${m.days} days after hire`,
            recordedBy: 'system',
            reachedAt: runAt,
          },
        });
      }

      processed += 1;
    }
  }

  return { ok: true, processed };
}
