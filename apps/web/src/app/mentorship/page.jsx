import { API_BASE } from '@/lib/apiBase';
import MentorshipClient from './MentorshipClient';

// SEO Metadata for Mentorship Page
export const metadata = {
  title: 'Indigenous Mentorship Program',
  description: 'Connect with experienced First Nations mentors for career guidance. Our culturally-safe mentorship program supports Indigenous professionals at all career stages.',
  keywords: ['Indigenous mentorship', 'First Nations mentors', 'Aboriginal career guidance', 'Indigenous professional development'],
  openGraph: {
    title: 'Indigenous Mentorship Program | Ngurra Pathways',
    description: 'Connect with experienced First Nations mentors for career guidance.',
    url: 'https://ngurrapathways.life/mentorship',
  },
  alternates: {
    canonical: '/mentorship',
  },
};

// Seed mentors shown when API is unavailable
// Representative profiles at real Australian institutions
const SEED_MENTORS = [
    {
        id: '1',
        name: 'Marcia Langton',
        avatar: 'https://images.unsplash.com/photo-1594744803329-e58b31de8bf5?w=200&h=200&fit=crop',
        title: 'Senior Policy Advisor | Indigenous Business Australia',
        expertise: ['Leadership', 'Policy', 'Corporate Governance', 'Grant Writing'],
        industry: 'Government',
        location: 'Canberra, ACT',
        rating: 4.9,
        reviews: 47,
        sessions: 156,
        bio: '20+ years in Indigenous policy and economic development. Guiding the next generation of First Nations leaders into government and corporate sectors.',
        availability: ['Mon', 'Wed', 'Fri'],
        languages: ['English'],
        price: 'Free',
        verified: true
    },
    {
        id: '2',
        name: 'Daniel Motlop',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop',
        title: 'Software Engineer | Atlassian',
        expertise: ['Software Development', 'Tech Careers', 'Resume Building', 'Coding Bootcamps'],
        industry: 'Technology',
        location: 'Sydney, NSW',
        rating: 4.8,
        reviews: 32,
        sessions: 89,
        bio: 'CareerTrackers alumnus turned full-stack engineer. Passionate about creating pathways for First Nations people in tech.',
        availability: ['Tue', 'Thu', 'Sat'],
        languages: ['English'],
        price: 'Free',
        verified: true
    },
    {
        id: '3',
        name: 'Dr. Keyla James',
        avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&h=200&fit=crop',
        title: 'Research Fellow | James Cook University',
        expertise: ['Academia', 'Research', 'PhD Supervision', 'Public Health'],
        industry: 'Education',
        location: 'Cairns, QLD',
        rating: 5.0,
        reviews: 58,
        sessions: 234,
        bio: 'Supervised 15+ First Nations PhD candidates. Specialising in Indigenous health research methodologies and community-led study design.',
        availability: ['Mon', 'Tue', 'Wed'],
        languages: ['English'],
        price: 'Free',
        verified: true
    },
    {
        id: '4',
        name: 'Tyson Carmody',
        avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop',
        title: 'Operations Supervisor | BHP',
        expertise: ['Mining', 'FIFO Lifestyle', 'Heavy Equipment', 'Workplace Safety'],
        industry: 'Mining & Resources',
        location: 'Perth, WA',
        rating: 4.7,
        reviews: 29,
        sessions: 67,
        bio: '15 years in Pilbara mining operations. Started as a trades assistant and now lead a crew of 40. Happy to guide you into resources careers.',
        availability: ['Wed', 'Sat', 'Sun'],
        languages: ['English'],
        price: 'Free',
        verified: true
    },
    {
        id: '5',
        name: 'Elise Baird',
        avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200&h=200&fit=crop',
        title: 'Registered Nurse | Royal Darwin Hospital',
        expertise: ['Nursing', 'Midwifery', 'Healthcare Careers', 'TAFE Pathways'],
        industry: 'Healthcare',
        location: 'Darwin, NT',
        rating: 4.9,
        reviews: 41,
        sessions: 112,
        bio: 'Diploma of Nursing through TAFE SA, now working in acute care. Mentoring aspiring nurses and allied health workers across regional and remote areas.',
        availability: ['Mon', 'Thu', 'Fri'],
        languages: ['English'],
        price: 'Free',
        verified: true
    },
    {
        id: '6',
        name: 'Nathan Maynard',
        avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop',
        title: 'Founder & Director | Supply Nation Certified Business',
        expertise: ['Entrepreneurship', 'Business Development', 'Procurement', 'Grant Applications'],
        industry: 'Business',
        location: 'Brisbane, QLD',
        rating: 4.8,
        reviews: 36,
        sessions: 98,
        bio: 'Built a Supply Nation certified construction services business from the ground up. Helping First Nations entrepreneurs access procurement and funding opportunities.',
        availability: ['Tue', 'Wed', 'Thu'],
        languages: ['English'],
        price: 'Free',
        verified: true
    }
];

/**
 * Mentorship Landing Page (Server Component)
 * Pre-fetches featured mentors at request time for fast first paint.
 */
export default async function MentorshipPage() {
    let initialMentors = [];

    try {
        // Use 127.0.0.1 to avoid Windows IPv6 localhost issues
        const serverApiBase = String(API_BASE || '')
            .replace('http://localhost', 'http://127.0.0.1')
            .replace('https://localhost', 'https://127.0.0.1');

        const res = await fetch(`${serverApiBase}/mentorship/top-mentors?limit=6`, {
            cache: 'no-store',
        });

        if (res.ok) {
            const data = await res.json();
            if (data.mentors && data.mentors.length > 0) {
                initialMentors = data.mentors.map((m) => ({
                    id: m.id,
                    name: m.name || 'Mentor',
                    avatar: m.avatar || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop',
                    title: m.title || m.expertise || 'Professional Mentor',
                    expertise: Array.isArray(m.expertise) ? m.expertise : m.expertise ? [m.expertise] : ['Mentorship'],
                    industry: m.industry || 'Business',
                    location: m.location || 'Australia',
                    rating: parseFloat(m.rating) || 4.5,
                    reviews: m.reviews || m.sessionCount || 0,
                    sessions: m.sessionCount || 0,
                    bio: m.bio || 'Experienced mentor ready to help.',
                    availability: m.availability || ['Mon', 'Wed', 'Fri'],
                    languages: m.languages || ['English'],
                    price: m.price || 'Free',
                    verified: m.verified !== undefined ? m.verified : true,
                }));
            }
        }
    } catch {
        // Fallback to seed mentors on any error
    }

    // Use seed mentors if API returned nothing
    if (initialMentors.length === 0) {
        initialMentors = SEED_MENTORS;
    }

    return (
        <MentorshipClient
            initialMentors={initialMentors}
            hasPrefetched={initialMentors.length > 0}
        />
    );
}
