// @ts-nocheck
/**
 * Course Enrolment and Payment Routes
 * Handles enrolment in external courses with Stripe payment
 */

import { Router } from 'express';
import { prisma as prismaClient } from '../db';
const prisma = prismaClient as any;
import authenticate from '../middleware/auth';
import Stripe from 'stripe';

const router = Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

/**
 * POST /course-payments/enrol
 * Initiate enrolment in an external course
 */
router.post('/enrol', authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        const { courseId, paymentMethod } = req.body;
        
        if (!courseId) {
            return void res.status(400).json({ error: 'courseId is required' });
        }
        
        // Get course details
        const course = await prisma.externalCourse.findUnique({
            where: { id: courseId },
        });
        
        if (!course) {
            return void res.status(404).json({ error: 'Course not found' });
        }
        
        if (!course.isActive) {
            return void res.status(400).json({ error: 'Course is not currently available' });
        }
        
        // Check if user is already enrolled
        const existingEnrolment = await prisma.coursePayment.findFirst({
            where: {
                userId,
                courseId,
                status: { in: ['pending', 'completed'] },
            },
        });
        
        if (existingEnrolment) {
            return void res.status(400).json({ 
                error: 'Already enrolled or enrolment pending',
                enrolment: existingEnrolment,
            });
        }
        
        // Get user details for Stripe
        const user = await prisma.user.findUnique({
            where: { id: userId },
        });
        
        // Check if course is free
        if (!course.price || course.price === 0) {
            // Free enrolment
            const payment = await prisma.coursePayment.create({
                data: {
                    userId,
                    courseId,
                    amount: 0,
                    currency: 'AUD',
                    status: 'completed',
                    paidAt: new Date(),
                },
            });
            
            // Create course enrolment record if table exists
            // For now just return success
            return void res.json({
                success: true,
                message: 'Enrolled successfully (free course)',
                payment,
            });
        }
        
        // Create Stripe checkout session for paid course
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            mode: 'payment',
            customer_email: user.email,
            metadata: {
                userId,
                courseId,
                type: 'course_enrolment',
            },
            line_items: [
                {
                    price_data: {
                        currency: 'aud',
                        product_data: {
                            name: course.name,
                            description: `${course.provider} - ${course.qualification || 'Certificate'}`,
                            metadata: {
                                courseId: course.id,
                                provider: course.provider,
                            },
                        },
                        unit_amount: Math.round(course.price * 100), // Convert to cents
                    },
                    quantity: 1,
                },
            ],
            success_url: `${process.env.FRONTEND_URL}/courses/${courseId}/enrolled?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.FRONTEND_URL}/courses/${courseId}?cancelled=true`,
        });
        
        // Create pending payment record
        const payment = await prisma.coursePayment.create({
            data: {
                userId,
                courseId,
                amount: course.price,
                currency: 'AUD',
                status: 'pending',
                stripeSessionId: session.id,
            },
        });
        
        res.json({
            success: true,
            checkoutUrl: session.url,
            payment,
        });
    } catch (error) {
        console.error('Course enrolment error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /course-payments/confirm
 * Confirm payment after Stripe checkout (called from success page)
 */
router.post('/confirm', authenticate, async (req, res) => {
    try {
        const { sessionId } = req.body;
        
        if (!sessionId) {
            return void res.status(400).json({ error: 'sessionId is required' });
        }
        
        // Verify session with Stripe
        const session = await stripe.checkout.sessions.retrieve(sessionId);
        
        if (!session) {
            return void res.status(404).json({ error: 'Session not found' });
        }
        
        if (session.payment_status !== 'paid') {
            return void res.status(400).json({ error: 'Payment not completed' });
        }
        
        // Update payment record
        const payment = await prisma.coursePayment.updateMany({
            where: {
                stripeSessionId: sessionId,
                status: 'pending',
            },
            data: {
                status: 'completed',
                stripePaymentId: session.payment_intent,
                paidAt: new Date(),
            },
        });
        
        // Get the updated payment with course details
        const confirmedPayment = await prisma.coursePayment.findFirst({
            where: { stripeSessionId: sessionId },
            include: { course: true },
        });
        
        res.json({
            success: true,
            message: 'Enrolment confirmed',
            payment: confirmedPayment,
        });
    } catch (error) {
        console.error('Payment confirmation error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /course-payments/my-enrolments
 * List user's course enrolments
 */
router.get('/my-enrolments', authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        
        const enrolments = await prisma.coursePayment.findMany({
            where: {
                userId,
                status: 'completed',
            },
            include: {
                course: true,
            },
            orderBy: { paidAt: 'desc' },
        });
        
        res.json({ enrolments });
    } catch (error) {
        console.error('Get enrolments error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /course-payments/:paymentId
 * Get payment details
 */
router.get('/:paymentId', authenticate, async (req, res) => {
    try {
        const { paymentId } = req.params;
        const userId = req.user.id;
        
        const payment = await prisma.coursePayment.findFirst({
            where: {
                id: paymentId,
                userId,
            },
            include: {
                course: true,
            },
        });
        
        if (!payment) {
            return void res.status(404).json({ error: 'Payment not found' });
        }
        
        res.json({ payment });
    } catch (error) {
        console.error('Get payment error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /course-payments/:paymentId/refund
 * Request refund for course enrolment
 */
router.post('/:paymentId/refund', authenticate, async (req, res) => {
    try {
        const { paymentId } = req.params;
        const userId = req.user.id;
        const { reason } = req.body;
        
        const payment = await prisma.coursePayment.findFirst({
            where: {
                id: paymentId,
                userId,
                status: 'completed',
            },
            include: { course: true },
        });
        
        if (!payment) {
            return void res.status(404).json({ error: 'Payment not found or not eligible for refund' });
        }
        
        // Check refund window (e.g., 14 days)
        const refundWindowDays = 14;
        const paidDate = new Date(payment.paidAt);
        const now = new Date();
        const daysSincePaid = (now.getTime() - paidDate.getTime()) / (1000 * 60 * 60 * 24);
        
        if (daysSincePaid > refundWindowDays) {
            return void res.status(400).json({
                error: `Refund window expired (${refundWindowDays} days)`,
            });
        }
        
        // Process refund with Stripe
        if (payment.stripePaymentId) {
            await stripe.refunds.create({
                payment_intent: payment.stripePaymentId,
                reason: 'requested_by_customer',
            });
        }
        
        // Update payment status
        const refundedPayment = await prisma.coursePayment.update({
            where: { id: paymentId },
            data: {
                status: 'refunded',
                refundReason: reason,
                refundedAt: new Date(),
            },
        });
        
        res.json({
            success: true,
            message: 'Refund processed successfully',
            payment: refundedPayment,
        });
    } catch (error) {
        console.error('Refund error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /course-payments/check/:courseId
 * Check if user is enrolled in a course
 */
router.get('/check/:courseId', authenticate, async (req, res) => {
    try {
        const { courseId } = req.params;
        const userId = req.user.id;
        
        const enrolment = await prisma.coursePayment.findFirst({
            where: {
                userId,
                courseId,
                status: 'completed',
            },
        });
        
        res.json({
            enrolled: !!enrolment,
            enrolment,
        });
    } catch (error) {
        console.error('Check enrolment error:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;


export {};

