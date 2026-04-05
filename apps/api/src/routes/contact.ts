import express from 'express';
import { z } from 'zod';
import { prisma as prismaClient } from '../db';
const prisma = prismaClient as any;
import { authenticate } from '../middleware/auth';
import { requireAdmin } from '../middleware/adminAuth';
import { sendMail } from '../lib/mailer';
import { contactConfirmationTemplate, contactNotificationTemplate } from '../lib/emailTemplates';

const router = express.Router();

const contactSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    email: z.string().email('Valid email is required'),
    department: z.string().optional().default('general'),
    subject: z.string().min(1, 'Subject is required'),
    message: z.string().min(10, 'Message must be at least 10 characters'),
});

// POST /contact - Submit contact form
router.post('/', async (req, res) => {
    const parse = contactSchema.safeParse(req.body);
    if (!parse.success) {
        return void res.status(400).json({ error: parse.error.flatten() });
    }

    const { name, email, department, subject, message } = parse.data;

    try {
        // Store contact submission in database
        const submission = await prisma.contactSubmission.create({
            data: {
                name,
                email,
                department,
                subject,
                message,
                status: 'NEW',
            },
        });

        const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        const supportEmail = process.env.SUPPORT_EMAIL || 'support@ngurrapathways.com.au';
        
        // Send notification to support team
        try {
            const notificationEmail = contactNotificationTemplate({
                id: submission.id,
                name,
                email,
                department,
                subject,
                message
            });
            
            await sendMail({
                to: supportEmail,
                subject: notificationEmail.subject,
                text: notificationEmail.text,
                html: notificationEmail.html
            });
            console.log('Contact notification sent to support team');
        } catch (emailErr) {
            console.error('Failed to send contact notification:', emailErr);
        }
        
        // Send confirmation email to user
        try {
            const confirmationEmail = contactConfirmationTemplate({
                id: submission.id,
                name,
                subject,
                baseUrl
            });
            
            await sendMail({
                to: email,
                subject: confirmationEmail.subject,
                text: confirmationEmail.text,
                html: confirmationEmail.html
            });
            console.log('Contact confirmation sent to:', email);
        } catch (emailErr) {
            console.error('Failed to send contact confirmation:', emailErr);
        }

        return void res.status(201).json({
            success: true,
            message: 'Your message has been received. We will respond within 24-48 hours.',
            id: submission.id,
        });
    } catch (err) {
        console.error('Contact form error:', err);
        return void res.status(500).json({ error: 'Failed to submit contact form' });
    }
});

// GET /contact - List contact submissions (admin only)
router.get('/', authenticate, requireAdmin, async (req, res) => {
    try {
        const { status, department, limit = 50, offset = 0 } = req.query;

        const where: any = {};
        if (status) where.status = String(status);
        if (department) where.department = String(department);

        const [submissions, total] = await Promise.all([
            prisma.contactSubmission.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                take: Number(limit),
                skip: Number(offset),
            }),
            prisma.contactSubmission.count({ where }),
        ]);

        return void res.json({
            submissions,
            total,
            limit: Number(limit),
            offset: Number(offset),
        });
    } catch (err) {
        console.error('List contact submissions error:', err);
        return void res.status(500).json({ error: 'Failed to fetch submissions' });
    }
});

// PUT /contact/:id - Update contact submission status
router.put('/:id', authenticate, requireAdmin, async (req, res) => {
    const { id } = req.params;
    const { status, notes, assignedTo } = req.body;

    try {
        const submission = await prisma.contactSubmission.update({
            where: { id },
            data: {
                ...(status && { status }),
                ...(notes && { notes }),
                ...(assignedTo && { assignedTo }),
                updatedAt: new Date(),
            },
        });

        return void res.json({ success: true, submission });
    } catch (err) {
        console.error('Update contact submission error:', err);
        return void res.status(500).json({ error: 'Failed to update submission' });
    }
});

export default router;


