/**
 * Women's Business Service
 * Phase 2 Steps 151-175: Business tools for women entrepreneurs
 */

import { prisma } from '../db';
import type { BusinessStage, WomenBusinessType } from '@prisma/client';

// ==========================================
// Business Profile (Steps 153-160)
// ==========================================

interface CreateBusinessInput {
  name: string;
  tagline?: string;
  description?: string;
  businessType: WomenBusinessType;
  stage?: BusinessStage;
  abn?: string;
  acn?: string;
  industry: string;
  subIndustry?: string;
  suburb?: string;
  state?: string;
  postcode?: string;
  isOnlineOnly?: boolean;
  website?: string;
  email?: string;
  phone?: string;
  instagramUrl?: string;
  facebookUrl?: string;
  linkedinUrl?: string;
  tiktokUrl?: string;
  isFirstNationsBusiness?: boolean;
  supplyNationCertified?: boolean;
}

/**
 * Create a new business profile
 */
export async function createBusiness(ownerId: string, input: CreateBusinessInput) {
  const business = await prisma.womenBusiness.create({
    data: {
      ownerId,
      name: input.name,
      tagline: input.tagline,
      description: input.description,
      businessType: input.businessType,
      stage: input.stage || 'IDEA',
      abn: input.abn,
      acn: input.acn,
      industry: input.industry,
      subIndustry: input.subIndustry,
      suburb: input.suburb,
      state: input.state,
      postcode: input.postcode,
      isOnlineOnly: input.isOnlineOnly || false,
      website: input.website,
      email: input.email,
      phone: input.phone,
      instagramUrl: input.instagramUrl,
      facebookUrl: input.facebookUrl,
      linkedinUrl: input.linkedinUrl,
      tiktokUrl: input.tiktokUrl,
      isFirstNationsBusiness: input.isFirstNationsBusiness || false,
      supplyNationCertified: input.supplyNationCertified || false,
      isPublished: false,
    },
  });

  return business;
}

/**
 * Update business profile
 */
export async function updateBusiness(
  businessId: string,
  ownerId: string,
  input: Partial<CreateBusinessInput>
) {
  const business = await prisma.womenBusiness.findFirst({
    where: { id: businessId, ownerId },
  });

  if (!business) {
    throw new Error('Business not found');
  }

  const updated = await prisma.womenBusiness.update({
    where: { id: businessId },
    data: input,
  });

  return updated;
}

/**
 * Publish business profile
 */
export async function publishBusiness(businessId: string, ownerId: string) {
  const business = await prisma.womenBusiness.findFirst({
    where: { id: businessId, ownerId },
  });

  if (!business) {
    throw new Error('Business not found');
  }

  if (!business.name || !business.industry) {
    throw new Error('Please complete required fields before publishing');
  }

  return prisma.womenBusiness.update({
    where: { id: businessId },
    data: { isPublished: true },
  });
}

/**
 * Unpublish business profile
 */
export async function unpublishBusiness(businessId: string, ownerId: string) {
  const business = await prisma.womenBusiness.findFirst({
    where: { id: businessId, ownerId },
  });

  if (!business) {
    throw new Error('Business not found');
  }

  return prisma.womenBusiness.update({
    where: { id: businessId },
    data: { isPublished: false },
  });
}

/**
 * Get user's businesses
 */
export async function getUserBusinesses(ownerId: string) {
  return prisma.womenBusiness.findMany({
    where: { ownerId },
    include: {
      _count: {
        select: {
          products: true,
          services: true,
          goals: true,
        },
      },
    },
    orderBy: { updatedAt: 'desc' },
  });
}

/**
 * Get business details
 */
export async function getBusinessDetails(businessId: string) {
  return prisma.womenBusiness.findUnique({
    where: { id: businessId },
    include: {
      owner: {
        select: {
          id: true,
          name: true,
          avatarUrl: true,
        },
      },
      products: {
        where: { isActive: true },
        orderBy: { createdAt: 'desc' },
      },
      services: {
        where: { isActive: true },
        orderBy: { createdAt: 'desc' },
      },
      milestones: {
        orderBy: { achievedAt: 'desc' },
        take: 5,
      },
    },
  });
}

/**
 * Search businesses (directory)
 */
