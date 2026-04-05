import express, { Request, Response } from 'express';
import { prisma as prismaClient } from '../db';
const prisma = prismaClient as any;
import { authenticate as authenticateJWT } from '../middleware/auth';
import { requireAdmin, isAdmin } from '../middleware/adminAuth';
import { searchExternalCourses, listExternalProviders, runCourseSync } from '../lib/tafeApi';

const router = express.Router();

type LessonProgress = {
  id: string;
  title: string;
  completedAt?: string | null;
  progress?: number;
  timeSpent?: number;
  duration?: number;
  type?: 'video' | 'reading' | 'quiz' | 'exercise';
};

type UiLesson = {
  id: string;
  title: string;
  duration: number;
  type: 'video' | 'reading' | 'quiz' | 'exercise';
  completed: boolean;
  progress: number;
  timeSpent: number;
};

type UiModule = {
  id: string;
  title: string;
  lessons: UiLesson[];
  progress: number;
};

/**
 * Build default lessons from course skills or fallback modules
 */
function buildDefaultLessons(course: any): LessonProgress[] {
  const raw = String(course?.skills || '').split(',').map((s) => s.trim()).filter(Boolean);
  if (raw.length > 0) {
    return raw.map((title, index) => ({ id: `lesson-${index + 1}`, title }));
  }
  const fallbackCount = 6;
  return Array.from({ length: fallbackCount }).map((_, index) => ({
    id: `lesson-${index + 1}`,
    title: `Module ${index + 1}`,
  }));
}

/**
 * Get lesson progress from database or initialize with defaults
 */
async function getOrInitializeLessons(enrolmentId: string, course: any): Promise<LessonProgress[]> {
  const enrolment = await prisma.courseEnrolment.findUnique({
    where: { id: enrolmentId },
    select: { lessonProgress: true }
  });
  
  if (enrolment?.lessonProgress && Array.isArray(enrolment.lessonProgress)) {
    return enrolment.lessonProgress as LessonProgress[];
  }
  
  // Initialize with default lessons and persist
  const defaultLessons = buildDefaultLessons(course);
  await prisma.courseEnrolment.update({
    where: { id: enrolmentId },
    data: { lessonProgress: defaultLessons }
  });
  
  return defaultLessons;
}

/**
 * Update lesson progress in database
 */
async function updateLessonProgress(enrolmentId: string, lessons: LessonProgress[]): Promise<void> {
  await prisma.courseEnrolment.update({
    where: { id: enrolmentId },
    data: { lessonProgress: lessons }
  });
}

function computeProgress(lessons: LessonProgress[]) {
  const total = lessons.length || 0;
  const completed = lessons.filter((l) => l.completedAt).length;
  const nextLesson = lessons.find((l) => !l.completedAt)?.title || null;
  const progress = total ? Math.round((completed / total) * 100) : 0;
  return { total, completed, nextLesson, progress };
}

function normalizeLessonsForUi(lessons: LessonProgress[]): UiLesson[] {
  return lessons.map((lesson) => {
    const duration = typeof lesson.duration === 'number' ? lesson.duration : 20;
    const completed = Boolean(lesson.completedAt);
    const progress = typeof lesson.progress === 'number' ? Math.max(0, Math.min(100, lesson.progress)) : (completed ? 100 : 0);
    const timeSpent = typeof lesson.timeSpent === 'number' ? lesson.timeSpent : (completed ? duration : 0);
    const type = lesson.type || 'reading';
    return {
      id: lesson.id,
      title: lesson.title,
      duration,
      type,
      completed,
      progress,
      timeSpent,
    };
  });
}

function buildModulesForUi(lessons: UiLesson[]): UiModule[] {
  const completed = lessons.filter((lesson) => lesson.completed).length;
  const progress = lessons.length ? Math.round((completed / lessons.length) * 100) : 0;
  return [
    {
      id: 'module-1',
      title: 'Module 1',
      lessons,
      progress,
    },
  ];
}

interface WhereClause {
  category?: string;
  OR?: any[];
  institutionId?: string;
  isActive?: boolean;
}

interface UpdateData {
  status?: string;
  progress?: number;
  nextLesson?: string;
  dueDate?: Date | null;
  completedAt?: Date;
  title?: string;
  description?: string;
  duration?: string;
  qualification?: string;
  industry?: string;
  location?: string;
  isOnline?: boolean;
  price?: number | null;
  isActive?: boolean;
  imageUrl?: string;
  externalUrl?: string;
}

// Get all available courses (public)
router.get('/', async (req: Request, res: Response) => {
  try {
    const { category, search, page = '1', pageSize = '20' } = req.query;
    
    const where: WhereClause = {};
    if (category) where.category = category as string;
    if (search) {
      where.OR = [
        { title: { contains: search as string } },
        { description: { contains: search as string } },
        { skills: { contains: search as string } }
      ];
    }
    
    const [courses, total] = await Promise.all([
      prisma.course.findMany({
        where,
        skip: (parseInt(page as string) - 1) * parseInt(pageSize as string),
        take: parseInt(pageSize as string),
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { enrolments: true } }
        }
      }),
      prisma.course.count({ where })
    ]);
    
    res.json({
      courses: courses.map((c: any) => ({
        id: c.id,
        title: c.title,
        description: c.description,
        duration: c.duration,
        category: c.category,
        location: c.location,
        isOnline: c.isOnline,
        price: c.priceInCents ? c.priceInCents / 100 : null,
        priceInCents: c.priceInCents,
        provider: c.providerName || 'Unknown Provider',
        skills: c.skills,
        url: c.url,
        enrolmentCount: c._count?.enrolments || 0,
        createdAt: c.createdAt
      })),
      total,
      page: parseInt(page as string),
      pageSize: parseInt(pageSize as string)
    });
  } catch (e) {
    console.error('Fetch courses error:', e);
    res.status(500).json({ error: 'Failed to fetch courses' });
  }
});

