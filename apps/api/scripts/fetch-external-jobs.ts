/**
 * Fetch External Jobs Script
 * 
 * Fetches job data from public APIs and formats it for the import-web-data.js script.
 * This script can be run manually or scheduled via cron to keep job listings fresh.
 * 
 * Supported sources:
 * - Adzuna API (Australian jobs)
 * - Reed UK API (sample)
 * - Government Open Data portals
 * 
 * Usage:
 *   npx ts-node scripts/fetch-external-jobs.ts --source adzuna --output data/jobs.json
 *   npx ts-node scripts/fetch-external-jobs.ts --source mock --output data/jobs.json
 * 
 * Environment variables:
 *   ADZUNA_APP_ID - Your Adzuna API application ID
 *   ADZUNA_APP_KEY - Your Adzuna API key
 */

import * as fs from 'fs';
import * as path from 'path';

// ==========================================
// Types
// ==========================================

interface ExternalJob {
  externalId: string;
  title: string;
  description: string;
  location?: string;
  employment?: string;
  salaryLow?: number;
  salaryHigh?: number;
  companyName?: string;
  companyIndustry?: string;
  companyWebsite?: string;
  postedAt?: string;
  url?: string;
}

interface FetchResult {
  source: string;
  jobs: ExternalJob[];
  fetchedAt: string;
}

// ==========================================
// Adzuna API Integration
// ==========================================

