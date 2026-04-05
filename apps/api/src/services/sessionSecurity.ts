/**
 * Session Security Service (Steps 53-54, 65-68, 71-72)
 * 
 * Handles device fingerprinting, session management, suspicious login detection,
 * device trust, and remember-me functionality.
 */

import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { prisma } from '../db';
import { logSecurityEvent, SecurityEventType, Severity } from '../lib/securityAudit';

// Types for device info
export interface DeviceInfo {
  deviceId?: string;
  deviceType?: string;
  deviceName?: string;
  browserName?: string;
  browserVersion?: string;
  osName?: string;
  osVersion?: string;
  userAgent?: string;
}

export interface LocationInfo {
  ipAddress?: string;
  city?: string;
  region?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
}

export interface SessionCreateInput {
  userId: string;
  refreshToken: string;
  device?: DeviceInfo;
  location?: LocationInfo;
  expiresAt: Date;
}

// Session timeout configuration (Step 65)
const SESSION_TIMEOUTS = {
  default: 15 * 60 * 1000,        // 15 minutes
  extended: 60 * 60 * 1000,       // 1 hour
  rememberMe: 30 * 24 * 60 * 60 * 1000, // 30 days
};

/**
 * Generate device fingerprint from device info
 */
export function generateDeviceFingerprint(device: DeviceInfo): string {
  const components = [
    device.browserName || '',
    device.browserVersion || '',
    device.osName || '',
    device.osVersion || '',
    device.deviceType || '',
  ].join('|');
  
  return crypto.createHash('sha256').update(components).digest('hex').substring(0, 32);
}

/**
 * Generate unique device ID
 */
export function generateDeviceId(): string {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * Hash refresh token for storage
 */
function hashRefreshToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Create a new session with device/location tracking
 */
export async function createSession(input: SessionCreateInput) {
  const { userId, refreshToken, device, location, expiresAt } = input;
  
  const session = await prisma.userSession.create({
    data: {
      userId,
      refreshTokenHash: hashRefreshToken(refreshToken),
      expiresAt,
      deviceId: device?.deviceId,
      deviceType: device?.deviceType,
      deviceName: device?.deviceName,
      browserName: device?.browserName,
      browserVersion: device?.browserVersion,
      osName: device?.osName,
      osVersion: device?.osVersion,
      ipAddress: location?.ipAddress,
      city: location?.city,
      region: location?.region,
      country: location?.country,
      latitude: location?.latitude,
      longitude: location?.longitude,
    },
  });
  
  return session;
}

/**
 * Find session by refresh token
 */
export async function findSessionByToken(refreshToken: string) {
  const tokenHash = hashRefreshToken(refreshToken);
  
  return prisma.userSession.findUnique({
    where: { refreshTokenHash: tokenHash },
    include: { user: true },
  });
}

/**
 * Update session last active time
 */
export async function touchSession(sessionId: string) {
  return prisma.userSession.update({
    where: { id: sessionId },
    data: { lastActiveAt: new Date() },
  });
}

/**
 * Revoke a session
 */
export async function revokeSession(sessionId: string, reason?: string) {
  return prisma.userSession.update({
    where: { id: sessionId },
    data: {
      isRevoked: true,
      revokedAt: new Date(),
      revokedReason: reason || 'User logout',
    },
  });
}

/**
 * Revoke all sessions for a user (Step 67 - security event)
 */
export async function revokeAllUserSessions(userId: string, reason: string) {
  const result = await prisma.userSession.updateMany({
    where: { userId, isRevoked: false },
    data: {
      isRevoked: true,
      revokedAt: new Date(),
      revokedReason: reason,
    },
  });
  
  logSecurityEvent({
    type: SecurityEventType.ACCOUNT_LOCKOUT,
    userId,
    description: `All sessions revoked: ${reason}`,
    metadata: { sessionsRevoked: result.count },
    severity: Severity.WARNING,
  });
  
  return result;
}

/**
 * Get active sessions for a user
 */
export async function getUserActiveSessions(userId: string) {
  return prisma.userSession.findMany({
    where: {
      userId,
      isRevoked: false,
      expiresAt: { gt: new Date() },
    },
    orderBy: { lastActiveAt: 'desc' },
    select: {
      id: true,
      deviceType: true,
      deviceName: true,
      browserName: true,
      osName: true,
      city: true,
      country: true,
      lastActiveAt: true,
      createdAt: true,
    },
  });
}

/**
 * Step 66: Suspicious login detection
 */
export async function detectSuspiciousLogin(
  userId: string,
  currentDevice: DeviceInfo,
  currentLocation: LocationInfo
): Promise<{ isSuspicious: boolean; reasons: string[] }> {
  const reasons: string[] = [];
  
  // Get recent sessions
  const recentSessions = await prisma.userSession.findMany({
    where: {
      userId,
      createdAt: { gt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }, // Last 30 days
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });
  
  if (recentSessions.length === 0) {
    // First login - not suspicious but notable
    return { isSuspicious: false, reasons: [] };
  }
  
  // Check for new device
  const knownDevices = new Set(recentSessions.map(s => s.deviceId).filter(Boolean));
  if (currentDevice.deviceId && !knownDevices.has(currentDevice.deviceId)) {
    reasons.push('New device detected');
  }
  
  // Check for new location (different country)
  const knownCountries = new Set(recentSessions.map(s => s.country).filter(Boolean));
  if (currentLocation.country && !knownCountries.has(currentLocation.country)) {
    reasons.push(`Login from new country: ${currentLocation.country}`);
  }
  
  // Check for impossible travel (login from far location in short time)
  const lastSession = recentSessions[0];
  if (lastSession && lastSession.latitude && lastSession.longitude && 
      currentLocation.latitude && currentLocation.longitude) {
    const timeDiffHours = (Date.now() - lastSession.createdAt.getTime()) / (1000 * 60 * 60);
    const distance = calculateDistance(
      lastSession.latitude, lastSession.longitude,
      currentLocation.latitude, currentLocation.longitude
    );
    
    // If more than 500km in less than 1 hour, suspicious
    if (distance > 500 && timeDiffHours < 1) {
      reasons.push('Impossible travel detected');
    }
  }
  
  const isSuspicious = reasons.length > 0;
  
  if (isSuspicious) {
    logSecurityEvent({
      type: SecurityEventType.SUSPICIOUS_ACTIVITY,
      userId,
      description: 'Suspicious login detected',
      metadata: { reasons, device: currentDevice, location: currentLocation },
      severity: Severity.WARNING,
    });
  }
  
  return { isSuspicious, reasons };
}

/**
 * Calculate distance between two coordinates (Haversine formula)
 */
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Step 71: Device trust management
 */
export async function trustDevice(userId: string, deviceId: string, deviceName?: string) {
  const trustExpiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000); // 90 days
  
  return prisma.trustedDevice.upsert({
    where: { userId_deviceId: { userId, deviceId } },
    update: {
      isTrusted: true,
      trustedAt: new Date(),
      trustExpiresAt,
      deviceName,
      lastSeenAt: new Date(),
    },
    create: {
      userId,
      deviceId,
      deviceName,
      isTrusted: true,
      trustedAt: new Date(),
      trustExpiresAt,
    },
  });
}

export async function isDeviceTrusted(userId: string, deviceId: string): Promise<boolean> {
  const device = await prisma.trustedDevice.findUnique({
    where: { userId_deviceId: { userId, deviceId } },
  });
  
  if (!device) return false;
  if (!device.isTrusted) return false;
  if (device.trustExpiresAt && device.trustExpiresAt < new Date()) return false;
  
  // Update last seen
  await prisma.trustedDevice.update({
    where: { id: device.id },
    data: { lastSeenAt: new Date() },
  });
  
  return true;
}

export async function revokeTrustedDevice(userId: string, deviceId: string) {
  return prisma.trustedDevice.updateMany({
    where: { userId, deviceId },
    data: { isTrusted: false },
  });
}

/**
 * Step 72: Remember me token management
 */
export async function createRememberMeToken(
  userId: string,
  deviceId?: string,
  ipAddress?: string,
  userAgent?: string
): Promise<string> {
  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const expiresAt = new Date(Date.now() + SESSION_TIMEOUTS.rememberMe);
  
  await prisma.rememberMeToken.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
      deviceId,
      ipAddress,
      userAgent,
    },
  });
  
  return token;
}

