/**
 * Type-safe API Client
 * 
 * Centralized API client with proper error handling and type safety.
 */

import type {
  User,
  Job,
  Application,
  Mentor,
  MentorSession,
  Course,
  CourseEnrolment,
  Notification,
  ApiResponse,
  PaginatedResponse,
  DashboardMetrics,
} from '@/types';
import { API_BASE } from '@/lib/apiBase';

const API_BASE_URL = API_BASE;

// ==========================================
// Error Handling
// ==========================================

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: Record<string, string[]>
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// ==========================================
// Base Fetch Function
// ==========================================

async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new ApiError(
      response.status,
      data?.error?.code || 'UNKNOWN_ERROR',
      data?.error?.message || `HTTP error ${response.status}`,
      data?.error?.details
    );
  }

  return data;
}

// ==========================================
// Jobs API
// ==========================================

export const jobsApi = {
  list: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    location?: string;
    jobType?: string;
    industry?: string;
    remote?: boolean;
  }) => {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, String(value));
        }
      });
    }
    return apiFetch<PaginatedResponse<Job>>(`/jobs?${searchParams}`);
  },

  get: (id: string) => apiFetch<ApiResponse<Job>>(`/jobs/${id}`),

  create: (data: Partial<Job>) =>
    apiFetch<ApiResponse<Job>>('/jobs', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: Partial<Job>) =>
    apiFetch<ApiResponse<Job>>(`/jobs/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    apiFetch<ApiResponse<null>>(`/jobs/${id}`, { method: 'DELETE' }),

  getFeatured: () => apiFetch<ApiResponse<Job[]>>('/jobs/featured'),

  search: (query: string) =>
    apiFetch<PaginatedResponse<Job>>(`/jobs/search?q=${encodeURIComponent(query)}`),

  getRecommended: () => apiFetch<ApiResponse<Job[]>>('/jobs/recommended'),
};

// ==========================================
// Applications API
// ==========================================

export const applicationsApi = {
  list: (params?: { page?: number; status?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', String(params.page));
    if (params?.status) searchParams.append('status', params.status);
    return apiFetch<PaginatedResponse<Application>>(`/applications?${searchParams}`);
  },

  get: (id: string) => apiFetch<ApiResponse<Application>>(`/applications/${id}`),

  apply: (jobId: string, data: {
    coverLetter?: string;
    resumeUrl?: string;
    answers?: Record<string, string>;
  }) =>
    apiFetch<ApiResponse<Application>>(`/jobs/${jobId}/apply`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  withdraw: (id: string) =>
    apiFetch<ApiResponse<Application>>(`/applications/${id}/withdraw`, {
      method: 'POST',
    }),

  updateStatus: (id: string, status: Application['status']) =>
    apiFetch<ApiResponse<Application>>(`/applications/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
};

// ==========================================
// Mentorship API
// ==========================================

export const mentorshipApi = {
  listMentors: (params?: {
    page?: number;
    industry?: string;
    expertise?: string;
  }) => {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) searchParams.append(key, String(value));
      });
    }
    return apiFetch<PaginatedResponse<Mentor>>(`/mentors?${searchParams}`);
  },

  getMentor: (id: string) => apiFetch<ApiResponse<Mentor>>(`/mentors/${id}`),

  bookSession: (mentorId: string, data: {
    scheduledAt: string;
    duration: number;
    topic?: string;
  }) =>
    apiFetch<ApiResponse<MentorSession>>(`/mentors/${mentorId}/book`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getMySessions: () =>
    apiFetch<ApiResponse<MentorSession[]>>('/mentorship/sessions'),

  cancelSession: (sessionId: string) =>
    apiFetch<ApiResponse<MentorSession>>(`/mentorship/sessions/${sessionId}/cancel`, {
      method: 'POST',
    }),

  rateSession: (sessionId: string, rating: number, feedback?: string) =>
    apiFetch<ApiResponse<MentorSession>>(`/mentorship/sessions/${sessionId}/rate`, {
      method: 'POST',
      body: JSON.stringify({ rating, feedback }),
    }),
};

// ==========================================
// Courses API
// ==========================================

export const coursesApi = {
  list: (params?: {
    page?: number;
    industry?: string;
    format?: string;
  }) => {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) searchParams.append(key, String(value));
      });
    }
    return apiFetch<PaginatedResponse<Course>>(`/courses?${searchParams}`);
  },

  get: (id: string) => apiFetch<ApiResponse<Course>>(`/courses/${id}`),

  enrol: (courseId: string) =>
    apiFetch<ApiResponse<CourseEnrolment>>(`/courses/${courseId}/enrol`, {
      method: 'POST',
    }),

  getMyEnrolments: () =>
    apiFetch<ApiResponse<CourseEnrolment[]>>('/courses/enrolments'),
};

// ==========================================
// User API
// ==========================================

export const userApi = {
  getProfile: () => apiFetch<ApiResponse<User>>('/users/profile'),

  updateProfile: (data: Partial<User>) =>
    apiFetch<ApiResponse<User>>('/users/profile', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  uploadAvatar: async (file: File) => {
    const formData = new FormData();
    formData.append('avatar', file);
    
    const response = await fetch(`${API_BASE_URL}/users/avatar`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });
    
    if (!response.ok) {
      throw new Error('Failed to upload avatar');
    }
    
    return response.json();
  },

  getDashboardMetrics: () =>
    apiFetch<ApiResponse<DashboardMetrics>>('/users/dashboard/metrics'),

  getNotifications: () =>
    apiFetch<ApiResponse<Notification[]>>('/users/notifications'),

  markNotificationRead: (id: string) =>
    apiFetch<ApiResponse<Notification>>(`/users/notifications/${id}/read`, {
      method: 'POST',
    }),

  markAllNotificationsRead: () =>
    apiFetch<ApiResponse<null>>('/users/notifications/read-all', {
      method: 'POST',
    }),
};

// ==========================================
// Export All APIs
// ==========================================

export const api = {
  jobs: jobsApi,
  applications: applicationsApi,
  mentorship: mentorshipApi,
  courses: coursesApi,
  user: userApi,
};

export default api;
