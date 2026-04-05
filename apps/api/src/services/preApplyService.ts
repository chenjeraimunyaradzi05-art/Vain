/**
 * Pre-Apply Service
 * 
 * Handles matching new jobs to users who have opted into the pre-apply queue.
 * When a new job is posted, this service:
 * 1. Finds all users with enablePreApply = true
 * 2. Scores each user against the job based on their parsed resume and preferences
 * 3. Creates PreApplyQueueEntry records for high-scoring matches
 * 4. Sends notifications to matched users
 */

import { prisma } from '../db';
import { notificationService } from './notificationService';

interface JobMatchCriteria {
  title: string;
  description: string;
  location?: string | null;
  employment?: string | null;
  salaryLow?: number | null;
  salaryHigh?: number | null;
  requiredSkills?: string[];
}

interface UserPreApplyProfile {
  userId: string;
  memberId: string;
  email: string;
  name?: string | null;
  preApplyLocations?: string[];
  preApplyEmployment?: string[];
  preApplySalaryMin?: number | null;
  preApplySalaryMax?: number | null;
  preApplyIndustries?: string[];
  parsedResumeSkills?: string[];
}

/**
 * Calculate match score between a job and user's pre-apply preferences
 */
function calculatePreApplyMatchScore(
  job: JobMatchCriteria,
  userProfile: UserPreApplyProfile
): number {
  let score = 0;
  let totalFactors = 0;

  // Location match (25% weight)
  if (userProfile.preApplyLocations && userProfile.preApplyLocations.length > 0 && job.location) {
    totalFactors += 25;
    const jobLocationLower = job.location.toLowerCase();
    const locationMatch = userProfile.preApplyLocations.some(loc => 
      jobLocationLower.includes(loc.toLowerCase()) || loc.toLowerCase().includes(jobLocationLower)
    );
    if (locationMatch) score += 25;
  }

  // Employment type match (20% weight)
  if (userProfile.preApplyEmployment && userProfile.preApplyEmployment.length > 0 && job.employment) {
    totalFactors += 20;
    if (userProfile.preApplyEmployment.includes(job.employment)) {
      score += 20;
    }
  }

  // Salary range overlap (20% weight)
  if (userProfile.preApplySalaryMin || userProfile.preApplySalaryMax) {
    totalFactors += 20;
    if (job.salaryLow || job.salaryHigh) {
      const userMin = userProfile.preApplySalaryMin || 0;
      const userMax = userProfile.preApplySalaryMax || Infinity;
      const jobMin = job.salaryLow || 0;
      const jobMax = job.salaryHigh || Infinity;

      // Check for overlap
      if (jobMax >= userMin && jobMin <= userMax) {
        score += 20;
      }
    }
  }

  // Skills match (35% weight)
  if (userProfile.parsedResumeSkills && userProfile.parsedResumeSkills.length > 0) {
    totalFactors += 35;
    const jobText = `${job.title} ${job.description}`.toLowerCase();
    const matchedSkills = userProfile.parsedResumeSkills.filter(skill => 
      jobText.includes(skill.toLowerCase())
    );
    const skillMatchRatio = matchedSkills.length / userProfile.parsedResumeSkills.length;
    score += Math.round(skillMatchRatio * 35);
  }

  // If no factors evaluated, return base score of 50 (neutral)
  if (totalFactors === 0) return 50;

  // Normalize score to 0-100 based on factors evaluated
  return Math.round((score / totalFactors) * 100);
}

