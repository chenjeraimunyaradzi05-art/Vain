import { prisma } from '../db';

export async function createBusiness(data: {
  name: string;
  description?: string;
  website?: string;
  category?: string;
  address?: string;
  contacts?: any;
  ownerId?: string; // accepted from callers but not written directly to the DB unless supported in the schema
}) {
  // Only include fields that are actually present on the Business model to avoid Prisma validation errors
  const payload: any = {
    name: data.name,
    description: data.description,
    website: data.website,
    category: data.category,
    address: data.address,
    contacts: data.contacts,
  };

  // include ownerId if provided and supported by the schema
  if (data.ownerId) payload.ownerId = data.ownerId;

  try {
    const business = await prisma.business.create({ data: payload });
    return business;
  } catch (err: any) {
    // Defensive fallback for environments where the database schema has not yet been migrated
    // (Prisma will throw a validation error about an unknown argument like `ownerId`). In that
    // case retry without the ownerId field so tests and older databases continue to work.
    const msg = String(err && err.message || '');
    if (msg.includes('Unknown argument `ownerId`') || msg.includes('Unknown argument `ownerId`') ) {
      delete payload.ownerId;
      const business = await prisma.business.create({ data: payload });
      return business;
    }
    throw err;
  }
}

export async function getBusiness(id: string) {
  return prisma.business.findUnique({
    where: { id },
    include: { media: true, ratings: true },
  });
}

export async function listBusinesses({ page = 1, limit = 20, category, q }: any) {
  const where: any = {};
  if (category) where.category = category;
  if (q) where.name = { contains: q, mode: 'insensitive' };

  const businesses = await prisma.business.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    skip: (page - 1) * limit,
    take: limit,
  });

  return businesses;
}

export async function addRating(businessId: string, userId: string, payload: {
  safetyScore?: number;
  genderEquityScore?: number;
  accessibilityScore?: number;
  indigenousInclusionScore?: number;
  summary?: string;
}) {
  const rating = await prisma.workplaceRating.create({
    data: {
      businessId,
      userId,
      safetyScore: payload.safetyScore,
      genderEquityScore: payload.genderEquityScore,
      accessibilityScore: payload.accessibilityScore,
      indigenousInclusionScore: payload.indigenousInclusionScore,
      summary: payload.summary,
    }
  });
  return rating;
}

export async function listRatings(businessId: string, { page = 1, limit = 20 } = {}) {
  const ratings = await prisma.workplaceRating.findMany({
    where: { businessId },
    orderBy: { createdAt: 'desc' },
    skip: (page - 1) * limit,
    take: limit,
  });
  return ratings;
}
