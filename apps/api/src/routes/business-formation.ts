// @ts-nocheck
/**
 * Business Formation Routes
 * Phase 3 Steps 201-225: Business Formation Studio
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma as prismaClient } from '../db';
const prisma = prismaClient as any;
import { authenticate } from '../middleware/auth';

const router = Router();

// =============================================================================
// Business Structure Types & Comparison
// =============================================================================

const businessStructures = [
  {
    id: 'sole-trader',
    name: 'Sole Trader',
    description: 'Simplest structure for one-person businesses',
    pros: [
      'Simple to set up and manage',
      'Low costs to establish',
      'Full control over business decisions',
      'Simple tax reporting via personal return',
    ],
    cons: [
      'Personally liable for all debts',
      'Cannot share ownership easily',
      'May pay more tax as income grows',
      'Less credibility with larger clients',
    ],
    costs: {
      setup: 'Free (ABN only)',
      annual: '$0 - $200',
    },
    requirements: ['ABN registration', 'Personal TFN'],
    suitableFor: ['Freelancers', 'Contractors', 'Small service businesses'],
  },
  {
    id: 'company',
    name: 'Company (Pty Ltd)',
    description: 'Separate legal entity with limited liability',
    pros: [
      'Limited liability protection',
      'Easier to raise capital and add shareholders',
      'Perceived as more credible',
      'Tax rate capped at 25-30%',
    ],
    cons: [
      'More complex to set up and run',
      'Higher ongoing compliance costs',
      'Directors have legal obligations',
      'Profits cannot be withdrawn freely',
    ],
    costs: {
      setup: '$538 (ASIC fee)',
      annual: '$294 (ASIC annual review)',
    },
    requirements: ['ABN registration', 'ACN registration', 'Director(s)', 'Registered address', 'Company constitution'],
    suitableFor: ['Growing businesses', 'Businesses with multiple owners', 'Those needing liability protection'],
  },
  {
    id: 'partnership',
    name: 'Partnership',
    description: 'Two or more people running a business together',
    pros: [
      'Shared workload and resources',
      'Combined skills and knowledge',
      'Simple to establish',
      'Profits split as agreed',
    ],
    cons: [
      'Partners liable for each other\'s actions',
      'Potential for disputes',
      'Harder to exit',
      'Limited life (ends if partner leaves)',
    ],
    costs: {
      setup: 'Free (ABN only)',
      annual: '$0 - $200',
    },
    requirements: ['ABN registration', 'Partnership agreement (recommended)'],
    suitableFor: ['Professional practices', 'Family businesses', 'Collaborative ventures'],
  },
  {
    id: 'trust',
    name: 'Trust (Discretionary/Family)',
    description: 'A trustee holds assets for beneficiaries',
    pros: [
      'Tax-effective income distribution',
      'Asset protection for beneficiaries',
      'Flexibility in distributing profits',
      'Estate planning advantages',
    ],
    cons: [
      'Complex to establish and maintain',
      'Trustee personally liable',
      'Cannot carry forward losses',
      'High compliance costs',
    ],
    costs: {
      setup: '$500 - $2,000 (trust deed)',
      annual: '$500 - $1,500 (compliance)',
    },
    requirements: ['Trust deed', 'Trustee', 'ABN registration'],
    suitableFor: ['Family businesses', 'Investment purposes', 'Those seeking asset protection'],
  },
];

// =============================================================================
// Industry Classifications (ANZSIC)
// =============================================================================

const industryCategories = [
  { code: 'A', name: 'Agriculture, Forestry and Fishing' },
  { code: 'C', name: 'Manufacturing' },
  { code: 'E', name: 'Construction' },
  { code: 'F', name: 'Wholesale Trade' },
  { code: 'G', name: 'Retail Trade' },
  { code: 'H', name: 'Accommodation and Food Services' },
  { code: 'I', name: 'Transport, Postal and Warehousing' },
  { code: 'J', name: 'Information Media and Telecommunications' },
  { code: 'K', name: 'Financial and Insurance Services' },
  { code: 'L', name: 'Rental, Hiring and Real Estate Services' },
  { code: 'M', name: 'Professional, Scientific and Technical Services' },
  { code: 'N', name: 'Administrative and Support Services' },
  { code: 'O', name: 'Public Administration and Safety' },
  { code: 'P', name: 'Education and Training' },
  { code: 'Q', name: 'Health Care and Social Assistance' },
  { code: 'R', name: 'Arts and Recreation Services' },
  { code: 'S', name: 'Other Services' },
];

// =============================================================================
// Startup Cost Templates by Industry
// =============================================================================

const startupCostTemplates: Record<string, { category: string; item: string; lowEstimate: number; highEstimate: number }[]> = {
  'consulting': [
    { category: 'Legal', item: 'Business registration', lowEstimate: 0, highEstimate: 600 },
    { category: 'Legal', item: 'Professional indemnity insurance', lowEstimate: 500, highEstimate: 2000 },
    { category: 'Equipment', item: 'Computer and software', lowEstimate: 1500, highEstimate: 4000 },
    { category: 'Marketing', item: 'Website and branding', lowEstimate: 500, highEstimate: 5000 },
    { category: 'Marketing', item: 'Business cards and materials', lowEstimate: 100, highEstimate: 500 },
    { category: 'Operations', item: 'Phone and internet (annual)', lowEstimate: 1200, highEstimate: 2400 },
    { category: 'Operations', item: 'Accounting software', lowEstimate: 300, highEstimate: 1000 },
  ],
  'retail': [
    { category: 'Premises', item: 'Lease bond (3 months rent)', lowEstimate: 3000, highEstimate: 15000 },
    { category: 'Premises', item: 'Fitout and signage', lowEstimate: 5000, highEstimate: 50000 },
    { category: 'Inventory', item: 'Initial stock', lowEstimate: 5000, highEstimate: 50000 },
    { category: 'Equipment', item: 'POS system', lowEstimate: 500, highEstimate: 3000 },
    { category: 'Legal', item: 'Business registration and permits', lowEstimate: 500, highEstimate: 2000 },
    { category: 'Insurance', item: 'Public liability', lowEstimate: 500, highEstimate: 2000 },
    { category: 'Marketing', item: 'Opening promotion', lowEstimate: 500, highEstimate: 5000 },
  ],
  'food-service': [
    { category: 'Premises', item: 'Lease and bond', lowEstimate: 10000, highEstimate: 50000 },
    { category: 'Equipment', item: 'Kitchen equipment', lowEstimate: 10000, highEstimate: 100000 },
    { category: 'Equipment', item: 'Furniture and fitout', lowEstimate: 5000, highEstimate: 50000 },
    { category: 'Legal', item: 'Licenses and permits', lowEstimate: 1000, highEstimate: 5000 },
    { category: 'Inventory', item: 'Initial stock', lowEstimate: 2000, highEstimate: 10000 },
    { category: 'Insurance', item: 'Business insurance package', lowEstimate: 2000, highEstimate: 5000 },
    { category: 'Operations', item: 'POS and ordering system', lowEstimate: 1000, highEstimate: 5000 },
  ],
  'trades': [
    { category: 'Equipment', item: 'Tools and equipment', lowEstimate: 5000, highEstimate: 30000 },
    { category: 'Vehicle', item: 'Work vehicle', lowEstimate: 10000, highEstimate: 50000 },
    { category: 'Legal', item: 'Trade licenses', lowEstimate: 500, highEstimate: 2000 },
    { category: 'Insurance', item: 'Public liability and tradesman', lowEstimate: 1500, highEstimate: 5000 },
    { category: 'Marketing', item: 'Vehicle signage and website', lowEstimate: 500, highEstimate: 3000 },
    { category: 'Operations', item: 'Job management software', lowEstimate: 300, highEstimate: 1500 },
  ],
  'online': [
    { category: 'Technology', item: 'Website/app development', lowEstimate: 2000, highEstimate: 50000 },
    { category: 'Technology', item: 'Hosting and domain', lowEstimate: 200, highEstimate: 2000 },
    { category: 'Legal', item: 'Business registration', lowEstimate: 0, highEstimate: 600 },
    { category: 'Marketing', item: 'Initial marketing spend', lowEstimate: 500, highEstimate: 10000 },
    { category: 'Operations', item: 'Software subscriptions', lowEstimate: 500, highEstimate: 3000 },
    { category: 'Legal', item: 'Privacy policy and T&Cs', lowEstimate: 200, highEstimate: 2000 },
  ],
};

// =============================================================================
// Schemas
// =============================================================================

const businessIdeaSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(10),
  targetMarket: z.string().optional(),
  uniqueValue: z.string().optional(),
  industry: z.string().optional(),
});

const startupCostSchema = z.object({
  businessType: z.enum(['consulting', 'retail', 'food-service', 'trades', 'online', 'other']),
  customItems: z.array(z.object({
    category: z.string(),
    item: z.string(),
    amount: z.number(),
  })).optional(),
});

// =============================================================================
// Routes
// =============================================================================

/**
 * GET /business-formation/structures - List all business structures
 */
