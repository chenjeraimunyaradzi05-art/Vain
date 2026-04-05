// @ts-nocheck
/**
 * User Onboarding Flow
 * 
 * Features:
 * - Multi-step guided onboarding wizard
 * - Role-specific onboarding paths
 * - Progress tracking and persistence
 * - Skip and re-engagement options
 * - Personalized welcome experience
 */

import { prisma } from './database';

// ============================================================================
// ONBOARDING CONFIGURATION
// ============================================================================

/**
 * User roles with their onboarding flows
 */
export const USER_ROLES = {
  jobseeker: {
    id: 'jobseeker',
    name: 'Job Seeker',
    description: 'Looking for employment opportunities',
    icon: '🎯',
    steps: 'JOBSEEKER_STEPS'
  },
  employer: {
    id: 'employer',
    name: 'Employer',
    description: 'Hiring talent for your organisation',
    icon: '🏢',
    steps: 'EMPLOYER_STEPS'
  },
  mentor: {
    id: 'mentor',
    name: 'Mentor',
    description: 'Guiding and supporting others in their career',
    icon: '🌟',
    steps: 'MENTOR_STEPS'
  },
  tafe: {
    id: 'tafe',
    name: 'Training Provider',
    description: 'TAFE or registered training organisation',
    icon: '📚',
    steps: 'TAFE_STEPS'
  },
  community: {
    id: 'community',
    name: 'Community Partner',
    description: 'Aboriginal community organisation or land council',
    icon: '🤝',
    steps: 'COMMUNITY_STEPS'
  }
};

// ============================================================================
// ONBOARDING STEPS BY ROLE
// ============================================================================

/**
 * Job seeker onboarding flow
 */
