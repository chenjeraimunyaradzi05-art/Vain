import crypto from 'crypto';

function getFrontendUrl() {
  return process.env.FRONTEND_URL || 'https://gimbi.com.au';
}

type PrismaClient = any;

export async function issueBadge({ prisma, userId, badgeId, evidenceUrl, expiresAt, metadata }: { prisma: PrismaClient; userId: string; badgeId: string; evidenceUrl?: string; expiresAt?: string; metadata?: any; }) {
  if (!userId || !badgeId) {
    const err = new Error('userId and badgeId are required') as Error & { statusCode?: number };
    err.statusCode = 400;
    throw err;
  }

  let badge: any = null;
  try {
    badge = await prisma.badge.findUnique({ where: { id: badgeId } });
  } catch (e) {
    // ignore lookup failure and fall back to generic badge
  }

  const shareToken = crypto.randomBytes(16).toString('hex');
  const shareUrl = `${getFrontendUrl()}/badges/verify/${shareToken}`;

  const badgeJson = JSON.stringify({
    badgeId,
    evidenceUrl: evidenceUrl || null,
    metadata: metadata || null,
    shareToken,
    shareUrl,
  });

  return prisma.userBadge.create({
    data: {
      userId,
      badgeType: badge?.category || 'custom',
      skillId: null,
      name: badge?.name || 'Badge',
      description: badge?.description || null,
      imageUrl: badge?.imageUrl || null,
      criteriaUrl: null,
      issuerName: badge?.issuerName || 'Ngurra Pathways',
      issuerId: badge?.issuerId || null,
      badgeJson,
      verificationUrl: shareUrl,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    },
  });
}

export async function issueCourseCompletionBadge({ prisma, userId, courseId, enrolmentId }: { prisma: PrismaClient; userId: string; courseId: string; enrolmentId?: string; }) {
  if (!userId || !courseId) {
    const err = new Error('userId and courseId are required') as Error & { statusCode?: number };
    err.statusCode = 400;
    throw err;
  }

  let course: any = null;
  try {
    course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { title: true, qualification: true },
    });
  } catch (e) {
    // ignore lookup errors
  }

  const shareToken = crypto.randomBytes(16).toString('hex');
  const shareUrl = `${getFrontendUrl()}/badges/verify/${shareToken}`;

  const badgeJson = JSON.stringify({
    courseId,
    enrolmentId: enrolmentId || null,
    courseName: course?.title || null,
    qualification: course?.qualification || null,
    shareToken,
    shareUrl,
  });

  return prisma.userBadge.create({
    data: {
      userId,
      badgeType: 'course_completion',
      skillId: null,
      name: course?.title || 'Course Completion',
      description: course?.qualification || 'Successfully completed a training course',
      imageUrl: null,
      criteriaUrl: null,
      issuerName: 'Gimbi Training',
      issuerId: null,
      badgeJson,
      verificationUrl: shareUrl,
      expiresAt: null,
    },
  });
}

export default {
  issueBadge,
  issueCourseCompletionBadge,
};
