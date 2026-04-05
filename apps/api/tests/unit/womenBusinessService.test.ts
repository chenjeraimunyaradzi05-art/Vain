/**
 * Women Business Service Tests
 * Phase 2 Steps 151-175
 */

import type { BusinessStage, WomenBusinessType } from '@prisma/client';
import {
  createBusiness,
  publishBusiness,
  addProduct,
  createGoal,
  updateGoalProgress,
  getBusinessStats,
} from '../../src/services/womenBusiness';
function createMockPrisma() {
  return {
  womenBusiness: {
    create: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
  },
  womenBusinessProduct: {
    create: jest.fn(),
    count: jest.fn(),
    findMany: jest.fn(),
  },
  womenBusinessService: {
    create: jest.fn(),
    count: jest.fn(),
    findMany: jest.fn(),
  },
  businessGoal: {
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
  },
  businessMilestone: {
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
  },
  };
}

jest.mock('../../src/db', () => {
  const prisma = createMockPrisma();
  return { prisma };
});

const { prisma: mockPrisma } = jest.requireMock('../../src/db') as {
  prisma: ReturnType<typeof createMockPrisma>;
};

const businessType = 'SERVICE' as unknown as WomenBusinessType;
const stage = 'IDEA' as unknown as BusinessStage;

describe('womenBusinessService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a business with defaults and unpublished state', async () => {
    mockPrisma.womenBusiness.create.mockResolvedValue({ id: 'biz-1', isPublished: false, stage });

    const business = await createBusiness('owner-1', {
      name: 'First Nations Shop',
      businessType,
      industry: 'Retail',
    });

    expect(mockPrisma.womenBusiness.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          ownerId: 'owner-1',
          stage: 'IDEA',
          isPublished: false,
        }),
      })
    );
    expect(business.isPublished).toBe(false);
  });

  it('throws when publishing without required fields', async () => {
    mockPrisma.womenBusiness.findFirst.mockResolvedValue({
      id: 'biz-1',
      ownerId: 'owner-1',
      name: '',
      industry: '',
    });

    await expect(publishBusiness('biz-1', 'owner-1')).rejects.toThrow(
      'Please complete required fields before publishing'
    );
  });

  it('adds a product and increments product count', async () => {
    mockPrisma.womenBusiness.findFirst.mockResolvedValue({ id: 'biz-1', ownerId: 'owner-1' });
    mockPrisma.womenBusinessProduct.create.mockResolvedValue({ id: 'prod-1' });
    mockPrisma.womenBusiness.update.mockResolvedValue({});

    await addProduct('owner-1', {
      businessId: 'biz-1',
      name: 'Product',
    });

    expect(mockPrisma.womenBusinessProduct.create).toHaveBeenCalled();
    expect(mockPrisma.womenBusiness.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'biz-1' },
        data: { productCount: { increment: 1 } },
      })
    );
  });

  it('requires a goal category or goal type when creating goals', async () => {
    mockPrisma.womenBusiness.findFirst.mockResolvedValue({ id: 'biz-1', ownerId: 'owner-1' });

    await expect(
      createGoal('owner-1', {
        businessId: 'biz-1',
        title: 'Grow revenue',
      })
    ).rejects.toThrow('Goal category is required');
  });

  it('marks goals as completed when progress meets target', async () => {
    mockPrisma.businessGoal.findUnique.mockResolvedValue({
      id: 'goal-1',
      targetValue: 10,
      business: { ownerId: 'owner-1' },
    });
    mockPrisma.businessGoal.update.mockResolvedValue({ status: 'completed', currentValue: 12 });

    const result = await updateGoalProgress('goal-1', 'owner-1', 12);

    expect(mockPrisma.businessGoal.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'completed' }),
      })
    );
    expect(result.status).toBe('completed');
  });

  it('returns aggregated business stats', async () => {
    mockPrisma.womenBusiness.findFirst.mockResolvedValue({
      id: 'biz-1',
      ownerId: 'owner-1',
      followerCount: 5,
      stage: 'GROWTH',
    });
    mockPrisma.womenBusinessProduct.count.mockResolvedValue(1);
    mockPrisma.womenBusinessService.count.mockResolvedValue(2);
    mockPrisma.businessGoal.count.mockResolvedValueOnce(3); // total goals
    mockPrisma.businessMilestone.count.mockResolvedValue(4);
    mockPrisma.businessGoal.count.mockResolvedValueOnce(2); // active goals
    mockPrisma.businessGoal.count.mockResolvedValueOnce(1); // completed goals

    const stats = await getBusinessStats('biz-1', 'owner-1');

    expect(stats).toEqual({
      products: 1,
      services: 2,
      goals: 3,
      milestones: 4,
      activeGoals: 2,
      completedGoals: 1,
      followerCount: 5,
      stage: 'GROWTH',
    });
  });
});
