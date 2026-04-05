/**
 * Indigenous Data Sovereignty Service
 * 
 * Implements data sovereignty principles for Aboriginal and Torres Strait Islander peoples.
 * Based on the CARE Principles and Indigenous Data Sovereignty frameworks.
 * 
 * CARE Principles:
 * - Collective Benefit
 * - Authority to Control
 * - Responsibility
 * - Ethics
 * 
 * Features:
 * - User data ownership and control
 * - Community data governance
 * - Cultural data protection protocols
 * - Consent management
 * - Data export and portability
 * - Right to deletion
 * - Cultural sensitivity classification
 */

import { prisma as prismaClient } from '../lib/database';
import { logger } from '../lib/logger';
import { redisCache } from '../lib/redisCacheWrapper';
import crypto from 'crypto';

const prisma = prismaClient as any;

// Types
export interface DataSovereigntyPreferences {
  userId: string;
  
  // Data sharing preferences
  shareProfileWithEmployers: boolean;
  shareProfileWithMentors: boolean;
  shareWithResearchInstitutions: boolean;
  shareAggregatedData: boolean;
  
  // Cultural data preferences
  shareCulturalIdentity: boolean;
  shareLanguageInfo: boolean;
  shareCommunityAffiliation: boolean;
  allowCulturalDataResearch: boolean;
  
  // Location and activity
  shareLocation: boolean;
  allowActivityTracking: boolean;
  
  // Communication preferences
  allowDirectContact: boolean;
  allowMarketingEmails: boolean;
  
  // Third-party sharing
  shareWithPartnerOrganizations: boolean;
  shareWithGovernmentAgencies: boolean;
  
  updatedAt: Date;
}

export interface ConsentRecord {
  id: string;
  userId: string;
  consentType: ConsentType;
  purpose: string;
  granted: boolean;
  grantedAt?: Date;
  revokedAt?: Date;
  expiresAt?: Date;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
}

export type ConsentType = 
  | 'TERMS_OF_SERVICE'
  | 'PRIVACY_POLICY'
  | 'DATA_COLLECTION'
  | 'CULTURAL_DATA_SHARING'
  | 'RESEARCH_PARTICIPATION'
  | 'MARKETING_COMMUNICATIONS'
  | 'THIRD_PARTY_SHARING'
  | 'GOVERNMENT_REPORTING'
  | 'ANALYTICS_TRACKING'
  | 'PROFILE_VISIBILITY';

export interface DataExportRequest {
  id: string;
  userId: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'EXPIRED';
  format: 'JSON' | 'CSV' | 'PDF';
  requestedAt: Date;
  completedAt?: Date;
  expiresAt?: Date;
  downloadUrl?: string;
  error?: string;
}

export interface DeletionRequest {
  id: string;
  userId: string;
  type: 'FULL' | 'PARTIAL';
  dataCategories?: string[];
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'CANCELLED';
  reason?: string;
  requestedAt: Date;
  completedAt?: Date;
  gracePeriodEnds?: Date; // 30-day grace period for recovery
}

export interface CulturalDataClassification {
  level: 'PUBLIC' | 'COMMUNITY' | 'RESTRICTED' | 'SACRED';
  nations?: string[];
  requiresElderApproval: boolean;
  sharingRestrictions: string[];
  protocolNotes?: string;
}

export interface DataAccessLog {
  id: string;
  userId: string;
  accessorId: string;
  accessorType: 'USER' | 'ADMIN' | 'SYSTEM' | 'API' | 'RESEARCH';
  dataCategory: string;
  action: 'VIEW' | 'EXPORT' | 'SHARE' | 'MODIFY' | 'DELETE';
  timestamp: Date;
  ipAddress?: string;
  purpose?: string;
  approved: boolean;
}

