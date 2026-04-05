// @ts-nocheck
/**
 * GDPR Compliance Service (Steps 31-35)
 * 
 * Implements data protection requirements:
 * - Soft delete for users
 * - Data export (Right to Access)
 * - Account deletion (Right to be Forgotten)
 */

import { prisma } from '../db';
import crypto from 'crypto';

// Field-level encryption key (should be from secure vault in production)
const ENCRYPTION_KEY = process.env.DATA_ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

/**
 * Step 35: Encrypt sensitive data
 */
export function encryptField(plaintext: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const key = Buffer.from(ENCRYPTION_KEY, 'hex');
  
  const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, key, iv);
  
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  // Format: iv:authTag:encrypted
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Step 35: Decrypt sensitive data
 */
export function decryptField(ciphertext: string): string {
  const parts = ciphertext.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted data format');
  }
  
  const [ivHex, authTagHex, encrypted] = parts;
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const key = Buffer.from(ENCRYPTION_KEY, 'hex');
  
  const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

/**
 * Step 32: Soft delete a user account
 * Since the User model may not have deletedAt, we'll handle via password marker
 * The actual deletion will be handled by a scheduled job
 */
export async function softDeleteUser(userId: string, _reason?: string): Promise<{ success: boolean; deletionDate: Date }> {
  const deletionDate = new Date();
  deletionDate.setDate(deletionDate.getDate() + 30); // 30-day grace period
  
  // Mark user for deletion by replacing password with a marker
  // This prevents login and indicates scheduled deletion
  await prisma.user.update({
    where: { id: userId },
    data: {
      // Clear password to prevent login - use marker for cleanup job
      password: `DELETED_${deletionDate.getTime()}_${crypto.randomBytes(16).toString('hex')}`,
    },
  });
  
  return { success: true, deletionDate };
}

/**
 * Step 33: Export all user data (GDPR Right to Access)
 */
export async function exportUserData(userId: string): Promise<Record<string, any>> {
  // Get basic user data
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });
  
  if (!user) {
    throw new Error('User not found');
  }
  
  // Get member profile if exists
  const memberProfile = await prisma.memberProfile.findUnique({
    where: { userId },
  }).catch(() => null);
  
  // Get company profile if exists
  const companyProfile = await prisma.companyProfile.findUnique({
    where: { userId },
  }).catch(() => null);
  
  // Collect all related data
  const exportData: Record<string, any> = {
    exportDate: new Date().toISOString(),
    exportVersion: '1.0',
    user: {
      id: user.id,
      email: user.email,
      userType: user.userType,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    },
    profile: memberProfile || companyProfile || null,
  };
  
  // Add job applications if member
  const applications = await prisma.jobApplication.findMany({
    where: { userId },
    include: {
      job: {
        select: {
          title: true,
        },
      },
    },
  });
  
  if (applications.length > 0) {
    exportData.applications = applications.map((app) => ({
      jobTitle: app.job?.title,
      status: app.status,
      appliedAt: app.createdAt,
    }));
  }
  
  // Add jobs if employer
  const jobs = await prisma.job.findMany({
    where: { userId: userId },
    select: {
      id: true,
      title: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  
  if (jobs.length > 0) {
    exportData.postedJobs = jobs;
  }
  
  // Add uploaded files
  const files = await prisma.uploadedFile.findMany({
    where: { userId: userId },
    select: {
      id: true,
      filename: true,
      mimeType: true,
      createdAt: true,
    },
  });
  
  if (files.length > 0) {
    exportData.uploadedFiles = files;
  }
  
  return exportData;
}

/**
 * Step 34: Permanently delete user data (Right to be Forgotten)
 * Should be run after the 30-day grace period
 */
export async function permanentlyDeleteUser(userId: string): Promise<{ success: boolean; deletedResources: string[] }> {
  const deletedResources: string[] = [];
  
  // Delete in order of dependencies
  
  // 1. Delete applications
  const deletedApplications = await prisma.jobApplication.deleteMany({
    where: { userId: userId },
  });
  if (deletedApplications?.count) {
    deletedResources.push(`${deletedApplications.count} applications`);
  }
  
  // 2. Delete uploaded files
  const deletedFiles = await prisma.uploadedFile.deleteMany({
    where: { userId },
  });
  if (deletedFiles?.count) {
    deletedResources.push(`${deletedFiles.count} files`);
  }
  
  // 3. Delete profiles
  await prisma.memberProfile.deleteMany({ where: { userId } }).catch(() => null);
  await prisma.companyProfile.deleteMany({ where: { userId } }).catch(() => null);
  deletedResources.push('profile');
  
  // 4. Finally delete the user
  await prisma.user.delete({
    where: { id: userId },
  });
  deletedResources.push('user account');
  
  return { success: true, deletedResources };
}

/**
 * Step 34: Background job to clean up expired soft-deleted accounts
 * Should be run daily via cron
 * Note: Users with password starting with DELETED_ and timestamp in the past
 */
export async function cleanupExpiredDeletions(): Promise<{ deleted: number }> {
  const now = Date.now();
  
  // Find users whose password starts with DELETED_ (our soft delete marker)
  const markedUsers = await prisma.user.findMany({
    where: {
      password: {
        startsWith: 'DELETED_',
      },
    },
    select: { id: true, password: true },
  });
  
  let deleted = 0;
  
  for (const user of markedUsers) {
    try {
      // Parse deletion timestamp from password marker
      // Format: DELETED_{timestamp}_{randomHex}
      const parts = user.password.split('_');
      if (parts.length >= 2) {
        const deletionTime = parseInt(parts[1], 10);
        if (deletionTime && deletionTime < now) {
          await permanentlyDeleteUser(user.id);
          deleted++;
        }
      }
    } catch (error) {
      console.error(`Failed to delete user ${user.id}:`, error);
    }
  }
  
  return { deleted };
}

export default {
  encryptField,
  decryptField,
  softDeleteUser,
  exportUserData,
  permanentlyDeleteUser,
  cleanupExpiredDeletions,
};

export {};
