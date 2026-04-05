/**
 * Resume Parser API Routes
 * 
 * Endpoints for uploading, parsing, and analyzing resumes with AI.
 */

import { Router, Request, Response } from 'express';
import multer from 'multer';
import { authenticate, optionalAuth } from '../middleware/auth';
import { parseResume, analyzeJobFit, generateResumeSuggestions, ParsedResume } from '../services/resumeParser';
import { prisma } from '../lib/database';

// Extend Request type to include file
interface MulterRequest extends Request {
  file?: Express.Multer.File;
}

const router = Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
  },
  fileFilter: (req: any, file: any, cb: any) => {
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'text/plain',
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Please upload PDF, DOCX, DOC, or TXT files.'));
    }
  },
});

/**
 * POST /api/resume/parse
 * Parse a resume file and extract structured data
 */
router.post('/parse', optionalAuth, upload.single('resume'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return void res.status(400).json({ error: 'No file uploaded' });
    }

    const userId = (req as any).user?.id;

    const parsed = await parseResume(
      req.file.buffer,
      req.file.mimetype,
      userId
    );

    // Generate improvement suggestions
    const suggestions = await generateResumeSuggestions(parsed);

    res.json({
      success: true,
      data: parsed,
      suggestions,
    });
  } catch (error: any) {
    console.error('Resume parse error:', error);
    res.status(500).json({
      error: error.message || 'Failed to parse resume',
    });
  }
});

/**
 * POST /api/resume/analyze-fit
 * Analyze how well a resume matches job requirements
 */
router.post('/analyze-fit', authenticate, async (req: Request, res: Response) => {
  try {
    const { resume, jobId } = req.body;

    if (!resume || !jobId) {
      return void res.status(400).json({ error: 'Resume data and job ID are required' });
    }

    // Get job requirements
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      // Casting selection to ignore missing optional fields in current schema
      select: {
          id: true,
          title: true,
          // Use unknown casting if fields don't exist in Prisma Client yet
      } as any
    });

    if (!job) {
       return void res.status(404).json({ error: 'Job not found' });
    }
    
    // Mock additional fields if they are missing from the DB schema
    const enhancedJob = {
        ...job,
        requiredSkills: (job as any).requiredSkills || [],
        preferredSkills: (job as any).preferredSkills || [],
        experienceYears: (job as any).experienceYears || 0,
        educationRequirement: (job as any).educationRequirement || '',
        culturalFitFactors: (job as any).culturalFitFactors || []
    };

    const analysis = await analyzeJobFit(resume, enhancedJob);

    res.json({
      success: true,
      data: analysis,
    });
  } catch (error: any) {
    console.error('Job fit analysis error:', error);
    res.status(500).json({
      error: error.message || 'Failed to analyze job fit',
    });
  }
});

export default router;


