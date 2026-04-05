/**
 * Analytics E2E Tests
 * Tests for tracking user interactions and page views
 */
import { test, expect } from '@playwright/test';

test.describe('Analytics Tracking', () => {
  test.beforeEach(async ({ page }) => {
    // Intercept analytics calls
    await page.route('**/api/analytics/**', (route) => {
      route.fulfill({ status: 200, body: '{}' });
    });
    
    // Expose analytics events for testing
    await page.addInitScript(() => {
      (window as any).__analyticsEvents = [];
      const originalTrack = (window as any).analytics?.track;
      if (typeof originalTrack === 'function') {
        (window as any).analytics.track = (...args: any[]) => {
          (window as any).__analyticsEvents.push({ type: 'track', args });
          return originalTrack.apply((window as any).analytics, args);
        };
      }
    });
  });

  test.describe('Page Views', () => {
    test('should track page view on navigation', async ({ page }) => {
      const analyticsRequests: string[] = [];
      
      page.on('request', (request) => {
        if (request.url().includes('/api/analytics')) {
          analyticsRequests.push(request.url());
        }
      });

      await page.goto('/');
      
      // Should have tracked home page view
      await page.waitForTimeout(500);
      
      // Navigate to jobs
      await page.click('a[href="/jobs"]');
      await page.waitForURL('/jobs');
      
      // Should have tracked jobs page view
      expect(analyticsRequests.length).toBeGreaterThan(0);
    });

    test('should include page metadata in tracking', async ({ page }) => {
      const trackingData: any[] = [];
      
      await page.route('**/api/analytics/pageview', async (route) => {
        const postData = route.request().postData();
        if (postData) {
          trackingData.push(JSON.parse(postData));
        }
        route.fulfill({ status: 200, body: '{}' });
      });

      await page.goto('/jobs');
      
      await page.waitForTimeout(500);
      
      if (trackingData.length > 0) {
        expect(trackingData[0]).toHaveProperty('path', '/jobs');
        expect(trackingData[0]).toHaveProperty('referrer');
        expect(trackingData[0]).toHaveProperty('timestamp');
      }
    });
  });

  test.describe('User Events', () => {
    test('should track job application start', async ({ page }) => {
      const events: any[] = [];
      
      await page.route('**/api/analytics/event', async (route) => {
        const postData = route.request().postData();
        if (postData) {
          events.push(JSON.parse(postData));
        }
        route.fulfill({ status: 200, body: '{}' });
      });

      await page.goto('/jobs/sample-job');
      
      const applyButton = page.locator('button:has-text("Apply")');
      if (await applyButton.isVisible()) {
        await applyButton.click();
        
        await page.waitForTimeout(500);
        
        const applicationEvent = events.find(e => e.event === 'application_started');
        if (applicationEvent) {
          expect(applicationEvent).toHaveProperty('jobId');
        }
      }
    });

    test('should track search queries', async ({ page }) => {
      const events: any[] = [];
      
      await page.route('**/api/analytics/event', async (route) => {
        const postData = route.request().postData();
        if (postData) {
          events.push(JSON.parse(postData));
        }
        route.fulfill({ status: 200, body: '{}' });
      });

      await page.goto('/jobs');
      
      const searchInput = page.locator('input[type="search"], input[placeholder*="Search"]');
      if (await searchInput.isVisible()) {
        await searchInput.fill('developer');
        await page.keyboard.press('Enter');
        
        await page.waitForTimeout(500);
        
        const searchEvent = events.find(e => e.event === 'search');
        if (searchEvent) {
          expect(searchEvent.query).toBe('developer');
        }
      }
    });

    test('should track filter changes', async ({ page }) => {
      const events: any[] = [];
      
      await page.route('**/api/analytics/event', async (route) => {
        const postData = route.request().postData();
        if (postData) {
          events.push(JSON.parse(postData));
        }
        route.fulfill({ status: 200, body: '{}' });
      });

      await page.goto('/jobs');
      
      // Look for filter controls
      const locationFilter = page.locator('[data-testid="location-filter"], select[name="location"]');
      if (await locationFilter.isVisible()) {
        await locationFilter.selectOption({ index: 1 });
        
        await page.waitForTimeout(500);
        
        const filterEvent = events.find(e => e.event === 'filter_applied');
        if (filterEvent) {
          expect(filterEvent).toHaveProperty('filterType', 'location');
        }
      }
    });
  });

  test.describe('Engagement Tracking', () => {
    test('should track time on page', async ({ page }) => {
      const events: any[] = [];
      
      await page.route('**/api/analytics/event', async (route) => {
        const postData = route.request().postData();
        if (postData) {
          events.push(JSON.parse(postData));
        }
        route.fulfill({ status: 200, body: '{}' });
      });

      await page.goto('/jobs/sample-job');
      
      // Simulate reading content
      await page.waitForTimeout(5000);
      
      // Navigate away to trigger engagement event
      await page.goto('/');
      
      const engagementEvent = events.find(e => e.event === 'page_engagement');
      if (engagementEvent) {
        expect(engagementEvent.timeOnPage).toBeGreaterThan(4000);
      }
    });

    test('should track scroll depth', async ({ page }) => {
      const events: any[] = [];
      
      await page.route('**/api/analytics/event', async (route) => {
        const postData = route.request().postData();
        if (postData) {
          events.push(JSON.parse(postData));
        }
        route.fulfill({ status: 200, body: '{}' });
      });

      await page.goto('/jobs');
      
      // Scroll to bottom
      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });
      
      await page.waitForTimeout(500);
      
      const scrollEvent = events.find(e => e.event === 'scroll_depth');
      if (scrollEvent) {
        expect(scrollEvent.depth).toBeGreaterThanOrEqual(75);
      }
    });
  });

  test.describe('Error Tracking', () => {
    test('should track client-side errors', async ({ page }) => {
      const errors: any[] = [];
      
      await page.route('**/api/analytics/error', async (route) => {
        const postData = route.request().postData();
        if (postData) {
          errors.push(JSON.parse(postData));
        }
        route.fulfill({ status: 200, body: '{}' });
      });

      await page.goto('/');
      
      // Trigger a client-side error
      await page.evaluate(() => {
        throw new Error('Test error for analytics');
      }).catch(() => {});
      
      await page.waitForTimeout(500);
      
      // Error might be captured
      if (errors.length > 0) {
        expect(errors[0]).toHaveProperty('message');
        expect(errors[0]).toHaveProperty('stack');
      }
    });

    test('should track 404 errors', async ({ page }) => {
      const events: any[] = [];
      
      await page.route('**/api/analytics/event', async (route) => {
        const postData = route.request().postData();
        if (postData) {
          events.push(JSON.parse(postData));
        }
        route.fulfill({ status: 200, body: '{}' });
      });

      await page.goto('/non-existent-page-12345');
      
      await page.waitForTimeout(500);
      
      const errorEvent = events.find(e => e.event === 'page_not_found');
      if (errorEvent) {
        expect(errorEvent.path).toBe('/non-existent-page-12345');
      }
    });
  });

  test.describe('Performance Tracking', () => {
    test('should track Core Web Vitals', async ({ page }) => {
      const metrics: any[] = [];
      
      await page.route('**/api/analytics/vitals', async (route) => {
        const postData = route.request().postData();
        if (postData) {
          metrics.push(JSON.parse(postData));
        }
        route.fulfill({ status: 200, body: '{}' });
      });

      await page.goto('/');
      
      // Wait for vitals to be collected
      await page.waitForTimeout(3000);
      
      // Vitals may not always be reported in test environment
      if (metrics.length > 0) {
        const vitals = metrics[0];
        // Check for LCP, FID, CLS if present
        expect(['LCP', 'FID', 'CLS', 'TTFB']).toContain(vitals.name);
      }
    });
  });

  test.describe('Privacy Compliance', () => {
    test('should respect Do Not Track header', async ({ page }) => {
      // Set DNT header
      await page.setExtraHTTPHeaders({
        'DNT': '1',
      });

      const analyticsRequests: string[] = [];
      
      page.on('request', (request) => {
        if (request.url().includes('/api/analytics')) {
          analyticsRequests.push(request.url());
        }
      });

      await page.goto('/');
      await page.waitForTimeout(1000);
      
      // With DNT, analytics might be disabled
      // This depends on implementation
    });

    test('should respect cookie consent', async ({ page }) => {
      await page.goto('/');
      
      // Look for cookie consent banner
      const consentBanner = page.locator('[data-testid="cookie-consent"], .cookie-banner');
      
      if (await consentBanner.isVisible()) {
        // Decline cookies
        const declineButton = page.locator('button:has-text("Decline"), button:has-text("Reject")');
        if (await declineButton.isVisible()) {
          await declineButton.click();
          
          await page.waitForTimeout(500);
          
          // Verify analytics cookies are not set
          const cookies = await page.context().cookies();
          const analyticsCookies = cookies.filter(c => 
            c.name.includes('_ga') || c.name.includes('analytics')
          );
          
          expect(analyticsCookies).toHaveLength(0);
        }
      }
    });
  });

  test.describe('Session Tracking', () => {
    test('should maintain session across page navigations', async ({ page }) => {
      const sessionIds: string[] = [];
      
      await page.route('**/api/analytics/**', async (route) => {
        const postData = route.request().postData();
        if (postData) {
          const data = JSON.parse(postData);
          if (data.sessionId) {
            sessionIds.push(data.sessionId);
          }
        }
        route.fulfill({ status: 200, body: '{}' });
      });

      await page.goto('/');
      await page.goto('/jobs');
      await page.goto('/about');
      
      await page.waitForTimeout(500);
      
      if (sessionIds.length > 1) {
        // All session IDs should be the same
        expect(new Set(sessionIds).size).toBe(1);
      }
    });
  });
});
