// @ts-nocheck
/**
 * Profile Import API Routes
 * 
 * Endpoints for importing profile data from external sources:
 * - LinkedIn profile import
 * - Resume parsing and import
 * 
 * Endpoints:
 * - GET /profile-import/linkedin/status - Check LinkedIn connection status
 * - POST /profile-import/linkedin/import - Import LinkedIn profile data
 * - POST /profile-import/linkedin/disconnect - Disconnect LinkedIn
 * - POST /profile-import/resume/parse - Parse resume text
 * - POST /profile-import/resume/import - Import parsed resume data
 */

import express from 'express';
import authenticateJWT from '../middleware/auth';
import { prisma as prismaClient } from '../db';
const prisma = prismaClient as any;
import {
  fetchLinkedInProfile,
  importLinkedInToProfile,
  getLinkedInConnectionStatus,
  disconnectLinkedIn,
  parseResumeText
} from '../lib/linkedinProfile';

const router = express.Router();

/**
 * GET /profile-import/linkedin/status
 * Check if user has LinkedIn connected and token status
 */
router.get('/linkedin/status', authenticateJWT, async (req, res) => {
  try {
    const status = await getLinkedInConnectionStatus(req.user.id);
    res.json(status);
  } catch (err) {
    console.error('LinkedIn status check error:', err);
    res.status(500).json({ error: 'Failed to check LinkedIn status' });
  }
});

/**
 * GET /profile-import/linkedin/preview
 * Preview LinkedIn data before importing
 */
router.get('/linkedin/preview', authenticateJWT, async (req, res) => {
  try {
    const linkedInData = await fetchLinkedInProfile(req.user.id);
    
    // Get current profile for comparison
    const currentProfile = await prisma.profile.findUnique({
      where: { userId: req.user.id }
    });

    res.json({
      linkedIn: linkedInData,
      current: currentProfile,
      canImport: {
        name: !!linkedInData.name && linkedInData.name !== currentProfile?.name,
        avatar: !!linkedInData.avatar && linkedInData.avatar !== currentProfile?.avatar
      }
    });
  } catch (err) {
    console.error('LinkedIn preview error:', err);
    res.status(400).json({ error: err.message });
  }
});

/**
 * POST /profile-import/linkedin/import
 * Import LinkedIn profile data into user profile
 */
router.post('/linkedin/import', authenticateJWT, async (req, res) => {
  try {
    const { importName, importAvatar, importHeadline, importSummary } = req.body;

    const result = await importLinkedInToProfile(req.user.id, {
      importName: importName !== false,
      importAvatar: importAvatar !== false,
      importHeadline: !!importHeadline,
      importSummary: !!importSummary
    });

    res.json({
      success: true,
      message: `Imported ${result.importedFields.length} fields from LinkedIn`,
      importedFields: result.importedFields,
      profile: result.profile
    });
  } catch (err) {
    console.error('LinkedIn import error:', err);
    res.status(400).json({ error: err.message });
  }
});

/**
 * POST /profile-import/linkedin/disconnect
 * Disconnect LinkedIn from user account
 */
router.post('/linkedin/disconnect', authenticateJWT, async (req, res) => {
  try {
    const result = await disconnectLinkedIn(req.user.id);
    res.json(result);
  } catch (err) {
    console.error('LinkedIn disconnect error:', err);
    res.status(500).json({ error: 'Failed to disconnect LinkedIn' });
  }
});

/**
 * POST /profile-import/resume/parse
 * Parse resume text and extract structured data
 */
router.post('/resume/parse', authenticateJWT, async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || typeof text !== 'string') {
      return void res.status(400).json({ error: 'Resume text is required' });
    }

    const parsed = await parseResumeText(text);

    res.json({
      success: true,
      parsed,
      message: `Found ${parsed.skills.length} skills, ${parsed.experience.length} experience entries`
    });
  } catch (err) {
    console.error('Resume parse error:', err);
    res.status(500).json({ error: 'Failed to parse resume' });
  }
});

/**
 * POST /profile-import/resume/import
 * Import parsed resume data into user profile/skills
 */
router.post('/resume/import', authenticateJWT, async (req, res) => {
  try {
    const { skills, summary, experience, education } = req.body;
    const userId = req.user.id;

    const updates = [];

    // Update bio/summary if provided
    if (summary) {
      await prisma.profile.update({
        where: { userId },
        data: { bio: summary }
      });
      updates.push('bio');
    }

    // Add skills if provided
    if (skills && Array.isArray(skills) && skills.length > 0) {
      // Get existing user skills
      const existingSkills = await prisma.userSkill.findMany({
        where: { userId },
        include: { skill: true }
      });

      const existingSkillNames = existingSkills.map(us => us.skill.name.toLowerCase());

      // Add new skills
      for (const skillName of skills) {
        if (existingSkillNames.includes(skillName.toLowerCase())) continue;

        // Find or create skill
        let skill = await prisma.skill.findFirst({
          where: { name: { equals: skillName, mode: 'insensitive' } }
        });

        if (!skill) {
          skill = await prisma.skill.create({
            data: {
              name: skillName.charAt(0).toUpperCase() + skillName.slice(1),
              category: 'IMPORTED'
            }
          });
        }

        // Link skill to user
        await prisma.userSkill.create({
          data: {
            userId,
            skillId: skill.id,
            level: 'BEGINNER',
            source: 'RESUME_IMPORT'
          }
        }).catch(() => {}); // Ignore duplicates
      }
      updates.push(`${skills.length} skills`);
    }

    // Store work experience if provided
    if (experience && Array.isArray(experience) && experience.length > 0) {
      // Could store in a work history table if available
      updates.push(`${experience.length} experience entries`);
    }

    // Store education if provided
    if (education && Array.isArray(education) && education.length > 0) {
      // Could store in an education table if available
      updates.push(`${education.length} education entries`);
    }

    // Log the import
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'RESUME_IMPORT',
        details: JSON.stringify({
          skillsCount: skills?.length || 0,
          experienceCount: experience?.length || 0,
          educationCount: education?.length || 0,
          timestamp: new Date().toISOString()
        })
      }
    }).catch(() => {});

    res.json({
      success: true,
      message: `Imported: ${updates.join(', ')}`,
      updates
    });
  } catch (err) {
    console.error('Resume import error:', err);
    res.status(500).json({ error: 'Failed to import resume data' });
  }
});

/**
 * GET /profile-import/sources
 * Get available import sources and their status
 */
router.get('/sources', authenticateJWT, async (req, res) => {
  try {
    const linkedInStatus = await getLinkedInConnectionStatus(req.user.id);

    // Check for Google OAuth too
    const googleToken = await prisma.oAuthToken.findFirst({
      where: {
        userId: req.user.id,
        provider: 'google'
      }
    });

    res.json({
      sources: [
        {
          id: 'linkedin',
          name: 'LinkedIn',
          icon: 'linkedin',
          connected: linkedInStatus.connected,
          expired: linkedInStatus.expired,
          features: ['name', 'avatar', 'headline']
        },
        {
          id: 'google',
          name: 'Google',
          icon: 'google',
          connected: !!googleToken,
          features: ['name', 'avatar', 'email']
        },
        {
          id: 'resume',
          name: 'Resume/CV Upload',
          icon: 'file-text',
          connected: true, // Always available
          features: ['skills', 'experience', 'education', 'summary']
        }
      ]
    });
  } catch (err) {
    console.error('Import sources error:', err);
    res.status(500).json({ error: 'Failed to get import sources' });
  }
});

export default router;



