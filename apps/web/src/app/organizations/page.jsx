'use client';

import { useState } from 'react';
import Link from 'next/link';

/**
 * Organizations Page
 * Discover and follow organizations, employers, and communities
 */
export default function OrganizationsPage() {
  // Theme colors
  const accentPink = '#E91E8C';
  const accentPurple = '#8B5CF6';
  
  const [activeType, setActiveType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const orgTypes = [
    { id: 'all', label: 'All', icon: '🌟' },
    { id: 'employer', label: 'Employers', icon: '🏢' },
    { id: 'community_org', label: 'Community', icon: '🤝' },
    { id: 'training_provider', label: 'Training', icon: '🎓' },
    { id: 'government', label: 'Government', icon: '🏛️' },
    { id: 'support_service', label: 'Services', icon: '💜' },
    { id: 'mentorship_network', label: 'Mentorship', icon: '🌱' }
  ];

  // Mock organizations data
  const organizations = [
    {
      id: '1',
      name: 'Indigenous Business Australia',
      type: 'government',
      tagline: 'Building Indigenous prosperity through economic empowerment',
      logo: '🏛️',
      followerCount: 15420,
      isVerified: true,
      isFollowing: true,
      jobCount: 12,
      location: 'National'
    },
    {
      id: '2',
      name: 'First Nations Tech Collective',
      type: 'employer',
      tagline: 'Empowering First Nations tech talent across Australia',
      logo: '💻',
      followerCount: 8934,
      isVerified: true,
      isFollowing: false,
      jobCount: 8,
      location: 'Sydney, Melbourne'
    },
    {
      id: '3',
      name: 'Deadly Jobs Network',
      type: 'community_org',
      tagline: 'Connecting mob with deadly career opportunities',
      logo: '🔥',
      followerCount: 23567,
      isVerified: true,
      isFollowing: true,
      jobCount: 45,
      location: 'National'
    },
    {
      id: '4',
      name: 'Leadership Institute',
      type: 'training_provider',
      tagline: 'Developing the next generation of leaders',
      logo: '👑',
      followerCount: 12890,
      isVerified: true,
      isFollowing: false,
      location: 'Online'
    },
    {
      id: '5',
      name: 'Safe Employment Services',
      type: 'support_service',
      tagline: 'Confidential career support for DV survivors',
      logo: '💜',
      followerCount: 3421,
      isVerified: true,
      isFollowing: false,
      safeSpace: true,
      location: 'National'
    },
    {
      id: '6',
      name: 'Mining Corp Australia',
      type: 'employer',
      tagline: 'RAP committed employer with Indigenous pathways program',
      logo: '⛏️',
      followerCount: 7654,
      isVerified: true,
      isFollowing: false,
      hasRAP: true,
      jobCount: 23,
      location: 'WA, QLD, NT'
    },
    {
      id: '7',
      name: 'Elders Mentorship Circle',
      type: 'mentorship_network',
      tagline: 'Traditional wisdom meets modern career guidance',
      logo: '🌿',
      followerCount: 4532,
      isVerified: true,
      isFollowing: true,
      location: 'National'
    },
    {
      id: '8',
      name: 'TAFE NSW',
      type: 'training_provider',
      tagline: 'Skill up for your future with accredited training',
      logo: '🎓',
      followerCount: 45678,
      isVerified: true,
      isFollowing: false,
      location: 'NSW'
    }
  ];

  const filteredOrgs = organizations.filter(org => {
    const matchesType = activeType === 'all' || org.type === activeType;
    const matchesSearch = org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          org.tagline.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  const followingOrgs = organizations.filter(o => o.isFollowing);

  return (
    <div className="ngurra-page pt-24 pb-20 relative overflow-hidden">
      {/* Decorative halos */}
      <div className="ngurra-halo-pink" />
      <div className="ngurra-halo-purple" />

      <div className="container mx-auto px-4 relative">
        {/* Header */}
        <div className="max-w-5xl mx-auto mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold mb-2">
                <span 
                  className="text-transparent bg-clip-text"
                  style={{ backgroundImage: `linear-gradient(135deg, ${accentPink} 0%, ${accentPurple} 100%)` }}
                >
                  Organizations
                </span>
                <span className="ml-2">🏢</span>
              </h1>
              <p className="text-slate-500">Discover employers, services, and communities committed to your success</p>
            </div>
          </div>

          {/* Search */}
          <div className="relative mb-6">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
            <input
              type="text"
              placeholder="Search organizations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-full bg-white border-2 border-slate-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-100 transition-all"
            />
          </div>

          {/* Type Filter */}
          <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide">
            {orgTypes.map(type => (
              <button
                key={type.id}
                onClick={() => setActiveType(type.id)}
                className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  activeType === type.id
                    ? 'text-white'
                    : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-800 hover:border-pink-300'
                }`}
                style={activeType === type.id ? {
                  background: `linear-gradient(135deg, ${accentPink} 0%, ${accentPurple} 100%)`,
                  boxShadow: '0 4px 12px rgba(233, 30, 140, 0.3)'
                } : {}}
              >
                <span className="mr-1">{type.icon}</span>
                {type.label}
              </button>
            ))}
          </div>
        </div>

        {/* Following Section */}
        {followingOrgs.length > 0 && activeType === 'all' && !searchQuery && (
          <div className="max-w-5xl mx-auto mb-8">
            <h2 className="text-xl font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <span style={{ color: accentPink }}>⭐</span> Following
            </h2>
            <div className="grid md:grid-cols-4 gap-4">
              {followingOrgs.map(org => (
                <Link 
                  key={org.id} 
                  href={`/organizations/${org.id}`}
                  className="bg-white border border-slate-200 rounded-xl p-4 hover:border-pink-300 transition-all group text-center"
                  style={{ boxShadow: '0 4px 20px rgba(15, 23, 42, 0.06)' }}
                >
                  <div 
                    className="w-16 h-16 mx-auto rounded-xl flex items-center justify-center text-3xl mb-3 group-hover:scale-110 transition-transform"
                    style={{ background: 'linear-gradient(135deg, rgba(233, 30, 140, 0.15) 0%, rgba(139, 92, 246, 0.15) 100%)' }}
                  >
                    {org.logo}
                  </div>
                  <h3 className="font-medium text-slate-800 text-sm truncate">{org.name}</h3>
                  {org.jobCount > 0 && (
                    <p className="text-xs mt-1" style={{ color: accentPink }}>{org.jobCount} open positions</p>
                  )}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Organizations Grid */}
        <div className="max-w-5xl mx-auto">
          <h2 className="text-xl font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <span style={{ color: accentPink }}>✨</span>
            {activeType === 'all' ? 'Discover Organizations' : orgTypes.find(t => t.id === activeType)?.label}
          </h2>
          
          {filteredOrgs.length === 0 ? (
            <div 
              className="bg-white border border-slate-200 rounded-xl p-12 text-center"
              style={{ boxShadow: '0 4px 20px rgba(15, 23, 42, 0.06)' }}
            >
              <span className="text-5xl mb-4 block">🔍</span>
              <h3 className="text-xl font-medium text-slate-800 mb-2">No organizations found</h3>
              <p className="text-slate-500 mb-6">Try adjusting your search or browse different categories</p>
              <button 
                onClick={() => { setSearchQuery(''); setActiveType('all'); }}
                className="px-6 py-2 rounded-full text-sm text-white font-medium transition-all hover:opacity-90"
                style={{ 
                  background: `linear-gradient(135deg, ${accentPink} 0%, ${accentPurple} 100%)`,
                  boxShadow: '0 4px 12px rgba(233, 30, 140, 0.3)'
                }}
              >
                Clear Filters
              </button>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredOrgs.map(org => (
                <Link 
                  key={org.id}
                  href={`/organizations/${org.id}`}
                  className="bg-white border border-slate-200 rounded-xl p-5 hover:border-pink-300 transition-all group"
                  style={{ boxShadow: '0 4px 20px rgba(15, 23, 42, 0.06)' }}
                >
                  <div className="flex items-start gap-4">
                    <div 
                      className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 group-hover:scale-110 transition-transform"
                      style={{ background: 'linear-gradient(135deg, rgba(233, 30, 140, 0.15) 0%, rgba(139, 92, 246, 0.15) 100%)' }}
                    >
                      {org.logo}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-slate-800 truncate">{org.name}</h3>
                        {org.isVerified && (
                          <span style={{ color: accentPink }} className="text-sm">✓✓</span>
                        )}
                      </div>
                      
                      <div className="flex flex-wrap gap-1 mb-2">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                          {orgTypes.find(t => t.id === org.type)?.label}
                        </span>
                        {org.hasRAP && (
                          <span className="text-xs px-2 py-0.5 rounded-full text-white" style={{ background: accentPurple }}>
                            RAP ✓
                          </span>
                        )}
                        {org.safeSpace && (
                          <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(233, 30, 140, 0.15)', color: accentPink }}>
                            🛡️ Safe
                          </span>
                        )}
                      </div>
                      
                      <p className="text-sm text-slate-500 line-clamp-2 mb-3">{org.tagline}</p>
                      
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-400">
                          👥 {org.followerCount.toLocaleString()} followers
                        </span>
                        
                        {org.jobCount > 0 && (
                          <span style={{ color: accentPink }}>
                            💼 {org.jobCount} jobs
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs text-slate-400">📍 {org.location}</span>
                    
                    {org.isFollowing ? (
                      <span 
                        className="text-sm px-4 py-1.5 rounded-full text-white"
                        style={{ background: accentPurple }}
                      >
                        Following ✓
                      </span>
                    ) : (
                      <span 
                        className="text-sm px-4 py-1.5 rounded-full group-hover:opacity-90 transition-opacity"
                        style={{ background: 'rgba(233, 30, 140, 0.15)', color: accentPink }}
                      >
                        Follow
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
