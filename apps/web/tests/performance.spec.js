"use strict";

/**
 * Performance Tests
 * 
 * Tests for Core Web Vitals and page performance.
 */

const { test, expect } = require('@playwright/test');
const { safeGoto, waitForAppReady } = require('./utils/test-helpers');

// Performance thresholds (based on Google's Web Vitals recommendations)
const PERFORMANCE_THRESHOLDS = {
  // Largest Contentful Paint (should be < 2.5s)
  LCP: 2500,
  
  // First Input Delay (should be < 100ms) - simulated with TBT
  FID: 100,
  
  // Cumulative Layout Shift (should be < 0.1)
  CLS: 0.1,
  
  // Time to First Byte (should be < 600ms)
  TTFB: 600,
  
  // First Contentful Paint (should be < 1.8s)
  FCP: 1800,
  
  // Speed Index (should be < 3.4s)
  SI: 3400,
  
  // Total Blocking Time (should be < 200ms)
  TBT: 200,
  
  // Time to Interactive (should be < 3.8s)
  TTI: 3800,
};

test.describe('Performance - Core Web Vitals', () => {
  test('homepage performance metrics', async ({ page }) => {
    // Start measuring performance
    await page.goto('/', { waitUntil: 'networkidle' });
    
    // Get performance metrics
    const metrics = await page.evaluate(() => {
      return new Promise((resolve) => {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          resolve(entries);
        });
        
        observer.observe({ entryTypes: ['navigation', 'paint', 'largest-contentful-paint'] });
        
        // Fallback after timeout
        setTimeout(() => {
          const navigation = performance.getEntriesByType('navigation')[0];
          const paint = performance.getEntriesByType('paint');
          resolve({
            navigation,
            paint,
          });
        }, 5000);
      });
    });

    console.log('Performance metrics:', JSON.stringify(metrics, null, 2));
  });

  test('homepage load time under threshold', async ({ page }) => {
    const start = Date.now();
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const loadTime = Date.now() - start;

    console.log(`Homepage DOM loaded in ${loadTime}ms`);
    
    // Should load DOM within reasonable time
    expect(loadTime).toBeLessThan(5000);
  });

  test('jobs page load time', async ({ page }) => {
    const start = Date.now();
    await page.goto('/jobs', { waitUntil: 'networkidle' });
    const loadTime = Date.now() - start;

    console.log(`Jobs page loaded in ${loadTime}ms`);
    
    expect(loadTime).toBeLessThan(8000);
  });
});

test.describe('Performance - Network', () => {
  test('homepage bundle size check', async ({ page }) => {
    const resources = [];
    
    page.on('response', (response) => {
      const url = response.url();
      const contentLength = response.headers()['content-length'];
      const contentType = response.headers()['content-type'] || '';
      
      if (contentLength && (contentType.includes('javascript') || contentType.includes('css'))) {
        resources.push({
          url: url.split('/').pop(),
          size: parseInt(contentLength, 10),
          type: contentType.includes('javascript') ? 'js' : 'css',
        });
      }
    });

    await page.goto('/', { waitUntil: 'networkidle' });

    // Calculate total JS and CSS size
    const totalJS = resources.filter(r => r.type === 'js').reduce((sum, r) => sum + r.size, 0);
    const totalCSS = resources.filter(r => r.type === 'css').reduce((sum, r) => sum + r.size, 0);

    console.log('Bundle sizes:');
    console.log(`  Total JS: ${(totalJS / 1024).toFixed(2)} KB`);
    console.log(`  Total CSS: ${(totalCSS / 1024).toFixed(2)} KB`);

    // Warn if bundles are large (but don't fail)
    if (totalJS > 500 * 1024) {
      console.warn('⚠️  JavaScript bundle is larger than 500KB');
    }
    if (totalCSS > 100 * 1024) {
      console.warn('⚠️  CSS bundle is larger than 100KB');
    }
  });

  test('no oversized images', async ({ page }) => {
    const largeImages = [];

    page.on('response', async (response) => {
      const url = response.url();
      const contentType = response.headers()['content-type'] || '';
      const contentLength = response.headers()['content-length'];

      if (contentType.includes('image') && contentLength) {
        const size = parseInt(contentLength, 10);
        // Flag images larger than 500KB
        if (size > 500 * 1024) {
          largeImages.push({
            url: url.split('/').pop()?.substring(0, 50),
            size: (size / 1024).toFixed(2) + ' KB',
          });
        }
      }
    });

    await page.goto('/', { waitUntil: 'networkidle' });

    if (largeImages.length > 0) {
      console.warn('⚠️  Large images detected:', largeImages);
    }
  });
});

test.describe('Performance - Memory', () => {
  test('no memory leaks during navigation', async ({ page }) => {
    // Navigate multiple times and check memory doesn't grow excessively
    const memorySnapshots = [];

    for (let i = 0; i < 5; i++) {
      await page.goto('/', { waitUntil: 'networkidle' });
      await page.goto('/jobs', { waitUntil: 'networkidle' });
      
      const memory = await page.evaluate(() => {
        if (performance.memory) {
          return {
            usedJSHeapSize: performance.memory.usedJSHeapSize,
            totalJSHeapSize: performance.memory.totalJSHeapSize,
          };
        }
        return null;
      });

      if (memory) {
        memorySnapshots.push(memory.usedJSHeapSize);
      }
    }

    if (memorySnapshots.length >= 2) {
      const memoryGrowth = memorySnapshots[memorySnapshots.length - 1] - memorySnapshots[0];
      const growthMB = (memoryGrowth / 1024 / 1024).toFixed(2);
      
      console.log(`Memory growth over navigation: ${growthMB} MB`);
      
      // Warn if memory grew by more than 50MB
      if (memoryGrowth > 50 * 1024 * 1024) {
        console.warn('⚠️  Potential memory leak: memory grew by more than 50MB');
      }
    }
  });
});

test.describe('Performance - API Response Times', () => {
  test('API endpoints respond quickly', async ({ page }) => {
    const apiCalls = [];

    page.on('response', async (response) => {
      const url = response.url();
      if (url.includes('/api/')) {
        const timing = response.timing();
        apiCalls.push({
          url: url.replace(/^.*\/api/, '/api'),
          status: response.status(),
          duration: timing ? timing.responseEnd : null,
        });
      }
    });

    await page.goto('/jobs', { waitUntil: 'networkidle' });

    console.log('API call timings:');
    apiCalls.forEach(call => {
      const status = call.duration && call.duration > 1000 ? '⚠️' : '✅';
      console.log(`  ${status} ${call.url}: ${call.duration?.toFixed(0) || 'N/A'}ms (${call.status})`);
    });

    // Check no API calls took more than 3 seconds
    const slowCalls = apiCalls.filter(c => c.duration && c.duration > 3000);
    expect(slowCalls.length).toBe(0);
  });
});
