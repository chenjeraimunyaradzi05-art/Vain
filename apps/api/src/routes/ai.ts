// @ts-nocheck
import express from 'express';
import rateLimit from 'express-rate-limit';
import { prisma } from '../db';
import { askAI } from '../lib/ai';
import { buildRAGContext, formatRAGContextForPrompt } from '../lib/rag';
import authenticateJWT, { optionalAuth } from '../middleware/auth';
import { moderateText } from '../lib/contentModeration';

const router = express.Router();

// Rate limiter for AI endpoints to prevent abuse (stricter than general API)
const aiRateLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute window
    max: 10, // 10 requests per minute for AI endpoints
    message: { error: 'Too many AI requests, please try again later' },
    keyGenerator: (req) => req.user?.id || req.ip || 'anonymous',
    standardHeaders: true,
    legacyHeaders: false
});

// Apply rate limiting to all AI routes
router.use(aiRateLimiter);

// Most AI endpoints require authentication to prevent abuse
// Some public endpoints use optionalAuth for anonymous users with stricter limits

function normalizeText(value: any) {
    return String(value || '')
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function extractKeywords(text: string, limit = 25) {
    const stop = new Set([
        'the', 'and', 'or', 'a', 'an', 'to', 'of', 'in', 'on', 'for', 'with', 'at', 'by', 'from', 'as', 'is', 'are', 'was', 'were',
        'be', 'been', 'being', 'this', 'that', 'these', 'those', 'it', 'its', 'you', 'your', 'we', 'our', 'they', 'their',
        'will', 'can', 'could', 'should', 'would', 'may', 'might', 'must',
        'experience', 'role', 'job', 'work', 'team', 'skills', 'skill', 'ability', 'abilities', 'responsibilities',
    ]);
    const words = normalizeText(text)
        .split(' ')
        .map((w: string) => w.trim())
        .filter((w: string) => w.length >= 4 && !stop.has(w));
    const freq = new Map<string, number>();
    for (const w of words)
        freq.set(w, (freq.get(w) || 0) + 1);
    return [...freq.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([w]) => w);
}

// AI endpoints use askAI helper (provider integration, caching, rate-limiting and safety)
// POST /ai/concierge - RAG-enhanced AI concierge with user context (requires auth)
router.post('/concierge', authenticateJWT, async (req, res) => {
    try {
        const userId = req.user?.id;
        const { context } = req.body || {};
        
        // Build RAG context with user data, jobs, courses, and community resources
        const ragContext = await buildRAGContext(userId, context || 'General dashboard visit');
        const ragPromptContext = formatRAGContextForPrompt(ragContext);
        
        // Get user type for persona-specific advice
        let userType = ragContext.user?.userType || 'MEMBER';
        
        // Build enhanced prompt with RAG context
        const prompt = `You are Athena, an AI career concierge for Aboriginal and Torres Strait Islander community members on the Gimbi platform.

IMPORTANT GUIDELINES:
- Be culturally safe, strengths-based, and practical
- Reference specific opportunities from the user's context when relevant
- Suggest actions based on their actual skills, applications, and connections
- Never invent qualifications or make assumptions about cultural identity
- Keep responses warm, supportive, and action-oriented

USER CONTEXT:
${ragPromptContext}

CURRENT QUERY CONTEXT: ${context || 'General dashboard visit'}
USER TYPE: ${userType}

Based on this context, provide 3-5 personalized, actionable suggestions. Each suggestion should:
1. Be specific to their situation (reference their skills, applications, or connections if relevant)
2. Include a clear next step they can take on the platform
3. Be achievable within the next week

Format each suggestion on a new line starting with a number.`;
        
        // Ask the configured AI provider with RAG context
        const aiResult = await askAI(prompt, { userId });
        if (aiResult && aiResult.status === 429)
            return void res.status(429).json({ error: 'rate_limited' });
        
        let suggestionsFromAi: string[] | null = null;
        if (aiResult && aiResult.source === 'safety') {
            return void res.json({ 
                ok: true, 
                persona: userType, 
                suggestions: [], 
                source: 'safety', 
                text: aiResult.text,
                ragContext: {
                    hasUserContext: !!ragContext.user,
                    relevantJobsCount: ragContext.relevantJobs.length,
                    relevantCoursesCount: ragContext.relevantCourses.length
                }
            });
        }
        
        if (aiResult && aiResult.text) {
            suggestionsFromAi = aiResult.text
                .split(/\n/)
                .filter((s: string) => s.trim().length > 10)
                .map((s: string) => s.replace(/^\d+[.)\s]+/, '').trim())
                .filter((s: string) => s.length > 0)
                .slice(0, 5);
        }
        
        if (suggestionsFromAi && suggestionsFromAi.length > 0) {
            return void res.json({ 
                ok: true, 
                persona: userType, 
                suggestions: suggestionsFromAi, 
                source: aiResult?.source || 'ai',
                // Include relevant context for frontend to display
                relevantJobs: ragContext.relevantJobs.slice(0, 3),
                relevantCourses: ragContext.relevantCourses.slice(0, 3),
                communityResources: ragContext.communityResources.slice(0, 3),
                userTrustLevel: ragContext.user?.trustLevel
            });
        }
        
        // Fallback: context-aware rule-based suggestions using RAG data
        const suggestions: string[] = [];
        
        if (ragContext.user) {
            // Personalized suggestions based on user data
            if (ragContext.user.skills.length < 5) {
                suggestions.push('Add more skills to your profile to improve job matching accuracy');
            }
            
            if (ragContext.relevantJobs.length > 0) {
                const topJob = ragContext.relevantJobs[0];
                suggestions.push(`Check out "${topJob.title}" at ${topJob.company} - it's a ${topJob.matchScore}% match for your skills`);
            }
            
            if (ragContext.user.mentorships.length === 0) {
                suggestions.push('Connect with a mentor to get personalized career guidance and support');
            }
            
            if (ragContext.user.certifications.length < 2 && ragContext.relevantCourses.length > 0) {
                const topCourse = ragContext.relevantCourses[0];
                suggestions.push(`Consider taking "${topCourse.title}" to boost your profile`);
            }
            
            if (ragContext.user.communityConnections < 10) {
                suggestions.push('Grow your network by connecting with other community members');
            }
        }
        
        // User type specific suggestions
        if (userType === 'COMPANY') {
            suggestions.push('Review candidates who applied in the last 7 days');
            suggestions.push('Consider shortlisting candidates from local communities');
        }
        else if (userType === 'MENTOR') {
            suggestions.push('Set availability for next 2 weeks to accept mentee bookings');
            suggestions.push('Share local training courses for youth engagement');
        }
        else if (userType === 'TAFE' || userType === 'INSTITUTION') {
            suggestions.push('Publish newly accredited short-courses for job-readiness');
            suggestions.push('Check pending enrolment requests and respond');
        }
        else if (suggestions.length < 3) {
            suggestions.push('Update your profile to improve job matches');
            suggestions.push('Check recommended short-courses to upskill for nearby roles');
        }
        
        // Context-aware extra actions
        if (context && typeof context === 'string') {
            const ctx = context.toLowerCase();
            if (ctx.includes('interview')) {
                suggestions.push('Use the Interview Prep tool to practice common questions');
            }
            if (ctx.includes('resume') || ctx.includes('cv')) {
                suggestions.push('Try the Resume Enhancer to optimize your application');
            }
            if (ctx.includes('mentor')) {
                suggestions.push('Browse available mentors who match your career goals');
            }
        }
        
        res.json({ 
            ok: true, 
            persona: userType, 
            suggestions: suggestions.slice(0, 5), 
            source: 'fallback',
            relevantJobs: ragContext.relevantJobs.slice(0, 3),
            relevantCourses: ragContext.relevantCourses.slice(0, 3),
            communityResources: ragContext.communityResources.slice(0, 3),
            userTrustLevel: ragContext.user?.trustLevel
        });
    }
    catch (err) {
        console.error('AI concierge error', err);
        res.status(500).json({ error: 'AI concierge failed' });
    }
});

