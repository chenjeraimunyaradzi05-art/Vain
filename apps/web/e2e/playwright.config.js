"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const test_1 = require("@playwright/test");
const enableWebServers = String(process.env.PW_DISABLE_WEBSERVER || "").toLowerCase() !== "1";
exports.default = (0, test_1.defineConfig)({
    testDir: '../tests',
    fullyParallel: false,
    retries: process.env.CI ? 2 : 0,
    outputDir: 'test-results/artifacts',
    webServer: enableWebServers
        ? [
            {
                // Use start (no watch) for stability under Playwright on Windows.
                command: process.env.CI ? 'npm run build && npm run start' : 'npm run start',
                cwd: path.join(__dirname, '..', '..', 'api'),
                port: 3001,
                timeout: 180000,
                reuseExistingServer: !process.env.CI,
                env: { ...process.env, PORT: '3001', SES_TEST_CAPTURE: '1' },
            },
            {
                command: process.env.CI ? 'npm run build && npm run start' : 'npm run dev',
                cwd: path.join(__dirname, '..'),
                port: 3000,
                timeout: 180000,
                reuseExistingServer: !process.env.CI,
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
    timeout: 60000,
});