export async function validateRememberMeToken(token: string) {
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  
  const rememberMe = await prisma.rememberMeToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });
  
  if (!rememberMe) return null;
  if (rememberMe.expiresAt < new Date()) {
    // Clean up expired token
    await prisma.rememberMeToken.delete({ where: { id: rememberMe.id } });
    return null;
  }
  if (rememberMe.usedAt) {
    // Token already used - potential replay attack
    logSecurityEvent({
      type: SecurityEventType.SUSPICIOUS_ACTIVITY,
      userId: rememberMe.userId,
      description: 'Remember-me token reuse detected',
      metadata: { tokenId: rememberMe.id },
      severity: Severity.WARNING,
    });
    return null;
  }
  
  // Mark as used and return user
  await prisma.rememberMeToken.update({
    where: { id: rememberMe.id },
    data: { usedAt: new Date() },
  });
  
  return rememberMe.user;
}

/**
 * Clean up expired sessions and tokens
 */
export async function cleanupExpiredSessions() {
  const now = new Date();
  
  // Delete expired sessions
  const deletedSessions = await prisma.userSession.deleteMany({
    where: {
      OR: [
        { expiresAt: { lt: now } },
        { isRevoked: true, revokedAt: { lt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) } },
      ],
    },
  });
  
  // Delete expired remember-me tokens
  const deletedTokens = await prisma.rememberMeToken.deleteMany({
    where: { expiresAt: { lt: now } },
  });
  
  return {
    deletedSessions: deletedSessions.count,
    deletedTokens: deletedTokens.count,
  };
}

export default {
  generateDeviceFingerprint,
  generateDeviceId,
  createSession,
  findSessionByToken,
  touchSession,
  revokeSession,
  revokeAllUserSessions,
  getUserActiveSessions,
  detectSuspiciousLogin,
  trustDevice,
  isDeviceTrusted,
  revokeTrustedDevice,
  createRememberMeToken,
  validateRememberMeToken,
  cleanupExpiredSessions,
};
