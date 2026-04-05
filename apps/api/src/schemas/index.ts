/**
 * API Request Validators
 * Zod schemas for request validation
 */

import { z } from 'zod';
import { registerSchema, loginSchema } from '../lib/validation';

// Re-export auth schemas from validation.ts
export { registerSchema, loginSchema };

// ============================================
// Common Schemas
// ============================================

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

export const idParamSchema = z.object({
  id: z.string().uuid('Invalid ID format'),
});

export const slugParamSchema = z.object({
  slug: z.string().min(1).max(100),
});

// ============================================
// User Schemas
// ============================================

export const updateProfileSchema = z.object({
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().min(1).max(50).optional(),
  phone: z.string().optional(),
  bio: z.string().max(500).optional(),
  location: z.string().max(100).optional(),
  website: z.string().url().optional().or(z.literal('')),
  linkedIn: z.string().url().optional().or(z.literal('')),
  skills: z.array(z.string().max(50)).max(20).optional(),
  experience: z.array(z.object({
    title: z.string().max(100),
    company: z.string().max(100),
    startDate: z.string(),
    endDate: z.string().optional(),
    current: z.boolean().optional(),
    description: z.string().max(1000).optional(),
  })).optional(),
  education: z.array(z.object({
    institution: z.string().max(100),
    degree: z.string().max(100),
    field: z.string().max(100).optional(),
    startYear: z.number().int().min(1950).max(2030),
    endYear: z.number().int().min(1950).max(2030).optional(),
  })).optional(),
  preferences: z.object({
    emailNotifications: z.boolean().optional(),
    pushNotifications: z.boolean().optional(),
    jobAlerts: z.boolean().optional(),
    marketingEmails: z.boolean().optional(),
  }).optional(),
});

export const userSearchSchema = z.object({
  ...paginationSchema.shape,
  q: z.string().optional(),
  role: z.enum(['candidate', 'employer', 'mentor', 'admin']).optional(),
  status: z.enum(['active', 'inactive', 'suspended']).optional(),
  verified: z.coerce.boolean().optional(),
});

// ============================================
// Job Schemas
// ============================================

const baseJobSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters').max(100),
  description: z.string().min(50, 'Description must be at least 50 characters').max(10000),
  requirements: z.string().max(5000).optional(),
  benefits: z.string().max(5000).optional(),
  location: z.string().max(100),
  locationType: z.enum(['remote', 'hybrid', 'onsite']),
  employmentType: z.enum(['full-time', 'part-time', 'contract', 'casual', 'internship']),
  salaryMin: z.number().int().min(0).optional(),
  salaryMax: z.number().int().min(0).optional(),
  salaryCurrency: z.string().length(3).optional().default('AUD'),
  salaryPeriod: z.enum(['hourly', 'daily', 'weekly', 'monthly', 'yearly']).optional(),
  skills: z.array(z.string().max(50)).max(15).optional(),
  experience: z.enum(['entry', 'mid', 'senior', 'lead', 'executive']).optional(),
  industry: z.string().max(50).optional(),
  closingDate: z.string().datetime().optional(),
  isIndigenousPreferred: z.boolean().optional(),
  isRAPEmployer: z.boolean().optional(),
  companyId: z.string().uuid().optional(),
});

export const createJobSchema = baseJobSchema.refine(
  (data) => !data.salaryMin || !data.salaryMax || data.salaryMin <= data.salaryMax,
  { message: 'Minimum salary cannot be greater than maximum salary', path: ['salaryMin'] }
);

export const updateJobSchema = baseJobSchema.partial();

export const jobSearchSchema = z.object({
  ...paginationSchema.shape,
  q: z.string().optional(),
  location: z.string().optional(),
  locationType: z.enum(['remote', 'hybrid', 'onsite']).optional(),
  employmentType: z.enum(['full-time', 'part-time', 'contract', 'casual', 'internship']).optional(),
  salaryMin: z.coerce.number().int().min(0).optional(),
  salaryMax: z.coerce.number().int().min(0).optional(),
  skills: z.string().transform(s => s.split(',')).optional(),
  experience: z.enum(['entry', 'mid', 'senior', 'lead', 'executive']).optional(),
  industry: z.string().optional(),
  companyId: z.string().uuid().optional(),
  isIndigenousPreferred: z.coerce.boolean().optional(),
  isRAPEmployer: z.coerce.boolean().optional(),
  postedAfter: z.string().datetime().optional(),
  status: z.enum(['active', 'closed', 'draft']).optional(),
});

// ============================================
// Application Schemas
// ============================================

