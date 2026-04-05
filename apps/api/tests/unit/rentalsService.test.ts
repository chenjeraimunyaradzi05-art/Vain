/**
 * Rentals Service Tests
 * Phase 5: Housing & Real Estate
 */

import { ListingStatus, RentalInquiryStatus } from '@prisma/client';

// Create mocks using vi.hoisted so they're available before module mocking
const mockPrisma = vi.hoisted(() => ({
  rentalListing: {
    create: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
  },
  rentalInquiry: {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    findMany: vi.fn(),
  },
  propertySeekerProfile: {
    upsert: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
  },
}));

vi.mock('../../src/db', () => ({
  prisma: mockPrisma,
}));

import {
  createRentalListing,
  publishRentalListing,
  searchRentalListings,
  sendRentalInquiry,
  respondToRentalInquiry,
  getOwnerRentalListings,
  upsertSeekerProfile,
} from '../../src/services/rentals';

const status = 'ACTIVE' as ListingStatus;
const inquiryStatus = 'RESPONDED' as RentalInquiryStatus;

describe('rentalsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates rental listing in draft status', async () => {
    mockPrisma.rentalListing.create.mockResolvedValue({ id: 'listing-1', status: 'DRAFT' });

    const listing = await createRentalListing('owner-1', {
      title: 'Cozy unit',
      weeklyRent: 450,
    });

    expect(mockPrisma.rentalListing.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          ownerUserId: 'owner-1',
          status: 'DRAFT',
        }),
      })
    );
    expect(listing.status).toBe('DRAFT');
  });

  it('publishes a rental listing for its owner', async () => {
    mockPrisma.rentalListing.findFirst.mockResolvedValue({ id: 'listing-1', ownerUserId: 'owner-1' });
    mockPrisma.rentalListing.update.mockResolvedValue({ id: 'listing-1', status: 'ACTIVE' });

    const listing = await publishRentalListing('listing-1', 'owner-1');

    expect(listing.status).toBe('ACTIVE');
  });

  it('searches rental listings with filters', async () => {
    mockPrisma.rentalListing.findMany.mockResolvedValue([]);
    mockPrisma.rentalListing.count.mockResolvedValue(0);

    await searchRentalListings({ suburb: 'Sydney', minRent: 300, maxRent: 600, status });

    expect(mockPrisma.rentalListing.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          suburb: { contains: 'Sydney', mode: 'insensitive' },
          weeklyRent: expect.objectContaining({ gte: 300, lte: 600 }),
          status,
        }),
      })
    );
  });

  it('prevents inquiries for inactive listings', async () => {
    mockPrisma.rentalListing.findUnique.mockResolvedValue({ id: 'listing-1', status: 'DRAFT' });

    await expect(
      sendRentalInquiry('user-1', { rentalListingId: 'listing-1', message: 'Interested' })
    ).rejects.toThrow('Listing not available');
  });

  it('updates rental inquiry status for the owner', async () => {
    mockPrisma.rentalInquiry.findUnique.mockResolvedValue({
      id: 'inq-1',
      rentalListing: { ownerUserId: 'owner-1' },
    });
    mockPrisma.rentalInquiry.update.mockResolvedValue({ id: 'inq-1', status: inquiryStatus });

    const inquiry = await respondToRentalInquiry('inq-1', 'owner-1', inquiryStatus);

    expect(inquiry.status).toBe('RESPONDED');
  });

  it('returns owner listings with status filter', async () => {
    mockPrisma.rentalListing.findMany.mockResolvedValue([{ id: 'listing-1', ownerUserId: 'owner-1' }]);

    const listings = await getOwnerRentalListings('owner-1', status);

    expect(mockPrisma.rentalListing.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ ownerUserId: 'owner-1', status }),
      })
    );
    expect(listings).toHaveLength(1);
  });

  it('upserts property seeker profile', async () => {
    mockPrisma.propertySeekerProfile.upsert.mockResolvedValue({ userId: 'user-1', budgetMin: 300 });

    const profile = await upsertSeekerProfile('user-1', {
      budgetMin: 300,
      preferredStates: ['NSW'],
    });

    expect(mockPrisma.propertySeekerProfile.upsert).toHaveBeenCalled();
    expect(profile.userId).toBe('user-1');
  });
});