export const JOBSEEKER_STEPS = [
  {
    id: 'welcome',
    order: 1,
    title: 'Welcome to Ngurra Pathways',
    subtitle: 'Your journey to meaningful employment starts here',
    type: 'info',
    content: {
      message: "G'day! We're excited to help you on your career journey. This platform was built by and for our mob, connecting you with employers who value what you bring.",
      features: [
        'Culturally safe job matching',
        'Skills verification and badging',
        'Mentorship from community Elders and industry experts',
        'Training pathways to build your career'
      ],
      culturalNote: 'We acknowledge the Traditional Custodians of the lands on which we work and live.'
    },
    isRequired: true
  },
  {
    id: 'profile-basics',
    order: 2,
    title: 'Tell us about yourself',
    subtitle: 'Help us match you with the right opportunities',
    type: 'form',
    fields: [
      { name: 'displayName', label: 'Preferred name', type: 'text', required: true },
      { name: 'location', label: 'Where are you based?', type: 'location', required: true },
      { name: 'relocate', label: 'Open to relocation?', type: 'boolean', required: false }
    ],
    isRequired: true
  },
  {
    id: 'cultural-identity',
    order: 3,
    title: 'Cultural Identity (Optional)',
    subtitle: 'Share as much or as little as you feel comfortable',
    type: 'form',
    isOptional: true,
    fields: [
      { 
        name: 'indigenousIdentity', 
        label: 'Do you identify as Aboriginal and/or Torres Strait Islander?',
        type: 'select',
        options: [
          { value: 'aboriginal', label: 'Aboriginal' },
          { value: 'torres_strait', label: 'Torres Strait Islander' },
          { value: 'both', label: 'Both Aboriginal and Torres Strait Islander' },
          { value: 'prefer_not', label: 'Prefer not to say' }
        ],
        required: false
      },
      { name: 'country', label: 'Country/Nation', type: 'text', placeholder: 'e.g., Warlpiri, Yolngu', required: false },
      { name: 'language', label: 'Language group', type: 'text', required: false }
    ],
    privacyNote: 'This information helps us connect you with culturally appropriate opportunities. It will never be shared without your consent.'
  },
  {
    id: 'work-preferences',
    order: 4,
    title: 'Work Preferences',
    subtitle: "What kind of work are you looking for?",
    type: 'form',
    fields: [
      {
        name: 'employmentTypes',
        label: 'Employment type',
        type: 'multiselect',
        options: [
          { value: 'full_time', label: 'Full-time' },
          { value: 'part_time', label: 'Part-time' },
          { value: 'casual', label: 'Casual' },
          { value: 'contract', label: 'Contract' },
          { value: 'apprenticeship', label: 'Apprenticeship/Traineeship' }
        ],
        required: true
      },
      {
        name: 'workArrangement',
        label: 'Work arrangement',
        type: 'multiselect',
        options: [
          { value: 'on_site', label: 'On-site' },
          { value: 'remote', label: 'Remote' },
          { value: 'hybrid', label: 'Hybrid' },
          { value: 'fifo', label: 'FIFO/DIDO' }
        ],
        required: true
      },
      {
        name: 'industries',
        label: 'Industries of interest',
        type: 'multiselect',
        options: [
          { value: 'mining', label: 'Mining & Resources' },
          { value: 'construction', label: 'Construction' },
          { value: 'health', label: 'Health & Community Services' },
          { value: 'education', label: 'Education' },
          { value: 'government', label: 'Government' },
          { value: 'tourism', label: 'Tourism & Hospitality' },
          { value: 'arts', label: 'Arts & Culture' },
          { value: 'agriculture', label: 'Agriculture' },
          { value: 'retail', label: 'Retail' },
          { value: 'technology', label: 'Technology' },
          { value: 'trades', label: 'Trades' }
        ],
        required: false
      }
    ],
    isRequired: true
  },
  {
    id: 'skills-experience',
    order: 5,
    title: 'Skills & Experience',
    subtitle: 'Highlight what you bring to the table',
    type: 'form',
    fields: [
      {
        name: 'experienceLevel',
        label: 'Experience level',
        type: 'select',
        options: [
          { value: 'entry', label: 'Entry level (0-2 years)' },
          { value: 'mid', label: 'Mid level (2-5 years)' },
          { value: 'senior', label: 'Senior (5-10 years)' },
          { value: 'expert', label: 'Expert (10+ years)' }
        ],
        required: true
      },
      {
        name: 'skills',
        label: 'Key skills',
        type: 'tags',
        placeholder: 'Add your skills',
        suggestions: ['Customer Service', 'Driving Licence', 'Forklift', 'First Aid', 'Communication', 'Teamwork'],
        required: false
      },
      {
        name: 'certifications',
        label: 'Certifications & Licences',
        type: 'tags',
        placeholder: 'Add certifications',
        suggestions: ['White Card', 'RSA', 'WWC Check', 'Forklift Licence', 'HR Licence'],
        required: false
      }
    ],
    isRequired: true
  },
  {
    id: 'mentorship-interest',
    order: 6,
    title: 'Mentorship',
    subtitle: 'Would you like guidance on your career journey?',
    type: 'choice',
    options: [
      {
        value: 'yes_mentor',
        label: 'Yes, I want a mentor',
        description: 'Get matched with industry professionals and community Elders',
        icon: '🌟'
      },
      {
        value: 'maybe_later',
        label: 'Maybe later',
        description: "I'll explore this option later",
        icon: '⏰'
      },
      {
        value: 'be_mentor',
        label: 'I want to mentor others',
        description: 'Share your experience with those coming up',
        icon: '🤝'
      }
    ],
    isRequired: true
  },
  {
    id: 'notifications',
    order: 7,
    title: 'Stay Connected',
    subtitle: 'How would you like to hear from us?',
    type: 'form',
    fields: [
      { name: 'emailNotifications', label: 'Email job alerts', type: 'boolean', default: true },
      { name: 'smsNotifications', label: 'SMS for urgent matches', type: 'boolean', default: false },
      { name: 'weeklyDigest', label: 'Weekly opportunity digest', type: 'boolean', default: true }
    ],
    isRequired: false
  },
  {
    id: 'complete',
    order: 8,
    title: "You're all set!",
    subtitle: 'Your profile is ready',
    type: 'celebration',
    content: {
      message: "Deadly! You're ready to start your journey. Here's what you can do next:",
      nextSteps: [
        { action: 'browse_jobs', label: 'Browse Jobs', icon: '🔍' },
        { action: 'complete_profile', label: 'Add more to your profile', icon: '📝' },
        { action: 'find_mentor', label: 'Find a mentor', icon: '🌟' },
        { action: 'explore_training', label: 'Explore training', icon: '📚' }
      ]
    }
  }
];