// POST /ai/match-explanation - explain why a candidate matches a job (requires auth)
router.post('/match-explanation', authenticateJWT, async (req, res) => {
    try {
        const { jobId, candidateId, matchScore } = req.body;
        if (!jobId || !candidateId)
            return void res.status(400).json({ error: 'Missing jobId or candidateId' });
        const [job, candidate] = await Promise.all([
            prisma.job.findUnique({ where: { id: jobId }, include: { jobSkills: { include: { skill: true } } } }),
            prisma.memberProfile.findUnique({ where: { userId: candidateId }, include: { user: { include: { userSkills: { include: { skill: true } } } } } }),
        ]);
        if (!job || !candidate)
            return void res.status(404).json({ error: 'Job or candidate not found' });
        const jobSkills = job.jobSkills.map((js) => js.skill.name).join(', ');
        const candidateSkills = candidate.user.userSkills.map((us) => us.skill.name).join(', ');
        const prompt = `
      Explain why this candidate is a ${matchScore}% match for the job "${job.title}".
      Job Description: ${job.description.substring(0, 500)}...
      Job Skills: ${jobSkills}
      Candidate Bio: ${candidate.bio || 'N/A'}
      Candidate Skills: ${candidateSkills}
      
      Provide a concise explanation highlighting strengths and gaps.
    `;
        const aiResult = await askAI(prompt, {
            temperature: 0.3,
            maxTokens: 300,
            userId: candidateId,
            feature: 'match-explanation',
        });
        return void res.json({ explanation: aiResult?.text });
    }
    catch (err) {
        console.error('AI match explanation error', err);
        return void res.status(500).json({ error: 'AI service unavailable' });
    }
});

