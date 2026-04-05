/**
 * Mentor Matching Algorithm
 * Scores and ranks mentors based on compatibility with mentee preferences
 * 
 * Factors considered:
 * - Country/Cultural Background (highest weight for Indigenous mentorship)
 * - Industry Match
 * - Location Proximity  
 * - Availability Overlap
 * - Skills Match
 * - Mentor Rating
 */

import { prisma } from '../db';

/**
 * Weight constants for scoring factors
 */
export const WEIGHTS = {
  COUNTRY_MATCH: 40,        // Cultural alignment is critical
  INDUSTRY_MATCH: 25,       // Career relevance
  LOCATION_MATCH: 15,       // Regional proximity
  SKILLS_MATCH: 10,         // Specific skill overlap
  AVAILABILITY_MATCH: 5,    // Schedule compatibility
  RATING_BONUS: 5,          // Quality indicator
};

interface MenteePreferences {
  country?: string | null;
  industry?: string | null;
  location?: string | null;
  skills?: string | string[] | null;
  preferredTimes?: string | null;
}

interface MentorData {
  country?: string | null;
  industry?: string | null;
  location?: string | null;
  skills?: string | string[] | null;
  availability?: string | null;
  rating?: number | null;
}

interface MatchResult {
  score: number;
  breakdown: Record<string, number>;
}

/**
 * Calculate match score between a mentee and mentor
 * @param {MenteePreferences} mentee - Mentee preferences and profile
 * @param {MentorData} mentor - Mentor profile
 * @returns {MatchResult} Score from 0-100
 */
export function calculateMatchScore(mentee: MenteePreferences, mentor: MentorData): MatchResult {
  let score = 0;
  const breakdown: Record<string, number> = {};

  // 1. Country/Cultural Background Match (40 points)
  if (mentee.country && mentor.country) {
    if (mentee.country.toLowerCase() === mentor.country.toLowerCase()) {
      score += WEIGHTS.COUNTRY_MATCH;
      breakdown.country = WEIGHTS.COUNTRY_MATCH;
    } else {
      // Partial points for same region
      const regionMatch = getRegionMatch(mentee.country, mentor.country);
      score += Math.floor(WEIGHTS.COUNTRY_MATCH * regionMatch);
      breakdown.country = Math.floor(WEIGHTS.COUNTRY_MATCH * regionMatch);
    }
  }

  // 2. Industry Match (25 points)
  if (mentee.industry && mentor.industry) {
    const industryScore = calculateIndustryMatch(mentee.industry, mentor.industry);
    score += Math.floor(WEIGHTS.INDUSTRY_MATCH * industryScore);
    breakdown.industry = Math.floor(WEIGHTS.INDUSTRY_MATCH * industryScore);
  }

  // 3. Location Proximity (15 points)
  if (mentee.location && mentor.location) {
    const locationScore = calculateLocationMatch(mentee.location, mentor.location);
    score += Math.floor(WEIGHTS.LOCATION_MATCH * locationScore);
    breakdown.location = Math.floor(WEIGHTS.LOCATION_MATCH * locationScore);
  }

  // 4. Skills Match (10 points)
  if (mentee.skills && mentor.skills) {
    const skillsScore = calculateSkillsMatch(mentee.skills, mentor.skills);
    score += Math.floor(WEIGHTS.SKILLS_MATCH * skillsScore);
    breakdown.skills = Math.floor(WEIGHTS.SKILLS_MATCH * skillsScore);
  }

  // 5. Availability Match (5 points)
  if (mentee.preferredTimes && mentor.availability) {
    const availScore = calculateAvailabilityMatch(mentee.preferredTimes, mentor.availability);
    score += Math.floor(WEIGHTS.AVAILABILITY_MATCH * availScore);
    breakdown.availability = Math.floor(WEIGHTS.AVAILABILITY_MATCH * availScore);
  }

  // 6. Rating Bonus (5 points)
  if (mentor.rating && mentor.rating >= 4.0) {
    const ratingBonus = Math.floor((mentor.rating - 4.0) * WEIGHTS.RATING_BONUS);
    score += ratingBonus;
    breakdown.rating = ratingBonus;
  }

  return { score: Math.min(100, score), breakdown };
}