export async function searchBusinesses(options: {
  industry?: string;
  state?: string;
  isFirstNationsBusiness?: boolean;
  supplyNationCertified?: boolean;
  query?: string;
  limit?: number;
  offset?: number;
}) {
  const where: any = {
    isPublished: true,
  };

  if (options.industry) {
    where.industry = options.industry;
  }
  if (options.state) {
    where.state = options.state;
  }
  if (options.isFirstNationsBusiness) {
    where.isFirstNationsBusiness = true;
  }
  if (options.supplyNationCertified) {
    where.supplyNationCertified = true;
  }
  if (options.query) {
    where.OR = [
      { name: { contains: options.query, mode: 'insensitive' } },
      { tagline: { contains: options.query, mode: 'insensitive' } },
      { description: { contains: options.query, mode: 'insensitive' } },
    ];
  }

  const [businesses, total] = await Promise.all([
    prisma.womenBusiness.findMany({
      where,
      include: {
        owner: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { followerCount: 'desc' },
      take: options.limit || 20,
      skip: options.offset || 0,
    }),
    prisma.womenBusiness.count({ where }),
  ]);

  return { businesses, total };
}

// ==========================================
// Products & Services (Steps 161-165)
// ==========================================

interface CreateProductInput {
  businessId: string;
  name: string;
  description?: string;
  price?: number;
  currency?: string;
  imageUrl?: string;
  category?: string;
  tags?: string[];
}

/**
 * Add a product
 */
export async function addProduct(ownerId: string, input: CreateProductInput) {
  const business = await prisma.womenBusiness.findFirst({
    where: { id: input.businessId, ownerId },
  });

  if (!business) {
    throw new Error('Business not found');
  }

  const product = await prisma.womenBusinessProduct.create({
    data: {
      businessId: input.businessId,
      name: input.name,
      description: input.description,
      price: input.price,
      currency: input.currency || 'AUD',
      imageUrl: input.imageUrl,
      category: input.category,
      tags: input.tags || [],
      isActive: true,
    },
  });

  await prisma.womenBusiness.update({
    where: { id: input.businessId },
    data: { productCount: { increment: 1 } },
  });

  return product;
}

interface CreateServiceInput {
  businessId: string;
  name: string;
  description?: string;
  priceFrom?: number;
  priceTo?: number;
  priceUnit?: string;
  currency?: string;
  duration?: string;
  category?: string;
}

/**
 * Add a service
 */
export async function addService(ownerId: string, input: CreateServiceInput) {
  const business = await prisma.womenBusiness.findFirst({
    where: { id: input.businessId, ownerId },
  });

  if (!business) {
    throw new Error('Business not found');
  }

  const service = await prisma.womenBusinessService.create({
    data: {
      businessId: input.businessId,
      name: input.name,
      description: input.description,
      priceFrom: input.priceFrom,
      priceTo: input.priceTo,
      priceUnit: input.priceUnit,
      currency: input.currency || 'AUD',
      duration: input.duration,
      category: input.category,
    },
  });

  return service;
}

/**
 * Get products for a business
 */
export async function getProducts(businessId: string) {
  return prisma.womenBusinessProduct.findMany({
    where: { businessId, isActive: true },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Get services for a business
 */
export async function getServices(businessId: string) {
  return prisma.womenBusinessService.findMany({
    where: { businessId, isActive: true },
    orderBy: { createdAt: 'desc' },
  });
}

// ==========================================
// Goals & Milestones (Steps 166-170)
// ==========================================

interface CreateGoalInput {
  businessId: string;
  title: string;
  description?: string;
  category?: string;
  goalType?: string;
  targetValue?: number;
  currentValue?: number;
  unit?: string;
  targetDate?: Date;
}

/**
 * Create a business goal
 */
export async function createGoal(ownerId: string, input: CreateGoalInput) {
  const business = await prisma.womenBusiness.findFirst({
    where: { id: input.businessId, ownerId },
  });

  if (!business) {
    throw new Error('Business not found');
  }

  const category = input.category ?? input.goalType;
  if (!category) {
    throw new Error('Goal category is required');
  }

  return prisma.businessGoal.create({
    data: {
      businessId: input.businessId,
      title: input.title,
      description: input.description,
      category,
      targetValue: input.targetValue,
      currentValue: input.currentValue || 0,
      unit: input.unit,
      targetDate: input.targetDate,
      status: 'active',
    },
  });
}

/**
 * Update goal progress
 */
export async function updateGoalProgress(
  goalId: string,
  ownerId: string,
  currentValue: number
) {
  const goal = await prisma.businessGoal.findUnique({
    where: { id: goalId },
    include: { business: true },
  });

  if (!goal || goal.business.ownerId !== ownerId) {
    throw new Error('Goal not found');
  }

  const isCompleted = goal.targetValue && currentValue >= Number(goal.targetValue);

  return prisma.businessGoal.update({
    where: { id: goalId },
    data: {
      currentValue,
      status: isCompleted ? 'completed' : 'active',
      completedAt: isCompleted ? new Date() : null,
    },
  });
}

/**
 * Get business goals
 */
export async function getGoals(businessId: string, status?: string) {
  return prisma.businessGoal.findMany({
    where: {
      businessId,
      ...(status && { status }),
    },
    orderBy: { targetDate: 'asc' },
  });
}

/**
 * Add a milestone
 */
export async function addMilestone(
  ownerId: string,
  businessId: string,
  title: string,
  description?: string
) {
  const business = await prisma.womenBusiness.findFirst({
    where: { id: businessId, ownerId },
  });

  if (!business) {
    throw new Error('Business not found');
  }

  return prisma.businessMilestone.create({
    data: {
      businessId,
      title,
      description,
      achievedAt: new Date(),
    },
  });
}

/**
 * Get milestones
 */
export async function getMilestones(businessId: string) {
  return prisma.businessMilestone.findMany({
    where: { businessId },
    orderBy: { achievedAt: 'desc' },
  });
}

/**
 * Celebrate a milestone
 */
export async function celebrateMilestone(milestoneId: string, ownerId: string) {
  const milestone = await prisma.businessMilestone.findUnique({
    where: { id: milestoneId },
    include: { business: true },
  });

  if (!milestone || milestone.business.ownerId !== ownerId) {
    throw new Error('Milestone not found');
  }

  return prisma.businessMilestone.update({
    where: { id: milestoneId },
    data: { isCelebrated: true },
  });
}

// ==========================================
// Business Analytics
// ==========================================

/**
 * Get business dashboard stats
 */
export async function getBusinessStats(businessId: string, ownerId: string) {
  const business = await prisma.womenBusiness.findFirst({
    where: { id: businessId, ownerId },
  });

  if (!business) {
    throw new Error('Business not found');
  }

  const [
    products,
    services,
    goals,
    milestones,
    activeGoals,
    completedGoals,
  ] = await Promise.all([
    prisma.womenBusinessProduct.count({ where: { businessId, isActive: true } }),
    prisma.womenBusinessService.count({ where: { businessId, isActive: true } }),
    prisma.businessGoal.count({ where: { businessId } }),
    prisma.businessMilestone.count({ where: { businessId } }),
    prisma.businessGoal.count({ where: { businessId, status: 'active' } }),
    prisma.businessGoal.count({ where: { businessId, status: 'completed' } }),
  ]);

  return {
    products,
    services,
    goals,
    milestones,
    activeGoals,
    completedGoals,
    followerCount: business.followerCount,
    stage: business.stage,
  };
}

// ==========================================
// Industry Lists
// ==========================================

export const INDUSTRIES = [
  'Arts & Crafts',
  'Beauty & Wellness',
  'Business Services',
  'Childcare & Education',
  'Cleaning Services',
  'Construction & Trades',
  'Consulting',
  'Creative Services',
  'Events & Catering',
  'Fashion & Apparel',
  'Finance & Accounting',
  'Food & Beverage',
  'Health & Fitness',
  'Hospitality',
  'IT & Technology',
  'Legal Services',
  'Marketing & Advertising',
  'Media & Entertainment',
  'Real Estate',
  'Retail',
  'Tourism & Travel',
  'Transport & Logistics',
  'Other',
];

export const womenBusinessService = {
  createBusiness,
  updateBusiness,
  publishBusiness,
  getUserBusinesses,
  getBusinessDetails,
  searchBusinesses,
  addProduct,
  addService,
  getProducts,
  getServices,
  createGoal,
  updateGoalProgress,
  getGoals,
  addMilestone,
  getMilestones,
  celebrateMilestone,
  getBusinessStats,
  INDUSTRIES,
};