// POST /ai/resume-optimize - suggest improvements for a resume/profile (requires auth)
router.post('/resume-optimize', authenticateJWT, async (req, res) => {
    try {
        const userId = req.user?.id;
        const { targetJobId } = req.body;
        if (!userId)
            return void res.status(400).json({ error: 'Authentication required' });
        const profile = await prisma.memberProfile.findUnique({
            where: { userId },
            include: { user: { include: { userSkills: { include: { skill: true } } } } },
        });
        if (!profile)
            return void res.status(404).json({ error: 'Profile not found' });
        let jobContext = '';
        if (targetJobId) {
            const job = await prisma.job.findUnique({ where: { id: targetJobId } });
            if (job)
                jobContext = `Target Job: ${job.title}\nDescription: ${job.description.substring(0, 500)}...`;
        }
        const skills = profile.user.userSkills.map((us) => us.skill.name).join(', ');
        const prompt = `
      Suggest improvements for this candidate's profile.
      Bio: ${profile.bio || 'N/A'}
      Skills: ${skills}
      ${jobContext}
      
      Provide 3 specific, actionable improvements to increase hireability.
    `;
        const aiResult = await askAI(prompt, {
            temperature: 0.5,
            maxTokens: 400,
            userId,
            feature: 'resume-optimize',
        });
        return void res.json({ suggestions: aiResult?.text });
    }
    catch (err) {
        console.error('AI resume optimize error', err);
        return void res.status(500).json({ error: 'AI service unavailable' });
    }
});

// POST /ai/job-description - generate or improve a job description (requires auth)
router.post('/job-description', authenticateJWT, async (req, res) => {
    try {
        const userId = req.user?.id;
        const { title, skills, industry, existingDescription } = req.body;
        if (!title)
            return void res.status(400).json({ error: 'Missing job title' });
        const prompt = existingDescription
            ? `
        Improve this job description for a "${title}" role in "${industry || 'General'}".
        Required Skills: ${skills || 'N/A'}
        Current Description: ${existingDescription}
        
        Make it more inclusive, engaging, and clear.
      `
            : `
        Generate a job description for a "${title}" role in "${industry || 'General'}".
        Required Skills: ${skills || 'N/A'}
        
        Include:
        1. Role Summary
        2. Key Responsibilities
        3. Requirements
        4. Benefits
      `;
        const aiResult = await askAI(prompt, {
            temperature: 0.7,
            maxTokens: 800,
            userId,
            feature: 'job-description',
        });
        return void res.json({ description: aiResult?.text });
    }
    catch (err) {
        console.error('AI job description error', err);
        return void res.status(500).json({ error: 'AI service unavailable' });
    }
});

