import express from 'express';
import crypto from 'crypto';
import { prisma } from '../db';
import { optionalAuth } from '../middleware/auth';

const router = express.Router();

// In-memory demo stores (dev-friendly; resets on server restart)
const jobsById = new Map<string, any>();
const applicantsById = new Map<string, any>();
const applicantMetaById = new Map<
  string,
  {
    rating?: number;
    isBookmarked?: boolean;
    notes?: { id: string; content: string; author: string; createdAt: string }[];
    stage?: string;
    lastActivityAt?: string;
  }
>();

const interviewsById = new Map<string, any>();
const offersById = new Map<string, any>();

function nowIso() {
  return new Date().toISOString();
}

function ensureDemoSeed() {
  if (jobsById.size > 0) return;

  const job1Id = crypto.randomUUID();
  const job2Id = crypto.randomUUID();

  jobsById.set(job1Id, {
    id: job1Id,
    title: 'Community Engagement Officer',
    department: 'Operations',
    location: 'Brisbane, QLD',
    workType: 'hybrid',
    employmentType: 'full-time',
    salary: { min: 90000, max: 110000, currency: 'AUD', frequency: 'annual', showOnPosting: true },
    description: 'Support community partnerships and programs.',
    responsibilities: ['Coordinate events', 'Stakeholder management'],
    requirements: ['Excellent communication'],
    niceToHave: ['Experience in community orgs'],
    benefits: ['Flexible hours', 'Professional development'],
    skills: ['Communication', 'Project Management'],
    experience: { min: 2, max: 6 },
    education: 'Diploma or equivalent',
    applicationDeadline: undefined,
    startDate: undefined,
    isIndigenousPreferred: true,
    indigenousInitiatives: 'Dedicated mentoring and cultural leave',
    culturalConsiderations: 'Respect community protocols',
    status: 'active',
    createdAt: nowIso(),
    publishedAt: nowIso(),
  });

  jobsById.set(job2Id, {
    id: job2Id,
    title: 'Junior Frontend Developer',
    department: 'Engineering',
    location: 'Remote',
    workType: 'remote',
    employmentType: 'full-time',
    salary: { min: 75000, max: 90000, currency: 'AUD', frequency: 'annual', showOnPosting: true },
    description: 'Build accessible UI features across the platform.',
    responsibilities: ['Implement UI components', 'Write tests'],
    requirements: ['React basics', 'Strong learning mindset'],
    niceToHave: ['TypeScript'],
    benefits: ['Remote work options'],
    skills: ['React', 'TypeScript', 'Accessibility'],
    experience: { min: 0, max: 2 },
    isIndigenousPreferred: false,
    status: 'draft',
    createdAt: nowIso(),
  });

  // Demo applicants
  const applicant1Id = crypto.randomUUID();
  applicantsById.set(applicant1Id, {
    id: applicant1Id,
    candidateId: crypto.randomUUID(),
    candidate: {
      id: crypto.randomUUID(),
      name: 'Aaliyah Walker',
      email: 'aaliyah@example.com',
      phone: '0400 000 000',
      avatar: undefined,
      headline: 'Community Programs Coordinator',
      location: 'Brisbane, QLD',
      isIndigenous: true,
    },
    jobId: job1Id,
    job: { id: job1Id, title: jobsById.get(job1Id)!.title, department: jobsById.get(job1Id)!.department },
    stage: 'screening',
    source: 'referral',
    appliedAt: new Date(Date.now() - 6 * 86400000).toISOString(),
    lastActivityAt: new Date(Date.now() - 1 * 86400000).toISOString(),
    rating: 4,
    scores: { skills: 4, experience: 4, cultural: 5, overall: 4 },
    tags: ['Strong cultural fit'],
    notes: [],
    activities: [{ type: 'note', description: 'Screening call scheduled', date: nowIso(), user: 'Hiring Team' }],
    resume: { name: 'resume.pdf', url: '#' },
    isBookmarked: true,
  });

  const applicant2Id = crypto.randomUUID();
  applicantsById.set(applicant2Id, {
    id: applicant2Id,
    candidateId: crypto.randomUUID(),
    candidate: {
      id: crypto.randomUUID(),
      name: 'Noah Thompson',
      email: 'noah@example.com',
      phone: '0400 000 001',
      avatar: undefined,
      headline: 'Frontend Developer',
      location: 'Remote',
      isIndigenous: false,
    },
    jobId: job2Id,
    job: { id: job2Id, title: jobsById.get(job2Id)!.title, department: jobsById.get(job2Id)!.department },
    stage: 'applied',
    source: 'direct',
    appliedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    lastActivityAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    rating: 3,
    scores: { skills: 3, experience: 2, cultural: 3, overall: 3 },
    tags: ['Early career'],
    notes: [],
    activities: [{ type: 'application', description: 'Applied via careers page', date: nowIso() }],
    resume: { name: 'resume.pdf', url: '#' },
    isBookmarked: false,
  });
}

