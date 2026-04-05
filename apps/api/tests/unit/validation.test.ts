/**
 * Validation Schema Tests
 * 
 * Unit tests for Zod validation schemas.
 */

import {
  loginSchema,
  registerSchema,
  createJobSchema,
  paginationSchema,
  bookSessionSchema,
} from '../../src/lib/validation';

describe('Validation Schemas', () => {
  describe('loginSchema', () => {
    it('should validate correct login data', () => {
      const result = loginSchema.safeParse({
        email: 'user@example.com',
        password: 'password123',
      });
      
      expect(result.success).toBe(true);
    });

    it('should reject invalid email', () => {
      const result = loginSchema.safeParse({
        email: 'not-an-email',
        password: 'password123',
      });
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('email');
      }
    });

    it('should reject empty password', () => {
      const result = loginSchema.safeParse({
        email: 'user@example.com',
        password: '',
      });
      
      expect(result.success).toBe(false);
    });

    it('should default rememberMe to false', () => {
      const result = loginSchema.parse({
        email: 'user@example.com',
        password: 'password123',
      });
      
      expect(result.rememberMe).toBe(false);
    });
  });

  describe('registerSchema', () => {
    it('should validate correct registration data', () => {
      const result = registerSchema.safeParse({
        email: 'user@example.com',
        password: 'Password123',
        userType: 'MEMBER',
        acceptTerms: true,
      });
      
      expect(result.success).toBe(true);
    });

    it('should reject weak password', () => {
      const result = registerSchema.safeParse({
        email: 'user@example.com',
        password: 'weak',
        userType: 'MEMBER',
        acceptTerms: true,
      });
      
      expect(result.success).toBe(false);
    });

    it('should reject password without uppercase', () => {
      const result = registerSchema.safeParse({
        email: 'user@example.com',
        password: 'password123',
        userType: 'MEMBER',
        acceptTerms: true,
      });
      
      expect(result.success).toBe(false);
    });

    it('should reject if terms not accepted', () => {
      const result = registerSchema.safeParse({
        email: 'user@example.com',
        password: 'Password123',
        userType: 'MEMBER',
        acceptTerms: false,
      });
      
      expect(result.success).toBe(false);
    });

    it('should reject invalid userType', () => {
      const result = registerSchema.safeParse({
        email: 'user@example.com',
        password: 'Password123',
        userType: 'INVALID',
        acceptTerms: true,
      });
      
      expect(result.success).toBe(false);
    });
  });

  describe('createJobSchema', () => {
    const validJob = {
      title: 'Senior Software Engineer',
      description: 'A'.repeat(50), // Min 50 chars
      location: 'Sydney, NSW',
      jobType: 'FULL_TIME',
      industry: 'Technology',
      skills: ['JavaScript', 'TypeScript'],
    };

    it('should validate correct job data', () => {
      const result = createJobSchema.safeParse(validJob);
      expect(result.success).toBe(true);
    });

    it('should reject title too short', () => {
      const result = createJobSchema.safeParse({
        ...validJob,
        title: 'Dev',
      });
      
      expect(result.success).toBe(false);
    });

    it('should reject description too short', () => {
      const result = createJobSchema.safeParse({
        ...validJob,
        description: 'Too short',
      });
      
      expect(result.success).toBe(false);
    });

    it('should reject empty skills array', () => {
      const result = createJobSchema.safeParse({
        ...validJob,
        skills: [],
      });
      
      expect(result.success).toBe(false);
    });

    it('should accept optional salary', () => {
      const result = createJobSchema.safeParse({
        ...validJob,
        salary: {
          min: 80000,
          max: 120000,
          currency: 'AUD',
          period: 'YEAR',
        },
      });
      
      expect(result.success).toBe(true);
    });
  });

  describe('paginationSchema', () => {
    it('should use default values', () => {
      const result = paginationSchema.parse({});
      
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.sortOrder).toBe('desc');
    });

    it('should coerce string numbers', () => {
      const result = paginationSchema.parse({
        page: '5',
        limit: '50',
      });
      
      expect(result.page).toBe(5);
      expect(result.limit).toBe(50);
    });

    it('should reject page less than 1', () => {
      const result = paginationSchema.safeParse({
        page: 0,
      });
      
      expect(result.success).toBe(false);
    });

    it('should reject limit over 100', () => {
      const result = paginationSchema.safeParse({
        limit: 200,
      });
      
      expect(result.success).toBe(false);
    });
  });

  describe('bookSessionSchema', () => {
    it('should validate correct booking data', () => {
      const result = bookSessionSchema.safeParse({
        scheduledAt: new Date().toISOString(),
        duration: 60,
        topic: 'Career guidance',
      });
      
      expect(result.success).toBe(true);
    });

    it('should default duration to 60', () => {
      const result = bookSessionSchema.parse({
        scheduledAt: new Date().toISOString(),
      });
      
      expect(result.duration).toBe(60);
    });

    it('should reject duration less than 15', () => {
      const result = bookSessionSchema.safeParse({
        scheduledAt: new Date().toISOString(),
        duration: 10,
      });
      
      expect(result.success).toBe(false);
    });

    it('should reject duration over 120', () => {
      const result = bookSessionSchema.safeParse({
        scheduledAt: new Date().toISOString(),
        duration: 180,
      });
      
      expect(result.success).toBe(false);
    });
  });
});
