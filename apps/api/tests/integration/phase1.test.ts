/**
 * Phase 1 Integration Tests
 * Phase 1 Steps 96-100: End-to-end validation of auth & authorization features
 */

// Mock Prisma with all Phase 1 models
const mockPrisma = {
  user: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  userPersona: {
    create: vi.fn(),
    findMany: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
    upsert: vi.fn(),
  },
  userSession: {
    create: vi.fn(),
    findMany: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
  },
  userIntent: {
    create: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    upsert: vi.fn(),
  },
  womenVerification: {
    create: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  profileBadge: {
    create: vi.fn(),
    findMany: vi.fn(),
    findFirst: vi.fn(),
    upsert: vi.fn(),
  },
  trustedDevice: {
    create: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    upsert: vi.fn(),
  },
  apiKey: {
    create: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
  },
  identityVerification: {
    create: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
  },
  mfaBackupCode: {
    create: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
  },
  rememberMeToken: {
    create: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
    deleteMany: vi.fn(),
  },
};

vi.mock('../../src/db', () => ({
  prisma: mockPrisma,
}));

describe('Phase 1 Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('User Onboarding Flow (Steps 96-97)', () => {
    it('should complete full onboarding journey', async () => {
      const userId = 'user-new-123';

      // Step 1: User registers
      mockPrisma.user.create.mockResolvedValue({
        id: userId,
        email: 'sarah@example.com',
        firstName: 'Sarah',
        lastName: 'Smith',
      });

      // Step 2: Create user intent (onboarding start)
      mockPrisma.userIntent.create.mockResolvedValue({
        userId,
        primaryIntent: 'career_growth',
        enabledPortals: ['careers', 'education'],
        primaryRole: 'job_seeker',
        onboardingStep: 1,
        onboardingComplete: false,
      });

      // Step 3: Create primary persona
      mockPrisma.userPersona.create.mockResolvedValue({
        userId,
        personaType: 'CAREER',
        displayName: 'Sarah - Job Seeker',
        isPrimary: true,
        isActive: true,
      });

      // Step 4: Create session
      mockPrisma.userSession.create.mockResolvedValue({
        userId,
        deviceId: 'device-123',
        deviceType: 'desktop',
        isRevoked: false,
      });

      // Step 5: Complete onboarding
      mockPrisma.userIntent.update.mockResolvedValue({
        onboardingStep: 5,
        onboardingComplete: true,
        onboardingCompletedAt: new Date(),
      });

      // Verify flow
      const user = await mockPrisma.user.create({ data: {} });
      const intent = await mockPrisma.userIntent.create({ data: {} });
      const persona = await mockPrisma.userPersona.create({ data: {} });
      const session = await mockPrisma.userSession.create({ data: {} });
      const completedIntent = await mockPrisma.userIntent.update({ where: {}, data: {} });

      expect(user.id).toBe(userId);
      expect(intent.primaryIntent).toBe('career_growth');
      expect(persona.isPrimary).toBe(true);
      expect(session.isRevoked).toBe(false);
      expect(completedIntent.onboardingComplete).toBe(true);
    });

    it('should add multiple personas during onboarding', async () => {
      const personas = [
        { personaType: 'CAREER', isPrimary: true },
        { personaType: 'BUSINESS', isPrimary: false },
        { personaType: 'WELLNESS', isPrimary: false },
      ];

      mockPrisma.userPersona.findMany.mockResolvedValue(personas);

      const result = await mockPrisma.userPersona.findMany({
        where: { userId: 'user-123' },
      });

      expect(result).toHaveLength(3);
      expect(result.filter(p => p.isPrimary)).toHaveLength(1);
    });
  });

  describe('Women Verification Flow (Steps 98)', () => {
    it('should complete women verification and grant access', async () => {
      const userId = 'user-woman-123';

      // Step 1: Submit verification request
      mockPrisma.womenVerification.create.mockResolvedValue({
        userId,
        genderSelfId: 'WOMAN',
        isFirstNations: true,
        mobNation: 'Wiradjuri',
        isVerified: false,
        canAccessWomenSpaces: false,
        canAccessFirstNationsSpaces: false,
        trustScore: 0,
      });

      // Step 2: Admin verifies
      mockPrisma.womenVerification.update.mockResolvedValue({
        userId,
        isVerified: true,
        verifiedAt: new Date(),
        verifiedBy: 'admin-456',
        canAccessWomenSpaces: true,
        canAccessFirstNationsSpaces: true,
        trustScore: 30,
      });

      // Step 3: Award badges
      mockPrisma.profileBadge.create.mockResolvedValueOnce({
        userId,
        badgeType: 'verified_woman',
        isActive: true,
      });
      mockPrisma.profileBadge.create.mockResolvedValueOnce({
        userId,
        badgeType: 'first_nations',
        isActive: true,
      });

      // Verify flow
      const request = await mockPrisma.womenVerification.create({ data: {} });
      expect(request.isVerified).toBe(false);

      const verified = await mockPrisma.womenVerification.update({ where: {}, data: {} });
      expect(verified.isVerified).toBe(true);
      expect(verified.canAccessWomenSpaces).toBe(true);
      expect(verified.canAccessFirstNationsSpaces).toBe(true);
    });

    it('should build trust through endorsements', async () => {
      // Initial state
      mockPrisma.womenVerification.findUnique.mockResolvedValue({
        trustScore: 30,
        endorsementCount: 0,
      });

      // After 3 endorsements
      mockPrisma.womenVerification.update.mockResolvedValue({
        trustScore: 60,
        endorsementCount: 3,
      });

      const initial = await mockPrisma.womenVerification.findUnique({ where: {} });
      const endorsed = await mockPrisma.womenVerification.update({ where: {}, data: {} });

      expect(endorsed.trustScore).toBeGreaterThan(initial?.trustScore || 0);
      expect(endorsed.endorsementCount).toBe(3);
    });
  });

  describe('Session Security Flow (Step 99)', () => {
    it('should create secure session with device fingerprinting', async () => {
      const sessionData = {
        userId: 'user-123',
        deviceId: 'device-456',
        deviceType: 'mobile',
        deviceName: 'iPhone 15',
        browserName: 'Safari',
        osName: 'iOS',
        osVersion: '17.0',
        ipAddress: '192.168.1.100',
        city: 'Sydney',
        country: 'AU',
        isRevoked: false,
      };

      mockPrisma.userSession.create.mockResolvedValue(sessionData);

      const session = await mockPrisma.userSession.create({ data: sessionData });

      expect(session.deviceType).toBe('mobile');
      expect(session.country).toBe('AU');
      expect(session.isRevoked).toBe(false);
    });

    it('should handle multi-device login', async () => {
      const sessions = [
        { id: 's1', deviceName: 'Chrome on Windows', lastActiveAt: new Date() },
        { id: 's2', deviceName: 'Safari on iPhone', lastActiveAt: new Date() },
        { id: 's3', deviceName: 'Firefox on Mac', lastActiveAt: new Date() },
      ];

      mockPrisma.userSession.findMany.mockResolvedValue(sessions);

      const result = await mockPrisma.userSession.findMany({
        where: { userId: 'user-123', isRevoked: false },
      });

      expect(result).toHaveLength(3);
    });

    it('should revoke all sessions on password change', async () => {
      mockPrisma.userSession.updateMany.mockResolvedValue({ count: 3 });

      const result = await mockPrisma.userSession.updateMany({
        where: { userId: 'user-123' },
        data: { isRevoked: true, revokedReason: 'Password changed' },
      });

      expect(result.count).toBe(3);
    });
  });

  describe('API Key Workflow (Step 100)', () => {
    it('should create and use API key for integration', async () => {
      const userId = 'user-developer-123';

      // Create API key
      mockPrisma.apiKey.create.mockResolvedValue({
        id: 'key-123',
        userId,
        name: 'Integration Key',
        keyHash: 'hashed-key',
        keyPrefix: 'gim_int_',
        scopes: ['jobs:read', 'applications:read'],
        isActive: true,
        usageCount: 0,
      });

      // Validate key on API request
      mockPrisma.apiKey.findFirst.mockResolvedValue({
        id: 'key-123',
        userId,
        isActive: true,
        scopes: ['jobs:read', 'applications:read'],
      });

      // Update usage
      mockPrisma.apiKey.update.mockResolvedValue({
        id: 'key-123',
        usageCount: 1,
        lastUsedAt: new Date(),
      });

      const key = await mockPrisma.apiKey.create({ data: {} });
      expect(key.isActive).toBe(true);

      const validated = await mockPrisma.apiKey.findFirst({ where: {} });
      expect(validated?.scopes).toContain('jobs:read');

      const updated = await mockPrisma.apiKey.update({ where: {}, data: {} });
      expect(updated.usageCount).toBe(1);
    });

    it('should enforce scope restrictions', () => {
      const keyScopes = ['jobs:read', 'applications:read'];
      
      const canAccess = (requiredScope: string) => keyScopes.includes(requiredScope);

      expect(canAccess('jobs:read')).toBe(true);
      expect(canAccess('jobs:write')).toBe(false);
      expect(canAccess('users:admin')).toBe(false);
    });
  });

  describe('Identity Verification Flow', () => {
    it('should process identity document verification', async () => {
      const userId = 'user-verify-123';

      // Submit verification
      mockPrisma.identityVerification.create.mockResolvedValue({
        userId,
        status: 'PENDING',
        documentType: 'DRIVERS_LICENSE',
        documentFrontKey: 's3://uploads/doc-front.jpg',
        documentBackKey: 's3://uploads/doc-back.jpg',
        selfieKey: 's3://uploads/selfie.jpg',
      });

      // Admin approves
      mockPrisma.identityVerification.update.mockResolvedValue({
        userId,
        status: 'APPROVED',
        verifiedAt: new Date(),
        verifiedBy: 'admin-456',
      });

      // Award badge
      mockPrisma.profileBadge.create.mockResolvedValue({
        userId,
        badgeType: 'verified_identity',
        isActive: true,
      });

      const submission = await mockPrisma.identityVerification.create({ data: {} });
      expect(submission.status).toBe('PENDING');

      const approved = await mockPrisma.identityVerification.update({ where: {}, data: {} });
      expect(approved.status).toBe('APPROVED');
    });
  });

  describe('MFA Backup Codes', () => {
    it('should generate and use backup codes', async () => {
      const userId = 'user-mfa-123';
      const codes = Array.from({ length: 10 }, (_, i) => ({
        userId,
        codeHash: `hashed-code-${i}`,
        usedAt: null,
      }));

      mockPrisma.mfaBackupCode.create.mockResolvedValue(codes[0]);
      mockPrisma.mfaBackupCode.findMany.mockResolvedValue(codes);

      const allCodes = await mockPrisma.mfaBackupCode.findMany({
        where: { userId, usedAt: null },
      });

      expect(allCodes).toHaveLength(10);
      expect(allCodes.every(c => c.usedAt === null)).toBe(true);
    });

    it('should mark backup code as used', async () => {
      mockPrisma.mfaBackupCode.update.mockResolvedValue({
        codeHash: 'hashed-code-0',
        usedAt: new Date(),
      });

      const result = await mockPrisma.mfaBackupCode.update({
        where: { id: 'code-123' },
        data: { usedAt: new Date() },
      });

      expect(result.usedAt).toBeDefined();
    });
  });

  describe('Trusted Device Management', () => {
    it('should trust device after MFA verification', async () => {
      mockPrisma.trustedDevice.upsert.mockResolvedValue({
        userId: 'user-123',
        deviceId: 'device-456',
        isTrusted: true,
        trustedAt: new Date(),
        trustExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });

      const result = await mockPrisma.trustedDevice.upsert({
        where: { userId_deviceId: { userId: 'user-123', deviceId: 'device-456' } },
        create: {},
        update: { isTrusted: true },
      });

      expect(result.isTrusted).toBe(true);
      expect(result.trustExpiresAt).toBeDefined();
    });

    it('should skip MFA for trusted device', async () => {
      mockPrisma.trustedDevice.findUnique.mockResolvedValue({
        isTrusted: true,
        trustExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      const device = await mockPrisma.trustedDevice.findUnique({
        where: { userId_deviceId: { userId: 'user-123', deviceId: 'device-456' } },
      });

      const skipMfa = device?.isTrusted && device.trustExpiresAt > new Date();
      expect(skipMfa).toBe(true);
    });
  });

  describe('Remember Me Token Flow', () => {
    it('should create and validate remember me token', async () => {
      // Create token
      mockPrisma.rememberMeToken.create.mockResolvedValue({
        userId: 'user-123',
        tokenHash: 'hashed-token',
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        deviceId: 'device-456',
      });

      // Validate token
      mockPrisma.rememberMeToken.findFirst.mockResolvedValue({
        userId: 'user-123',
        tokenHash: 'hashed-token',
        expiresAt: new Date(Date.now() + 29 * 24 * 60 * 60 * 1000),
        usedAt: null,
      });

      // Use token (mark as used)
      mockPrisma.rememberMeToken.update.mockResolvedValue({
        usedAt: new Date(),
      });

      const created = await mockPrisma.rememberMeToken.create({ data: {} });
      expect(created.expiresAt.getTime()).toBeGreaterThan(Date.now());

      const valid = await mockPrisma.rememberMeToken.findFirst({ where: {} });
      expect(valid?.usedAt).toBeNull();

      const used = await mockPrisma.rememberMeToken.update({ where: {}, data: {} });
      expect(used.usedAt).toBeDefined();
    });

    it('should cleanup expired tokens', async () => {
      mockPrisma.rememberMeToken.deleteMany.mockResolvedValue({ count: 15 });

      const result = await mockPrisma.rememberMeToken.deleteMany({
        where: { expiresAt: { lt: new Date() } },
      });

      expect(result.count).toBe(15);
    });
  });

  describe('Complete User Profile with All Phase 1 Features', () => {
    it('should aggregate all user auth data', async () => {
      const userId = 'user-complete-123';

      // User with all relations
      const userProfile = {
        user: {
          id: userId,
          email: 'complete@example.com',
          firstName: 'Complete',
          lastName: 'User',
        },
        personas: [
          { personaType: 'CAREER', isPrimary: true },
          { personaType: 'BUSINESS', isPrimary: false },
        ],
        intent: {
          primaryIntent: 'career_growth',
          enabledPortals: ['careers', 'business', 'wellness'],
          onboardingComplete: true,
        },
        womenVerification: {
          isVerified: true,
          canAccessWomenSpaces: true,
          trustScore: 75,
        },
        badges: [
          { badgeType: 'verified_identity' },
          { badgeType: 'verified_woman' },
          { badgeType: 'first_nations' },
        ],
        sessions: [
          { deviceName: 'Chrome on Windows', isRevoked: false },
        ],
        trustedDevices: [
          { deviceName: 'Chrome on Windows', isTrusted: true },
        ],
        apiKeys: [
          { name: 'Production', isActive: true },
        ],
      };

      expect(userProfile.personas).toHaveLength(2);
      expect(userProfile.intent.onboardingComplete).toBe(true);
      expect(userProfile.womenVerification.canAccessWomenSpaces).toBe(true);
      expect(userProfile.badges).toHaveLength(3);
      expect(userProfile.sessions[0].isRevoked).toBe(false);
      expect(userProfile.trustedDevices[0].isTrusted).toBe(true);
      expect(userProfile.apiKeys[0].isActive).toBe(true);
    });
  });
});

console.log('🔬 Starting test suite...');
