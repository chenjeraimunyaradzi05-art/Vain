/**
 * AI Resume Parsing Service
 * 
 * Uses OpenAI GPT to parse and extract structured data from resumes.
 * Supports PDF, DOCX, and plain text formats.
 */

import { prisma } from '../lib/database';

// Optional imports - service gracefully handles missing packages
let OpenAI: any;
let pdf: any;
let mammoth: any;

try {
  OpenAI = require('openai').default;
} catch (e) {
  console.warn('OpenAI package not installed - resume parsing will be limited');
}

try {
  pdf = require('pdf-parse');
} catch (e) {
  console.warn('pdf-parse package not installed - PDF parsing disabled');
}

try {
  mammoth = require('mammoth');
} catch (e) {
  console.warn('mammoth package not installed - DOCX parsing disabled');
}

// Only initialize OpenAI client when a key is provided to avoid runtime errors
const openai = OpenAI && process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

export interface ParsedResume {
  contact: {
    name: string;
    email?: string;
    phone?: string;
    location?: string;
    linkedin?: string;
    portfolio?: string;
  };
  summary?: string;
  experience: {
    title: string;
    company: string;
    location?: string;
    startDate?: string;
    endDate?: string;
    current?: boolean;
    description?: string;
    highlights?: string[];
  }[];
  education: {
    degree: string;
    institution: string;
    location?: string;
    graduationDate?: string;
    gpa?: string;
    honors?: string[];
  }[];
  skills: {
    technical: string[];
    soft: string[];
    languages: string[];
    certifications: string[];
  };
  languages: {
    language: string;
    proficiency: string;
  }[];
  references?: {
    name: string;
    relationship: string;
    contact?: string;
  }[];
  culturalBackground?: {
    indigenousAffiliation?: string;
    culturalExperience?: string[];
    communityInvolvement?: string[];
  };
  additionalInfo?: string[];
  confidence: number;
  warnings?: string[];
}

/**
 * Extract text from a PDF buffer
 */
async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  if (!pdf) {
    throw new Error('PDF parsing is not available. Please install pdf-parse package.');
  }
  try {
    const data = await pdf(buffer);
    return data.text;
  } catch (error) {
    console.error('PDF extraction error:', error);
    throw new Error('Failed to extract text from PDF');
  }
}

/**
 * Extract text from a DOCX buffer
 */
async function extractTextFromDOCX(buffer: Buffer): Promise<string> {
  if (!mammoth) {
    throw new Error('DOCX parsing is not available. Please install mammoth package.');
  }
  try {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  } catch (error) {
    console.error('DOCX extraction error:', error);
    throw new Error('Failed to extract text from DOCX');
  }
}

/**
 * Use GPT to parse resume text into structured data
 */
