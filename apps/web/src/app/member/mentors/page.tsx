/**
 * Mentors Discovery Page
 * 
 * Browse and connect with mentors in the Ngurra Pathways community.
 */

'use client';

import React, { useState, useEffect } from 'react';
import Image from '@/components/ui/OptimizedImage';
import { isCloudinaryPublicId } from '@/lib/cloudinary';
import Link from 'next/link';

// Types
interface Mentor {
  id: string;
  name: string;
  avatarUrl?: string;
  headline: string;
  bio: string;
  location: string;
  culturalIdentity?: {
    nation?: string;
    elderConnection?: boolean;
  };
  expertise: string[];
  industries: string[];
  availability: 'AVAILABLE' | 'LIMITED' | 'UNAVAILABLE';
  sessionTypes: ('VIDEO' | 'PHONE' | 'IN_PERSON' | 'CHAT')[];
  stats: {
    sessionsCompleted: number;
    rating: number;
    reviewCount: number;
    yearsExperience: number;
  };
  badges: string[];
  isFeatured: boolean;
  matchScore?: number;
}

// Mock mentors data
const mockMentors: Mentor[] = [
  {
    id: '1',
    name: 'Dr. Sarah Yunupingu',
    avatarUrl: undefined,
    headline: 'Senior Executive | Yolngu Woman | Leadership Coach',
    bio: 'With over 20 years in corporate leadership, I help emerging Indigenous leaders navigate their career paths while staying connected to culture.',
    location: 'Darwin, NT',
    culturalIdentity: { nation: 'Yolngu', elderConnection: true },
    expertise: ['Leadership', 'Career Development', 'Executive Coaching', 'Public Speaking'],
    industries: ['Corporate', 'Government', 'Mining'],
    availability: 'AVAILABLE',
    sessionTypes: ['VIDEO', 'PHONE'],
    stats: { sessionsCompleted: 156, rating: 4.9, reviewCount: 89, yearsExperience: 22 },
    badges: ['Elder', 'Top Mentor', 'Community Champion'],
    isFeatured: true,
    matchScore: 95,
  },
  {
    id: '2',
    name: 'Marcus Williams',
    avatarUrl: undefined,
    headline: 'Tech Lead @ Google | Wiradjuri | Software Engineering Mentor',
    bio: 'Passionate about helping Indigenous Australians break into tech. I provide practical guidance on coding, interviews, and career growth.',
    location: 'Sydney, NSW',
    culturalIdentity: { nation: 'Wiradjuri', elderConnection: false },
    expertise: ['Software Engineering', 'Tech Interviews', 'Career Transition', 'JavaScript'],
    industries: ['Technology', 'Startups'],
    availability: 'LIMITED',
    sessionTypes: ['VIDEO', 'CHAT'],
    stats: { sessionsCompleted: 87, rating: 4.8, reviewCount: 52, yearsExperience: 12 },
    badges: ['Tech Expert', 'Rising Star'],
    isFeatured: true,
    matchScore: 92,
  },
  {
    id: '3',
    name: 'Aunty Maree Johnson',
    avatarUrl: undefined,
    headline: 'Community Elder | Kaurna Woman | Cultural Guidance',
    bio: 'I guide young ones on their journey, helping them connect their professional aspirations with cultural responsibilities and identity.',
    location: 'Adelaide, SA',
    culturalIdentity: { nation: 'Kaurna', elderConnection: true },
    expertise: ['Cultural Guidance', 'Identity', 'Community Leadership', 'Youth Development'],
    industries: ['Community Services', 'Education', 'Health'],
    availability: 'AVAILABLE',
    sessionTypes: ['VIDEO', 'IN_PERSON', 'PHONE'],
    stats: { sessionsCompleted: 234, rating: 5.0, reviewCount: 145, yearsExperience: 35 },
    badges: ['Elder', 'Culture Keeper', 'Community Legend'],
    isFeatured: true,
    matchScore: 88,
  },
  {
    id: '4',
    name: 'James Pearce',
    avatarUrl: undefined,
    headline: 'Finance Manager | Noongar | Career & Finance Mentoring',
    bio: 'Helping Indigenous professionals understand finance, career progression, and building wealth while giving back to community.',
    location: 'Perth, WA',
    culturalIdentity: { nation: 'Noongar', elderConnection: false },
    expertise: ['Finance', 'Career Planning', 'Wealth Building', 'Budgeting'],
    industries: ['Finance', 'Banking', 'Corporate'],
    availability: 'AVAILABLE',
    sessionTypes: ['VIDEO', 'PHONE', 'CHAT'],
    stats: { sessionsCompleted: 64, rating: 4.7, reviewCount: 38, yearsExperience: 15 },
    badges: ['Finance Expert'],
    isFeatured: false,
    matchScore: 78,
  },
  {
    id: '5',
    name: 'Dr. Emily Torres',
    avatarUrl: undefined,
    headline: 'Medical Doctor | Torres Strait Islander | Health Careers',
    bio: 'Supporting Indigenous Australians pursuing careers in healthcare. From medical school applications to specialist training.',
    location: 'Brisbane, QLD',
    culturalIdentity: { nation: 'Torres Strait Islander', elderConnection: false },
    expertise: ['Medicine', 'Health Careers', 'Study Skills', 'Medical School Prep'],
    industries: ['Healthcare', 'Research', 'Education'],
    availability: 'LIMITED',
    sessionTypes: ['VIDEO'],
    stats: { sessionsCompleted: 112, rating: 4.9, reviewCount: 67, yearsExperience: 18 },
    badges: ['Health Hero', 'Top Mentor'],
    isFeatured: false,
    matchScore: 85,
  },
];