function requireAuthInProd(req: any, res: any): boolean {
  if (process.env.NODE_ENV === 'production' && !req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return true;
  }
  return false;
}

function normalizeJobListItem(j: any) {
  return {
    id: j.id,
    title: j.title,
    department: j.department ?? 'Other',
    location: j.location ?? '',
    status: j.status ?? (j.isActive ? 'active' : 'draft'),
  };
}

const JOB_TEMPLATES = [
  {
    id: 'tpl-community-engagement',
    name: 'Community Engagement Officer',
    category: 'Community',
    posting: {
      title: 'Community Engagement Officer',
      department: 'Operations',
      workType: 'hybrid',
      employmentType: 'full-time',
      description: 'Build trusted relationships with community stakeholders.',
      responsibilities: ['Coordinate events', 'Maintain partnerships', 'Report program outcomes'],
      requirements: ['Strong communication', 'Cultural safety awareness'],
      benefits: ['Flexible hours', 'Professional development'],
      isIndigenousPreferred: true,
      indigenousInitiatives: 'Mentoring, cultural leave, and community-led onboarding',
    },
  },
  {
    id: 'tpl-junior-dev',
    name: 'Junior Frontend Developer',
    category: 'Technology',
    posting: {
      title: 'Junior Frontend Developer',
      department: 'Engineering',
      workType: 'remote',
      employmentType: 'full-time',
      description: 'Build accessible UI with React and TypeScript.',
      responsibilities: ['Implement UI components', 'Fix bugs', 'Collaborate with design'],
      requirements: ['React fundamentals', 'Teamwork'],
      niceToHave: ['TypeScript', 'Accessibility knowledge'],
      benefits: ['Remote work options', 'Learning budget'],
      isIndigenousPreferred: false,
    },
  },
];

router.use(optionalAuth);

// ---------------------------
// Jobs
// ---------------------------

router.get('/jobs/templates', (req, res) => {
  res.json(JOB_TEMPLATES);
});

router.get('/jobs', async (req, res, next) => {
  try {
    ensureDemoSeed();

    if ((req as any).user?.id) {
      const jobs = await prisma.job.findMany({ where: { userId: (req as any).user.id }, orderBy: { createdAt: 'desc' } });
      return void res.json(jobs.map((j) => normalizeJobListItem(j)));
    }

    res.json(Array.from(jobsById.values()).map((j) => normalizeJobListItem(j)));
  } catch (error) {
    next(error);
  }
});

router.get('/jobs/:id', async (req, res, next) => {
  try {
    ensureDemoSeed();

    if ((req as any).user?.id) {
      const job = await prisma.job.findUnique({ where: { id: req.params.id } });
      if (!job || job.userId !== (req as any).user.id) return void res.status(404).json({ error: 'Not found' });

      // Return a UI-friendly shape (fields not in DB are defaulted)
      const posting = {
        id: job.id,
        title: job.title,
        department: 'Other',
        location: job.location ?? '',
        workType: 'onsite',
        employmentType: (job.employment ?? 'full-time') as any,
        salary: {
          min: job.salaryLow ?? 0,
          max: job.salaryHigh ?? 0,
          currency: 'AUD',
          frequency: 'annual',
          showOnPosting: true,
        },
        description: job.description,
        responsibilities: [],
        requirements: [],
        niceToHave: [],
        benefits: [],
        skills: [],
        experience: { min: 0, max: 0 },
        isIndigenousPreferred: false,
        status: job.isActive ? 'active' : 'draft',
        createdAt: job.createdAt.toISOString(),
        publishedAt: job.postedAt.toISOString(),
      };

      return void res.json(posting);
    }

    const demo = jobsById.get(req.params.id);
    if (!demo) return void res.status(404).json({ error: 'Not found' });
    res.json(demo);
  } catch (error) {
    next(error);
  }
});

