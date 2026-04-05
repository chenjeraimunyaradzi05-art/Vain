import { z } from 'zod';

export const jobQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(20),
  q: z.string().optional(),
  location: z.string().optional(),
  employment: z.enum(['FULL_TIME', 'PART_TIME', 'CASUAL', 'CONTRACT', 'APPRENTICESHIP', 'TRAINEESHIP']).optional(),
  minSalary: z.coerce.number().optional(),
  maxSalary: z.coerce.number().optional(),
  skills: z.string().optional(),
  companyVerified: z.enum(['true', 'false']).optional(),
  rapLevel: z.string().optional(),
  featured: z.enum(['true', 'false']).optional(),
});

export const createJobSchema = z.object({
  title: z.string().min(3).max(100),
  description: z.string().min(10),
  location: z.string().min(2),
  employmentType: z.enum(['FULL_TIME', 'PART_TIME', 'CASUAL', 'CONTRACT']),
  companyId: z.string().uuid(),
  isFeatured: z.boolean().optional(),
});

export const updateJobSchema = createJobSchema.partial();
