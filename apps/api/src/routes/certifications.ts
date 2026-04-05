/**
 * Certifications & Credentials Routes
 * Phase 6 Steps 576-600: Certifications & Credentials
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

const certificationSchema = z.object({
  name: z.string().min(1),
  provider: z.string().min(1),
  category: z.string().optional(),
  issueDate: z.string().datetime(),
  expiryDate: z.string().datetime().optional(),
  credentialId: z.string().optional(),
  credentialUrl: z.string().url().optional(),
  skills: z.array(z.string()).optional(),
  description: z.string().optional(),
});

const updateCertificationSchema = certificationSchema.partial();

// =============================================================================
// Certification Catalog (Reference Data)
// =============================================================================

const certificationCatalog = [
  {
    id: 'cert-iii-business',
    name: 'Certificate III in Business',
    provider: 'TAFE',
    category: 'Business',
    level: 'Certificate III',
    duration: '6-12 months',
    description: 'Foundation business skills including administration, customer service, and communication',
    skills: ['Business Administration', 'Customer Service', 'Communication'],
    careerPaths: ['Office Administrator', 'Customer Service Representative', 'Receptionist'],
    roi: { averageSalaryIncrease: '$5,000-$10,000', employmentRate: '85%' },
  },
  {
    id: 'cert-iv-training',
    name: 'Certificate IV in Training and Assessment',
    provider: 'TAFE/RTO',
    category: 'Education',
    level: 'Certificate IV',
    duration: '6-12 months',
    description: 'Qualification for trainers and assessors in the vocational education sector',
    skills: ['Training Delivery', 'Assessment', 'Learning Design'],
    careerPaths: ['Trainer', 'Assessor', 'Training Coordinator'],
    roi: { averageSalaryIncrease: '$10,000-$20,000', employmentRate: '90%' },
  },
  {
    id: 'cert-iv-community',
    name: 'Certificate IV in Community Services',
    provider: 'TAFE',
    category: 'Community',
    level: 'Certificate IV',
    duration: '12 months',
    description: 'Skills for community services work including case management and advocacy',
    skills: ['Case Management', 'Advocacy', 'Community Development'],
    careerPaths: ['Community Worker', 'Case Manager', 'Youth Worker'],
    roi: { averageSalaryIncrease: '$8,000-$15,000', employmentRate: '88%' },
  },
  {
    id: 'cert-iii-health',
    name: 'Certificate III in Aboriginal and/or Torres Strait Islander Primary Health Care',
    provider: 'TAFE/Aboriginal Health Services',
    category: 'Health',
    level: 'Certificate III',
    duration: '12-18 months',
    description: 'Primary health care skills for Indigenous health workers',
    skills: ['Primary Health Care', 'Cultural Safety', 'Health Promotion'],
    careerPaths: ['Aboriginal Health Worker', 'Health Educator', 'Community Health Worker'],
    roi: { averageSalaryIncrease: '$10,000-$20,000', employmentRate: '92%' },
  },
  {
    id: 'project-management',
    name: 'Certificate IV in Project Management Practice',
    provider: 'TAFE/Private RTO',
    category: 'Management',
    level: 'Certificate IV',
    duration: '6-12 months',
    description: 'Project management fundamentals and practical application',
    skills: ['Project Planning', 'Stakeholder Management', 'Risk Management'],
    careerPaths: ['Project Coordinator', 'Project Officer', 'Team Leader'],
    roi: { averageSalaryIncrease: '$15,000-$30,000', employmentRate: '87%' },
  },
  {
    id: 'first-aid',
    name: 'First Aid Certificate (HLTAID011)',
    provider: 'Various RTOs',
    category: 'Safety',
    level: 'Short Course',
    duration: '1-2 days',
    description: 'Essential first aid skills for workplace and community settings',
    skills: ['First Aid', 'CPR', 'Emergency Response'],
    careerPaths: ['Many roles require this as a baseline qualification'],
    renewalRequired: true,
    renewalPeriod: '3 years',
  },
  {
    id: 'working-with-children',
    name: 'Working With Children Check',
    provider: 'State Government',
    category: 'Compliance',
    level: 'Clearance',
    duration: '2-4 weeks processing',
    description: 'Required for roles involving work with children',
    renewalRequired: true,
    renewalPeriod: '5 years',
  },
];

const industryBadges = [
  {
    id: 'digital-literacy',
    name: 'Digital Literacy',
    type: 'skill-badge',
    provider: 'Gimbi',
    description: 'Demonstrates foundational digital skills',
    criteria: ['Complete digital skills assessment', 'Score 80% or higher'],
    badgeUrl: '/badges/digital-literacy.svg',
  },
  {
    id: 'cultural-competency',
    name: 'Cultural Competency',
    type: 'completion-badge',
    provider: 'Gimbi',
    description: 'Completed cultural competency training',
    criteria: ['Complete cultural competency course', 'Pass assessment'],
    badgeUrl: '/badges/cultural-competency.svg',
  },
  {
    id: 'community-leader',
    name: 'Community Leader',
    type: 'achievement-badge',
    provider: 'Gimbi',
    description: 'Recognized community leadership',
    criteria: ['Mentor 5+ community members', 'Lead community initiative'],
    badgeUrl: '/badges/community-leader.svg',
  },
];

// =============================================================================
// User Certification Store (In-memory for demo, would be DB in production)
// =============================================================================

const userCertificationsStore = new Map<string, any[]>();

function getUserCertifications(userId: string) {
  if (!userCertificationsStore.has(userId)) {
    userCertificationsStore.set(userId, []);
  }
  return userCertificationsStore.get(userId)!;
}

// =============================================================================
// Routes
// =============================================================================

/**
 * GET /certifications/catalog - Browse certification catalog
 */