// Get enrolled courses
router.get('/enrolled', authenticateJWT, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return void res.status(401).json({ error: 'Unauthorized' });
    }

    const enrolments = await prisma.courseEnrolment.findMany({
      where: { userId },
      include: {
        course: {
          include: {
            institution: { select: { id: true, email: true, institutionProfile: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const courses = await Promise.all(enrolments.map(async (enrolment) => {
      const course = enrolment.course as any;
      const lessons = await getOrInitializeLessons(enrolment.id, course);
      const progressMeta = computeProgress(lessons);
      const uiLessons = normalizeLessonsForUi(lessons);
      const modules = buildModulesForUi(uiLessons);

      const totalDuration = uiLessons.reduce((sum, lesson) => sum + lesson.duration, 0);
      const timeSpent = uiLessons.reduce((sum, lesson) => sum + lesson.timeSpent, 0);
      const profile = course?.institution?.institutionProfile as any;
      const instructorName = profile?.institutionName || profile?.name || course?.providerName || course?.institution?.email || 'Unknown Instructor';
      const instructorAvatar = profile?.avatarUrl || undefined;
      const enrolledAt = enrolment.startDate || enrolment.createdAt;
      const progress = enrolment.progress ?? progressMeta.progress ?? 0;

      return {
        id: enrolment.courseId,
        title: course?.title || 'Untitled Course',
        description: course?.description || '',
        imageUrl: course?.imageUrl || undefined,
        instructor: {
          name: instructorName,
          avatar: instructorAvatar,
        },
        category: course?.category || 'General',
        totalLessons: progressMeta.total,
        completedLessons: progressMeta.completed,
        totalDuration,
        timeSpent,
        progress,
        enrolledAt: enrolledAt?.toISOString ? enrolledAt.toISOString() : String(enrolledAt),
        lastAccessedAt: enrolment.updatedAt?.toISOString ? enrolment.updatedAt.toISOString() : undefined,
        certificateAvailable: Boolean(enrolment.certificateUrl) || progress === 100,
        certificateId: enrolment.certificateUrl ? enrolment.id : undefined,
        modules,
      };
    }));

    res.json({ courses });
  } catch (e) {
    console.error('Fetch enrolled courses error:', e);
    res.status(500).json({ error: 'Failed to fetch enrolled courses' });
  }
});

// Get course progress by courseId (frontend expects this shape)
router.get('/:courseId/progress', authenticateJWT, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return void res.status(401).json({ error: 'Unauthorized' });
    }

    const enrolment = await prisma.courseEnrolment.findFirst({
      where: { userId, courseId: req.params.courseId },
      include: {
        course: {
          include: { institution: { select: { id: true, email: true, institutionProfile: true } } },
        },
      },
    });

    if (!enrolment) {
      return void res.status(404).json({ error: 'Enrolment not found' });
    }

    const course = enrolment.course as any;
    const lessons = await getOrInitializeLessons(enrolment.id, course);
    const progressMeta = computeProgress(lessons);
    const uiLessons = normalizeLessonsForUi(lessons);
    const modules = buildModulesForUi(uiLessons);

    const totalDuration = uiLessons.reduce((sum, lesson) => sum + lesson.duration, 0);
    const timeSpent = uiLessons.reduce((sum, lesson) => sum + lesson.timeSpent, 0);
    const profile = course?.institution?.institutionProfile as any;
    const instructorName = profile?.institutionName || profile?.name || course?.providerName || course?.institution?.email || 'Unknown Instructor';
    const instructorAvatar = profile?.avatarUrl || undefined;
    const enrolledAt = enrolment.startDate || enrolment.createdAt;
    const progress = enrolment.progress ?? progressMeta.progress ?? 0;

    res.json({
      id: enrolment.courseId,
      title: course?.title || 'Untitled Course',
      description: course?.description || '',
      imageUrl: course?.imageUrl || undefined,
      instructor: {
        name: instructorName,
        avatar: instructorAvatar,
      },
      category: course?.category || 'General',
      totalLessons: progressMeta.total,
      completedLessons: progressMeta.completed,
      totalDuration,
      timeSpent,
      progress,
      enrolledAt: enrolledAt?.toISOString ? enrolledAt.toISOString() : String(enrolledAt),
      lastAccessedAt: enrolment.updatedAt?.toISOString ? enrolment.updatedAt.toISOString() : undefined,
      certificateAvailable: Boolean(enrolment.certificateUrl) || progress === 100,
      certificateId: enrolment.certificateUrl ? enrolment.id : undefined,
      modules,
    });
  } catch (e) {
    console.error('Fetch course progress error:', e);
    res.status(500).json({ error: 'Failed to fetch course progress' });
  }
});

// Mark lesson as completed by courseId
router.post('/:courseId/lessons/:lessonId/complete', authenticateJWT, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return void res.status(401).json({ error: 'Unauthorized' });
    }

    const enrolment = await prisma.courseEnrolment.findFirst({
      where: { userId, courseId: req.params.courseId },
      include: { course: true },
    });

    if (!enrolment) {
      return void res.status(404).json({ error: 'Enrolment not found' });
    }

    const lessons = await getOrInitializeLessons(enrolment.id, enrolment.course);
    const target = lessons.find((lesson) => lesson.id === req.params.lessonId);
    if (!target) return void res.status(404).json({ error: 'Lesson not found' });

    if (!target.completedAt) {
      target.completedAt = new Date().toISOString();
    }
    target.progress = 100;
    target.timeSpent = typeof target.timeSpent === 'number' ? target.timeSpent : (target.duration || 20);

    await updateLessonProgress(enrolment.id, lessons);

    const progressMeta = computeProgress(lessons);
    const updated = await prisma.courseEnrolment.update({
      where: { id: enrolment.id },
      data: {
        progress: progressMeta.progress,
        nextLesson: progressMeta.nextLesson || null,
        status: progressMeta.progress === 100 ? 'COMPLETED' : 'IN_PROGRESS',
        ...(progressMeta.progress === 100 ? { completedAt: new Date() } : {}),
      },
    });

    res.json({
      enrolmentId: updated.id,
      progress: updated.progress,
      status: updated.status,
      nextLesson: updated.nextLesson,
      totalLessons: progressMeta.total,
      completedLessons: progressMeta.completed,
      lessons: normalizeLessonsForUi(lessons),
    });
  } catch (e) {
    console.error('Complete lesson error:', e);
    res.status(500).json({ error: 'Failed to complete lesson' });
  }
});

