/**
 * Cover Letter Routes
 * Phase 2 Step 156: Cover letter builder with AI suggestions
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma as prismaClient } from '../db';
const prisma = prismaClient as any;
import { authenticate } from '../middleware/auth';

const router = Router();

// =============================================================================
// Schemas
// =============================================================================

const coverLetterSchema = z.object({
  title: z.string().min(1).max(100),
  content: z.string().min(1),
  jobTitle: z.string().optional(),
  companyName: z.string().optional(),
  template: z.string().default('professional'),
  isDefault: z.boolean().optional(),
});

const updateCoverLetterSchema = coverLetterSchema.partial();

// =============================================================================
// Cover Letter Templates
// =============================================================================

const templates = [
  {
    id: 'professional',
    name: 'Professional',
    description: 'Clean, formal layout suitable for corporate roles',
    category: 'professional',
    preview: 'Dear Hiring Manager,\n\nI am writing to express my interest in the [Position] role at [Company]...',
    structure: {
      opening: 'I am writing to express my interest in the {jobTitle} position at {companyName}.',
      body: [
        'With my background in {experience}, I am confident I would be a valuable addition to your team.',
        'Throughout my career, I have demonstrated {skills} which align closely with your requirements.',
        'I am particularly drawn to {companyName} because of your commitment to {companyValue}.',
      ],
      closing: 'I would welcome the opportunity to discuss how my skills and experiences align with your needs. Thank you for considering my application.',
    },
  },
  {
    id: 'creative',
    name: 'Creative',
    description: 'Modern, engaging style for creative industries',
    category: 'creative',
    preview: 'Hello [Company] Team!\n\nI\'m excited to share why I\'d be perfect for...',
    structure: {
      opening: 'I\'m thrilled to apply for the {jobTitle} opportunity at {companyName}!',
      body: [
        'What drew me to this role was {uniqueAspect}.',
        'I bring a unique blend of creativity and {skills} to everything I do.',
        'My passion for {industry} has led me to {achievement}.',
      ],
      closing: 'I\'d love to chat about how I can contribute to your amazing team. Let\'s connect!',
    },
  },
  {
    id: 'minimal',
    name: 'Minimal',
    description: 'Concise and to-the-point',
    category: 'minimal',
    preview: 'Re: [Position]\n\nI am applying for the above position...',
    structure: {
      opening: 'I am applying for the {jobTitle} position.',
      body: [
        'Key qualifications: {skills}.',
        'Relevant experience: {experience}.',
      ],
      closing: 'I am available for an interview at your convenience.',
    },
  },
  {
    id: 'culturally-safe',
    name: 'Culturally Safe',
    description: 'Highlights cultural strengths and community connection',
    category: 'professional',
    preview: 'Dear [Hiring Manager],\n\nAs a proud [Community] woman, I bring both professional expertise and cultural understanding...',
    structure: {
      opening: 'As a proud First Nations woman, I am excited to apply for the {jobTitle} role at {companyName}.',
      body: [
        'My connection to community has shaped my values of collaboration, respect, and continuous learning.',
        'I bring {skills} combined with a deep understanding of culturally safe practices.',
        'I am particularly drawn to {companyName}\'s commitment to reconciliation and Indigenous engagement.',
      ],
      closing: 'I would welcome the opportunity to discuss how my skills and cultural perspective can contribute to your team.',
    },
  },
];

// =============================================================================
// AI Content Suggestions
// =============================================================================

function generateSuggestions(type: string, context?: Record<string, string>): string[] {
  const suggestions: Record<string, string[]> = {
    opening: [
      `I am excited to apply for the ${context?.jobTitle || '[Position]'} role at ${context?.companyName || '[Company]'}.`,
      `With a passion for ${context?.industry || 'this field'} and strong ${context?.skills || 'relevant skills'}, I am eager to contribute to your team.`,
      `I was thrilled to discover the ${context?.jobTitle || '[Position]'} opportunity, as it aligns perfectly with my career goals.`,
    ],
    achievement: [
      'Increased team productivity by 25% through process improvements',
      'Led a project that delivered $X in cost savings',
      'Developed and implemented new training programs for staff',
      'Built strong relationships with stakeholders across multiple departments',
      'Mentored junior team members, helping them achieve their goals',
    ],
    skill: [
      'Strong communication and interpersonal skills',
      'Proven problem-solving abilities',
      'Experience with project management and delivery',
      'Ability to work effectively in diverse teams',
      'Commitment to continuous learning and development',
    ],
    closing: [
      'I would welcome the opportunity to discuss how my experience aligns with your needs.',
      'Thank you for considering my application. I look forward to the possibility of contributing to your team.',
      'I am excited about the opportunity to bring my skills to your organisation.',
    ],
  };

  return suggestions[type] || [];
}

// =============================================================================
// Routes
// =============================================================================

/**
 * GET /cover-letters - List user's cover letters
 */
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;

    // Check if CoverLetter model exists, fallback to in-memory
    let letters: any[] = [];
    try {
      letters = await (prisma as any).coverLetter.findMany({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
      });
    } catch {
      // Model doesn't exist, return empty for now
      letters = [];
    }

    res.json({ letters });
  } catch (error) {
    console.error('[CoverLetters] List error:', error);
    res.status(500).json({ error: 'Failed to fetch cover letters' });
  }
});