/**
 * Employer onboarding flow
 */
export const EMPLOYER_STEPS = [
  {
    id: 'welcome',
    order: 1,
    title: 'Welcome to Ngurra Pathways',
    subtitle: 'Connect with talented First Nations candidates',
    type: 'info',
    content: {
      message: "Thank you for joining Ngurra Pathways. We'll help you connect with skilled Aboriginal and Torres Strait Islander candidates who can bring unique perspectives and talents to your organisation.",
      benefits: [
        'Access a diverse talent pool',
        'Demonstrate your commitment to reconciliation',
        'Build genuine relationships with Indigenous communities',
        'Support Indigenous employment outcomes'
      ]
    },
    isRequired: true
  },
  {
    id: 'company-basics',
    order: 2,
    title: 'Company Information',
    subtitle: 'Tell candidates about your organisation',
    type: 'form',
    fields: [
      { name: 'companyName', label: 'Company name', type: 'text', required: true },
      { name: 'abn', label: 'ABN', type: 'text', required: true },
      { name: 'industry', label: 'Industry', type: 'select', required: true },
      { name: 'companySize', label: 'Company size', type: 'select', options: [
        { value: '1-10', label: '1-10 employees' },
        { value: '11-50', label: '11-50 employees' },
        { value: '51-200', label: '51-200 employees' },
        { value: '201-1000', label: '201-1000 employees' },
        { value: '1000+', label: '1000+ employees' }
      ], required: true },
      { name: 'locations', label: 'Office locations', type: 'multiLocation', required: true }
    ],
    isRequired: true
  },
  {
    id: 'cultural-commitment',
    order: 3,
    title: 'Cultural Commitment',
    subtitle: 'Share your commitment to Indigenous employment',
    type: 'form',
    fields: [
      {
        name: 'rapStatus',
        label: 'Reconciliation Action Plan (RAP) status',
        type: 'select',
        options: [
          { value: 'reflect', label: 'Reflect RAP' },
          { value: 'innovate', label: 'Innovate RAP' },
          { value: 'stretch', label: 'Stretch RAP' },
          { value: 'elevate', label: 'Elevate RAP' },
          { value: 'developing', label: 'Currently developing' },
          { value: 'considering', label: 'Considering' },
          { value: 'none', label: 'No RAP' }
        ],
        required: true
      },
      { name: 'indigenousOwned', label: 'Indigenous-owned business (Supply Nation certified)?', type: 'boolean', required: false },
      { name: 'culturalTraining', label: 'Do you provide cultural awareness training?', type: 'boolean', required: false },
      { name: 'indigenousMentors', label: 'Indigenous mentors available?', type: 'boolean', required: false }
    ],
    helpText: 'This information helps candidates find culturally supportive workplaces',
    isRequired: true
  },
  {
    id: 'hiring-needs',
    order: 4,
    title: 'Hiring Needs',
    subtitle: 'What positions are you looking to fill?',
    type: 'form',
    fields: [
      {
        name: 'hiringVolume',
        label: 'Expected hires in next 12 months',
        type: 'select',
        options: [
          { value: '1-5', label: '1-5 positions' },
          { value: '6-20', label: '6-20 positions' },
          { value: '21-50', label: '21-50 positions' },
          { value: '50+', label: '50+ positions' }
        ],
        required: true
      },
      {
        name: 'urgentRoles',
        label: 'Immediate hiring needs',
        type: 'tags',
        placeholder: 'e.g., Site Manager, Admin Officer',
        required: false
      },
      {
        name: 'entryLevel',
        label: 'Open to entry-level/trainee candidates?',
        type: 'boolean',
        required: false
      },
      {
        name: 'apprenticeships',
        label: 'Offer apprenticeships or traineeships?',
        type: 'boolean',
        required: false
      }
    ],
    isRequired: true
  },
  {
    id: 'verification',
    order: 5,
    title: 'Verification',
    subtitle: 'Build trust with candidates',
    type: 'info',
    content: {
      message: "Verified employers get a badge showing candidates you're a trusted organisation. We'll verify your ABN and may request additional documentation.",
      levels: [
        { name: 'Basic', description: 'ABN verified' },
        { name: 'Standard', description: 'ABN + business registration verified' },
        { name: 'Premium', description: 'Full verification including references' },
        { name: 'RAP Committed', description: 'Verified RAP implementation' },
        { name: 'Indigenous Owned', description: 'Supply Nation or similar certification' }
      ]
    },
    action: {
      label: 'Start verification',
      target: '/employer/verification'
    },
    isRequired: false
  },
  {
    id: 'complete',
    order: 6,
    title: 'Welcome aboard!',
    subtitle: "You're ready to start hiring",
    type: 'celebration',
    content: {
      message: "Your employer account is set up. Here's what you can do next:",
      nextSteps: [
        { action: 'post_job', label: 'Post your first job', icon: '📋' },
        { action: 'browse_candidates', label: 'Browse candidates', icon: '👥' },
        { action: 'complete_verification', label: 'Complete verification', icon: '✓' },
        { action: 'company_profile', label: 'Enhance company profile', icon: '🏢' }
      ]
    }
  }
];

