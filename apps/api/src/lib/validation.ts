/**
 * Request Validation Schemas
 * 
 * Zod schemas for validating API request bodies, params, and queries.
 */

import { z } from 'zod';

// ==========================================
// Common Schemas
// ==========================================

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const idParamSchema = z.object({
  id: z.string().min(1, 'ID is required'),
});

export const searchQuerySchema = paginationSchema.extend({
  q: z.string().min(1).max(200).optional(),
  search: z.string().min(1).max(200).optional(),
});

// ==========================================
// Authentication Schemas
// ==========================================

export const loginSchema = z.object({
  email: z.string().email('Valid email is required'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional().default(false),
});

export const registerSchema = z.object({
  email: z.string().email('Valid email is required'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain uppercase, lowercase, and number'
    ),
  userType: z.enum([
    'MEMBER',
    'COMPANY',
    'GOVERNMENT',
    'INSTITUTION',
    'FIFO',
    'MENTOR',
    'TAFE',
  ]),
  name: z.string().min(2).max(100).optional(),
  acceptTerms: z.literal(true, {
    errorMap: () => ({ message: 'You must accept the terms and conditions' }),
  }),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Valid email is required'),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain uppercase, lowercase, and number'
    ),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain uppercase, lowercase, and number'
    ),
});

// ==========================================
// Job Schemas
// ==========================================

export const jobTypeEnum = z.enum([
  'FULL_TIME',
  'PART_TIME',
  'CONTRACT',
  'CASUAL',
  'APPRENTICESHIP',
  'TRAINEESHIP',
]);

export const jobStatusEnum = z.enum([
  'DRAFT',
  'ACTIVE',
  'PAUSED',
  'CLOSED',
  'FILLED',
]);

export const createJobSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters').max(200),
  description: z.string().min(50, 'Description must be at least 50 characters').max(10000),
  location: z.string().min(2).max(200),
  remoteType: z.enum(['REMOTE', 'HYBRID', 'ONSITE']).optional(),
  jobType: jobTypeEnum,
  industry: z.string().min(2).max(100),
  salary: z.object({
    min: z.number().positive().optional(),
    max: z.number().positive().optional(),
    currency: z.string().length(3).default('AUD'),
    period: z.enum(['HOUR', 'YEAR']).default('YEAR'),
  }).optional(),
  skills: z.array(z.string()).min(1, 'At least one skill is required').max(20),
  experienceLevel: z.enum(['ENTRY', 'MID', 'SENIOR', 'EXECUTIVE']).optional(),
  closingDate: z.string().datetime().optional(),
  isFirstNationsFocused: z.boolean().optional(),
  culturalConsiderations: z.string().max(2000).optional(),
});

export const updateJobSchema = createJobSchema.partial().extend({
  status: jobStatusEnum.optional(),
});

export const jobSearchSchema = paginationSchema.extend({
  q: z.string().optional(),
  location: z.string().optional(),
  jobType: jobTypeEnum.optional(),
  industry: z.string().optional(),
  remote: z.coerce.boolean().optional(),
  salaryMin: z.coerce.number().positive().optional(),
  salaryMax: z.coerce.number().positive().optional(),
  experienceLevel: z.enum(['ENTRY', 'MID', 'SENIOR', 'EXECUTIVE']).optional(),
  isFirstNationsFocused: z.coerce.boolean().optional(),
});

// ==========================================
// Application Schemas
// ==========================================

export const applicationStatusEnum = z.enum([
  'SUBMITTED',
  'VIEWED',
  'SHORTLISTED',
  'INTERVIEW',
  'OFFERED',
  'HIRED',
  'REJECTED',
  'WITHDRAWN',
]);

export const submitApplicationSchema = z.object({
  coverLetter: z.string().max(5000).optional(),
  resumeUrl: z.string().url().optional(),
  answers: z.record(z.string()).optional(),
});

export const updateApplicationStatusSchema = z.object({
  status: applicationStatusEnum,
  notes: z.string().max(2000).optional(),
});

// ==========================================
// User Profile Schemas
// ==========================================

export const updateProfileSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  phone: z.string().max(20).optional(),
  bio: z.string().max(2000).optional(),
  location: z.string().max(200).optional(),
  skills: z.array(z.string()).max(50).optional(),
  industry: z.string().max(100).optional(),
  linkedIn: z.string().url().optional(),
  website: z.string().url().optional(),
  availability: z.string().max(200).optional(),
});

// ==========================================
// Mentorship Schemas
// ==========================================

export const bookSessionSchema = z.object({
  scheduledAt: z.string().datetime('Valid datetime is required'),
  duration: z.number().int().min(15).max(120).default(60),
  topic: z.string().max(500).optional(),
  notes: z.string().max(2000).optional(),
});

export const rateSessionSchema = z.object({
  rating: z.number().int().min(1).max(5),
  feedback: z.string().max(2000).optional(),
});

// ==========================================
// Course Schemas
// ==========================================

export const createCourseSchema = z.object({
  title: z.string().min(5).max(200),
  description: z.string().min(50).max(5000),
  industry: z.string().max(100).optional(),
  duration: z.string().max(100).optional(),
  format: z.enum(['ONLINE', 'IN_PERSON', 'HYBRID']),
  price: z.number().nonnegative().optional(),
  startDate: z.string().datetime().optional(),
  skillsGained: z.array(z.string()).optional(),
  certificationType: z.string().max(200).optional(),
});

// ==========================================
// Enterprise Schemas
// ==========================================

export const createApiKeySchema = z.object({
  name: z.string().min(3).max(100),
  permissions: z.array(z.enum(['read', 'write', 'admin'])).default(['read']),
  rateLimit: z.number().int().min(10).max(100000).optional(),
  expiresInDays: z.number().int().min(1).max(365).optional(),
});

export const createWebhookSchema = z.object({
  url: z.string().url(),
  events: z.array(z.string()).min(1),
  secret: z.string().min(16).max(64).optional(),
});

// ==========================================
// Export all schemas
// ==========================================

export const schemas = {
  // Common
  pagination: paginationSchema,
  id: idParamSchema,
  search: searchQuerySchema,
  
  // Auth
  login: loginSchema,
  register: registerSchema,
  forgotPassword: forgotPasswordSchema,
  resetPassword: resetPasswordSchema,
  changePassword: changePasswordSchema,
  
  // Jobs
  createJob: createJobSchema,
  updateJob: updateJobSchema,
  jobSearch: jobSearchSchema,
  
  // Applications
  submitApplication: submitApplicationSchema,
  updateApplicationStatus: updateApplicationStatusSchema,
  
  // User
  updateProfile: updateProfileSchema,
  
  // Mentorship
  bookSession: bookSessionSchema,
  rateSession: rateSessionSchema,
  
  // Courses
  createCourse: createCourseSchema,
  
  // Enterprise
  createApiKey: createApiKeySchema,
  createWebhook: createWebhookSchema,
};

export default schemas;

export {};
