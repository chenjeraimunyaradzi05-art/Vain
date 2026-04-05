/**
 * Learning & Pathways Routes
 * Phase 6: Education & Training
 */
import { Router } from 'express';
import { prisma as prismaClient } from '../db';
const prisma = prismaClient as any;

const router = Router();

type Difficulty = 'beginner' | 'intermediate' | 'advanced';

type LearningModule = {
  id: string;
  title: string;
  description: string;
  type: 'course' | 'certification' | 'project' | 'assessment' | 'workshop';
  duration: number;
  difficulty: Difficulty;
  skills: string[];
  prerequisites: string[];
  status: 'locked' | 'available' | 'in-progress' | 'completed';
  progress?: number;
  completedAt?: string;
  image?: string;
  provider?: string;
  isFree?: boolean;
};

type LearningPath = {
  id: string;
  title: string;
  description: string;
  targetRole: string;
  estimatedDuration: number;
  difficulty: Difficulty;
  skills: string[];
  modules: LearningModule[];
  progress: number;
  enrolledAt?: string;
  completedModules: number;
  totalModules: number;
  badgeUrl?: string;
};

function parseSkills(raw?: string | null) {
  if (!raw) return [];
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function buildModule(course: any, index: number): LearningModule {
  const skills = parseSkills(course.skills);
  return {
    id: course.id,
    title: course.title,
    description: course.description || 'Course module',
    type: 'course',
    duration: 90 + index * 15,
    difficulty: index < 2 ? 'beginner' : index < 4 ? 'intermediate' : 'advanced',
    skills,
    prerequisites: [],
    status: index === 0 ? 'in-progress' : 'available',
    progress: index === 0 ? 35 : 0,
    provider: course.providerName || 'TAFE Partner',
    isFree: Number(course.price || 0) === 0,
  };
}

function buildPath(id: string, title: string, targetRole: string, courses: any[]): LearningPath {
  const modules = courses.map(buildModule);
  const completedModules = modules.filter((m) => m.status === 'completed').length;
  const totalModules = modules.length;
  const progress = totalModules ? Math.round((completedModules / totalModules) * 100) : 0;
  const skills = Array.from(new Set(modules.flatMap((m) => m.skills))).slice(0, 10);

  return {
    id,
    title,
    description: `Structured learning path for ${targetRole}.`,
    targetRole,
    estimatedDuration: Math.max(6, Math.round(modules.length * 2.5)),
    difficulty: modules.length > 4 ? 'intermediate' : 'beginner',
    skills,
    modules,
    progress,
    completedModules,
    totalModules,
  };
}

async function buildPaths() {
  const courses = await prisma.course.findMany({ where: { isActive: true }, take: 12, orderBy: { createdAt: 'desc' } });
  const chunkA = courses.slice(0, 4);
  const chunkB = courses.slice(4, 8);
  const chunkC = courses.slice(8, 12);

  return [
    buildPath('path-business', 'Business Foundations', 'Business Administrator', chunkA),
    buildPath('path-community', 'Community Services', 'Community Support Worker', chunkB.length ? chunkB : chunkA),
    buildPath('path-tech', 'Digital Skills', 'Digital Support Officer', chunkC.length ? chunkC : chunkA),
  ];
}

router.get('/paths', async (_req, res) => {
  try {
    const paths = await buildPaths();
    res.json({ paths });
  } catch (error) {
    console.error('[Learning] paths error:', error);
    res.status(500).json({ error: 'Failed to load paths' });
  }
});

router.get('/paths/recommended', async (_req, res) => {
  try {
    const paths = await buildPaths();
    res.json({ paths });
  } catch (error) {
    console.error('[Learning] recommended paths error:', error);
    res.status(500).json({ error: 'Failed to load recommendations' });
  }
});

router.get('/paths/:id', async (req, res) => {
  try {
    const paths = await buildPaths();
    const path = paths.find((p) => p.id === req.params.id) || paths[0];
    res.json(path);
  } catch (error) {
    console.error('[Learning] path detail error:', error);
    res.status(500).json({ error: 'Failed to load path' });
  }
});

router.post('/paths/:id/enroll', async (req, res) => {
  res.json({ success: true, pathId: req.params.id });
});

router.get('/career-goals', async (_req, res) => {
  try {
    const paths = await buildPaths();
    res.json({
      goals: [
        {
          id: 'goal-1',
          title: 'Certificate III completion',
          description: 'Complete Certificate III within 6 months',
          targetDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 180).toISOString(),
          paths: paths.slice(0, 1),
          requiredSkills: ['Communication', 'Digital Literacy'],
          currentSkillLevel: { Communication: 60, 'Digital Literacy': 45 },
        },
        {
          id: 'goal-2',
          title: 'Community leadership pathway',
          description: 'Prepare for community support roles',
          targetDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 240).toISOString(),
          paths: paths.slice(1, 2),
          requiredSkills: ['Community Engagement', 'Case Notes'],
          currentSkillLevel: { 'Community Engagement': 40, 'Case Notes': 20 },
        },
      ],
    });
  } catch (error) {
    console.error('[Learning] career goals error:', error);
    res.status(500).json({ error: 'Failed to load goals' });
  }
});

