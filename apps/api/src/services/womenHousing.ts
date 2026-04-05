/**
 * Women's Housing Service
 * Phase 2 Steps 126-150: Housing portal for women
 */

import { prisma } from '../db';
import type { HousingType, HousingListingStatus, SafetyFeature } from '@prisma/client';

// ==========================================
// Housing Listings (Steps 129-145)
// ==========================================

interface CreateListingInput {
  title: string;
  description: string;
  housingType: HousingType;
  
  // Location
  address?: string;
  suburb: string;
  state: string;
  postcode: string;
  latitude?: number;
  longitude?: number;
  
  // Pricing
  rentPerWeek: number;
  bondAmount?: number;
  billsIncluded?: boolean;
  
  // Property details
  bedrooms: number;
  bathrooms: number;
  parking?: number;
  
  // Availability
  availableFrom: Date;
  minLeaseMonths?: number;
  maxLeaseMonths?: number;
  
  // Preferences
  womenOnly?: boolean;
  firstNationsPreferred?: boolean;
  childrenAllowed?: boolean;
  petsAllowed?: boolean;
  smokingAllowed?: boolean;
  accessibilityFeatures?: string[];
  
  // Safety
  safetyFeatures?: SafetyFeature[];
  safetyNotes?: string;
  
  // Cultural
  culturalNotes?: string;
  nearCulturalServices?: boolean;
  
  // Contact
  contactMethod?: string;
  contactPhone?: string;
  contactEmail?: string;
}

/**
 * Create a new housing listing
 */
export async function createListing(ownerId: string, input: CreateListingInput) {
  const listing = await prisma.womenHousingPortal.create({
    data: {
      ownerId,
      title: input.title,
      description: input.description,
      housingType: input.housingType,
      status: 'DRAFT',
      
      address: input.address,
      suburb: input.suburb,
      state: input.state,
      postcode: input.postcode,
      latitude: input.latitude,
      longitude: input.longitude,
      
      rentPerWeek: input.rentPerWeek,
      bondAmount: input.bondAmount,
      billsIncluded: input.billsIncluded || false,
      
      bedrooms: input.bedrooms,
      bathrooms: input.bathrooms,
      parking: input.parking || 0,
      
      availableFrom: input.availableFrom,
      minLeaseMonths: input.minLeaseMonths,
      maxLeaseMonths: input.maxLeaseMonths,
      
      womenOnly: input.womenOnly ?? true,
      firstNationsPreferred: input.firstNationsPreferred || false,
      childrenAllowed: input.childrenAllowed ?? true,
      petsAllowed: input.petsAllowed || false,
      smokingAllowed: input.smokingAllowed || false,
      accessibilityFeatures: input.accessibilityFeatures || [],
      
      safetyFeatures: input.safetyFeatures || [],
      safetyNotes: input.safetyNotes,
      
      culturalNotes: input.culturalNotes,
      nearCulturalServices: input.nearCulturalServices || false,
      
      contactMethod: input.contactMethod || 'in_app',
      contactPhone: input.contactPhone,
      contactEmail: input.contactEmail,
    },
  });

  return listing;
}

/**
 * Publish a listing
 */
export async function publishListing(listingId: string, ownerId: string) {
  const listing = await prisma.womenHousingPortal.findFirst({
    where: { id: listingId, ownerId },
  });

  if (!listing) {
    throw new Error('Listing not found');
  }

  // Validate required fields
  if (!listing.title || !listing.description || !listing.suburb) {
    throw new Error('Please complete all required fields before publishing');
  }

  const updated = await prisma.womenHousingPortal.update({
    where: { id: listingId },
    data: { status: 'ACTIVE' },
  });

  return updated;
}

/**
 * Search housing listings
 */
