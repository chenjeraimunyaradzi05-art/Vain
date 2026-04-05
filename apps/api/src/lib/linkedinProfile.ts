/**
 * LinkedIn Profile Import Library
 * 
 * Fetches and parses LinkedIn profile data for import into user profiles.
 * Uses stored OAuth tokens to access LinkedIn API.
 * 
 * Note: LinkedIn API v2 has limited access. This implementation works with
 * available endpoints and gracefully degrades when data is unavailable.
 */

import { prisma } from '../db';

/**
 * LinkedIn API base URL
 */
const LINKEDIN_API_BASE = 'https://api.linkedin.com/v2';

/**
 * Fetch LinkedIn profile data using stored OAuth token
 * @param {string} userId - User ID to fetch LinkedIn profile for
 * @returns {Promise<Object>} LinkedIn profile data
 */
async function fetchLinkedInProfile(userId) {
  // Get stored OAuth token
  const oauthToken = await prisma.oAuthToken.findFirst({
    where: {
      userId,
      provider: 'linkedin'
    }
  });

  if (!oauthToken) {
    throw new Error('No LinkedIn OAuth token found. Please connect your LinkedIn account first.');
  }

  // Check if token is expired
  if (oauthToken.expiresAt && new Date(oauthToken.expiresAt) < new Date()) {
    throw new Error('LinkedIn token has expired. Please reconnect your LinkedIn account.');
  }

  const accessToken = oauthToken.accessToken;

  try {
    // Fetch basic profile info
    const profileData: any = await fetchWithAuth(`${LINKEDIN_API_BASE}/userinfo`, accessToken);

    // Build normalized profile object
    const linkedInProfile = {
      id: profileData.sub,
      email: profileData.email,
      emailVerified: profileData.email_verified,
      name: profileData.name,
      firstName: profileData.given_name,
      lastName: profileData.family_name,
      avatar: profileData.picture,
      locale: profileData.locale,
      fetchedAt: new Date().toISOString()
    };

    return linkedInProfile;

  } catch (err) {
    console.error('LinkedIn API error:', err);
    throw new Error(`Failed to fetch LinkedIn profile: ${err.message}`);
  }
}

/**
 * Helper to make authenticated requests to LinkedIn API
 */
async function fetchWithAuth(url, accessToken) {
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json'
    }
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`LinkedIn API error: ${response.status} - ${error}`);
  }

  return response.json();
}

/**
 * Import LinkedIn profile data into user's Ngurra profile
 * @param {string} userId - User ID to import data for
 * @param {Object} importOptions - Which fields to import
 * @returns {Promise<Object>} Updated profile
 */
async function importLinkedInToProfile(userId, importOptions: any = {}) {
  const {
    importName = true,
    importAvatar = true,
    importHeadline = false,
    importSummary = false
  } = importOptions;

  // Fetch LinkedIn data
  const linkedInData: any = await fetchLinkedInProfile(userId);

  // Build update object
  const profileUpdate: any = {};

  if (importName && linkedInData.name) {
    profileUpdate.name = linkedInData.name;
  }

  if (importAvatar && linkedInData.avatar) {
    profileUpdate.avatarUrl = linkedInData.avatar;
  }

  // Update profile
  const updatedProfile = await prisma.user.update({
    where: { id: userId },
    data: profileUpdate
  });

  // Log the import
  await prisma.auditLog.create({
    data: {
      userId,
      category: 'USER',
      event: 'LINKEDIN_IMPORT',
      action: 'LINKEDIN_IMPORT',
      metadata: JSON.stringify({
        importedFields: Object.keys(profileUpdate),
        linkedInId: linkedInData.id,
        timestamp: new Date().toISOString()
      })
    }
  }).catch(() => {}); // Non-critical

  return {
    profile: updatedProfile,
    linkedInData,
    importedFields: Object.keys(profileUpdate)
  };
}

/**
 * Check if user has LinkedIn connected
 * @param {string} userId - User ID to check
 * @returns {Promise<Object>} Connection status
 */
async function getLinkedInConnectionStatus(userId) {
  const oauthToken = await prisma.oAuthToken.findFirst({
    where: {
      userId,
      provider: 'linkedin'
    }
  });

  if (!oauthToken) {
    return {
      connected: false,
      message: 'LinkedIn not connected'
    };
  }

  const isExpired = oauthToken.expiresAt && new Date(oauthToken.expiresAt) < new Date();

  return {
    connected: true,
    expired: isExpired,
    connectedAt: oauthToken.createdAt,
    expiresAt: oauthToken.expiresAt,
    message: isExpired ? 'Token expired, please reconnect' : 'LinkedIn connected'
  };
}

/**
 * Disconnect LinkedIn from user account
 * @param {string} userId - User ID to disconnect
 */