router.get('/structures', async (_req: Request, res: Response) => {
  res.json({ structures: businessStructures });
});

/**
 * GET /business-formation/structures/compare - Compare structures
 */
router.get('/structures/compare', async (req: Request, res: Response) => {
  const { types } = req.query;
  
  let selectedTypes = ['sole-trader', 'company'];
  if (types) {
    selectedTypes = String(types).split(',');
  }

  const comparison = businessStructures
    .filter(s => selectedTypes.includes(s.id))
    .map(s => ({
      id: s.id,
      name: s.name,
      liability: s.id === 'sole-trader' || s.id === 'partnership' ? 'Unlimited' : 'Limited',
      setupCost: s.costs.setup,
      annualCost: s.costs.annual,
      taxTreatment: s.id === 'company' ? 'Company tax rate (25-30%)' : 'Personal income tax rates',
      complexity: s.id === 'sole-trader' ? 'Low' : s.id === 'trust' ? 'High' : 'Medium',
    }));

  res.json({ comparison });
});

/**
 * GET /business-formation/industries - Get industry categories
 */
router.get('/industries', async (_req: Request, res: Response) => {
  res.json({ industries: industryCategories });
});

/**
 * POST /business-formation/validate-idea - Validate business idea
 */
router.post('/validate-idea', authenticate, async (req: Request, res: Response) => {
  try {
    const parsed = businessIdeaSchema.parse(req.body);

    // Simple validation scoring
    const scores: { criterion: string; score: number; feedback: string }[] = [];

    // Name check
    if (parsed.name.length >= 3 && parsed.name.length <= 50) {
      scores.push({ criterion: 'Business Name', score: 100, feedback: 'Good length for a business name' });
    } else {
      scores.push({ criterion: 'Business Name', score: 60, feedback: 'Consider a more memorable name length' });
    }

    // Description clarity
    if (parsed.description.length >= 50) {
      scores.push({ criterion: 'Description Clarity', score: 90, feedback: 'Good detailed description' });
    } else {
      scores.push({ criterion: 'Description Clarity', score: 50, feedback: 'Add more detail about what your business does' });
    }

    // Target market
    if (parsed.targetMarket && parsed.targetMarket.length >= 10) {
      scores.push({ criterion: 'Target Market', score: 90, feedback: 'Clear target market defined' });
    } else {
      scores.push({ criterion: 'Target Market', score: 40, feedback: 'Define your target customers more specifically' });
    }

    // Unique value
    if (parsed.uniqueValue && parsed.uniqueValue.length >= 20) {
      scores.push({ criterion: 'Unique Value', score: 85, feedback: 'Good unique value proposition' });
    } else {
      scores.push({ criterion: 'Unique Value', score: 30, feedback: 'Explain what makes your business different' });
    }

    const overallScore = Math.round(scores.reduce((sum, s) => sum + s.score, 0) / scores.length);

    res.json({
      idea: parsed,
      validation: {
        overallScore,
        scores,
        recommendation: overallScore >= 70
          ? 'Your idea has a solid foundation. Consider proceeding to the next steps.'
          : 'Consider refining your concept before proceeding.',
        nextSteps: [
          'Research your target market',
          'Analyse competitors',
          'Create a basic financial projection',
          'Choose your business structure',
        ],
      },
    });
  } catch (error: any) {
    console.error('[BusinessFormation] Validate idea error:', error);
    res.status(400).json({ error: error?.message || 'Validation failed' });
  }
});