// Update lesson progress by courseId (frontend expects this route)
router.put('/:courseId/lessons/:lessonId/progress', authenticateJWT, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return void res.status(401).json({ error: 'Unauthorized' });
    }

    const enrolment = await prisma.courseEnrolment.findFirst({
      where: { userId, courseId: req.params.courseId },
      include: { course: true },
    });

    if (!enrolment) {
      return void res.status(404).json({ error: 'Enrolment not found' });
    }

    const lessons = await getOrInitializeLessons(enrolment.id, enrolment.course);
    const target = lessons.find((lesson) => lesson.id === req.params.lessonId);
    if (!target) return void res.status(404).json({ error: 'Lesson not found' });

    const progress = typeof req.body?.progress === 'number' ? req.body.progress : parseInt(req.body?.progress);
    if (!Number.isNaN(progress)) {
      target.progress = Math.max(0, Math.min(100, progress));
      if (target.progress === 100 && !target.completedAt) {
        target.completedAt = new Date().toISOString();
      } else if (target.progress < 100) {
        target.completedAt = null;
      }
    }

    const timeSpent = typeof req.body?.timeSpent === 'number' ? req.body.timeSpent : parseInt(req.body?.timeSpent);
    if (!Number.isNaN(timeSpent)) {
      target.timeSpent = Math.max(0, timeSpent);
    }

    await updateLessonProgress(enrolment.id, lessons);

    const progressMeta = computeProgress(lessons);
    const updated = await prisma.courseEnrolment.update({
      where: { id: enrolment.id },
      data: {
        progress: progressMeta.progress,
        nextLesson: progressMeta.nextLesson || null,
        status: progressMeta.progress === 100 ? 'COMPLETED' : 'IN_PROGRESS',
        ...(progressMeta.progress === 100 ? { completedAt: new Date() } : {}),
      },
    });

    res.json({
      enrolmentId: updated.id,
      progress: updated.progress,
      status: updated.status,
      nextLesson: updated.nextLesson,
      totalLessons: progressMeta.total,
      completedLessons: progressMeta.completed,
      lessons: normalizeLessonsForUi(lessons),
    });
  } catch (e) {
    console.error('Update lesson progress error:', e);
    res.status(500).json({ error: 'Failed to update lesson progress' });
  }
});

// Get certificate by courseId
router.get('/:courseId/certificate', authenticateJWT, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return void res.status(401).json({ error: 'Unauthorized' });
    }

    const enrolment = await prisma.courseEnrolment.findFirst({
      where: { userId, courseId: req.params.courseId },
    });

    if (!enrolment) {
      return void res.status(404).json({ error: 'Enrolment not found' });
    }

    if (!enrolment.certificateUrl) {
      return void res.status(404).json({ error: 'Certificate not issued yet' });
    }

    res.json({ certificateUrl: enrolment.certificateUrl });
  } catch (e) {
    console.error('Fetch certificate error:', e);
    res.status(500).json({ error: 'Failed to fetch certificate' });
  }
});

// Persistent notes/quiz endpoints
router.get('/:courseId/notes', authenticateJWT, async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;
  if (!userId) return void res.status(401).json({ error: 'Unauthorized' });

  try {
    const enrolment = await prisma.courseEnrolment.findUnique({
      where: { userId_courseId: { userId, courseId: req.params.courseId } },
      include: { notes: { orderBy: { createdAt: 'desc' } } }
    });
    // Add courseId to each note as expected by frontend
    const notes = (enrolment?.notes || []).map((n: any) => ({
      ...n,
      courseId: req.params.courseId
    }));
    res.json({ notes });
  } catch (e) {
    console.error('Fetch notes error:', e);
    res.json({ notes: [] }); 
  }
});

router.post('/:courseId/notes', authenticateJWT, async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;
  if (!userId) return void res.status(401).json({ error: 'Unauthorized' });

  try {
    const enrolment = await prisma.courseEnrolment.findUnique({
      where: { userId_courseId: { userId, courseId: req.params.courseId } }
    });

    if (!enrolment) {
      return void res.status(404).json({ error: 'Not enrolled in this course' });
    }

    const note = await prisma.courseNote.create({
      data: {
        courseEnrolmentId: enrolment.id,
        lessonId: req.body?.lessonId,
        content: String(req.body?.content || '')
      }
    });

    res.status(201).json({
      ...note,
      courseId: req.params.courseId
    });
  } catch (e) {
    console.error('Create note error:', e);
    res.status(500).json({ error: 'Failed to create note' });
  }
});

router.delete('/:courseId/notes/:noteId', authenticateJWT, async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;
  if (!userId) return void res.status(401).json({ error: 'Unauthorized' });

  try {
    const note = await prisma.courseNote.findUnique({
      where: { id: req.params.noteId },
      include: { courseEnrolment: true }
    });

    if (!note || note.courseEnrolment.userId !== userId) {
      return void res.status(404).json({ error: 'Note not found' });
    }

    await prisma.courseNote.delete({ where: { id: req.params.noteId } });
    res.status(204).send();
  } catch (e) {
    console.error('Delete note error:', e);
    res.status(500).json({ error: 'Failed to delete note' });
  }
});