// POST /ai/extract-skills - extract skills from text (resume/job desc) (requires auth)
router.post('/extract-skills', authenticateJWT, async (req, res) => {
    try {
        const { text } = req.body;
        if (!text)
            return void res.status(400).json({ error: 'Missing text' });
        // Use simple keyword extraction first to save tokens/latency
        const keywords = extractKeywords(text);
        // If text is short, just return keywords. If long, maybe use LLM for better extraction?
        // For now, let's use LLM to map keywords to canonical skills if possible, or just return raw extraction.
        // To save costs, we'll just return the keyword extraction for now, or use a very small prompt.
        const prompt = `
      Extract technical and soft skills from this text. Return as a JSON array of strings.
      Text: ${text.substring(0, 1000)}
    `;
        const aiResult = await askAI(prompt, {
            temperature: 0.1,
            maxTokens: 200,
            feature: 'extract-skills',
        });
        let skills: string[] = [];
        try {
            skills = JSON.parse(aiResult?.text || '[]');
        }
        catch (e) {
            // Fallback to regex/keyword extraction if JSON parse fails
            skills = keywords;
        }
        return void res.json({ skills });
    }
    catch (err) {
        console.error('AI extract skills error', err);
        return void res.status(500).json({ error: 'AI service unavailable' });
    }
});