// Availability badge colors
const AVAILABILITY_COLORS = {
  AVAILABLE: 'bg-green-900/50 text-green-400 border-green-700',
  LIMITED: 'bg-yellow-900/50 text-yellow-400 border-yellow-700',
  UNAVAILABLE: 'bg-slate-700 text-slate-400 border-slate-600',
};

const AVAILABILITY_LABELS = {
  AVAILABLE: 'Available',
  LIMITED: 'Limited',
  UNAVAILABLE: 'Unavailable',
};

// Session type icons
const SESSION_ICONS: Record<string, string> = {
  VIDEO: '📹',
  PHONE: '📞',
  IN_PERSON: '🤝',
  CHAT: '💬',
};

// Mentor Card Component
function MentorCard({ mentor }: { mentor: Mentor }) {
  return (
    <div className={`bg-slate-800 rounded-xl border overflow-hidden hover:border-slate-600 transition-colors ${
      mentor.isFeatured ? 'border-green-700/50' : 'border-slate-700'
    }`}>
      {mentor.isFeatured && (
        <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-4 py-1 text-center text-sm text-white font-medium">
          ⭐ Featured Mentor
        </div>
      )}
      
      <div className="p-6">
        <div className="flex gap-4">
          {/* Avatar */}
          <div className="w-20 h-20 rounded-2xl bg-slate-700 flex items-center justify-center flex-shrink-0 overflow-hidden">
            {mentor.avatarUrl ? (
              <Image
                src={mentor.avatarUrl}
                alt={mentor.name}
                width={80}
                height={80}
                cloudinary={isCloudinaryPublicId(mentor.avatarUrl || '')}
              />
            ) : (
              <span className="text-3xl font-bold text-slate-400">
                {mentor.name.split(' ').map(n => n[0]).join('')}
              </span>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <Link href={`/member/mentors/${mentor.id}`} className="text-lg font-semibold text-white hover:text-green-400 transition-colors">
                  {mentor.name}
                </Link>
                
                {/* Cultural Identity */}
                {mentor.culturalIdentity?.nation && (
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-emerald-400 text-sm">🌏 {mentor.culturalIdentity.nation}</span>
                    {mentor.culturalIdentity.elderConnection && (
                      <span className="text-xs bg-amber-900/50 text-amber-400 px-2 py-0.5 rounded-full border border-amber-700/50">
                        Elder
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Match Score */}
              {mentor.matchScore && (
                <div className="text-right flex-shrink-0">
                  <div className={`text-lg font-bold ${
                    mentor.matchScore >= 90 ? 'text-green-400' :
                    mentor.matchScore >= 75 ? 'text-yellow-400' : 'text-slate-400'
                  }`}>
                    {mentor.matchScore}%
                  </div>
                  <div className="text-xs text-slate-500">Match</div>
                </div>
              )}
            </div>

            <p className="text-slate-400 text-sm mt-1 line-clamp-1">{mentor.headline}</p>
            
            {/* Location & Availability */}
            <div className="flex items-center gap-3 mt-2 text-sm">
              <span className="text-slate-500 flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                </svg>
                {mentor.location}
              </span>
              <span className={`px-2 py-0.5 rounded-full text-xs border ${AVAILABILITY_COLORS[mentor.availability]}`}>
                {AVAILABILITY_LABELS[mentor.availability]}
              </span>
            </div>
          </div>
        </div>

        {/* Bio */}
        <p className="text-slate-300 text-sm mt-4 line-clamp-2">{mentor.bio}</p>

        {/* Expertise */}
        <div className="flex flex-wrap gap-2 mt-4">
          {mentor.expertise.slice(0, 4).map((skill) => (
            <span key={skill} className="px-2 py-1 bg-slate-700 text-slate-300 rounded text-xs">
              {skill}
            </span>
          ))}
          {mentor.expertise.length > 4 && (
            <span className="px-2 py-1 text-slate-500 text-xs">+{mentor.expertise.length - 4} more</span>
          )}
        </div>

        {/* Stats & Session Types */}
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-700">
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1">
              <span className="text-yellow-400">★</span>
              <span className="text-white font-medium">{mentor.stats.rating}</span>
              <span className="text-slate-500">({mentor.stats.reviewCount})</span>
            </div>
            <span className="text-slate-500">{mentor.stats.sessionsCompleted} sessions</span>
          </div>

          <div className="flex items-center gap-2">
            {mentor.sessionTypes.map((type) => (
              <span key={type} title={type.charAt(0) + type.slice(1).toLowerCase().replace('_', ' ')}>
                {SESSION_ICONS[type]}
              </span>
            ))}
          </div>
        </div>

        {/* Badges */}
        {mentor.badges.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {mentor.badges.map((badge) => (
              <span key={badge} className="text-xs bg-purple-900/30 text-purple-400 px-2 py-1 rounded-full border border-purple-700/50">
                {badge}
              </span>
            ))}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 mt-4">
          <Link
            href={`/member/mentors/${mentor.id}`}
            className="flex-1 text-center py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors text-sm font-medium"
          >
            View Profile
          </Link>
          <button
            className="flex-1 py-2 bg-green-600 text-white rounded-lg hover:bg-green-500 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={mentor.availability === 'UNAVAILABLE'}
          >
            Request Session
          </button>
        </div>
      </div>
    </div>
  );
}

export default function MentorsPage() {
  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({
    expertise: [] as string[],
    availability: '' as string,
    elderOnly: false,
  });
  const [sortBy, setSortBy] = useState<'match' | 'rating' | 'sessions'>('match');

  useEffect(() => {
    const loadMentors = async () => {
      await new Promise(resolve => setTimeout(resolve, 300));
      setMentors(mockMentors);
      setLoading(false);
    };
    loadMentors();
  }, []);

  // Get unique expertise tags
  const allExpertise = [...new Set(mentors.flatMap(m => m.expertise))];

  const filteredMentors = mentors
    .filter(mentor => {
      if (search && !mentor.name.toLowerCase().includes(search.toLowerCase()) &&
          !mentor.headline.toLowerCase().includes(search.toLowerCase()) &&
          !mentor.expertise.some(e => e.toLowerCase().includes(search.toLowerCase()))) {
        return false;
      }
      if (filters.elderOnly && !mentor.culturalIdentity?.elderConnection) return false;
      if (filters.availability && mentor.availability !== filters.availability) return false;
      if (filters.expertise.length > 0 && !filters.expertise.some(e => mentor.expertise.includes(e))) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'match') return (b.matchScore || 0) - (a.matchScore || 0);
      if (sortBy === 'rating') return b.stats.rating - a.stats.rating;
      if (sortBy === 'sessions') return b.stats.sessionsCompleted - a.stats.sessionsCompleted;
      return 0;
    });

  const featuredMentors = filteredMentors.filter(m => m.isFeatured);
  const otherMentors = filteredMentors.filter(m => !m.isFeatured);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="animate-spin w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <div className="bg-gradient-to-b from-slate-900 to-slate-950 border-b border-slate-800">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold text-white">Find a Mentor</h1>
          <p className="text-slate-400 mt-2">Connect with experienced Indigenous professionals and community elders</p>

          {/* Search */}
          <div className="mt-6 relative">
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search by name, expertise, or industry..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none"
            />
          </div>

          {/* Quick Filters */}
          <div className="flex flex-wrap gap-3 mt-4">
            <button
              onClick={() => setFilters({ ...filters, elderOnly: !filters.elderOnly })}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filters.elderOnly
                  ? 'bg-amber-600 text-white'
                  : 'bg-slate-800 text-slate-300 border border-slate-700 hover:border-slate-600'
              }`}
            >
              🧓 Elder Mentors
            </button>
            <button
              onClick={() => setFilters({ ...filters, availability: filters.availability === 'AVAILABLE' ? '' : 'AVAILABLE' })}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filters.availability === 'AVAILABLE'
                  ? 'bg-green-600 text-white'
                  : 'bg-slate-800 text-slate-300 border border-slate-700 hover:border-slate-600'
              }`}
            >
              ✅ Available Now
            </button>
            {['Leadership', 'Tech', 'Health', 'Finance'].map((exp) => (
              <button
                key={exp}
                onClick={() => {
                  const expertise = filters.expertise.includes(exp)
                    ? filters.expertise.filter(e => e !== exp)
                    : [...filters.expertise, exp];
                  setFilters({ ...filters, expertise });
                }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filters.expertise.includes(exp)
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-800 text-slate-300 border border-slate-700 hover:border-slate-600'
                }`}
              >
                {exp}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Results Header */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-slate-400">
            <span className="text-white font-medium">{filteredMentors.length}</span> mentors found
          </p>
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:border-green-500 outline-none"
            >
              <option value="match">Best Match</option>
              <option value="rating">Highest Rated</option>
              <option value="sessions">Most Sessions</option>
            </select>
          </div>
        </div>

        {/* Featured Mentors */}
        {featuredMentors.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              ⭐ Featured Mentors
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {featuredMentors.map((mentor) => (
                <MentorCard key={mentor.id} mentor={mentor} />
              ))}
            </div>
          </div>
        )}

        {/* All Mentors */}
        {otherMentors.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold text-white mb-4">All Mentors</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {otherMentors.map((mentor) => (
                <MentorCard key={mentor.id} mentor={mentor} />
              ))}
            </div>
          </div>
        )}

        {filteredMentors.length === 0 && (
          <div className="text-center py-16">
            <svg className="w-16 h-16 text-slate-600 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <h3 className="text-xl font-medium text-white mt-4">No mentors found</h3>
            <p className="text-slate-400 mt-2">Try adjusting your filters or search terms</p>
            <button
              onClick={() => {
                setSearch('');
                setFilters({ expertise: [], availability: '', elderOnly: false });
              }}
              className="mt-4 px-6 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors"
            >
              Clear Filters
            </button>
          </div>
        )}

        {/* Become a Mentor CTA */}
        <div className="mt-12 bg-gradient-to-r from-green-900/30 to-emerald-900/30 rounded-2xl border border-green-700/30 p-8 text-center">
          <h2 className="text-2xl font-bold text-white">Share Your Knowledge</h2>
          <p className="text-slate-300 mt-2 max-w-2xl mx-auto">
            Help the next generation of Indigenous professionals succeed. Become a mentor and make a lasting impact on your community.
          </p>
          <button className="mt-6 px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-500 transition-colors font-medium">
            Become a Mentor
          </button>
        </div>
      </div>
    </div>
  );
}
