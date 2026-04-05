/**
 * Persona Service (Steps 51-52, 59-64)
 * 
 * Manages multi-persona profile switching, intent tracking,
 * onboarding progress, and profile badges.
 */

import { prisma } from '../db';
import type { PersonaType } from '@prisma/client';

// Types
export interface PersonaCreateInput {
  userId: string;
  personaType: PersonaType;
  displayName?: string;
  avatarUrl?: string;
  bio?: string;
  settings?: Record<string, any>;
  isPrimary?: boolean;
}

export interface IntentUpdateInput {
  primaryIntent?: string;
  enabledPortals?: string[];
  primaryRole?: string;
}

export interface OnboardingProgress {
  step: number;
  isComplete: boolean;
  completedAt?: Date;
}

// Available portals for the superapp
export const AVAILABLE_PORTALS = [
  'careers',
  'business',
  'housing',
  'education',
  'wellness',
  'social',
  'entertainment',
  'government',
  'mentorship',
  'finance',
] as const;

// Available intents
export const AVAILABLE_INTENTS = [
  'career_growth',
  'wealth_building',
  'business_ownership',
  'education_advancement',
  'housing_security',
  'community_connection',
  'wellness_journey',
  'cultural_connection',
] as const;

// Available primary roles
export const AVAILABLE_ROLES = [
  'job_seeker',
  'employer',
  'mentor',
  'mentee',
  'student',
  'agent',
  'business_owner',
  'investor',
  'volunteer',
  'community_leader',
] as const;

/**
 * Create or update a user persona
 */
export async function upsertPersona(input: PersonaCreateInput) {
  const { userId, personaType, isPrimary, ...data } = input;

  // If setting as primary, unset other primary personas
  if (isPrimary) {
    await prisma.userPersona.updateMany({
      where: { userId, isPrimary: true },
      data: { isPrimary: false },
    });
  }

  return prisma.userPersona.upsert({
    where: { userId_personaType: { userId, personaType } },
    update: { ...data, isPrimary: isPrimary ?? undefined },
    create: { userId, personaType, isPrimary: isPrimary ?? false, ...data },
  });
}

/**
 * Get all personas for a user
 */
export async function getUserPersonas(userId: string) {
  return prisma.userPersona.findMany({
    where: { userId, isActive: true },
    orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
  });
}

/**
 * Get the primary persona for a user
 */
export async function getPrimaryPersona(userId: string) {
  return prisma.userPersona.findFirst({
    where: { userId, isPrimary: true, isActive: true },
  });
}

/**
 * Switch active persona (for UI context)
 */
export async function switchPersona(userId: string, personaType: PersonaType) {
  const persona = await prisma.userPersona.findUnique({
    where: { userId_personaType: { userId, personaType } },
  });

  if (!persona || !persona.isActive) {
    throw new Error('Persona not found or inactive');
  }

  return persona;
}

/**
 * Deactivate a persona
 */
export async function deactivatePersona(userId: string, personaType: PersonaType) {
  return prisma.userPersona.update({
    where: { userId_personaType: { userId, personaType } },
    data: { isActive: false },
  });
}

/**
 * Get or create user intent tracking
 */
export async function getOrCreateUserIntent(userId: string) {
  return prisma.userIntent.upsert({
    where: { userId },
    update: {},
    create: { userId },
  });
}

/**
 * Update user intent
 */
export async function updateUserIntent(userId: string, input: IntentUpdateInput) {
  return prisma.userIntent.upsert({
    where: { userId },
    update: input,
    create: { userId, ...input },
  });
}

/**
 * Get user's enabled portals
 */
export async function getEnabledPortals(userId: string): Promise<string[]> {
  const intent = await prisma.userIntent.findUnique({
    where: { userId },
    select: { enabledPortals: true },
  });

  return intent?.enabledPortals || ['careers']; // Default to careers
}

/**
 * Enable a portal for a user
 */
export async function enablePortal(userId: string, portal: string) {
  const intent = await getOrCreateUserIntent(userId);
  const portals = new Set(intent.enabledPortals);
  portals.add(portal);

  return prisma.userIntent.update({
    where: { userId },
    data: { enabledPortals: Array.from(portals) },
  });
}

