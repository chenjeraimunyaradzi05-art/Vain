import AsyncStorage from '@react-native-async-storage/async-storage';

// API Base URL - use environment variable or default
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3333';

// Cache keys
const CACHE_PREFIX = '@ngurra_cache_';
const USER_KEY = 'user_data';
const TOKEN_KEY = '@ngurra_auth_token';
const REFRESH_TOKEN_KEY = '@ngurra_refresh_token';

interface ApiOptions extends RequestInit {
  skipRetry?: boolean;
  skipAuth?: boolean;
}

interface ApiResponse<T = any> {
  ok: boolean;
  status: number;
  data?: T;
  error?: string;
}

/**
 * Get cached data
 */
async function getCache<T>(key: string): Promise<T | null> {
  try {
    const cached = await AsyncStorage.getItem(`${CACHE_PREFIX}${key}`);
    if (cached) {
      const { data, expiry } = JSON.parse(cached);
      if (Date.now() < expiry) {
        return data as T;
      }
      // Cache expired, remove it
      await AsyncStorage.removeItem(`${CACHE_PREFIX}${key}`);
    }
  } catch (e) {
    console.warn('Cache read error:', e);
  }
  return null;
}

/**
 * Set cached data
 */
async function setCache(key: string, data: any, ttlMinutes = 5) {
  try {
    const cacheData = {
      data,
      expiry: Date.now() + ttlMinutes * 60 * 1000,
    };
    await AsyncStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify(cacheData));
  } catch (e) {
    console.warn('Cache write error:', e);
  }
}

/**
 * Get stored auth token
 */
async function getAuthToken(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(TOKEN_KEY);
  } catch (e) {
    console.warn('Failed to get auth token:', e);
    return null;
  }
}

/**
 * Store auth tokens
 */
async function storeTokens(accessToken: string, refreshToken?: string): Promise<void> {
  try {
    await AsyncStorage.setItem(TOKEN_KEY, accessToken);
    if (refreshToken) {
      await AsyncStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    }
  } catch (e) {
    console.warn('Failed to store tokens:', e);
  }
}

/**
 * Clear auth tokens
 */
async function clearTokens(): Promise<void> {
  try {
    await AsyncStorage.multiRemove([TOKEN_KEY, REFRESH_TOKEN_KEY, USER_KEY]);
  } catch (e) {
    console.warn('Failed to clear tokens:', e);
  }
}

/**
 * Refresh the access token using refresh token
 */
async function refreshAccessToken(): Promise<string | null> {
  try {
    const refreshToken = await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
    if (!refreshToken) return null;

    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (response.ok) {
      const data = await response.json();
      await storeTokens(data.token || data.accessToken);
      return data.token || data.accessToken;
    }
  } catch (e) {
    console.warn('Token refresh failed:', e);
  }
  return null;
}

/**
 * Make an authenticated API request
 */
async function apiRequest<T = any>(endpoint: string, options: ApiOptions = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  // Add auth token if not skipping auth
  if (!options.skipAuth) {
    const token = await getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  let response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  // Handle 401 - try to refresh token
  if (response.status === 401 && !options.skipRetry) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      headers['Authorization'] = `Bearer ${newToken}`;
      response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
      });
    }
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || error.message || `Request failed: ${response.status}`);
  }

  return response.json();
}

/**
 * Auth API
 */
export const authApi = {
  async login(email: string, password: string, twoFactorToken?: string) {
    const response = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password, twoFactorToken }),
      skipAuth: true,
    });

    // Store tokens and user data
    if (response.token) {
      await storeTokens(response.token, response.refreshToken);
    }
    if (response.user) {
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(response.user));
    }

    return response;
  },

  async register(data: any) {
    const response = await apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
      skipAuth: true,
    });

    // Store tokens and user data
    if (response.token) {
      await storeTokens(response.token, response.refreshToken);
    }
    if (response.user) {
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(response.user));
    }

    return response;
  },

  async logout() {
    await clearTokens();
  },

  async getCurrentUser() {
    const userData = await AsyncStorage.getItem(USER_KEY);
    if (userData) {
      return JSON.parse(userData);
    }

    // Try to fetch from API
    try {
      const response = await apiRequest('/auth/me');
      if (response.data) {
        await AsyncStorage.setItem(USER_KEY, JSON.stringify(response.data));
        return response.data;
      }
    } catch (e) {
      // Not authenticated
    }

    return null;
  },

  async isAuthenticated() {
    const token = await getAuthToken();
    return !!token;
  },
};

/**
 * Jobs API
 */
