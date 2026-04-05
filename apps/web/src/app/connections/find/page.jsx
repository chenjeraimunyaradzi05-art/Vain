'use client';

import { useState } from 'react';
import Link from 'next/link';

/**
 * Find People Page
 * Discover and connect with new people
 */
export default function FindPeoplePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [industryFilter, setIndustryFilter] = useState('');

  const filters = [
    { id: 'all', label: 'All', icon: '👥' },
    { id: 'suggested', label: 'Suggested', icon: '✨' },
    { id: 'nearby', label: 'Nearby', icon: '📍' },
    { id: 'mentors', label: 'Mentors', icon: '🎓' },
    { id: 'recruiters', label: 'Recruiters', icon: '💼' }
  ];

  const industries = [
    'All Industries',
    'Technology',
    'Healthcare',
    'Education',
    'Community Services',
    'Government',
    'Mining & Resources',
    'Arts & Culture',
    'Finance',
    'Construction'
  ];

  const mockPeople = [
    { 
      id: 1, 
      name: 'Sarah Mitchell', 
      role: 'Senior Software Developer',
      company: 'First Nations Dev Corp',
      avatar: '👩🏽', 
      trustLevel: 'verified',
      mutualConnections: 23,
      location: 'Sydney, NSW',
      skills: ['JavaScript', 'React', 'Mentoring'],
      isConnected: false
    },
    { 
      id: 2, 
      name: 'David Yarrawonga', 
      role: 'Community Engagement Lead',
      company: 'Indigenous Business Network',
      avatar: '👨🏾', 
      trustLevel: 'trusted',
      mutualConnections: 15,
      location: 'Melbourne, VIC',
      skills: ['Leadership', 'Community Building'],
      isConnected: false
    },
    { 
      id: 3, 
      name: 'Elder Mary Thompson', 
      role: 'Cultural Advisor & Mentor',
      company: 'Community Council',
      avatar: '👩🏽', 
      trustLevel: 'verified',
      mutualConnections: 45,
      location: 'Brisbane, QLD',
      skills: ['Cultural Guidance', 'Mentoring', 'Leadership'],
      isConnected: true
    },
    { 
      id: 4, 
      name: 'James Chen', 
      role: 'HR Manager',
      company: 'Inclusive Hiring Co',
      avatar: '👨🏻', 
      trustLevel: 'established',
      mutualConnections: 8,
      location: 'Perth, WA',
      skills: ['Recruitment', 'Diversity & Inclusion'],
      isConnected: false
    },
    { 
      id: 5, 
      name: 'Lisa Park', 
      role: 'Career Coach',
      company: 'Career Mentors Australia',
      avatar: '👩🏻', 
      trustLevel: 'trusted',
      mutualConnections: 12,
      location: 'Adelaide, SA',
      skills: ['Career Coaching', 'Resume Writing', 'Interview Prep'],
      isConnected: false
    },
    { 
      id: 6, 
      name: 'Marcus Johnson', 
      role: 'Project Manager',
      company: 'Indigenous Infrastructure',
      avatar: '👨🏿', 
      trustLevel: 'established',
      mutualConnections: 19,
      location: 'Darwin, NT',
      skills: ['Project Management', 'Construction', 'Leadership'],
      isConnected: false
    }
  ];

  const trustBadges = {
    verified: { icon: '✓', color: 'text-emerald', bg: 'bg-emerald/20', label: 'Verified' },
    trusted: { icon: '⭐', color: 'text-gold', bg: 'bg-gold/20', label: 'Trusted' },
    established: { icon: '💎', color: 'text-purple-royal', bg: 'bg-purple-royal/20', label: 'Established' },
    basic: { icon: '👤', color: 'text-white/60', bg: 'bg-white/10', label: 'Member' }
  };

  const filteredPeople = mockPeople.filter(person => {
    const matchesSearch = person.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          person.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          person.company?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="min-h-screen pt-24 pb-20">
      {/* Celestial Background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a1a] via-[#151530] to-[#1a1a2e]" />
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,215,0,0.15) 1px, transparent 0)',
          backgroundSize: '50px 50px'
        }} />
      </div>

      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link href="/connections" className="p-2 rounded-full hover:bg-white/10 transition-colors text-white">
            ← 
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">Find People</h1>
            <p className="text-white/60">Discover and grow your professional network</p>
          </div>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40">🔍</span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, role, company, or skills..."
              className="w-full pl-12 pr-4 py-4 bg-black/30 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-gold/50"
            />
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 overflow-x-auto pb-4 mb-6 scrollbar-hide">
          {filters.map(filter => (
            <button
              key={filter.id}
              onClick={() => setActiveFilter(filter.id)}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${
                activeFilter === filter.id
                  ? 'bg-gradient-to-r from-gold to-rose-gold text-black'
                  : 'bg-black/30 border border-white/10 text-white/70 hover:text-white hover:border-white/30'
              }`}
            >
              <span>{filter.icon}</span>
              {filter.label}
            </button>
          ))}
        </div>

        {/* Industry Filter */}
        <div className="mb-6">
          <select
            value={industryFilter}
            onChange={(e) => setIndustryFilter(e.target.value)}
            className="px-4 py-2 bg-black/30 border border-white/10 rounded-xl text-white focus:outline-none focus:border-gold/50"
          >
            {industries.map(industry => (
              <option key={industry} value={industry === 'All Industries' ? '' : industry}>
                {industry}
              </option>
            ))}
          </select>
        </div>

        {/* People Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredPeople.map(person => (
            <div key={person.id} className="royal-card p-5 hover:border-gold/30 transition-colors">
              <div className="flex items-start gap-4">
                {/* Avatar */}
                <Link href={`/profile/${person.id}`} className="block">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-royal/30 to-pink-blush/30 flex items-center justify-center text-3xl">
                    {person.avatar}
                  </div>
                </Link>
                
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Link href={`/profile/${person.id}`} className="font-medium text-white hover:underline">
                      {person.name}
                    </Link>
                    {person.trustLevel && trustBadges[person.trustLevel] && (
                      <span className={`text-sm ${trustBadges[person.trustLevel].color}`}>
                        {trustBadges[person.trustLevel].icon}
                      </span>
                    )}
                  </div>
                  <p className="text-white/70 text-sm truncate">{person.role}</p>
                  {person.company && (
                    <p className="text-white/50 text-sm truncate">{person.company}</p>
                  )}
                  <p className="text-white/40 text-xs mt-1">📍 {person.location}</p>
                  
                  {/* Skills */}
                  <div className="flex flex-wrap gap-1 mt-2">
                    {person.skills.slice(0, 3).map(skill => (
                      <span 
                        key={skill} 
                        className="px-2 py-0.5 rounded text-xs bg-white/5 text-white/60"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                  
                  {/* Mutual Connections */}
                  {person.mutualConnections > 0 && (
                    <p className="text-white/40 text-xs mt-2">
                      👥 {person.mutualConnections} mutual connections
                    </p>
                  )}
                </div>
              </div>
              
              {/* Action Button */}
              <div className="mt-4 pt-4 border-t border-white/10 flex gap-2">
                <button 
                  className={`flex-1 py-2 rounded-full text-sm font-medium transition-all ${
                    person.isConnected
                      ? 'bg-white/10 text-white'
                      : 'bg-gradient-to-r from-gold to-rose-gold text-black'
                  }`}
                >
                  {person.isConnected ? '✓ Connected' : 'Connect'}
                </button>
                <Link 
                  href={`/messages?user=${person.id}`}
                  className="px-4 py-2 rounded-full text-sm bg-white/10 text-white hover:bg-white/20 transition-colors"
                >
                  💬
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {filteredPeople.length === 0 && (
          <div className="royal-card p-8 text-center">
            <span className="text-4xl mb-4 block">🔍</span>
            <p className="text-white/60 mb-2">No people found</p>
            <p className="text-white/40 text-sm">Try adjusting your search or filters</p>
          </div>
        )}

        {/* Load More */}
        {filteredPeople.length > 0 && (
          <div className="mt-8 text-center">
            <button className="px-8 py-3 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors">
              Load More People
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
