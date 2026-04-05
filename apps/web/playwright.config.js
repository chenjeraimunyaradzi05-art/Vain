"use strict";

// Playwright configuration that points directly to tests directory
const path = require("path");
const { defineConfig } = require("@playwright/test");

const enableWebServers = String(process.env.PW_DISABLE_WEBSERVER || "").toLowerCase() !== "1";
const isCI = !!process.env.CI;

// Use PostgreSQL for E2E tests (consistent with production)
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://ngurra:dev_password_secure@localhost:5432/ngurra_dev';

module.exports = defineConfig({
    testDir: './tests',
    testIgnore: ['**/unit/**', '**/*.test.ts', '**/*.test.tsx'],
    fullyParallel: false,
    retries: process.env.CI ? 2 : 1,  // Add 1 retry locally to handle flaky tests
    outputDir: 'test-results/artifacts',
    workers: process.env.CI ? 1 : 2,  // Limit workers to reduce race conditions
    webServer: enableWebServers
        ? [
            {
                command: process.env.CI 
                    ? 'npm run db:generate && npm run db:push && npm run seed && npm run build && npm run start' 
                    : 'npm run build && npm run db:push && npm run seed && npm run start',
                cwd: path.join(__dirname, '..', 'api'),
                port: 3001,
                timeout: 180000,
                // Important: avoid reusing an already-running local API server.
                // Many tests assume seeded users (e.g. company@example.com) exist.
                // If we reuse a stale server, login/seed-dependent tests become flaky.
                reuseExistingServer: false,
                env: {
                    ...process.env,
                    PORT: '3001',
                    DATABASE_URL,
                    NODE_ENV: 'test',
                    SES_TEST_CAPTURE: '1',
                    // Keep AI provider calls fast and local during E2E.
                    // - Prototype provider is pointed at the API itself (404 quickly) to avoid hanging on the web server.
                    // - Timeout is reduced so rate-limit tests don't spend ~5s per request.
                    PROTOTYPE_AI_URL: 'http://127.0.0.1:3001',
                    AI_REQUEST_TIMEOUT_MS: '250',
                    AI_RATE_LIMIT_CAP: '2',
                },
            },
            {
                // Use a production-like server for stability (avoids slow/variable next dev compilation during E2E).
                command: 'npm run build && npm run start',
                cwd: __dirname,
                port: 3000,
                timeout: 180000,
                reuseExistingServer: false,
                env: { ...process.env, PORT: '3000', NEXT_PUBLIC_API_URL: 'http://127.0.0.1:3001' },
            },
        ]
        : undefined,
    use: {
        baseURL: process.env.E2E_BASE_URL || 'http://127.0.0.1:3000',
        headless: true,
        viewport: { width: 1280, height: 720 },
        actionTimeout: 15000,
        trace: 'retain-on-failure',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
    },
    reporter: process.env.CI
        ? [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }], ['junit', { outputFile: 'test-results/junit.xml' }]]
        : [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
    projects: isCI
        ? [
            { name: 'chromium', use: { browserName: 'chromium' } },
            { name: 'firefox', use: { browserName: 'firefox' } },
        ]
        : [{ name: 'chromium', use: { browserName: 'chromium' } }],
    timeout: 60000,
});