export const jobsApi = {
  async getJobs(params: any = {}) {
    const queryString = new URLSearchParams(params).toString();
    const cacheKey = `jobs_${queryString}`;

    // Try cache first for offline support
    const cached = await getCache(cacheKey);
    if (cached) {
      return cached;
    }

    const result = await apiRequest(`/jobs?${queryString}`, { skipAuth: true });
    await setCache(cacheKey, result, 10); // Cache for 10 minutes

    return result;
  },

  async getJob(id: string) {
    const cacheKey = `job_${id}`;
    const cached = await getCache(cacheKey);
    if (cached) {
      return cached;
    }

    const result = await apiRequest(`/jobs/${id}`);
    await setCache(cacheKey, result, 30); // Cache for 30 minutes

    return result;
  },

  async applyForJob(jobId: string, data: any) {
    return apiRequest(`/jobs/${jobId}/apply`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async saveJob(jobId: string) {
    return apiRequest(`/jobs/${jobId}/save`, {
      method: 'POST',
    });
  },

  async getSavedJobs() {
    return apiRequest('/jobs/saved');
  },
};

/**
 * Member API
 */
export const memberApi = {
  async getProfile() {
    return apiRequest('/member/profile');
  },

  async updateProfile(data: any) {
    return apiRequest('/member/profile', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async getApplications(params: any = {}) {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`/member/applications?${queryString}`);
  },

  async getSavedJobs(params: any = {}) {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`/member/saved-jobs?${queryString}`);
  },

  async getRecentJobs(limit: number = 5) {
    return apiRequest(`/member/recent-jobs?limit=${limit}`);
  },
};

/**
 * Profile API (alias for memberApi with additional features)
 */
export const profileApi = {
  async getProfile() {
    return apiRequest('/member/profile');
  },

  async updateProfile(data: any) {
    return apiRequest('/member/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async uploadAvatar(uri: string) {
    const token = await getAuthToken();
    const formData = new FormData();
    // @ts-ignore
    formData.append('avatar', {
      uri,
      type: 'image/jpeg',
      name: 'avatar.jpg',
    });

    const response = await fetch(`${API_BASE_URL}/member/avatar`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Failed to upload avatar');
    }

    return response.json();
  },
};

/**
 * Mentorship API
 */
export const mentorshipApi = {
  async getMentors(params: any = {}) {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`/mentorship/mentors?${queryString}`);
  },

  async getMatches() {
    return apiRequest('/mentorship/matches');
  },

  async requestMentor(mentorId: string, data: any) {
    return apiRequest('/mentorship/matches', {
      method: 'POST',
      body: JSON.stringify({ mentorId, ...data }),
    });
  },

  async getSessions() {
    return apiRequest('/mentorship/sessions');
  },
};

/**
 * Data Sovereignty API
 */
export const dataSovereigntyApi = {
  async getConsent() {
    return apiRequest('/member/consent');
  },

  async updateConsent(data: any) {
    return apiRequest('/member/consent', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async exportData() {
    return apiRequest('/member/export-data', {
      method: 'POST',
    });
  },
};

/**
 * Courses API
 */
export const coursesApi = {
  async getCourses(
    params: { page?: number; limit?: number; search?: string; category?: string } = {}
  ) {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.search) queryParams.append('search', params.search);
    if (params.category) queryParams.append('category', params.category);

    return apiRequest(`/courses?${queryParams.toString()}`);
  },

  async getCourse(id: string) {
    return apiRequest(`/courses/${id}`);
  },

  async enroll(id: string) {
    return apiRequest(`/courses/${id}/enroll`, {
      method: 'POST',
    });
  },

  async unenroll(id: string) {
    return apiRequest(`/courses/${id}/enroll`, {
      method: 'DELETE',
    });
  },

  async saveCourse(id: string) {
    return apiRequest(`/courses/${id}/save`, {
      method: 'POST',
    });
  },

  async unsaveCourse(id: string) {
    return apiRequest(`/courses/${id}/save`, {
      method: 'DELETE',
    });
  },
};

/**
 * Forums API
 */
export const forumsApi = {
  async getCategories() {
    return apiRequest('/forums/categories');
  },

  async getRecentThreads(params: { limit?: number } = {}) {
    const queryParams = new URLSearchParams();
    if (params.limit) queryParams.append('limit', params.limit.toString());
    return apiRequest(`/forums/threads/recent?${queryParams.toString()}`);
  },

  async getThread(id: string) {
    return apiRequest(`/forums/threads/${id}`);
  },

  async createThread(data: any) {
    return apiRequest('/forums/threads', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

/**
 * Mentor API
 */
export const mentorApi = {
  async findMentors(params: { search?: string; industry?: string; country?: string } = {}) {
    const queryParams = new URLSearchParams();
    if (params.search) queryParams.append('search', params.search);
    if (params.industry) queryParams.append('industry', params.industry);
    if (params.country) queryParams.append('country', params.country);

    return apiRequest(`/mentorship/mentors?${queryParams.toString()}`);
  },

  async getMentor(id: string) {
    return apiRequest(`/mentorship/mentors/${id}`);
  },

  async getMyMentors() {
    return apiRequest('/mentorship/my-mentors');
  },

  async getSessions() {
    return apiRequest('/mentorship/sessions');
  },

  async requestMentor(mentorId: string) {
    return apiRequest('/mentorship/requests', {
      method: 'POST',
      body: JSON.stringify({ mentorId }),
    });
  },

  async getAvailability(mentorId: string, date: string) {
    return apiRequest(`/mentorship/mentors/${mentorId}/availability?date=${date}`);
  },

  async bookSession(data: any) {
    return apiRequest('/mentorship/sessions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

/**
 * Cultural Events API
 */
export const culturalEventsApi = {
  async getEvents(params: { year?: number; upcoming?: boolean } = {}) {
    const queryParams = new URLSearchParams();
    if (params.year) queryParams.append('year', params.year.toString());
    if (params.upcoming) queryParams.append('upcoming', params.upcoming.toString());

    return apiRequest(`/cultural-events?${queryParams.toString()}`);
  },

  async getSignificantDates(params: { year?: number } = {}) {
    const queryParams = new URLSearchParams();
    if (params.year) queryParams.append('year', params.year.toString());

    return apiRequest(`/cultural-events/significant-dates?${queryParams.toString()}`);
  },
};

/**
 * Resources API
 */
export const resourcesApi = {
  async getResources(params: { category?: string; search?: string } = {}) {
    const queryParams = new URLSearchParams();
    if (params.category) queryParams.append('category', params.category);
    if (params.search) queryParams.append('search', params.search);

    return apiRequest(`/resources?${queryParams.toString()}`);
  },

  async getResource(id: string) {
    return apiRequest(`/resources/${id}`);
  },

  async getBookmarks() {
    return apiRequest('/resources/bookmarks');
  },

  async toggleBookmark(id: string) {
    return apiRequest(`/resources/${id}/bookmark`, {
      method: 'POST',
    });
  },
};

/**
 * Wellness API
 */
export const wellnessApi = {
  async getCheckIns() {
    return apiRequest('/wellness/check-ins');
  },

  async submitCheckIn(mood: number) {
    return apiRequest('/wellness/check-ins', {
      method: 'POST',
      body: JSON.stringify({ mood }),
    });
  },
};

/**
 * Security API - STUBBED
 */
export const securityApi = {
  async get2FAStatus() {
    return { enabled: false };
  },

  async enable2FA() {
    return { success: false, error: 'Feature disabled' };
  },

  async verify2FA(code: string) {
    return { valid: true };
  },

  async disable2FA(code: string) {
    return { success: true };
  },

  async getBackupCodes() {
    return ['123456', '789012'];
  },

  async getSessions() {
    return [];
  },

  async terminateSession(sessionId: string) {
    return apiRequest(`/auth/sessions/${sessionId}`, {
      method: 'DELETE',
    });
  },

  async terminateAllSessions() {
    return apiRequest('/auth/sessions', {
      method: 'DELETE',
    });
  },
};

/**
 * Notification Preferences API
 */
export const notificationPreferencesApi = {
  async getPreferences() {
    return apiRequest('/notification-preferences');
  },

  async updatePreference(categoryId: string, channelId: string, enabled: boolean) {
    return apiRequest('/notification-preferences', {
      method: 'PUT',
      body: JSON.stringify({ categoryId, channelId, enabled }),
    });
  },
};

/**
 * Video Resume API
 */
export const videoResumeApi = {
  async getVideo() {
    return apiRequest('/video-resume');
  },

  async getUploadUrl(filename: string, contentType: string) {
    return apiRequest('/video-resume/upload-url', {
      method: 'POST',
      body: JSON.stringify({ filename, contentType }),
    });
  },

  async confirmUpload(uploadId: string) {
    return apiRequest('/video-resume/confirm-upload', {
      method: 'POST',
      body: JSON.stringify({ uploadId }),
    });
  },

  async deleteVideo() {
    return apiRequest('/video-resume', {
      method: 'DELETE',
    });
  },
};

/**
 * Onboarding API
 */
export const onboardingApi = {
  async getStatus() {
    return apiRequest('/v1/me/purpose');
  },

  async savePurpose(data: { primary: string; secondary?: string }) {
    return apiRequest('/v1/onboarding/purpose', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getPurposeOptions() {
    return apiRequest('/v1/onboarding/purpose-options');
  },

  async start(role: string) {
    return { steps: [] };
  },

  async completeStep(stepId: string, data: any) {
    return { success: true };
  },

  async skipStep(stepId: string) {
    return { success: true };
  },

  async skipAll() {
    return { success: true };
  },
};

/**
 * User Analytics API
 */
export const userAnalyticsApi = {
  async getOverview(timeframe: string = '30d') {
    return apiRequest(`/user-analytics/overview?timeframe=${timeframe}`);
  },

  async getActivity(params: { limit?: number; offset?: number } = {}) {
    const queryParams = new URLSearchParams();
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.offset) queryParams.append('offset', params.offset.toString());
    
    return apiRequest(`/user-analytics/activity?${queryParams.toString()}`);
  },

  async getProgress() {
    return apiRequest('/user-analytics/progress');
  },

  async logActivity(data: { activityType: string; metadata?: any; duration?: number }) {
    return apiRequest('/user-analytics/activity', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getEngagement(timeframe: string = '30d') {
    return apiRequest(`/user-analytics/engagement?timeframe=${timeframe}`);
  },
};

/**
 * Messages API
 */
export const messagesApi = {
  async getConversations() {
    return apiRequest('/messages/conversations');
  },

  async getMessages(conversationId: string, params: { limit?: number; before?: string } = {}) {
    const queryParams = new URLSearchParams();
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.before) queryParams.append('before', params.before);

    return apiRequest(
      `/messages/conversations/${conversationId}/messages?${queryParams.toString()}`
    );
  },

  async sendMessage(conversationId: string, content: string) {
    return apiRequest(`/messages/conversations/${conversationId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
  },

  async createConversation(participantId: string) {
    return apiRequest('/messages/conversations', {
      method: 'POST',
      body: JSON.stringify({ participantId }),
    });
  },

  async markAsRead(conversationId: string) {
    return apiRequest(`/messages/conversations/${conversationId}/read`, {
      method: 'POST',
    });
  },
};

/**
 * Notifications API
 */
export const notificationsApi = {
  async getNotifications() {
    return apiRequest('/notifications');
  },

  async markAsRead(id: string) {
    return apiRequest(`/notifications/${id}/read`, {
      method: 'POST',
    });
  },

  async markAllAsRead() {
    return apiRequest('/notifications/read-all', {
      method: 'POST',
    });
  },

  async deleteNotification(id: string) {
    return apiRequest(`/notifications/${id}`, {
      method: 'DELETE',
    });
  },
};

/**
 * Social Feed API
 */
export const feedApi = {
  async getFeed(params: { page?: number; limit?: number; filter?: string } = {}) {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.filter) queryParams.append('filter', params.filter);

    return apiRequest(`/social-feed?${queryParams.toString()}`);
  },

  async getPost(postId: string) {
    return apiRequest(`/social-feed/posts/${postId}`);
  },

  async createPost(data: { content: string; mediaUrls?: string[]; visibility?: string }) {
    return apiRequest('/social-feed/posts', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updatePost(postId: string, data: { content?: string; visibility?: string }) {
    return apiRequest(`/social-feed/posts/${postId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deletePost(postId: string) {
    return apiRequest(`/social-feed/posts/${postId}`, {
      method: 'DELETE',
    });
  },

  async reactToPost(postId: string, reactionType: string) {
    return apiRequest(`/social-feed/posts/${postId}/reactions`, {
      method: 'POST',
      body: JSON.stringify({ type: reactionType }),
    });
  },

  async removeReaction(postId: string) {
    return apiRequest(`/social-feed/posts/${postId}/reactions`, {
      method: 'DELETE',
    });
  },

  async sharePost(postId: string) {
    return apiRequest(`/social-feed/posts/${postId}/share`, {
      method: 'POST',
    });
  },

  async getComments(postId: string, params: { page?: number; limit?: number } = {}) {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());

    return apiRequest(`/social-feed/posts/${postId}/comments?${queryParams.toString()}`);
  },

  async addComment(postId: string, content: string) {
    return apiRequest(`/social-feed/posts/${postId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
  },

  async deleteComment(postId: string, commentId: string) {
    return apiRequest(`/social-feed/posts/${postId}/comments/${commentId}`, {
      method: 'DELETE',
    });
  },

  async reportPost(postId: string, reason: string) {
    return apiRequest(`/social-feed/posts/${postId}/report`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  },
};

/**
 * Connections API
 */
export const connectionsApi = {
  async getConnections(params: { status?: string; page?: number; limit?: number } = {}) {
    const queryParams = new URLSearchParams();
    if (params.status) queryParams.append('status', params.status);
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());

    return apiRequest(`/connections?${queryParams.toString()}`);
  },

  async getPendingRequests() {
    return apiRequest('/connections/requests');
  },

  async sendRequest(addresseeId: string, message?: string) {
    return apiRequest('/connections/request', {
      method: 'POST',
      body: JSON.stringify({ addresseeId, message }),
    });
  },

  async acceptRequest(connectionId: string) {
    return apiRequest(`/connections/${connectionId}/accept`, {
      method: 'PUT',
    });
  },

  async rejectRequest(connectionId: string) {
    return apiRequest(`/connections/${connectionId}/reject`, {
      method: 'PUT',
    });
  },

  async cancelRequest(connectionId: string) {
    return apiRequest(`/connections/${connectionId}`, {
      method: 'DELETE',
    });
  },

  async removeConnection(connectionId: string) {
    return apiRequest(`/connections/${connectionId}`, {
      method: 'DELETE',
    });
  },

  async getFollowers(params: { page?: number; limit?: number } = {}) {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());

    return apiRequest(`/connections/followers?${queryParams.toString()}`);
  },

  async getFollowing(params: { page?: number; limit?: number } = {}) {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());

    return apiRequest(`/connections/following?${queryParams.toString()}`);
  },

  async followUser(userId: string) {
    return apiRequest('/connections/follow', {
      method: 'POST',
      body: JSON.stringify({ userId }),
    });
  },

  async unfollowUser(userId: string) {
    return apiRequest(`/connections/unfollow/${userId}`, {
      method: 'DELETE',
    });
  },

  async getMutualConnections(userId: string) {
    return apiRequest(`/connections/mutual/${userId}`);
  },

  async searchConnections(query: string) {
    return apiRequest(`/connections/search?q=${encodeURIComponent(query)}`);
  },
};

/**
 * Groups API
 */
export const groupsApi = {
  async getGroups(
    params: {
      type?: string;
      search?: string;
      womenOnly?: boolean;
      featured?: boolean;
      page?: number;
      limit?: number;
    } = {}
  ) {
    const queryParams = new URLSearchParams();
    if (params.type) queryParams.append('type', params.type);
    if (params.search) queryParams.append('search', params.search);
    if (params.womenOnly) queryParams.append('womenOnly', 'true');
    if (params.featured) queryParams.append('featured', 'true');
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());

    return apiRequest(`/groups?${queryParams.toString()}`);
  },

  async getMyGroups(params: { type?: string; page?: number; limit?: number } = {}) {
    const queryParams = new URLSearchParams();
    if (params.type) queryParams.append('type', params.type);
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());

    return apiRequest(`/groups/my-groups?${queryParams.toString()}`);
  },

  async getGroup(idOrSlug: string) {
    return apiRequest(`/groups/${idOrSlug}`);
  },

  async createGroup(data: {
    name: string;
    description?: string;
    groupType: string;
    visibility?: string;
    membershipType?: string;
    womenOnly?: boolean;
    safetyMode?: boolean;
  }) {
    return apiRequest('/groups', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateGroup(groupId: string, data: any) {
    return apiRequest(`/groups/${groupId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteGroup(groupId: string) {
    return apiRequest(`/groups/${groupId}`, {
      method: 'DELETE',
    });
  },

  async joinGroup(groupId: string) {
    return apiRequest(`/groups/${groupId}/join`, {
      method: 'POST',
    });
  },

  async leaveGroup(groupId: string) {
    return apiRequest(`/groups/${groupId}/leave`, {
      method: 'POST',
    });
  },

  async getMembers(groupId: string, params: { page?: number; limit?: number } = {}) {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());

    return apiRequest(`/groups/${groupId}/members?${queryParams.toString()}`);
  },

  async getPosts(groupId: string, params: { page?: number; limit?: number } = {}) {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());

    return apiRequest(`/groups/${groupId}/posts?${queryParams.toString()}`);
  },

  async createPost(groupId: string, data: { content: string; mediaUrls?: string[] }) {
    return apiRequest(`/groups/${groupId}/posts`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getEvents(groupId: string) {
    return apiRequest(`/groups/${groupId}/events`);
  },

  async inviteMembers(groupId: string, userIds: string[]) {
    return apiRequest(`/groups/${groupId}/invite`, {
      method: 'POST',
      body: JSON.stringify({ userIds }),
    });
  },

  async approveMember(groupId: string, userId: string) {
    return apiRequest(`/groups/${groupId}/members/${userId}/approve`, {
      method: 'PUT',
    });
  },

  async removeMember(groupId: string, userId: string) {
    return apiRequest(`/groups/${groupId}/members/${userId}`, {
      method: 'DELETE',
    });
  },
};

/**
 * Stories API - Success Stories
 */
export const storiesApi = {
  async getStories(
    params: {
      page?: number;
      limit?: number;
      category?: string;
      search?: string;
      featured?: boolean;
      saved?: boolean;
      trending?: boolean;
      userId?: string;
    } = {}
  ) {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.category) queryParams.append('category', params.category);
    if (params.search) queryParams.append('search', params.search);
    if (params.featured) queryParams.append('featured', 'true');
    if (params.saved) queryParams.append('saved', 'true');
    if (params.trending) queryParams.append('trending', 'true');
    if (params.userId) queryParams.append('userId', params.userId);

    return apiRequest(`/stories?${queryParams.toString()}`);
  },

  async getStory(id: string) {
    return apiRequest(`/stories/${id}`);
  },

  async createStory(data: {
    title: string;
    content: string;
    story?: string;
    outcome?: string;
    company?: string;
    role?: string;
    imageUrl?: string;
    isAnonymous?: boolean;
    consentGiven: boolean;
  }) {
    return apiRequest('/stories', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateStory(storyId: string, data: any) {
    return apiRequest(`/stories/${storyId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteStory(storyId: string) {
    return apiRequest(`/stories/${storyId}`, {
      method: 'DELETE',
    });
  },

  async likeStory(storyId: string) {
    return apiRequest(`/stories/${storyId}/like`, {
      method: 'POST',
    });
  },

  async unlikeStory(storyId: string) {
    return apiRequest(`/stories/${storyId}/like`, {
      method: 'DELETE',
    });
  },

  async saveStory(storyId: string) {
    return apiRequest(`/stories/${storyId}/save`, {
      method: 'POST',
    });
  },

  async unsaveStory(storyId: string) {
    return apiRequest(`/stories/${storyId}/save`, {
      method: 'DELETE',
    });
  },

  async shareStory(storyId: string) {
    return apiRequest(`/stories/${storyId}/share`, {
      method: 'POST',
    });
  },

  async getComments(storyId: string, params: { page?: number; limit?: number } = {}) {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());

    return apiRequest(`/stories/${storyId}/comments?${queryParams.toString()}`);
  },

  async addComment(storyId: string, content: string) {
    return apiRequest(`/stories/${storyId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
  },

  async deleteComment(storyId: string, commentId: string) {
    return apiRequest(`/stories/${storyId}/comments/${commentId}`, {
      method: 'DELETE',
    });
  },

  async getMyStories() {
    return apiRequest('/stories/user/me');
  },

  async getCategories() {
    return apiRequest('/stories/categories');
  },
};

/**
 * Search API - Global Search
 */
export const searchApi = {
  async search(params: {
    q: string;
    type?: 'all' | 'jobs' | 'mentors' | 'courses' | 'users' | 'groups' | 'stories';
    page?: number;
    limit?: number;
    filters?: Record<string, any>;
  }) {
    const queryParams = new URLSearchParams();
    queryParams.append('q', params.q);
    if (params.type) queryParams.append('type', params.type);
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.filters) {
      Object.entries(params.filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, String(value));
        }
      });
    }

    return apiRequest(`/search?${queryParams.toString()}`);
  },

  async searchJobs(
    params: {
      q?: string;
      location?: string;
      type?: string;
      salary?: string;
      remote?: boolean;
      page?: number;
      limit?: number;
    } = {}
  ) {
    const queryParams = new URLSearchParams();
    if (params.q) queryParams.append('q', params.q);
    if (params.location) queryParams.append('location', params.location);
    if (params.type) queryParams.append('type', params.type);
    if (params.salary) queryParams.append('salary', params.salary);
    if (params.remote) queryParams.append('remote', 'true');
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());

    return apiRequest(`/search/jobs?${queryParams.toString()}`);
  },

  async searchMentors(
    params: {
      q?: string;
      industry?: string;
      skills?: string[];
      page?: number;
      limit?: number;
    } = {}
  ) {
    const queryParams = new URLSearchParams();
    if (params.q) queryParams.append('q', params.q);
    if (params.industry) queryParams.append('industry', params.industry);
    if (params.skills) params.skills.forEach((s) => queryParams.append('skills', s));
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());

    return apiRequest(`/search/mentors?${queryParams.toString()}`);
  },

  async searchCourses(
    params: {
      q?: string;
      category?: string;
      level?: string;
      page?: number;
      limit?: number;
    } = {}
  ) {
    const queryParams = new URLSearchParams();
    if (params.q) queryParams.append('q', params.q);
    if (params.category) queryParams.append('category', params.category);
    if (params.level) queryParams.append('level', params.level);
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());

    return apiRequest(`/search/courses?${queryParams.toString()}`);
  },

  async getSearchHistory() {
    return apiRequest('/search/history');
  },

  async clearSearchHistory() {
    return apiRequest('/search/history', {
      method: 'DELETE',
    });
  },

  async getSavedSearches() {
    return apiRequest('/saved-searches');
  },

  async saveSearch(data: { name: string; query: string; filters?: any }) {
    return apiRequest('/saved-searches', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async deleteSavedSearch(id: string) {
    return apiRequest(`/saved-searches/${id}`, {
      method: 'DELETE',
    });
  },

  async getSearchSuggestions(query: string) {
    return apiRequest(`/search/suggestions?q=${encodeURIComponent(query)}`);
  },

  async getTrendingSearches() {
    return apiRequest('/search/trending');
  },
};

/**
 * Bookmarks/Collections API
 */
export const bookmarksApi = {
  async getCollections() {
    return apiRequest('/bookmarks/collections');
  },

  async getCollection(collectionId: string) {
    return apiRequest(`/bookmarks/collections/${collectionId}`);
  },

  async createCollection(data: { name: string; description?: string; isPublic?: boolean }) {
    return apiRequest('/bookmarks/collections', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateCollection(collectionId: string, data: any) {
    return apiRequest(`/bookmarks/collections/${collectionId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteCollection(collectionId: string) {
    return apiRequest(`/bookmarks/collections/${collectionId}`, {
      method: 'DELETE',
    });
  },

  async getBookmarks(
    params: {
      collectionId?: string;
      type?: string;
      page?: number;
      limit?: number;
    } = {}
  ) {
    const queryParams = new URLSearchParams();
    if (params.collectionId) queryParams.append('collectionId', params.collectionId);
    if (params.type) queryParams.append('type', params.type);
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());

    return apiRequest(`/bookmarks?${queryParams.toString()}`);
  },

  async addBookmark(data: {
    itemId: string;
    itemType: 'job' | 'course' | 'story' | 'post' | 'resource';
    collectionId?: string;
    note?: string;
  }) {
    return apiRequest('/bookmarks', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async removeBookmark(bookmarkId: string) {
    return apiRequest(`/bookmarks/${bookmarkId}`, {
      method: 'DELETE',
    });
  },

  async moveBookmark(bookmarkId: string, collectionId: string) {
    return apiRequest(`/bookmarks/${bookmarkId}/move`, {
      method: 'PUT',
      body: JSON.stringify({ collectionId }),
    });
  },

  async addNote(bookmarkId: string, note: string) {
    return apiRequest(`/bookmarks/${bookmarkId}/note`, {
      method: 'PUT',
      body: JSON.stringify({ note }),
    });
  },
};

/**
 * Achievements/Badges API
 */
export const achievementsApi = {
  async getAchievements() {
    return apiRequest('/badges');
  },

  async getUserAchievements(userId?: string) {
    const endpoint = userId ? `/badges/user/${userId}` : '/badges/user/me';
    return apiRequest(endpoint);
  },

  async getAvailableAchievements() {
    return apiRequest('/badges/available');
  },

  async getAchievementProgress() {
    return apiRequest('/badges/progress');
  },

  async claimAchievement(achievementId: string) {
    return apiRequest(`/badges/${achievementId}/claim`, {
      method: 'POST',
    });
  },

  async getLeaderboard(params: { type?: string; period?: string; limit?: number } = {}) {
    const queryParams = new URLSearchParams();
    if (params.type) queryParams.append('type', params.type);
    if (params.period) queryParams.append('period', params.period);
    if (params.limit) queryParams.append('limit', params.limit.toString());

    return apiRequest(`/leaderboard?${queryParams.toString()}`);
  },
};

/**
 * Referral API
 */
export const referralApi = {
  async getReferralInfo() {
    return apiRequest('/referrals');
  },

  async getReferralCode() {
    return apiRequest('/referrals/code');
  },

  async generateReferralLink(campaign?: string) {
    return apiRequest('/referrals/link', {
      method: 'POST',
      body: JSON.stringify({ campaign }),
    });
  },

  async getReferrals(params: { status?: string; page?: number; limit?: number } = {}) {
    const queryParams = new URLSearchParams();
    if (params.status) queryParams.append('status', params.status);
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());

    return apiRequest(`/referrals/list?${queryParams.toString()}`);
  },

  async getReferralStats() {
    return apiRequest('/referrals/stats');
  },

  async getRewards() {
    return apiRequest('/referrals/rewards');
  },

  async claimReward(rewardId: string) {
    return apiRequest(`/referrals/rewards/${rewardId}/claim`, {
      method: 'POST',
    });
  },

  async applyReferralCode(code: string) {
    return apiRequest('/referrals/apply', {
      method: 'POST',
      body: JSON.stringify({ code }),
    });
  },
};

/**
 * Course Progress API
 */
export const courseProgressApi = {
  async getEnrolledCourses() {
    return apiRequest('/courses/enrolled');
  },

  async getCourseProgress(courseId: string) {
    return apiRequest(`/courses/${courseId}/progress`);
  },

  async updateLessonProgress(
    courseId: string,
    lessonId: string,
    data: {
      completed?: boolean;
      progress?: number;
      timeSpent?: number;
    }
  ) {
    return apiRequest(`/courses/${courseId}/lessons/${lessonId}/progress`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async markLessonComplete(courseId: string, lessonId: string) {
    return apiRequest(`/courses/${courseId}/lessons/${lessonId}/complete`, {
      method: 'POST',
    });
  },

  async getCertificate(courseId: string) {
    return apiRequest(`/courses/${courseId}/certificate`);
  },

  async downloadCertificate(courseId: string) {
    return apiRequest(`/courses/${courseId}/certificate/download`);
  },

  async getQuizResults(courseId: string, quizId: string) {
    return apiRequest(`/courses/${courseId}/quizzes/${quizId}/results`);
  },

  async submitQuiz(courseId: string, quizId: string, answers: Record<string, any>) {
    return apiRequest(`/courses/${courseId}/quizzes/${quizId}/submit`, {
      method: 'POST',
      body: JSON.stringify({ answers }),
    });
  },

  async getCourseNotes(courseId: string) {
    return apiRequest(`/courses/${courseId}/notes`);
  },

  async saveCourseNote(
    courseId: string,
    data: {
      lessonId?: string;
      content: string;
      timestamp?: number;
    }
  ) {
    return apiRequest(`/courses/${courseId}/notes`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

/**
 * Mentor Circles API
 */
export const mentorCirclesApi = {
  async getCircles(
    params: {
      search?: string;
      category?: string;
      page?: number;
      limit?: number;
    } = {}
  ) {
    const queryParams = new URLSearchParams();
    if (params.search) queryParams.append('search', params.search);
    if (params.category) queryParams.append('category', params.category);
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());

    return apiRequest(`/mentor-circles?${queryParams.toString()}`);
  },

  async getMyCircles() {
    return apiRequest('/mentor-circles/my-circles');
  },

  async getCircle(circleId: string) {
    return apiRequest(`/mentor-circles/${circleId}`);
  },

  async joinCircle(circleId: string) {
    return apiRequest(`/mentor-circles/${circleId}/join`, {
      method: 'POST',
    });
  },
  async leaveCircle(circleId: string) {
    return apiRequest(`/mentor-circles/${circleId}/leave`, {
      method: 'POST',
    });
  },

  async getCircleResources(circleId: string) {
    return apiRequest(`/mentor-circles/${circleId}/resources`);
  },

  async getCircleDiscussions(circleId: string, params: { page?: number; limit?: number } = {}) {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());

    return apiRequest(`/mentor-circles/${circleId}/discussions?${queryParams.toString()}`);
  },

  async createDiscussion(circleId: string, data: { title: string; content: string }) {
    return apiRequest(`/mentor-circles/${circleId}/discussions`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getCircleMembers(circleId: string) {
    return apiRequest(`/mentor-circles/${circleId}/members`);
  },

  async getCircleEvents(circleId: string) {
    return apiRequest(`/mentor-circles/${circleId}/events`);
  },
};

// Mentorship community extras
export const mentorshipCommunityApi = {
  async rsvpGroup(groupId: string) {
    return apiRequest(`/mentorship/groups/${groupId}/rsvp`, { method: 'POST' });
  },
  async cancelRsvp(groupId: string) {
    return apiRequest(`/mentorship/groups/${groupId}/rsvp/cancel`, { method: 'POST' });
  },
  async requestReverseMentor(matchId: string) {
    return apiRequest('/mentorship/reverse/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ matchId }),
    });
  },
};

/**
 * Feature Flags API
 */
export const featureFlagsApi = {
  async getFlags() {
    return apiRequest('/feature-flags');
  },

  async getFlag(flagKey: string) {
    return apiRequest(`/feature-flags/${flagKey}`);
  },

  async isFeatureEnabled(flagKey: string) {
    try {
      const result = await apiRequest(`/feature-flags/${flagKey}`);
      return result.enabled === true;
    } catch {
      return false;
    }
  },
};