/**
 * Check if two regions/states are in the same area
 */
function getRegionMatch(country1: string, country2: string): number {
  // For now, just check same Indigenous nation/region
  const regions: Record<string, string[]> = {
    NSW: ['Wiradjuri', 'Dharug', 'Gamilaroi', 'Bundjalung', 'Yuin'],
    VIC: ['Wurundjeri', 'Boon Wurrung', 'Gunditjmara', 'Yorta Yorta'],
    QLD: ['Yugambeh', 'Turrbal', 'Kalkadoon', 'Yidinji', 'Kuku Yalanji'],
    WA: ['Noongar', 'Yamatji', 'Martu', 'Bardi'],
    SA: ['Kaurna', 'Ngarrindjeri', 'Adnyamathanha'],
    NT: ['Larrakia', 'Yolngu', 'Arrernte', 'Warlpiri'],
    TAS: ['Palawa', 'Pakana'],
    ACT: ['Ngunnawal', 'Ngambri'],
  };

  // Check if same state/region
  for (const [state, nations] of Object.entries(regions)) {
    const c1InRegion = nations.some(n => country1.toLowerCase().includes(n.toLowerCase())) ||
                       country1.toLowerCase().includes(state.toLowerCase());
    const c2InRegion = nations.some(n => country2.toLowerCase().includes(n.toLowerCase())) ||
                       country2.toLowerCase().includes(state.toLowerCase());
    if (c1InRegion && c2InRegion) {
      return 0.7; // Same region but different nation
    }
  }

  return 0.3; // Different region
}

/**
 * Calculate industry match score
 */
function calculateIndustryMatch(menteeIndustry: string, mentorIndustry: string): number {
  if (!menteeIndustry || !mentorIndustry) return 0;
  
  const m1 = menteeIndustry.toLowerCase();
  const m2 = mentorIndustry.toLowerCase();
  
  if (m1 === m2) return 1.0;
  
  // Related industries
  const relatedIndustries: Record<string, string[]> = {
    'technology': ['software', 'it', 'digital', 'tech', 'engineering'],
    'healthcare': ['health', 'medical', 'nursing', 'aged care', 'disability'],
    'construction': ['building', 'trades', 'mining', 'infrastructure'],
    'education': ['training', 'teaching', 'academic', 'childcare'],
    'government': ['public sector', 'defense', 'community services'],
    'hospitality': ['tourism', 'food', 'events', 'accommodation'],
    'finance': ['banking', 'accounting', 'insurance'],
    'retail': ['sales', 'customer service', 'e-commerce'],
  };
  
  for (const [industry, related] of Object.entries(relatedIndustries)) {
    const m1Related = m1.includes(industry) || related.some(r => m1.includes(r));
    const m2Related = m2.includes(industry) || related.some(r => m2.includes(r));
    if (m1Related && m2Related) {
      return 0.7; // Related industry
    }
  }
  
  return 0.2; // Different industry but might have transferable insights
}

/**
 * Calculate location match score
 */
function calculateLocationMatch(menteeLocation: string, mentorLocation: string): number {
  if (!menteeLocation || !mentorLocation) return 0.5; // Neutral if unknown
  
  const loc1 = menteeLocation.toLowerCase();
  const loc2 = mentorLocation.toLowerCase();
  
  if (loc1 === loc2) return 1.0;
  
  // Same state
  const states = ['nsw', 'vic', 'qld', 'wa', 'sa', 'nt', 'tas', 'act'];
  for (const state of states) {
    if (loc1.includes(state) && loc2.includes(state)) {
      return 0.7;
    }
  }
  
  // Metro vs regional
  const metros = ['sydney', 'melbourne', 'brisbane', 'perth', 'adelaide', 'darwin', 'hobart', 'canberra'];
  const isLoc1Metro = metros.some(m => loc1.includes(m));
  const isLoc2Metro = metros.some(m => loc2.includes(m));
  
  if (isLoc1Metro === isLoc2Metro) {
    return 0.4; // Both metro or both regional
  }
  
  // Remote mentoring is always possible
  return 0.3;
}

