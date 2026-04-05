/**
 * Phase F API Client
 * 
 * Client functions for Phase F features:
 * - Video Resume
 * - Skills Verification
 * - Career Portfolio
 * - Salary Benchmark
 * - Career Progression
 * - Onboarding
 */

import { API_BASE } from './apiBase';

const API_URL = API_BASE;

// Helper for authenticated requests
async function fetchWithAuth(endpoint, options = {}, token) {
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers
  };

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || 'Request failed');
  }

  return response.json();
}

// ============================================================================
// VIDEO RESUME API
// ============================================================================

export const videoResume = {
  /**
   * Get user's video resume
   */
  get: (token) =>
    fetchWithAuth('/video-resume', { method: 'GET' }, token),

  /**
   * Get upload URL for video
   */
  getUploadUrl: (token, filename, contentType, fileSize) =>
    fetchWithAuth('/video-resume/upload-url', {
      method: 'POST',
      body: JSON.stringify({ filename, contentType, fileSize })
    }, token),

  /**
   * Confirm video upload
   */
  confirmUpload: (token, uploadId, metadata) =>
    fetchWithAuth('/video-resume/confirm-upload', {
      method: 'POST',
      body: JSON.stringify({ uploadId, metadata })
    }, token),

  /**
   * Update video privacy settings
   */
  updatePrivacy: (token, privacy) =>
    fetchWithAuth('/video-resume/privacy', {
      method: 'PATCH',
      body: JSON.stringify({ privacy })
    }, token),

  /**
   * Share video with employer
   */
  share: (token, employerId, options) =>
    fetchWithAuth('/video-resume/share', {
      method: 'POST',
      body: JSON.stringify({ employerId, options })
    }, token),

  /**
   * Get video analytics
   */
  getAnalytics: (token) =>
    fetchWithAuth('/video-resume/analytics', { method: 'GET' }, token),

  /**
   * Delete video resume
   */
  delete: (token) =>
    fetchWithAuth('/video-resume', { method: 'DELETE' }, token)
};

// ============================================================================
// SKILLS VERIFICATION API
// ============================================================================

export const skillsVerification = {
  /**
   * Get user's badges
   */
  getBadges: (token) =>
    fetchWithAuth('/skills-verification/badges', { method: 'GET' }, token),

  /**
   * Get available assessments
   */
  getAssessments: (token, skillCategory) => {
    const params = skillCategory ? `?category=${skillCategory}` : '';
    return fetchWithAuth(`/skills-verification/assessments${params}`, { method: 'GET' }, token);
  },

  /**
   * Start an assessment
   */
  startAssessment: (token, assessmentId) =>
    fetchWithAuth(`/skills-verification/assessments/${assessmentId}/start`, {
      method: 'POST'
    }, token),

  /**
   * Submit assessment answers
   */
  submitAssessment: (token, assessmentId, answers) =>
    fetchWithAuth(`/skills-verification/assessments/${assessmentId}/submit`, {
      method: 'POST',
      body: JSON.stringify({ answers })
    }, token),

  /**
   * Request endorsement from peer
   */
  requestEndorsement: (token, skillId, endorserId, message) =>
    fetchWithAuth('/skills-verification/endorsements/request', {
      method: 'POST',
      body: JSON.stringify({ skillId, endorserId, message })
    }, token),

  /**
   * Verify external credential (Open Badges)
   */
  verifyCredential: (token, credentialUrl) =>
    fetchWithAuth('/skills-verification/credentials/verify', {
      method: 'POST',
      body: JSON.stringify({ credentialUrl })
    }, token),

  /**
   * Get verified credentials
   */
  getCredentials: (token) =>
    fetchWithAuth('/skills-verification/credentials', { method: 'GET' }, token)
};

// ============================================================================
// CAREER PORTFOLIO API
// ============================================================================

