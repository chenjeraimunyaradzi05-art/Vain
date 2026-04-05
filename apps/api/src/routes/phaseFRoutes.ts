// @ts-nocheck
/**
 * Phase F API Routes: Enhanced User Features (Steps 51-60)
 * 
 * Routes for:
 * - Video Resume
 * - Skills Verification
 * - Career Portfolio
 * - Salary Benchmarking
 * - Career Progression
 * - Apprenticeship
 * - Employer Verification
 * - Onboarding
 */

import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import * as videoResume from '../lib/videoResume';
import * as skillsVerification from '../lib/skillsVerification';
import * as careerPortfolio from '../lib/careerPortfolio';
import * as salaryBenchmark from '../lib/salaryBenchmark';
import * as careerProgression from '../lib/careerProgression';
import * as apprenticeship from '../lib/apprenticeship';
import * as employerVerification from '../lib/employerVerification';
import * as onboarding from '../lib/onboarding';

const router = Router();

// ============================================================================
// VIDEO RESUME ROUTES (Step 51)
// ============================================================================

// Get upload URL for video resume
router.post('/video-resume/upload-url', authenticate, async (req, res, next) => {
  try {
    const result = await videoResume.getVideoUploadUrl(
      req.user.id,
      {
        fileName: req.body.filename,
        contentType: req.body.contentType,
        fileSize: req.body.fileSize
      }
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Confirm video upload completed
router.post('/video-resume/confirm-upload', authenticate, async (req, res, next) => {
  try {
    const result = await videoResume.confirmVideoUpload(
      req.body.uploadId,
      req.user.id
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Get user's video resume
router.get('/video-resume', authenticate, async (req, res, next) => {
  try {
    const result = await videoResume.getVideoResume(req.user.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Update video privacy settings
router.patch('/video-resume/privacy', authenticate, async (req, res, next) => {
  try {
    const result = await videoResume.updateVideoPrivacy(
      req.body.videoId,
      req.user.id,
      req.body.privacy
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Share video with employer
router.post('/video-resume/share', authenticate, async (req, res, next) => {
  try {
    const result = await videoResume.shareVideo(
      req.user.id,
      req.body.employerId,
      req.body.options
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Get video analytics
router.get('/video-resume/analytics', authenticate, async (req, res, next) => {
  try {
    const result = await videoResume.getVideoAnalytics(req.query.videoId as string, req.user.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// SKILLS VERIFICATION ROUTES (Step 52)
// ============================================================================

// Get available assessments
router.get('/skills/assessments', authenticate, async (req, res, next) => {
  try {
    const result = await skillsVerification.getAvailableAssessments(req.query.category);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Start an assessment
router.post('/skills/assessments/:skillId/start', authenticate, async (req, res, next) => {
  try {
    const result = await skillsVerification.startAssessment(
      req.user.id,
      req.params.skillId
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Submit assessment answers
router.post('/skills/assessments/:assessmentId/submit', authenticate, async (req, res, next) => {
  try {
    const result = await skillsVerification.submitAssessment(
      req.user.id,
      req.params.assessmentId,
      req.body.responses
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Verify external credential (Open Badge)
router.post('/skills/verify-credential', authenticate, async (req, res, next) => {
  try {
    const result = await skillsVerification.verifyCredential(
      req.user.id,
      { url: req.body.credentialUrl, type: 'open_badge' }
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Request peer endorsement
router.post('/skills/endorsement/request', authenticate, async (req, res, next) => {
  try {
    const result = await skillsVerification.requestEndorsement(
      req.user.id,
      req.body.skillId,
      req.body.endorserEmail,
      req.body.relationship
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Submit endorsement (for endorsers)
router.post('/skills/endorsement/:requestId/submit', authenticate, async (req, res, next) => {
  try {
    const result = await skillsVerification.submitEndorsement(
      req.params.requestId,
      { ...req.body, endorserId: req.user.id }
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Get user's skill verifications
router.get('/skills/verifications', authenticate, async (req, res, next) => {
  try {
    const result = await skillsVerification.getSkillVerifications(req.user.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Get user's badges
router.get('/skills/badges', authenticate, async (req, res, next) => {
  try {
    const result = await skillsVerification.getUserBadges(req.user.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// CAREER PORTFOLIO ROUTES (Step 53)
// ============================================================================

// Get or create portfolio
router.get('/portfolio', authenticate, async (req, res, next) => {
  try {
    const result = await careerPortfolio.createOrUpdatePortfolio(req.user.id, {});
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Update portfolio
router.patch('/portfolio', authenticate, async (req, res, next) => {
  try {
    const result = await careerPortfolio.createOrUpdatePortfolio(req.user.id, req.body);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Add project to portfolio
router.post('/portfolio/projects', authenticate, async (req, res, next) => {
  try {
    const result = await careerPortfolio.addProject(req.user.id, req.body);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Update project
router.patch('/portfolio/projects/:projectId', authenticate, async (req, res, next) => {
  try {
    const result = await careerPortfolio.updateProject(
      req.user.id,
      req.params.projectId,
      req.body
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Get media upload URL
router.post('/portfolio/media/upload-url', authenticate, async (req, res, next) => {
  try {
    const result = await careerPortfolio.getMediaUploadUrl(
      req.user.id,
      req.body.projectId,
      { filename: req.body.filename, contentType: req.body.contentType }
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Get available templates
router.get('/portfolio/templates', async (req, res, next) => {
  try {
    const result = careerPortfolio.getTemplates();
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Apply template
router.post('/portfolio/template', authenticate, async (req, res, next) => {
  try {
    const result = await careerPortfolio.applyTemplate(
      req.user.id,
      req.body.templateId
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Create shareable link
router.post('/portfolio/share', authenticate, async (req, res, next) => {
  try {
    const result = await careerPortfolio.createShareableLink(
      req.user.id,
      req.body.options
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Access portfolio via share link (public)
router.get('/portfolio/view/:slug', async (req, res, next) => {
  try {
    const result = await careerPortfolio.accessViaShareLink(
      req.params.slug,
      req.query.password
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Get portfolio analytics
router.get('/portfolio/analytics', authenticate, async (req, res, next) => {
  try {
    const result = await careerPortfolio.getAnalytics(req.user.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// SALARY BENCHMARKING ROUTES (Step 54)
// ============================================================================

// Get salary estimate
router.get('/salary/estimate', authenticate, async (req, res, next) => {
  try {
    const result = salaryBenchmark.getSalaryEstimate({
      role: req.query.role,
      experienceLevel: req.query.experienceLevel,
      location: req.query.location,
      industry: req.query.industry
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Compare salaries across locations
router.get('/salary/compare/locations', authenticate, async (req, res, next) => {
  try {
    const result = salaryBenchmark.compareSalaryByLocation(
      req.query.role as string,
      (req.query.locations as string)?.split(',') || []
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Get negotiation tips
router.get('/salary/negotiation-tips', authenticate, async (req, res, next) => {
  try {
    const result = salaryBenchmark.getNegotiationTips({
      scenario: req.query.scenario,
      currentSalary: req.query.currentSalary ? parseFloat(req.query.currentSalary as string) : undefined,
      targetSalary: req.query.targetSalary ? parseFloat(req.query.targetSalary as string) : undefined,
      role: req.query.role
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Get available roles
router.get('/salary/roles', async (req, res, next) => {
  try {
    const result = salaryBenchmark.getAvailableRoles();
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Get available locations
router.get('/salary/locations', async (req, res, next) => {
  try {
    const result = salaryBenchmark.getAvailableLocations();
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// CAREER PROGRESSION ROUTES (Step 55)
// ============================================================================

// Get career timeline
router.get('/career/timeline', authenticate, async (req, res, next) => {
  try {
    const result = await careerProgression.getCareerTimeline(req.user.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Add career entry
router.post('/career/entries', authenticate, async (req, res, next) => {
  try {
    const result = await careerProgression.addCareerEntry(req.user.id, req.body);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Update career entry
router.patch('/career/entries/:entryId', authenticate, async (req, res, next) => {
  try {
    const result = await careerProgression.updateCareerEntry(
      req.user.id,
      req.params.entryId,
      req.body
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Get milestones
router.get('/career/milestones', authenticate, async (req, res, next) => {
  try {
    const result = await careerProgression.getMilestones(req.user.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Add milestone
router.post('/career/milestones', authenticate, async (req, res, next) => {
  try {
    const result = await careerProgression.addMilestone(req.user.id, req.body);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Celebrate milestone
router.post('/career/milestones/:milestoneId/celebrate', authenticate, async (req, res, next) => {
  try {
    const result = await careerProgression.celebrateMilestone(
      req.user.id,
      req.params.milestoneId
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Get goals
router.get('/career/goals', authenticate, async (req, res, next) => {
  try {
    const result = await careerProgression.getGoals(req.user.id, req.query.category);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Create goal
router.post('/career/goals', authenticate, async (req, res, next) => {
  try {
    const result = await careerProgression.createGoal(req.user.id, req.body);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Update goal progress
router.patch('/career/goals/:goalId/progress', authenticate, async (req, res, next) => {
  try {
    const result = await careerProgression.updateGoalProgress(
      req.user.id,
      req.params.goalId,
      { progress: req.body.progress, notes: req.body.notes }
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Get goal suggestions
router.get('/career/goals/suggestions', authenticate, async (req, res, next) => {
  try {
    const result = await careerProgression.getGoalSuggestions(req.user.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Get progression analytics
router.get('/career/analytics', authenticate, async (req, res, next) => {
  try {
    const result = await careerProgression.getProgressionAnalytics(req.user.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// APPRENTICESHIP ROUTES (Step 56)
// ============================================================================

// List apprenticeship opportunities
router.get('/apprenticeships', async (req, res, next) => {
  try {
    const result = await apprenticeship.getApprenticeshipListings(req.query);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Create apprenticeship listing (employers)
router.post('/apprenticeships', authenticate, authorize('employer'), async (req, res, next) => {
  try {
    const result = await apprenticeship.createApprenticeshipListing(
      req.user.id,
      req.body
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Get available trades
router.get('/apprenticeships/trades', async (req, res, next) => {
  try {
    res.json(apprenticeship.TRADES);
  } catch (error) {
    next(error);
  }
});

// Get government incentives
router.get('/apprenticeships/incentives', authenticate, async (req, res, next) => {
  try {
    const result = await apprenticeship.getApplicableIncentives({
      isEmployer: req.query.isEmployer === 'true',
      isIndigenous: req.query.isIndigenous === 'true',
      isRemote: req.query.isRemote === 'true',
      hasDisability: req.query.hasDisability === 'true'
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Create training plan
router.post('/apprenticeships/training-plans', authenticate, async (req, res, next) => {
  try {
    const result = await apprenticeship.createTrainingPlan(req.body.apprenticeshipId, req.body);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Update training unit progress
router.patch('/apprenticeships/training-plans/:planId/units/:unitId', authenticate, async (req, res, next) => {
  try {
    const result = await apprenticeship.updateUnitProgress(
      req.params.planId,
      req.params.unitId,
      req.body
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Assign mentor to training plan
router.post('/apprenticeships/training-plans/:planId/mentor', authenticate, async (req, res, next) => {
  try {
    const result = await apprenticeship.assignMentor(
      req.params.planId,
      req.body.mentorId
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Log mentoring session
router.post('/apprenticeships/training-plans/:planId/sessions', authenticate, async (req, res, next) => {
  try {
    const result = await apprenticeship.logMentoringSession(
      req.params.planId,
      { ...req.body, userId: req.user.id }
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// EMPLOYER VERIFICATION ROUTES (Step 57)
// ============================================================================

// Verify ABN
router.post('/employer/verify-abn', authenticate, async (req, res, next) => {
  try {
    const result = await employerVerification.verifyABN(req.body.abn);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Submit verification request
router.post('/employer/verification', authenticate, authorize('employer'), async (req, res, next) => {
  try {
    const result = await employerVerification.submitVerificationRequest(
      req.user.id,
      { type: req.body.type, abn: req.body.abn }
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Get verification status
router.get('/employer/verification', authenticate, authorize('employer'), async (req, res, next) => {
  try {
    const result = await employerVerification.getVerificationStatus(req.user.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Get document upload URL
router.post('/employer/verification/document-url', authenticate, authorize('employer'), async (req, res, next) => {
  try {
    const result = await employerVerification.getDocumentUploadUrl(
      req.body.verificationId,
      req.body.documentType,
      req.body.filename
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Get verification badge
router.get('/employer/:employerId/badge', async (req, res, next) => {
  try {
    const result = await employerVerification.getVerificationBadge(req.params.employerId);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Admin: Get verification requests
router.get('/admin/employer-verifications', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const result = await employerVerification.getVerificationRequests(req.query);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Admin: Get verification dashboard stats
router.get('/admin/employer-verifications/stats', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const result = await employerVerification.getVerificationDashboardStats();
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Admin: Review verification request
router.post('/admin/employer-verifications/:verificationId/review', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const result = await employerVerification.reviewVerificationRequest(
      req.params.verificationId,
      req.user.id,
      { action: req.body.action, notes: req.body.notes }
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// ONBOARDING ROUTES (Step 60)
// ============================================================================

// Get onboarding flows
router.get('/onboarding/roles', async (req, res, next) => {
  try {
    res.json(onboarding.USER_ROLES);
  } catch (error) {
    next(error);
  }
});

// Start onboarding
router.post('/onboarding/start', authenticate, async (req, res, next) => {
  try {
    const result = await onboarding.startOnboarding(
      req.user.id,
      req.body.role
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Get onboarding status
router.get('/onboarding/status', authenticate, async (req, res, next) => {
  try {
    const result = await onboarding.getOnboardingStatus(req.user.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Complete a step
router.post('/onboarding/steps/:stepId/complete', authenticate, async (req, res, next) => {
  try {
    const result = await onboarding.completeStep(
      req.user.id,
      req.params.stepId,
      req.body
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Skip a step
router.post('/onboarding/steps/:stepId/skip', authenticate, async (req, res, next) => {
  try {
    const result = await onboarding.skipStep(
      req.user.id,
      req.params.stepId
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Skip entire onboarding
router.post('/onboarding/skip', authenticate, async (req, res, next) => {
  try {
    const result = await onboarding.skipOnboarding(req.user.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Resume onboarding
router.post('/onboarding/resume', authenticate, async (req, res, next) => {
  try {
    const result = await onboarding.resumeOnboarding(req.user.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Admin: Get incomplete onboardings
router.get('/admin/onboarding/incomplete', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const result = await onboarding.getIncompleteOnboardings({
      daysInactive: parseInt(req.query.daysInactive as string) || 7,
      limit: parseInt(req.query.limit as string) || 100
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
});

export default router;

export {};
