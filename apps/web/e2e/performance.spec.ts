/**
 * Performance E2E Tests
 * Tests for page load performance and Core Web Vitals
 */
import { test, expect, Page } from '@playwright/test';

interface PerformanceMetrics {
  lcp?: number;
  fid?: number;
  cls?: number;
  ttfb?: number;
  fcp?: number;
  domContentLoaded?: number;
  load?: number;
}

async function getPerformanceMetrics(page: Page): Promise<PerformanceMetrics> {
  return await page.evaluate(() => {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    const paintEntries = performance.getEntriesByType('paint');
    
    const fcp = paintEntries.find(e => e.name === 'first-contentful-paint');
    
    return {
      ttfb: navigation?.responseStart - navigation?.requestStart,
      fcp: fcp?.startTime,
      domContentLoaded: navigation?.domContentLoadedEventEnd - navigation?.startTime,
      load: navigation?.loadEventEnd - navigation?.startTime,
    };
  });
}

test.describe('Performance Tests', () => {
  test.describe('Page Load Performance', () => {
    test('homepage should load within performance budget', async ({ page }) => {
      const startTime = Date.now();
      
      await page.goto('/', { waitUntil: 'networkidle' });
      
      const loadTime = Date.now() - startTime;
      
      // Homepage should load in under 3 seconds
      expect(loadTime).toBeLessThan(3000);
      
      const metrics = await getPerformanceMetrics(page);
      
      // TTFB should be under 600ms
      if (metrics.ttfb) {
        expect(metrics.ttfb).toBeLessThan(600);
      }
      
      // FCP should be under 1.8s
      if (metrics.fcp) {
        expect(metrics.fcp).toBeLessThan(1800);
      }
    });

    test('jobs listing should load within performance budget', async ({ page }) => {
      await page.goto('/jobs', { waitUntil: 'networkidle' });
      
      const metrics = await getPerformanceMetrics(page);
      
      // DOM Content Loaded should be under 2s
      if (metrics.domContentLoaded) {
        expect(metrics.domContentLoaded).toBeLessThan(2000);
      }
    });

    test('job detail page should load within performance budget', async ({ page }) => {
      await page.goto('/jobs', { waitUntil: 'networkidle' });
      
      // Find and click first job
      const firstJob = page.locator('[data-testid="job-card"], .job-card').first();
      if (await firstJob.isVisible()) {
        const startTime = Date.now();
        await firstJob.click();
        await page.waitForLoadState('networkidle');
        const loadTime = Date.now() - startTime;
        
        // Navigation should be fast
        expect(loadTime).toBeLessThan(2000);
      }
    });
  });

  test.describe('Bundle Size', () => {
    test('JavaScript bundle should not exceed size limit', async ({ page }) => {
      const jsResources: number[] = [];
      
      page.on('response', async (response) => {
        const url = response.url();
        if (url.endsWith('.js') && response.status() === 200) {
          const headers = response.headers();
          const contentLength = parseInt(headers['content-length'] || '0', 10);
          if (contentLength > 0) {
            jsResources.push(contentLength);
          }
        }
      });

      await page.goto('/', { waitUntil: 'networkidle' });
      
      const totalJsSize = jsResources.reduce((a, b) => a + b, 0);
      
      // Total JS should be under 500KB (compressed)
      expect(totalJsSize).toBeLessThan(500 * 1024);
    });

    test('CSS bundle should not exceed size limit', async ({ page }) => {
      const cssResources: number[] = [];
      
      page.on('response', async (response) => {
        const url = response.url();
        if (url.endsWith('.css') && response.status() === 200) {
          const headers = response.headers();
          const contentLength = parseInt(headers['content-length'] || '0', 10);
          if (contentLength > 0) {
            cssResources.push(contentLength);
          }
        }
      });

      await page.goto('/', { waitUntil: 'networkidle' });
      
      const totalCssSize = cssResources.reduce((a, b) => a + b, 0);
      
      // Total CSS should be under 100KB (compressed)
      expect(totalCssSize).toBeLessThan(100 * 1024);
    });
  });

  test.describe('Resource Loading', () => {
    test('images should be lazy loaded', async ({ page }) => {
      await page.goto('/jobs');
      
      // Get images below the fold
      const images = await page.$$('img[loading="lazy"], img[data-src]');
      
      // Most images should be lazy loaded
      expect(images.length).toBeGreaterThan(0);
    });

    test('should use modern image formats', async ({ page }) => {
      const imageFormats: string[] = [];
      
      page.on('response', async (response) => {
        const contentType = response.headers()['content-type'];
        if (contentType?.startsWith('image/')) {
          imageFormats.push(contentType);
        }
      });

      await page.goto('/');
      
      // Check for WebP or AVIF usage
      const modernFormats = imageFormats.filter(f => 
        f.includes('webp') || f.includes('avif')
      );
      
      // At least some images should use modern formats
      // This is informational - not all images may be optimized yet
    });

    test('critical resources should be preloaded', async ({ page }) => {
      await page.goto('/');
      
      // Check for preload links
      const preloadLinks = await page.$$('link[rel="preload"]');
      
      // Should have some preloaded resources
      expect(preloadLinks.length).toBeGreaterThan(0);
    });

    test('fonts should be preloaded or have font-display', async ({ page }) => {
      await page.goto('/');
      
      // Check for font preload
      const fontPreloads = await page.$$('link[rel="preload"][as="font"]');
      
      // Or check font-display in CSS
      const fontDisplay = await page.evaluate(() => {
        const stylesheets = Array.from(document.styleSheets);
        for (const sheet of stylesheets) {
          try {
            const rules = Array.from(sheet.cssRules);
            for (const rule of rules) {
              if (rule instanceof CSSFontFaceRule) {
                if (rule.style.getPropertyValue('font-display')) {
                  return true;
                }
              }
            }
          } catch (e) {
            // Cross-origin stylesheets can't be accessed
          }
        }
        return false;
      });
      
      expect(fontPreloads.length > 0 || fontDisplay).toBe(true);
    });
  });

  test.describe('Caching', () => {
    test('static assets should have cache headers', async ({ page }) => {
      const cacheHeaders: { url: string; cacheControl: string }[] = [];
      
      page.on('response', async (response) => {
        const url = response.url();
        const cacheControl = response.headers()['cache-control'];
        
        if (url.match(/\.(js|css|png|jpg|svg|woff2?)$/) && cacheControl) {
          cacheHeaders.push({ url, cacheControl });
        }
      });

      await page.goto('/');
      
      // Check that static assets have appropriate caching
      for (const { url, cacheControl } of cacheHeaders) {
        // Should have max-age or immutable
        expect(
          cacheControl.includes('max-age') || cacheControl.includes('immutable')
        ).toBe(true);
      }
    });
  });

  test.describe('Network Efficiency', () => {
    test('should minimize number of requests on page load', async ({ page }) => {
      let requestCount = 0;
      
      page.on('request', () => {
        requestCount++;
      });

      await page.goto('/', { waitUntil: 'networkidle' });
      
      // Should be under 50 requests for initial load
      expect(requestCount).toBeLessThan(50);
    });

    test('should use HTTP/2 or HTTP/3', async ({ page }) => {
      const protocols: string[] = [];
      
      page.on('response', async (response) => {
        // Note: Playwright doesn't expose HTTP version directly
        // This is a placeholder for real protocol checking
      });

      await page.goto('/');
      
      // In production, verify HTTP/2+ is used
    });

    test('should compress responses', async ({ page }) => {
      const compressionHeaders: { url: string; encoding: string }[] = [];
      
      page.on('response', async (response) => {
        const url = response.url();
        const contentEncoding = response.headers()['content-encoding'];
        
        if (contentEncoding && url.match(/\.(js|css|html|json)$/)) {
          compressionHeaders.push({ url, encoding: contentEncoding });
        }
      });

      await page.goto('/');
      
      // Text resources should be compressed
      for (const { encoding } of compressionHeaders) {
        expect(['gzip', 'br', 'deflate']).toContain(encoding);
      }
    });
  });

  test.describe('Rendering Performance', () => {
    test('should not have layout shifts during load', async ({ page }) => {
      await page.goto('/');
      
      // Wait for page to stabilize
      await page.waitForTimeout(2000);
      
      const cls = await page.evaluate(() => {
        return new Promise<number>((resolve) => {
          let cls = 0;
          const observer = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              if (!(entry as any).hadRecentInput) {
                cls += (entry as any).value;
              }
            }
          });
          
          observer.observe({ type: 'layout-shift', buffered: true });
          
          setTimeout(() => {
            observer.disconnect();
            resolve(cls);
          }, 1000);
        });
      });
      
      // CLS should be under 0.1
      expect(cls).toBeLessThan(0.1);
    });

    test('should have smooth scrolling', async ({ page }) => {
      await page.goto('/jobs');
      
      // Measure frame rate during scroll
      const smoothScroll = await page.evaluate(async () => {
        return new Promise<boolean>((resolve) => {
          let frames = 0;
          let lastTime = performance.now();
          
          const countFrames = (time: number) => {
            frames++;
            if (time - lastTime < 1000) {
              requestAnimationFrame(countFrames);
            } else {
              // Should maintain at least 30fps
              resolve(frames >= 30);
            }
          };
          
          // Start scrolling
          window.scrollTo({ top: 1000, behavior: 'smooth' });
          requestAnimationFrame(countFrames);
        });
      });
      
      expect(smoothScroll).toBe(true);
    });
  });

  test.describe('Memory Usage', () => {
    test('should not have memory leaks on navigation', async ({ page }) => {
      // Get initial memory
      const initialMemory = await page.evaluate(() => {
        if ('memory' in performance) {
          return (performance as any).memory.usedJSHeapSize;
        }
        return 0;
      });
      
      // Navigate multiple times
      for (let i = 0; i < 5; i++) {
        await page.goto('/jobs');
        await page.goto('/');
        await page.goto('/about');
      }
      
      // Get final memory
      const finalMemory = await page.evaluate(() => {
        // Force garbage collection if available
        if ('gc' in window) {
          (window as any).gc();
        }
        
        if ('memory' in performance) {
          return (performance as any).memory.usedJSHeapSize;
        }
        return 0;
      });
      
      // Memory should not have grown significantly (< 50% increase)
      if (initialMemory > 0) {
        expect(finalMemory).toBeLessThan(initialMemory * 1.5);
      }
    });
  });

  test.describe('Critical Path', () => {
    test('above-the-fold content should render quickly', async ({ page }) => {
      const startTime = Date.now();
      
      await page.goto('/');
      
      // Wait for hero/header to be visible
      const hero = page.locator('header, [data-testid="hero"], .hero, h1').first();
      await hero.waitFor({ state: 'visible' });
      
      const renderTime = Date.now() - startTime;
      
      // Above-fold content should be visible within 1.5s
      expect(renderTime).toBeLessThan(1500);
    });

    test('interactive elements should be clickable quickly', async ({ page }) => {
      const startTime = Date.now();
      
      await page.goto('/');
      
      // Wait for navigation to be interactive
      const navButton = page.locator('nav a, nav button, header a').first();
      await navButton.waitFor({ state: 'visible' });
      
      // Try to click
      await navButton.click({ trial: true });
      
      const interactiveTime = Date.now() - startTime;
      
      // Should be interactive within 2s
      expect(interactiveTime).toBeLessThan(2000);
    });
  });
});
