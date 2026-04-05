/**
 * JobService Unit Tests
 * 
 * Tests for job service functionality.
 */

// Mock the prisma client
vi.mock('../../src/db', () => ({
  prisma: {
    job: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    jobApplication: {
      findFirst: vi.fn(),
      create: vi.fn(),
      count: vi.fn(),
    },
  },
}));

import { prisma } from '../../src/db';
import { JobService } from '../../src/services/jobService';
import { createTestJob } from '../fixtures';

describe('JobService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new job', async () => {
      const mockJob = createTestJob('company_123');
      vi.mocked(prisma.job.create).mockResolvedValue(mockJob as any);

      const result = await JobService.create({
        title: 'Software Engineer',
        description: 'We are looking for a software engineer.',
        companyId: 'company_123',
        jobType: 'FULL_TIME',
      }, 'user_123');

      expect(prisma.job.create).toHaveBeenCalledOnce();
      expect(result).toBeDefined();
    });
  });

  describe('findById', () => {
    it('should return a job by ID', async () => {
      const mockJob = createTestJob('company_123', { id: 'job_456' });
      vi.mocked(prisma.job.findUnique).mockResolvedValue(mockJob as any);

      const result = await JobService.findById('job_456');

      expect(prisma.job.findUnique).toHaveBeenCalledWith({
        where: { id: 'job_456' },
        include: expect.any(Object),
      });
      expect(result).toEqual(expect.objectContaining({ id: 'job_456' }));
    });

    it('should return null for non-existent job', async () => {
      vi.mocked(prisma.job.findUnique).mockResolvedValue(null);

      const result = await JobService.findById('non_existent');

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update a job', async () => {
      const mockJob = createTestJob('company_123', { 
        id: 'job_456',
        title: 'Updated Title' 
      });
      vi.mocked(prisma.job.findUnique).mockResolvedValue(mockJob as any);
      vi.mocked(prisma.job.update).mockResolvedValue(mockJob as any);

      const result = await JobService.update('job_456', { 
        title: 'Updated Title' 
      }, 'user_123');

      expect(prisma.job.update).toHaveBeenCalledWith({
        where: { id: 'job_456' },
        data: expect.objectContaining({ title: 'Updated Title' }),
      });
      expect(result?.title).toBe('Updated Title');
    });
  });

  describe('delete', () => {
    it('should delete a job', async () => {
      const mockJob = createTestJob('company_123', { id: 'job_456' });
      vi.mocked(prisma.job.findUnique).mockResolvedValue(mockJob as any);
      vi.mocked(prisma.job.update).mockResolvedValue(mockJob as any);

      await JobService.delete('job_456', 'user_123');

      expect(prisma.job.update).toHaveBeenCalledWith({
        where: { id: 'job_456' },
        data: expect.objectContaining({ isActive: false }),
      });
    });
  });

  describe('findAll', () => {
    it('should list jobs with pagination', async () => {
      const mockJobs = [
        createTestJob('company_123'),
        createTestJob('company_123'),
      ];
      vi.mocked(prisma.job.findMany).mockResolvedValue(mockJobs as any);
      vi.mocked(prisma.job.count).mockResolvedValue(2);

      const result = await JobService.findAll({ page: 1, pageSize: 10 });

      expect(result.data).toHaveLength(2);
      expect(result.meta.total).toBe(2);
      expect(result.meta.page).toBe(1);
      expect(result.meta.pageSize).toBe(10);
    });

    it('should filter jobs by search term', async () => {
      vi.mocked(prisma.job.findMany).mockResolvedValue([]);
      vi.mocked(prisma.job.count).mockResolvedValue(0);

      await JobService.findAll({ query: 'engineer' });

      expect(prisma.job.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              { title: { contains: 'engineer', mode: 'insensitive' } },
            ]),
          }),
        })
      );
    });
  });

  describe('getFeaturedJobs', () => {
    it('should return featured jobs', async () => {
      const mockJobs = [
        createTestJob('company_123', { isFeatured: true }),
      ];
      vi.mocked(prisma.job.findMany).mockResolvedValue(mockJobs as any);

      const result = await JobService.getFeaturedJobs(6);

      expect(prisma.job.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isFeatured: true,
            isActive: true,
          }),
          take: 6,
        })
      );
      expect(result).toEqual(mockJobs);
    });
  });

  describe('applyToJob', () => {
    it('should create a new application', async () => {
      vi.mocked(prisma.jobApplication.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.jobApplication.create).mockResolvedValue({
        id: 'app_123',
        jobId: 'job_456',
        userId: 'user_789',
        status: 'PENDING',
      } as any);

      const result = await JobService.applyToJob(
        'job_456',
        'user_789'
      );

      expect(result).toBeDefined();
      expect(result.status).toBe('PENDING');
    });

    it('should throw error if already applied', async () => {
      vi.mocked(prisma.jobApplication.findFirst).mockResolvedValue({
        id: 'existing_app',
      } as any);

      await expect(
        JobService.applyToJob('job_456', 'user_789')
      ).rejects.toThrow('Already applied to this job');
    });
  });

  describe('getJobStats', () => {
    it('should return job statistics', async () => {
      vi.mocked(prisma.job.findMany).mockResolvedValue([{ id: 'job1' }, { id: 'job2' }] as any);
      vi.mocked(prisma.job.count).mockResolvedValue(5); // active
      vi.mocked(prisma.jobApplication.count).mockResolvedValue(25);

      const result = await JobService.getJobStats('company_123');

      expect(result).toEqual({
        totalJobs: 2,
        activeJobs: 5,
        totalApplications: 25,
      });
    });
  });
});
