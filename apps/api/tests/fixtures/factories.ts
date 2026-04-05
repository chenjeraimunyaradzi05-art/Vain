/**
 * Test Fixtures and Factories
 * 
 * Provides consistent test data for unit and integration tests.
 */

/**
 * Create a test user object
 */
export function createTestUser(overrides: Partial<TestUser> = {}): TestUser {
  const timestamp = Date.now();
  return {
    id: `user_${timestamp}`,
    email: `test-${timestamp}@example.com`,
    password: 'password123',
    userType: 'MEMBER',
    createdAt: new Date(),
    updatedAt: new Date(),
    twoFactorEnabled: false,
    failedLoginAttempts: 0,
    ...overrides,
  };
}

/**
 * Create a test job object
 */
export function createTestJob(companyId: string, overrides: Partial<TestJob> = {}): TestJob {
  const timestamp = Date.now();
  return {
    id: `job_${timestamp}`,
    title: 'Test Job Position',
    description: 'This is a test job description for testing purposes.',
    location: 'Sydney, NSW',
    salary: '$80,000 - $100,000',
    jobType: 'FULL_TIME',
    status: 'ACTIVE',
    companyId,
    isIndigenousDesignated: false,
    isFeatured: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Create a test company profile
 */
export function createTestCompany(userId: string, overrides: Partial<TestCompany> = {}): TestCompany {
  const timestamp = Date.now();
  return {
    id: `company_${timestamp}`,
    userId,
    companyName: 'Test Company Pty Ltd',
    industry: 'Technology',
    website: 'https://testcompany.example.com',
    description: 'A test company for testing purposes.',
    isVerified: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Create a test job application
 */
export function createTestApplication(
  jobId: string,
  userId: string,
  overrides: Partial<TestApplication> = {}
): TestApplication {
  const timestamp = Date.now();
  return {
    id: `app_${timestamp}`,
    jobId,
    userId,
    status: 'SUBMITTED',
    coverLetter: 'I am very interested in this position.',
    resumeUrl: 'https://example.com/resume.pdf',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Create test auth tokens
 */
export function createTestTokens(): TestTokens {
  return {
    accessToken: 'test-access-token-' + Date.now(),
    refreshToken: 'test-refresh-token-' + Date.now(),
    expiresIn: 900,
  };
}

/**
 * Generate a test JWT auth token for a user
 * Uses the same JWT secret as the application (from environment)
 */
export async function generateAuthToken(user: TestUser | { id: string; email: string; userType: string }): Promise<string> {
  // Import jwt dynamically to avoid circular dependencies
  const jwt = await import('jsonwebtoken');
  
  const secret = process.env.JWT_SECRET || 'test-secret-key-for-testing-min-32-chars';
  
  return jwt.default.sign(
    {
      userId: user.id,
      email: user.email,
      role: user.userType,
    },
    secret,
    { expiresIn: '15m' }
  );
}

/**
 * Create test request headers with auth
 */
export function createAuthHeaders(token: string): Record<string, string> {
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

// Type definitions
export interface TestUser {
  id: string;
  email: string;
  password: string;
  userType: string;
  createdAt: Date;
  updatedAt: Date;
  twoFactorEnabled: boolean;
  failedLoginAttempts: number;
  lockedUntil?: Date;
}

export interface TestJob {
  id: string;
  title: string;
  description: string;
  location: string;
  salary: string;
  jobType: string;
  status: string;
  companyId: string;
  isIndigenousDesignated: boolean;
  isFeatured: boolean;
  closingDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface TestCompany {
  id: string;
  userId: string;
  companyName: string;
  industry: string;
  website: string;
  description: string;
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TestApplication {
  id: string;
  jobId: string;
  userId: string;
  status: string;
  coverLetter: string;
  resumeUrl: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TestTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}