export const careerPortfolio = {
  /**
   * Get portfolio
   */
  get: (token) =>
    fetchWithAuth('/career-portfolio', { method: 'GET' }, token),

  /**
   * Get portfolio templates
   */
  getTemplates: (token) =>
    fetchWithAuth('/career-portfolio/templates', { method: 'GET' }, token),

  /**
   * Select template
   */
  selectTemplate: (token, templateId) =>
    fetchWithAuth('/career-portfolio/template', {
      method: 'PUT',
      body: JSON.stringify({ templateId })
    }, token),

  /**
   * Get projects
   */
  getProjects: (token) =>
    fetchWithAuth('/career-portfolio/projects', { method: 'GET' }, token),

  /**
   * Add project
   */
  addProject: (token, project) =>
    fetchWithAuth('/career-portfolio/projects', {
      method: 'POST',
      body: JSON.stringify(project)
    }, token),

  /**
   * Update project
   */
  updateProject: (token, projectId, project) =>
    fetchWithAuth(`/career-portfolio/projects/${projectId}`, {
      method: 'PUT',
      body: JSON.stringify(project)
    }, token),

  /**
   * Delete project
   */
  deleteProject: (token, projectId) =>
    fetchWithAuth(`/career-portfolio/projects/${projectId}`, {
      method: 'DELETE'
    }, token),

  /**
   * Toggle project highlight
   */
  toggleHighlight: (token, projectId) =>
    fetchWithAuth(`/career-portfolio/projects/${projectId}/highlight`, {
      method: 'POST'
    }, token),

  /**
   * Update settings
   */
  updateSettings: (token, settings) =>
    fetchWithAuth('/career-portfolio/settings', {
      method: 'PUT',
      body: JSON.stringify(settings)
    }, token),

  /**
   * Get public portfolio by slug
   */
  getPublic: (slug) =>
    fetchWithAuth(`/career-portfolio/public/${slug}`, { method: 'GET' })
};

// ============================================================================
// SALARY BENCHMARK API
// ============================================================================

export const salaryBenchmark = {
  /**
   * Search salary data
   */
  search: (params, token) => {
    const queryString = new URLSearchParams(params).toString();
    return fetchWithAuth(`/salary-benchmark/search?${queryString}`, { method: 'GET' }, token);
  },

  /**
   * Get negotiation tips
   */
  getNegotiationTips: (token) =>
    fetchWithAuth('/salary-benchmark/negotiation-tips', { method: 'GET' }, token),

  /**
   * Export salary report
   */
  exportReport: (token, data) =>
    fetch(`${API_URL}/salary-benchmark/export`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify(data)
    }),

  /**
   * Get salary trends
   */
  getTrends: (token, jobTitle, location) =>
    fetchWithAuth(`/salary-benchmark/trends?jobTitle=${encodeURIComponent(jobTitle)}&location=${location}`, { method: 'GET' }, token)
};

// ============================================================================
// CAREER PROGRESSION API
// ============================================================================

export const careerProgression = {
  /**
   * Get career timeline
   */
  getTimeline: (token) =>
    fetchWithAuth('/career-progression/timeline', { method: 'GET' }, token),

  /**
   * Add milestone
   */
  addMilestone: (token, milestone) =>
    fetchWithAuth('/career-progression/milestones', {
      method: 'POST',
      body: JSON.stringify(milestone)
    }, token),

  /**
   * Update milestone
   */
  updateMilestone: (token, milestoneId, milestone) =>
    fetchWithAuth(`/career-progression/milestones/${milestoneId}`, {
      method: 'PUT',
      body: JSON.stringify(milestone)
    }, token),

  /**
   * Delete milestone
   */
  deleteMilestone: (token, milestoneId) =>
    fetchWithAuth(`/career-progression/milestones/${milestoneId}`, {
      method: 'DELETE'
    }, token),

  /**
   * Get goals
   */
  getGoals: (token) =>
    fetchWithAuth('/career-progression/goals', { method: 'GET' }, token),

  /**
   * Create goal
   */
  createGoal: (token, goal) =>
    fetchWithAuth('/career-progression/goals', {
      method: 'POST',
      body: JSON.stringify(goal)
    }, token),

  /**
   * Update goal
   */
  updateGoal: (token, goalId, goal) =>
    fetchWithAuth(`/career-progression/goals/${goalId}`, {
      method: 'PUT',
      body: JSON.stringify(goal)
    }, token),

  /**
   * Delete goal
   */
  deleteGoal: (token, goalId) =>
    fetchWithAuth(`/career-progression/goals/${goalId}`, {
      method: 'DELETE'
    }, token),

  /**
   * Get career path suggestions
   */
  getSuggestions: (token) =>
    fetchWithAuth('/career-progression/suggestions', { method: 'GET' }, token)
};

