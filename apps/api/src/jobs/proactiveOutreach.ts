// @ts-nocheck
'use strict';

/**
 * Proactive Outreach Job
 * Step 94: Detect disengagement and recommend mentor/support outreach.
 *
 * This module is intentionally side-effect free by default (dry-run behavior)
 * so it can be safely scheduled later.
 */

const { prisma } = require('../db');

type OpenApplication = {
  id: string;
  userId: string;
  jobId: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
};

type OutreachUser = {
  id: string;
  email: string;
  userType: string;
  createdAt: Date;
  updatedAt: Date;
};

type MemberProfilePick = {
  userId: string;
  updatedAt: Date;
};

function safeModel(modelName) {
  const model = prisma?.[modelName];
  return model && typeof model.findMany === 'function' ? model : null;
}

function asDate(value) {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function maxDate(...dates) {
  let best = null;
  for (const d of dates) {
    const dt = asDate(d);
    if (!dt) continue;
    if (!best || dt > best) best = dt;
  }
  return best;
}

function daysBetween(a, b) {
  const da = asDate(a);
  const db = asDate(b);
  if (!da || !db) return null;
  const ms = db.getTime() - da.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

function pickOpenStatuses() {
  // Keep this tolerant: status values are stringly-typed.
  // Treat everything except terminal statuses as open.
  return {
    terminal: ['REJECTED', 'HIRED', 'WITHDRAWN', 'CANCELLED', 'CANCELED'],
  };
}

async function getMemberLastMessageAt({ applicationIds, userId }) {
  const applicationMessage = safeModel('applicationMessage');
  if (!applicationMessage || !Array.isArray(applicationIds) || applicationIds.length === 0) return null;

  const hit = await applicationMessage.findFirst({
    where: {
      applicationId: { in: applicationIds },
      userId,
    },
    orderBy: { createdAt: 'desc' },
    select: { createdAt: true },
  });

  return hit?.createdAt || null;
}

async function getMentorsToNudge({ userId, now }) {
  const mentorSession = safeModel('mentorSession');
  if (!mentorSession) return [];

  const upcoming = await mentorSession.findMany({
    where: {
      menteeId: userId,
      status: { in: ['SCHEDULED', 'CONFIRMED'] },
      scheduledAt: { gte: now },
    },
    select: { mentorId: true },
    take: 10,
  });

  const unique = new Set();
  for (const s of upcoming) {
    if (s?.mentorId) unique.add(s.mentorId);
  }
  return [...unique];
}

/**
 * Run proactive outreach detection.
 *
 * @param {object} options
 * @param {Date} [options.now] - override current time
 * @param {number} [options.daysInactive] - threshold in days, default 14
 * @param {number} [options.limitUsers] - cap number of members evaluated (best-effort)
 * @param {boolean} [options.includeNonMembers] - if true, include all user types (default false)
 */
async function runProactiveOutreach({
  now = new Date(),
  daysInactive = 14,
  limitUsers = 500,
  includeNonMembers = false,
} = {}) {
  const runAt = asDate(now) || new Date();
  const threshold = new Date(runAt);
  threshold.setDate(threshold.getDate() - Math.max(1, Number(daysInactive) || 14));

  const jobApplication = safeModel('jobApplication');
  const userModel = safeModel('user');
  const memberProfile = safeModel('memberProfile');

  if (!jobApplication || !userModel) {
    return {
      ok: true,
      processed: 0,
      reason: 'Required models not available (jobApplication/user).',
      runAt,
    };
  }

  const { terminal } = pickOpenStatuses();

  // Pull recently-updated open applications first, then dedupe by user.
  const openApps: OpenApplication[] = await jobApplication.findMany({
    where: {
      status: { notIn: terminal },
    },
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      userId: true,
      jobId: true,
      status: true,
      updatedAt: true,
      createdAt: true,
    },
    take: 5000,
  });

  const appsByUser = new Map<string, OpenApplication[]>();
  for (const app of openApps) {
    if (!app?.userId) continue;
    const list = appsByUser.get(app.userId) || [];
    list.push(app);
    appsByUser.set(app.userId, list);
  }

  const userIds = [...appsByUser.keys()].slice(0, Math.max(1, Number(limitUsers) || 500));

  const users: OutreachUser[] = await userModel.findMany({
    where: {
      id: { in: userIds },
      ...(includeNonMembers ? {} : { userType: 'MEMBER' }),
    },
    select: {
      id: true,
      email: true,
      userType: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  const usersById = new Map<string, OutreachUser>(users.map((u) => [u.id, u]));

  let profilesByUserId = new Map<string, MemberProfilePick>();
  if (memberProfile && typeof memberProfile.findMany === 'function') {
    const profiles: MemberProfilePick[] = await memberProfile.findMany({
      where: { userId: { in: users.map((u) => u.id) } },
      select: { userId: true, updatedAt: true },
    });
    profilesByUserId = new Map<string, MemberProfilePick>(profiles.map((p) => [p.userId, p]));
  }

  const nudges = [];

  for (const userId of userIds) {
    const u = usersById.get(userId);
    if (!u) continue;

    const apps = appsByUser.get(userId) || [];
    if (apps.length === 0) continue;

    const applicationIds = apps.map((a) => a.id);
    const lastMemberMessageAt = await getMemberLastMessageAt({ applicationIds, userId });

    const profile = profilesByUserId.get(userId);

    const lastActivityAt = maxDate(
      u.updatedAt,
      profile?.updatedAt,
      lastMemberMessageAt,
      // if nothing else, use application updatedAt as a weak activity proxy
      ...apps.map((a) => a.updatedAt)
    );

    if (!lastActivityAt) continue;

    if (lastActivityAt >= threshold) {
      continue; // not disengaged
    }

    const inactiveDays = daysBetween(lastActivityAt, runAt);

    const mentorsToNudge = await getMentorsToNudge({ userId, now: runAt });

    nudges.push({
      userId,
      email: u.email,
      userType: u.userType,
      inactiveDays,
      lastActivityAt,
      openApplications: apps.map((a) => ({
        id: a.id,
        jobId: a.jobId,
        status: a.status,
        updatedAt: a.updatedAt,
      })),
      recommendedOutreach: {
        notifyMember: true,
        notifySupport: true,
        notifyMentors: mentorsToNudge,
      },
      reason: `Inactive >= ${daysInactive} days with open applications`,
    });
  }

  return {
    ok: true,
    runAt,
    threshold,
    daysInactive: Math.max(1, Number(daysInactive) || 14),
    evaluatedUsers: users.length,
    matchedUsers: nudges.length,
    nudges,
  };
}
