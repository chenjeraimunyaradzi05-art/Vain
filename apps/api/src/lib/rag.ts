/**
 * RAG (Retrieval Augmented Generation) System for Athena AI
 * 
 * Provides context-aware AI responses by retrieving relevant user data,
 * community resources, and cultural knowledge before generating responses.
 */

import { prisma } from '../db';

// Types for RAG context
export interface UserContext {
  userId: string;
  userType: string;
  profile: ProfileData | null;
  skills: string[];
  applications: ApplicationSummary[];
  mentorships: MentorshipSummary[];
  certifications: CertificationSummary[];
  trustLevel: string;
  communityConnections: number;
  recentActivity: ActivitySummary[];
}

interface ProfileData {
  name: string;
  bio: string | null;
  location: string | null;
  yearsExperience: number | null;
  industries: string[];
  isVerified: boolean;
}

interface ApplicationSummary {
  jobTitle: string;
  company: string;
  status: string;
  appliedAt: Date;
}

interface MentorshipSummary {
  mentorName: string;
  specialty: string;
  status: string;
  sessionsCompleted: number;
}

interface CertificationSummary {
  name: string;
  issuer: string;
  isVerified: boolean;
  expiresAt: Date | null;
}

interface ActivitySummary {
  type: string;
  description: string;
  timestamp: Date;
}

export interface RAGContext {
  user: UserContext | null;
  relevantJobs: JobContext[];
  relevantCourses: CourseContext[];
  communityResources: ResourceContext[];
  culturalContext: CulturalContext;
}

interface JobContext {
  id: string;
  title: string;
  company: string;
  location: string;
  matchScore: number;
  keySkills: string[];
}

interface CourseContext {
  id: string;
  title: string;
  provider: string;
  duration: string;
  relevanceScore: number;
}

interface ResourceContext {
  name: string;
  type: string;
  description: string;
  url: string | null;
}

interface CulturalContext {
  region: string | null;
  culturalConsiderations: string[];
  communityPrograms: string[];
}

/**
 * Retrieve comprehensive user context for RAG
 */
export async function getUserContext(userId: string): Promise<UserContext | null> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        memberProfile: true,
        mentorProfile: true,
        companyProfile: true,
        userSkills: {
          include: { skill: true },
          take: 20
        },
      }
    });

    if (!user) return null;

    // Get applications
    const applications = await prisma.jobApplication.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        job: {
          include: {
            user: {
              include: { companyProfile: true }
            }
          }
        }
      }
    });

    // Get mentorship sessions
    const mentorships = await prisma.mentorSession.findMany({
      where: { 
        OR: [
          { menteeId: userId },
          { mentorId: userId }
        ]
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        mentor: {
          include: { mentorProfile: true }
        }
      }
    });

    // Get certifications
    const certifications = await prisma.userBadge.findMany({
      where: { userId },
      orderBy: { issuedAt: 'desc' },
      take: 10
    });

    // Get connections count
    const connectionsCount = await prisma.userConnection.count({
      where: {
        status: 'accepted',
        OR: [
          { requesterId: userId },
          { addresseeId: userId }
        ]
      }
    });

    // Determine profile data based on user type
    let profile: ProfileData | null = null;
    if (user.memberProfile) {
      profile = {
        name: user.name || user.email.split('@')[0],
        bio: user.memberProfile.bio,
        location: 'Unknown',
        yearsExperience: 0,
        industries: [],
        isVerified: false
      };
    } else if (user.mentorProfile) {
      profile = {
        name: user.mentorProfile.name || user.email.split('@')[0],
        bio: user.mentorProfile.bio,
        location: user.mentorProfile.location || 'Unknown',
        yearsExperience: 0,
        industries: user.mentorProfile.industry ? [user.mentorProfile.industry] : [],
        isVerified: false
      };
    }

    // Calculate trust level
    const trustLevel = calculateTrustLevel(user, connectionsCount, certifications.length);

    return {
      userId,
      userType: user.userType,
      profile,
      skills: user.userSkills.map(us => us.skill.name),
      applications: applications.map(app => ({
        jobTitle: app.job.title,
        company: app.job.user.companyProfile?.companyName || 'Unknown',
        status: app.status,
        appliedAt: app.createdAt
      })),
      mentorships: mentorships.map(m => ({
        mentorName: m.mentor.name || 'Unknown',
        specialty: m.mentor.mentorProfile?.title || 'General',
        status: m.status,
        sessionsCompleted: 1 // Simplified
      })),
      certifications: certifications.map(c => ({
        name: c.name,
        issuer: c.issuerName || 'Unknown',
        isVerified: !!c.verificationUrl,
        expiresAt: c.expiresAt
      })),
      trustLevel,
      communityConnections: connectionsCount,
      recentActivity: []
    };
  } catch (error) {
    console.error('Error fetching user context:', error);
    return null;
  }
}

/**
 * Calculate user trust level based on verification and activity
 */
