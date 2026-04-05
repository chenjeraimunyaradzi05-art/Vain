/**
 * Routes Index
 * 
 * Central export for all API routes
 */

import { Router } from 'express';
import healthRoutes from './health';
import languagesRoutes from './languages';
import initiativesRoutes from './initiatives';
import gamificationRoutes from './gamification';
import financeRoutes from './finance';
import onboardingPurposeRoutes from './onboarding-purpose';
import savedJobsRoutes from './saved-jobs';
import applicationsRoutes from './applications';
import employerApplicationsRoutes from './employer-applications';
import radarRoutes from './radar';
import userAnalyticsRoutes from './user-analytics';
import adminJobsRoutes from './admin-jobs';
// Import additional routes as they're created

const router = Router();

// Health check routes (no auth required)
router.use('/health', healthRoutes);
router.use('/languages', languagesRoutes);
router.use('/initiatives', initiativesRoutes);
router.use('/gamification', gamificationRoutes);
router.use('/finance', financeRoutes);
router.use('/onboarding', onboardingPurposeRoutes);
router.use('/saved-jobs', savedJobsRoutes);
router.use('/applications', applicationsRoutes);
router.use('/employer-applications', employerApplicationsRoutes);
router.use('/radar', radarRoutes);
router.use('/user-analytics', userAnalyticsRoutes);
router.use('/admin-jobs', adminJobsRoutes);

// Export individual route modules
export { default as healthRoutes } from './health';
export { default as languagesRoutes } from './languages';
export { default as initiativesRoutes } from './initiatives';
export { default as gamificationRoutes } from './gamification';
export { default as financeRoutes } from './finance';
export { default as onboardingPurposeRoutes } from './onboarding-purpose';
export { default as savedJobsRoutes } from './saved-jobs';
export { default as applicationsRoutes } from './applications';
export { default as employerApplicationsRoutes } from './employer-applications';
export { default as radarRoutes } from './radar';
export { default as userAnalyticsRoutes } from './user-analytics';
export { default as adminJobsRoutes } from './admin-jobs';

// Export additional routes as they're created
// export { default as authRoutes } from './auth';
// export { default as usersRoutes } from './users';
// export { default as jobsRoutes } from './jobs';
// export { default as applicationsRoutes } from './applications';
// export { default as mentorshipRoutes } from './mentorship';

/**
 * Mount all routes on a base router
 * Usage: app.use('/api/v1', routes);
 */
export function mountRoutes(app: Router): void {
  app.use('/health', healthRoutes);
  app.use('/languages', languagesRoutes);
  app.use('/initiatives', initiativesRoutes);
  app.use('/gamification', gamificationRoutes);
  app.use('/finance', financeRoutes);
  app.use('/onboarding', onboardingPurposeRoutes);
  app.use('/saved-jobs', savedJobsRoutes);
  app.use('/applications', applicationsRoutes);
  app.use('/employer-applications', employerApplicationsRoutes);
  app.use('/radar', radarRoutes);
  app.use('/user-analytics', userAnalyticsRoutes);
  app.use('/admin-jobs', adminJobsRoutes);
  
  // Add additional routes here as they're integrated
  // app.use('/auth', authRoutes);
  // app.use('/users', usersRoutes);
  // app.use('/jobs', jobsRoutes);
  // app.use('/applications', applicationsRoutes);
  // app.use('/mentorship', mentorshipRoutes);
}

export default router;
