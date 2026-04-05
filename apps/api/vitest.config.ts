import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    // Test environment
    environment: 'node',
    
    // Global test timeout
    testTimeout: 30000,
    hookTimeout: 30000,
    
    // Test file patterns
    include: [
      'tests/**/*.test.ts',
      'tests/**/*.test.js',
      'tests/**/*.spec.ts',
      'tests/**/*.spec.js',
      'src/**/*.test.ts',
      'src/**/*.test.js',
    ],
    
    // Exclude patterns
    exclude: [
      'node_modules',
      'dist',
      '.git',
    ],
    
    // Note: We intentionally do NOT load ./tests/setup.ts as a global setup file.
    // Integration tests import it explicitly for createTestApp() and mocks.
    
    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      include: ['src/**/*.{ts,js}'],
      exclude: [
        'src/index.ts',
        'src/**/*.d.ts',
        'src/types/**',
      ],
      thresholds: {
        lines: 50,
        functions: 50,
        branches: 50,
        statements: 50,
      },
    },
    
    // Reporter configuration
    reporters: ['verbose'],

    // Use Vitest globals. In this environment, tests register correctly via globals,
    // while importing from 'vitest' resulted in "No test suite found".
    globals: true,

    // Keep execution in a single worker to reduce DB flakiness.
    pool: 'forks',
    singleFork: true,
    maxConcurrency: 1,
    
    // Environment variables for tests
    env: {
      NODE_ENV: 'test',
      DEV_JWT_SECRET: 'test-jwt-secret-for-vitest-at-least-32-chars',
      JWT_SECRET: 'test-jwt-secret-for-vitest-at-least-32-chars',
      SES_TEST_CAPTURE: '1',
    },
  },
  
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@tests': path.resolve(__dirname, 'tests'),
    },
  },
});