router.get('/catalog', async (req: Request, res: Response) => {
  const { category, level, search } = req.query;

  let filtered = [...certificationCatalog];

  if (category) {
    filtered = filtered.filter(c => c.category?.toLowerCase() === String(category).toLowerCase());
  }

  if (level) {
    filtered = filtered.filter(c => c.level?.toLowerCase().includes(String(level).toLowerCase()));
  }

  if (search) {
    const searchLower = String(search).toLowerCase();
    filtered = filtered.filter(c =>
      c.name.toLowerCase().includes(searchLower) ||
      c.description?.toLowerCase().includes(searchLower) ||
      c.skills?.some(s => s.toLowerCase().includes(searchLower))
    );
  }

  res.json({
    certifications: filtered,
    categories: [...new Set(certificationCatalog.map(c => c.category).filter(Boolean))],
    levels: [...new Set(certificationCatalog.map(c => c.level).filter(Boolean))],
  });
});

/**
 * GET /certifications/catalog/:id - Get certification details
 */
router.get('/catalog/:id', async (req: Request, res: Response) => {
  const { id } = req.params;

  const certification = certificationCatalog.find(c => c.id === id);

  if (!certification) {
    return void res.status(404).json({ error: 'Certification not found' });
  }

  // Find related certifications
  const related = certificationCatalog
    .filter(c => c.id !== id && c.category === certification.category)
    .slice(0, 3);

  res.json({
    certification,
    related,
    providers: [
      { name: 'TAFE NSW', url: 'https://www.tafensw.edu.au/' },
      { name: 'TAFE Queensland', url: 'https://tafeqld.edu.au/' },
    ],
  });
});

/**
 * GET /certifications/badges - List available badges
 */
router.get('/badges', async (_req: Request, res: Response) => {
  res.json({ badges: industryBadges });
});

/**
 * GET /certifications/mine - List user's certifications
 */
router.get('/mine', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;

    // Try to fetch from UserBadge table first
    let certifications: any[] = [];
    try {
      certifications = await prisma.userBadge.findMany({
        where: { userId },
        orderBy: { issuedAt: 'desc' },
      });
    } catch {
      // Fallback to in-memory store
      certifications = getUserCertifications(userId);
    }

    // Check for upcoming renewals
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const withRenewalStatus = certifications.map((cert: any) => {
      const expiryDate = cert.expiresAt ? new Date(cert.expiresAt) : null;
      let renewalStatus = 'valid';

      if (expiryDate) {
        if (expiryDate < now) {
          renewalStatus = 'expired';
        } else if (expiryDate < thirtyDaysFromNow) {
          renewalStatus = 'expiring-soon';
        }
      }

      return { ...cert, renewalStatus };
    });

    res.json({
      certifications: withRenewalStatus,
      summary: {
        total: certifications.length,
        valid: withRenewalStatus.filter((c: any) => c.renewalStatus === 'valid').length,
        expiringSoon: withRenewalStatus.filter((c: any) => c.renewalStatus === 'expiring-soon').length,
        expired: withRenewalStatus.filter((c: any) => c.renewalStatus === 'expired').length,
      },
    });
  } catch (error) {
    console.error('[Certifications] List mine error:', error);
    res.status(500).json({ error: 'Failed to fetch certifications' });
  }
});

/**
 * POST /certifications - Add a certification
 */