/**
 * GET /cover-letters/templates - Get available templates
 */
router.get('/templates', async (_req: Request, res: Response) => {
  res.json({ templates });
});

/**
 * GET /cover-letters/suggestions - Get AI content suggestions
 */
router.get('/suggestions', authenticate, async (req: Request, res: Response) => {
  try {
    const { type = 'opening', jobTitle, companyName, industry, skills } = req.query;

    const suggestions = generateSuggestions(type as string, {
      jobTitle: jobTitle as string,
      companyName: companyName as string,
      industry: industry as string,
      skills: skills as string,
    });

    res.json({ type, suggestions });
  } catch (error) {
    console.error('[CoverLetters] Suggestions error:', error);
    res.status(500).json({ error: 'Failed to generate suggestions' });
  }
});

/**
 * POST /cover-letters/generate - Generate cover letter from template
 */
router.post('/generate', authenticate, async (req: Request, res: Response) => {
  try {
    const { templateId = 'professional', jobTitle, companyName, skills, experience, industry, companyValue, uniqueAspect, achievement } = req.body || {};

    const template = templates.find(t => t.id === templateId) || templates[0];

    // Replace placeholders in template
    const replacePlaceholders = (text: string) => {
      return text
        .replace(/{jobTitle}/g, jobTitle || '[Position]')
        .replace(/{companyName}/g, companyName || '[Company]')
        .replace(/{skills}/g, skills || 'relevant skills')
        .replace(/{experience}/g, experience || 'my professional background')
        .replace(/{industry}/g, industry || 'this industry')
        .replace(/{companyValue}/g, companyValue || 'excellence and innovation')
        .replace(/{uniqueAspect}/g, uniqueAspect || 'the innovative approach')
        .replace(/{achievement}/g, achievement || 'meaningful achievements');
    };

    const opening = replacePlaceholders(template.structure.opening);
    const body = template.structure.body.map(replacePlaceholders).join('\n\n');
    const closing = replacePlaceholders(template.structure.closing);

    const generatedContent = `Dear Hiring Manager,\n\n${opening}\n\n${body}\n\n${closing}\n\nSincerely,\n[Your Name]`;

    res.json({
      templateId,
      content: generatedContent,
      sections: {
        opening,
        body: template.structure.body.map(replacePlaceholders),
        closing,
      },
    });
  } catch (error) {
    console.error('[CoverLetters] Generate error:', error);
    res.status(500).json({ error: 'Failed to generate cover letter' });
  }
});

/**
 * POST /cover-letters - Create a new cover letter
 */
router.post('/', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const parsed = coverLetterSchema.parse(req.body);

    let letter: any;
    try {
      // If setting as default, unset other defaults first
      if (parsed.isDefault) {
        await (prisma as any).coverLetter.updateMany({
          where: { userId, isDefault: true },
          data: { isDefault: false },
        });
      }

      letter = await (prisma as any).coverLetter.create({
        data: {
          userId,
          title: parsed.title,
          content: parsed.content,
          jobTitle: parsed.jobTitle,
          companyName: parsed.companyName,
          template: parsed.template,
          isDefault: parsed.isDefault || false,
        },
      });
    } catch {
      // Model doesn't exist, return mock
      letter = {
        id: `cl-${Date.now()}`,
        userId,
        ...parsed,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }

    res.status(201).json(letter);
  } catch (error: any) {
    console.error('[CoverLetters] Create error:', error);
    res.status(400).json({ error: error?.message || 'Failed to create cover letter' });
  }
});

/**
 * GET /cover-letters/:id - Get a specific cover letter
 */
router.get('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { id } = req.params;

    let letter: any;
    try {
      letter = await (prisma as any).coverLetter.findFirst({
        where: { id, userId },
      });
    } catch {
      letter = null;
    }

    if (!letter) {
      return void res.status(404).json({ error: 'Cover letter not found' });
    }

    res.json(letter);
  } catch (error) {
    console.error('[CoverLetters] Get error:', error);
    res.status(500).json({ error: 'Failed to fetch cover letter' });
  }
});

