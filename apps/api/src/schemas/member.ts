import { z } from 'zod';

// Foundation & Financial Wellness preferences schema
export const foundationPreferencesSchema = z.object({
  // Business & Entrepreneurship interests
  businessFoundation: z.boolean().optional(),
  legalStartups: z.boolean().optional(),
  businessFormation: z.boolean().optional(),
  basicAccountingBudget: z.boolean().optional(),
  // Asset & Investment interests
  mortgagesHomeOwnership: z.boolean().optional(),
  investingStocks: z.boolean().optional(),
  preciousMetals: z.boolean().optional(),
  financialWellbeing: z.boolean().optional(),
  // Job alerts & Pre-apply
  enableJobAlerts: z.boolean().optional(),
  enablePreApply: z.boolean().optional(),
  preApplyLocations: z.array(z.string()).optional(),
  preApplyEmployment: z.array(z.string()).optional(),
  preApplySalaryMin: z.number().optional(),
  preApplySalaryMax: z.number().optional(),
  preApplyIndustries: z.array(z.string()).optional(),
});

export const updateFoundationPreferencesSchema = z.object({
  body: foundationPreferencesSchema,
});

export const updateProfileSchema = z.object({
  body: z.object({
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    headline: z.string().optional(),
    bio: z.string().optional(),
    location: z.string().optional(),
    phone: z.string().optional(),
    linkedinUrl: z.string().url().optional().or(z.literal('')),
    portfolioUrl: z.string().url().optional().or(z.literal('')),
    skills: z.array(z.string()).optional(),
    experience: z.array(z.object({
      title: z.string(),
      company: z.string(),
      startDate: z.string(),
      endDate: z.string().optional(),
      current: z.boolean().optional(),
      description: z.string().optional(),
    })).optional(),
    education: z.array(z.object({
      institution: z.string(),
      degree: z.string(),
      fieldOfStudy: z.string(),
      startDate: z.string(),
      endDate: z.string().optional(),
    })).optional(),
  }),
});

export const uploadAvatarSchema = z.object({
  // File validation is typically handled by multer/middleware, 
  // but we can validate metadata if needed.
});