// POST /ai/wellness - simple wellness check and suggested resources (requires auth)
router.post('/wellness', authenticateJWT, async (req, res) => {
    try {
        const userId = req.user?.id;
        const { area } = req.body || {};
        // Build prompt for AI server
        const areaLabel = area || 'general wellness';
        const prompt = `You are a culturally-safe wellness coach for Aboriginal and Torres Strait Islander community members. Provide 3-5 practical, supportive wellness tips for: ${areaLabel}. Always include crisis resources if discussing mental health or suicide. Keep advice culturally appropriate and non-judgmental.`;

        // Build community resources and elder support FIRST (always needed, especially for safety triggers)
        const communityResources = [];
        if (area === 'mental' || area === 'suicide') {
            communityResources.push(
                { name: 'Yarn Safe', description: 'Aboriginal & Torres Strait Islander crisis support line (24/7)', phone: '13YARN (13 92 76)', url: 'https://www.13yarn.org.au' },
                { name: 'Beyond Blue', description: 'Mental health information and support', phone: '1300 22 4636', url: 'https://www.beyondblue.org.au' },
                { name: 'Lifeline', description: 'Crisis support and suicide prevention (24/7)', phone: '13 11 14', url: 'https://www.lifeline.org.au' }
            );
        } else if (area === 'alcohol' || area === 'drugs') {
            communityResources.push(
                { name: 'Aboriginal Drug & Alcohol Council', description: 'Culturally appropriate treatment support', phone: null, url: 'https://www.adac.org.au' },
                { name: 'Alcohol & Drug Foundation', description: 'Information and support services', phone: '1300 858 584', url: 'https://adf.org.au' }
            );
        } else if (area === 'fitness') {
            communityResources.push(
                { name: 'RecLink Australia', description: 'Sport and recreation for community wellbeing', phone: null, url: 'https://reclink.org' },
                { name: 'Aboriginal Sport, Recreation and Physical Activity', description: 'Community sport programs', phone: null, url: null }
            );
        } else {
            communityResources.push(
                { name: 'Healing Foundation', description: 'Healing programs for Aboriginal & Torres Strait Islander people', phone: null, url: 'https://healingfoundation.org.au' },
                { name: 'NACCHO', description: 'National Aboriginal Community Controlled Health Organisation', phone: null, url: 'https://www.naccho.org.au' }
            );
        }

        // Elder support option (placeholder - in production would integrate with Elder verification system)
        const elderSupport = {
            available: true,
            description: 'Would you like to connect with a verified community Elder for cultural guidance and support? Our Elder network is available for yarning sessions.',
            requestPath: '/mentorship/browse?specialty=elder'
        };

        // Ask configured AI provider (handles rate-limit, caching and safety)
        const aiResult = await askAI(prompt, { userId });
        if (aiResult && aiResult.status === 429)
            return void res.status(429).json({ error: 'rate_limited' });
        let tips: string[] = [];
        // try to derive persona/userType for wellness route (similar to concierge)
        let userType = 'MEMBER';
        if (userId) {
            const u = await prisma.user.findUnique({ where: { id: userId } });
            if (u)
                userType = u.userType;
        }
        // Safety filter: still return community resources (critical for mental health crisis)
        if (aiResult && aiResult.source === 'safety') {
            // Add fallback tips for mental health since safety triggered
            if (area === 'mental' || area === 'suicide') {
                tips.push('If you or someone is in immediate danger, call your local emergency number');
                tips.push('Contact your trusted family or community Elders and seek cultural support');
                tips.push('Access 24/7 crisis counselling services available in your region');
            }
            return void res.json({ ok: true, persona: userType, tips, recommendedCourses: [], communityResources, elderSupport, source: 'safety', text: aiResult.text });
        }
        if (aiResult && aiResult.text) {
            tips = aiResult.text
                .split(/\n/)
                .filter((s: string) => s.trim().length > 10)
                .map((s: string) => s.replace(/^\d+[.)\s]+/, '').trim())
                .filter((s: string) => s.length > 0)
                .slice(0, 5);
        }
        // Fallback to rule-based tips if AI fails or returns empty
        if (tips.length === 0) {
            if (area === 'mental' || area === 'suicide') {
                tips.push('If you or someone is in immediate danger, call your local emergency number');
                tips.push('Contact your trusted family or community Elders and seek cultural support');
                tips.push('Access 24/7 crisis counselling services available in your region (check local directories)');
            }
            else if (area === 'alcohol' || area === 'drugs') {
                tips.push('Speak to a community health worker to discuss non-judgmental treatment options');
                tips.push('Consider referral to a local harm-minimisation program');
            }
            else if (area === 'fitness') {
                tips.push('Try short daily walks and community group activities to build stamina');
                tips.push('Explore local sport programs for cultural connection and fitness support');
            }
            else {
                tips.push('Keep hydrated and sleep routine regular');
                tips.push('Start with gentle movement — 10 minute daily sessions can help mood and energy');
            }
        }

        // Fetch courses from AiResource if present
        const allCourses = await prisma.aiResource.findMany({ where: { type: 'COURSE' }, orderBy: { createdAt: 'desc' }, take: 10 });
        const filtered = allCourses.filter((c) => !area || String(c.tags || '').toLowerCase().includes(area));
        const courses = filtered.map((c) => ({ id: c.key, title: c.title, hours: 2 }));
        res.json({ ok: true, tips, recommendedCourses: courses, communityResources, elderSupport, source: aiResult?.source || (tips.length ? 'ai' : 'fallback') });
    }
    catch (err) {
        console.error('AI wellness error', err);
        res.status(500).json({ error: 'AI wellness failed' });
    }
});

