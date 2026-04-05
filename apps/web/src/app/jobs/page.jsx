import { API_BASE } from '@/lib/apiBase';
import JobsClient from './JobsClient';

// SEO Metadata for Jobs Page
export const metadata = {
    title: 'Indigenous Jobs & Careers',
    description: 'Find Indigenous employment opportunities across Australia. Browse jobs from leading employers committed to First Nations careers, traineeships, and culturally safe workplaces.',
    keywords: ['Indigenous jobs', 'First Nations employment', 'Aboriginal careers', 'Indigenous traineeships', 'culturally safe workplace'],
    openGraph: {
        title: 'Indigenous Jobs & Careers | Ngurra Pathways',
        description: 'Find Indigenous employment opportunities across Australia from leading employers.',
        url: 'https://ngurrapathways.life/jobs',
    },
    alternates: {
        canonical: '/jobs',
    },
};

// Fallback job data for First Nations employment
const FALLBACK_JOBS = [
    {
        id: '1',
        title: 'Indigenous Community Liaison Officer',
        company: { companyName: 'Rio Tinto', isVerified: true },
        location: 'Perth, WA',
        employment: 'FULL_TIME',
        salaryLow: 85000,
        salaryHigh: 105000,
        description: 'Join our Indigenous Partnerships team to strengthen relationships with Traditional Owner groups across the Pilbara. You will facilitate cultural awareness programs, coordinate community consultations, and ensure our operations respect and celebrate Indigenous heritage.',
        isFeatured: true,
        slug: 'indigenous-community-liaison-officer'
    },
    {
        id: '2',
        title: 'First Nations Software Developer',
        company: { companyName: 'Atlassian', isVerified: true },
        location: 'Sydney, NSW (Hybrid)',
        employment: 'FULL_TIME',
        salaryLow: 120000,
        salaryHigh: 160000,
        description: 'Be part of our Indigenous Tech Talent program. We are seeking passionate developers to join our engineering team. Experience with React, Node.js, or cloud technologies preferred. Mentorship and career development pathways included.',
        isFeatured: true,
        slug: 'first-nations-software-developer'
    },
    {
        id: '3',
        title: 'Heavy Diesel Mechanic - Indigenous Traineeship',
        company: { companyName: 'BHP', isVerified: true },
        location: 'Newman, WA',
        employment: 'APPRENTICESHIP',
        salaryLow: 65000,
        salaryHigh: 85000,
        description: 'Fully funded traineeship program for First Nations candidates. Gain your Certificate III in Heavy Commercial Vehicle Mechanical Technology while earning a competitive wage. Accommodation and travel allowances provided.',
        isFeatured: false,
        slug: 'heavy-diesel-mechanic-traineeship'
    },
    {
        id: '4',
        title: 'Aboriginal Health Worker',
        company: { companyName: 'Victorian Aboriginal Health Service', isVerified: true },
        location: 'Melbourne, VIC',
        employment: 'FULL_TIME',
        salaryLow: 70000,
        salaryHigh: 90000,
        description: 'Provide culturally safe health care to Aboriginal and Torres Strait Islander communities. Work alongside doctors, nurses, and allied health professionals to deliver holistic health services. Certificate IV in Aboriginal Health required.',
        isFeatured: false,
        slug: 'aboriginal-health-worker'
    },
    {
        id: '5',
        title: 'Indigenous Ranger - Land Management',
        company: { companyName: 'Parks Australia', isVerified: true },
        location: 'Kakadu, NT',
        employment: 'FULL_TIME',
        salaryLow: 60000,
        salaryHigh: 75000,
        description: 'Work on Country managing one of Australia\'s most iconic national parks. Combine traditional knowledge with modern conservation practices. Responsibilities include fire management, weed control, and cultural site protection.',
        isFeatured: true,
        slug: 'indigenous-ranger-land-management'
    },
    {
        id: '6',
        title: 'Graduate Accountant - Indigenous Program',
        company: { companyName: 'KPMG', isVerified: true },
        location: 'Brisbane, QLD',
        employment: 'FULL_TIME',
        salaryLow: 65000,
        salaryHigh: 75000,
        description: 'Join KPMG\'s award-winning Indigenous Graduate Program. Gain exposure to audit, tax, and advisory services while completing your CA or CPA qualification. Dedicated mentoring and cultural support provided throughout your journey.',
        isFeatured: false,
        slug: 'graduate-accountant-indigenous-program'
    },
    {
        id: '7',
        title: 'Customer Service Representative',
        company: { companyName: 'Telstra', isVerified: true },
        location: 'Darwin, NT',
        employment: 'FULL_TIME',
        salaryLow: 55000,
        salaryHigh: 65000,
        description: 'Help customers with their telecommunications needs in our Darwin contact centre. Full training provided. We value candidates who can connect with diverse communities and provide exceptional service with cultural understanding.',
        isFeatured: false,
        slug: 'customer-service-representative'
    },
    {
        id: '8',
        title: 'Mining Process Operator',
        company: { companyName: 'Fortescue Metals Group', isVerified: true },
        location: 'Port Hedland, WA',
        employment: 'FULL_TIME',
        salaryLow: 95000,
        salaryHigh: 130000,
        description: 'Operate processing equipment at our iron ore operations. FIFO roster (8 days on/6 days off) with flights from Perth, Broome, or regional WA. No prior experience needed - comprehensive training provided. Aboriginal and Torres Strait Islander candidates strongly encouraged.',
        isFeatured: true,
        slug: 'mining-process-operator'
    },
    {
        id: '9',
        title: 'Early Childhood Educator',
        company: { companyName: 'Goodstart Early Learning', isVerified: true },
        location: 'Cairns, QLD',
        employment: 'PART_TIME',
        salaryLow: 50000,
        salaryHigh: 60000,
        description: 'Inspire the next generation at our culturally inclusive early learning centre. Help integrate First Nations perspectives into our curriculum. Certificate III in Early Childhood Education required, Diploma preferred.',
        isFeatured: false,
        slug: 'early-childhood-educator'
    },
    {
        id: '10',
        title: 'Indigenous Affairs Advisor',
        company: { companyName: 'Qantas Airways', isVerified: true },
        location: 'Sydney, NSW',
        employment: 'FULL_TIME',
        salaryLow: 110000,
        salaryHigh: 140000,
        description: 'Lead Qantas\' engagement with First Nations communities and suppliers. Develop reconciliation action plans, manage Indigenous procurement strategies, and represent Qantas at key stakeholder events. Strong networks within Aboriginal and Torres Strait Islander communities essential.',
        isFeatured: true,
        slug: 'indigenous-affairs-advisor'
    }
];

/**
 * Jobs Page (Server Component)
 * Pre-fetches job listings at request time for fast first paint.
 */
export default async function JobsPage() {
    let initialJobs = [];

    try {
        // Use 127.0.0.1 to avoid Windows IPv6 localhost issues
        const serverApiBase = String(API_BASE || '')
            .replace('http://localhost', 'http://127.0.0.1')
            .replace('https://localhost', 'https://127.0.0.1');

        const res = await fetch(`${serverApiBase}/jobs?page=1&pageSize=10`, {
            cache: 'no-store',
        });

        if (res.ok) {
            const data = await res.json();
            const apiJobs = data?.data || data?.jobs || [];
            if (apiJobs.length > 0) {
                initialJobs = apiJobs;
            }
        }
    } catch {
        // Fallback to seed jobs on any error
    }

    // Use fallback jobs if API returned nothing
    if (initialJobs.length === 0) {
        initialJobs = FALLBACK_JOBS;
    }

    return <JobsClient initialJobs={initialJobs} />;
}