router.post('/jobs', async (req, res, next) => {
  try {
    ensureDemoSeed();

    const body = req.body || {};

    if ((req as any).user?.id) {
      // Persist only core fields to DB (UI has more fields than schema).
      const created = await prisma.job.create({
        data: {
          userId: (req as any).user.id,
          title: body.title ?? 'Untitled Job',
          description: body.description ?? '',
          location: body.location ?? null,
          employment: body.employmentType ?? body.employment ?? null,
          salaryLow: body.salary?.min ?? null,
          salaryHigh: body.salary?.max ?? null,
          isActive: body.status ? body.status === 'active' : true,
        },
      });

      return void res.json({
        ...body,
        id: created.id,
        createdAt: created.createdAt.toISOString(),
        status: body.status ?? (created.isActive ? 'active' : 'draft'),
      });
    }

    const id = crypto.randomUUID();
    const posting = {
      ...body,
      id,
      createdAt: nowIso(),
      status: body.status ?? 'draft',
    };
    jobsById.set(id, posting);
    res.json(posting);
  } catch (error) {
    next(error);
  }
});

router.put('/jobs/:id', async (req, res, next) => {
  try {
    ensureDemoSeed();

    const body = req.body || {};

    if ((req as any).user?.id) {
      const existing = await prisma.job.findUnique({ where: { id: req.params.id } });
      if (!existing || existing.userId !== (req as any).user.id) return void res.status(404).json({ error: 'Not found' });

      await prisma.job.update({
        where: { id: req.params.id },
        data: {
          title: body.title ?? existing.title,
          description: body.description ?? existing.description,
          location: body.location ?? existing.location,
          employment: body.employmentType ?? body.employment ?? existing.employment,
          salaryLow: body.salary?.min ?? existing.salaryLow,
          salaryHigh: body.salary?.max ?? existing.salaryHigh,
          isActive: body.status ? body.status === 'active' : existing.isActive,
        },
      });

      return void res.json({ ...body, id: req.params.id });
    }

    const existing = jobsById.get(req.params.id);
    if (!existing) return void res.status(404).json({ error: 'Not found' });
    const updated = { ...existing, ...body, id: req.params.id };
    jobsById.set(req.params.id, updated);
    res.json(updated);
  } catch (error) {
    next(error);
  }
});