export const createApplicationSchema = z.object({
  jobId: z.string().uuid('Invalid job ID'),
  coverLetter: z.string().max(5000).optional(),
  resumeId: z.string().uuid().optional(),
  answers: z.array(z.object({
    questionId: z.string(),
    answer: z.string().max(2000),
  })).optional(),
  availableStartDate: z.string().datetime().optional(),
  salaryExpectation: z.number().int().min(0).optional(),
});

export const updateApplicationSchema = z.object({
  status: z.enum(['submitted', 'reviewing', 'shortlisted', 'interviewed', 'offered', 'hired', 'rejected', 'withdrawn']),
  notes: z.string().max(2000).optional(),
  interviewDate: z.string().datetime().optional(),
  feedback: z.string().max(2000).optional(),
});

export const applicationSearchSchema = z.object({
  ...paginationSchema.shape,
  status: z.enum(['submitted', 'reviewing', 'shortlisted', 'interviewed', 'offered', 'hired', 'rejected', 'withdrawn']).optional(),
  jobId: z.string().uuid().optional(),
  candidateId: z.string().uuid().optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
});

// ============================================
// Company Schemas
// ============================================

export const createCompanySchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().max(2000).optional(),
  website: z.string().url().optional(),
  industry: z.string().max(50).optional(),
  size: z.enum(['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+']).optional(),
  founded: z.number().int().min(1800).max(new Date().getFullYear()).optional(),
  location: z.string().max(100).optional(),
  logoUrl: z.string().url().optional(),
  isRAPEmployer: z.boolean().optional(),
  rapDetails: z.object({
    level: z.enum(['reflect', 'innovate', 'stretch', 'elevate']).optional(),
    startDate: z.string().optional(),
    commitments: z.array(z.string()).optional(),
  }).optional(),
  abn: z.string().regex(/^\d{11}$/, 'ABN must be 11 digits').optional(),
  acn: z.string().regex(/^\d{9}$/, 'ACN must be 9 digits').optional(),
});

export const updateCompanySchema = createCompanySchema.partial();

// ============================================
// Mentorship Schemas
// ============================================

export const mentorshipRequestSchema = z.object({
  mentorId: z.string().uuid('Invalid mentor ID'),
  message: z.string().min(10).max(1000),
  goals: z.array(z.string().max(200)).min(1).max(5),
  preferredSchedule: z.object({
    days: z.array(z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'])),
    timeSlots: z.array(z.enum(['morning', 'afternoon', 'evening'])),
    timezone: z.string().optional(),
  }).optional(),
  duration: z.enum(['1-month', '3-months', '6-months', 'ongoing']).optional(),
});

export const mentorshipSessionSchema = z.object({
  mentorshipId: z.string().uuid(),
  scheduledAt: z.string().datetime(),
  duration: z.number().int().min(15).max(180), // minutes
  type: z.enum(['video', 'phone', 'in-person', 'chat']),
  agenda: z.string().max(1000).optional(),
  location: z.string().max(200).optional(),
  meetingUrl: z.string().url().optional(),
});

export const mentorSearchSchema = z.object({
  ...paginationSchema.shape,
  skills: z.string().transform(s => s.split(',')).optional(),
  industry: z.string().optional(),
  experience: z.enum(['5+', '10+', '15+', '20+']).optional(),
  availability: z.enum(['available', 'limited', 'unavailable']).optional(),
  rating: z.coerce.number().min(1).max(5).optional(),
});

// ============================================
// Contact/Support Schemas
// ============================================

export const contactSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  subject: z.string().min(5).max(200),
  message: z.string().min(10).max(5000),
  category: z.enum(['general', 'support', 'feedback', 'bug', 'feature', 'partnership']).optional(),
});

export const reportSchema = z.object({
  type: z.enum(['job', 'user', 'company', 'content', 'bug']),
  targetId: z.string().uuid(),
  reason: z.enum(['inappropriate', 'spam', 'scam', 'harassment', 'other']),
  details: z.string().max(1000).optional(),
});

// ============================================
// Type exports
// ============================================

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type CreateJobInput = z.infer<typeof createJobSchema>;
export type UpdateJobInput = z.infer<typeof updateJobSchema>;
export type JobSearchInput = z.infer<typeof jobSearchSchema>;
export type CreateApplicationInput = z.infer<typeof createApplicationSchema>;
export type UpdateApplicationInput = z.infer<typeof updateApplicationSchema>;
export type CreateCompanyInput = z.infer<typeof createCompanySchema>;
export type MentorshipRequestInput = z.infer<typeof mentorshipRequestSchema>;
export type MentorshipSessionInput = z.infer<typeof mentorshipSessionSchema>;
export type ContactInput = z.infer<typeof contactSchema>;
export type ReportInput = z.infer<typeof reportSchema>;

export {};