router.post('/', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const parsed = certificationSchema.parse(req.body);

    const certification = {
      id: `cert-${Date.now()}`,
      userId,
      badgeName: parsed.name,
      issuer: parsed.provider,
      category: parsed.category,
      issuedAt: new Date(parsed.issueDate),
      expiresAt: parsed.expiryDate ? new Date(parsed.expiryDate) : null,
      credentialId: parsed.credentialId,
      credentialUrl: parsed.credentialUrl,
      skills: parsed.skills || [],
      description: parsed.description,
      verificationStatus: 'pending',
      createdAt: new Date(),
    };

    // Try to save to UserBadge table
    try {
      const saved = await prisma.userBadge.create({
        data: {
          userId,
          name: certification.badgeName,
          issuerName: certification.issuer,
          issuedAt: certification.issuedAt,
          expiresAt: certification.expiresAt,
          verificationUrl: certification.credentialUrl,
          badgeJson: JSON.stringify({
            category: parsed.category,
            skills: parsed.skills,
            credentialId: parsed.credentialId,
          }),
        },
      });
      res.status(201).json(saved);
    } catch {
      // Fallback to in-memory
      const userCerts = getUserCertifications(userId);
      userCerts.push(certification);
      res.status(201).json(certification);
    }
  } catch (error: any) {
    console.error('[Certifications] Add error:', error);
    res.status(400).json({ error: error?.message || 'Failed to add certification' });
  }
});

/**
 * PATCH /certifications/:id - Update a certification
 */
router.patch('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { id } = req.params;
    const parsed = updateCertificationSchema.parse(req.body);

    try {
      const updated = await prisma.userBadge.update({
        where: { id },
        data: {
          name: parsed.name,
          issuerName: parsed.provider,
          issuedAt: parsed.issueDate ? new Date(parsed.issueDate) : undefined,
          expiresAt: parsed.expiryDate ? new Date(parsed.expiryDate) : undefined,
          verificationUrl: parsed.credentialUrl,
        },
      });
      res.json(updated);
    } catch {
      // Fallback to in-memory
      const userCerts = getUserCertifications(userId);
      const index = userCerts.findIndex((c: any) => c.id === id);
      if (index === -1) {
        return void res.status(404).json({ error: 'Certification not found' });
      }
      userCerts[index] = { ...userCerts[index], ...parsed };
      res.json(userCerts[index]);
    }
  } catch (error: any) {
    console.error('[Certifications] Update error:', error);
    res.status(400).json({ error: error?.message || 'Failed to update certification' });
  }
});

/**
 * DELETE /certifications/:id - Remove a certification
 */
router.delete('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { id } = req.params;

    try {
      await prisma.userBadge.delete({ where: { id } });
      res.status(204).send();
    } catch {
      // Fallback to in-memory
      const userCerts = getUserCertifications(userId);
      const index = userCerts.findIndex((c: any) => c.id === id);
      if (index === -1) {
        return void res.status(404).json({ error: 'Certification not found' });
      }
      userCerts.splice(index, 1);
      res.status(204).send();
    }
  } catch (error) {
    console.error('[Certifications] Delete error:', error);
    res.status(500).json({ error: 'Failed to delete certification' });
  }
});

/**
 * GET /certifications/renewal-reminders - Get upcoming renewal reminders
 */
router.get('/renewal-reminders', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;

    let certifications: any[] = [];
    try {
      certifications = await prisma.userBadge.findMany({
        where: {
          userId,
          expiresAt: { not: null },
        },
        orderBy: { expiresAt: 'asc' },
      });
    } catch {
      certifications = getUserCertifications(userId).filter((c: any) => c.expiresAt);
    }

    const now = new Date();
    const ninetyDays = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

    const upcoming = certifications
      .filter((cert: any) => {
        const expiry = new Date(cert.expiresAt || cert.expiryDate);
        return expiry > now && expiry <= ninetyDays;
      })
      .map((cert: any) => {
        const expiry = new Date(cert.expiresAt || cert.expiryDate);
        const daysUntil = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return {
          ...cert,
          daysUntilExpiry: daysUntil,
          urgency: daysUntil <= 14 ? 'high' : daysUntil <= 30 ? 'medium' : 'low',
        };
      });

    res.json({
      reminders: upcoming,
      count: upcoming.length,
    });
  } catch (error) {
    console.error('[Certifications] Renewal reminders error:', error);
    res.status(500).json({ error: 'Failed to fetch reminders' });
  }
});

/**
 * GET /certifications/verify/:credentialId - Verify a credential (mock)
 */
router.get('/verify/:credentialId', async (req: Request, res: Response) => {
  const { credentialId } = req.params;

  // Mock verification - in production would check with issuing authority
  const isValid = credentialId.length >= 6;

  res.json({
    credentialId,
    verified: isValid,
    verificationDate: new Date().toISOString(),
    status: isValid ? 'valid' : 'not-found',
    note: 'This is a demonstration. Real verification requires integration with issuing authorities.',
  });
});

/**
 * GET /certifications/cpd - Get CPD (Continuing Professional Development) tracking
 */
