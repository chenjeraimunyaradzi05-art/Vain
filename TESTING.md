# Testing Guide for Vantage Platform

This guide covers the comprehensive testing infrastructure and best practices for the Vantage platform.

## Table of Contents

- [Overview](#overview)
- [Test Structure](#test-structure)
- [Running Tests](#running-tests)
- [Test Types](#test-types)
- [CI/CD Pipeline](#cicd-pipeline)
- [Docker Testing](#docker-testing)
- [Coverage](#coverage)
- [Mocking](#mocking)
- [Best Practices](#best-practices)

## Overview

The Vantage platform uses a comprehensive testing strategy that includes:

- **Unit Tests**: Fast, isolated tests for individual functions and components
- **Integration Tests**: Tests that verify interactions between modules and services
- **End-to-End Tests**: Full application flow testing with real browsers
- **Performance Tests**: Load testing and benchmarking
- **Security Tests**: Vulnerability scanning and security testing

## Test Structure

```
├── apps/
│   ├── api/
│   │   ├── src/tests/
│   │   │   ├── setup.ts              # Test setup and utilities
│   │   │   ├── unit/                 # Unit tests
│   │   │   ├── integration/          # Integration tests
│   │   │   └── e2e/                  # End-to-end tests
│   │   ├── vitest.config.ts          # Test configuration
│   │   └── package.json              # Test scripts
│   ├── web/
│   │   ├── src/tests/
│   │   │   ├── setup.ts              # Test setup
│   │   │   ├── unit/                 # Unit tests
│   │   │   ├── e2e/                  # Playwright E2E tests
│   │   └── vitest.config.ts          # Test configuration
│   └── mobile/
│       ├── src/__tests__/           # Tests
│       └── jest.config.js           # Test configuration
├── scripts/
│   └── test-runner.js               # Comprehensive test runner
├── docker-compose.test.yml          # Test environment
├── test.config.js                   # Global test configuration
└── TESTING.md                        # This file
```

## Running Tests

### Quick Start

```bash
# Run all tests for all apps
npm run test

# Run tests for specific app
cd apps/api && npm test
cd apps/web && npm test
cd apps/mobile && npm test

# Use the comprehensive test runner
node scripts/test-runner.js

# Run with specific options
node scripts/test-runner.js --apps api,web --tests unit,integration --skip-build
```

### Individual Test Types

#### API Tests

```bash
# Unit tests
cd apps/api && npm run test:unit

# Integration tests
cd apps/api && npm run test:integration

# Coverage
cd apps/api && npm run test:coverage

# Watch mode
cd apps/api && npm run test:watch
```

#### Web Tests

```bash
# Unit tests
cd apps/web && npm run test:unit

# E2E tests
cd apps/web && npm run test:e2e

# E2E with coverage
cd apps/web && npm run test:e2e:ci

# Update E2E snapshots
cd apps/web && npm run test:e2e:update
```

#### Mobile Tests

```bash
# Run all tests
cd apps/mobile && npm test

# Run specific test file
cd apps/mobile && npm test -- test-file.test.js
```

### Test Runner Options

```bash
# Show all options
node scripts/test-runner.js --help

# Common options
--skip-install          # Skip dependency installation
--skip-lint            # Skip linting
--skip-typecheck       # Skip type checking
--skip-build           # Skip building
--no-parallel          # Run tests sequentially
--apps api,web         # Test specific apps
--tests unit,integration # Test specific types
```

## Test Types

### Unit Tests

Unit tests test individual functions, components, and modules in isolation.

**Characteristics:**
- Fast execution (< 1s per test)
- No external dependencies
- Mocked external services
- High coverage requirements

**Examples:**
- Utility functions
- React components
- API endpoints (with mocked database)
- Service functions

### Integration Tests

Integration tests verify that multiple components work together correctly.

**Characteristics:**
- Medium execution time (1-10s per test)
- Real database connections
- Limited external dependencies
- Focus on interactions

**Examples:**
- API endpoint integration
- Database operations
- Service interactions
- Authentication flows

### End-to-End Tests

E2E tests verify complete user flows through the application.

**Characteristics:**
- Slow execution (10-60s per test)
- Real browser automation
- Full application stack
- User-centric testing

**Examples:**
- User registration flow
- Job application process
- Dashboard interactions
- Mobile app flows

### Performance Tests

Performance tests verify application performance under load.

**Characteristics:**
- Long execution time (1-10min)
- Load generation
- Performance metrics
- Benchmarking

**Examples:**
- API load testing
- Database performance
- Frontend performance
- Mobile app performance

## CI/CD Pipeline

### GitHub Actions Workflow

The CI pipeline runs on every push and pull request:

```yaml
# .github/workflows/ci.yml
name: CI
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]
```

### Pipeline Stages

1. **Blocked Terms Check**: Ensures no legacy branding remains
2. **Linting**: Code quality and style checks
3. **Type Checking**: TypeScript compilation
4. **Testing**: All test suites
5. **Building**: Application compilation
6. **Security Scanning**: Vulnerability detection

### Environment Variables

Required CI environment variables:

```bash
DATABASE_URL=postgresql://postgres:postgres@postgres-test:5432/vantage_test
REDIS_URL=redis://redis-test:6379
AWS_ACCESS_KEY_ID=minioadmin
AWS_SECRET_ACCESS_KEY=minioadmin123
JWT_SECRET=test-jwt-secret-for-testing
```

## Docker Testing

### Test Environment

The test environment uses Docker Compose to spin up required services:

```bash
# Start test environment
docker-compose -f docker-compose.test.yml up -d

# Run tests in Docker
docker-compose -f docker-compose.test.yml exec api-test npm test
docker-compose -f docker-compose.test.yml exec web-test npm test

# Stop test environment
docker-compose -f docker-compose.test.yml down
```

### Services

- **PostgreSQL**: Test database (port 5433)
- **Redis**: Test cache (port 6380)
- **MinIO**: Test S3 storage (port 9001)
- **API**: Test API service (port 3334)
- **Web**: Test web service (port 3001)
- **Mobile**: Test mobile service (port 8082)

## Coverage

### Coverage Requirements

- **Global**: 70% coverage for lines, functions, branches, statements
- **New Modules**: 50% minimum coverage
- **Critical Paths**: 90% coverage for authentication, payments, data access

### Coverage Reports

Coverage reports are generated in the `coverage/` directory:

```bash
# Generate coverage
npm run test:coverage

# View HTML report
open coverage/index.html

# View coverage in terminal
npm run test:coverage --reporter=text
```

### Coverage Thresholds

Coverage thresholds are enforced in CI:

```json
{
  "coverage": {
    "thresholds": {
      "global": {
        "lines": 70,
        "functions": 70,
        "branches": 70,
        "statements": 70
      }
    }
  }
}
```

## Mocking

### Database Mocking

Database operations are mocked for unit tests:

```typescript
// src/tests/setup.ts
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    user: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    }
  }))
}));
```

### External Service Mocking

External services are mocked to avoid dependencies:

```typescript
// Mock Redis
jest.mock('ioredis', () => ({
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  exists: jest.fn()
}));

// Mock Email Service
jest.mock('@/services/emailService', () => ({
  sendVerificationEmail: jest.fn(),
  sendPasswordResetEmail: jest.fn()
}));
```

### Test Data Factories

Use factories to generate test data:

```typescript
// src/tests/factories/userFactory.ts
export const createUser = async (overrides = {}) => {
  return {
    id: 'test-user-id',
    email: 'test@example.com',
    userType: 'MEMBER',
    firstName: 'Test',
    lastName: 'User',
    ...overrides
  };
};
```

## Best Practices

### Test Organization

1. **File Naming**: Use `.test.ts` for TypeScript tests
2. **Structure**: Group tests by type (unit, integration, e2e)
3. **Setup**: Use setup files for common test configuration
4. **Fixtures**: Use factories for test data generation

### Test Writing

1. **AAA Pattern**: Arrange, Act, Assert
2. **Descriptive Names**: Use clear, descriptive test names
3. **One Assertion**: One assertion per test when possible
4. **Test Isolation**: Tests should not depend on each other

### Example Test Structure

```typescript
describe('UserService', () => {
  describe('createUser', () => {
    it('should create a new user with valid data', async () => {
      // Arrange
      const userData = {
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User'
      };

      // Act
      const user = await userService.createUser(userData);

      // Assert
      expect(user.id).toBeDefined();
      expect(user.email).toBe(userData.email);
      expect(user.firstName).toBe(userData.firstName);
    });

    it('should throw error for duplicate email', async () => {
      // Arrange
      const userData = {
        email: 'duplicate@example.com',
        firstName: 'Test',
        lastName: 'User'
      };

      // Act & Assert
      await expect(userService.createUser(userData))
        .rejects.toThrow('Email already exists');
    });
  });
});
```

### Performance Testing

1. **Load Testing**: Use Artillery for API load testing
2. **Benchmarking**: Measure response times and throughput
3. **Monitoring**: Track memory and CPU usage
4. **Alerting**: Set thresholds for performance metrics

### Security Testing

1. **OWASP ZAP**: Automated security scanning
2. **Dependency Audit**: Check for vulnerable dependencies
3. **Code Scanning**: Static analysis for security issues
4. **Penetration Testing**: Manual security testing

## Troubleshooting

### Common Issues

1. **Database Connection**: Ensure test database is running
2. **Port Conflicts**: Use different ports for test services
3. **Memory Issues**: Increase Node.js memory limit
4. **Timeout Errors**: Increase test timeouts

### Debugging Tests

```bash
# Run tests with debug output
DEBUG=* npm test

# Run specific test file
npm test -- test-file.test.js

# Run tests in watch mode
npm run test:watch

# Generate detailed coverage report
npm run test:coverage --reporter=text --reporter=html
```

### Test Database Issues

```bash
# Reset test database
cd apps/api && npx prisma migrate reset --force

# Seed test database
cd apps/api && npm run seed

# Check database connection
cd apps/api && npx prisma db pull
```

## Continuous Improvement

### Metrics to Track

- Test execution time
- Test coverage percentage
- Flaky test rate
- Test failure rate
- Performance benchmarks

### Regular Reviews

1. **Weekly**: Review test coverage and add missing tests
2. **Monthly**: Review test performance and optimize slow tests
3. **Quarterly**: Review test strategy and update as needed

### Test Maintenance

1. **Update Dependencies**: Keep test dependencies up to date
2. **Refactor Tests**: Improve test organization and readability
3. **Add New Tests**: Cover new features and bug fixes
4. **Remove Obsolete Tests**: Clean up unused or redundant tests

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Playwright Documentation](https://playwright.dev/)
- [Artillery Documentation](https://artillery.io/)
- [Jest Documentation](https://jestjs.io/)
- [Testing Best Practices](https://martinfowler.com/articles/unit-testing.html)

---

For more information, see the individual app documentation or contact the development team.
