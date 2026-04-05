/**
 * Global Type Definitions for Web App
 * 
 * Centralized type definitions used across the application.
 */

// ==========================================
// User Types
// ==========================================

export type UserType = 
  | 'MEMBER' 
  | 'COMPANY' 
  | 'GOVERNMENT' 
  | 'INSTITUTION' 
  | 'FIFO' 
  | 'MENTOR' 
  | 'TAFE' 
  | 'ADMIN';

export interface User {
  id: string;
  email: string;
  userType: UserType;
  name?: string;
  avatar?: string;
  phone?: string;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
  twoFactorEnabled?: boolean;
}

// ==========================================
// Job Types
// ==========================================

export type JobType = 
  | 'FULL_TIME' 
  | 'PART_TIME' 
  | 'CONTRACT' 
  | 'CASUAL' 
  | 'APPRENTICESHIP' 
  | 'TRAINEESHIP';

export type JobStatus = 
  | 'DRAFT' 
  | 'ACTIVE' 
  | 'PAUSED' 
  | 'CLOSED' 
  | 'FILLED';

export interface Job {
  id: string;
  title: string;
  description: string;
  company: Company;
  location: string;
  remoteType?: 'REMOTE' | 'HYBRID' | 'ONSITE';
  salary?: {
    min?: number;
    max?: number;
    currency: string;
    period: 'HOUR' | 'YEAR';
  };
  jobType: JobType;
  status: JobStatus;
  skills: string[];
  industry: string;
  experienceLevel?: 'ENTRY' | 'MID' | 'SENIOR' | 'EXECUTIVE';
  closingDate?: string;
  isFirstNationsFocused?: boolean;
  culturalConsiderations?: string;
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// Company Types
// ==========================================

export interface Company {
  id: string;
  companyName: string;
  logo?: string;
  industry: string;
  description?: string;
  website?: string;
  location?: string;
  isVerified: boolean;
  rapCertificationLevel?: 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';
  employeeCount?: string;
  createdAt: string;
}

// ==========================================
// Application Types
// ==========================================

export type ApplicationStatus = 
  | 'SUBMITTED' 
  | 'VIEWED' 
  | 'SHORTLISTED' 
  | 'INTERVIEW' 
  | 'OFFERED' 
  | 'HIRED' 
  | 'REJECTED' 
  | 'WITHDRAWN';

export interface Application {
  id: string;
  jobId: string;
  job: Job;
  applicantId: string;
  status: ApplicationStatus;
  coverLetter?: string;
  resumeUrl?: string;
  answers?: Record<string, string>;
  submittedAt: string;
  updatedAt: string;
}

// ==========================================
// Mentor Types
// ==========================================

export interface Mentor {
  id: string;
  userId: string;
  name: string;
  title?: string;
  avatar?: string;
  bio?: string;
  expertise: string[];
  industry?: string;
  location?: string;
  availability?: string;
  achievements?: string[];
  rating?: number;
  sessionsCompleted?: number;
  isActive: boolean;
  hourlyRate?: number;
}

export type SessionStatus = 
  | 'SCHEDULED' 
  | 'CONFIRMED' 
  | 'IN_PROGRESS' 
  | 'COMPLETED' 
  | 'CANCELLED' 
  | 'NO_SHOW';

export interface MentorSession {
  id: string;
  mentorId: string;
  mentor: Mentor;
  menteeId: string;
  scheduledAt: string;
  duration: number; // minutes
  status: SessionStatus;
  topic?: string;
  notes?: string;
  meetingUrl?: string;
  rating?: number;
  feedback?: string;
}

// ==========================================
// Course Types
// ==========================================

export interface Course {
  id: string;
  title: string;
  description: string;
  institution: {
    id: string;
    name: string;
    logo?: string;
  };
  industry?: string;
  duration?: string;
  format: 'ONLINE' | 'IN_PERSON' | 'HYBRID';
  price?: number;
  startDate?: string;
  isActive: boolean;
  skillsGained: string[];
  certificationType?: string;
  createdAt: string;
}

export type EnrolmentStatus = 
  | 'PENDING' 
  | 'ACTIVE' 
  | 'COMPLETED' 
  | 'WITHDRAWN' 
  | 'FAILED';

export interface CourseEnrolment {
  id: string;
  courseId: string;
  course: Course;
  userId: string;
  status: EnrolmentStatus;
  progress: number;
  startedAt: string;
  completedAt?: string;
}

// ==========================================
// Notification Types
// ==========================================

export type NotificationType = 
  | 'APPLICATION_UPDATE' 
  | 'MESSAGE' 
  | 'MENTOR_SESSION' 
  | 'JOB_MATCH' 
  | 'COURSE_UPDATE' 
  | 'SYSTEM';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  isRead: boolean;
  createdAt: string;
}

// ==========================================
// API Response Types
// ==========================================

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, string[]>;
  };
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// ==========================================
// Form Types
// ==========================================

export interface FormState<T> {
  values: T;
  errors: Partial<Record<keyof T, string>>;
  touched: Partial<Record<keyof T, boolean>>;
  isSubmitting: boolean;
  isValid: boolean;
}

// ==========================================
// UI Types
// ==========================================

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface TableColumn<T> {
  key: keyof T | string;
  header: string;
  render?: (row: T) => React.ReactNode;
  sortable?: boolean;
  width?: string;
}

export interface FilterConfig {
  key: string;
  label: string;
  type: 'text' | 'select' | 'multiselect' | 'date' | 'daterange' | 'checkbox';
  options?: SelectOption[];
}

// ==========================================
// Analytics Types
// ==========================================

export interface AnalyticsEvent {
  name: string;
  properties?: Record<string, any>;
  timestamp?: string;
}

export interface DashboardMetrics {
  totalApplications: number;
  pendingApplications: number;
  interviewsScheduled: number;
  offersReceived: number;
  jobsViewed: number;
  profileViews: number;
  mentorSessions: number;
  coursesEnrolled: number;
}
