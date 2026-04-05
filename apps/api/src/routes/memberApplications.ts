import express from 'express';
import { prisma } from '../db';
import auth from '../middleware/auth';
import { z } from 'zod';

const router = express.Router();

// POST /member/applications - create a new application
router.post('/', auth.authenticate, async (req, res) => {
    const userId = (req as any).user?.id;
    const jobId = req.body?.jobId ? String(req.body.jobId) : null;
    if (!jobId) {
        return void res.status(400).json({ error: 'jobId is required' });
    }
    try {
        const application = await prisma.jobApplication.create({
            data: {
                userId,
                jobId,
                coverLetter: req.body?.coverLetter ? String(req.body.coverLetter) : null,
                resumeId: req.body?.resumeId ? String(req.body.resumeId) : null,
            }
        });
        return void res.status(201).json({ application });
    }
    catch (err) {
        // eslint-disable-next-line no-console
        console.error('member create application error', err);
        return void res.status(400).json({ error: 'Failed to create application' });
    }
});

// GET /member/applications - list current user's applications
router.get('/', auth.authenticate, async (req, res) => {
    const userId = (req as any).user?.id;
    try {
        const apps = await prisma.jobApplication.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, include: { job: { include: { user: { select: { id: true, email: true } }, }, }, resume: true } });
        return void res.json({ applications: apps });
    }
    catch (err) {
        // eslint-disable-next-line no-console
        console.error('member list applications error', err);
        return void res.status(500).json({ error: 'Failed to fetch applications' });
    }
});

// GET /member/applications/:id - details for current user's application
router.get('/:id', auth.authenticate, async (req, res) => {
    const userId = (req as any).user?.id;
    const id = req.params.id;
    try {
        const app = await prisma.jobApplication.findUnique({ where: { id }, include: { job: { include: { user: { select: { id: true, email: true } } } }, resume: true } });
        if (!app || app.userId !== userId)
            return void res.status(404).json({ error: 'Not found' });
        return void res.json({ application: app });
    }
    catch (err) {
        // eslint-disable-next-line no-console
        console.error('member get application error', err);
        return void res.status(500).json({ error: 'Failed to fetch application' });
    }
});

// GET /member/applications/:id/messages - list applicant-visible messages
router.get('/:id/messages', auth.authenticate, async (req, res) => {
    const userId = (req as any).user?.id;
    const id = req.params.id;
    try {
        const app = await prisma.jobApplication.findUnique({ where: { id } });
        if (!app || app.userId !== userId)
            return void res.status(404).json({ error: 'Not found' });
        const msgs = await prisma.applicationMessage.findMany({ where: { applicationId: id, isPrivate: false }, orderBy: { createdAt: 'asc' }, include: { user: { select: { id: true, email: true } } } });
        return void res.json({ messages: msgs });
    }
    catch (err) {
        // eslint-disable-next-line no-console
        console.error('member messages error', err);
        return void res.status(500).json({ error: 'Failed to fetch messages' });
    }
});

// POST /member/applications/:id/messages - create a public message as applicant
router.post('/:id/messages', auth.authenticate, async (req, res) => {
    const userId = (req as any).user?.id;
    const id = req.params.id;
    const schema = z.object({ body: z.string().min(1) });
    const parse = schema.safeParse(req.body);
    if (!parse.success)
        return void res.status(400).json({ error: parse.error.flatten() });
    try {
        const app = await prisma.jobApplication.findUnique({ where: { id } });
        if (!app || app.userId !== userId)
            return void res.status(404).json({ error: 'Not found' });
        const msg = await prisma.applicationMessage.create({ data: { applicationId: id, userId, body: parse.data.body, isPrivate: false } });
        return void res.json({ message: msg });
    }
    catch (err) {
        // eslint-disable-next-line no-console
        console.error('member create message error', err);
        return void res.status(500).json({ error: 'Failed to create message' });
    }
});

export default router;

