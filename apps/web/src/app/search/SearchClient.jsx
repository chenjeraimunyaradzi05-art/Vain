'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Search, Loader2, Sparkles, Briefcase, Users, MessageSquare, Building2 } from 'lucide-react';

// Feminine theme constants
const accentPink = '#E91E8C';
const accentPurple = '#8B5CF6';

/**
 * Search Client Component
 * Global search across jobs, people, groups, and organizations
 */
export default function SearchClient() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  
  const [query, setQuery] = useState(initialQuery);
  const [activeTab, setActiveTab] = useState('all');
  const [isLoading, setIsLoading] = useState(false);

  const tabs = [
    { id: 'all', label: 'All Results', icon: '🔍' },
    { id: 'jobs', label: 'Jobs', icon: '💼' },
    { id: 'people', label: 'People', icon: '👥' },
    { id: 'groups', label: 'Groups', icon: '💬' },
    { id: 'organizations', label: 'Organizations', icon: '🏢' },
    { id: 'posts', label: 'Posts', icon: '📝' }
  ];

  // Search results seeded from real Australian institutions and programs
  const mockResults = {
    jobs: [
      { id: 1, type: 'job', title: 'Mobile Plant Operator (Entry Pathway)', company: 'BHP', location: 'Pilbara, WA (FIFO)', salary: '$90k-$125k' },
      { id: 2, type: 'job', title: 'Customer Service Consultant', company: 'Telstra', location: 'Sydney, NSW (Hybrid)', salary: '$60k-$75k' },
      { id: 3, type: 'job', title: 'Junior Software Engineer', company: 'Canva', location: 'Sydney, NSW (Hybrid)', salary: '$110k-$150k' }
    ],
    people: [
      { id: 1, type: 'person', name: 'Community Member', role: 'Software Engineer at Atlassian', avatar: '👩🏽', trustLevel: 'verified' },
      { id: 2, type: 'person', name: 'Community Member', role: 'Mentor \u2014 Mining & Resources', avatar: '👨🏾', trustLevel: 'trusted' },
      { id: 3, type: 'person', name: 'Community Member', role: 'Career Coach at CareerTrackers', avatar: '👩🏻', trustLevel: 'established' }
    ],
    groups: [
      { id: 1, type: 'group', name: 'First Nations in Tech', members: 1247, icon: '💻' },
      { id: 2, type: 'group', name: 'Tech Professionals Network', members: 3456, icon: '�' },
      { id: 3, type: 'group', name: 'FIFO Workers Community', members: 892, icon: '⛏️' }
    ],
    organizations: [
      { id: 1, type: 'org', name: 'Indigenous Business Australia', followers: 4820, verified: true },
      { id: 2, type: 'org', name: 'Supply Nation', followers: 3690, verified: true },
      { id: 3, type: 'org', name: 'CareerTrackers', followers: 2560, verified: true }
    ],
    posts: [
      { id: 1, type: 'post', author: 'Ngurra Pathways', content: 'New partnership with TAFE Queensland announced...', likes: 312 },
      { id: 2, type: 'post', author: 'BHP Careers', content: 'Applications open for 2026 apprenticeships...', likes: 478 }
    ]
  };

  const getFilteredResults = () => {
    if (activeTab === 'all') {
      return [
        ...mockResults.jobs.slice(0, 2),
        ...mockResults.people.slice(0, 2),
        ...mockResults.groups.slice(0, 2),
        ...mockResults.organizations.slice(0, 2)
      ];
    }
    return mockResults[activeTab] || [];
  };

  const results = query.length > 0 ? getFilteredResults() : [];

  const trustBadges = {
    verified: { icon: '✓', color: 'text-emerald' },
    trusted: { icon: '⭐', color: 'text-gold' },
    established: { icon: '💎', color: 'text-purple-royal' }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 500);
  };

  return (
    <div className="ngurra-page pt-24 pb-20">
      {/* Decorative Halos */}
      <div className="ngurra-halos">
        <div className="ngurra-halo-pink" />
        <div className="ngurra-halo-purple" />
      </div>

      <div className="container mx-auto px-4 max-w-4xl relative z-10">
        {/* Search Header */}
        <form onSubmit={handleSearch} className="mb-8">
          <div className="relative">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search jobs, people, groups, organizations..."
              className="w-full pl-14 pr-32 py-5 bg-white border-2 border-slate-200 rounded-2xl text-slate-800 text-lg placeholder-slate-400 focus:outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-100 transition-all"
              style={{ boxShadow: '0 4px 20px rgba(15, 23, 42, 0.06)' }}
              autoFocus
            />
            <button
              type="submit"
              className="absolute right-3 top-1/2 -translate-y-1/2 px-6 py-2 rounded-xl text-white font-medium transition-all hover:scale-105"
              style={{ 
                background: `linear-gradient(135deg, ${accentPink} 0%, ${accentPurple} 100%)`,
                boxShadow: '0 4px 12px rgba(233, 30, 140, 0.3)'
              }}
            >
              Search
            </button>
          </div>
        </form>

        {/* Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-4 mb-6 scrollbar-hide">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${
                activeTab === tab.id
                  ? 'text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:border-pink-300'
              }`}
              style={activeTab === tab.id ? {
                background: `linear-gradient(135deg, ${accentPink} 0%, ${accentPurple} 100%)`,
                boxShadow: '0 4px 12px rgba(233, 30, 140, 0.3)'
              } : {}}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Results */}
        {isLoading ? (
          <div className="text-center py-12">
            <Loader2 className="w-8 h-8 text-pink-600 animate-spin mx-auto mb-4" />
            <p className="text-slate-500">Searching...</p>
          </div>
        ) : query.length === 0 ? (
          <div className="text-center py-12">
            <div className="p-4 rounded-2xl bg-pink-50 inline-block mb-4">
              <Search className="w-10 h-10 text-pink-600" />
            </div>
            <h2 className="text-xl font-semibold text-slate-800 mb-2">Start your search</h2>
            <p className="text-slate-500">Find jobs, connect with people, or discover groups</p>
            
            {/* Quick Links */}
            <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl mx-auto">
              <Link href="/jobs" className="bg-white border border-slate-200 rounded-xl p-4 text-center hover:border-pink-300 transition-colors" style={{ boxShadow: '0 4px 20px rgba(15, 23, 42, 0.06)' }}>
                <div className="p-2 rounded-xl bg-pink-50 inline-block mb-2">
                  <Briefcase className="w-6 h-6 text-pink-600" />
                </div>
                <p className="text-slate-700 text-sm">Browse Jobs</p>
              </Link>
              <Link href="/connections/find" className="bg-white border border-slate-200 rounded-xl p-4 text-center hover:border-pink-300 transition-colors" style={{ boxShadow: '0 4px 20px rgba(15, 23, 42, 0.06)' }}>
                <div className="p-2 rounded-xl bg-purple-50 inline-block mb-2">
                  <Users className="w-6 h-6 text-purple-600" />
                </div>
                <p className="text-slate-700 text-sm">Find People</p>
              </Link>
              <Link href="/groups" className="bg-white border border-slate-200 rounded-xl p-4 text-center hover:border-pink-300 transition-colors" style={{ boxShadow: '0 4px 20px rgba(15, 23, 42, 0.06)' }}>
                <div className="p-2 rounded-xl bg-pink-50 inline-block mb-2">
                  <MessageSquare className="w-6 h-6 text-pink-600" />
                </div>
                <p className="text-slate-700 text-sm">Join Groups</p>
              </Link>
              <Link href="/organizations" className="bg-white border border-slate-200 rounded-xl p-4 text-center hover:border-pink-300 transition-colors" style={{ boxShadow: '0 4px 20px rgba(15, 23, 42, 0.06)' }}>
                <div className="p-2 rounded-xl bg-purple-50 inline-block mb-2">
                  <Building2 className="w-6 h-6 text-purple-600" />
                </div>
                <p className="text-slate-700 text-sm">Organizations</p>
              </Link>
            </div>
          </div>
        ) : results.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">😕</div>
            <h2 className="text-xl font-semibold text-slate-800 mb-2">No results found</h2>
            <p className="text-slate-500">Try different keywords or browse categories</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Section Headers for "All" tab */}
            {activeTab === 'all' && (
              <>
                {/* Jobs Section */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="font-semibold text-slate-800 flex items-center gap-2">
                      <Briefcase className="w-4 h-4 text-pink-600" /> Jobs
                    </h2>
                    <Link href={`/jobs?q=${query}`} className="text-pink-600 text-sm hover:text-pink-700 font-medium">
                      See all →
                    </Link>
                  </div>
                  {mockResults.jobs.slice(0, 2).map(job => (
                    <Link key={job.id} href={`/jobs/${job.id}`}>
                      <div className="bg-white border border-slate-200 rounded-xl p-4 mb-2 hover:border-pink-300 transition-colors" style={{ boxShadow: '0 4px 20px rgba(15, 23, 42, 0.06)' }}>
                        <h3 className="font-medium text-slate-800">{job.title}</h3>
                        <p className="text-slate-500 text-sm">{job.company} • {job.location}</p>
                        <p className="text-pink-600 text-sm mt-1">{job.salary}</p>
                      </div>
                    </Link>
                  ))}
                </div>

                {/* People Section */}
                <div className="mt-6">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="font-semibold text-slate-800 flex items-center gap-2">
                      <Users className="w-4 h-4 text-purple-600" /> People
                    </h2>
                    <Link href={`/connections/find?q=${query}`} className="text-pink-600 text-sm hover:text-pink-700 font-medium">
                      See all →
                    </Link>
                  </div>
                  {mockResults.people.slice(0, 2).map(person => (
                    <Link key={person.id} href={`/profile/${person.id}`}>
                      <div className="bg-white border border-slate-200 rounded-xl p-4 mb-2 hover:border-pink-300 transition-colors flex items-center gap-4" style={{ boxShadow: '0 4px 20px rgba(15, 23, 42, 0.06)' }}>
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-100 to-purple-100 flex items-center justify-center text-2xl border-2 border-pink-200">{person.avatar}</div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium text-slate-800">{person.name}</h3>
                            {trustBadges[person.trustLevel] && (
                              <span className={trustBadges[person.trustLevel].color}>
                                {trustBadges[person.trustLevel].icon}
                              </span>
                            )}
                          </div>
                          <p className="text-slate-500 text-sm">{person.role}</p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>

                {/* Groups Section */}
                <div className="mt-6">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="font-semibold text-slate-800 flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-pink-600" /> Groups
                    </h2>
                    <Link href="/groups" className="text-pink-600 text-sm hover:text-pink-700 font-medium">
                      See all →
                    </Link>
                  </div>
                  {mockResults.groups.slice(0, 2).map(group => (
                    <Link key={group.id} href={`/groups/${group.id}`}>
                      <div className="bg-white border border-slate-200 rounded-xl p-4 mb-2 hover:border-pink-300 transition-colors flex items-center gap-4" style={{ boxShadow: '0 4px 20px rgba(15, 23, 42, 0.06)' }}>
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center text-2xl border-2 border-purple-200">
                          {group.icon}
                        </div>
                        <div>
                          <h3 className="font-medium text-slate-800">{group.name}</h3>
                          <p className="text-slate-500 text-sm">{group.members.toLocaleString()} members</p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </>
            )}

            {/* Specific tab results */}
            {activeTab !== 'all' && results.map((result, idx) => (
              <Link key={idx} href={
                result.type === 'job' ? `/jobs/${result.id}` :
                result.type === 'person' ? `/profile/${result.id}` :
                result.type === 'group' ? `/groups/${result.id}` :
                result.type === 'org' ? `/organizations/${result.id}` :
                `/social-feed`
              }>
                <div className="bg-white border border-slate-200 rounded-xl p-4 hover:border-pink-300 transition-colors" style={{ boxShadow: '0 4px 20px rgba(15, 23, 42, 0.06)' }}>
                  {result.type === 'job' && (
                    <>
                      <h3 className="font-medium text-slate-800">{result.title}</h3>
                      <p className="text-slate-500 text-sm">{result.company} • {result.location}</p>
                      <p className="text-pink-600 text-sm mt-1">{result.salary}</p>
                    </>
                  )}
                  {result.type === 'person' && (
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-100 to-purple-100 flex items-center justify-center text-2xl border-2 border-pink-200">{result.avatar}</div>
                      <div>
                        <h3 className="font-medium text-slate-800">{result.name}</h3>
                        <p className="text-slate-500 text-sm">{result.role}</p>
                      </div>
                    </div>
                  )}
                  {result.type === 'group' && (
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center text-2xl border-2 border-purple-200">
                        {result.icon}
                      </div>
                      <div>
                        <h3 className="font-medium text-slate-800">{result.name}</h3>
                        <p className="text-slate-500 text-sm">{result.members.toLocaleString()} members</p>
                      </div>
                    </div>
                  )}
                  {result.type === 'org' && (
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-100 to-emerald-100 flex items-center justify-center text-2xl border-2 border-blue-200">
                        🏢
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-slate-800">{result.name}</h3>
                          {result.verified && <span className="text-emerald-600">✓</span>}
                        </div>
                        <p className="text-slate-500 text-sm">{result.followers.toLocaleString()} followers</p>
                      </div>
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