/**
 * POST /business-formation/startup-costs - Estimate startup costs
 */
router.post('/startup-costs', authenticate, async (req: Request, res: Response) => {
  try {
    const parsed = startupCostSchema.parse(req.body);

    const template = startupCostTemplates[parsed.businessType] || startupCostTemplates['consulting'];
    
    const items = template.map(item => ({
      ...item,
      yourEstimate: item.lowEstimate, // Default to low
    }));

    // Add any custom items
    const customItems = (parsed.customItems || []).map(item => ({
      category: item.category,
      item: item.item,
      lowEstimate: item.amount,
      highEstimate: item.amount,
      yourEstimate: item.amount,
    }));

    const allItems = [...items, ...customItems];

    const totals = {
      lowEstimate: allItems.reduce((sum, item) => sum + item.lowEstimate, 0),
      highEstimate: allItems.reduce((sum, item) => sum + item.highEstimate, 0),
      yourEstimate: allItems.reduce((sum, item) => sum + item.yourEstimate, 0),
    };

    // Group by category
    const byCategory = allItems.reduce((acc, item) => {
      if (!acc[item.category]) {
        acc[item.category] = { items: [], total: 0 };
      }
      acc[item.category].items.push(item);
      acc[item.category].total += item.yourEstimate;
      return acc;
    }, {} as Record<string, { items: typeof allItems; total: number }>);

    res.json({
      businessType: parsed.businessType,
      items: allItems,
      byCategory,
      totals,
      tips: [
        'Consider starting smaller and scaling up',
        'Look for second-hand equipment where appropriate',
        'Factor in 3-6 months of operating expenses',
        'Include a contingency of 10-20%',
      ],
    });
  } catch (error: any) {
    console.error('[BusinessFormation] Startup costs error:', error);
    res.status(400).json({ error: error?.message || 'Cost estimation failed' });
  }
});

