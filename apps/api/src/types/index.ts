/**
 * API Type Definitions
 * 
 * Centralized type definitions for the Ngurra Pathways API.
 */

// ============================================================================
// User Types
// ============================================================================

export interface User {
  id: string;
  email: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  role: UserRole;
  avatar?: string;
  phone?: string;
  location?: string;
  bio?: string;
  isIndigenous?: boolean;
  indigenousCommunity?: string;
  skills?: string[];
  verified?: boolean;
  emailVerified?: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
  deletedAt?: Date;
}

export type UserRole = 'CANDIDATE' | 'EMPLOYER' | 'ADMIN' | 'MENTOR' | 'SUPER_ADMIN';

// ============================================================================
// Job Types
// ============================================================================

export interface Job {
  id: string;
  title: string;
  description: string;
  companyId: string;
  company?: Company;
  location?: string;
  locationType?: LocationType;
  employmentType: EmploymentType;
  experienceLevel?: ExperienceLevel;
  salary?: SalaryRange;
  skills?: string[];
  requirements?: string;
  benefits?: string;
  postedAt: Date;
  applicationDeadline?: Date;
  isActive: boolean;
  isFeatured: boolean;
  featuredUntil?: Date;
  indigenousPreferred?: boolean;
  views?: number;
  applicationsCount?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export type EmploymentType = 'FULL_TIME' | 'PART_TIME' | 'CASUAL' | 'CONTRACT' | 'INTERNSHIP' | 'APPRENTICESHIP';

export type LocationType = 'onsite' | 'remote' | 'hybrid';

export type ExperienceLevel = 'entry' | 'mid' | 'senior' | 'lead' | 'executive';

export interface SalaryRange {
  min: number;
  max: number;
  currency?: string;
  period?: 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly';
  hideRange?: boolean;
}

// ============================================================================
// Company Types
// ============================================================================

export interface Company {
  id: string;
  name: string;
  description?: string;
  industry?: string;
  size?: CompanySize;
  website?: string;
  logo?: string;
  location?: string;
  abn?: string;
  indigenousOwned?: boolean;
  verified?: boolean;
  rapStatus?: RAPStatus;
  ownerId?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export type CompanySize = 'micro' | 'small' | 'medium' | 'large' | 'enterprise';

export type RAPStatus = 'none' | 'reflect' | 'innovate' | 'stretch' | 'elevate';

// ============================================================================
// Application Types
// ============================================================================

export interface Application {
  id: string;
  userId: string;
  user?: User;
  jobId: string;
  job?: Job;
  status: ApplicationStatus;
  coverLetter?: string;
  resume?: string;
  rating?: number;
  notes?: ApplicationNote[];
  createdAt: Date;
  updatedAt?: Date;
  reviewedAt?: Date;
  withdrawnAt?: Date;
}

export type ApplicationStatus = 
  | 'pending'
  | 'reviewing'
  | 'shortlisted'
  | 'interview'
  | 'offered'
  | 'hired'
  | 'rejected'
  | 'withdrawn';

export interface ApplicationNote {
  id: string;
  content: string;
  authorId: string;
  createdAt: Date;
  isPrivate: boolean;
}

// ============================================================================
// Mentorship Types
// ============================================================================

export interface Mentor {
  id: string;
  userId: string;
  user?: User;
  bio?: string;
  expertise?: string[];
  industries?: string[];
  availability?: MentorAvailability;
  rating?: number;
  totalSessions?: number;
  acceptingMentees?: boolean;
  createdAt?: Date;
}

export interface MentorAvailability {
  timezone: string;
  slots: { dayOfWeek: number; startTime: string; endTime: string }[];
}

export interface Mentorship {
  id: string;
  mentorId: string;
  menteeId: string;
  status: MentorshipStatus;
  goals?: string[];
  startedAt?: Date;
  endedAt?: Date;
  createdAt: Date;
}

export type MentorshipStatus = 'pending' | 'active' | 'paused' | 'completed' | 'declined' | 'cancelled';

export interface MentorshipSession {
  id: string;
  mentorshipId: string;
  scheduledAt: Date;
  duration: number;
  type: 'video' | 'audio' | 'chat' | 'in-person';
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
  meetingLink?: string;
  notes?: string;
}

// ============================================================================
// Notification Types
// ============================================================================

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  read: boolean;
  readAt?: Date;
  actionUrl?: string;
  createdAt: Date;
}

export type NotificationType = 
  | 'application_status'
  | 'job_match'
  | 'message'
  | 'mentorship_request'
  | 'mentorship_session'
  | 'system'
  | 'reminder';

// ============================================================================
// API Response Types
// ============================================================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: { requestId?: string; timestamp?: string };
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  validationErrors?: { field: string; message: string; code: string }[];
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// ============================================================================
// Request Types
// ============================================================================

export interface AuthenticatedRequest {
  user: User;
  token: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface SearchParams extends PaginationParams {
  q?: string;
  filters?: Record<string, unknown>;
}

// ============================================================================
// Audit Types
// ============================================================================

export interface AuditLog {
  id: string;
  action: string;
  resource: string;
  resourceId: string;
  userId?: string;
  ipAddress?: string;
  changes?: Record<string, { old: unknown; new: unknown }>;
  createdAt: Date;
}

// ============================================================================
// File Types
// ============================================================================

export interface UploadedFile {
  id: string;
  name: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  uploadedBy: string;
  uploadedAt: Date;
}

export {};
