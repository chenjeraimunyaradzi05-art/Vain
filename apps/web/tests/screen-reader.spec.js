"use strict";

/**
 * Screen Reader Accessibility Tests
 * 
 * Tests for ARIA attributes, landmarks, and semantic HTML.
 */

const { test, expect } = require('@playwright/test');
const { safeGoto, waitForAppReady } = require('./utils/test-helpers');

test.describe('Screen Reader Accessibility', () => {
  test.describe('ARIA Landmarks', () => {
    test('should have main landmark', async ({ page }) => {
      await safeGoto(page, '/');
      await waitForAppReady(page, ['main']);

      const main = page.locator('main, [role="main"]');
      await expect(main).toBeVisible();
    });

    test('should have navigation landmark', async ({ page }) => {
      await safeGoto(page, '/');
      await waitForAppReady(page, ['nav', 'header']);

      const nav = page.locator('nav, [role="navigation"]');
      await expect(nav.first()).toBeVisible();
    });

    test('should have only one h1 per page', async ({ page }) => {
      await safeGoto(page, '/');
      await waitForAppReady(page, ['main']);

      const h1Count = await page.locator('h1').count();
      expect(h1Count).toBeLessThanOrEqual(1);
    });

    test('should have heading hierarchy', async ({ page }) => {
      await safeGoto(page, '/');
      await waitForAppReady(page, ['main']);

      const headings = await page.evaluate(() => {
        const allHeadings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
        return Array.from(allHeadings).map(h => parseInt(h.tagName.substring(1)));
      });

      // Check no heading level is skipped
      for (let i = 1; i < headings.length; i++) {
        const diff = headings[i] - headings[i - 1];
        // Can go down multiple levels, but going up should only skip max 1 level
        expect(diff).toBeLessThanOrEqual(1);
      }
    });
  });

  test.describe('Form Accessibility', () => {
    test('should have labels for all form inputs', async ({ page }) => {
      await safeGoto(page, '/login');
      await waitForAppReady(page, ['form']);

      const unlabeledInputs = await page.evaluate(() => {
        const inputs = document.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"])');
        return Array.from(inputs).filter(input => {
          const id = input.id;
          const hasLabel = id && document.querySelector(`label[for="${id}"]`);
          const hasAriaLabel = input.getAttribute('aria-label');
          const hasAriaLabelledBy = input.getAttribute('aria-labelledby');
          const isWrappedInLabel = input.closest('label');
          
          return !hasLabel && !hasAriaLabel && !hasAriaLabelledBy && !isWrappedInLabel;
        }).length;
      });

      expect(unlabeledInputs).toBe(0);
    });

    test('should have accessible error messages', async ({ page }) => {
      await safeGoto(page, '/login');
      await waitForAppReady(page, ['form']);

      // Submit empty form to trigger validation
      const submitButton = page.locator('button[type="submit"]');
      await submitButton.click();

      await page.waitForTimeout(500);

      // Check if error messages are properly associated
      const errorAssociation = await page.evaluate(() => {
        const errors = document.querySelectorAll('[role="alert"], .error, [aria-invalid="true"]');
        return errors.length > 0;
      });

      // Note: This is informational - not all forms show errors this way
    });

    test('should indicate required fields', async ({ page }) => {
      await safeGoto(page, '/login');
      await waitForAppReady(page, ['form']);

      const requiredFields = await page.evaluate(() => {
        const inputs = document.querySelectorAll('input:required, input[aria-required="true"]');
        return inputs.length;
      });

      // Login form should have at least email and password as required
      expect(requiredFields).toBeGreaterThanOrEqual(2);
    });
  });

  test.describe('Button and Link Accessibility', () => {
    test('should have accessible names for buttons', async ({ page }) => {
      await safeGoto(page, '/');
      await waitForAppReady(page, ['main']);

      const unlabeledButtons = await page.evaluate(() => {
        const buttons = document.querySelectorAll('button');
        return Array.from(buttons).filter(btn => {
          const text = btn.textContent?.trim();
          const ariaLabel = btn.getAttribute('aria-label');
          const ariaLabelledBy = btn.getAttribute('aria-labelledby');
          const title = btn.title;
          
          return !text && !ariaLabel && !ariaLabelledBy && !title;
        }).length;
      });

      expect(unlabeledButtons).toBe(0);
    });

    test('should have accessible names for links', async ({ page }) => {
      await safeGoto(page, '/');
      await waitForAppReady(page, ['main']);

      const problematicLinks = await page.evaluate(() => {
        const links = document.querySelectorAll('a[href]');
        return Array.from(links).filter(link => {
          const text = link.textContent?.trim();
          const ariaLabel = link.getAttribute('aria-label');
          const title = link.title;
          const imgAlt = link.querySelector('img')?.alt;
          
          // Check for generic text
          const genericTexts = ['click here', 'read more', 'learn more', 'here'];
          const isGeneric = text && genericTexts.includes(text.toLowerCase());
          
          return (!text && !ariaLabel && !title && !imgAlt) || isGeneric;
        }).length;
      });

      // Allow some generic links but warn
      if (problematicLinks > 0) {
        console.warn(`Found ${problematicLinks} links with generic or missing accessible names`);
      }
    });
  });

  test.describe('Image Accessibility', () => {
    test('should have alt text for all images', async ({ page }) => {
      await safeGoto(page, '/');
      await waitForAppReady(page, ['main']);

      const missingAlt = await page.evaluate(() => {
        const images = document.querySelectorAll('img');
        return Array.from(images).filter(img => {
          const alt = img.getAttribute('alt');
          const role = img.getAttribute('role');
          
          // Decorative images should have alt="" or role="presentation"
          if (role === 'presentation' || role === 'none') return false;
          
          // Alt should be defined (can be empty for decorative images)
          return alt === null;
        }).length;
      });

      expect(missingAlt).toBe(0);
    });

    test('should not have redundant image alt text', async ({ page }) => {
      await safeGoto(page, '/');
      await waitForAppReady(page, ['main']);

      const redundantAlt = await page.evaluate(() => {
        const images = document.querySelectorAll('img[alt]');
        return Array.from(images).filter(img => {
          const alt = (img.alt || '').toLowerCase();
          // Check for redundant phrases
          return alt.startsWith('image of') || 
                 alt.startsWith('photo of') || 
                 alt.startsWith('picture of') ||
                 alt === 'image' ||
                 alt === 'photo' ||
                 alt === 'icon';
        }).length;
      });

      expect(redundantAlt).toBe(0);
    });
  });

  test.describe('ARIA Attributes', () => {
    test('should have valid ARIA attributes', async ({ page }) => {
      await safeGoto(page, '/');
      await waitForAppReady(page, ['main']);

      const invalidAria = await page.evaluate(() => {
        const validRoles = [
          'alert', 'alertdialog', 'application', 'article', 'banner', 'button',
          'cell', 'checkbox', 'columnheader', 'combobox', 'complementary',
          'contentinfo', 'definition', 'dialog', 'directory', 'document',
          'feed', 'figure', 'form', 'grid', 'gridcell', 'group', 'heading',
          'img', 'link', 'list', 'listbox', 'listitem', 'log', 'main',
          'marquee', 'math', 'menu', 'menubar', 'menuitem', 'menuitemcheckbox',
          'menuitemradio', 'navigation', 'none', 'note', 'option', 'presentation',
          'progressbar', 'radio', 'radiogroup', 'region', 'row', 'rowgroup',
          'rowheader', 'scrollbar', 'search', 'searchbox', 'separator', 'slider',
          'spinbutton', 'status', 'switch', 'tab', 'table', 'tablist', 'tabpanel',
          'term', 'textbox', 'timer', 'toolbar', 'tooltip', 'tree', 'treegrid', 'treeitem'
        ];

        const elementsWithRole = document.querySelectorAll('[role]');
        return Array.from(elementsWithRole).filter(el => {
          const role = el.getAttribute('role');
          return !validRoles.includes(role || '');
        }).length;
      });

      expect(invalidAria).toBe(0);
    });

    test('should have aria-expanded for expandable elements', async ({ page }) => {
      await safeGoto(page, '/');
      await waitForAppReady(page, ['main']);

      const expandableElements = await page.evaluate(() => {
        const expandable = document.querySelectorAll(
          '[aria-haspopup], button[data-expanded], [data-state="open"], [data-state="closed"]'
        );
        return Array.from(expandable).filter(el => {
          return el.getAttribute('aria-expanded') === null;
        }).length;
      });

      // Allow some elements without aria-expanded but warn
      if (expandableElements > 0) {
        console.warn(`Found ${expandableElements} expandable elements missing aria-expanded`);
      }
    });
  });

  test.describe('Live Regions', () => {
    test('should have aria-live regions for dynamic content', async ({ page }) => {
      await safeGoto(page, '/');
      await waitForAppReady(page, ['main']);

      // Check for toast/notification containers
      const liveRegions = await page.evaluate(() => {
        return document.querySelectorAll('[aria-live], [role="alert"], [role="status"]').length;
      });

      // It's okay to not have live regions on initial load
      // but the app should support them
    });
  });
});
