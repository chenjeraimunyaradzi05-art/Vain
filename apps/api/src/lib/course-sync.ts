"use strict";

/**
 * TAFE/RTO Course Sync Job
 * Ingests course data from external providers
 */
import { prisma } from '../db';

// Mock TAFE providers for demonstration
const PROVIDERS = [
  { id: 'tafe-nsw', name: 'TAFE NSW', rtoCode: '90003' },
  { id: 'tafe-qld', name: 'TAFE Queensland', rtoCode: '0275' },
  { id: 'tafe-vic', name: 'TAFE Victoria', rtoCode: '3077' },
  { id: 'tafe-wa', name: 'TAFE WA', rtoCode: '52395' },
];

/**
 * Fetch courses from a TAFE provider API
 * In production, this would call actual provider APIs
 */
async function fetchProviderCourses(provider) {
  // Mock data - in production, fetch from actual API
  const mockCourses = [
    {
      externalId: `${provider.id}-cert3-business`,
      title: 'Certificate III in Business',
      description: 'Develop essential business skills for administrative and customer service roles.',
      qualification: 'Certificate III',
      nationalCode: 'BSB30120',
      industry: 'Business',
      duration: '6 months',
      deliveryMode: 'blended',
      price: 150000, // $1,500 in cents
      fundingAvailable: true,
      startDates: JSON.stringify(['2025-02-01', '2025-07-01']),
    },
    {
      externalId: `${provider.id}-cert3-it`,
      title: 'Certificate III in Information Technology',
      description: 'Entry-level IT qualification covering hardware, software, and networking basics.',
      qualification: 'Certificate III',
      nationalCode: 'ICT30120',
      industry: 'Information Technology',
      duration: '6 months',
      deliveryMode: 'online',
      price: 180000,
      fundingAvailable: true,
      startDates: JSON.stringify(['2025-03-01', '2025-09-01']),
    },
    {
      externalId: `${provider.id}-cert4-training`,
      title: 'Certificate IV in Training and Assessment',
      description: 'Become a qualified trainer and assessor in vocational education.',
      qualification: 'Certificate IV',
      nationalCode: 'TAE40122',
      industry: 'Education',
      duration: '12 months',
      deliveryMode: 'blended',
      price: 320000,
      fundingAvailable: true,
      startDates: JSON.stringify(['2025-01-15', '2025-06-15']),
    },
    {
      externalId: `${provider.id}-diploma-community`,
      title: 'Diploma of Community Services',
      description: 'Advanced qualification for community service and case management roles.',
      qualification: 'Diploma',
      nationalCode: 'CHC52021',
      industry: 'Community Services',
      duration: '18 months',
      deliveryMode: 'face-to-face',
      price: 450000,
      fundingAvailable: true,
      startDates: JSON.stringify(['2025-02-15']),
    },
    {
      externalId: `${provider.id}-cert3-health`,
      title: 'Certificate III in Health Services Assistance',
      description: 'Prepare for roles as health services assistants in various healthcare settings.',
      qualification: 'Certificate III',
      nationalCode: 'HLT33115',
      industry: 'Health',
      duration: '6 months',
      deliveryMode: 'blended',
      price: 200000,
      fundingAvailable: true,
      startDates: JSON.stringify(['2025-04-01', '2025-10-01']),
    },
  ];

  return mockCourses.map((course) => ({
    ...course,
    provider: provider.name,
    providerId: provider.rtoCode,
    location: `${provider.name} Campus`,
  }));
}

/**
 * Sync courses from all providers
 */
async function syncAllCourses() {
  console.log('[Course Sync] Starting course synchronization...');
  const startTime = Date.now();
  let totalSynced = 0;
  let totalErrors = 0;

  for (const provider of PROVIDERS) {
    try {
      console.log(`[Course Sync] Fetching courses from ${provider.name}...`);
      const courses = await fetchProviderCourses(provider);

      for (const course of courses) {
        try {
          // Use externalId if provided, otherwise use provider + course code combo
          const lookupId = course.externalId || `${provider.id}-${course.nationalCode || course.title}`;
          
          // Find existing or create
          const existing = await prisma.externalCourse.findFirst({
            where: { externalId: lookupId }
          });

          if (existing) {
            await prisma.externalCourse.update({
              where: { id: existing.id },
              data: {
                ...course,
                externalId: lookupId,
                isActive: true,
                lastSyncedAt: new Date(),
              }
            });
          } else {
            await prisma.externalCourse.create({
              data: {
                ...course,
                externalId: lookupId,
                isActive: true,
                lastSyncedAt: new Date(),
              }
            });
          }
          totalSynced++;
        } catch (err: any) {
          console.error(`[Course Sync] Error syncing course ${course.externalId}:`, err.message);
          totalErrors++;
        }
      }

      console.log(`[Course Sync] Synced ${courses.length} courses from ${provider.name}`);
    } catch (err) {
      console.error(`[Course Sync] Error fetching from ${provider.name}:`, err.message);
      totalErrors++;
    }
  }

  const duration = Date.now() - startTime;
  console.log(`[Course Sync] Completed in ${duration}ms. Synced: ${totalSynced}, Errors: ${totalErrors}`);

  return { synced: totalSynced, errors: totalErrors, duration };
}

/**
 * Mark stale courses as inactive
 * Courses not updated in the last sync are marked inactive
 */
async function markStaleCourses(threshold = 48) {
  const cutoff = new Date();
  cutoff.setHours(cutoff.getHours() - threshold);

  const result = await prisma.externalCourse.updateMany({
    where: {
      lastSyncedAt: { lt: cutoff },
      isActive: true,
    },
    data: { isActive: false },
  });

  console.log(`[Course Sync] Marked ${result.count} stale courses as inactive`);
  return result.count;
}

/**
 * Run the sync job (called by cron or manually)
 */
async function runSyncJob() {
  try {
    const result = await syncAllCourses();
    const staleCount = await markStaleCourses();
    
    return {
      success: true,
      synced: result.synced,
      errors: result.errors,
      staleMarked: staleCount,
      duration: result.duration,
      timestamp: new Date().toISOString(),
    };
  } catch (err) {
    console.error('[Course Sync] Job failed:', err);
    return {
      success: false,
      error: err.message,
      timestamp: new Date().toISOString(),
    };
  }
}
