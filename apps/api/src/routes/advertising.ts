import express from 'express';
import { z } from 'zod';
import { prisma } from '../db';
import { authenticate } from '../middleware/auth';
import { requireAdmin } from '../middleware/adminAuth';

import { sendMail } from '../lib/mailer';
import { advertisingConfirmationTemplate, advertisingNotificationTemplate } from '../lib/emailTemplates';

const router = express.Router();

const advertisingInquirySchema = z.object({
    companyName: z.string().min(1, 'Company name is required'),
    contactName: z.string().min(1, 'Contact name is required'),
    email: z.string().email('Valid email is required'),
    phone: z.string().optional(),
    website: z.string().url().optional().or(z.literal('')),
    budget: z.string().optional(),
    goals: z.array(z.string()).optional().default([]),
    selectedPlan: z.string().optional(),
    message: z.string().optional(),
});

// POST /advertising - Submit advertising inquiry
router.post('/', async (req, res) => {
    const parse = advertisingInquirySchema.safeParse(req.body);
    if (!parse.success) {
        return void res.status(400).json({ error: parse.error.flatten() });
    }

    const { companyName, contactName, email, phone, website, budget, goals, selectedPlan, message } = parse.data;

    try {
        // Store advertising inquiry in database
        const inquiry = await prisma.advertisingInquiry.create({
            data: {
                companyName,
                contactName,
                email,
                phone: phone || null,
                website: website || null,
                budget: budget || null,
                goals: JSON.stringify(goals),
                selectedPlan: selectedPlan || null,
                message: message || null,
                status: 'NEW',
            },
        });

        // Log the submission
        console.log('Advertising inquiry received:', {
            id: inquiry.id,
            companyName,
            contactName,
            email,
            budget,
            selectedPlan,
        });

        // Send email notifications
        const partnershipsEmail = process.env.PARTNERSHIPS_EMAIL || 'partnerships@ngurrapathways.com.au';
        
        // Send notification to partnerships team
        try {
            const notificationEmail = advertisingNotificationTemplate({
                id: inquiry.id,
                companyName,
                contactName,
                email,
                phone,
                website,
                budget,
                goals,
                selectedPlan,
                message
            });
            
            await sendMail({
                to: partnershipsEmail,
                subject: notificationEmail.subject,
                text: notificationEmail.text,
                html: notificationEmail.html
            });
            console.log('Advertising notification sent to partnerships team');
        } catch (emailErr) {
            console.error('Failed to send advertising notification:', emailErr);
        }
        
        // Send confirmation email to inquirer
        try {
            const confirmationEmail = advertisingConfirmationTemplate({
                id: inquiry.id,
                companyName,
                contactName,
                selectedPlan,
                budget
            });
            
            await sendMail({
                to: email,
                subject: confirmationEmail.subject,
                text: confirmationEmail.text,
                html: confirmationEmail.html
            });
            console.log('Advertising confirmation sent to:', email);
        } catch (emailErr) {
            console.error('Failed to send advertising confirmation:', emailErr);
        }

        return void res.status(201).json({
            success: true,
            message: 'Your advertising inquiry has been received. Our partnerships team will contact you within 24-48 hours.',
            id: inquiry.id,
        });
    } catch (err) {
        console.error('Advertising inquiry error:', err);
        return void res.status(500).json({ error: 'Failed to submit advertising inquiry' });
    }
});

// GET /advertising - List advertising inquiries (admin only)
router.get('/', authenticate, requireAdmin, async (req, res) => {
    try {
        const { status, limit = 50, offset = 0 } = req.query;

        const where: any = {};
        if (status) where.status = status;

        const [inquiries, total] = await Promise.all([
            prisma.advertisingInquiry.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                take: parseInt(String(limit), 10),
                skip: parseInt(String(offset), 10),
            }),
            prisma.advertisingInquiry.count({ where }),
        ]);

        return void res.json({
            inquiries: inquiries.map(inq => ({
                ...inq,
                goals: inq.goals ? JSON.parse(inq.goals) : [],
            })),
            total,
            limit: parseInt(String(limit), 10),
            offset: parseInt(String(offset), 10),
        });
    } catch (err) {
        console.error('List advertising inquiries error:', err);
        return void res.status(500).json({ error: 'Failed to list inquiries' });
    }
});

// GET /advertising/:id - Get single inquiry
router.get('/:id', authenticate, requireAdmin, async (req, res) => {
    try {
        const inquiry = await prisma.advertisingInquiry.findUnique({
            where: { id: req.params.id },
        });

        if (!inquiry) {
            return void res.status(404).json({ error: 'Inquiry not found' });
        }

        return void res.json({
            ...inquiry,
            goals: inquiry.goals ? JSON.parse(inquiry.goals) : [],
        });
    } catch (err) {
        console.error('Get advertising inquiry error:', err);
        return void res.status(500).json({ error: 'Failed to get inquiry' });
    }
});

// PUT /advertising/:id - Update inquiry status
router.put('/:id', authenticate, requireAdmin, async (req, res) => {
    const { status, notes, assignedTo } = req.body;

    try {
        const inquiry = await prisma.advertisingInquiry.update({
            where: { id: req.params.id },
            data: {
                ...(status && { status }),
                ...(notes !== undefined && { notes }),
                ...(assignedTo !== undefined && { assignedTo }),
            },
        });

        return void res.json({
            success: true,
            inquiry: {
                ...inquiry,
                goals: inquiry.goals ? JSON.parse(inquiry.goals) : [],
            },
        });
    } catch (err) {
        console.error('Update advertising inquiry error:', err);
        return void res.status(500).json({ error: 'Failed to update inquiry' });
    }
});

export default router;

