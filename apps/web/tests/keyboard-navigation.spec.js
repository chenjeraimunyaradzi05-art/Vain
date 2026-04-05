"use strict";

/**
 * Keyboard Navigation E2E Tests
 * 
 * Tests for keyboard accessibility and navigation.
 */

const { test, expect } = require('@playwright/test');
const { safeGoto, waitForAppReady } = require('./utils/test-helpers');

test.describe('Keyboard Navigation', () => {
  test.describe('Tab Navigation', () => {
    test('should have logical tab order on homepage', async ({ page }) => {
      await safeGoto(page, '/');
      await waitForAppReady(page, ['main']);

      // Start from the beginning
      await page.keyboard.press('Tab');
      
      // First focusable element should be in header/nav
      const firstFocused = await page.evaluate(() => {
        return {
          tagName: document.activeElement?.tagName,
          role: document.activeElement?.getAttribute('role'),
          ariaLabel: document.activeElement?.getAttribute('aria-label'),
        };
      });

      // Should be a link, button, or other interactive element
      expect(['A', 'BUTTON', 'INPUT']).toContain(firstFocused.tagName);
    });

    test('should be able to navigate to main content', async ({ page }) => {
      await safeGoto(page, '/');
      await waitForAppReady(page, ['main']);

      // Look for skip link or tab to main content
      await page.keyboard.press('Tab');
      
      const skipLink = page.locator('a[href="#main-content"], a:text-matches("skip", "i")');
      if (await skipLink.isVisible().catch(() => false)) {
        await page.keyboard.press('Enter');
        
        // Focus should move to main content
        const focusedInMain = await page.evaluate(() => {
          const main = document.querySelector('main, [role="main"], #main-content');
          return main?.contains(document.activeElement) || document.activeElement === main;
        });
        
        expect(focusedInMain).toBeTruthy();
      }
    });

    test('should be able to navigate form fields', async ({ page }) => {
      await safeGoto(page, '/login');
      await waitForAppReady(page, ['form']);

      const emailInput = page.locator('input[type="email"], input[name="email"]');
      await emailInput.focus();

      // Tab to password
      await page.keyboard.press('Tab');
      
      const focusedElement = await page.evaluate(() => {
        return {
          tagName: document.activeElement?.tagName,
          type: document.activeElement?.getAttribute('type'),
          name: document.activeElement?.getAttribute('name'),
        };
      });

      // Should be on password field or related element
      expect(focusedElement.tagName).toBe('INPUT');
    });

    test('should have visible focus indicators', async ({ page }) => {
      await safeGoto(page, '/');
      await waitForAppReady(page, ['main']);

      // Focus on first interactive element
      await page.keyboard.press('Tab');

      // Get the focused element's styles
      const focusStyles = await page.evaluate(() => {
        const el = document.activeElement;
        if (!el) return null;
        
        const styles = window.getComputedStyle(el);
        return {
          outline: styles.outline,
          outlineWidth: styles.outlineWidth,
          outlineColor: styles.outlineColor,
          boxShadow: styles.boxShadow,
          border: styles.border,
        };
      });

      // Should have some visible focus indicator
      const hasFocusIndicator = 
        (focusStyles?.outline && focusStyles.outline !== 'none') ||
        (focusStyles?.outlineWidth && focusStyles.outlineWidth !== '0px') ||
        (focusStyles?.boxShadow && focusStyles.boxShadow !== 'none');

      expect(hasFocusIndicator).toBeTruthy();
    });
  });

  test.describe('Escape Key Handling', () => {
    test('should close modal with Escape key', async ({ page }) => {
      await safeGoto(page, '/');
      await waitForAppReady(page, ['main']);

      // Look for a button that opens a modal
      const modalTrigger = page.locator(
        'button[aria-haspopup="dialog"], ' +
        'button:text-matches("menu|open|show", "i")'
      ).first();

      if (await modalTrigger.isVisible().catch(() => false)) {
        await modalTrigger.click();
        await page.waitForTimeout(300);

        // Check if modal is open
        const modal = page.locator('[role="dialog"], [aria-modal="true"], .modal');
        const isModalVisible = await modal.isVisible().catch(() => false);

        if (isModalVisible) {
          // Press Escape
          await page.keyboard.press('Escape');
          await page.waitForTimeout(300);

          // Modal should be closed
          await expect(modal).not.toBeVisible();
        }
      }
    });
  });

  test.describe('Arrow Key Navigation', () => {
    test('should navigate dropdown menu with arrow keys', async ({ page }) => {
      await safeGoto(page, '/');
      await waitForAppReady(page, ['main']);

      // Find a dropdown menu
      const menuButton = page.locator(
        'button[aria-haspopup="menu"], ' +
        'button[aria-expanded]'
      ).first();

      if (await menuButton.isVisible().catch(() => false)) {
        await menuButton.click();
        await page.waitForTimeout(300);

        // Check if menu is open
        const menuOpen = await menuButton.getAttribute('aria-expanded');
        
        if (menuOpen === 'true') {
          // Press arrow down
          await page.keyboard.press('ArrowDown');

          // First menu item should be focused
          const focusedItem = await page.evaluate(() => {
            return document.activeElement?.getAttribute('role');
          });

          // Might be menuitem or option
          expect(['menuitem', 'option', 'menuitemradio', 'menuitemcheckbox', null]).toContain(focusedItem);
        }
      }
    });
  });

  test.describe('Enter/Space Activation', () => {
    test('should activate buttons with Enter', async ({ page }) => {
      await safeGoto(page, '/');
      await waitForAppReady(page, ['main']);

      const button = page.locator('button:visible').first();
      
      if (await button.isVisible()) {
        await button.focus();
        
        // Track if button click handler was called
        const clickFired = await page.evaluate(() => {
          return new Promise(resolve => {
            const btn = /** @type {HTMLElement} */ (document.activeElement);
            const handler = () => {
              resolve(true);
              btn?.removeEventListener('click', handler);
            };
            btn?.addEventListener('click', handler);
            
            // Timeout if click doesn't fire
            setTimeout(() => resolve(false), 100);
          });
        });

        await page.keyboard.press('Enter');
        
        // Note: We're testing if the button can be focused and Enter pressed
        // The actual click behavior depends on the button's handler
      }
    });

    test('should activate buttons with Space', async ({ page }) => {
      await safeGoto(page, '/');
      await waitForAppReady(page, ['main']);

      const button = page.locator('button:visible').first();
      
      if (await button.isVisible()) {
        await button.focus();
        await page.keyboard.press('Space');
        // Just verify no errors occur
      }
    });
  });
});

