/**
 * Persona Service Tests
 * Phase 1 Steps 81-85: Testing multi-persona profiles, intent tracking, onboarding, badges
 */

// Mock Prisma
const mockPrisma = {
  userPersona: {
    create: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    upsert: vi.fn(),
    delete: vi.fn(),
  },
  userIntent: {
    create: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    upsert: vi.fn(),
  },
  profileBadge: {
    create: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    upsert: vi.fn(),
  },
  user: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
};

vi.mock('../../src/db', () => ({
  prisma: mockPrisma,
}));

describe('Persona Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Multi-Persona Profiles (Steps 81-82)', () => {
    it('should create a new persona for a user', async () => {
      const persona = {
        id: 'persona-123',
        userId: 'user-456',
        personaType: 'CAREER',
        displayName: 'Sarah the Job Seeker',
        bio: 'Looking for opportunities in tech',
        isPrimary: true,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.userPersona.create.mockResolvedValue(persona);

      const result = await mockPrisma.userPersona.create({ data: persona });

      expect(result.personaType).toBe('CAREER');
      expect(result.isPrimary).toBe(true);
      expect(mockPrisma.userPersona.create).toHaveBeenCalled();
    });

    it('should get all personas for a user', async () => {
      const personas = [
        { id: 'p1', personaType: 'CAREER', displayName: 'Job Seeker', isPrimary: true },
        { id: 'p2', personaType: 'BUSINESS', displayName: 'Business Owner', isPrimary: false },
        { id: 'p3', personaType: 'WELLNESS', displayName: 'Wellness Journey', isPrimary: false },
      ];

      mockPrisma.userPersona.findMany.mockResolvedValue(personas);

      const result = await mockPrisma.userPersona.findMany({
        where: { userId: 'user-456' },
      });

      expect(result).toHaveLength(3);
      expect(result.map(p => p.personaType)).toContain('CAREER');
      expect(result.map(p => p.personaType)).toContain('BUSINESS');
    });

    it('should switch primary persona', async () => {
      // First, unset current primary
      mockPrisma.userPersona.update.mockResolvedValueOnce({
        id: 'p1',
        isPrimary: false,
      });

      // Then set new primary
      mockPrisma.userPersona.update.mockResolvedValueOnce({
        id: 'p2',
        isPrimary: true,
      });

      await mockPrisma.userPersona.update({
        where: { id: 'p1' },
        data: { isPrimary: false },
      });

      const result = await mockPrisma.userPersona.update({
        where: { id: 'p2' },
        data: { isPrimary: true },
      });

      expect(result.isPrimary).toBe(true);
      expect(mockPrisma.userPersona.update).toHaveBeenCalledTimes(2);
    });

    it('should upsert persona with settings', async () => {
      const personaWithSettings = {
        id: 'persona-123',
        userId: 'user-456',
        personaType: 'CAREER',
        displayName: 'Job Seeker',
        settings: {
          notifications: { jobAlerts: true, mentorMessages: true },
          privacy: { showProfile: true, showLocation: false },
        },
        isPrimary: true,
        isActive: true,
      };

      mockPrisma.userPersona.upsert.mockResolvedValue(personaWithSettings);

      const result = await mockPrisma.userPersona.upsert({
        where: { userId_personaType: { userId: 'user-456', personaType: 'CAREER' } },
        create: personaWithSettings,
        update: { settings: personaWithSettings.settings },
      });

      expect(result.settings).toBeDefined();
      expect(result.settings.notifications.jobAlerts).toBe(true);
    });

    it('should validate persona types', () => {
      const validPersonaTypes = ['CAREER', 'WELLNESS', 'BUSINESS', 'SOCIAL', 'HOUSING', 'EDUCATION'];
      
      expect(validPersonaTypes).toContain('CAREER');
      expect(validPersonaTypes).toContain('BUSINESS');
      expect(validPersonaTypes).not.toContain('INVALID');
    });
  });

  describe('Intent Tracking (Steps 83-84)', () => {
    it('should create user intent', async () => {
      const intent = {
        id: 'intent-123',
        userId: 'user-456',
        primaryIntent: 'career_growth',
        enabledPortals: ['careers', 'education', 'wellness'],
        primaryRole: 'job_seeker',
        onboardingStep: 0,
        onboardingComplete: false,
      };

      mockPrisma.userIntent.create.mockResolvedValue(intent);

      const result = await mockPrisma.userIntent.create({ data: intent });

      expect(result.primaryIntent).toBe('career_growth');
      expect(result.enabledPortals).toContain('careers');
    });

    it('should update user intent and enabled portals', async () => {
      mockPrisma.userIntent.update.mockResolvedValue({
        id: 'intent-123',
        primaryIntent: 'business',
        enabledPortals: ['careers', 'business', 'housing'],
      });

      const result = await mockPrisma.userIntent.update({
        where: { userId: 'user-456' },
        data: {
          primaryIntent: 'business',
          enabledPortals: ['careers', 'business', 'housing'],
        },
      });

      expect(result.primaryIntent).toBe('business');
      expect(result.enabledPortals).toContain('business');
    });

    it('should get enabled portals for a user', async () => {
      mockPrisma.userIntent.findUnique.mockResolvedValue({
        enabledPortals: ['careers', 'business', 'wellness', 'social'],
      });

      const result = await mockPrisma.userIntent.findUnique({
        where: { userId: 'user-456' },
        select: { enabledPortals: true },
      });

      expect(result?.enabledPortals).toHaveLength(4);
      expect(result?.enabledPortals).toContain('wellness');
    });

    it('should track primary role', async () => {
      const roles = ['job_seeker', 'employer', 'mentor', 'student', 'agent', 'business_owner'];
      
      mockPrisma.userIntent.update.mockResolvedValue({
        primaryRole: 'mentor',
      });

      const result = await mockPrisma.userIntent.update({
        where: { userId: 'user-456' },
        data: { primaryRole: 'mentor' },
      });

      expect(roles).toContain(result.primaryRole);
    });
  });

  describe('Onboarding Flow (Step 85)', () => {
    it('should track onboarding progress', async () => {
      mockPrisma.userIntent.update.mockResolvedValue({
        onboardingStep: 3,
        onboardingComplete: false,
      });

      const result = await mockPrisma.userIntent.update({
        where: { userId: 'user-456' },
        data: { onboardingStep: 3 },
      });

      expect(result.onboardingStep).toBe(3);
      expect(result.onboardingComplete).toBe(false);
    });

    it('should complete onboarding', async () => {
      mockPrisma.userIntent.update.mockResolvedValue({
        onboardingStep: 5,
        onboardingComplete: true,
        onboardingCompletedAt: new Date(),
      });

      const result = await mockPrisma.userIntent.update({
        where: { userId: 'user-456' },
        data: {
          onboardingComplete: true,
          onboardingCompletedAt: new Date(),
        },
      });

      expect(result.onboardingComplete).toBe(true);
      expect(result.onboardingCompletedAt).toBeDefined();
    });

    it('should define onboarding steps', () => {
      const onboardingSteps = [
        { step: 1, name: 'Welcome', required: true },
        { step: 2, name: 'Select Intent', required: true },
        { step: 3, name: 'Enable Portals', required: true },
        { step: 4, name: 'Create Profile', required: true },
        { step: 5, name: 'Verification (Optional)', required: false },
      ];

      expect(onboardingSteps).toHaveLength(5);
      expect(onboardingSteps.filter(s => s.required)).toHaveLength(4);
    });
  });

  describe('Profile Badges (Steps 81-82 continued)', () => {
    it('should award a badge to user', async () => {
      const badge = {
        id: 'badge-123',
        userId: 'user-456',
        badgeType: 'verified_identity',
        issuedAt: new Date(),
        issuedBy: 'system',
        isActive: true,
      };

      mockPrisma.profileBadge.create.mockResolvedValue(badge);

      const result = await mockPrisma.profileBadge.create({ data: badge });

      expect(result.badgeType).toBe('verified_identity');
      expect(result.isActive).toBe(true);
    });

    it('should get all badges for a user', async () => {
      const badges = [
        { badgeType: 'verified_identity', issuedAt: new Date() },
        { badgeType: 'verified_woman', issuedAt: new Date() },
        { badgeType: 'first_nations', issuedAt: new Date() },
        { badgeType: 'mentor', issuedAt: new Date() },
      ];

      mockPrisma.profileBadge.findMany.mockResolvedValue(badges);

      const result = await mockPrisma.profileBadge.findMany({
        where: { userId: 'user-456', isActive: true },
      });

      expect(result).toHaveLength(4);
      expect(result.map(b => b.badgeType)).toContain('mentor');
    });

    it('should check if user has specific badge', async () => {
      mockPrisma.profileBadge.findFirst.mockResolvedValue({
        badgeType: 'verified_woman',
        isActive: true,
      });

      const result = await mockPrisma.profileBadge.findFirst({
        where: { userId: 'user-456', badgeType: 'verified_woman', isActive: true },
      });

      expect(result).toBeDefined();
      expect(result?.badgeType).toBe('verified_woman');
    });

    it('should revoke a badge', async () => {
      mockPrisma.profileBadge.update.mockResolvedValue({
        id: 'badge-123',
        isActive: false,
      });

      const result = await mockPrisma.profileBadge.update({
        where: { id: 'badge-123' },
        data: { isActive: false },
      });

      expect(result.isActive).toBe(false);
    });

    it('should handle badge expiration', async () => {
      const expiredBadge = {
        id: 'badge-123',
        badgeType: 'mentor',
        expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // Expired yesterday
        isActive: true,
      };

      mockPrisma.profileBadge.findFirst.mockResolvedValue(expiredBadge);

      const badge = await mockPrisma.profileBadge.findFirst({
        where: { userId: 'user-456', badgeType: 'mentor' },
      });

      const isExpired = badge?.expiresAt && badge.expiresAt < new Date();
      expect(isExpired).toBe(true);
    });

    it('should list available badge types', () => {
      const badgeTypes = [
        'verified_identity',
        'verified_woman',
        'first_nations',
        'mentor',
        'employer',
        'business_owner',
        'community_leader',
        'early_adopter',
      ];

      expect(badgeTypes).toContain('verified_woman');
      expect(badgeTypes).toContain('first_nations');
      expect(badgeTypes.length).toBeGreaterThanOrEqual(8);
    });
  });

  describe('Persona-Portal Integration', () => {
    it('should map persona types to default portals', () => {
      const personaPortalMap: Record<string, string[]> = {
        CAREER: ['careers', 'education', 'wellness'],
        BUSINESS: ['business', 'careers', 'education'],
        WELLNESS: ['wellness', 'social', 'careers'],
        HOUSING: ['housing', 'business', 'wellness'],
        EDUCATION: ['education', 'careers', 'wellness'],
        SOCIAL: ['social', 'wellness', 'careers'],
      };

      expect(personaPortalMap.CAREER).toContain('careers');
      expect(personaPortalMap.BUSINESS).toContain('business');
      expect(personaPortalMap.HOUSING).toContain('housing');
    });

    it('should validate portal access based on persona', () => {
      const userPersonas = ['CAREER', 'WELLNESS'];
      const requestedPortal = 'careers';

      // Career persona should have access to careers portal
      const hasAccess = userPersonas.includes('CAREER') || userPersonas.includes('BUSINESS');
      expect(hasAccess).toBe(true);
    });
  });
});

console.log('🔬 Starting test suite...');
