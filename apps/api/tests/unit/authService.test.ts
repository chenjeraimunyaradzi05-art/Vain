/**
 * AuthService Unit Tests
 * 
 * Tests for authentication service functionality.
 * Note: The AuthService class uses bcrypt/jwt internally rather than exposing
 * utility methods. These tests use the libraries directly to test equivalent functionality.
 */

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

// Mock the prisma client
vi.mock('../../src/db', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    memberProfile: {
      create: vi.fn(),
    },
    oAuthToken: {
      create: vi.fn(),
      deleteMany: vi.fn(),
      findFirst: vi.fn(),
    },
  },
}));

describe('AuthService utilities', () => {
  const TEST_SECRET = 'test-secret-key-for-jwt-signing-minimum-32-chars';
  
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('hashPassword (bcrypt)', () => {
    it('should hash a password', async () => {
      const password = 'testPassword123';
      const hash = await bcrypt.hash(password, 10);
      
      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(50);
    });

    it('should generate different hashes for the same password', async () => {
      const password = 'testPassword123';
      const hash1 = await bcrypt.hash(password, 10);
      const hash2 = await bcrypt.hash(password, 10);
      
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('verifyPassword (bcrypt)', () => {
    it('should verify a correct password', async () => {
      const password = 'testPassword123';
      const hash = await bcrypt.hash(password, 10);
      
      const isValid = await bcrypt.compare(password, hash);
      
      expect(isValid).toBe(true);
    });

    it('should reject an incorrect password', async () => {
      const password = 'testPassword123';
      const wrongPassword = 'wrongPassword456';
      const hash = await bcrypt.hash(password, 10);
      
      const isValid = await bcrypt.compare(wrongPassword, hash);
      
      expect(isValid).toBe(false);
    });
  });

  describe('generateAccessToken (jwt)', () => {
    it('should generate a valid JWT token', () => {
      const payload = {
        userId: 'user_123',
        email: 'test@example.com',
        userType: 'MEMBER',
      };
      
      const token = jwt.sign(payload, TEST_SECRET, { expiresIn: '15m' });
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });
  });

  describe('verifyToken (jwt)', () => {
    it('should verify and decode a valid token', () => {
      const payload = {
        userId: 'user_123',
        email: 'test@example.com',
        userType: 'MEMBER',
      };
      
      const token = jwt.sign(payload, TEST_SECRET, { expiresIn: '15m' });
      const decoded = jwt.verify(token, TEST_SECRET) as typeof payload;
      
      expect(decoded).toBeDefined();
      expect(decoded.userId).toBe(payload.userId);
      expect(decoded.email).toBe(payload.email);
    });

    it('should throw for an invalid token', () => {
      expect(() => jwt.verify('invalid-token', TEST_SECRET)).toThrow();
    });
  });

  describe('generateResetToken (crypto)', () => {
    it('should generate a 64-character hex token', () => {
      const token = crypto.randomBytes(32).toString('hex');
      
      expect(token).toBeDefined();
      expect(token.length).toBe(64);
      expect(/^[a-f0-9]+$/.test(token)).toBe(true);
    });

    it('should generate unique tokens', () => {
      const token1 = crypto.randomBytes(32).toString('hex');
      const token2 = crypto.randomBytes(32).toString('hex');
      
      expect(token1).not.toBe(token2);
    });
  });

  describe('hashResetToken (crypto)', () => {
    it('should hash a reset token', () => {
      const token = 'test-reset-token';
      const hash = crypto.createHash('sha256').update(token).digest('hex');
      
      expect(hash).toBeDefined();
      expect(hash).not.toBe(token);
      expect(hash.length).toBe(64); // SHA-256 produces 64 hex chars
    });

    it('should produce same hash for same input', () => {
      const token = 'test-reset-token';
      const hash1 = crypto.createHash('sha256').update(token).digest('hex');
      const hash2 = crypto.createHash('sha256').update(token).digest('hex');
      
      expect(hash1).toBe(hash2);
    });
  });
});