/**
 * Mentor onboarding flow
 */
export const MENTOR_STEPS = [
  {
    id: 'welcome',
    order: 1,
    title: 'Become a Mentor',
    subtitle: 'Guide the next generation on their career journey',
    type: 'info',
    content: {
      message: "Thank you for offering to mentor. Your experience and guidance can make a real difference in someone's career journey. Whether you're an industry professional or a community Elder, your wisdom is valuable.",
      impact: [
        'Share your career experience and insights',
        'Help mentees navigate workplace challenges',
        'Build lasting professional relationships',
        'Give back to the community'
      ]
    },
    isRequired: true
  },
  {
    id: 'mentor-type',
    order: 2,
    title: 'Your Mentoring Style',
    subtitle: 'What type of mentoring can you offer?',
    type: 'choice',
    options: [
      {
        value: 'industry',
        label: 'Industry Mentor',
        description: 'Share professional expertise and career guidance',
        icon: '💼'
      },
      {
        value: 'cultural',
        label: 'Cultural Mentor/Elder',
        description: 'Provide cultural guidance and support',
        icon: '🌟'
      },
      {
        value: 'career',
        label: 'Career Coach',
        description: 'Help with job searching and professional development',
        icon: '📈'
      },
      {
        value: 'peer',
        label: 'Peer Mentor',
        description: 'Support others at similar career stages',
        icon: '🤝'
      }
    ],
    isRequired: true
  },
  {
    id: 'expertise',
    order: 3,
    title: 'Your Expertise',
    subtitle: 'What areas can you mentor in?',
    type: 'form',
    fields: [
      {
        name: 'industries',
        label: 'Industry experience',
        type: 'multiselect',
        options: [
          { value: 'mining', label: 'Mining & Resources' },
          { value: 'construction', label: 'Construction' },
          { value: 'health', label: 'Health & Community Services' },
          { value: 'education', label: 'Education' },
          { value: 'government', label: 'Government' },
          { value: 'arts', label: 'Arts & Culture' },
          { value: 'technology', label: 'Technology' },
          { value: 'trades', label: 'Trades' },
          { value: 'business', label: 'Business & Entrepreneurship' }
        ],
        required: true
      },
      {
        name: 'skills',
        label: 'Skills you can teach',
        type: 'tags',
        placeholder: 'e.g., Resume writing, Interview skills, Networking',
        required: false
      },
      {
        name: 'yearsExperience',
        label: 'Years of professional experience',
        type: 'number',
        required: true
      }
    ],
    isRequired: true
  },
  {
    id: 'availability',
    order: 4,
    title: 'Availability',
    subtitle: 'How much time can you offer?',
    type: 'form',
    fields: [
      {
        name: 'hoursPerMonth',
        label: 'Hours available per month',
        type: 'select',
        options: [
          { value: '1-2', label: '1-2 hours' },
          { value: '3-5', label: '3-5 hours' },
          { value: '6-10', label: '6-10 hours' },
          { value: '10+', label: '10+ hours' }
        ],
        required: true
      },
      {
        name: 'meetingPreference',
        label: 'Meeting preference',
        type: 'multiselect',
        options: [
          { value: 'video', label: 'Video call' },
          { value: 'phone', label: 'Phone call' },
          { value: 'in_person', label: 'In person' },
          { value: 'messaging', label: 'Messaging' }
        ],
        required: true
      },
      {
        name: 'timezone',
        label: 'Timezone',
        type: 'timezone',
        required: true
      }
    ],
    isRequired: true
  },
  {
    id: 'wwc-check',
    order: 5,
    title: 'Working with Children Check',
    subtitle: 'Safety is our priority',
    type: 'form',
    fields: [
      {
        name: 'hasWWC',
        label: 'Do you have a current Working with Children Check?',
        type: 'boolean',
        required: true
      },
      {
        name: 'wwcNumber',
        label: 'WWC Check number',
        type: 'text',
        required: false,
        conditional: { field: 'hasWWC', value: true }
      },
      {
        name: 'wwcState',
        label: 'State/Territory issued',
        type: 'select',
        options: [
          { value: 'NSW', label: 'New South Wales' },
          { value: 'VIC', label: 'Victoria' },
          { value: 'QLD', label: 'Queensland' },
          { value: 'WA', label: 'Western Australia' },
          { value: 'SA', label: 'South Australia' },
          { value: 'TAS', label: 'Tasmania' },
          { value: 'NT', label: 'Northern Territory' },
          { value: 'ACT', label: 'Australian Capital Territory' }
        ],
        required: false,
        conditional: { field: 'hasWWC', value: true }
      }
    ],
    helpText: 'A current WWC check is required to mentor anyone under 18.',
    isRequired: true
  },
  {
    id: 'complete',
    order: 6,
    title: "You're a Mentor!",
    subtitle: 'Thank you for giving back',
    type: 'celebration',
    content: {
      message: "You're now registered as a mentor. Mentees will be able to find and connect with you.",
      nextSteps: [
        { action: 'complete_profile', label: 'Complete mentor profile', icon: '📝' },
        { action: 'set_schedule', label: 'Set your availability', icon: '📅' },
        { action: 'browse_mentees', label: 'Browse mentee requests', icon: '👥' }
      ]
    }
  }
];

