/**
 * Rentals Service
 * Phase 5: Housing & Real Estate (Steps 401-500)
 */

import { prisma } from '../db';
import type { ListingStatus, RentalInquiryStatus } from '@prisma/client';

interface CreateRentalListingInput {
  title: string;
  description?: string;
  addressLine1?: string;
  suburb?: string;
  state?: string;
  postcode?: string;
  latitude?: number;
  longitude?: number;
  weeklyRent?: number;
  bond?: number;
  currency?: string;
  availableFrom?: Date;
  bedrooms?: number;
  bathrooms?: number;
  parking?: number;
}

interface SearchRentalsOptions {
  suburb?: string;
  state?: string;
  minRent?: number;
  maxRent?: number;
  bedrooms?: number;
  status?: ListingStatus;
  limit?: number;
  offset?: number;
}

interface CreateInquiryInput {
  rentalListingId: string;
  message?: string;
}

interface UpdateSeekerProfileInput {
  budgetMin?: number;
  budgetMax?: number;
  currency?: string;
  preferredSuburbs?: string[];
  preferredStates?: string[];
  propertyTypes?: string[];
  bedroomsMin?: number;
  bathroomsMin?: number;
  notes?: string;
}

export async function createRentalListing(ownerUserId: string, input: CreateRentalListingInput) {
  return prisma.rentalListing.create({
    data: {
      ownerUserId,
      title: input.title,
      description: input.description,
      addressLine1: input.addressLine1,
      suburb: input.suburb,
      state: input.state,
      postcode: input.postcode,
      latitude: input.latitude,
      longitude: input.longitude,
      weeklyRent: input.weeklyRent,
      bond: input.bond,
      currency: input.currency || 'AUD',
      availableFrom: input.availableFrom,
      bedrooms: input.bedrooms,
      bathrooms: input.bathrooms,
      parking: input.parking,
      status: 'DRAFT',
    },
  });
}

export async function publishRentalListing(listingId: string, ownerUserId: string) {
  const listing = await prisma.rentalListing.findFirst({
    where: { id: listingId, ownerUserId },
  });

  if (!listing) {
    throw new Error('Listing not found');
  }

  return prisma.rentalListing.update({
    where: { id: listingId },
    data: { status: 'ACTIVE' },
  });
}

export async function searchRentalListings(options: SearchRentalsOptions) {
  const where: any = {
    status: options.status || 'ACTIVE',
  };

  if (options.suburb) {
    where.suburb = { contains: options.suburb, mode: 'insensitive' };
  }
  if (options.state) {
    where.state = options.state;
  }
  if (options.minRent !== undefined) {
    where.weeklyRent = { ...where.weeklyRent, gte: options.minRent };
  }
  if (options.maxRent !== undefined) {
    where.weeklyRent = { ...where.weeklyRent, lte: options.maxRent };
  }
  if (options.bedrooms !== undefined) {
    where.bedrooms = { gte: options.bedrooms };
  }

  const [listings, total] = await Promise.all([
    prisma.rentalListing.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: options.limit || 20,
      skip: options.offset || 0,
    }),
    prisma.rentalListing.count({ where }),
  ]);

  return { listings, total };
}

export async function getRentalListing(listingId: string) {
  return prisma.rentalListing.findUnique({
    where: { id: listingId },
    include: {
      owner: { select: { id: true, name: true, avatarUrl: true } },
      inquiries: { select: { id: true, status: true, createdAt: true } },
    },
  });
}

export async function sendRentalInquiry(userId: string, input: CreateInquiryInput) {
  const listing = await prisma.rentalListing.findUnique({
    where: { id: input.rentalListingId },
  });

  if (!listing || listing.status !== 'ACTIVE') {
    throw new Error('Listing not available');
  }

  if (listing.ownerUserId === userId) {
    throw new Error('You cannot inquire on your own listing');
  }

  const existing = await prisma.rentalInquiry.findFirst({
    where: { rentalListingId: input.rentalListingId, userId },
  });

  if (existing) {
    throw new Error('Inquiry already sent');
  }

  return prisma.rentalInquiry.create({
    data: {
      rentalListingId: input.rentalListingId,
      userId,
      status: 'NEW',
      message: input.message,
    },
  });
}

export async function respondToRentalInquiry(
  inquiryId: string,
  ownerUserId: string,
  status: RentalInquiryStatus
) {
  const inquiry = await prisma.rentalInquiry.findUnique({
    where: { id: inquiryId },
    include: { rentalListing: true },
  });

  if (!inquiry || inquiry.rentalListing.ownerUserId !== ownerUserId) {
    throw new Error('Inquiry not found');
  }

  return prisma.rentalInquiry.update({
    where: { id: inquiryId },
    data: { status },
  });
}

export async function getOwnerRentalInquiries(ownerUserId: string, status?: RentalInquiryStatus) {
  return prisma.rentalInquiry.findMany({
    where: {
      rentalListing: { ownerUserId },
      ...(status && { status }),
    },
    include: {
      rentalListing: { select: { id: true, title: true, suburb: true } },
      user: { select: { id: true, name: true, avatarUrl: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getOwnerRentalListings(ownerUserId: string, status?: ListingStatus) {
  return prisma.rentalListing.findMany({
    where: {
      ownerUserId,
      ...(status && { status }),
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function upsertSeekerProfile(userId: string, input: UpdateSeekerProfileInput) {
  return prisma.propertySeekerProfile.upsert({
    where: { userId },
    create: {
      userId,
      budgetMin: input.budgetMin,
      budgetMax: input.budgetMax,
      currency: input.currency || 'AUD',
      preferredSuburbs: input.preferredSuburbs || [],
      preferredStates: input.preferredStates || [],
      propertyTypes: input.propertyTypes || [],
      bedroomsMin: input.bedroomsMin,
      bathroomsMin: input.bathroomsMin,
      notes: input.notes,
    },
    update: {
      budgetMin: input.budgetMin,
      budgetMax: input.budgetMax,
      currency: input.currency,
      preferredSuburbs: input.preferredSuburbs,
      preferredStates: input.preferredStates,
      propertyTypes: input.propertyTypes,
      bedroomsMin: input.bedroomsMin,
      bathroomsMin: input.bathroomsMin,
      notes: input.notes,
    },
  });
}

export async function getSeekerProfile(userId: string) {
  return prisma.propertySeekerProfile.findUnique({
    where: { userId },
  });
}

export async function searchSeekers(options: {
  preferredStates?: string[];
  maxBudget?: number;
  bedroomsMin?: number;
  limit?: number;
}) {
  const where: any = {};

  if (options.preferredStates?.length) {
    where.preferredStates = { hasSome: options.preferredStates };
  }
  if (options.maxBudget !== undefined) {
    where.budgetMin = { lte: options.maxBudget };
  }
  if (options.bedroomsMin !== undefined) {
    where.bedroomsMin = { gte: options.bedroomsMin };
  }

  return prisma.propertySeekerProfile.findMany({
    where,
    include: { user: { select: { id: true, name: true, avatarUrl: true } } },
    orderBy: { updatedAt: 'desc' },
    take: options.limit || 20,
  });
}

export const rentalsService = {
  createRentalListing,
  publishRentalListing,
  searchRentalListings,
  getRentalListing,
  sendRentalInquiry,
  respondToRentalInquiry,
  getOwnerRentalInquiries,
  getOwnerRentalListings,
  upsertSeekerProfile,
  getSeekerProfile,
  searchSeekers,
};