// POST /ai/resume-enhancer - improve a resume against a target role/description (requires auth)
router.post('/resume-enhancer', authenticateJWT, async (req, res) => {
    try {
        const userId = req.user?.id;
        const { resumeText, targetJobTitle, jobDescription } = req.body || {};
        const resume = String(resumeText || '').trim();
        const jobTitle = String(targetJobTitle || '').trim();
        const jd = String(jobDescription || '').trim();
        if (!resume) {
            return void res.status(400).json({ error: 'resumeText is required' });
        }
        if (!jobTitle && !jd) {
            return void res.status(400).json({ error: 'targetJobTitle or jobDescription is required' });
        }
        const clippedResume = resume.length > 6000 ? resume.slice(0, 6000) : resume;
        const clippedJd = jd.length > 6000 ? jd.slice(0, 6000) : jd;
        const prompt = `You are an ATS-aware resume coach for Aboriginal and Torres Strait Islander community members.\n\nTask: Improve the resume for the target role and identify missing keywords. Keep advice culturally-safe and strengths-based. Do not invent qualifications, licences, employers, dates, or achievements.\n\nReturn ONLY valid JSON with keys:\n- improvedSummary (string)\n- missingKeywords (array of strings)\n- bulletPointImprovements (array of strings)\n- culturalAlignmentTips (array of strings)\n- disclaimer (string)\n\nTarget job title: ${jobTitle || 'N/A'}\nJob description: ${clippedJd || 'N/A'}\n\nResume: ${clippedResume}`;
        const aiResult = await askAI(prompt, { userId: userId || undefined, ip: req.ip });
        if (aiResult && aiResult.status === 429)
            return void res.status(429).json({ error: 'rate_limited' });
        if (aiResult && aiResult.source === 'safety') {
            return void res.json({ ok: true, source: 'safety', result: null, text: aiResult.text });
        }

        if (aiResult && aiResult.text) {
            try {
                const parsed = JSON.parse(aiResult.text);
                return void res.json({ ok: true, source: aiResult.source || 'ai', result: parsed });
            }
            catch {
                // fall through to heuristic response
            }
        }

        const jdKeywords = extractKeywords(clippedJd || jobTitle, 30);
        const resumeNorm = normalizeText(clippedResume);
        const missing = jdKeywords.filter((k) => !resumeNorm.includes(k)).slice(0, 12);
        const result = {
            improvedSummary: jobTitle
                ? `Tailor your summary toward ${jobTitle}. Lead with strengths, community connection, and measurable outcomes.`
                : 'Tailor your summary to the job description. Lead with strengths and measurable outcomes.',
            missingKeywords: missing,
            bulletPointImprovements: [
                'Rewrite bullets using: action + what you did + tools + measurable result (if true).',
                'Mirror key terms from the job description (only if accurate).',
                'Add a short “Skills” section with the most relevant skills for this role.',
            ],
            culturalAlignmentTips: [
                'Use strengths-based language and acknowledge community-focused outcomes where relevant.',
                'If applicable, include culturally safe leadership or community engagement experience (only if true).',
                'Keep tone confident and grounded; avoid over-claiming credentials.',
            ],
            disclaimer: 'Suggestions are guidance only. Do not add qualifications or licences you do not hold.',
        };
        return void res.json({ ok: true, source: aiResult?.source || 'fallback', result });
    }
    catch (err) {
        console.error('AI resume enhancer error', err);
        return void res.status(500).json({ error: 'AI resume enhancer failed' });
    }
});

