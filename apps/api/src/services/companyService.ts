// @ts-nocheck
import { prisma } from '../db';
import { z } from 'zod';
import { companyProfileSchema, jobSchema } from '../schemas/company';
// @ts-ignore
import * as stripeLib from '../lib/stripe';

export class CompanyService {
  static async getProfile(userId: string) {
    const profile = await prisma.companyProfile.findUnique({ where: { userId } });
    if (!profile) return null;
    
    return {
      ...profile,
      logo: (profile as any).logo,
      logoUrl: (profile as any).logo, // Alias for frontend compatibility
      location: `${profile.city || ''}, ${profile.state || ''}`.replace(/^, |, $/g, '')
    };
  }

  static async updateProfile(userId: string, data: z.infer<typeof companyProfileSchema>['body']) {
    const existingProfile = await prisma.companyProfile.findUnique({ where: { userId } });
    const isNewProfile = !existingProfile;

    // Use type assertion since Zod validation ensures required fields
    const profile = await prisma.companyProfile.upsert({
      where: { userId },
      create: { 
        user: { connect: { id: userId } },
        companyName: data.companyName || 'Unknown Company',
        industry: data.industry || 'Other',
        ...data 
      } as any,
      update: { ...data },
    });

    // Handle Stripe Customer Creation for new profiles
    if (isNewProfile) {
      try {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (user && stripeLib.stripe) {
          const customerId = await stripeLib.getOrCreateCustomer(
            userId,
            user.email,
            data.companyName
          );

          await prisma.companySubscription.upsert({
            where: { userId },
            create: { userId, tier: 'FREE', stripeCustomerId: customerId },
            update: { stripeCustomerId: customerId },
          });
        } else {
          // Fallback if no Stripe
          await prisma.companySubscription.upsert({
            where: { userId },
            create: { userId, tier: 'FREE' },
            update: {},
          });
        }
      } catch (e) {
        console.error('Stripe setup failed:', e);
        // Don't fail the request, just log it
      }
    }

    return profile;
  }

  static async createJob(userId: string, data: z.infer<typeof jobSchema>['body']) {
    const slug = data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^[-]+|[-]+$/g, '');
    
    return await prisma.job.create({
      data: {
        userId,
        title: data.title,
        slug,
        description: data.description,
        location: data.location,
        employment: data.employment,
        salaryLow: data.salaryLow,
        salaryHigh: data.salaryHigh,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
        isActive: data.isActive ?? true,
      },
    });
  }

  static async getJobs(userId: string) {
    return await prisma.job.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { applications: true },
        },
      },
    });
  }

  static async getJob(userId: string, jobId: string) {
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: {
        _count: {
          select: { applications: true },
        },
      },
    });

    if (!job || job.userId !== userId) {
      throw new Error('Job not found or unauthorized');
    }

    return job;
  }

  static async getApplicants(userId: string, jobId: string) {
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      select: { userId: true },
    });

    if (!job || job.userId !== userId) {
      throw new Error('Job not found or unauthorized');
    }

    return await prisma.jobApplication.findMany({
      where: { jobId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            memberProfile: true,
          },
        },
        resume: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  static async updateJob(userId: string, jobId: string, data: Partial<z.infer<typeof jobSchema>['body']>) {
    const existing = await prisma.job.findUnique({ where: { id: jobId } });
    if (!existing || existing.userId !== userId) {
      throw new Error('Job not found or unauthorized');
    }

    const updatePayload: any = { ...data };
    if (data.title) {
      updatePayload.slug = data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^[-]+|[-]+$/g, '');
    }
    if (data.expiresAt) {
      updatePayload.expiresAt = new Date(data.expiresAt);
    }

    return await prisma.job.update({
      where: { id: jobId },
      data: updatePayload,
    });
  }

  static async updateApplicationStatus(userId: string, jobId: string, applicationId: string, status: string) {
    const job = await prisma.job.findUnique({ where: { id: jobId } });
    if (!job || job.userId !== userId) {
      throw new Error('Job not found or unauthorized');
    }

    return await prisma.jobApplication.update({
      where: { id: applicationId },
      data: { status },
    });
  }
}