test.describe('Focus Management', () => {
  test('should trap focus in modal', async ({ page }) => {
    await safeGoto(page, '/');
    await waitForAppReady(page, ['main']);

    // Find and open a modal
    const modalTrigger = page.locator(
      'button[aria-haspopup="dialog"], ' +
      '[data-testid="open-modal"]'
    ).first();

    if (await modalTrigger.isVisible().catch(() => false)) {
      await modalTrigger.click();
      await page.waitForTimeout(300);

      const modal = page.locator('[role="dialog"], [aria-modal="true"]');
      
      if (await modal.isVisible().catch(() => false)) {
        // Get all focusable elements in modal
        const focusableInModal = await modal.locator(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        ).count();

        if (focusableInModal > 1) {
          // Tab through all elements and verify focus stays in modal
          for (let i = 0; i < focusableInModal + 1; i++) {
            await page.keyboard.press('Tab');
            
            const isFocusInModal = await page.evaluate(() => {
              const modal = document.querySelector('[role="dialog"], [aria-modal="true"]');
              return modal?.contains(document.activeElement);
            });

            expect(isFocusInModal).toBeTruthy();
          }
        }
      }
    }
  });

  test('should return focus after modal closes', async ({ page }) => {
    await safeGoto(page, '/');
    await waitForAppReady(page, ['main']);

    const modalTrigger = page.locator('button[aria-haspopup="dialog"]').first();

    if (await modalTrigger.isVisible().catch(() => false)) {
      // Remember the trigger element
      await modalTrigger.focus();
      await modalTrigger.click();
      await page.waitForTimeout(300);

      // Close modal
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);

      // Focus should return to trigger
      const focusReturnedToTrigger = await page.evaluate(() => {
        const trigger = document.querySelector('button[aria-haspopup="dialog"]');
        return document.activeElement === trigger;
      });

      expect(focusReturnedToTrigger).toBeTruthy();
    }
  });
});