/**
 * TAFE/Training Provider onboarding flow
 */
export const TAFE_STEPS = [
  {
    id: 'welcome',
    order: 1,
    title: 'Welcome Training Provider',
    subtitle: 'Connect students with career opportunities',
    type: 'info',
    content: {
      message: 'Partner with Ngurra Pathways to connect your Indigenous students with employers who value their skills and qualifications.',
      benefits: [
        'Showcase your courses to job seekers',
        'Track student employment outcomes',
        'Connect students with mentors',
        'Partner with employers for traineeships'
      ]
    },
    isRequired: true
  },
  {
    id: 'organisation-details',
    order: 2,
    title: 'Organisation Details',
    subtitle: 'Tell us about your RTO',
    type: 'form',
    fields: [
      { name: 'organisationName', label: 'Organisation name', type: 'text', required: true },
      { name: 'rtoCode', label: 'RTO Code', type: 'text', required: true },
      { name: 'locations', label: 'Campus locations', type: 'multiLocation', required: true },
      { name: 'indigenousFocused', label: 'Indigenous-focused programs?', type: 'boolean', required: false }
    ],
    isRequired: true
  },
  {
    id: 'programs',
    order: 3,
    title: 'Training Programs',
    subtitle: 'What qualifications do you offer?',
    type: 'form',
    fields: [
      {
        name: 'qualificationLevels',
        label: 'Qualification levels offered',
        type: 'multiselect',
        options: [
          { value: 'cert1', label: 'Certificate I' },
          { value: 'cert2', label: 'Certificate II' },
          { value: 'cert3', label: 'Certificate III' },
          { value: 'cert4', label: 'Certificate IV' },
          { value: 'diploma', label: 'Diploma' },
          { value: 'advDiploma', label: 'Advanced Diploma' }
        ],
        required: true
      },
      {
        name: 'industries',
        label: 'Industry areas',
        type: 'multiselect',
        options: [
          { value: 'construction', label: 'Building & Construction' },
          { value: 'health', label: 'Health & Community Services' },
          { value: 'hospitality', label: 'Hospitality & Tourism' },
          { value: 'business', label: 'Business & Administration' },
          { value: 'it', label: 'Information Technology' },
          { value: 'automotive', label: 'Automotive' },
          { value: 'hairdressing', label: 'Hairdressing & Beauty' },
          { value: 'childcare', label: 'Early Childhood' }
        ],
        required: true
      }
    ],
    isRequired: true
  },
  {
    id: 'complete',
    order: 4,
    title: 'Welcome Partner!',
    subtitle: "You're connected to Ngurra Pathways",
    type: 'celebration',
    content: {
      nextSteps: [
        { action: 'add_courses', label: 'Add your courses', icon: '📚' },
        { action: 'connect_employers', label: 'Connect with employers', icon: '🏢' },
        { action: 'invite_students', label: 'Invite students', icon: '🎓' }
      ]
    }
  }
];