/**
 * Calculate skills overlap
 */
function calculateSkillsMatch(menteeSkills: string | string[], mentorSkills: string | string[]): number {
  if (!menteeSkills || !mentorSkills) return 0;
  
  const parseSkills = (skills: string | string[]): string[] => {
    if (Array.isArray(skills)) return skills.map(s => s.toLowerCase().trim());
    if (typeof skills === 'string') return skills.split(',').map(s => s.toLowerCase().trim());
    return [];
  };
  
  const m1Skills = parseSkills(menteeSkills);
  const m2Skills = parseSkills(mentorSkills);
  
  if (m1Skills.length === 0 || m2Skills.length === 0) return 0;
  
  const matches = m1Skills.filter(s => m2Skills.some(ms => ms.includes(s) || s.includes(ms)));
  return Math.min(1.0, matches.length / Math.min(m1Skills.length, 3));
}

/**
 * Calculate availability overlap
 */
function calculateAvailabilityMatch(menteePreferred: string, mentorAvailability: string): number {
  if (!menteePreferred || !mentorAvailability) return 0.5;
  
  const pref = menteePreferred.toLowerCase();
  const avail = mentorAvailability.toLowerCase();
  
  // Time of day matching
  const timeSlots = ['morning', 'afternoon', 'evening', 'weekday', 'weekend'];
  for (const slot of timeSlots) {
    if (pref.includes(slot) && avail.includes(slot)) {
      return 1.0;
    }
  }
  
  // Flexible availability
  if (avail.includes('flexible') || avail.includes('any')) {
    return 0.8;
  }
  
  return 0.3;
}

/**
 * Find best matching mentors for a mentee
 * @param {string} menteeId - The mentee user ID
 * @param {MenteePreferences} preferences - Optional explicit preferences
 * @param {number} limit - Maximum number of results
 * @returns {Promise<Array>} Sorted list of mentors with match scores
 */