router.get('/:courseId/quiz-results', authenticateJWT, async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;
  if (!userId) return void res.status(401).json({ error: 'Unauthorized' });

  try {
    const enrolment = await prisma.courseEnrolment.findUnique({
      where: { userId_courseId: { userId, courseId: req.params.courseId } },
      include: { quizResults: { orderBy: { createdAt: 'desc' } } }
    });
    res.json({ results: enrolment?.quizResults || [] });
  } catch (e) {
    console.error('Fetch quiz results error:', e);
    res.json({ results: [] }); 
  }
});

// Get course categories
router.get('/categories', async (req: Request, res: Response) => {
  try {
    const categories = await prisma.course.groupBy({
      by: ['category'],
      where: { category: { not: null } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } }
    });
    
    res.json({
      categories: categories.map((c: any) => ({
        name: c.category,
        count: c._count.id
      }))
    });
  } catch (e) {
    console.error('Fetch categories error:', e);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// Alias for /my/enrolments - frontend calls /enrolments
router.get('/enrolments', authenticateJWT, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    
    const enrolments = await prisma.courseEnrolment.findMany({
      where: { userId },
      include: {
        course: {
          include: {
            institution: { select: { id: true, email: true, institutionProfile: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    // Process enrolments with lesson progress from database
    const enrichedEnrolments = await Promise.all(enrolments.map(async (e: any) => {
      const lessons = await getOrInitializeLessons(e.id, e.course);
      const progressMeta = computeProgress(lessons);
      return {
        id: e.id,
        courseId: e.courseId,
        courseTitle: e.course?.title,
        provider: e.course?.institution?.institutionProfile?.name || e.course?.institution?.email || 'Unknown',
        enrolledAt: e.createdAt,
        progress: e.progress || progressMeta.progress || 0,
        status: (e.status || 'IN_PROGRESS').toLowerCase().replace('_', '-'),
        completedAt: e.completedAt,
        nextLesson: e.nextLesson || progressMeta.nextLesson,
        dueDate: e.dueDate || null,
        certificateUrl: e.certificateUrl || null,
        totalLessons: progressMeta.total,
        completedLessons: progressMeta.completed,
      };
    }));
    
    res.json({ enrolments: enrichedEnrolments });
  } catch (e) {
    console.error('Fetch enrolments error:', e);
    res.status(500).json({ error: 'Failed to fetch enrolments' });
  }
});

// Get granular progress for an enrolment
router.get('/enrolments/:enrolmentId/progress', authenticateJWT, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const enrolment = await prisma.courseEnrolment.findUnique({
      where: { id: req.params.enrolmentId },
      include: { course: true },
    });

    if (!enrolment || enrolment.userId !== userId) {
      return void res.status(403).json({ error: 'Not authorized to view this progress' });
    }

    const lessons = await getOrInitializeLessons(enrolment.id, enrolment.course);
    const progressMeta = computeProgress(lessons);

    res.json({
      enrolmentId: enrolment.id,
      courseId: enrolment.courseId,
      progress: enrolment.progress || progressMeta.progress,
      totalLessons: progressMeta.total,
      completedLessons: progressMeta.completed,
      nextLesson: enrolment.nextLesson || progressMeta.nextLesson,
      lessons,
    });
  } catch (e) {
    console.error('Fetch enrolment progress error:', e);
    res.status(500).json({ error: 'Failed to fetch enrolment progress' });
  }
});

// Mark lesson as completed for an enrolment
router.post('/enrolments/:enrolmentId/lessons/:lessonId/complete', authenticateJWT, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const enrolment = await prisma.courseEnrolment.findUnique({
      where: { id: req.params.enrolmentId },
      include: { course: true },
    });

    if (!enrolment || enrolment.userId !== userId) {
      return void res.status(403).json({ error: 'Not authorized to update this progress' });
    }

    const lessons = await getOrInitializeLessons(enrolment.id, enrolment.course);
    const target = lessons.find((lesson) => lesson.id === req.params.lessonId);
    if (!target) return void res.status(404).json({ error: 'Lesson not found' });

    if (!target.completedAt) {
      target.completedAt = new Date().toISOString();
    }
    
    // Persist lesson progress to database
    await updateLessonProgress(enrolment.id, lessons);

    const progressMeta = computeProgress(lessons);

    const updated = await prisma.courseEnrolment.update({
      where: { id: enrolment.id },
      data: {
        progress: progressMeta.progress,
        nextLesson: progressMeta.nextLesson || null,
        status: progressMeta.progress === 100 ? 'COMPLETED' : 'IN_PROGRESS',
        ...(progressMeta.progress === 100 ? { completedAt: new Date() } : {}),
      },
    });

    res.json({
      enrolmentId: updated.id,
      progress: updated.progress,
      status: updated.status,
      nextLesson: updated.nextLesson,
      totalLessons: progressMeta.total,
      completedLessons: progressMeta.completed,
      lessons,
    });
  } catch (e) {
    console.error('Complete lesson error:', e);
    res.status(500).json({ error: 'Failed to complete lesson' });
  }
});

// Get my enrolments
router.get('/my/enrolments', authenticateJWT, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    
    const enrolments = await prisma.courseEnrolment.findMany({
      where: { userId },
      include: {
        course: {
          include: {
            institution: { select: { id: true, email: true, institutionProfile: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    res.json({
      enrolments: enrolments.map((e: any) => ({
        id: e.id,
        status: e.status,
        startDate: e.startDate,
        completedAt: e.completedAt,
        certificateUrl: e.certificateUrl,
        createdAt: e.createdAt,
        courseId: e.courseId,
        course: {
          id: e.course.id,
          title: e.course.title,
          description: e.course.description,
          duration: e.course.duration,
          qualification: e.course.qualification,
          industry: e.course.industry,
          location: e.course.location,
          isOnline: e.course.isOnline,
          price: e.course.price,
          externalUrl: e.course.externalUrl,
          provider: e.course.institution?.institutionProfile?.name || e.course.institution?.email || 'Unknown'
        }
      }))
    });
  } catch (e) {
    console.error('Fetch enrolments error:', e);
    res.status(500).json({ error: 'Failed to fetch enrolments' });
  }
});

// Get certificate for an enrolment
router.get('/enrolments/:enrolmentId/certificate', authenticateJWT, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const enrolment = await prisma.courseEnrolment.findUnique({
      where: { id: req.params.enrolmentId },
      include: { course: true },
    });

    if (!enrolment || enrolment.userId !== userId) {
      return void res.status(403).json({ error: 'Not authorized to access this certificate' });
    }

    if (!enrolment.certificateUrl) {
      return void res.status(404).json({ error: 'Certificate not issued yet' });
    }

    res.json({
      certificateUrl: enrolment.certificateUrl,
      courseTitle: enrolment.course?.title,
      completedAt: enrolment.completedAt,
    });
  } catch (e) {
    console.error('Fetch certificate error:', e);
    res.status(500).json({ error: 'Failed to fetch certificate' });
  }
});

// Issue or update certificate for an enrolment
router.post('/enrolments/:enrolmentId/certificate', authenticateJWT, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const enrolment = await prisma.courseEnrolment.findUnique({
      where: { id: req.params.enrolmentId },
      include: { course: true },
    });

    if (!enrolment || enrolment.userId !== userId) {
      return void res.status(403).json({ error: 'Not authorized to update this certificate' });
    }

    if (enrolment.status !== 'COMPLETED') {
      return void res.status(400).json({ error: 'Course must be completed before issuing certificate' });
    }

    const providedUrl = req.body?.certificateUrl;
    const certificateUrl = providedUrl || `https://certificates.gimbi.app/${enrolment.id}`;

    const updated = await prisma.courseEnrolment.update({
      where: { id: enrolment.id },
      data: { certificateUrl },
    });

    res.json({ certificateUrl: updated.certificateUrl });
  } catch (e) {
    console.error('Issue certificate error:', e);
    res.status(500).json({ error: 'Failed to issue certificate' });
  }
});

// Enrol in a course
router.post('/:id/enrol', authenticateJWT, async (req: Request, res: Response) => {
  try {
    const courseId = req.params.id;
    const userId = (req as any).user.id;
    
    // Check if already enrolled
    const existing = await prisma.courseEnrolment.findFirst({
      where: { courseId, userId }
    });
    
    if (existing) {
      return void res.status(400).json({ error: 'Already enrolled in this course' });
    }
    
    // Check if course exists and is active
    const course = await prisma.course.findUnique({
      where: { id: courseId }
    });
    
    if (!course || !course.isActive) {
      return void res.status(404).json({ error: 'Course not found or not available' });
    }
    
    const enrolment = await prisma.courseEnrolment.create({
      data: {
        courseId,
        userId,
        status: 'ENROLLED',
        startDate: new Date()
      },
      include: { course: true }
    });
    
    res.json({ enrolment, message: 'Successfully enrolled in course' });
  } catch (e) {
    console.error('Enrol error:', e);
    res.status(500).json({ error: 'Failed to enrol in course' });
  }
});

// Update enrolment status
router.put('/enrolments/:enrolmentId', authenticateJWT, async (req: Request, res: Response) => {
  try {
    const { enrolmentId } = req.params;
    const { status, completedAt, progress, nextLesson, dueDate } = req.body;
    const userId = (req as any).user.id;
    
    const enrolment = await prisma.courseEnrolment.findUnique({
      where: { id: enrolmentId }
    });
    
    if (!enrolment || enrolment.userId !== userId) {
      return void res.status(403).json({ error: 'Not authorized to update this enrolment' });
    }
    
    const updateData: UpdateData = {};
    if (status) updateData.status = status;
    if (progress !== undefined) {
      updateData.progress = Math.max(0, Math.min(100, parseInt(progress) || 0));
      // Auto-set status based on progress
      if (updateData.progress > 0 && updateData.progress < 100 && !status) {
        updateData.status = 'IN_PROGRESS';
      } else if (updateData.progress === 100 && !status) {
        updateData.status = 'COMPLETED';
        updateData.completedAt = new Date();
      }
    }
    if (nextLesson !== undefined) updateData.nextLesson = nextLesson;
    if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null;
    if (status === 'COMPLETED') updateData.completedAt = completedAt || new Date();
    
    const updated = await prisma.courseEnrolment.update({
      where: { id: enrolmentId },
      data: updateData,
      include: { course: true }
    });
    
    res.json({ enrolment: updated });
  } catch (e) {
    console.error('Update enrolment error:', e);
    res.status(500).json({ error: 'Failed to update enrolment' });
  }
});

// Update course progress (dedicated endpoint)
router.put('/enrolments/:enrolmentId/progress', authenticateJWT, async (req: Request, res: Response) => {
  try {
    const { enrolmentId } = req.params;
    const { progress, lessonCompleted, nextLesson } = req.body;
    const userId = (req as any).user.id;
    
    const enrolment = await prisma.courseEnrolment.findUnique({
      where: { id: enrolmentId },
      include: { course: true }
    });
    
    if (!enrolment || enrolment.userId !== userId) {
      return void res.status(403).json({ error: 'Not authorized to update this enrolment' });
    }
    
    const newProgress = Math.max(0, Math.min(100, parseInt(progress) || enrolment.progress));
    const updateData: UpdateData = {
      progress: newProgress,
      ...(nextLesson !== undefined && { nextLesson }),
    };
    
    // Auto-update status based on progress
    if (newProgress > 0 && newProgress < 100) {
      updateData.status = 'IN_PROGRESS';
    } else if (newProgress === 100) {
      updateData.status = 'COMPLETED';
      updateData.completedAt = new Date();
    }
    
    const updated = await prisma.courseEnrolment.update({
      where: { id: enrolmentId },
      data: updateData,
      include: { course: true }
    });
    
    res.json({ 
      success: true,
      enrolment: {
        id: updated.id,
        progress: updated.progress,
        status: updated.status,
        nextLesson: updated.nextLesson,
        completedAt: updated.completedAt,
        course: {
          id: updated.course.id,
          title: updated.course.title
        }
      },
      message: newProgress === 100 ? 'Course completed!' : `Progress updated to ${newProgress}%`
    });
  } catch (e) {
    console.error('Update progress error:', e);
    res.status(500).json({ error: 'Failed to update progress' });
  }
});

// Withdraw from course
router.delete('/enrolments/:enrolmentId', authenticateJWT, async (req: Request, res: Response) => {
  try {
    const { enrolmentId } = req.params;
    const userId = (req as any).user.id;
    
    const enrolment = await prisma.courseEnrolment.findUnique({
      where: { id: enrolmentId }
    });
    
    if (!enrolment || enrolment.userId !== userId) {
      return void res.status(403).json({ error: 'Not authorized to withdraw from this enrolment' });
    }
    
    // Instead of deleting, mark as withdrawn
    await prisma.courseEnrolment.update({
      where: { id: enrolmentId },
      data: { status: 'WITHDRAWN' }
    });
    
    res.json({ message: 'Successfully withdrawn from course' });
  } catch (e) {
    console.error('Withdraw error:', e);
    res.status(500).json({ error: 'Failed to withdraw from course' });
  }
});

// TAFE/Institution: Create a course
router.post('/', authenticateJWT, async (req: Request, res: Response) => {
  try {
    const institutionId = (req as any).user.id;
    const { title, description, duration, qualification, industry, location, isOnline, price } = req.body;
    
    if (!title || !description) {
      return void res.status(400).json({ error: 'Title and description are required' });
    }
    
    const course = await prisma.course.create({
      data: {
        institutionId,
        title,
        description,
        duration: duration || null,
        qualification: qualification || null,
        industry: industry || null,
        location: location || null,
        isOnline: isOnline || false,
        price: price ? parseInt(price) : null,
        isActive: true
      }
    });
    
    res.status(201).json({ course, message: 'Course created successfully' });
  } catch (e) {
    console.error('Create course error:', e);
    res.status(500).json({ error: 'Failed to create course' });
  }
});

// TAFE/Institution: Update a course
router.put('/:id', authenticateJWT, async (req: Request, res: Response) => {
  try {
    const courseId = req.params.id;
    const institutionId = (req as any).user.id;
    const { title, description, duration, qualification, industry, location, isOnline, price, isActive } = req.body;
    
    // Check ownership
    const existing = await prisma.course.findUnique({ where: { id: courseId } });
    if (!existing || existing.institutionId !== institutionId) {
      return void res.status(403).json({ error: 'Not authorized to update this course' });
    }
    
    const updateData: UpdateData = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (duration !== undefined) updateData.duration = duration;
    if (qualification !== undefined) updateData.qualification = qualification;
    if (industry !== undefined) updateData.industry = industry;
    if (location !== undefined) updateData.location = location;
    if (isOnline !== undefined) updateData.isOnline = isOnline;
    if (price !== undefined) updateData.price = price ? parseInt(price) : null;
    if (isActive !== undefined) updateData.isActive = isActive;
    
    const course = await prisma.course.update({
      where: { id: courseId },
      data: updateData
    });
    
    res.json({ course });
  } catch (e) {
    console.error('Update course error:', e);
    res.status(500).json({ error: 'Failed to update course' });
  }
});

// TAFE/Institution: Get my courses
router.get('/my/courses', authenticateJWT, async (req: Request, res: Response) => {
  try {
    const institutionId = (req as any).user.id;
    
    const courses = await prisma.course.findMany({
      where: { institutionId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { enrolments: true } }
      }
    });
    
    res.json({
      courses: courses.map(c => ({
        id: c.id,
        title: c.title,
        description: c.description,
        duration: c.duration,
        qualification: c.qualification,
        industry: c.industry,
        location: c.location,
        isOnline: c.isOnline,
        price: c.price,
        isActive: c.isActive,
        externalUrl: c.externalUrl,
        // capacity: c.capacity, // Removed
        enrolmentCount: c._count?.enrolments || 0,
        createdAt: c.createdAt
      }))
    });
  } catch (e) {
    console.error('Fetch my courses error:', e);
    res.status(500).json({ error: 'Failed to fetch courses' });
  }
});

// TAFE/Institution: Get stats for dashboard
router.get('/my/stats', authenticateJWT, async (req: Request, res: Response) => {
  try {
    // For the new schema, we don't have institutionId on Course
    // Return demo stats for now - courses are provider-based not user-owned
    const totalCourses = await prisma.course.count();
    const totalEnrolments = await prisma.courseEnrolment.count();
    
    // Get enrolment stats by status
    const enrolmentStats = await prisma.courseEnrolment.groupBy({
      by: ['status'],
      _count: { id: true }
    });
    
    const statusCounts: Record<string, number> = {};
    for (const s of enrolmentStats) {
      statusCounts[s.status] = s._count.id;
    }
    
    // Get recent enrolments
    const recentEnrolments = await prisma.courseEnrolment.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        course: { select: { title: true } },
        user: { select: { id: true, email: true } }
      }
    });
    
    res.json({
      stats: {
        totalCourses,
        activeCourses: totalCourses,
        totalEnrolments,
        enquiries: statusCounts['ENQUIRY'] || 0,
        enrolled: statusCounts['ENROLLED'] || statusCounts['IN_PROGRESS'] || 0,
        completed: statusCounts['COMPLETED'] || 0
      },
      recentEnrolments: recentEnrolments.map(e => ({
        id: e.id,
        courseTitle: e.course?.title || 'Unknown Course',
        memberName: e.user?.email || 'Unknown',
        status: e.status,
        createdAt: e.createdAt
      }))
    });
  } catch (e) {
    console.error('Fetch TAFE stats error:', e);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// Get course enrolments (for TAFE admin)
router.get('/:id/enrolments', authenticateJWT, async (req: Request, res: Response) => {
  try {
    const courseId = req.params.id;
    const institutionId = (req as any).user.id;
    
    // Check ownership
    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course || course.institutionId !== institutionId) {
      return void res.status(403).json({ error: 'Not authorized to view enrolments for this course' });
    }
    
    const enrolments = await prisma.courseEnrolment.findMany({
      where: { courseId },
      include: {
        user: {
          select: { id: true, email: true, memberProfile: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    res.json({ enrolments });
  } catch (e) {
    console.error('Fetch course enrolments error:', e);
    res.status(500).json({ error: 'Failed to fetch enrolments' });
  }
});

// =============================================================================
// EXTERNAL COURSE SEARCH (TAFE/RTO)
// =============================================================================

// Search external courses from synced TAFE/RTO catalog
router.get('/external/search', async (req: Request, res: Response) => {
  try {
    const result = await searchExternalCourses({ prisma, query: req.query });
    res.json(result);
  } catch (e) {
    console.error('Search external courses error:', e);
    res.status(500).json({ error: 'Failed to search courses' });
  }
});

// Get external course providers
router.get('/external/providers', async (req: Request, res: Response) => {
  try {
    const result = await listExternalProviders({ prisma });
    res.json(result);
  } catch (e) {
    console.error('Fetch providers error:', e);
    res.status(500).json({ error: 'Failed to fetch providers' });
  }
});

// =============================================================================
// COURSE RECOMMENDATIONS
// =============================================================================

// Alias for /recommendations/job/:jobId - frontend calls /recommendations?jobId=...
router.get('/recommendations', async (req: Request, res: Response) => {
  try {
    const { jobId, limit = 5 } = req.query;
    const limitNum = parseInt(limit as string);

    if (!jobId) {
      // Return general recommendations
      const courses = await prisma.course.findMany({
        where: { isActive: true },
        take: limitNum,
        orderBy: { createdAt: 'desc' },
      });
      return void res.json({ courses });
    }

    const jobIdStr = jobId as string;
    // limitNum is already defined above

    const job = await prisma.job.findFirst({
      where: { OR: [{ id: jobIdStr }, { slug: jobIdStr }] },
      select: { id: true, title: true, description: true },
    });

    if (!job) {
      // Return demo recommendations for any job slug
      return void res.json({
        courses: [
          { id: '1', title: 'Certificate III in Information Technology', provider: 'TAFE NSW', duration: '12 months', format: 'Blended', isFree: true, price: 0, relevance: 95, skillsGained: ['Programming', 'Web development'], matchedRequirements: [] },
          { id: '2', title: 'Full Stack Web Development Bootcamp', provider: 'General Assembly', duration: '12 weeks', format: 'Online', isFree: false, price: 349900, relevance: 88, skillsGained: ['React', 'Node.js'], matchedRequirements: [] },
        ]
      });
    }

    // Get courses related to the job
    const courses = await prisma.course.findMany({
      where: { isActive: true },
      take: limitNum,
      orderBy: { createdAt: 'desc' },
      include: {
        institution: { select: { institutionProfile: true } }
      }
    });

    res.json({
      courses: courses.map((c, i) => ({
        id: c.id,
        title: c.title,
        provider: c.institution?.institutionProfile?.institutionName || 'Provider',
        duration: c.duration || '3 months',
        format: c.isOnline ? 'Online' : 'In-person',
        isFree: !c.price || c.price === 0,
        price: c.price || 0,
        relevance: 95 - (i * 5),
        skillsGained: [],
        matchedRequirements: [],
      }))
    });
  } catch (e) {
    console.error('Course recommendations error:', e);
    res.status(500).json({ error: 'Failed to get recommendations' });
  }
});

// Get recommended courses for a job
router.get('/recommendations/job/:jobId', async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;
    const { limit = 5 } = req.query;
    const limitNum = parseInt(limit as string);

    const job = await prisma.job.findUnique({
      where: { id: jobId },
      select: { id: true, title: true, description: true },
    });

    if (!job) {
      return void res.status(404).json({ error: 'Job not found' });
    }

    // Get job skills
    const jobSkills = await prisma.jobSkill.findMany({
      where: { jobId },
      include: { skill: true },
    });

    const skillIds = jobSkills.map((js) => js.skillId);

    // Find courses that teach these skills
    let courses: any[] = [];
    if (skillIds.length > 0) {
      const courseSkills = await prisma.courseSkill.findMany({
        where: { skillId: { in: skillIds } },
        include: { skill: true },
      });

      const courseIds = [...new Set(courseSkills.map((cs) => cs.courseId))];

      if (courseIds.length > 0) {
        courses = await prisma.course.findMany({
          where: { id: { in: courseIds }, isActive: true },
          take: limitNum,
          include: {
            institution: { select: { institutionProfile: true } },
          },
        });
      }
    }

    // Fallback: search by job title/description keywords
    if (courses.length === 0) {
      const keywords = job.title.split(/\s+/).filter((w) => w.length > 3);
      if (keywords.length > 0) {
        courses = await prisma.course.findMany({
          where: {
            isActive: true,
            OR: keywords.map((kw) => ({
              OR: [
                { title: { contains: kw, mode: 'insensitive' } },
                { industry: { contains: kw, mode: 'insensitive' } },
              ],
            })),
          },
          take: limitNum,
        });
      }
    }

    // Also search external courses
    const externalCourses = await prisma.externalCourse.findMany({
      where: {
        isActive: true,
        OR: job.title.split(/\s+/).filter((w) => w.length > 3).map((kw) => ({
          OR: [
            { title: { contains: kw, mode: 'insensitive' } },
            { industry: { contains: kw, mode: 'insensitive' } },
          ],
        })),
      },
      take: limitNum,
    });

    res.json({
      jobId,
      jobTitle: job.title,
      skillsRequired: jobSkills.map((js) => js.skill.name),
      platformCourses: courses.map((c) => ({
        id: c.id,
        title: c.title,
        qualification: c.qualification,
        duration: c.duration,
        provider: c.institution?.institutionProfile?.institutionName || 'Gimbi Partner',
        source: 'platform',
      })),
      externalCourses: externalCourses.map((c) => ({
        id: c.id,
        title: c.title,
        qualification: c.qualification,
        provider: c.provider,
        fundingAvailable: c.fundingAvailable,
        source: 'external',
      })),
    });
  } catch (e) {
    console.error('Course recommendations error:', e);
    res.status(500).json({ error: 'Failed to get recommendations' });
  }
});

// Get personalized recommendations for member
router.get('/recommendations/me', authenticateJWT, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { limit = 10 } = req.query;
    const limitNum = parseInt(limit as string);

    // Get user's skills
    const userSkills = await prisma.userSkill.findMany({
      where: { userId },
      include: { skill: true },
    });

    const userSkillIds = userSkills.map((us) => us.skillId);

    // Get user's profile to understand interests
    const member = await prisma.memberProfile.findUnique({
      where: { userId },
    });

    // Find courses for skills user wants to improve
    const beginnerSkills = userSkills.filter((us) => us.level === 'beginner');
    const skillsToImprove = beginnerSkills.map((us) => us.skillId);

    let recommendedCourses: any[] = [];

    if (skillsToImprove.length > 0) {
      const courseSkills = await prisma.courseSkill.findMany({
        where: { skillId: { in: skillsToImprove } },
      });
      const courseIds = [...new Set(courseSkills.map((cs) => cs.courseId))];

      if (courseIds.length > 0) {
        recommendedCourses = await prisma.course.findMany({
          where: { id: { in: courseIds }, isActive: true },
          take: limitNum,
        });
      }
    }

    // Add courses based on career interest
    if (member?.careerInterest && recommendedCourses.length < limitNum) {
      const interestCourses = await prisma.course.findMany({
        where: {
          isActive: true,
          industry: { contains: member.careerInterest, mode: 'insensitive' },
        },
        take: limitNum - recommendedCourses.length,
      });
      recommendedCourses.push(...interestCourses);
    }

    res.json({
      recommendations: recommendedCourses,
      basedOn: {
        skillsToImprove: beginnerSkills.map((us) => us.skill.name),
        careerInterest: member?.careerInterest,
      },
    });
  } catch (e) {
    console.error('Personal recommendations error:', e);
    res.status(500).json({ error: 'Failed to get recommendations' });
  }
});

// =============================================================================
// COURSE SYNC (Admin)
// =============================================================================

router.post('/admin/sync', authenticateJWT, requireAdmin, async (req: Request, res: Response) => {
  try {
    const result = await runCourseSync();
    res.status(202).json(result);
  } catch (e) {
    console.error('Admin course sync error:', e);
    res.status(500).json({ error: 'Failed to run course sync' });
  }
});

router.get('/admin/enrolments', authenticateJWT, requireAdmin, async (req: Request, res: Response) => {
  try {
    const enrolments = await prisma.courseEnrolment.findMany({
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    res.json({ enrolments });
  } catch (e) {
    console.error('Admin enrolments error:', e);
    res.status(500).json({ error: 'Failed to load enrolments' });
  }
});

router.get('/admin/analytics', authenticateJWT, requireAdmin, async (req: Request, res: Response) => {
  try {
    const [totalCourses, totalEnrolments] = await Promise.all([
      prisma.course.count(),
      prisma.courseEnrolment.count(),
    ]);
    res.json({ totalCourses, totalEnrolments });
  } catch (e) {
    console.error('Admin course analytics error:', e);
    res.status(500).json({ error: 'Failed to load analytics' });
  }
});

router.post('/sync', authenticateJWT, requireAdmin, async (req: Request, res: Response) => {
  try {
    const result = await runCourseSync();
    res.json(result);
  } catch (e) {
    console.error('Course sync error:', e);
    res.status(500).json({ error: 'Failed to run course sync' });
  }
});

// Get single course details (placed last to avoid route conflicts)
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const rawId = String(req.params.id || '').trim();
    const slugBase = rawId.replace(/[-_]+/g, ' ').trim();
    const slugWithoutPrefix = slugBase.replace(/^course\s+/i, '').trim();
    const titleCandidates = Array.from(
      new Set([slugBase, slugWithoutPrefix].filter(Boolean))
    );

    const course = await prisma.course.findFirst({
      where: {
        OR: [
          { id: rawId },
          ...titleCandidates.map((candidate) => ({
            title: { equals: candidate, mode: 'insensitive' }
          })),
          ...titleCandidates.map((candidate) => ({
            title: { contains: candidate, mode: 'insensitive' }
          }))
        ]
      },
      include: {
        institution: { select: { id: true, email: true, institutionProfile: true } },
        _count: { select: { enrolments: true } }
      }
    });
    
    if (!course) {
      return void res.status(404).json({ error: 'Course not found' });
    }
    
    res.json({
      course: {
        id: course.id,
        title: course.title,
        description: course.description,
        duration: course.duration,
        qualification: course.qualification,
        industry: course.industry,
        location: course.location,
        isOnline: course.isOnline,
        price: course.price,
        provider: course.institution?.institutionProfile?.institutionName || course.institution?.email || 'Unknown',
        enrolmentCount: course._count?.enrolments || 0,
        createdAt: course.createdAt
      }
    });
  } catch (e) {
    console.error('Fetch course error:', e);
    res.status(500).json({ error: 'Failed to fetch course' });
  }
});

export default router;