export class PreApplyService {
  /**
   * Process a newly posted job and match it to pre-apply users
   */
  static async processNewJob(jobId: string): Promise<{ matched: number; notified: number }> {
    const result = { matched: 0, notified: 0 };

    try {
      // Get the job details
      const job = await prisma.job.findUnique({
        where: { id: jobId },
        include: {
          user: {
            include: { companyProfile: true }
          },
          jobSkills: {
            include: { skill: true }
          }
        }
      });

      if (!job || !job.isActive) {
        console.log(`[PreApply] Job ${jobId} not found or inactive`);
        return result;
      }

      // Get all users with pre-apply enabled
      const preApplyUsers = await prisma.memberFoundationPreference.findMany({
        where: { enablePreApply: true },
        include: {
          member: {
            include: {
              user: {
                select: {
                  id: true,
                  email: true,
                  name: true,
                }
              }
            }
          }
        }
      });

      console.log(`[PreApply] Processing job "${job.title}" for ${preApplyUsers.length} pre-apply users`);

      // Get required skills from job
      const requiredSkills = job.jobSkills?.map(js => js.skill.name) || [];

      const jobCriteria: JobMatchCriteria = {
        title: job.title,
        description: job.description,
        location: job.location,
        employment: job.employment,
        salaryLow: job.salaryLow,
        salaryHigh: job.salaryHigh,
        requiredSkills,
      };

      const companyName = job.user?.companyProfile?.companyName || 'Company';

      for (const prefs of preApplyUsers) {
        try {
          // Parse stored JSON preferences
          const locations = prefs.preApplyLocations ? JSON.parse(prefs.preApplyLocations) : [];
          const employment = prefs.preApplyEmployment ? JSON.parse(prefs.preApplyEmployment) : [];
          const industries = prefs.preApplyIndustries ? JSON.parse(prefs.preApplyIndustries) : [];
          
          // Parse resume data for skills
          let parsedSkills: string[] = [];
          if (prefs.preApplyParsedData) {
            try {
              const parsed = JSON.parse(prefs.preApplyParsedData);
              parsedSkills = [...(parsed.skills?.technical || []), ...(parsed.skills?.soft || [])];
            } catch (e) {
              // Ignore parse errors
            }
          }

          const userProfile: UserPreApplyProfile = {
            userId: prefs.member.user.id,
            memberId: prefs.memberId,
            email: prefs.member.user.email,
            name: prefs.member.user.name,
            preApplyLocations: locations,
            preApplyEmployment: employment,
            preApplySalaryMin: prefs.preApplySalaryMin,
            preApplySalaryMax: prefs.preApplySalaryMax,
            preApplyIndustries: industries,
            parsedResumeSkills: parsedSkills,
          };

          const matchScore = calculatePreApplyMatchScore(jobCriteria, userProfile);

          // Only create entry and notify if score is above threshold (e.g., 40%)
          if (matchScore >= 40) {
            // Create or update pre-apply queue entry
            await prisma.preApplyQueueEntry.upsert({
              where: {
                userId_jobId: {
                  userId: userProfile.userId,
                  jobId: job.id,
                }
              },
              update: {
                matchScore,
                updatedAt: new Date(),
              },
              create: {
                userId: userProfile.userId,
                jobId: job.id,
                matchScore,
              }
            });

            result.matched++;

            // Send notification
            try {
              await notificationService.notifyJobMatch(
                userProfile.userId,
                job.id,
                job.title,
                companyName,
                matchScore
              );
              result.notified++;
            } catch (notifyError) {
              console.error(`[PreApply] Failed to notify user ${userProfile.userId}:`, notifyError);
            }
          }
        } catch (userError) {
          console.error(`[PreApply] Error processing user ${prefs.memberId}:`, userError);
        }
      }

      console.log(`[PreApply] Job "${job.title}": ${result.matched} matched, ${result.notified} notified`);
      return result;
    } catch (error) {
      console.error('[PreApply] Error processing new job:', error);
      throw error;
    }
  }

  /**
   * Get pre-apply matches for a user
   */
  static async getUserPreApplyMatches(userId: string, limit = 10): Promise<any[]> {
    const entries = await prisma.preApplyQueueEntry.findMany({
      where: {
        userId,
        dismissed: false,
        appliedAt: null,
      },
      orderBy: [
        { matchScore: 'desc' },
        { createdAt: 'desc' },
      ],
      take: limit,
    });

    // Fetch job details for each entry
    const jobIds = entries.map(e => e.jobId);
    const jobs = await prisma.job.findMany({
      where: { id: { in: jobIds }, isActive: true },
      include: {
        user: {
          include: { companyProfile: { select: { companyName: true, logo: true } } }
        }
      }
    });

    const jobMap = new Map(jobs.map(j => [j.id, j]));

    return entries
      .filter(e => jobMap.has(e.jobId))
      .map(entry => {
        const job = jobMap.get(entry.jobId)!;
        return {
          id: entry.id,
          matchScore: entry.matchScore,
          notifiedAt: entry.notifiedAt,
          job: {
            id: job.id,
            title: job.title,
            location: job.location,
            employment: job.employment,
            salaryLow: job.salaryLow,
            salaryHigh: job.salaryHigh,
            company: job.user?.companyProfile?.companyName || 'Company',
            logo: job.user?.companyProfile?.logo,
            postedAt: job.postedAt,
          }
        };
      });
  }

  /**
   * Mark a pre-apply entry as dismissed
   */
  static async dismissMatch(userId: string, jobId: string): Promise<void> {
    await prisma.preApplyQueueEntry.updateMany({
      where: { userId, jobId },
      data: { dismissed: true, updatedAt: new Date() },
    });
  }

  /**
   * Mark a pre-apply entry as applied
   */
  static async markAsApplied(userId: string, jobId: string): Promise<void> {
    await prisma.preApplyQueueEntry.updateMany({
      where: { userId, jobId },
      data: { appliedAt: new Date(), updatedAt: new Date() },
    });
  }
}

export default PreApplyService;
