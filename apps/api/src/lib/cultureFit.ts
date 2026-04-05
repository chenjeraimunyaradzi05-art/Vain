// @ts-nocheck
'use strict';

const { prisma } = require('../db');

function clampInt(value, min, max) {
  const n = Number(value);
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, Math.round(n)));
}

function safeModel(modelName) {
  const model = prisma?.[modelName];
  return model && typeof model.findMany === 'function' ? model : null;
}

function tierFromScore(score) {
  if (score >= 80) return 'STRONG';
  if (score >= 60) return 'GOOD';
  if (score >= 40) return 'MIXED';
  return 'LIMITED';
}

function rapLevelScore(level, points) {
  const lvl = String(level || '').toUpperCase();
  if (lvl === 'PLATINUM') return 100;
  if (lvl === 'GOLD') return 85;
  if (lvl === 'SILVER') return 70;
  if (lvl === 'BRONZE') return 55;

  const p = Number(points);
  if (Number.isFinite(p) && p > 0) return 40;

  // No RAP information.
  return 20;
}

async function computeRetentionSignals(companyUserId, { windowDays = 365 } = {}) {
  const placementOutcome = safeModel('placementOutcome');

  if (!placementOutcome) {
    return {
      ok: true,
      source: 'fallback',
      hired: null,
      month1: null,
      month3: null,
      month6: null,
      month12: null,
      notes: ['Retention milestones unavailable (placementOutcome model not present).'],
    };
  }

  const days = clampInt(windowDays, 1, 3650);
  const start = new Date();
  start.setDate(start.getDate() - days + 1);

  const whereBase = {
    reachedAt: { gte: start },
    application: { job: { userId: companyUserId } },
  };

  const [hired, month1, month3, month6, month12] = await Promise.all([
    placementOutcome.count({ where: { ...whereBase, milestone: 'HIRED' } }),
    placementOutcome.count({ where: { ...whereBase, milestone: 'MONTH_1' } }),
    placementOutcome.count({ where: { ...whereBase, milestone: 'MONTH_3' } }),
    placementOutcome.count({ where: { ...whereBase, milestone: 'MONTH_6' } }),
    placementOutcome.count({ where: { ...whereBase, milestone: 'MONTH_12' } }),
  ]);

  return {
    ok: true,
    source: 'placementOutcome',
    hired,
    month1,
    month3,
    month6,
    month12,
    notes: [],
  };
}

function retentionScoreFromSignals(signals) {
  // If we don't have reliable retention signals, choose a neutral midpoint.
  if (!signals || signals.source !== 'placementOutcome' || typeof signals.hired !== 'number') {
    return { score: 50, note: 'Neutral score (retention data not available).' };
  }

  const hired = signals.hired;
  if (hired <= 0) {
    // No hires recorded in the window — avoid harsh penalties.
    return { score: 55, note: 'No hires in window; retention score is conservative.' };
  }

  const rate = (n) => (typeof n === 'number' && n >= 0 ? Math.min(1, n / hired) : 0);
  const r1 = rate(signals.month1);
  const r3 = rate(signals.month3);
  const r6 = rate(signals.month6);
  const r12 = rate(signals.month12);

  // Weight earlier milestones a bit more to avoid under-scoring newer cohorts.
  const weighted = (r1 * 0.4) + (r3 * 0.3) + (r6 * 0.2) + (r12 * 0.1);

  return {
    score: clampInt(weighted * 100, 0, 100),
    note: 'Computed from placement outcomes (milestones vs hires).',
  };
}