/**
 * Disable a portal for a user
 */
export async function disablePortal(userId: string, portal: string) {
  const intent = await getOrCreateUserIntent(userId);
  const portals = new Set(intent.enabledPortals);
  portals.delete(portal);

  return prisma.userIntent.update({
    where: { userId },
    data: { enabledPortals: Array.from(portals) },
  });
}

/**
 * Update onboarding progress
 */
export async function updateOnboardingProgress(userId: string, step: number) {
  return prisma.userIntent.upsert({
    where: { userId },
    update: { onboardingStep: step },
    create: { userId, onboardingStep: step },
  });
}

/**
 * Complete onboarding
 */
export async function completeOnboarding(userId: string) {
  return prisma.userIntent.upsert({
    where: { userId },
    update: {
      onboardingComplete: true,
      onboardingCompletedAt: new Date(),
    },
    create: {
      userId,
      onboardingComplete: true,
      onboardingCompletedAt: new Date(),
    },
  });
}

/**
 * Get onboarding status
 */
export async function getOnboardingStatus(userId: string): Promise<OnboardingProgress> {
  const intent = await prisma.userIntent.findUnique({
    where: { userId },
    select: {
      onboardingStep: true,
      onboardingComplete: true,
      onboardingCompletedAt: true,
    },
  });

  return {
    step: intent?.onboardingStep || 0,
    isComplete: intent?.onboardingComplete || false,
    completedAt: intent?.onboardingCompletedAt || undefined,
  };
}

/**
 * Award a profile badge
 */
export async function awardBadge(
  userId: string,
  badgeType: string,
  options?: {
    expiresAt?: Date;
    issuedBy?: string;
    metadata?: Record<string, any>;
  }
) {
  return prisma.profileBadge.upsert({
    where: { userId_badgeType: { userId, badgeType } },
    update: {
      isActive: true,
      issuedAt: new Date(),
      expiresAt: options?.expiresAt,
      issuedBy: options?.issuedBy,
      metadata: options?.metadata,
    },
    create: {
      userId,
      badgeType,
      expiresAt: options?.expiresAt,
      issuedBy: options?.issuedBy || 'system',
      metadata: options?.metadata,
    },
  });
}

/**
 * Revoke a profile badge
 */
export async function revokeBadge(userId: string, badgeType: string) {
  return prisma.profileBadge.updateMany({
    where: { userId, badgeType },
    data: { isActive: false },
  });
}

/**
 * Get user's active badges
 */
export async function getUserBadges(userId: string) {
  const now = new Date();

  return prisma.profileBadge.findMany({
    where: {
      userId,
      isActive: true,
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: now } },
      ],
    },
    orderBy: { issuedAt: 'desc' },
  });
}

/**
 * Check if user has a specific badge
 */
export async function hasBadge(userId: string, badgeType: string): Promise<boolean> {
  const badge = await prisma.profileBadge.findUnique({
    where: { userId_badgeType: { userId, badgeType } },
  });

  if (!badge || !badge.isActive) return false;
  if (badge.expiresAt && badge.expiresAt < new Date()) return false;

  return true;
}

// Badge type constants
export const BADGE_TYPES = {
  VERIFIED_IDENTITY: 'verified_identity',
  VERIFIED_WOMAN: 'verified_woman',
  FIRST_NATIONS: 'first_nations',
  MENTOR: 'mentor',
  EMPLOYER: 'employer',
  BUSINESS_OWNER: 'business_owner',
  EARLY_ADOPTER: 'early_adopter',
  COMMUNITY_LEADER: 'community_leader',
  TOP_CONTRIBUTOR: 'top_contributor',
} as const;

export default {
  upsertPersona,
  getUserPersonas,
  getPrimaryPersona,
  switchPersona,
  deactivatePersona,
  getOrCreateUserIntent,
  updateUserIntent,
  getEnabledPortals,
  enablePortal,
  disablePortal,
  updateOnboardingProgress,
  completeOnboarding,
  getOnboardingStatus,
  awardBadge,
  revokeBadge,
  getUserBadges,
  hasBadge,
  AVAILABLE_PORTALS,
  AVAILABLE_INTENTS,
  AVAILABLE_ROLES,
  BADGE_TYPES,
};