async function disconnectLinkedIn(userId) {
  await prisma.oAuthToken.deleteMany({
    where: {
      userId,
      provider: 'linkedin'
    }
  });

  return { success: true, message: 'LinkedIn disconnected' };
}

/**
 * Parse skills from resume text using AI or keyword matching
 * @param {string} resumeText - Raw resume text
 * @returns {Promise<Object>} Parsed resume data
 */
async function parseResumeText(resumeText) {
  if (!resumeText || resumeText.trim().length === 0) {
    return { skills: [], experience: [], education: [], summary: '' };
  }

  const text = resumeText.slice(0, 30000); // Safety limit
  const lowerText = text.toLowerCase();

  // Skill keywords common in First Nations employment contexts
  const skillKeywords = [
    // Technical/Trade
    'welding', 'forklift', 'crane', 'scaffolding', 'construction',
    'carpentry', 'plumbing', 'electrical', 'mechanical', 'hvac',
    'driving', 'mc licence', 'hr licence', 'mr licence', 'heavy vehicle',
    'mining', 'rigging', 'dogging', 'excavator', 'bobcat', 'loader',
    'concreting', 'tiling', 'plastering', 'painting', 'roofing',
    
    // Office/Admin
    'microsoft office', 'excel', 'word', 'powerpoint', 'data entry',
    'customer service', 'reception', 'administration', 'bookkeeping',
    'accounting', 'payroll', 'invoicing', 'scheduling', 'filing',
    'typing', 'correspondence', 'minute taking', 'record keeping',
    
    // Healthcare/Community
    'aged care', 'disability support', 'community services', 'mental health',
    'first aid', 'cpr', 'working with children', 'ndis',
    'personal care', 'medication administration', 'patient care',
    'counselling', 'case management', 'support worker', 'youth work',
    
    // Education/Training
    'tafe', 'certificate', 'diploma', 'apprentice', 'trainee',
    'rto', 'qualification', 'training', 'teaching', 'facilitating',
    'assessment', 'curriculum', 'education', 'learning support',
    
    // IT/Technology
    'computer', 'software', 'hardware', 'networking', 'programming',
    'database', 'web development', 'coding', 'javascript', 'python',
    'html', 'css', 'it support', 'helpdesk', 'troubleshooting',
    
    // Hospitality/Tourism
    'hospitality', 'tourism', 'food handling', 'rsa', 'rsg', 'barista',
    'cooking', 'chef', 'catering', 'housekeeping', 'front desk',
    
    // Soft Skills
    'communication', 'teamwork', 'leadership', 'problem solving',
    'time management', 'organisation', 'mentoring', 'negotiation',
    'conflict resolution', 'public speaking', 'presentation skills',
    
    // Cultural
    'cultural awareness', 'community engagement', 'elder consultation',
    'indigenous', 'aboriginal', 'torres strait', 'cultural safety',
    'language preservation', 'traditional knowledge', 'cultural liaison',
    'reconciliation', 'cultural competency', 'community development'
  ];

  // Extract matched skills
  const skills = skillKeywords.filter(skill => lowerText.includes(skill));

  // Extract potential experience entries (years + keywords)
  const experiencePatterns = [
    /(\d+)\s*(?:years?|yrs?)\s+(?:of\s+)?(?:experience|working)/gi,
    /(?:worked?|employed)\s+(?:at|for|with)\s+([A-Z][A-Za-z\s&]+)/g,
    /(?:position|role|job):\s*([A-Za-z\s]+)/gi
  ];

  const experienceMatches: string[] = [];
  experiencePatterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      experienceMatches.push(match[1] || match[0]);
    }
  });

  // Extract education
  const educationPatterns = [
    /certificate\s+(?:i{1,4}|[1-4])\s+in\s+([A-Za-z\s]+)/gi,
    /diploma\s+(?:of|in)\s+([A-Za-z\s]+)/gi,
    /bachelor(?:'s)?\s+(?:of|in)\s+([A-Za-z\s]+)/gi,
    /(?:completed?|studying)\s+([A-Za-z\s]+)\s+at\s+([A-Za-z\s]+)/gi
  ];

  const educationMatches: string[] = [];
  educationPatterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      educationMatches.push(match[0]);
    }
  });

  // Generate summary (first 300 chars or first paragraph)
  const firstParagraph = text.split(/\n\n/)[0] || text;
  const summary = firstParagraph.slice(0, 300).trim();

  return {
    skills: [...new Set(skills)],
    experience: [...new Set(experienceMatches)].slice(0, 10),
    education: [...new Set(educationMatches)].slice(0, 5),
    summary,
    rawLength: text.length
  };
}

export {
  fetchLinkedInProfile,
  importLinkedInToProfile,
  getLinkedInConnectionStatus,
  disconnectLinkedIn,
  parseResumeText
};

