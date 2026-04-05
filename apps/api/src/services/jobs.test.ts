/**
 * Jobs Service Unit Tests
 * 
 * Tests for job service functions.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the db module
vi.mock('../db', () => ({
  prisma: {
    job: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
      groupBy: vi.fn(),
    },
    jobApplication: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    savedJob: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
  },
}));

import * as jobsService from './jobs';
import { prisma } from '../db';

describe('Jobs Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('searchJobs', () => {
    const mockJobs = [
      {
        id: 'job-1',
        title: 'Software Developer',
        description: 'Build amazing software',
        location: 'Sydney',
        employment: 'full-time',
        salaryLow: 80000,
        salaryHigh: 120000,
        isActive: true,
        isFeatured: false,
        createdAt: new Date(),
        postedAt: new Date(),
        user: {
          companyProfile: {
            id: 'company-1',
            companyName: 'Tech Corp',
            verified: true,
          },
        },
      },
      {
        id: 'job-2',
        title: 'Frontend Engineer',
        description: 'React and TypeScript',
        location: 'Melbourne',
        employment: 'contract',
        salaryLow: 90000,
        salaryHigh: 140000,
        isActive: true,
        isFeatured: true,
        createdAt: new Date(),
        postedAt: new Date(),
        user: {
          companyProfile: {
            id: 'company-2',
            companyName: 'Web Agency',
            verified: false,
          },
        },
      },
    ];

    it('should return jobs with default parameters', async () => {
      vi.mocked(prisma.job.count).mockResolvedValue(2);
      vi.mocked(prisma.job.findMany).mockResolvedValue(mockJobs as any);
      vi.mocked(prisma.job.groupBy).mockResolvedValue([]);

      const result = await jobsService.searchJobs({});

      expect(result.jobs).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(prisma.job.findMany).toHaveBeenCalled();
    });

    it('should filter by query', async () => {
      vi.mocked(prisma.job.count).mockResolvedValue(1);
      vi.mocked(prisma.job.findMany).mockResolvedValue([mockJobs[0]] as any);
      vi.mocked(prisma.job.groupBy).mockResolvedValue([]);

      const result = await jobsService.searchJobs({ query: 'Software' });

      expect(result.jobs).toHaveLength(1);
      expect(result.jobs[0].title).toBe('Software Developer');
    });

    it('should filter by location', async () => {
      vi.mocked(prisma.job.count).mockResolvedValue(1);
      vi.mocked(prisma.job.findMany).mockResolvedValue([mockJobs[1]] as any);
      vi.mocked(prisma.job.groupBy).mockResolvedValue([]);

      const result = await jobsService.searchJobs({ location: 'Melbourne' });

      expect(result.jobs).toHaveLength(1);
      expect(result.jobs[0].location).toBe('Melbourne');
    });

    it('should filter by job type', async () => {
      vi.mocked(prisma.job.count).mockResolvedValue(1);
      vi.mocked(prisma.job.findMany).mockResolvedValue([mockJobs[1]] as any);
      vi.mocked(prisma.job.groupBy).mockResolvedValue([]);

      const result = await jobsService.searchJobs({ jobType: ['contract'] });

      expect(result.jobs).toHaveLength(1);
    });

    it('should return hasMore flag correctly', async () => {
      vi.mocked(prisma.job.count).mockResolvedValue(50);
      vi.mocked(prisma.job.findMany).mockResolvedValue(mockJobs as any);
      vi.mocked(prisma.job.groupBy).mockResolvedValue([]);

      const result = await jobsService.searchJobs({ page: 1, limit: 20 });

      expect(result.hasMore).toBe(true);
    });
  });

  describe('getJobById', () => {
    const mockJob = {
      id: 'job-1',
      title: 'Software Developer',
      description: 'Build amazing software',
      location: 'Sydney',
      employment: 'full-time',
      isActive: true,
      isFeatured: false,
      createdAt: new Date(),
      postedAt: new Date(),
      user: {
        companyProfile: {
          id: 'company-1',
          companyName: 'Tech Corp',
          verified: true,
        },
      },
    };

    it('should return job by ID', async () => {
      vi.mocked(prisma.job.findUnique).mockResolvedValue(mockJob as any);

      const result = await jobsService.getJobById('job-1');

      expect(result).not.toBeNull();
      expect(result?.id).toBe('job-1');
      expect(result?.title).toBe('Software Developer');
    });

    it('should return null for non-existent job', async () => {
      vi.mocked(prisma.job.findUnique).mockResolvedValue(null);

      const result = await jobsService.getJobById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('applyToJob', () => {
    const mockJob = {
      id: 'job-1',
      title: 'Software Developer',
      isActive: true,
      userId: 'employer-1',
    };

    it('should create application for valid job', async () => {
      vi.mocked(prisma.job.findUnique).mockResolvedValue(mockJob as any);
      vi.mocked(prisma.jobApplication.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.jobApplication.create).mockResolvedValue({
        id: 'app-1',
        status: 'SUBMITTED',
        jobId: 'job-1',
        userId: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        coverLetter: null,
        resumeUrl: null,
      } as any);

      const result = await jobsService.applyToJob('job-1', 'user-1', {
        coverLetter: 'I am interested',
      });

      expect(result.id).toBe('app-1');
      expect(result.status).toBe('SUBMITTED');
    });

    it('should throw error for non-existent job', async () => {
      vi.mocked(prisma.job.findUnique).mockResolvedValue(null);

      await expect(
        jobsService.applyToJob('non-existent', 'user-1', {})
      ).rejects.toThrow('Job not found');
    });

    it('should throw error for inactive job', async () => {
      vi.mocked(prisma.job.findUnique).mockResolvedValue({
        ...mockJob,
        isActive: false,
      } as any);

      await expect(
        jobsService.applyToJob('job-1', 'user-1', {})
      ).rejects.toThrow('Job is no longer accepting applications');
    });

    it('should throw error for duplicate application', async () => {
      vi.mocked(prisma.job.findUnique).mockResolvedValue(mockJob as any);
      vi.mocked(prisma.jobApplication.findFirst).mockResolvedValue({
        id: 'existing-app',
      } as any);

      await expect(
        jobsService.applyToJob('job-1', 'user-1', {})
      ).rejects.toThrow('You have already applied to this job');
    });
  });

  describe('saveJob', () => {
    it('should save job for user', async () => {
      vi.mocked(prisma.savedJob.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.savedJob.create).mockResolvedValue({
        id: 'saved-1',
        userId: 'user-1',
        jobId: 'job-1',
        createdAt: new Date(),
      } as any);

      const result = await jobsService.saveJob('user-1', 'job-1');

      expect(result.id).toBe('saved-1');
    });

    it('should return existing save if already saved', async () => {
      vi.mocked(prisma.savedJob.findFirst).mockResolvedValue({
        id: 'existing-save',
        userId: 'user-1',
        jobId: 'job-1',
        createdAt: new Date(),
      } as any);

      const result = await jobsService.saveJob('user-1', 'job-1');

      expect(result.id).toBe('existing-save');
      expect(prisma.savedJob.create).not.toHaveBeenCalled();
    });
  });

  describe('unsaveJob', () => {
    it('should unsave job for user', async () => {
      vi.mocked(prisma.savedJob.findFirst).mockResolvedValue({
        id: 'saved-1',
        userId: 'user-1',
        jobId: 'job-1',
        createdAt: new Date(),
      } as any);
      vi.mocked(prisma.savedJob.delete).mockResolvedValue({} as any);

      await jobsService.unsaveJob('user-1', 'job-1');

      expect(prisma.savedJob.delete).toHaveBeenCalledWith({
        where: { id: 'saved-1' },
      });
    });

    it('should do nothing if job not saved', async () => {
      vi.mocked(prisma.savedJob.findFirst).mockResolvedValue(null);

      await jobsService.unsaveJob('user-1', 'job-1');

      expect(prisma.savedJob.delete).not.toHaveBeenCalled();
    });
  });

  describe('createJob', () => {
    it('should create new job posting', async () => {
      const newJob = {
        id: 'new-job-1',
        title: 'New Position',
        description: 'Exciting opportunity',
        location: 'Brisbane',
        employment: 'full-time',
        isActive: true,
        createdAt: new Date(),
        userId: 'employer-1',
      };

      vi.mocked(prisma.job.create).mockResolvedValue(newJob as any);

      const result = await jobsService.createJob('employer-1', {
        title: 'New Position',
        description: 'Exciting opportunity',
        location: 'Brisbane',
        employment: 'full-time',
      });

      expect(result.id).toBe('new-job-1');
      expect(result.title).toBe('New Position');
    });
  });
});