async function computeMentorParticipationSignals(companyUserId, { windowDays = 365 } = {}) {
  const notes = [];

  const mentorSession = safeModel('mentorSession');
  const mentorshipCircle = safeModel('mentorshipCircle');

  if (!mentorSession && !mentorshipCircle) {
    return {
      ok: true,
      source: 'fallback',
      sessionsCompleted: null,
      circlesActive: null,
      notes: ['Mentorship participation signals unavailable (models not present).'],
    };
  }

  const days = clampInt(windowDays, 1, 3650);
  const start = new Date();
  start.setDate(start.getDate() - days + 1);

  let sessionsCompleted = null;
  if (mentorSession && typeof mentorSession.count === 'function') {
    // CompanyUserId might not be a mentor in typical flows, but this is a safe proxy if they are.
    sessionsCompleted = await mentorSession.count({
      where: {
        mentorId: companyUserId,
        status: 'COMPLETED',
        completedAt: { gte: start },
      },
    });
  } else {
    notes.push('mentorSession.count not available; skipping sessions signal.');
  }

  let circlesActive = null;
  if (mentorshipCircle && typeof mentorshipCircle.count === 'function') {
    // Another proxy: company user running circles (if the platform uses it that way).
    circlesActive = await mentorshipCircle.count({
      where: {
        mentorId: companyUserId,
        isActive: true,
        createdAt: { gte: start },
      },
    });
  } else {
    notes.push('mentorshipCircle.count not available; skipping circles signal.');
  }

  return {
    ok: true,
    source: 'models',
    sessionsCompleted,
    circlesActive,
    notes,
  };
}

function mentorParticipationScoreFromSignals(signals) {
  if (!signals || signals.source === 'fallback') {
    return { score: 50, note: 'Neutral score (mentorship participation data not available).' };
  }

  const s = typeof signals.sessionsCompleted === 'number' ? signals.sessionsCompleted : 0;
  const c = typeof signals.circlesActive === 'number' ? signals.circlesActive : 0;
  const total = s + c * 2;

  if (total >= 10) return { score: 100, note: 'High mentorship participation (proxy signals).' };
  if (total >= 3) return { score: 80, note: 'Moderate mentorship participation (proxy signals).' };
  if (total >= 1) return { score: 65, note: 'Some mentorship participation (proxy signals).' };

  return { score: 45, note: 'No mentorship participation detected (proxy signals).' };
}

/**
 * Compute an employer culture-fit score.
 *
 * This is deliberately conservative and schema-safe:
 * - Uses CompanyProfile RAP fields when available.
 * - Uses placementOutcome retention milestones if that model exists.
 * - Uses mentorship session/circle signals only as a proxy (may be null in many schemas).
 */
async function computeEmployerCultureFit(companyUserId, options = {}) {
  if (!companyUserId) {
    return { ok: false, error: 'companyUserId is required' };
  }

  const company = await prisma.companyProfile.findUnique({
    where: { userId: companyUserId },
    select: {
      userId: true,
      companyName: true,
      industry: true,
      isVerified: true,
      rapCertificationLevel: true,
      rapCertifiedAt: true,
      rapPoints: true,
    },
  });

  if (!company) {
    return { ok: false, error: 'Company profile not found' };
  }

  const rap = {
    score: rapLevelScore(company.rapCertificationLevel, company.rapPoints),
    level: company.rapCertificationLevel || null,
    points: typeof company.rapPoints === 'number' ? company.rapPoints : null,
    certifiedAt: company.rapCertifiedAt || null,
  };

  const retentionSignals = await computeRetentionSignals(companyUserId, options);
  const retention = {
    ...retentionScoreFromSignals(retentionSignals),
    signals: retentionSignals,
  };

  const mentorSignals = await computeMentorParticipationSignals(companyUserId, options);
  const mentorship = {
    ...mentorParticipationScoreFromSignals(mentorSignals),
    signals: mentorSignals,
  };

  const verificationBoost = company.isVerified ? 5 : 0;

  const weights = {
    rap: 0.5,
    retention: 0.35,
    mentorship: 0.15,
  };

  const baseScore = (rap.score * weights.rap) + (retention.score * weights.retention) + (mentorship.score * weights.mentorship);
  const score = clampInt(baseScore + verificationBoost, 0, 100);

  const notes = [];
  if (verificationBoost) notes.push('Verified employer boost applied.');
  if (retentionSignals?.notes?.length) notes.push(...retentionSignals.notes);
  if (mentorSignals?.notes?.length) notes.push(...mentorSignals.notes);

  return {
    ok: true,
    company: {
      userId: company.userId,
      companyName: company.companyName,
      industry: company.industry,
      isVerified: company.isVerified,
    },
    score,
    tier: tierFromScore(score),
    breakdown: {
      rap,
      retention,
      mentorship,
    },
    notes,
  };
}