router.get('/cpd', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;

    // Mock CPD data - in production would track actual CPD activities
    const cpdRequirements = {
      annualPoints: 30,
      currentPoints: 12,
      periodStart: new Date(new Date().getFullYear(), 0, 1).toISOString(),
      periodEnd: new Date(new Date().getFullYear(), 11, 31).toISOString(),
    };

    const activities = [
      { id: 'cpd-1', type: 'Course', name: 'Leadership Workshop', points: 5, date: '2026-01-10', status: 'approved' },
      { id: 'cpd-2', type: 'Conference', name: 'Industry Summit', points: 4, date: '2025-11-15', status: 'approved' },
      { id: 'cpd-3', type: 'Self-Study', name: 'Online Module', points: 3, date: '2025-10-20', status: 'approved' },
    ];

    res.json({
      requirements: cpdRequirements,
      activities,
      progress: Math.round((cpdRequirements.currentPoints / cpdRequirements.annualPoints) * 100),
      pointsNeeded: cpdRequirements.annualPoints - cpdRequirements.currentPoints,
      suggestions: [
        { type: 'Webinar', name: 'First Nations Business Excellence', points: 2 },
        { type: 'Course', name: 'Digital Marketing Fundamentals', points: 5 },
        { type: 'Mentoring', name: 'Community Mentor Program', points: 3 },
      ],
    });
  } catch (error) {
    console.error('[Certifications] CPD error:', error);
    res.status(500).json({ error: 'Failed to fetch CPD data' });
  }
});

/**
 * GET /certifications/roi/:id - Get ROI info for a certification
 */
router.get('/roi/:id', async (req: Request, res: Response) => {
  const { id } = req.params;

  const cert = certificationCatalog.find(c => c.id === id);

  if (!cert) {
    return void res.status(404).json({ error: 'Certification not found' });
  }

  // Mock ROI data
  const roiData = {
    certification: {
      id: cert.id,
      name: cert.name,
    },
    investmentCosts: {
      tuition: { low: 2000, high: 8000 },
      materials: { low: 100, high: 500 },
      timeInMonths: cert.duration,
    },
    returns: {
      averageSalaryIncrease: cert.roi?.averageSalaryIncrease || '$5,000-$15,000',
      employmentRate: cert.roi?.employmentRate || '80%',
      timeToPayback: '6-18 months',
    },
    careerPaths: cert.careerPaths || [],
    testimonials: [
      { quote: 'This certification opened doors I didn\'t know existed.', author: 'Graduate, 2024' },
    ],
  };

  res.json(roiData);
});

/**
 * GET /certifications/pathway - Get certification pathway recommendation
 */
router.get('/pathway', authenticate, async (req: Request, res: Response) => {
  try {
    const { targetRole } = req.query;

    // Mock pathway recommendation
    const pathways: Record<string, any> = {
      'community-worker': {
        targetRole: 'Community Worker',
        steps: [
          { order: 1, name: 'Certificate III in Community Services', duration: '6 months', essential: true },
          { order: 2, name: 'First Aid Certificate', duration: '2 days', essential: true },
          { order: 3, name: 'Working With Children Check', duration: '2 weeks', essential: true },
          { order: 4, name: 'Certificate IV in Community Services', duration: '12 months', essential: false },
        ],
        totalDuration: '18-24 months',
        estimatedCost: '$5,000-$12,000',
      },
      'health-worker': {
        targetRole: 'Aboriginal Health Worker',
        steps: [
          { order: 1, name: 'Certificate III in Aboriginal Primary Health Care', duration: '12 months', essential: true },
          { order: 2, name: 'First Aid Certificate', duration: '2 days', essential: true },
          { order: 3, name: 'Working With Children Check', duration: '2 weeks', essential: true },
          { order: 4, name: 'Certificate IV in Aboriginal Primary Health Care', duration: '12 months', essential: false },
        ],
        totalDuration: '24-36 months',
        estimatedCost: '$8,000-$15,000',
      },
      'business-owner': {
        targetRole: 'Small Business Owner',
        steps: [
          { order: 1, name: 'Certificate III in Business', duration: '6 months', essential: true },
          { order: 2, name: 'Certificate IV in Small Business Management', duration: '6 months', essential: false },
          { order: 3, name: 'Supply Nation Registration', duration: '1 month', essential: false },
        ],
        totalDuration: '12-18 months',
        estimatedCost: '$3,000-$8,000',
      },
    };

    const roleKey = String(targetRole || 'community-worker').toLowerCase().replace(/\s+/g, '-');
    const pathway = pathways[roleKey] || pathways['community-worker'];

    res.json({
      pathway,
      fundingOptions: [
        { name: 'VET Student Loans', description: 'Government loan for diploma-level courses' },
        { name: 'ABSTUDY', description: 'Financial support for Aboriginal and Torres Strait Islander students' },
        { name: 'State funding', description: 'Subsidised training for eligible students' },
      ],
    });
  } catch (error) {
    console.error('[Certifications] Pathway error:', error);
    res.status(500).json({ error: 'Failed to generate pathway' });
  }
});

export default router;