async function fetchFromAdzuna(options: {
  appId: string;
  appKey: string;
  what?: string;
  where?: string;
  resultsPerPage?: number;
}): Promise<ExternalJob[]> {
  const { appId, appKey, what = 'indigenous', where = 'australia', resultsPerPage = 50 } = options;
  
  const baseUrl = 'https://api.adzuna.com/v1/api/jobs/au/search/1';
  const params = new URLSearchParams({
    app_id: appId,
    app_key: appKey,
    results_per_page: String(resultsPerPage),
    what,
    where,
    content_type: 'application/json',
  });

  console.log(`📡 Fetching from Adzuna API: ${what} in ${where}...`);

  const response = await fetch(`${baseUrl}?${params}`);
  
  if (!response.ok) {
    throw new Error(`Adzuna API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json() as { results?: any[] };
  
  const jobs: ExternalJob[] = (data.results || []).map((job: any) => ({
    externalId: String(job.id),
    title: job.title || 'Untitled Position',
    description: job.description || '',
    location: job.location?.display_name || job.location?.area?.[0] || 'Australia',
    employment: mapAdzunaContractType(job.contract_type),
    salaryLow: job.salary_min ? Math.round(job.salary_min) : undefined,
    salaryHigh: job.salary_max ? Math.round(job.salary_max) : undefined,
    companyName: job.company?.display_name || 'Company',
    companyIndustry: job.category?.label || 'General',
    companyWebsite: undefined,
    postedAt: job.created,
    url: job.redirect_url,
  }));

  console.log(`✅ Fetched ${jobs.length} jobs from Adzuna`);
  return jobs;
}

function mapAdzunaContractType(type?: string): string {
  if (!type) return 'FULL_TIME';
  const normalized = type.toLowerCase();
  if (normalized.includes('part')) return 'PART_TIME';
  if (normalized.includes('contract')) return 'CONTRACT';
  if (normalized.includes('casual')) return 'CASUAL';
  return 'FULL_TIME';
}

// ==========================================
// Mock Data Generator (for testing)
// ==========================================

function generateMockJobs(count: number = 50): ExternalJob[] {
  const industries = [
    'Mining & Resources',
    'Healthcare',
    'Education',
    'Construction',
    'Agriculture',
    'Hospitality',
    'Technology',
    'Government',
    'Retail',
    'Transport & Logistics',
  ];

  const locations = [
    'Perth, WA',
    'Darwin, NT',
    'Alice Springs, NT',
    'Broome, WA',
    'Cairns, QLD',
    'Brisbane, QLD',
    'Sydney, NSW',
    'Melbourne, VIC',
    'Adelaide, SA',
    'Kalgoorlie, WA',
  ];

  const employmentTypes = ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'CASUAL', 'APPRENTICESHIP', 'TRAINEESHIP'];

  const jobTitles = [
    'Community Liaison Officer',
    'Indigenous Engagement Coordinator',
    'Cultural Heritage Advisor',
    'Health Worker',
    'Education Support Officer',
    'Land Management Officer',
    'Environmental Monitor',
    'Youth Program Coordinator',
    'Administration Officer',
    'Project Officer',
    'Trainee - Business Administration',
    'Apprentice - Electrical',
    'Ranger',
    'Community Development Officer',
    'Research Assistant',
    'Social Worker',
    'Housing Officer',
    'Employment Services Consultant',
    'Arts and Culture Coordinator',
    'Tourism Guide',
  ];

  const companies = [
    { name: 'BHP Billiton', industry: 'Mining & Resources', website: 'https://www.bhp.com' },
    { name: 'Rio Tinto', industry: 'Mining & Resources', website: 'https://www.riotinto.com' },
    { name: 'Fortescue Metals', industry: 'Mining & Resources', website: 'https://www.fmgl.com.au' },
    { name: 'Queensland Health', industry: 'Healthcare', website: 'https://www.health.qld.gov.au' },
    { name: 'NT Government', industry: 'Government', website: 'https://nt.gov.au' },
    { name: 'WA Government', industry: 'Government', website: 'https://www.wa.gov.au' },
    { name: 'Reconciliation Australia', industry: 'Non-Profit', website: 'https://www.reconciliation.org.au' },
    { name: 'Indigenous Business Australia', industry: 'Finance', website: 'https://www.iba.gov.au' },
    { name: 'First Nations Media', industry: 'Media', website: 'https://firstnationsmedia.org.au' },
    { name: 'TAFE Queensland', industry: 'Education', website: 'https://tafeqld.edu.au' },
  ];

  console.log(`🎲 Generating ${count} mock jobs...`);

  const jobs: ExternalJob[] = [];

  for (let i = 0; i < count; i++) {
    const company = companies[Math.floor(Math.random() * companies.length)];
    const title = jobTitles[Math.floor(Math.random() * jobTitles.length)];
    const location = locations[Math.floor(Math.random() * locations.length)];
    const employment = employmentTypes[Math.floor(Math.random() * employmentTypes.length)];
    
    const baseSalary = 45000 + Math.floor(Math.random() * 80000);
    const salaryRange = Math.floor(Math.random() * 20000);

    jobs.push({
      externalId: `mock-${Date.now()}-${i}`,
      title: `${title}${Math.random() > 0.7 ? ' - Indigenous Identified' : ''}`,
      description: generateJobDescription(title, company.name, location),
      location,
      employment,
      salaryLow: baseSalary,
      salaryHigh: baseSalary + salaryRange,
      companyName: company.name,
      companyIndustry: company.industry,
      companyWebsite: company.website,
      postedAt: new Date(Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000).toISOString(),
    });
  }

  console.log(`✅ Generated ${jobs.length} mock jobs`);
  return jobs;
}

function generateJobDescription(title: string, company: string, location: string): string {
  return `
## About the Role

${company} is seeking a dedicated ${title} to join our team in ${location}.

This is an exciting opportunity to make a meaningful impact in the community while developing your career with a leading organization.

## Key Responsibilities

- Work collaboratively with community members and stakeholders
- Contribute to program planning and implementation
- Maintain accurate records and reporting
- Participate in team meetings and professional development
- Support cultural protocols and community engagement

## About You

- Strong communication and interpersonal skills
- Ability to work independently and as part of a team
- Understanding of and respect for Aboriginal and Torres Strait Islander cultures
- Relevant qualifications or willingness to obtain them
- Current driver's license (desirable)

## What We Offer

- Competitive salary package
- Professional development opportunities
- Supportive team environment
- Flexible working arrangements
- Cultural leave provisions

${company} is an equal opportunity employer and encourages applications from Aboriginal and Torres Strait Islander peoples.
`.trim();
}

// ==========================================
// Course Data Generator
// ==========================================

interface ExternalCourse {
  externalId: string;
  title: string;
  description?: string;
  category?: string;
  duration?: string;
  qualification?: string;
  industry?: string;
  providerName?: string;
  providerId?: string;
  priceInCents?: number;
  location?: string;
  isOnline?: boolean;
  url?: string;
  skills?: string;
}

function generateMockCourses(count: number = 30): ExternalCourse[] {
  const courses: ExternalCourse[] = [
    {
      externalId: 'cert3-business',
      title: 'Certificate III in Business',
      description: 'Develop essential business administration skills including communication, customer service, and workplace safety.',
      category: 'Business',
      duration: '6-12 months',
      qualification: 'Certificate III',
      industry: 'Business & Administration',
      providerName: 'TAFE Queensland',
      priceInCents: 150000,
      isOnline: true,
      skills: 'Business Administration,Customer Service,Communication',
    },
    {
      externalId: 'cert4-community',
      title: 'Certificate IV in Community Services',
      description: 'Learn to work with diverse communities and provide support services.',
      category: 'Community Services',
      duration: '12-18 months',
      qualification: 'Certificate IV',
      industry: 'Community Services',
      providerName: 'TAFE NSW',
      priceInCents: 280000,
      isOnline: false,
      location: 'Sydney, NSW',
      skills: 'Community Development,Case Management,Cultural Competency',
    },
    {
      externalId: 'cert3-conservation',
      title: 'Certificate III in Conservation and Land Management',
      description: 'Gain skills in land management, conservation practices, and environmental monitoring.',
      category: 'Environment',
      duration: '12 months',
      qualification: 'Certificate III',
      industry: 'Environment & Conservation',
      providerName: 'TAFE WA',
      priceInCents: 220000,
      isOnline: false,
      location: 'Perth, WA',
      skills: 'Land Management,Conservation,Environmental Monitoring',
    },
    {
      externalId: 'cert4-project-mgmt',
      title: 'Certificate IV in Project Management Practice',
      description: 'Develop project management skills applicable across industries.',
      category: 'Business',
      duration: '6 months',
      qualification: 'Certificate IV',
      industry: 'Business & Administration',
      providerName: 'Australian Institute of Management',
      priceInCents: 350000,
      isOnline: true,
      skills: 'Project Management,Leadership,Planning',
    },
    {
      externalId: 'diploma-community-dev',
      title: 'Diploma of Community Development',
      description: 'Advanced training in community development, program management, and stakeholder engagement.',
      category: 'Community Services',
      duration: '18-24 months',
      qualification: 'Diploma',
      industry: 'Community Services',
      providerName: 'Charles Darwin University',
      priceInCents: 450000,
      isOnline: true,
      location: 'Darwin, NT',
      skills: 'Community Development,Program Management,Leadership',
    },
    {
      externalId: 'cert3-health',
      title: 'Certificate III in Aboriginal and/or Torres Strait Islander Primary Health Care',
      description: 'Specialized health care training for working with Aboriginal and Torres Strait Islander communities.',
      category: 'Health',
      duration: '12 months',
      qualification: 'Certificate III',
      industry: 'Healthcare',
      providerName: 'Batchelor Institute',
      priceInCents: 0,
      isOnline: false,
      location: 'Darwin, NT',
      skills: 'Primary Health Care,Cultural Safety,Community Health',
    },
    {
      externalId: 'cert4-training',
      title: 'Certificate IV in Training and Assessment',
      description: 'Become a qualified trainer and assessor in the vocational education sector.',
      category: 'Education',
      duration: '6-12 months',
      qualification: 'Certificate IV',
      industry: 'Education',
      providerName: 'TAFE Queensland',
      priceInCents: 320000,
      isOnline: true,
      skills: 'Training,Assessment,Adult Education',
    },
    {
      externalId: 'cert2-tourism',
      title: 'Certificate II in Tourism',
      description: 'Entry-level tourism qualification covering customer service and cultural tourism.',
      category: 'Tourism',
      duration: '3-6 months',
      qualification: 'Certificate II',
      industry: 'Tourism & Hospitality',
      providerName: 'TAFE NT',
      priceInCents: 80000,
      isOnline: false,
      location: 'Alice Springs, NT',
      skills: 'Customer Service,Tourism,Cultural Tourism',
    },
  ];

  // Add more generated courses to reach the count
  const categories = ['Business', 'Health', 'Education', 'Technology', 'Environment', 'Arts'];
  const qualifications = ['Certificate II', 'Certificate III', 'Certificate IV', 'Diploma', 'Advanced Diploma'];
  
  while (courses.length < count) {
    const category = categories[Math.floor(Math.random() * categories.length)];
    const qualification = qualifications[Math.floor(Math.random() * qualifications.length)];
    const i = courses.length;
    
    courses.push({
      externalId: `mock-course-${i}`,
      title: `${qualification} in ${category} Studies`,
      description: `Comprehensive training in ${category.toLowerCase()} fundamentals and practices.`,
      category,
      duration: `${3 + Math.floor(Math.random() * 18)} months`,
      qualification,
      industry: category,
      providerName: 'TAFE Australia',
      priceInCents: Math.floor(Math.random() * 500000),
      isOnline: Math.random() > 0.5,
      skills: `${category},Professional Skills,Communication`,
    });
  }

  console.log(`✅ Generated ${courses.length} mock courses`);
  return courses;
}

// ==========================================
// CLI
// ==========================================

function parseArgs(argv: string[]): Record<string, string | boolean> {
  const args: Record<string, string | boolean> = {};
  for (let i = 2; i < argv.length; i++) {
    const part = argv[i];
    if (!part.startsWith('--')) continue;
    const key = part.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith('--')) {
      args[key] = true;
    } else {
      args[key] = next;
      i++;
    }
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv);
  
  const source = String(args.source || 'mock');
  const outputPath = String(args.output || 'data/external-jobs.json');
  const coursesOutput = String(args['courses-output'] || 'data/external-courses.json');
  const count = parseInt(String(args.count || '50'), 10);

  console.log('\n🚀 Ngurra Pathways - External Data Fetcher\n');
  console.log(`   Source: ${source}`);
  console.log(`   Output: ${outputPath}`);
  console.log(`   Count: ${count}\n`);

  let jobs: ExternalJob[] = [];
  let courses: ExternalCourse[] = [];

  switch (source) {
    case 'adzuna': {
      const appId = process.env.ADZUNA_APP_ID;
      const appKey = process.env.ADZUNA_APP_KEY;
      
      if (!appId || !appKey) {
        throw new Error('ADZUNA_APP_ID and ADZUNA_APP_KEY environment variables are required');
      }
      
      jobs = await fetchFromAdzuna({ appId, appKey, resultsPerPage: count });
      break;
    }
    
    case 'mock':
    default:
      jobs = generateMockJobs(count);
      courses = generateMockCourses(Math.floor(count * 0.6));
      break;
  }

  // Ensure output directory exists
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Write jobs output
  const jobsResult: FetchResult = {
    source,
    jobs,
    fetchedAt: new Date().toISOString(),
  };
  
  fs.writeFileSync(outputPath, JSON.stringify(jobs, null, 2));
  console.log(`\n📁 Jobs saved to: ${outputPath}`);

  // Write courses output if available
  if (courses.length > 0) {
    fs.writeFileSync(coursesOutput, JSON.stringify(courses, null, 2));
    console.log(`📁 Courses saved to: ${coursesOutput}`);
  }

  console.log('\n✅ Data fetch complete!\n');
  console.log('To import this data into the database, run:');
  console.log(`   node prisma/import-web-data.js --jobs-url file://${path.resolve(outputPath)} --source ${source}`);
  if (courses.length > 0) {
    console.log(`   node prisma/import-web-data.js --courses-url file://${path.resolve(coursesOutput)} --source ${source}`);
  }
}

main().catch((error) => {
  console.error('\n❌ Error:', error.message);
  process.exit(1);
});