/**
 * GET /business-formation/check-name - Check business name availability (mock)
 */
router.get('/check-name', async (req: Request, res: Response) => {
  const { name } = req.query;

  if (!name) {
    return void res.status(400).json({ error: 'name parameter is required' });
  }

  // Mock availability check
  const normalizedName = String(name).toLowerCase().replace(/\s+/g, '');
  const isAvailable = normalizedName.length > 3 && !['test', 'demo', 'example'].includes(normalizedName);

  res.json({
    name,
    isAvailable,
    similarNames: isAvailable ? [] : ['Similar Business Pty Ltd', 'Test Company Australia'],
    checkType: 'preliminary',
    note: 'This is a preliminary check. Official name searches should be done through ASIC.',
    links: {
      asicNameCheck: 'https://asic.gov.au/for-business/registering-a-business-name/before-you-register-a-business-name/check-a-business-name-is-available/',
      abnLookup: 'https://abr.business.gov.au/',
    },
  });
});

/**
 * GET /business-formation/registration-checklist - Get registration checklist
 */
router.get('/registration-checklist', async (req: Request, res: Response) => {
  const { structure = 'sole-trader' } = req.query;

  const baseChecklist = [
    { id: 'tfn', task: 'Obtain a Tax File Number (TFN)', required: true, url: 'https://www.ato.gov.au/individuals/tax-file-number/' },
    { id: 'abn', task: 'Register for an ABN', required: true, url: 'https://abr.business.gov.au/For-Business/Register-for-an-ABN' },
    { id: 'bn', task: 'Register a business name (if different from your own)', required: false, url: 'https://asic.gov.au/for-business/registering-a-business-name/' },
    { id: 'gst', task: 'Register for GST (if turnover > $75k)', required: false, url: 'https://www.ato.gov.au/business/gst/registering-for-gst/' },
    { id: 'bank', task: 'Open a business bank account', required: true, url: null },
    { id: 'accounting', task: 'Set up accounting/bookkeeping system', required: true, url: null },
    { id: 'insurance', task: 'Obtain business insurance', required: false, url: null },
  ];

  const companyChecklist = [
    { id: 'acn', task: 'Register for an ACN with ASIC', required: true, url: 'https://asic.gov.au/for-business/registering-a-company/' },
    { id: 'directors', task: 'Obtain Director ID for all directors', required: true, url: 'https://www.abrs.gov.au/director-identification-number' },
    { id: 'constitution', task: 'Prepare company constitution', required: true, url: null },
    { id: 'register', task: 'Set up company registers', required: true, url: null },
  ];

  const trustChecklist = [
    { id: 'deed', task: 'Prepare trust deed', required: true, url: null },
    { id: 'trustee', task: 'Appoint trustee (person or company)', required: true, url: null },
    { id: 'tfn-trust', task: 'Obtain TFN for the trust', required: true, url: null },
  ];

  let checklist = [...baseChecklist];

  if (structure === 'company') {
    checklist = [...companyChecklist, ...baseChecklist];
  } else if (structure === 'trust') {
    checklist = [...trustChecklist, ...baseChecklist];
  }

  res.json({
    structure,
    checklist,
    estimatedTime: structure === 'sole-trader' ? '1-2 days' : structure === 'company' ? '1-2 weeks' : '2-4 weeks',
    tips: [
      'Have all your personal documents ready (ID, TFN)',
      'Consider consulting an accountant for tax advice',
      'Keep copies of all registration documents',
    ],
  });
});

/**
 * GET /business-formation/indigenous-support - Indigenous business support resources
 */
