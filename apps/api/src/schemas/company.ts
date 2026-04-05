import { z } from 'zod';

export const companyProfileSchema = z.object({
  body: z.object({
    companyName: z.string().min(2, 'Company name must be at least 2 characters'),
    abn: z.string().min(9, 'ABN must be at least 9 characters').optional(),
    industry: z.string().min(2, 'Industry is required'),
    description: z.string().max(1000, 'Description too long').optional(),
    website: z.string().url('Invalid URL').optional().or(z.literal('')),
    address: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    postcode: z.string().optional(),
    phone: z.string().optional(),
    hrEmail: z.string().email('Invalid email').optional().or(z.literal('')),
  }),
});

export const jobSchema = z.object({
  body: z.object({
    title: z.string().min(3, 'Title must be at least 3 characters'),
    description: z.string().min(10, 'Description must be at least 10 characters'),
    location: z.string().optional(),
    employment: z.enum(['FULL_TIME', 'PART_TIME', 'CONTRACT', 'CASUAL', 'APPRENTICESHIP']).optional(),
    salaryLow: z.number().int().optional(),
    salaryHigh: z.number().int().optional(),
    expiresAt: z.string().optional(),
    isActive: z.boolean().optional(),
  }),
});