/**
 * Community partner onboarding
 */
export const COMMUNITY_STEPS = [
  {
    id: 'welcome',
    order: 1,
    title: 'Community Partnership',
    subtitle: 'Connecting community with opportunity',
    type: 'info',
    content: {
      message: 'Partner with Ngurra Pathways to support employment outcomes for your community members.',
      benefits: [
        'Refer community members to opportunities',
        'Track employment outcomes',
        'Connect with culturally committed employers',
        'Access to training pathways'
      ]
    },
    isRequired: true
  },
  {
    id: 'organisation',
    order: 2,
    title: 'Organisation Details',
    type: 'form',
    fields: [
      { name: 'organisationName', label: 'Organisation name', type: 'text', required: true },
      { name: 'type', label: 'Organisation type', type: 'select', options: [
        { value: 'land_council', label: 'Land Council' },
        { value: 'community_org', label: 'Community Organisation' },
        { value: 'health_service', label: 'Aboriginal Health Service' },
        { value: 'cdep', label: 'CDEP/CDP Provider' },
        { value: 'housing', label: 'Housing Organisation' },
        { value: 'other', label: 'Other' }
      ], required: true },
      { name: 'region', label: 'Region/Country', type: 'text', required: true },
      { name: 'primaryContact', label: 'Primary contact name', type: 'text', required: true }
    ],
    isRequired: true
  },
  {
    id: 'complete',
    order: 3,
    title: 'Welcome Partner!',
    type: 'celebration',
    content: {
      nextSteps: [
        { action: 'refer_members', label: 'Refer community members', icon: '👥' },
        { action: 'view_opportunities', label: 'View opportunities', icon: '🔍' },
        { action: 'connect_employers', label: 'Connect with employers', icon: '🏢' }
      ]
    }
  }
];

// ============================================================================
// ONBOARDING SERVICE
// ============================================================================

/**
 * Get onboarding flow for user role
 */
export function getOnboardingFlow(role) {
  const flows = {
    jobseeker: JOBSEEKER_STEPS,
    employer: EMPLOYER_STEPS,
    mentor: MENTOR_STEPS,
    tafe: TAFE_STEPS,
    community: COMMUNITY_STEPS
  };

  return flows[role] || JOBSEEKER_STEPS;
}

/**
 * Start onboarding for a user
 */
export async function startOnboarding(userId, role) {
  const flow = getOnboardingFlow(role);
  const firstStep = flow[0];

  // Check for existing onboarding
  const existing = await prisma.onboardingProgress.findUnique({
    where: { userId }
  });

  if (existing) {
    return {
      onboardingId: existing.id,
      currentStep: existing.currentStepId,
      progress: existing.progress,
      isResuming: true,
      steps: flow
    };
  }

  // Create new onboarding record
  const onboarding = await prisma.onboardingProgress.create({
    data: {
      userId,
      role,
      currentStepId: firstStep.id,
      completedSteps: [],
      progress: 0,
      data: {},
      startedAt: new Date()
    }
  });

  return {
    onboardingId: onboarding.id,
    currentStep: firstStep.id,
    progress: 0,
    isResuming: false,
    steps: flow
  };
}