function calculateTrustLevel(
  user: any, 
  connections: number, 
  certifications: number
): string {
  let score = 0;
  
  // Profile verification skipped (fields missing)
  
  // Connections
  if (connections >= 50) score += 20;
  else if (connections >= 20) score += 15;
  else if (connections >= 5) score += 10;
  
  // Certifications
  if (certifications >= 5) score += 20;
  else if (certifications >= 2) score += 10;
  
  // Account age (simplified)
  const accountAge = Date.now() - new Date(user.createdAt).getTime();
  const monthsOld = accountAge / (1000 * 60 * 60 * 24 * 30);
  if (monthsOld >= 12) score += 20;
  else if (monthsOld >= 6) score += 10;
  
  // Map score to trust level
  if (score >= 80) return 'verified';
  if (score >= 60) return 'trusted';
  if (score >= 40) return 'established';
  if (score >= 20) return 'basic';
  return 'new';
}

/**
 * Get relevant jobs for user based on skills and preferences
 */
export async function getRelevantJobs(
  userContext: UserContext | null,
  limit: number = 5
): Promise<JobContext[]> {
  try {
    if (!userContext || userContext.skills.length === 0) {
      // Return trending jobs if no user context
      const jobs = await prisma.job.findMany({
        where: { isActive: true },
        orderBy: { postedAt: 'desc' },
        take: limit,
        include: {
          user: {
            include: { companyProfile: true }
          },
          jobSkills: { include: { skill: true } }
        }
      });
      
      return jobs.map(job => ({
        id: job.id,
        title: job.title,
        company: job.user.companyProfile?.companyName || 'Unknown',
        location: job.location || 'Remote',
        matchScore: 50,
        keySkills: job.jobSkills.map(js => js.skill.name).slice(0, 5)
      }));
    }

    // Find jobs matching user skills
    const jobs = await prisma.job.findMany({
      where: {
        isActive: true,
        jobSkills: {
          some: {
            skill: {
              name: { in: userContext.skills }
            }
          }
        }
      },
      orderBy: { postedAt: 'desc' },
      take: limit * 2, // Get more for filtering
      include: {
        user: {
          include: { companyProfile: true }
        },
        jobSkills: { include: { skill: true } }
      }
    });

    // Calculate match scores
    const scoredJobs = jobs.map(job => {
      const jobSkills = job.jobSkills.map(js => js.skill.name);
      const matchingSkills = jobSkills.filter(s => userContext.skills.includes(s));
      const matchScore = Math.round((matchingSkills.length / jobSkills.length) * 100) || 50;
      
      return {
        id: job.id,
        title: job.title,
        company: job.user.companyProfile?.companyName || 'Unknown',
        location: job.location || 'Remote',
        matchScore,
        keySkills: jobSkills.slice(0, 5)
      };
    });

    // Sort by match score and return top results
    return scoredJobs
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, limit);
  } catch (error) {
    console.error('Error fetching relevant jobs:', error);
    return [];
  }
}

/**
 * Get relevant courses based on user's skill gaps
 */
export async function getRelevantCourses(
  userContext: UserContext | null,
  targetJobSkills: string[] = [],
  limit: number = 5
): Promise<CourseContext[]> {
  try {
    // Fetch courses from AiResource table
    const courses = await prisma.aiResource.findMany({
      where: { type: 'COURSE' },
      orderBy: { createdAt: 'desc' },
      take: limit * 2
    });

    // If user has skills, find courses that fill gaps
    const skillGaps = targetJobSkills.filter(
      s => !userContext?.skills.includes(s)
    );

    return courses.map(course => ({
      id: course.key,
      title: course.title,
      provider: 'Gimbi Learning',
      duration: '2-4 hours',
      relevanceScore: skillGaps.some(g => 
        course.title.toLowerCase().includes(g.toLowerCase())
      ) ? 90 : 60
    })).slice(0, limit);
  } catch (error) {
    console.error('Error fetching relevant courses:', error);
    return [];
  }
}

/**
 * Get community resources based on context
 */