async function parseResumeWithGPT(text: string): Promise<ParsedResume> {
  const systemPrompt = `You are an expert resume parser. Extract structured information from resumes and return it as JSON.
  
Be especially attentive to:
- Indigenous Australian cultural affiliations or community involvement
- First Nations language skills
- Cultural knowledge or community experience
- Remote area or regional Australian experience

Return a JSON object with this structure:
{
  "contact": { "name": "", "email": "", "phone": "", "location": "", "linkedin": "", "portfolio": "" },
  "summary": "",
  "experience": [{ "title": "", "company": "", "location": "", "startDate": "", "endDate": "", "current": false, "description": "", "highlights": [] }],
  "education": [{ "degree": "", "institution": "", "location": "", "graduationDate": "", "gpa": "", "honors": [] }],
  "skills": { "technical": [], "soft": [], "languages": [], "certifications": [] },
  "languages": [{ "language": "", "proficiency": "" }],
  "references": [{ "name": "", "relationship": "", "contact": "" }],
  "culturalBackground": { "indigenousAffiliation": "", "culturalExperience": [], "communityInvolvement": [] },
  "additionalInfo": [],
  "confidence": 0.0 to 1.0,
  "warnings": []
}

Fill in what you can extract. Use null for fields that aren't present. Set confidence based on how much information you could extract.
Add warnings for any parsing issues or uncertainties.`;

  try {
    if (!openai) {
      throw new Error('OpenAI is not configured. Please install openai package and set OPENAI_API_KEY.');
    }
    
    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Parse this resume:\n\n${text}` },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
      max_tokens: 4000,
    });

    const parsed = JSON.parse(response.choices[0].message.content || '{}');
    
    return {
      contact: parsed.contact || { name: 'Unknown' },
      summary: parsed.summary,
      experience: parsed.experience || [],
      education: parsed.education || [],
      skills: parsed.skills || { technical: [], soft: [], languages: [], certifications: [] },
      languages: parsed.languages || [],
      references: parsed.references,
      culturalBackground: parsed.culturalBackground,
      additionalInfo: parsed.additionalInfo,
      confidence: parsed.confidence || 0.5,
      warnings: parsed.warnings,
    };
  } catch (error) {
    console.error('GPT parsing error:', error);
    throw new Error('Failed to parse resume with AI');
  }
}

/**
 * Main function to parse a resume
 */
export async function parseResume(
  buffer: Buffer,
  mimeType: string,
  userId?: string,
  fileName?: string
): Promise<ParsedResume> {
  // Extract text based on file type
  let text: string;
  let fileType = 'unknown';
  
  if (mimeType === 'application/pdf') {
    text = await extractTextFromPDF(buffer);
    fileType = 'pdf';
  } else if (
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    mimeType === 'application/msword'
  ) {
    text = await extractTextFromDOCX(buffer);
    fileType = 'docx';
  } else if (mimeType === 'text/plain') {
    text = buffer.toString('utf-8');
    fileType = 'txt';
  } else {
    throw new Error(`Unsupported file type: ${mimeType}`);
  }

  // Check text length
  if (text.length < 50) {
    throw new Error('Resume text is too short to parse');
  }

  // Truncate if too long
  const maxLength = 15000;
  if (text.length > maxLength) {
    text = text.substring(0, maxLength);
  }

  // Parse with GPT
  const parsed = await parseResumeWithGPT(text);

  // Store parsing result if user is logged in
  if (userId) {
    try {
      await prisma.resumeParseResult.create({
        data: {
          userId,
          fileName: fileName || 'resume',
          fileType,
          fileSize: buffer.length,
          status: 'completed',
          rawText: text.substring(0, 5000), // Store first 5000 chars
          parsedData: JSON.stringify(parsed),
          fullName: parsed.contact?.name,
          email: parsed.contact?.email,
          phone: parsed.contact?.phone,
          location: parsed.contact?.location,
          summary: parsed.summary,
        },
      });
    } catch (err) {
      console.warn('Failed to store parse result:', err);
    }
  }

  return parsed;
}

/**
 * Analyze job fit based on parsed resume and job requirements
 */
export async function analyzeJobFit(
  resume: ParsedResume,
  jobRequirements: {
    requiredSkills: string[];
    preferredSkills?: string[];
    experienceYears?: number;
    education?: string;
    culturalFitFactors?: string[];
  }
): Promise<{
  overallFit: number;
  skillMatch: { matched: string[]; missing: string[] };
  experienceMatch: boolean;
  educationMatch: boolean;
  culturalFit: number;
  recommendations: string[];
}> {
  // Extract all skills from resume
  const resumeSkills = [
    ...resume.skills.technical,
    ...resume.skills.soft,
    ...resume.skills.certifications,
  ].map(s => s.toLowerCase());

  // Check skill matches
  const matched: string[] = [];
  const missing: string[] = [];
  
  jobRequirements.requiredSkills.forEach(skill => {
    if (resumeSkills.some(s => s.includes(skill.toLowerCase()) || skill.toLowerCase().includes(s))) {
      matched.push(skill);
    } else {
      missing.push(skill);
    }
  });

  // Calculate experience years
  let totalExperienceYears = 0;
  resume.experience.forEach(exp => {
    if (exp.startDate) {
      const start = new Date(exp.startDate);
      const end = exp.current ? new Date() : (exp.endDate ? new Date(exp.endDate) : new Date());
      totalExperienceYears += (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365);
    }
  });

  const experienceMatch = !jobRequirements.experienceYears || 
    totalExperienceYears >= jobRequirements.experienceYears * 0.75;

  // Check education
  const educationMatch = !jobRequirements.education || 
    resume.education.some(edu => 
      edu.degree.toLowerCase().includes(jobRequirements.education?.toLowerCase() || '')
    );

  // Calculate cultural fit
  let culturalFit = 0.5;
  if (resume.culturalBackground && jobRequirements.culturalFitFactors?.length) {
    const culturalExperiences = [
      resume.culturalBackground.indigenousAffiliation,
      ...(resume.culturalBackground.culturalExperience || []),
      ...(resume.culturalBackground.communityInvolvement || []),
    ].filter(Boolean).map(s => s?.toLowerCase() || '');

    const culturalMatches = jobRequirements.culturalFitFactors.filter(factor =>
      culturalExperiences.some(exp => exp.includes(factor.toLowerCase()))
    );

    culturalFit = 0.5 + (culturalMatches.length / jobRequirements.culturalFitFactors.length) * 0.5;
  }

  // Calculate overall fit
  const skillFit = matched.length / jobRequirements.requiredSkills.length;
  const overallFit = Math.round(
    (skillFit * 0.4 + (experienceMatch ? 0.25 : 0) + (educationMatch ? 0.15 : 0) + culturalFit * 0.2) * 100
  );

  // Generate recommendations
  const recommendations: string[] = [];
  if (missing.length > 0) {
    recommendations.push(`Consider highlighting or developing skills in: ${missing.slice(0, 3).join(', ')}`);
  }
  if (!experienceMatch) {
    recommendations.push('Consider relevant internships or volunteer experience to build experience');
  }
  if (matched.length > 0) {
    recommendations.push(`Your strengths align well: ${matched.slice(0, 3).join(', ')}`);
  }

  return {
    overallFit,
    skillMatch: { matched, missing },
    experienceMatch,
    educationMatch,
    culturalFit: Math.round(culturalFit * 100),
    recommendations,
  };
}

/**
 * Generate resume improvement suggestions
 */
export async function generateResumeSuggestions(resume: ParsedResume): Promise<string[]> {
  const suggestions: string[] = [];

  // Check for missing sections
  if (!resume.summary || resume.summary.length < 50) {
    suggestions.push('Add a professional summary highlighting your key strengths and career goals');
  }

  if (resume.experience.length === 0) {
    suggestions.push('Add work experience, including internships, volunteer work, or community involvement');
  } else {
    const missingHighlights = resume.experience.filter(exp => !exp.highlights?.length);
    if (missingHighlights.length > 0) {
      suggestions.push('Add specific achievements and metrics to your work experience entries');
    }
  }

  if (resume.skills.technical.length < 3) {
    suggestions.push('List more technical skills relevant to your target role');
  }

  if (resume.education.length === 0) {
    suggestions.push('Include your educational background, even if informal or ongoing');
  }

  if (!resume.contact.linkedin) {
    suggestions.push('Consider adding your LinkedIn profile URL');
  }

  // Cultural background suggestions for Indigenous job seekers
  if (resume.culturalBackground?.indigenousAffiliation) {
    if (!resume.culturalBackground.communityInvolvement?.length) {
      suggestions.push('Consider highlighting any community involvement or cultural activities');
    }
  }

  return suggestions;
}