/**
 * Get current onboarding status
 */
export async function getOnboardingStatus(userId) {
  const onboarding = await prisma.onboardingProgress.findUnique({
    where: { userId }
  });

  if (!onboarding) {
    return { hasOnboarding: false };
  }

  const flow = getOnboardingFlow(onboarding.role);
  const currentStepIndex = flow.findIndex(s => s.id === onboarding.currentStepId);
  const currentStep = flow[currentStepIndex];

  return {
    hasOnboarding: true,
    isComplete: onboarding.completedAt !== null,
    currentStep: currentStep,
    currentStepIndex,
    totalSteps: flow.length,
    progress: onboarding.progress,
    role: onboarding.role,
    completedSteps: onboarding.completedSteps,
    skippedSteps: onboarding.skippedSteps || [],
    data: onboarding.data
  };
}

/**
 * Complete a step and move to next
 */
export async function completeStep(userId, stepId, stepData = {}) {
  const onboarding = await prisma.onboardingProgress.findUnique({
    where: { userId }
  });

  if (!onboarding) {
    throw new Error('No onboarding found for user');
  }

  const flow = getOnboardingFlow(onboarding.role);
  const currentStepIndex = flow.findIndex(s => s.id === stepId);
  const nextStep = flow[currentStepIndex + 1];

  const completedSteps = [...(onboarding.completedSteps || []), stepId];
  const progress = Math.round((completedSteps.length / flow.length) * 100);
  const data = { ...onboarding.data, [stepId]: stepData };

  const isComplete = !nextStep;

  await prisma.onboardingProgress.update({
    where: { userId },
    data: {
      currentStepId: nextStep?.id || stepId,
      completedSteps,
      progress,
      data,
      ...(isComplete && { completedAt: new Date() })
    }
  });

  // Apply step data to user profile
  await applyStepData(userId, stepId, stepData, onboarding.role);

  return {
    stepCompleted: stepId,
    nextStep: nextStep || null,
    progress,
    isComplete
  };
}

/**
 * Skip an optional step
 */
export async function skipStep(userId, stepId) {
  const onboarding = await prisma.onboardingProgress.findUnique({
    where: { userId }
  });

  if (!onboarding) {
    throw new Error('No onboarding found for user');
  }

  const flow = getOnboardingFlow(onboarding.role);
  const step = flow.find(s => s.id === stepId);

  if (step?.isRequired) {
    throw new Error('Cannot skip required step');
  }

  const currentStepIndex = flow.findIndex(s => s.id === stepId);
  const nextStep = flow[currentStepIndex + 1];

  const skippedSteps = [...(onboarding.skippedSteps || []), stepId];

  await prisma.onboardingProgress.update({
    where: { userId },
    data: {
      currentStepId: nextStep?.id || stepId,
      skippedSteps
    }
  });

  return {
    stepSkipped: stepId,
    nextStep: nextStep || null
  };
}

/**
 * Skip entire onboarding
 */
export async function skipOnboarding(userId) {
  await prisma.onboardingProgress.update({
    where: { userId },
    data: {
      skippedAt: new Date(),
      progress: 0
    }
  });

  return { skipped: true };
}

/**
 * Resume incomplete onboarding (for re-engagement)
 */
export async function resumeOnboarding(userId) {
  const onboarding = await prisma.onboardingProgress.findUnique({
    where: { userId }
  });

  if (!onboarding) {
    return { canResume: false };
  }

  if (onboarding.completedAt) {
    return { canResume: false, reason: 'Already completed' };
  }

  const flow = getOnboardingFlow(onboarding.role);
  const currentStep = flow.find(s => s.id === onboarding.currentStepId);

  return {
    canResume: true,
    currentStep,
    progress: onboarding.progress,
    role: onboarding.role
  };
}