export async function getCommunityResources(
  context: string
): Promise<ResourceContext[]> {
  const resources: ResourceContext[] = [];
  const ctx = context.toLowerCase();

  // Career resources
  if (ctx.includes('job') || ctx.includes('career') || ctx.includes('employment')) {
    resources.push(
      {
        name: 'Career Trackers',
        type: 'employment',
        description: 'Indigenous internship program connecting students with employers',
        url: 'https://www.careertrackers.org.au'
      },
      {
        name: 'Supply Nation',
        type: 'business',
        description: 'Australia\'s leading database of verified Indigenous businesses',
        url: 'https://supplynation.org.au'
      }
    );
  }

  // Education resources
  if (ctx.includes('education') || ctx.includes('study') || ctx.includes('course') || ctx.includes('training')) {
    resources.push(
      {
        name: 'ABSTUDY',
        type: 'education',
        description: 'Financial assistance for Aboriginal and Torres Strait Islander students',
        url: 'https://www.servicesaustralia.gov.au/abstudy'
      },
      {
        name: 'Indigenous Student Success Program',
        type: 'education',
        description: 'University support programs for Indigenous students',
        url: null
      }
    );
  }

  // Business resources
  if (ctx.includes('business') || ctx.includes('entrepreneur') || ctx.includes('startup')) {
    resources.push(
      {
        name: 'Indigenous Business Australia',
        type: 'business',
        description: 'Business loans, support and development for Indigenous Australians',
        url: 'https://www.iba.gov.au'
      },
      {
        name: 'Many Rivers',
        type: 'business',
        description: 'Microenterprise development organization',
        url: 'https://manyrivers.org.au'
      }
    );
  }

  // Housing resources
  if (ctx.includes('housing') || ctx.includes('home') || ctx.includes('rent')) {
    resources.push(
      {
        name: 'Indigenous Home Ownership',
        type: 'housing',
        description: 'Home loan assistance through IBA',
        url: 'https://www.iba.gov.au/homes'
      }
    );
  }

  // Health & Wellness
  if (ctx.includes('health') || ctx.includes('wellness') || ctx.includes('mental')) {
    resources.push(
      {
        name: '13YARN',
        type: 'health',
        description: 'Aboriginal & Torres Strait Islander crisis support (24/7)',
        url: 'https://www.13yarn.org.au'
      },
      {
        name: 'Healing Foundation',
        type: 'health',
        description: 'Healing programs for Aboriginal & Torres Strait Islander peoples',
        url: 'https://healingfoundation.org.au'
      }
    );
  }

  // Default resources
  if (resources.length === 0) {
    resources.push(
      {
        name: 'NIAA',
        type: 'general',
        description: 'National Indigenous Australians Agency - Government support and programs',
        url: 'https://www.niaa.gov.au'
      },
      {
        name: 'First Peoples Assembly',
        type: 'community',
        description: 'Community voice and representation',
        url: null
      }
    );
  }

  return resources;
}

/**
 * Get cultural context for responses
 */
export function getCulturalContext(location: string | null): CulturalContext {
  // Simplified cultural context - in production would use geolocation
  // and community-specific knowledge base
  return {
    region: location || 'Australia',
    culturalConsiderations: [
      'Respect for Elders and community knowledge',
      'Importance of family and kinship connections',
      'Connection to Country and cultural practices',
      'Strengths-based and culturally safe communication'
    ],
    communityPrograms: [
      'Local Land Council programs',
      'Community Development Employment Projects',
      'Indigenous Rangers programs',
      'Cultural heritage and language programs'
    ]
  };
}

/**
 * Build complete RAG context for AI prompt
 */
export async function buildRAGContext(
  userId: string | null,
  queryContext: string
): Promise<RAGContext> {
  const userContext = userId ? await getUserContext(userId) : null;
  
  const [relevantJobs, relevantCourses, communityResources] = await Promise.all([
    getRelevantJobs(userContext, 5),
    getRelevantCourses(userContext, [], 5),
    getCommunityResources(queryContext)
  ]);

  const culturalContext = getCulturalContext(userContext?.profile?.location || null);

  return {
    user: userContext,
    relevantJobs,
    relevantCourses,
    communityResources,
    culturalContext
  };
}

/**
 * Format RAG context into prompt-ready text
 */
export function formatRAGContextForPrompt(context: RAGContext): string {
  const parts: string[] = [];

  // User context
  if (context.user) {
    parts.push(`## User Profile
- Type: ${context.user.userType}
- Name: ${context.user.profile?.name || 'Unknown'}
- Trust Level: ${context.user.trustLevel}
- Skills: ${context.user.skills.slice(0, 10).join(', ') || 'Not specified'}
- Community Connections: ${context.user.communityConnections}
- Certifications: ${context.user.certifications.length}
`);

    if (context.user.applications.length > 0) {
      parts.push(`Recent Applications:
${context.user.applications.slice(0, 3).map(a => `- ${a.jobTitle} at ${a.company} (${a.status})`).join('\n')}
`);
    }

    if (context.user.mentorships.length > 0) {
      parts.push(`Active Mentorships:
${context.user.mentorships.slice(0, 2).map(m => `- ${m.mentorName} (${m.specialty})`).join('\n')}
`);
    }
  }

  // Relevant opportunities
  if (context.relevantJobs.length > 0) {
    parts.push(`## Relevant Job Opportunities
${context.relevantJobs.slice(0, 3).map(j => 
  `- ${j.title} at ${j.company} (${j.matchScore}% match) - Skills: ${j.keySkills.slice(0, 3).join(', ')}`
).join('\n')}
`);
  }

  // Relevant courses
  if (context.relevantCourses.length > 0) {
    parts.push(`## Recommended Learning
${context.relevantCourses.slice(0, 3).map(c => 
  `- ${c.title} (${c.duration})`
).join('\n')}
`);
  }

  // Community resources
  if (context.communityResources.length > 0) {
    parts.push(`## Community Resources
${context.communityResources.slice(0, 3).map(r => 
  `- ${r.name}: ${r.description}`
).join('\n')}
`);
  }

  // Cultural considerations
  parts.push(`## Cultural Considerations
${context.culturalContext.culturalConsiderations.slice(0, 2).join('\n- ')}
`);

  return parts.join('\n');
}

export default {
  getUserContext,
  getRelevantJobs,
  getRelevantCourses,
  getCommunityResources,
  getCulturalContext,
  buildRAGContext,
  formatRAGContextForPrompt
};