// POST /ai/interview-prep - generate interview questions and feedback on an answer (requires auth)
router.post('/interview-prep', authenticateJWT, async (req, res) => {
    try {
        const userId = req.user?.id;
        const { jobTitle, jobDescription, question, answer } = req.body || {};

        const title = String(jobTitle || '').trim();
        const jd = String(jobDescription || '').trim();
        const q = String(question || '').trim();
        const a = String(answer || '').trim();

        if (!title && !jd) {
            return void res.status(400).json({ error: 'jobTitle or jobDescription is required' });
        }

        const clippedJd = jd.length > 6000 ? jd.slice(0, 6000) : jd;
        const clippedAnswer = a.length > 3500 ? a.slice(0, 3500) : a;

        const prompt = `You are an interview coach for Aboriginal and Torres Strait Islander community members. Be culturally-safe, strengths-based, and practical.

Task:
1) Generate 5 likely interview questions for the role.
2) If a question and answer are provided, give feedback using STAR structure (Situation, Task, Action, Result) and suggest 3 improvements.

Rules:
- Do not invent experience, credentials, licences, or employers.
- Avoid sensitive personal probing; keep questions job-relevant.

Return ONLY valid JSON with keys:
- questions (array of strings)
- feedback (string | null)
- suggestedImprovements (array of strings)
- disclaimer (string)

Role title: ${title || 'N/A'}
Role description: ${clippedJd || 'N/A'}

Question (optional): ${q || 'N/A'}
Answer (optional): ${clippedAnswer || 'N/A'}`;

        const aiResult = await askAI(prompt, { userId: userId || undefined, ip: req.ip });
        if (aiResult && aiResult.status === 429)
            return void res.status(429).json({ error: 'rate_limited' });
        if (aiResult && aiResult.source === 'safety') {
            return void res.json({ ok: true, source: 'safety', result: null, text: aiResult.text });
        }

        if (aiResult && aiResult.text) {
            try {
                const parsed = JSON.parse(aiResult.text);
                return void res.json({ ok: true, source: aiResult.source || 'ai', result: parsed });
            }
            catch {
                // fall through to deterministic response
            }
        }

        const keywords = extractKeywords(`${title} ${clippedJd}`, 12);
        const roleHint = title || 'this role';
        const baseQuestions = [
            `Tell us about yourself and why you're interested in ${roleHint}.`,
            'Describe a time you worked safely and followed site or workplace procedures.',
            'Tell us about a time you handled a challenge or conflict in a team.',
            'How do you prioritise tasks when you have multiple deadlines?',
            'What does success look like in your first 90 days in this role?',
        ];
        const keywordQuestions = keywords.slice(0, 3).map((k) => `Tell us about your experience with ${k}.`);
        const questions = [...baseQuestions, ...keywordQuestions].slice(0, 5);

        const feedback = clippedAnswer
            ? 'Your answer has a good start. To make it stronger, structure it as STAR: briefly set the Situation, clarify the Task, explain the Actions you took, and end with the Result (ideally measurable). Keep it confident and grounded in what you actually did.'
            : null;

        const suggestedImprovements = clippedAnswer
            ? [
                'Add a concrete result (number, time saved, safety outcome, or customer impact) if you can do so truthfully.',
                'Be specific about your actions (tools used, steps taken, communication, collaboration).',
                'Finish with what you learned and how you would apply it in this role.',
            ]
            : [
                'Prepare 2–3 STAR stories from your experience (teamwork, safety, problem solving).',
                'Review the role requirements and map your examples to them.',
                'Write down 2 questions to ask the employer (training, support, culture, progression).',
            ];

        const result = {
            questions,
            feedback,
            suggestedImprovements,
            disclaimer: 'Guidance only. Do not claim qualifications, licences, or experience you do not have.',
        };

        return void res.json({ ok: true, source: aiResult?.source || 'fallback', result });
    }
    catch (err) {
        console.error('AI interview prep error', err);
        return void res.status(500).json({ error: 'AI interview prep failed' });
    }
});

// GET /ai/opportunity-radar - returns recent local opportunities and proactive matches
router.get('/opportunity-radar', async (req, res) => {
    try {
        // Basic opportunity radar: most recent active jobs and a few smart hints
        const jobs = await prisma.job.findMany({ where: { isActive: true }, orderBy: { postedAt: 'desc' }, take: 5 });
        // Also propose relevant AiResource guides as hints
        const guides = await prisma.aiResource.findMany({ where: { type: 'GUIDE' }, take: 5 });
        const hints = guides.map((g) => g.title).concat(['Watch for roles with training support', 'Consider short courses that match job requirements']);
        res.json({ ok: true, jobs, hints });
    }
    catch (err) {
        console.error('OpportunityRadar error', err);
        res.status(500).json({ error: 'OpportunityRadar failed' });
    }
});

// ----- AI Conversations & Messages -----
// GET /ai/conversations - list user's conversations
router.get('/conversations', authenticateJWT, async (req, res) => {
    try {
        const userId = req.user?.id;
        const conversations = await prisma.aiConversation.findMany({
            where: { userId },
            orderBy: { updatedAt: 'desc' },
            include: { messages: { orderBy: { createdAt: 'desc' }, take: 1 } },
        });
        return void res.json({ ok: true, conversations });
    }
    catch (err) {
        console.error('List conversations error', err);
        return void res.status(500).json({ error: 'Failed to list conversations' });
    }
});

