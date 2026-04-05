/** @type {import('jest').Config} */
const includeIntegration = process.env.RUN_JEST_INTEGRATION === '1';

module.exports = {
  testEnvironment: 'node',
  rootDir: '.',
  preset: 'ts-jest',
  testMatch: includeIntegration
    ? ['<rootDir>/tests/**/*.test.ts']
    : ['<rootDir>/tests/unit/**/*.test.ts'],
  testTimeout: 20000,
  setupFilesAfterEnv: ['<rootDir>/tests/jest.setup.ts'],
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.jest.json',
        useESM: false,
      },
    ],
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^\.\./\.\./src/(.*)$': '<rootDir>/src/$1',
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'json'],
  clearMocks: true,
  resetMocks: true,
};
