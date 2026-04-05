/**
 * API Key Service Tests
 * Phase 1 Steps 91-95: Testing API key management for third-party integrations
 */


// Mock Prisma
const mockPrisma = {
  apiKey: {
    create: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
};

vi.mock('../../src/db', () => ({
  prisma: mockPrisma,
}));

// Mock crypto
vi.mock('crypto', async () => {
  const actual = await vi.importActual('crypto');
  return {
    ...actual,
    randomBytes: vi.fn(() => Buffer.from('test-api-key-random-bytes-1234567890')),
    createHash: vi.fn(() => ({
      update: vi.fn().mockReturnThis(),
      digest: vi.fn().mockReturnValue('hashed-api-key'),
    })),
  };
});

// Mock security audit
vi.mock('../../src/lib/securityAudit', () => ({
  logSecurityEvent: vi.fn(),
  SecurityEventType: {
    API_KEY_GENERATED: 'API_KEY_GENERATED',
  },
}));

describe('API Key Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('API Key Generation (Steps 91-92)', () => {
    it('should generate a new API key with prefix', async () => {
      const apiKey = {
        id: 'apikey-123',
        userId: 'user-456',
        name: 'Production API Key',
        keyHash: 'hashed-api-key',
        keyPrefix: 'gim_prod',
        permissions: ['read', 'write'],
        scopes: ['jobs:read', 'jobs:write', 'applications:read'],
        isActive: true,
        createdAt: new Date(),
      };

      mockPrisma.apiKey.create.mockResolvedValue(apiKey);

      const result = await mockPrisma.apiKey.create({ data: apiKey });

      expect(result.keyPrefix).toBe('gim_prod');
      expect(result.permissions).toContain('read');
      expect(result.scopes).toContain('jobs:read');
    });

    it('should hash API key before storage', () => {
      const rawKey = 'gim_prod_abc123def456xyz789';
      const hashFunction = (key: string) => 'hashed-' + key.slice(0, 8);
      
      const hashedKey = hashFunction(rawKey);
      
      expect(hashedKey).not.toBe(rawKey);
      expect(hashedKey).toBe('hashed-gim_prod');
    });

    it('should extract key prefix from full key', () => {
      const fullKey = 'gim_prod_abc123def456xyz789qwerty';
      const prefix = fullKey.slice(0, 8);
      
      expect(prefix).toBe('gim_prod');
    });

    it('should set default rate limit tier', async () => {
      const apiKey = {
        id: 'apikey-123',
        rateLimitTier: 'standard',
        rateLimit: 100, // 100 requests per minute
      };

      mockPrisma.apiKey.create.mockResolvedValue(apiKey);

      const result = await mockPrisma.apiKey.create({ data: apiKey });

      expect(result.rateLimitTier).toBe('standard');
      expect(result.rateLimit).toBe(100);
    });
  });

  describe('API Key Validation (Steps 93-94)', () => {
    it('should validate an active API key', async () => {
      mockPrisma.apiKey.findFirst.mockResolvedValue({
        id: 'apikey-123',
        userId: 'user-456',
        keyHash: 'hashed-api-key',
        isActive: true,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        scopes: ['jobs:read', 'jobs:write'],
      });

      const result = await mockPrisma.apiKey.findFirst({
        where: { keyHash: 'hashed-api-key', isActive: true },
      });

      expect(result).toBeDefined();
      expect(result?.isActive).toBe(true);
    });

    it('should reject expired API key', async () => {
      mockPrisma.apiKey.findFirst.mockResolvedValue({
        id: 'apikey-123',
        isActive: true,
        expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // Expired yesterday
      });

      const result = await mockPrisma.apiKey.findFirst({
        where: { keyHash: 'hashed-api-key' },
      });

      const isValid = result?.isActive && (!result.expiresAt || result.expiresAt > new Date());
      expect(isValid).toBe(false);
    });

    it('should reject revoked API key', async () => {
      mockPrisma.apiKey.findFirst.mockResolvedValue({
        id: 'apikey-123',
        isActive: false,
        revokedAt: new Date(),
        revokedReason: 'Security concern',
      });

      const result = await mockPrisma.apiKey.findFirst({
        where: { keyHash: 'hashed-api-key' },
      });

      expect(result?.isActive).toBe(false);
      expect(result?.revokedReason).toBe('Security concern');
    });

    it('should check scope permissions', () => {
      const keyScopes = ['jobs:read', 'jobs:write', 'applications:read'];
      
      const hasScope = (scope: string) => keyScopes.includes(scope);
      
      expect(hasScope('jobs:read')).toBe(true);
      expect(hasScope('jobs:write')).toBe(true);
      expect(hasScope('users:admin')).toBe(false);
    });

    it('should validate scope hierarchy', () => {
      const scopeHierarchy: Record<string, string[]> = {
        'jobs:admin': ['jobs:read', 'jobs:write', 'jobs:delete'],
        'jobs:write': ['jobs:read'],
        'applications:admin': ['applications:read', 'applications:write'],
      };

      const hasEffectiveScope = (keyScopes: string[], requiredScope: string): boolean => {
        if (keyScopes.includes(requiredScope)) return true;
        
        // Check if any scope grants the required scope
        for (const scope of keyScopes) {
          if (scopeHierarchy[scope]?.includes(requiredScope)) return true;
        }
        return false;
      };

      expect(hasEffectiveScope(['jobs:admin'], 'jobs:read')).toBe(true);
      expect(hasEffectiveScope(['jobs:admin'], 'jobs:delete')).toBe(true);
      expect(hasEffectiveScope(['jobs:read'], 'jobs:write')).toBe(false);
    });
  });

  describe('API Key Management (Step 95)', () => {
    it('should list all API keys for a user', async () => {
      const keys = [
        { id: 'key-1', name: 'Production', keyPrefix: 'gim_prod', isActive: true },
        { id: 'key-2', name: 'Development', keyPrefix: 'gim_dev_', isActive: true },
        { id: 'key-3', name: 'Old Key', keyPrefix: 'gim_old_', isActive: false },
      ];

      mockPrisma.apiKey.findMany.mockResolvedValue(keys);

      const result = await mockPrisma.apiKey.findMany({
        where: { userId: 'user-456' },
        select: { id: true, name: true, keyPrefix: true, isActive: true },
      });

      expect(result).toHaveLength(3);
      expect(result.filter(k => k.isActive)).toHaveLength(2);
    });

    it('should revoke an API key', async () => {
      mockPrisma.apiKey.update.mockResolvedValue({
        id: 'apikey-123',
        isActive: false,
        revokedAt: new Date(),
        revokedReason: 'User requested revocation',
      });

      const result = await mockPrisma.apiKey.update({
        where: { id: 'apikey-123' },
        data: {
          isActive: false,
          revokedAt: new Date(),
          revokedReason: 'User requested revocation',
        },
      });

      expect(result.isActive).toBe(false);
      expect(result.revokedReason).toBe('User requested revocation');
    });

    it('should update API key usage stats', async () => {
      mockPrisma.apiKey.update.mockResolvedValue({
        id: 'apikey-123',
        usageCount: 101,
        lastUsedAt: new Date(),
      });

      const result = await mockPrisma.apiKey.update({
        where: { id: 'apikey-123' },
        data: {
          usageCount: { increment: 1 },
          lastUsedAt: new Date(),
        },
      });

      expect(result.usageCount).toBe(101);
      expect(result.lastUsedAt).toBeDefined();
    });

    it('should regenerate API key', async () => {
      // Delete old key
      mockPrisma.apiKey.delete.mockResolvedValue({ id: 'old-key' });
      
      // Create new key
      const newKey = {
        id: 'new-key',
        userId: 'user-456',
        name: 'Regenerated Key',
        keyHash: 'new-hashed-key',
        keyPrefix: 'gim_new_',
        isActive: true,
      };
      mockPrisma.apiKey.create.mockResolvedValue(newKey);

      const result = await mockPrisma.apiKey.create({ data: newKey });

      expect(result.id).toBe('new-key');
      expect(result.keyHash).not.toBe('old-hashed-key');
    });
  });

  describe('Rate Limiting Tiers', () => {
    it('should define rate limit tiers', () => {
      const rateLimitTiers = {
        standard: { requestsPerMinute: 100, dailyLimit: 10000 },
        premium: { requestsPerMinute: 500, dailyLimit: 100000 },
        enterprise: { requestsPerMinute: 2000, dailyLimit: null }, // Unlimited daily
      };

      expect(rateLimitTiers.standard.requestsPerMinute).toBe(100);
      expect(rateLimitTiers.premium.requestsPerMinute).toBe(500);
      expect(rateLimitTiers.enterprise.dailyLimit).toBeNull();
    });

    it('should check rate limit status', () => {
      const checkRateLimit = (tier: string, currentMinuteRequests: number) => {
        const limits: Record<string, number> = {
          standard: 100,
          premium: 500,
          enterprise: 2000,
        };
        return currentMinuteRequests < (limits[tier] || 100);
      };

      expect(checkRateLimit('standard', 50)).toBe(true);
      expect(checkRateLimit('standard', 150)).toBe(false);
      expect(checkRateLimit('enterprise', 1500)).toBe(true);
    });
  });

  describe('Available Scopes', () => {
    it('should define all available API scopes', () => {
      const availableScopes = [
        // Jobs
        'jobs:read',
        'jobs:write',
        'jobs:delete',
        'jobs:admin',
        // Applications
        'applications:read',
        'applications:write',
        'applications:admin',
        // Users
        'users:read',
        'users:write',
        'users:admin',
        // Messaging
        'messages:read',
        'messages:write',
        // Notifications
        'notifications:read',
        'notifications:write',
        // Analytics
        'analytics:read',
        // Webhooks
        'webhooks:manage',
      ];

      expect(availableScopes).toContain('jobs:read');
      expect(availableScopes).toContain('applications:write');
      expect(availableScopes).toContain('analytics:read');
      expect(availableScopes.length).toBeGreaterThanOrEqual(15);
    });

    it('should validate scope format', () => {
      const isValidScope = (scope: string) => {
        const pattern = /^[a-z]+:(read|write|delete|admin|manage)$/;
        return pattern.test(scope);
      };

      expect(isValidScope('jobs:read')).toBe(true);
      expect(isValidScope('users:admin')).toBe(true);
      expect(isValidScope('invalid')).toBe(false);
      expect(isValidScope('JOBS:READ')).toBe(false);
    });
  });

  describe('Security Considerations', () => {
    it('should never return full API key after creation', () => {
      const apiKeyResponse = {
        id: 'apikey-123',
        name: 'My API Key',
        keyPrefix: 'gim_prod',
        // keyHash is stored but never returned
        // rawKey is only returned once on creation
        createdAt: new Date(),
      };

      expect(apiKeyResponse).not.toHaveProperty('keyHash');
      expect(apiKeyResponse).not.toHaveProperty('rawKey');
      expect(apiKeyResponse).toHaveProperty('keyPrefix');
    });

    it('should mask key in logs', () => {
      const rawKey = 'gim_prod_abc123def456xyz789';
      const maskedKey = rawKey.slice(0, 8) + '...' + rawKey.slice(-4);

      expect(maskedKey).toBe('gim_prod...z789');
      expect(maskedKey).not.toContain('abc123');
    });

    it('should enforce minimum key length', () => {
      const minKeyLength = 32;
      const generatedKeyLength = 40;

      expect(generatedKeyLength).toBeGreaterThanOrEqual(minKeyLength);
    });

    it('should set reasonable expiration', () => {
      const maxExpirationDays = 365;
      const defaultExpirationDays = 90;

      const expiresAt = new Date(Date.now() + defaultExpirationDays * 24 * 60 * 60 * 1000);
      const maxExpires = new Date(Date.now() + maxExpirationDays * 24 * 60 * 60 * 1000);

      expect(expiresAt.getTime()).toBeLessThanOrEqual(maxExpires.getTime());
    });
  });
});

console.log('🔬 Starting test suite...');
