import { PrismaClient } from '@prisma/client';

/**
 * TAFE/RTO integration facade.
 * Currently backed by the synced `externalCourse` table and the existing course sync job.
 */

function buildExternalCourseWhere(query: any) {
  const {
    search,
    industry,
    qualification,
    provider,
    deliveryMode,
    fundingOnly,
  } = query || {};

  const where: any = { isActive: true };

  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
      { nationalCode: { contains: search, mode: 'insensitive' } },
    ];
  }

  if (industry) where.industry = industry;
  if (qualification) where.qualification = { contains: qualification, mode: 'insensitive' };
  if (provider) where.provider = { contains: provider, mode: 'insensitive' };
  if (deliveryMode) where.deliveryMode = deliveryMode;
  if (fundingOnly === 'true') where.fundingAvailable = true;

  return where;
}

export async function searchExternalCourses({ prisma, query }: { prisma: any, query: any }) {
  const { page = 1, limit = 20 } = query || {};
  const where = buildExternalCourseWhere(query);

  const [courses, total] = await Promise.all([
    prisma.externalCourse.findMany({
      where,
      skip: (parseInt(page) - 1) * parseInt(limit),
      take: parseInt(limit),
      orderBy: { lastSyncedAt: 'desc' },
    }),
    prisma.externalCourse.count({ where }),
  ]);

  return {
    courses,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit)),
    },
  };
}

export async function listExternalProviders({ prisma }: { prisma: any }) {
  const providers = await prisma.externalCourse.groupBy({
    by: ['provider'],
    where: { isActive: true },
    _count: true,
  });

  return {
    providers: providers.map((p: any) => ({
      name: p.provider,
      courseCount: p._count,
    })),
  };
}

export async function runCourseSync() {
  const courseSync = require('./course-sync');
  return courseSync.runSyncJob();
}