router.post('/jobs/:id/publish', async (req, res, next) => {
  try {
    ensureDemoSeed();

    if ((req as any).user?.id) {
      const existing = await prisma.job.findUnique({ where: { id: req.params.id } });
      if (!existing || existing.userId !== (req as any).user.id) return void res.status(404).json({ error: 'Not found' });
      await prisma.job.update({ where: { id: req.params.id }, data: { isActive: true, postedAt: new Date() } as any });
      return void res.json({ ok: true });
    }

    const existing = jobsById.get(req.params.id);
    if (!existing) return void res.status(404).json({ error: 'Not found' });
    existing.status = 'active';
    existing.publishedAt = nowIso();
    jobsById.set(req.params.id, existing);

    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

// ---------------------------
// Applicants (ATS)
// ---------------------------

router.get('/applicants', async (req, res, next) => {
  try {
    ensureDemoSeed();

    const stage = typeof req.query.stage === 'string' ? req.query.stage : '';
    const jobId = typeof req.query.jobId === 'string' ? req.query.jobId : '';
    const q = typeof req.query.q === 'string' ? req.query.q : '';
    const page = Math.max(1, parseInt(String(req.query.page ?? '1'), 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit ?? '30'), 10) || 30));

    // If authenticated, best-effort map real applications
    if ((req as any).user?.id) {
      const where: any = { job: { userId: (req as any).user.id } };
      if (jobId) where.jobId = jobId;

      const [total, apps] = await Promise.all([
        prisma.jobApplication.count({ where }),
        prisma.jobApplication.findMany({
          where,
          include: {
            job: true,
            user: { select: { id: true, email: true, memberProfile: true } },
            resume: true,
          },
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
      ]);

      const applicants = apps
        .map((a) => {
          const mp: any = (a.user as any).memberProfile;
          const name = mp?.fullName || mp?.name || a.user.email;
          const meta = applicantMetaById.get(a.id) || {};
          const derivedStage = meta.stage || (a.status || 'SUBMITTED').toString().toLowerCase();

          const mappedStage =
            derivedStage.includes('screen') ? 'screening' :
            derivedStage.includes('interview') ? 'interview' :
            derivedStage.includes('offer') ? 'offer' :
            derivedStage.includes('hire') ? 'hired' :
            derivedStage.includes('reject') ? 'rejected' :
            'applied';

          return {
            id: a.id,
            candidateId: a.userId,
            candidate: {
              id: a.userId,
              name,
              email: a.user.email,
              phone: mp?.phone ?? undefined,
              avatar: mp?.avatarUrl ?? undefined,
              headline: mp?.headline ?? undefined,
              location: mp?.location ?? undefined,
              isIndigenous: !!mp?.isIndigenous,
            },
            jobId: a.jobId,
            job: {
              id: a.jobId,
              title: a.job.title,
              department: 'Other',
            },
            stage: mappedStage,
            source: 'direct',
            appliedAt: a.createdAt.toISOString(),
            lastActivityAt: meta.lastActivityAt ?? a.updatedAt.toISOString(),
            rating: meta.rating ?? 0,
            scores: { skills: 0, experience: 0, cultural: 0, overall: 0 },
            tags: [],
            notes: meta.notes ?? [],
            activities: [],
            resume: a.resume ? { name: (a.resume as any).filename ?? 'resume', url: a.resume.url ?? '#' } : undefined,
            isBookmarked: meta.isBookmarked ?? false,
          };
        })
        .filter((a) => (stage ? a.stage === stage : true))
        .filter((a) => (q ? (a.candidate.name + ' ' + a.candidate.email).toLowerCase().includes(q.toLowerCase()) : true));

      return void res.json({ applicants, total });
    }

    // Demo mode
    let items = Array.from(applicantsById.values());
    if (jobId) items = items.filter((a) => a.jobId === jobId);
    if (stage) items = items.filter((a) => a.stage === stage);
    if (q) {
      const qq = q.toLowerCase();
      items = items.filter((a) => (a.candidate.name + ' ' + a.candidate.email).toLowerCase().includes(qq));
    }

    const total = items.length;
    const applicants = items.slice((page - 1) * limit, (page - 1) * limit + limit);
    res.json({ applicants, total });
  } catch (error) {
    next(error);
  }
});

router.get('/applicants/:id', (req, res) => {
  ensureDemoSeed();

  const a = applicantsById.get(req.params.id);
  if (a) return void res.json(a);

  // If authenticated, client can still fetch via /applicants list; keep simple
  if (requireAuthInProd(req, res)) return;
  res.status(404).json({ error: 'Not found' });
});

router.put('/applicants/:id/stage', async (req, res, next) => {
  try {
    ensureDemoSeed();

    const stage = req.body?.stage;
    if (!stage) return void res.status(400).json({ error: 'stage required' });

    if ((req as any).user?.id) {
      // Store stage as application status for now
      const status = String(stage).toUpperCase().replace(/-/g, '_');
      await prisma.jobApplication.update({ where: { id: req.params.id }, data: { status } }).catch(() => undefined);
      applicantMetaById.set(req.params.id, { ...(applicantMetaById.get(req.params.id) || {}), stage, lastActivityAt: nowIso() });
      return void res.json({ ok: true });
    }

    const a = applicantsById.get(req.params.id);
    if (!a) return void res.status(404).json({ error: 'Not found' });
    a.stage = stage;
    a.lastActivityAt = nowIso();
    applicantsById.set(req.params.id, a);
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

router.put('/applicants/bulk/stage', async (req, res, next) => {
  try {
    ensureDemoSeed();

    const { applicantIds, stage } = req.body || {};
    if (!Array.isArray(applicantIds) || !stage) return void res.status(400).json({ error: 'applicantIds and stage required' });

    for (const id of applicantIds) {
      const a = applicantsById.get(id);
      if (a) {
        a.stage = stage;
        a.lastActivityAt = nowIso();
        applicantsById.set(id, a);
      }
      applicantMetaById.set(id, { ...(applicantMetaById.get(id) || {}), stage, lastActivityAt: nowIso() });
    }

    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

router.post('/applicants/:id/notes', (req, res) => {
  ensureDemoSeed();

  const content = String(req.body?.content || '').trim();
  if (!content) return void res.status(400).json({ error: 'content required' });

  const meta = applicantMetaById.get(req.params.id) || {};
  const notes = meta.notes ?? [];
  notes.unshift({ id: crypto.randomUUID(), content, author: (req as any).user?.email ?? 'System', createdAt: nowIso() });
  applicantMetaById.set(req.params.id, { ...meta, notes, lastActivityAt: nowIso() });

  const a = applicantsById.get(req.params.id);
  if (a) {
    a.notes = notes;
    a.lastActivityAt = nowIso();
    applicantsById.set(req.params.id, a);
  }

  res.json({ ok: true });
});

router.put('/applicants/:id/rating', (req, res) => {
  ensureDemoSeed();
  const rating = Math.max(0, Math.min(5, parseInt(String(req.body?.rating ?? '0'), 10) || 0));

  const meta = applicantMetaById.get(req.params.id) || {};
  applicantMetaById.set(req.params.id, { ...meta, rating, lastActivityAt: nowIso() });

  const a = applicantsById.get(req.params.id);
  if (a) {
    a.rating = rating;
    a.lastActivityAt = nowIso();
    applicantsById.set(req.params.id, a);
  }

  res.json({ ok: true });
});

router.post('/applicants/:id/bookmark', (req, res) => {
  ensureDemoSeed();

  const meta = applicantMetaById.get(req.params.id) || {};
  const next = !(meta.isBookmarked ?? false);
  applicantMetaById.set(req.params.id, { ...meta, isBookmarked: next, lastActivityAt: nowIso() });

  const a = applicantsById.get(req.params.id);
  if (a) {
    a.isBookmarked = next;
    a.lastActivityAt = nowIso();
    applicantsById.set(req.params.id, a);
  }

  res.json({ ok: true, isBookmarked: next });
});

router.post('/applicants/:id/reject', (req, res) => {
  ensureDemoSeed();

  const reason = String(req.body?.reason || '').trim();
  const a = applicantsById.get(req.params.id);
  if (a) {
    a.stage = 'rejected';
    a.lastActivityAt = nowIso();
    a.activities = [{ type: 'rejected', description: reason ? `Rejected: ${reason}` : 'Rejected', date: nowIso() }, ...(a.activities || [])];
    applicantsById.set(req.params.id, a);
  }

  const meta = applicantMetaById.get(req.params.id) || {};
  applicantMetaById.set(req.params.id, { ...meta, stage: 'rejected', lastActivityAt: nowIso() });

  res.json({ ok: true });
});

// Candidates for interview/offer modals
router.get('/candidates', (req, res) => {
  ensureDemoSeed();

  const stage = typeof req.query.stage === 'string' ? req.query.stage : '';
  const jobId = typeof req.query.jobId === 'string' ? req.query.jobId : '';

  let items = Array.from(applicantsById.values());
  if (jobId) items = items.filter((a) => a.jobId === jobId);
  if (stage) items = items.filter((a) => a.stage === stage);

  const candidates = items.map((a) => ({
    id: a.candidate.id,
    name: a.candidate.name,
    email: a.candidate.email,
    avatar: a.candidate.avatar,
    phone: a.candidate.phone,
    currentRole: a.candidate.headline,
  }));

  res.json(candidates);
});

// Team members
router.get('/team', (req, res) => {
  // Keep this safe in prod
  if (requireAuthInProd(req, res)) return;

  const userEmail = (req as any).user?.email;
  res.json([
    { id: 'tm-1', name: 'Hiring Manager', email: userEmail ?? 'manager@example.com', role: 'Hiring Manager' },
    { id: 'tm-2', name: 'People & Culture', email: 'people@example.com', role: 'People & Culture' },
    { id: 'tm-3', name: 'Tech Lead', email: 'techlead@example.com', role: 'Interviewer' },
  ]);
});

// ---------------------------
// Interviews (in-memory)
// ---------------------------

router.get('/interviews', (req, res) => {
  if (requireAuthInProd(req, res)) return;

  const month = typeof req.query.month === 'string' ? req.query.month : '';
  const status = typeof req.query.status === 'string' ? req.query.status : '';
  const type = typeof req.query.type === 'string' ? req.query.type : '';

  let items = Array.from(interviewsById.values());

  if (month) items = items.filter((i) => i.date?.startsWith(month));
  if (status) items = items.filter((i) => i.status === status);
  if (type) items = items.filter((i) => i.type === type);

  res.json({ interviews: items, total: items.length });
});

router.get('/interviews/:id', (req, res) => {
  if (requireAuthInProd(req, res)) return;
  const it = interviewsById.get(req.params.id);
  if (!it) return void res.status(404).json({ error: 'Not found' });
  res.json(it);
});

router.post('/interviews', (req, res) => {
  if (requireAuthInProd(req, res)) return;

  const id = crypto.randomUUID();
  const body = req.body || {};

  const interview = {
    id,
    candidateId: body.candidateId,
    candidate: body.candidate,
    jobId: body.jobId,
    job: body.job,
    type: body.type ?? 'video',
    status: 'scheduled',
    date: body.date,
    startTime: body.startTime,
    endTime: body.endTime,
    timezone: body.timezone ?? 'Australia/Brisbane',
    location: body.location,
    meetingLink: body.meetingLink,
    interviewers: body.interviewers ?? [],
    notes: body.notes,
    feedback: [],
    createdAt: nowIso(),
  };

  interviewsById.set(id, interview);
  res.json(interview);
});

router.put('/interviews/:id', (req, res) => {
  if (requireAuthInProd(req, res)) return;
  const existing = interviewsById.get(req.params.id);
  if (!existing) return void res.status(404).json({ error: 'Not found' });
  const updated = { ...existing, ...(req.body || {}), id: req.params.id };
  interviewsById.set(req.params.id, updated);
  res.json(updated);
});

router.post('/interviews/:id/cancel', (req, res) => {
  if (requireAuthInProd(req, res)) return;
  const existing = interviewsById.get(req.params.id);
  if (!existing) return void res.status(404).json({ error: 'Not found' });
  existing.status = 'cancelled';
  interviewsById.set(req.params.id, existing);
  res.json({ ok: true });
});

router.post('/interviews/:id/feedback', (req, res) => {
  if (requireAuthInProd(req, res)) return;
  const existing = interviewsById.get(req.params.id);
  if (!existing) return void res.status(404).json({ error: 'Not found' });

  const fb = {
    rating: req.body?.rating ?? 0,
    recommendation: req.body?.recommendation ?? 'neutral',
    comments: req.body?.comments ?? '',
    submittedBy: (req as any).user?.email ?? 'System',
    submittedAt: nowIso(),
  };

  existing.feedback = [fb, ...(existing.feedback ?? [])];
  existing.status = 'completed';
  interviewsById.set(req.params.id, existing);
  res.json({ ok: true });
});

router.get('/interviews/available-slots', (req, res) => {
  // basic deterministic slot generation
  const date = typeof req.query.date === 'string' ? req.query.date : new Date().toISOString().split('T')[0];
  const slots = ['09:00', '10:00', '11:00', '14:00', '15:00'].map((start) => ({
    date,
    startTime: start,
    endTime: `${String(parseInt(start.split(':')[0], 10) + 1).padStart(2, '0')}:00`,
    isAvailable: true,
  }));
  res.json(slots);
});

// ---------------------------
// Offers (in-memory)
// ---------------------------

router.get('/offers/templates', (req, res) => {
  if (requireAuthInProd(req, res)) return;
  res.json([
    {
      id: 'tpl-standard',
      name: 'Standard Offer',
      description: 'Standard permanent employment offer',
      compensation: { baseSalary: 95000, currency: 'AUD', frequency: 'annual', benefits: ['Superannuation', 'Flexible hours'] },
      terms: 'Standard terms and conditions apply.',
    },
    {
      id: 'tpl-grad',
      name: 'Graduate Offer',
      description: 'Graduate program offer package',
      compensation: { baseSalary: 75000, currency: 'AUD', frequency: 'annual', benefits: ['Mentoring', 'Study allowance'] },
      terms: 'Graduate program conditions apply.',
    },
  ]);
});

router.get('/offers', (req, res) => {
  if (requireAuthInProd(req, res)) return;

  const status = typeof req.query.status === 'string' ? req.query.status : '';
  let items = Array.from(offersById.values());
  if (status) items = items.filter((o) => o.status === status);
  res.json({ offers: items, total: items.length });
});

router.get('/offers/:id', (req, res) => {
  if (requireAuthInProd(req, res)) return;
  const offer = offersById.get(req.params.id);
  if (!offer) return void res.status(404).json({ error: 'Not found' });
  res.json(offer);
});

router.post('/offers', (req, res) => {
  if (requireAuthInProd(req, res)) return;

  const id = crypto.randomUUID();
  const body = req.body || {};

  const offer = {
    id,
    candidateId: body.candidateId,
    candidate: body.candidate,
    jobId: body.jobId,
    job: body.job,
    status: 'draft',
    compensation: body.compensation ?? { baseSalary: 0, currency: 'AUD', frequency: 'annual', benefits: [] },
    startDate: body.startDate ?? new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
    expiryDate: body.expiryDate ?? new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
    reportingTo: body.reportingTo,
    location: body.location ?? 'TBD',
    workType: body.workType ?? 'hybrid',
    customTerms: body.customTerms,
    attachments: body.attachments ?? [],
    timeline: [{ action: 'Created', date: nowIso(), user: (req as any).user?.email ?? 'System' }],
    negotiationNotes: body.negotiationNotes,
    createdAt: nowIso(),
  };

  offersById.set(id, offer);
  res.json(offer);
});

router.put('/offers/:id', (req, res) => {
  if (requireAuthInProd(req, res)) return;
  const existing = offersById.get(req.params.id);
  if (!existing) return void res.status(404).json({ error: 'Not found' });
  const updated = { ...existing, ...(req.body || {}), id: req.params.id };
  offersById.set(req.params.id, updated);
  res.json(updated);
});

router.post('/offers/:id/send', (req, res) => {
  if (requireAuthInProd(req, res)) return;
  const existing = offersById.get(req.params.id);
  if (!existing) return void res.status(404).json({ error: 'Not found' });
  existing.status = 'sent';
  existing.sentAt = nowIso();
  existing.timeline = [{ action: 'Sent', date: nowIso(), user: (req as any).user?.email ?? 'System' }, ...(existing.timeline || [])];
  offersById.set(req.params.id, existing);
  res.json({ ok: true });
});

router.post('/offers/:id/withdraw', (req, res) => {
  if (requireAuthInProd(req, res)) return;
  const existing = offersById.get(req.params.id);
  if (!existing) return void res.status(404).json({ error: 'Not found' });
  existing.status = 'withdrawn';
  existing.timeline = [{ action: 'Withdrawn', date: nowIso(), user: (req as any).user?.email ?? 'System', note: req.body?.reason }, ...(existing.timeline || [])];
  offersById.set(req.params.id, existing);
  res.json({ ok: true });
});

export default router;