/**
 * Apply step data to user profile
 */
async function applyStepData(userId, stepId, data, role) {
  // Map step data to profile fields based on step type
  const mappings = {
    'profile-basics': async () => {
      await prisma.user.update({
        where: { id: userId },
        data: {
          displayName: data.displayName,
          location: data.location,
          openToRelocate: data.relocate
        }
      });
    },
    'cultural-identity': async () => {
      await prisma.userProfile.upsert({
        where: { userId },
        create: {
          userId,
          indigenousIdentity: data.indigenousIdentity,
          country: data.country,
          languageGroup: data.language
        },
        update: {
          indigenousIdentity: data.indigenousIdentity,
          country: data.country,
          languageGroup: data.language
        }
      });
    },
    'work-preferences': async () => {
      await prisma.userPreferences.upsert({
        where: { userId },
        create: {
          userId,
          employmentTypes: data.employmentTypes,
          workArrangements: data.workArrangement,
          industries: data.industries
        },
        update: {
          employmentTypes: data.employmentTypes,
          workArrangements: data.workArrangement,
          industries: data.industries
        }
      });
    },
    'skills-experience': async () => {
      await prisma.userProfile.upsert({
        where: { userId },
        create: {
          userId,
          experienceLevel: data.experienceLevel,
          skills: data.skills,
          certifications: data.certifications
        },
        update: {
          experienceLevel: data.experienceLevel,
          skills: data.skills,
          certifications: data.certifications
        }
      });
    },
    'company-basics': async () => {
      if (role === 'employer') {
        await prisma.employer.upsert({
          where: { userId },
          create: {
            userId,
            companyName: data.companyName,
            abn: data.abn,
            industry: data.industry,
            companySize: data.companySize,
            locations: data.locations
          },
          update: {
            companyName: data.companyName,
            abn: data.abn,
            industry: data.industry,
            companySize: data.companySize,
            locations: data.locations
          }
        });
      }
    },
    'notifications': async () => {
      await prisma.notificationPreferences.upsert({
        where: { userId },
        create: {
          userId,
          emailJobAlerts: data.emailNotifications ?? true,
          smsUrgent: data.smsNotifications ?? false,
          weeklyDigest: data.weeklyDigest ?? true
        },
        update: {
          emailJobAlerts: data.emailNotifications,
          smsUrgent: data.smsNotifications,
          weeklyDigest: data.weeklyDigest
        }
      });
    }
  };

  const mapper = mappings[stepId];
  if (mapper) {
    try {
      await mapper();
    } catch (error) {
      console.error(`Failed to apply step data for ${stepId}:`, error);
      // Don't throw - onboarding should continue even if profile update fails
    }
  }
}

/**
 * Get users with incomplete onboarding for re-engagement
 */
export async function getIncompleteOnboardings(options = {}) {
  const { daysInactive = 7, limit = 100 } = options;
  
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysInactive);

  const incomplete = await prisma.onboardingProgress.findMany({
    where: {
      completedAt: null,
      skippedAt: null,
      updatedAt: {
        lt: cutoffDate
      }
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          displayName: true
        }
      }
    },
    take: limit,
    orderBy: {
      updatedAt: 'asc'
    }
  });

  return incomplete.map(o => ({
    userId: o.userId,
    email: o.user.email,
    name: o.user.displayName,
    role: o.role,
    progress: o.progress,
    currentStep: o.currentStepId,
    lastActive: o.updatedAt,
    daysInactive: Math.floor((new Date() - o.updatedAt) / (1000 * 60 * 60 * 24))
  }));
}

// ============================================================================
// EXPORT DEFAULT
// ============================================================================

export default {
  // Configuration
  USER_ROLES,
  
  // Flows
  JOBSEEKER_STEPS,
  EMPLOYER_STEPS,
  MENTOR_STEPS,
  TAFE_STEPS,
  COMMUNITY_STEPS,
  getOnboardingFlow,
  
  // Service functions
  startOnboarding,
  getOnboardingStatus,
  completeStep,
  skipStep,
  skipOnboarding,
  resumeOnboarding,
  getIncompleteOnboardings
};

export {};