export async function findMatchingMentors(menteeId: string, preferences: MenteePreferences = {}, limit = 10) {
  // Get mentee profile
  const mentee = await prisma.user.findUnique({
    where: { id: menteeId },
    include: { memberProfile: true },
  });

  if (!mentee) {
    throw new Error('Mentee not found');
  }

  // Build mentee preferences from profile and explicit preferences
  const menteePrefs: MenteePreferences = {
    country: preferences.country || mentee.memberProfile?.mobNation || null,
    industry: preferences.industry || mentee.memberProfile?.careerInterest || null,
    location: preferences.location || null,
    skills: preferences.skills || mentee.memberProfile?.skillLevel || null,
    preferredTimes: preferences.preferredTimes || null,
  };

  // Get all active mentors with availability
  const mentors = await prisma.user.findMany({
    where: {
      userType: 'MENTOR',
      mentorProfile: { isNot: null },
    },
    include: {
      mentorProfile: true,
    },
  });

  // Get mentor session counts to check capacity
  const sessionCounts = await prisma.mentorSession.groupBy({
    by: ['mentorId'],
    where: { status: { in: ['scheduled', 'SCHEDULED'] } },
    _count: true,
  });
  const countMap = new Map(sessionCounts.map(s => [s.mentorId, s._count]));

  // Get mentor ratings
  const ratings = await prisma.mentorSession.groupBy({
    by: ['mentorId'],
    where: { rating: { not: null } },
    _avg: { rating: true },
    _count: { rating: true },
  });
  const ratingMap = new Map(ratings.map(r => [r.mentorId, { avg: r._avg.rating, count: r._count.rating }]));

  // Get mentor availability
  const availabilities = await prisma.mentorAvailabilitySlot.findMany();
  const availMap = new Map<string, any[]>();
  availabilities.forEach(a => {
    if (!availMap.has(a.mentorId)) availMap.set(a.mentorId, []);
    availMap.get(a.mentorId)?.push(a);
  });

  // Score and rank mentors
  const scoredMentors = mentors
    .filter(m => {
      // Filter out mentors at capacity (max 5 active sessions)
      const activeCount = countMap.get(m.id) || 0;
      return activeCount < 5;
    })
    .map(mentor => {
      const mentorData: MentorData = {
        country: mentor.mentorProfile?.expertise || null, // Using expertise for country/cultural info
        industry: mentor.mentorProfile?.bio?.match(/industry:\s*(\w+)/i)?.[1] || null,
        location: null,
        skills: mentor.mentorProfile?.expertise || null,
        availability: availMap.get(mentor.id)?.[0]?.startTime 
          ? `${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][availMap.get(mentor.id)![0].dayOfWeek]} ${availMap.get(mentor.id)![0].startTime}-${availMap.get(mentor.id)![0].endTime}`
          : 'Flexible',
        rating: ratingMap.get(mentor.id)?.avg || null,
      };

      const { score, breakdown } = calculateMatchScore(menteePrefs, mentorData);

      return {
        id: mentor.id,
        name: mentor.mentorProfile?.expertise?.split(',')[0] || mentor.email.split('@')[0],
        email: mentor.email,
        expertise: mentor.mentorProfile?.expertise,
        bio: mentor.mentorProfile?.bio,
        avatar: null,
        matchScore: score,
        matchBreakdown: breakdown,
        rating: ratingMap.get(mentor.id)?.avg?.toFixed(1) || null,
        ratingCount: ratingMap.get(mentor.id)?.count || 0,
        activeMatches: countMap.get(mentor.id) || 0,
        maxCapacity: 5,
        availability: mentorData.availability,
      };
    })
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, limit);

  return scoredMentors;
}

/**
 * Get mentor recommendations for homepage/dashboard
 */
export async function getTopMentors(limit = 6) {
  const mentors = await prisma.user.findMany({
    where: {
      userType: 'MENTOR',
      mentorProfile: { isNot: null },
    },
    include: {
      mentorProfile: true,
    },
    take: limit * 2, // Get extra to filter by availability
  });

  // Get session counts
  const sessionCounts = await prisma.mentorSession.groupBy({
    by: ['mentorId'],
    where: { status: { in: ['scheduled', 'SCHEDULED'] } },
    _count: true,
  });
  const countMap = new Map(sessionCounts.map(s => [s.mentorId, s._count]));

  // Get ratings
  const ratings = await prisma.mentorSession.groupBy({
    by: ['mentorId'],
    where: { rating: { not: null } },
    _avg: { rating: true },
    _count: { rating: true },
  });
  const ratingMap = new Map(ratings.map(r => [r.mentorId, { avg: r._avg.rating, count: r._count.rating }]));

  return mentors
    .filter(m => (countMap.get(m.id) || 0) < 5)
    .map(mentor => ({
      id: mentor.id,
      name: mentor.mentorProfile?.expertise?.split(',')[0] || mentor.email.split('@')[0],
      email: mentor.email,
      expertise: mentor.mentorProfile?.expertise,
      bio: mentor.mentorProfile?.bio,
      rating: ratingMap.get(mentor.id)?.avg?.toFixed(1) || '4.5',
      sessionCount: ratingMap.get(mentor.id)?.count || 0,
      activeMatches: countMap.get(mentor.id) || 0,
      maxCapacity: 5,
    }))
    .sort((a, b) => parseFloat(b.rating) - parseFloat(a.rating))
    .slice(0, limit);
}