// Default preferences respecting privacy
const DEFAULT_PREFERENCES: Omit<DataSovereigntyPreferences, 'userId' | 'updatedAt'> = {
  shareProfileWithEmployers: true,
  shareProfileWithMentors: true,
  shareWithResearchInstitutions: false,
  shareAggregatedData: true,
  shareCulturalIdentity: false, // Opt-in for cultural data
  shareLanguageInfo: false,
  shareCommunityAffiliation: false,
  allowCulturalDataResearch: false,
  shareLocation: true,
  allowActivityTracking: true,
  allowDirectContact: true,
  allowMarketingEmails: false,
  shareWithPartnerOrganizations: false,
  shareWithGovernmentAgencies: false,
};

class DataSovereigntyService {
  private static instance: DataSovereigntyService;
  private cachePrefix = 'data_sovereignty:';
  private cacheTTL = 3600;

  static getInstance(): DataSovereigntyService {
    if (!DataSovereigntyService.instance) {
      DataSovereigntyService.instance = new DataSovereigntyService();
    }
    return DataSovereigntyService.instance;
  }

  /**
   * Get user's data sovereignty preferences
   */
  async getPreferences(userId: string): Promise<DataSovereigntyPreferences> {
    try {
      const cacheKey = `${this.cachePrefix}prefs:${userId}`;
      const cached = await redisCache.get(cacheKey);
      if (cached) {
        return JSON.parse(cached as string);
      }

      let prefs = await prisma.dataSovereigntyPreference.findUnique({
        where: { userId },
      });

      if (!prefs) {
        // Create default preferences
        prefs = await prisma.dataSovereigntyPreference.create({
          data: {
            userId,
            ...DEFAULT_PREFERENCES,
          },
        });
      }

      await redisCache.set(cacheKey, JSON.stringify(prefs), this.cacheTTL);
      return prefs as DataSovereigntyPreferences;
    } catch (error: any) {
      logger.error('Failed to get data sovereignty preferences', { error: error.message, userId });
      throw error;
    }
  }

  /**
   * Update data sovereignty preferences
   */
  async updatePreferences(
    userId: string, 
    updates: Partial<DataSovereigntyPreferences>
  ): Promise<DataSovereigntyPreferences> {
    try {
      const prefs = await prisma.dataSovereigntyPreference.upsert({
        where: { userId },
        create: {
          userId,
          ...DEFAULT_PREFERENCES,
          ...updates,
        },
        update: {
          ...updates,
          updatedAt: new Date(),
        },
      });

      // Log the preference change
      await this.logDataAccess({
        userId,
        accessorId: userId,
        accessorType: 'USER',
        dataCategory: 'preferences',
        action: 'MODIFY',
        purpose: 'User updated data sovereignty preferences',
        approved: true,
      });

      // Invalidate cache
      await redisCache.delete(`${this.cachePrefix}prefs:${userId}`);

      logger.info('Data sovereignty preferences updated', { userId });
      return prefs as DataSovereigntyPreferences;
    } catch (error: any) {
      logger.error('Failed to update preferences', { error: error.message, userId });
      throw error;
    }
  }

  /**
   * Record user consent
   */
  async recordConsent(
    userId: string,
    consentType: ConsentType,
    granted: boolean,
    metadata?: {
      purpose?: string;
      ipAddress?: string;
      userAgent?: string;
      expiresAt?: Date;
    }
  ): Promise<ConsentRecord> {
    try {
      const consent = await prisma.consentRecord.upsert({
        where: {
          userId_consentType: { userId, consentType },
        },
        create: {
          userId,
          consentType,
          granted,
          purpose: metadata?.purpose || consentType,
          grantedAt: granted ? new Date() : undefined,
          revokedAt: !granted ? new Date() : undefined,
          expiresAt: metadata?.expiresAt,
          ipAddress: metadata?.ipAddress,
          userAgent: metadata?.userAgent,
        },
        update: {
          granted,
          ...(granted 
            ? { grantedAt: new Date(), revokedAt: null }
            : { revokedAt: new Date() }
          ),
          expiresAt: metadata?.expiresAt,
          ipAddress: metadata?.ipAddress,
          userAgent: metadata?.userAgent,
        },
      });

      logger.info('Consent recorded', { 
        userId, 
        consentType, 
        granted,
      });

      return consent as ConsentRecord;
    } catch (error: any) {
      logger.error('Failed to record consent', { error: error.message, userId, consentType });
      throw error;
    }
  }