/**
 * PATCH /cover-letters/:id - Update a cover letter
 */
router.patch('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { id } = req.params;
    const parsed = updateCoverLetterSchema.parse(req.body);

    let letter: any;
    try {
      // Check ownership
      const existing = await (prisma as any).coverLetter.findFirst({
        where: { id, userId },
      });

      if (!existing) {
        return void res.status(404).json({ error: 'Cover letter not found' });
      }

      // If setting as default, unset other defaults first
      if (parsed.isDefault) {
        await (prisma as any).coverLetter.updateMany({
          where: { userId, isDefault: true, id: { not: id } },
          data: { isDefault: false },
        });
      }

      letter = await (prisma as any).coverLetter.update({
        where: { id },
        data: parsed,
      });
    } catch {
      return void res.status(404).json({ error: 'Cover letter not found' });
    }

    res.json(letter);
  } catch (error: any) {
    console.error('[CoverLetters] Update error:', error);
    res.status(400).json({ error: error?.message || 'Failed to update cover letter' });
  }
});

/**
 * DELETE /cover-letters/:id - Delete a cover letter
 */
router.delete('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { id } = req.params;

    try {
      const existing = await (prisma as any).coverLetter.findFirst({
        where: { id, userId },
      });

      if (!existing) {
        return void res.status(404).json({ error: 'Cover letter not found' });
      }

      await (prisma as any).coverLetter.delete({
        where: { id },
      });
    } catch {
      return void res.status(404).json({ error: 'Cover letter not found' });
    }

    res.status(204).send();
  } catch (error) {
    console.error('[CoverLetters] Delete error:', error);
    res.status(500).json({ error: 'Failed to delete cover letter' });
  }
});

/**
 * POST /cover-letters/:id/duplicate - Duplicate a cover letter
 */
router.post('/:id/duplicate', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { id } = req.params;

    let letter: any;
    try {
      const existing = await (prisma as any).coverLetter.findFirst({
        where: { id, userId },
      });

      if (!existing) {
        return void res.status(404).json({ error: 'Cover letter not found' });
      }

      letter = await (prisma as any).coverLetter.create({
        data: {
          userId,
          title: `${existing.title} (Copy)`,
          content: existing.content,
          jobTitle: existing.jobTitle,
          companyName: existing.companyName,
          template: existing.template,
          isDefault: false,
        },
      });
    } catch {
      return void res.status(404).json({ error: 'Cover letter not found' });
    }

    res.status(201).json(letter);
  } catch (error) {
    console.error('[CoverLetters] Duplicate error:', error);
    res.status(500).json({ error: 'Failed to duplicate cover letter' });
  }
});

/**
 * POST /cover-letters/for-job/:jobId - Generate cover letter for a specific job
 */
router.post('/for-job/:jobId', authenticate, async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;
    const { templateId = 'professional' } = req.body || {};

    // Fetch job details
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: {
        user: {
          include: { companyProfile: true }
        },
        jobSkills: {
          include: { skill: true }
        }
      },
    });

    if (!job) {
      return void res.status(404).json({ error: 'Job not found' });
    }

    const template = templates.find(t => t.id === templateId) || templates[0];
    
    const companyName = job.user.companyProfile?.companyName || 'your company';
    const industry = job.user.companyProfile?.industry || 'this industry';
    const skillsList = job.jobSkills.map(js => js.skill.name).join(', ') || 'relevant skills';

    // Generate tailored content
    const replacePlaceholders = (text: string) => {
      return text
        .replace(/{jobTitle}/g, job.title)
        .replace(/{companyName}/g, companyName)
        .replace(/{skills}/g, skillsList)
        .replace(/{experience}/g, 'my professional experience')
        .replace(/{industry}/g, industry)
        .replace(/{companyValue}/g, 'your organisational values')
        .replace(/{uniqueAspect}/g, 'the opportunity for growth')
        .replace(/{achievement}/g, 'meaningful contributions');
    };

    const opening = replacePlaceholders(template.structure.opening);
    const body = template.structure.body.map(replacePlaceholders).join('\n\n');
    const closing = replacePlaceholders(template.structure.closing);

    const content = `Dear Hiring Manager,\n\n${opening}\n\n${body}\n\n${closing}\n\nSincerely,\n[Your Name]`;

    res.json({
      jobId,
      jobTitle: job.title,
      companyName,
      templateId,
      content,
      suggestions: {
        skills: job.jobSkills.map(js => js.skill.name),
        qualifications: null,
      },
    });
  } catch (error) {
    console.error('[CoverLetters] For job error:', error);
    res.status(500).json({ error: 'Failed to generate cover letter for job' });
  }
});

export default router;