// Pathways & TAFE/University mappings
router.get('/pathways', async (_req, res) => {
  res.json({
    pathways: [
      {
        id: 'pathway-1',
        from: 'Certificate III in Business',
        to: 'Diploma of Business',
        creditRPL: 'Up to 6 units',
        provider: 'TAFE NSW',
      },
      {
        id: 'pathway-2',
        from: 'Certificate IV in Community Services',
        to: 'Bachelor of Social Work',
        creditRPL: 'Up to 1 year',
        provider: 'Charles Darwin University',
      },
    ],
  });
});

router.post('/credit-transfer', async (req, res) => {
  const { creditsCompleted = 0, targetProgram = 'Diploma' } = req.body || {};
  const estimatedCredits = Math.min(100, Math.round(Number(creditsCompleted) * 0.7));
  res.json({
    targetProgram,
    creditsCompleted,
    estimatedCredits,
    message: 'Estimated credit transfer based on prior study.',
  });
});

router.post('/prior-learning', async (req, res) => {
  const { experienceYears = 0 } = req.body || {};
  const score = Math.min(100, Math.round(Number(experienceYears) * 12));
  res.json({
    score,
    recommendation: score > 70 ? 'Eligible for RPL assessment' : 'Complete bridging units',
  });
});

router.get('/internships', async (_req, res) => {
  res.json({
    internships: [
      { id: 'intern-1', title: 'Community Services Placement', provider: 'Local Council', location: 'Darwin, NT' },
      { id: 'intern-2', title: 'Digital Traineeship', provider: 'Indigenous Tech Hub', location: 'Brisbane, QLD' },
    ],
  });
});

router.get('/work-integrated', async (_req, res) => {
  res.json({
    placements: [
      { id: 'wil-1', name: 'Youth Support Placement', hoursCompleted: 30, hoursRequired: 120 },
      { id: 'wil-2', name: 'Business Admin Placement', hoursCompleted: 50, hoursRequired: 80 },
    ],
  });
});

router.get('/employer-partnerships', async (_req, res) => {
  res.json({
    partnerships: [
      { id: 'partner-1', name: 'Gimbi Employers Network', focus: 'Traineeships' },
      { id: 'partner-2', name: 'Regional Health Alliance', focus: 'Placements' },
    ],
  });
});

router.get('/alumni', async (_req, res) => {
  res.json({
    alumni: [
      { id: 'alumni-1', name: 'Keira J.', course: 'Certificate IV in Business', year: 2024 },
      { id: 'alumni-2', name: 'Tiana B.', course: 'Diploma of Community Services', year: 2025 },
    ],
  });
});

export default router;