// POST /ai/conversations - create a new conversation
router.post('/conversations', authenticateJWT, async (req, res) => {
    try {
        const userId = req.user?.id;
        const { title } = req.body || {};
        const conv = await prisma.aiConversation.create({ data: { userId, title } });
        return void res.json({ ok: true, conversation: conv });
    }
    catch (err) {
        console.error('Create conversation error', err);
        return void res.status(500).json({ error: 'Failed to create conversation' });
    }
});

// GET /ai/conversations/:id - get conversation with messages
router.get('/conversations/:id', authenticateJWT, async (req, res) => {
    try {
        const userId = req.user?.id;
        const id = req.params.id;
        const conv = await prisma.aiConversation.findFirst({ where: { id, userId }, include: { messages: { orderBy: { createdAt: 'asc' } } } });
        if (!conv) return void res.status(404).json({ error: 'Not found' });
        return void res.json({ ok: true, conversation: conv });
    }
    catch (err) {
        console.error('Get conversation error', err);
        return void res.status(500).json({ error: 'Failed to fetch conversation' });
    }
});

// POST /ai/conversations/:id/messages - append a message and get assistant response
router.post('/conversations/:id/messages', authenticateJWT, async (req, res) => {
    try {
        const userId = req.user?.id;
        const id = req.params.id;
        const { role = 'user', content = '', meta = {} } = req.body || {};

        if (!content || typeof content !== 'string') return void res.status(400).json({ error: 'Missing content' });

        // Basic moderation
        const moderation = moderateText(content);
        if (moderation.flagged) {
            return void res.status(400).json({ error: 'Message content blocked', moderation });
        }

        // Create user message
        const userMessage = await prisma.aiMessage.create({ data: { conversationId: id, role, content, meta: { ...meta } } });
        await prisma.aiConversation.update({ where: { id }, data: { lastMessageAt: new Date(), updatedAt: new Date() } });

        // Fetch recent messages to build context
        const contextMessages = await prisma.aiMessage.findMany({ where: { conversationId: id }, orderBy: { createdAt: 'asc' } });
        const convoText = contextMessages.map((m) => `${m.role.toUpperCase()}: ${m.content}`).join('\n');

        // Build prompt for assistant using existing concierge prompt as a base
        const prompt = `You are Athena, an AI career concierge. Continue the conversation below in a culturally-safe, strengths-based, and practical way. Do not invent qualifications or assume cultural identity.

Conversation history:
${convoText}

Assistant:`;

        const aiResult = await askAI(prompt, { userId, feature: 'conversation' });
        if (aiResult && aiResult.status === 429) return void res.status(429).json({ error: 'rate_limited' });

        // If safety triggered, record assistant note but mark source
        if (aiResult && aiResult.source === 'safety') {
            const assistantMessage = await prisma.aiMessage.create({ data: { conversationId: id, role: 'assistant', content: aiResult.text || '[Content removed]', meta: { source: 'safety' } } });
            await prisma.aiConversation.update({ where: { id }, data: { lastMessageAt: new Date(), updatedAt: new Date() } });
            return void res.json({ ok: true, source: 'safety', assistantMessage });
        }

        // Normal assistant response
        const assistantText = (aiResult && aiResult.text) ? aiResult.text : 'Sorry, I don\'t have an answer right now.';
        const assistantMessage = await prisma.aiMessage.create({ data: { conversationId: id, role: 'assistant', content: assistantText, meta: { source: aiResult?.source || 'ai' } } });
        await prisma.aiConversation.update({ where: { id }, data: { lastMessageAt: new Date(), updatedAt: new Date() } });

        return void res.json({ ok: true, userMessage, assistantMessage });
    }
    catch (err) {
        console.error('Append message error', err);
        return void res.status(500).json({ error: 'Failed to append message' });
    }
});

export default router;



