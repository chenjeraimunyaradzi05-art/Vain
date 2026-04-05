/**
 * Scheduler Startup
 * 
 * Sets up scheduled tasks using setInterval
 * This is called when the API server starts
 */

import { JobAlertScheduler } from '../services/jobAlertScheduler';

// Time constants
const ONE_MINUTE = 60 * 1000;
const ONE_HOUR = 60 * ONE_MINUTE;
const ONE_DAY = 24 * ONE_HOUR;

// Store interval IDs for cleanup
const intervals: ReturnType<typeof setInterval>[] = [];

/**
 * Initialize all scheduled tasks
 */
export function initializeScheduler(): void {
  if (process.env.DISABLE_SCHEDULER === 'true') {
    console.log('[Scheduler] Disabled by DISABLE_SCHEDULER env var');
    return;
  }

  if (process.env.NODE_ENV !== 'production' && process.env.ENABLE_SCHEDULER !== 'true') {
    console.log('[Scheduler] Skipped in non-production (set ENABLE_SCHEDULER=true to enable)');
    return;
  }

  console.log('[Scheduler] Initializing scheduled tasks...');

  // Process instant alerts every 5 minutes
  const instantInterval = setInterval(async () => {
    try {
      await JobAlertScheduler.processAlerts('instant');
    } catch (error) {
      console.error('[Scheduler] Instant alerts error:', error);
    }
  }, 5 * ONE_MINUTE);
  intervals.push(instantInterval);
  console.log('[Scheduler] Instant alerts: every 5 minutes');

  // Process daily alerts at startup and then every hour (actual sends based on lastAlertAt)
  const dailyInterval = setInterval(async () => {
    // Only process once per day - check if current hour is 8 AM local
    const currentHour = new Date().getHours();
    if (currentHour !== 8) return;

    try {
      await JobAlertScheduler.processAlerts('daily');
    } catch (error) {
      console.error('[Scheduler] Daily alerts error:', error);
    }
  }, ONE_HOUR);
  intervals.push(dailyInterval);
  console.log('[Scheduler] Daily alerts: every day at 8 AM');

  // Process weekly alerts every Monday at 8 AM
  const weeklyInterval = setInterval(async () => {
    const now = new Date();
    // Monday = 1, and 8 AM
    if (now.getDay() !== 1 || now.getHours() !== 8) return;

    try {
      await JobAlertScheduler.processAlerts('weekly');
    } catch (error) {
      console.error('[Scheduler] Weekly alerts error:', error);
    }
  }, ONE_HOUR);
  intervals.push(weeklyInterval);
  console.log('[Scheduler] Weekly alerts: every Monday at 8 AM');

  // Process pre-apply for new jobs every hour
  const preApplyInterval = setInterval(async () => {
    try {
      await JobAlertScheduler.processPreApplyAlerts();
    } catch (error) {
      console.error('[Scheduler] Pre-apply alerts error:', error);
    }
  }, ONE_HOUR);
  intervals.push(preApplyInterval);
  console.log('[Scheduler] Pre-apply alerts: every hour');

  console.log('[Scheduler] All scheduled tasks initialized');
}

/**
 * Clean up scheduled tasks
 */
export function shutdownScheduler(): void {
  console.log('[Scheduler] Shutting down...');
  intervals.forEach(interval => clearInterval(interval));
  intervals.length = 0;
  console.log('[Scheduler] Shutdown complete');
}

export default { initializeScheduler, shutdownScheduler };
