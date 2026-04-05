"use strict";

/**
 * Step 96: Accessibility Audit
 * WCAG AA compliance verification using axe-core + Playwright
 * 
 * This test covers critical public and authenticated pages to ensure
 * the platform is accessible to all users, including those using
 * assistive technologies.
 */

const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;
const {
  getBaseUrl,
  getApiBaseUrl,
  safeGoto,
  waitForAppReady,
  loginAndSetToken,
} = require('./utils/test-helpers');

// Pages to audit (unauthenticated)
const PUBLIC_PAGES = [
  { path: '/', name: 'Home' },
  { path: '/jobs', name: 'Jobs List' },
  { path: '/mentorship', name: 'Mentorship' },
  { path: '/training', name: 'Training' },
  { path: '/login', name: 'Login' },
  { path: '/register', name: 'Register' },
];

// Pages that require authentication
const AUTH_PAGES = [
  { path: '/dashboard', name: 'Member Dashboard' },
  { path: '/profile', name: 'Profile' },
  { path: '/ai', name: 'AI Hub' },
  { path: '/ai-wellness', name: 'AI Wellness' },
  { path: '/ai-concierge', name: 'AI Concierge' },
];

// Company portal pages
const COMPANY_PAGES = [
  { path: '/company/dashboard', name: 'Company Dashboard' },
  { path: '/company/jobs', name: 'Company Jobs' },
];

test.describe('Accessibility Audit (WCAG AA)', () => {
  test.describe('Public Pages', () => {
    for (const { path, name } of PUBLIC_PAGES) {
      test(`${name} page should have no critical accessibility violations`, async ({ page }) => {
        await safeGoto(page, path);
        await waitForAppReady(page, ['main', '[role="main"]', '.container', '#__next']);

        const results = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
          .analyze();

        // Filter for critical/serious issues only
        const critical = results.violations.filter(v => 
          v.impact === 'critical' || v.impact === 'serious'
        );

        if (critical.length > 0) {
          console.log(`\n[${name}] Critical/Serious violations found:`);
          critical.forEach(v => {
            console.log(`  - ${v.id}: ${v.description} (${v.impact})`);
            v.nodes.forEach(n => console.log(`      ${n.target.join(', ')}`));
          });
        }

        // Fail if there are critical violations
        expect(critical, `${name} has critical accessibility issues`).toHaveLength(0);
      });
    }
  });

  test.describe('Authenticated Pages', () => {
    for (const { path, name } of AUTH_PAGES) {
      test(`${name} page should have no critical accessibility violations`, async ({ page, request }) => {
        const login = await loginAndSetToken({
          page,
          request,
          email: 'member@example.com',
          password: 'password123',
        });

        if (!login.ok) {
          test.skip(true, 'Could not authenticate - skipping auth page test');
          return;
        }

        await safeGoto(page, path);
        await waitForAppReady(page, ['main', '[role="main"]', '.container', 'h1']);

        const results = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
          .analyze();

        const critical = results.violations.filter(v => 
          v.impact === 'critical' || v.impact === 'serious'
        );

        if (critical.length > 0) {
          console.log(`\n[${name}] Critical/Serious violations found:`);
          critical.forEach(v => {
            console.log(`  - ${v.id}: ${v.description} (${v.impact})`);
            v.nodes.forEach(n => console.log(`      ${n.target.join(', ')}`));
          });
        }

        expect(critical, `${name} has critical accessibility issues`).toHaveLength(0);
      });
    }
  });

  test.describe('Company Portal Pages', () => {
    for (const { path, name } of COMPANY_PAGES) {
      test(`${name} page should have no critical accessibility violations`, async ({ page, request }) => {
        const login = await loginAndSetToken({
          page,
          request,
          email: 'company@example.com',
          password: 'password123',
        });

        if (!login.ok) {
          test.skip(true, 'Could not authenticate as company - skipping');
          return;
        }

        await safeGoto(page, path);
        await waitForAppReady(page, ['main', '[role="main"]', '.container', 'h1']);

        const results = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
          .analyze();

        const critical = results.violations.filter(v => 
          v.impact === 'critical' || v.impact === 'serious'
        );

        if (critical.length > 0) {
          console.log(`\n[${name}] Critical/Serious violations found:`);
          critical.forEach(v => {
            console.log(`  - ${v.id}: ${v.description} (${v.impact})`);
            v.nodes.forEach(n => console.log(`      ${n.target.join(', ')}`));
          });
        }

        expect(critical, `${name} has critical accessibility issues`).toHaveLength(0);
      });
    }
  });
});

// Utility test to generate a full a11y report
test.describe('Full Accessibility Report', () => {
  test('generate comprehensive accessibility report', async ({ page }) => {
    const baseUrl = getBaseUrl();
    const fs = require('fs');
    const path = require('path');

    const allPages = [...PUBLIC_PAGES];
    const report = {
      timestamp: new Date().toISOString(),
      pages: [],
      summary: {
        totalPages: 0,
        totalViolations: 0,
        criticalCount: 0,
        seriousCount: 0,
        moderateCount: 0,
        minorCount: 0,
      },
    };

    for (const { path: pagePath, name } of allPages) {
      await safeGoto(page, pagePath);
      await waitForAppReady(page, ['main', '[role="main"]', '.container', '#__next']);

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze();

      const pageReport = {
        name,
        path: pagePath,
        violations: results.violations.map(v => ({
          id: v.id,
          impact: v.impact,
          description: v.description,
          helpUrl: v.helpUrl,
          nodes: v.nodes.length,
        })),
        passCount: results.passes.length,
      };

      report.pages.push(pageReport);
      report.summary.totalPages++;
      report.summary.totalViolations += results.violations.length;
      
      results.violations.forEach(v => {
        if (v.impact === 'critical') report.summary.criticalCount++;
        else if (v.impact === 'serious') report.summary.seriousCount++;
        else if (v.impact === 'moderate') report.summary.moderateCount++;
        else report.summary.minorCount++;
      });
    }

    // Write report
    const reportPath = path.join(process.cwd(), 'test-results', 'a11y-report.json');
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log('\n========== ACCESSIBILITY REPORT ==========');
    console.log(`Pages audited: ${report.summary.totalPages}`);
    console.log(`Total violations: ${report.summary.totalViolations}`);
    console.log(`  Critical: ${report.summary.criticalCount}`);
    console.log(`  Serious: ${report.summary.seriousCount}`);
    console.log(`  Moderate: ${report.summary.moderateCount}`);
    console.log(`  Minor: ${report.summary.minorCount}`);
    console.log(`\nReport saved to: ${reportPath}`);
    console.log('==========================================\n');

    // Only fail if there are critical or serious issues
    expect(report.summary.criticalCount).toBe(0);
    expect(report.summary.seriousCount).toBe(0);
  });
});