  /**
   * Check if user has granted specific consent
   */
  async hasConsent(userId: string, consentType: ConsentType): Promise<boolean> {
    try {
      const consent = await prisma.consentRecord.findUnique({
        where: {
          userId_consentType: { userId, consentType },
        },
      });

      if (!consent || !consent.granted) return false;
      if (consent.revokedAt) return false;
      if (consent.expiresAt && consent.expiresAt < new Date()) return false;

      return true;
    } catch (error: any) {
      logger.error('Failed to check consent', { error: error.message, userId, consentType });
      return false;
    }
  }

  /**
   * Get all consent records for a user
   */
  async getAllConsents(userId: string): Promise<ConsentRecord[]> {
    try {
      const consents = await prisma.consentRecord.findMany({
        where: { userId },
        orderBy: { consentType: 'asc' },
      });
      return consents as ConsentRecord[];
    } catch (error: any) {
      logger.error('Failed to get consents', { error: error.message, userId });
      return [];
    }
  }

  /**
   * Request data export (GDPR compliance)
   */
  async requestDataExport(
    userId: string, 
    format: 'JSON' | 'CSV' | 'PDF' = 'JSON'
  ): Promise<DataExportRequest> {
    try {
      // Check for existing pending request
      const existing = await prisma.dataExportRequest.findFirst({
        where: {
          userId,
          status: { in: ['PENDING', 'PROCESSING'] },
        },
      });

      if (existing) {
        throw new Error('A data export request is already in progress');
      }

      const request = await prisma.dataExportRequest.create({
        data: {
          userId,
          format,
          status: 'PENDING',
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        },
      });

      // Queue the export job (background processing)
      // queueService.add('data-export', { requestId: request.id, userId, format });

      logger.info('Data export requested', { userId, requestId: request.id, format });
      return request as DataExportRequest;
    } catch (error: any) {
      logger.error('Failed to request data export', { error: error.message, userId });
      throw error;
    }
  }

  /**
   * Process data export request
   */
  async processDataExport(requestId: string): Promise<void> {
    try {
      const request = await prisma.dataExportRequest.findUnique({
        where: { id: requestId },
      });

      if (!request) throw new Error('Export request not found');

      await prisma.dataExportRequest.update({
        where: { id: requestId },
        data: { status: 'PROCESSING' },
      });

      // Gather all user data
      const exportData = await this.gatherUserData(request.userId);

      // Generate export file based on format
      const { url, expiresAt } = await this.generateExportFile(
        request.userId,
        exportData,
        request.format as 'JSON' | 'CSV' | 'PDF'
      );

      await prisma.dataExportRequest.update({
        where: { id: requestId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          downloadUrl: url,
          expiresAt,
        },
      });

      // Log the access
      await this.logDataAccess({
        userId: request.userId,
        accessorId: request.userId,
        accessorType: 'USER',
        dataCategory: 'full_export',
        action: 'EXPORT',
        purpose: 'User requested data export',
        approved: true,
      });

      logger.info('Data export completed', { requestId, userId: request.userId });
    } catch (error: any) {
      await prisma.dataExportRequest.update({
        where: { id: requestId },
        data: {
          status: 'FAILED',
          error: error.message,
        },
      });
      logger.error('Data export failed', { error: error.message, requestId });
      throw error;
    }
  }

