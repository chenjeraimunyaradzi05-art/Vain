const LEVEL_ORDER = ['beginner', 'intermediate', 'advanced', 'expert'];

export async function analyzeSkillGap({ prisma, userId, jobId }) {
  // Allow jobId to be either a real id or a slug.
  const job = await prisma.job.findFirst({
    where: { OR: [{ id: jobId }, { slug: jobId }] },
    select: { id: true },
  });

  const resolvedJobId = job?.id || jobId;

  // Get job required skills
  const jobSkills = await prisma.jobSkill.findMany({
    where: { jobId: resolvedJobId },
    include: { skill: true },
  });

  // Get user's skills
  const userSkills = await prisma.userSkill.findMany({
    where: { userId },
    include: { skill: true },
  });

  const userSkillMap = new Map<string, any>(userSkills.map((us: any) => [us.skillId, us]));

  const matchedSkills: any[] = [];
  const missingSkills: any[] = [];
  const underqualifiedSkills: any[] = [];

  for (const js of jobSkills) {
    const userSkill = userSkillMap.get(js.skillId) as any;

    if (!userSkill) {
      missingSkills.push({
        skill: js.skill,
        required: js.isRequired,
        minLevel: js.minLevel,
      });
      continue;
    }

    const userLevelIndex = LEVEL_ORDER.indexOf(userSkill.level);
    const minLevelIndex = LEVEL_ORDER.indexOf(js.minLevel || 'beginner');

    if (userLevelIndex >= minLevelIndex) {
      matchedSkills.push({
        skill: js.skill,
        userLevel: userSkill.level,
        required: js.isRequired,
      });
    } else {
      underqualifiedSkills.push({
        skill: js.skill,
        userLevel: userSkill.level,
        requiredLevel: js.minLevel,
        required: js.isRequired,
      });
    }
  }

  // Find recommended courses for missing/underqualified skills
  const gapSkillIds = [
    ...missingSkills.map((s) => s.skill.id),
    ...underqualifiedSkills.map((s) => s.skill.id),
  ];

  let recommendedCourses = [];
  if (gapSkillIds.length > 0) {
    const courseSkills = await prisma.courseSkill.findMany({
      where: { skillId: { in: gapSkillIds } },
      include: { skill: true },
    });

    const courseIds = [...new Set(courseSkills.map((cs) => cs.courseId))];

    if (courseIds.length > 0) {
      const courses = await prisma.course.findMany({
        where: { id: { in: courseIds }, isActive: true },
        take: 5,
      });

      recommendedCourses = courses.map((c) => ({
        id: c.id,
        title: c.title,
        duration: c.duration,
        qualification: c.qualification,
        skillsCovered: courseSkills
          .filter((cs) => cs.courseId === c.id)
          .map((cs) => cs.skill.name),
      }));
    }
  }

  // Calculate match score
  const totalRequired = jobSkills.filter((js) => js.isRequired).length;
  const matchedRequired = matchedSkills.filter((s) => s.required).length;
  const matchScore = totalRequired > 0 ? Math.round((matchedRequired / totalRequired) * 100) : 100;

  return {
    jobId: resolvedJobId,
    matchScore,
    summary: {
      totalRequired: jobSkills.length,
      matched: matchedSkills.length,
      missing: missingSkills.length,
      underqualified: underqualifiedSkills.length,
    },
    matchedSkills,
    missingSkills,
    underqualifiedSkills,
    recommendedCourses,
  };
}

export default analyzeSkillGap;