export async function searchListings(options: {
  suburb?: string;
  state?: string;
  housingType?: HousingType;
  minRent?: number;
  maxRent?: number;
  bedrooms?: number;
  childrenAllowed?: boolean;
  petsAllowed?: boolean;
  firstNationsPreferred?: boolean;
  accessibilityNeeded?: boolean;
  limit?: number;
  offset?: number;
}) {
  const where: any = {
    status: 'ACTIVE',
    womenOnly: true,
  };

  if (options.suburb) {
    where.suburb = { contains: options.suburb, mode: 'insensitive' };
  }
  if (options.state) {
    where.state = options.state;
  }
  if (options.housingType) {
    where.housingType = options.housingType;
  }
  if (options.minRent !== undefined) {
    where.rentPerWeek = { ...where.rentPerWeek, gte: options.minRent };
  }
  if (options.maxRent !== undefined) {
    where.rentPerWeek = { ...where.rentPerWeek, lte: options.maxRent };
  }
  if (options.bedrooms !== undefined) {
    where.bedrooms = { gte: options.bedrooms };
  }
  if (options.childrenAllowed) {
    where.childrenAllowed = true;
  }
  if (options.petsAllowed) {
    where.petsAllowed = true;
  }
  if (options.firstNationsPreferred) {
    where.firstNationsPreferred = true;
  }
  if (options.accessibilityNeeded) {
    where.accessibilityFeatures = { isEmpty: false };
  }

  const [listings, total] = await Promise.all([
    prisma.womenHousingPortal.findMany({
      where,
      include: {
        photos: {
          where: { isPrimary: true },
          take: 1,
        },
        owner: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: options.limit || 20,
      skip: options.offset || 0,
    }),
    prisma.womenHousingPortal.count({ where }),
  ]);

  return { listings, total };
}

/**
 * Get listing details
 */
export async function getListingDetails(listingId: string, viewerId?: string) {
  const listing = await prisma.womenHousingPortal.findUnique({
    where: { id: listingId },
    include: {
      photos: {
        orderBy: { order: 'asc' },
      },
      owner: {
        select: {
          id: true,
          name: true,
          avatarUrl: true,
        },
      },
    },
  });

  if (!listing) {
    return null;
  }

  // Increment view count
  if (viewerId && viewerId !== listing.ownerId) {
    await prisma.womenHousingPortal.update({
      where: { id: listingId },
      data: { viewCount: { increment: 1 } },
    });
  }

  return listing;
}

/**
 * Add photos to a listing
 */
export async function addListingPhotos(
  listingId: string,
  ownerId: string,
  photos: { url: string; caption?: string; isPrimary?: boolean }[]
) {
  const listing = await prisma.womenHousingPortal.findFirst({
    where: { id: listingId, ownerId },
  });

  if (!listing) {
    throw new Error('Listing not found');
  }

  const existingCount = await prisma.womenHousingPhoto.count({
    where: { listingId },
  });

  const photoRecords = photos.map((photo, index) => ({
    listingId,
    url: photo.url,
    caption: photo.caption,
    order: existingCount + index,
    isPrimary: photo.isPrimary || (existingCount === 0 && index === 0),
  }));

  await prisma.womenHousingPhoto.createMany({
    data: photoRecords,
  });

  return prisma.womenHousingPhoto.findMany({
    where: { listingId },
    orderBy: { order: 'asc' },
  });
}

// ==========================================
// Inquiries (Steps 142-145)
// ==========================================

interface SendInquiryInput {
  listingId: string;
  message: string;
  moveInDate?: Date;
  occupants?: number;
  hasChildren?: boolean;
  hasPets?: boolean;
}

/**
 * Send an inquiry to a listing owner
 */
export async function sendInquiry(seekerId: string, input: SendInquiryInput) {
  // Check if already inquired
  const existing = await prisma.womenHousingInquiry.findFirst({
    where: {
      listingId: input.listingId,
      seekerId,
    },
  });

  if (existing) {
    throw new Error('You have already sent an inquiry for this listing');
  }

  const inquiry = await prisma.womenHousingInquiry.create({
    data: {
      listingId: input.listingId,
      seekerId,
      message: input.message,
      moveInDate: input.moveInDate,
      occupants: input.occupants || 1,
      hasChildren: input.hasChildren || false,
      hasPets: input.hasPets || false,
      status: 'pending',
    },
  });

  // Increment inquiry count
  await prisma.womenHousingPortal.update({
    where: { id: input.listingId },
    data: { inquiryCount: { increment: 1 } },
  });

  return inquiry;
}

/**
 * Respond to an inquiry
 */
export async function respondToInquiry(
  inquiryId: string,
  ownerId: string,
  response: { message: string; status: 'responded' | 'accepted' | 'declined' }
) {
  const inquiry = await prisma.womenHousingInquiry.findUnique({
    where: { id: inquiryId },
    include: { listing: true },
  });

  if (!inquiry || inquiry.listing.ownerId !== ownerId) {
    throw new Error('Inquiry not found');
  }

  const updated = await prisma.womenHousingInquiry.update({
    where: { id: inquiryId },
    data: {
      status: response.status,
      responseMessage: response.message,
      respondedAt: new Date(),
    },
  });

  return updated;
}

/**
 * Get inquiries for a listing owner
 */
export async function getOwnerInquiries(ownerId: string, status?: string) {
  const inquiries = await prisma.womenHousingInquiry.findMany({
    where: {
      listing: { ownerId },
      ...(status && { status }),
    },
    include: {
      listing: {
        select: {
          id: true,
          title: true,
          suburb: true,
        },
      },
      seeker: {
        select: {
          id: true,
          name: true,
          avatarUrl: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return inquiries;
}

/**
 * Get inquiries for a housing seeker
 */
export async function getSeekerInquiries(seekerId: string, status?: string) {
  const inquiries = await prisma.womenHousingInquiry.findMany({
    where: {
      seekerId,
      ...(status && { status }),
    },
    include: {
      listing: {
        select: {
          id: true,
          title: true,
          suburb: true,
          state: true,
          owner: {
            select: {
              id: true,
              name: true,
              avatarUrl: true,
              email: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return inquiries;
}

// ==========================================
// Saved Listings (Step 146)
// ==========================================

/**
 * Save a listing
 */
export async function saveListing(userId: string, listingId: string, notes?: string) {
  const save = await prisma.womenHousingSave.upsert({
    where: {
      listingId_userId: { listingId, userId },
    },
    create: {
      listingId,
      userId,
      notes,
    },
    update: {
      notes,
    },
  });

  await prisma.womenHousingPortal.update({
    where: { id: listingId },
    data: { savedCount: { increment: 1 } },
  });

  return save;
}

/**
 * Unsave a listing
 */
export async function unsaveListing(userId: string, listingId: string) {
  await prisma.womenHousingSave.delete({
    where: {
      listingId_userId: { listingId, userId },
    },
  });

  await prisma.womenHousingPortal.update({
    where: { id: listingId },
    data: { savedCount: { decrement: 1 } },
  });
}

/**
 * Get saved listings for a user
 */
export async function getSavedListings(userId: string) {
  const saves = await prisma.womenHousingSave.findMany({
    where: { userId },
    include: {
      listing: {
        include: {
          photos: {
            where: { isPrimary: true },
            take: 1,
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return saves;
}

// ==========================================
// Seeker Profile (Steps 147-150)
// ==========================================

interface UpdateSeekerProfileInput {
  seekingType?: HousingType[];
  minBudget?: number;
  maxBudget?: number;
  preferredSuburbs?: string[];
  preferredStates?: string[];
  occupants?: number;
  hasChildren?: boolean;
  childrenAges?: string;
  hasPets?: boolean;
  petDetails?: string;
  employmentStatus?: string;
  incomeRange?: string;
  needsAccessibility?: boolean;
  accessibilityNeeds?: string[];
  urgency?: string;
  desiredMoveDate?: Date;
  bio?: string;
  hasReferences?: boolean;
  isSearchable?: boolean;
}

/**
 * Update or create housing seeker profile
 */
export async function updateSeekerProfile(userId: string, input: UpdateSeekerProfileInput) {
  const profile = await prisma.womenHousingProfile.upsert({
    where: { userId },
    create: {
      userId,
      ...input,
    },
    update: input,
  });

  return profile;
}

/**
 * Get seeker profile
 */
export async function getSeekerProfile(userId: string) {
  return prisma.womenHousingProfile.findUnique({
    where: { userId },
  });
}

/**
 * Search for housing seekers (for property owners)
 */
export async function searchSeekers(options: {
  preferredStates?: string[];
  maxBudget?: number;
  urgency?: string;
  limit?: number;
}) {
  const where: any = {
    isSearchable: true,
  };

  if (options.preferredStates?.length) {
    where.preferredStates = { hasSome: options.preferredStates };
  }
  if (options.maxBudget) {
    where.minBudget = { lte: options.maxBudget };
  }
  if (options.urgency) {
    where.urgency = options.urgency;
  }

  const profiles = await prisma.womenHousingProfile.findMany({
    where,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          avatarUrl: true,
        },
      },
    },
    take: options.limit || 20,
    orderBy: { updatedAt: 'desc' },
  });

  return profiles;
}

export const womenHousingService = {
  createListing,
  publishListing,
  searchListings,
  getListingDetails,
  addListingPhotos,
  sendInquiry,
  respondToInquiry,
  getOwnerInquiries,
  getSeekerInquiries,
  saveListing,
  unsaveListing,
  getSavedListings,
  updateSeekerProfile,
  getSeekerProfile,
  searchSeekers,
};