  /**
   * Gather all user data for export
   */
  private async gatherUserData(userId: string): Promise<Record<string, any>> {
    const [
      user,
      memberProfile,
      mentorProfile,
      companyProfile,
      applications,
      messages,
      connections,
      preferences,
      consents,
    ] = await Promise.all([
      prisma.user.findUnique({ 
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          userType: true,
          createdAt: true,
          updatedAt: true,
          lastActiveAt: true,
        },
      }),
      prisma.memberProfile.findUnique({ where: { userId } }),
      prisma.mentorProfile.findUnique({ where: { userId } }),
      prisma.companyProfile.findUnique({ where: { userId } }),
      prisma.application.findMany({ 
        where: { userId },
        include: { job: { select: { id: true, title: true, company: true } } },
      }),
      prisma.message.findMany({ 
        where: { senderId: userId },
        select: { id: true, content: true, createdAt: true },
      }),
      prisma.connection.findMany({
        where: { OR: [{ userId }, { connectedUserId: userId }] },
      }),
      prisma.dataSovereigntyPreference.findUnique({ where: { userId } }),
      prisma.consentRecord.findMany({ where: { userId } }),
    ]);

    return {
      exportedAt: new Date().toISOString(),
      user,
      profiles: {
        member: memberProfile,
        mentor: mentorProfile,
        company: companyProfile,
      },
      applications,
      messages: {
        count: messages.length,
        // Don't include full message content for privacy
      },
      connections,
      preferences,
      consents,
    };
  }

  /**
   * Generate export file (placeholder - actual implementation would create files)
   */
  private async generateExportFile(
    userId: string,
    data: Record<string, any>,
    format: 'JSON' | 'CSV' | 'PDF'
  ): Promise<{ url: string; expiresAt: Date }> {
    // In production, this would:
    // 1. Generate the file in the appropriate format
    // 2. Upload to secure storage (S3/GCS)
    // 3. Generate signed URL for download
    
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    return {
      url: `/api/data-export/download/${userId}/${token}`,
      expiresAt,
    };
  }

  /**
   * Request account deletion
   */
  async requestDeletion(
    userId: string,
    options: {
      type: 'FULL' | 'PARTIAL';
      dataCategories?: string[];
      reason?: string;
    }
  ): Promise<DeletionRequest> {
    try {
      // Check for existing request
      const existing = await prisma.deletionRequest.findFirst({
        where: {
          userId,
          status: { in: ['PENDING', 'PROCESSING'] },
        },
      });

      if (existing) {
        throw new Error('A deletion request is already pending');
      }

      const gracePeriodEnds = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

      const request = await prisma.deletionRequest.create({
        data: {
          userId,
          type: options.type,
          dataCategories: options.dataCategories ? JSON.stringify(options.dataCategories) : undefined,
          reason: options.reason,
          status: 'PENDING',
          gracePeriodEnds,
        },
      });

      logger.info('Deletion request created', { 
        userId, 
        requestId: request.id, 
        type: options.type,
        gracePeriodEnds,
      });

      return request as unknown as DeletionRequest;
    } catch (error: any) {
      logger.error('Failed to request deletion', { error: error.message, userId });
      throw error;
    }
  }

  /**
   * Cancel a deletion request (within grace period)
   */
  async cancelDeletion(userId: string, requestId: string): Promise<void> {
    try {
      const request = await prisma.deletionRequest.findFirst({
        where: { id: requestId, userId, status: 'PENDING' },
      });

      if (!request) {
        throw new Error('Deletion request not found or cannot be cancelled');
      }

      if (request.gracePeriodEnds && request.gracePeriodEnds < new Date()) {
        throw new Error('Grace period has expired, deletion cannot be cancelled');
      }

      await prisma.deletionRequest.update({
        where: { id: requestId },
        data: { status: 'CANCELLED' },
      });

      logger.info('Deletion request cancelled', { userId, requestId });
    } catch (error: any) {
      logger.error('Failed to cancel deletion', { error: error.message, userId, requestId });
      throw error;
    }
  }

  /**
   * Log data access for audit trail
   */
  async logDataAccess(data: Omit<DataAccessLog, 'id' | 'timestamp'>): Promise<void> {
    try {
      await prisma.dataAccessLog.create({
        data: {
          ...data,
          timestamp: new Date(),
        },
      });
    } catch (error: any) {
      // Don't throw - logging should not break functionality
      logger.error('Failed to log data access', { error: error.message, ...data });
    }
  }

  /**
   * Get data access history for a user
   */
  async getAccessHistory(
    userId: string,
    options: { limit?: number; offset?: number } = {}
  ): Promise<{ logs: DataAccessLog[]; total: number }> {
    const { limit = 50, offset = 0 } = options;

    try {
      const [logs, total] = await Promise.all([
        prisma.dataAccessLog.findMany({
          where: { userId },
          orderBy: { timestamp: 'desc' },
          take: limit,
          skip: offset,
        }),
        prisma.dataAccessLog.count({ where: { userId } }),
      ]);

      return { logs: logs as DataAccessLog[], total };
    } catch (error: any) {
      logger.error('Failed to get access history', { error: error.message, userId });
      return { logs: [], total: 0 };
    }
  }

  /**
   * Check if data can be shared based on user preferences and consent
   */
  async canShareData(
    userId: string,
    purpose: 'EMPLOYER' | 'MENTOR' | 'RESEARCH' | 'GOVERNMENT' | 'PARTNER',
    dataCategory?: 'profile' | 'cultural' | 'activity'
  ): Promise<boolean> {
    try {
      const prefs = await this.getPreferences(userId);

      switch (purpose) {
        case 'EMPLOYER':
          return prefs.shareProfileWithEmployers;
        case 'MENTOR':
          return prefs.shareProfileWithMentors;
        case 'RESEARCH':
          if (dataCategory === 'cultural') {
            return prefs.allowCulturalDataResearch;
          }
          return prefs.shareWithResearchInstitutions;
        case 'GOVERNMENT':
          return prefs.shareWithGovernmentAgencies;
        case 'PARTNER':
          return prefs.shareWithPartnerOrganizations;
        default:
          return false;
      }
    } catch (error) {
      return false;
    }
  }

  /**
   * Get cultural data with appropriate access checks
   */
  async getCulturalData(
    userId: string,
    requesterId: string,
    requesterType: 'USER' | 'ADMIN' | 'RESEARCH'
  ): Promise<{
    allowed: boolean;
    data?: any;
    restrictions?: string[];
  }> {
    try {
      const prefs = await this.getPreferences(userId);

      // Self-access is always allowed
      if (userId === requesterId) {
        const profile = await prisma.memberProfile.findUnique({
          where: { userId },
          select: {
            indigenousAffiliation: true,
            culturalInterests: true,
            languages: true,
            communityConnections: true,
          },
        });

        return { allowed: true, data: profile };
      }

      // Check if cultural data sharing is enabled
      if (!prefs.shareCulturalIdentity) {
        return {
          allowed: false,
          restrictions: ['User has not enabled cultural data sharing'],
        };
      }

      // Research access requires additional consent
      if (requesterType === 'RESEARCH') {
        const hasConsent = await this.hasConsent(userId, 'CULTURAL_DATA_SHARING');
        if (!hasConsent) {
          return {
            allowed: false,
            restrictions: ['Research consent not granted for cultural data'],
          };
        }
      }

      // Log the access
      await this.logDataAccess({
        userId,
        accessorId: requesterId,
        accessorType: requesterType,
        dataCategory: 'cultural',
        action: 'VIEW',
        purpose: `${requesterType} access to cultural data`,
        approved: true,
      });

      // Return limited data based on preferences
      const profile = await prisma.memberProfile.findUnique({
        where: { userId },
        select: {
          indigenousAffiliation: prefs.shareCommunityAffiliation,
          languages: prefs.shareLanguageInfo,
        },
      });

      return { allowed: true, data: profile };
    } catch (error: any) {
      logger.error('Failed to get cultural data', { error: error.message, userId, requesterId });
      return { allowed: false, restrictions: ['An error occurred'] };
    }
  }
}

// Export singleton instance
export const dataSovereigntyService = DataSovereigntyService.getInstance();

// Export class for testing
export { DataSovereigntyService };