// ============================================================================
// ONBOARDING API
// ============================================================================

export const onboarding = {
  /**
   * Get onboarding status
   */
  getStatus: (token) =>
    fetchWithAuth('/onboarding/status', { method: 'GET' }, token),

  /**
   * Start onboarding flow
   */
  start: (token, role) =>
    fetchWithAuth('/onboarding/start', {
      method: 'POST',
      body: JSON.stringify({ role })
    }, token),

  /**
   * Complete step
   */
  completeStep: (token, stepId, data) =>
    fetchWithAuth(`/onboarding/steps/${stepId}/complete`, {
      method: 'POST',
      body: JSON.stringify(data)
    }, token),

  /**
   * Skip step
   */
  skipStep: (token, stepId) =>
    fetchWithAuth(`/onboarding/steps/${stepId}/skip`, {
      method: 'POST'
    }, token),

  /**
   * Skip all onboarding
   */
  skipAll: (token) =>
    fetchWithAuth('/onboarding/skip', {
      method: 'POST'
    }, token),

  /**
   * Resume onboarding
   */
  resume: (token) =>
    fetchWithAuth('/onboarding/resume', { method: 'GET' }, token)
};

// ============================================================================
// APPRENTICESHIP API
// ============================================================================

export const apprenticeship = {
  /**
   * Get trades list
   */
  getTrades: (token) =>
    fetchWithAuth('/apprenticeship/trades', { method: 'GET' }, token),

  /**
   * Get training plans
   */
  getTrainingPlans: (token, tradeId) =>
    fetchWithAuth(`/apprenticeship/training-plans?tradeId=${tradeId}`, { method: 'GET' }, token),

  /**
   * Get user's apprenticeship
   */
  get: (token) =>
    fetchWithAuth('/apprenticeship', { method: 'GET' }, token),

  /**
   * Update training progress
   */
  updateProgress: (token, moduleId, progress) =>
    fetchWithAuth(`/apprenticeship/modules/${moduleId}/progress`, {
      method: 'PUT',
      body: JSON.stringify(progress)
    }, token),

  /**
   * Get mentors
   */
  getMentors: (token, tradeId) =>
    fetchWithAuth(`/apprenticeship/mentors?tradeId=${tradeId}`, { method: 'GET' }, token)
};

// ============================================================================
// EMPLOYER VERIFICATION API
// ============================================================================

export const employerVerification = {
  /**
   * Verify ABN
   */
  verifyABN: (token, abn) =>
    fetchWithAuth('/employer-verification/abn/verify', {
      method: 'POST',
      body: JSON.stringify({ abn })
    }, token),

  /**
   * Get verification status
   */
  getStatus: (token) =>
    fetchWithAuth('/employer-verification/status', { method: 'GET' }, token),

  /**
   * Submit verification documents
   */
  submitDocuments: (token, documents) =>
    fetchWithAuth('/employer-verification/documents', {
      method: 'POST',
      body: JSON.stringify(documents)
    }, token),

  /**
   * Get RAP status
   */
  getRAPStatus: (token) =>
    fetchWithAuth('/employer-verification/rap', { method: 'GET' }, token)
};

// Default export with all modules
const phaseFModules = {
  videoResume,
  skillsVerification,
  careerPortfolio,
  salaryBenchmark,
  careerProgression,
  onboarding,
  apprenticeship,
  employerVerification
};

export default phaseFModules;