router.get('/indigenous-support', async (_req: Request, res: Response) => {
  res.json({
    programs: [
      {
        id: 'supply-nation',
        name: 'Supply Nation',
        description: 'Australia\'s leading directory of verified Indigenous businesses',
        benefits: ['Access to corporate procurement opportunities', 'Business verification', 'Networking events'],
        url: 'https://supplynation.org.au/',
        eligibility: 'At least 50% Indigenous owned',
      },
      {
        id: 'iba',
        name: 'Indigenous Business Australia (IBA)',
        description: 'Business support, loans, and investment for Indigenous Australians',
        benefits: ['Business loans', 'Business support programs', 'Investment opportunities'],
        url: 'https://www.iba.gov.au/',
        eligibility: 'Aboriginal or Torres Strait Islander',
      },
      {
        id: 'mbit',
        name: 'Many Rivers Business Loans',
        description: 'Microfinance and business support for Indigenous entrepreneurs',
        benefits: ['Small business loans', 'Mentoring', 'Business planning support'],
        url: 'https://manyrivers.org.au/',
        eligibility: 'Aboriginal or Torres Strait Islander business owners',
      },
      {
        id: 'niaa',
        name: 'NIAA Indigenous Entrepreneurs Fund',
        description: 'Government funding for Indigenous business growth',
        benefits: ['Grants', 'Business development support'],
        url: 'https://www.niaa.gov.au/indigenous-affairs/economic-development',
        eligibility: 'Indigenous-owned businesses',
      },
    ],
    localChambers: [
      { state: 'NSW', name: 'NSW Indigenous Chamber of Commerce', url: 'https://nswicc.com.au/' },
      { state: 'VIC', name: 'Kinaway Chamber of Commerce', url: 'https://kinaway.com.au/' },
      { state: 'QLD', name: 'Black Business Finder', url: 'https://www.blackbusinessfinder.com.au/' },
      { state: 'WA', name: 'Boya Equipment', url: null },
    ],
  });
});

/**
 * POST /business-formation/financial-projection - Simple financial projection
 */
router.post('/financial-projection', authenticate, async (req: Request, res: Response) => {
  try {
    const {
      monthlyRevenue = 0,
      monthlyExpenses = 0,
      startupCosts = 0,
      growthRate = 5, // % per month
      months = 12,
    } = req.body || {};

    const projection = [];
    let cumulativeProfit = -startupCosts;
    let revenue = monthlyRevenue;
    let breakEvenMonth: number | null = null;

    for (let month = 1; month <= months; month++) {
      const profit = revenue - monthlyExpenses;
      cumulativeProfit += profit;

      projection.push({
        month,
        revenue: Math.round(revenue),
        expenses: monthlyExpenses,
        profit: Math.round(profit),
        cumulativeProfit: Math.round(cumulativeProfit),
      });

      if (breakEvenMonth === null && cumulativeProfit >= 0) {
        breakEvenMonth = month;
      }

      // Apply growth rate
      revenue = revenue * (1 + growthRate / 100);
    }

    const summary = {
      totalRevenue: projection.reduce((sum, p) => sum + p.revenue, 0),
      totalExpenses: projection.reduce((sum, p) => sum + p.expenses, 0),
      totalProfit: projection[projection.length - 1].cumulativeProfit,
      breakEvenMonth,
      assumptions: {
        startupCosts,
        monthlyGrowthRate: `${growthRate}%`,
        projectionPeriod: `${months} months`,
      },
    };

    res.json({ projection, summary });
  } catch (error) {
    console.error('[BusinessFormation] Financial projection error:', error);
    res.status(500).json({ error: 'Failed to generate projection' });
  }
});

/**
 * GET /business-formation/grants - Indigenous business grants
 */
router.get('/grants', async (_req: Request, res: Response) => {
  res.json({
    grants: [
      {
        id: 'indigenous-entrepreneurs',
        name: 'Indigenous Entrepreneurs Fund',
        provider: 'NIAA',
        amount: 'Up to $500,000',
        description: 'Funding for Indigenous businesses to grow and create jobs',
        url: 'https://www.niaa.gov.au/indigenous-affairs/economic-development',
      },
      {
        id: 'indigenous-skills',
        name: 'Indigenous Skills and Jobs Programme',
        provider: 'NIAA',
        amount: 'Varies',
        description: 'Support for Indigenous employment and enterprise development',
        url: 'https://www.niaa.gov.au/',
      },
      {
        id: 'ausindustry',
        name: 'Entrepreneurs\' Programme',
        provider: 'AusIndustry',
        amount: 'Matched funding up to $20,000',
        description: 'Business improvement advice and implementation support',
        url: 'https://business.gov.au/grants-and-programs/entrepreneurs-programme',
      },
    ],
    note: 'Grant availability and criteria may change. Always check official sources for current information.',
  });
});

export default router;

