'use client';

import { useState } from 'react';
import Link from 'next/link';

/**
 * Community Groups Page
 * Browse and discover groups by category
 */
export default function GroupsPage() {
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Theme colors
  const accentPink = '#E91E8C';
  const accentPurple = '#8B5CF6';

  const categories = [
    { id: 'all', label: 'All Groups', icon: '🌟' },
    { id: 'industry', label: 'Industry', icon: '🏭' },
    { id: 'role', label: 'Role-Based', icon: '�' },
    { id: 'life-stage', label: 'Life Stage', icon: '🌱' },
    { id: 'location', label: 'Location', icon: '�' },
    { id: 'interest', label: 'Interest', icon: '💡' }
  ];

  // Mock groups data
  const groups = [
    {
      id: '1',
      name: 'First Nations in Tech',
      category: 'industry',
      description: 'Connecting First Nations professionals in technology, software, and digital innovation.',
      memberCount: 2847,
      coverEmoji: '💻',
      isPrivate: false,
      isJoined: true,
      recentActivity: '15 new posts today'
    },
    {
      id: '2',
      name: 'Leadership Network',
      category: 'role',
      description: 'Empowering leaders in all fields. Professional development and networking for everyone.',
      memberCount: 5234,
      coverEmoji: '👑',
      isPrivate: false,
      isJoined: false,
      recentActivity: '8 new posts today'
    },
    {
      id: '3',
      name: 'Career Changers Support',
      category: 'life-stage',
      description: 'For those transitioning careers at any age. Share experiences and get advice.',
      memberCount: 1892,
      coverEmoji: '🔄',
      isPrivate: false,
      isJoined: true,
      recentActivity: '23 new posts today'
    },
    {
      id: '4',
      name: 'Sydney First Nations Professionals',
      category: 'location',
      description: 'Local networking and events for First Nations professionals in Sydney area.',
      memberCount: 876,
      coverEmoji: '🌉',
      isPrivate: false,
      isJoined: false,
      recentActivity: '5 new posts today'
    },
    {
      id: '5',
      name: 'Returning to Work Parents',
      category: 'life-stage',
      description: 'Support group for parents returning to the workforce. Tips, resources, and encouragement.',
      memberCount: 3421,
      coverEmoji: '�‍👩‍👧',
      isPrivate: false,
      isJoined: false,
      safetyMode: true,
      recentActivity: '12 new posts today'
    },
    {
      id: '6',
      name: 'Healthcare Professionals Circle',
      category: 'industry',
      description: 'First Nations healthcare workers sharing knowledge and opportunities.',
      memberCount: 1567,
      coverEmoji: '�',
      isPrivate: false,
      isJoined: true,
      recentActivity: '7 new posts today'
    },
    {
      id: '7',
      name: 'DV Survivors Career Support',
      category: 'life-stage',
      description: 'Safe, private space for DV survivors rebuilding their careers. Enhanced privacy protections.',
      memberCount: 432,
      coverEmoji: '�',
      isPrivate: true,
      isJoined: false,
      safetyMode: true,
      recentActivity: 'Private group'
    },
    {
      id: '8',
      name: 'Creative Industries Network',
      category: 'industry',
      description: 'Artists, designers, musicians, and creators connecting for opportunities.',
      memberCount: 2134,
      coverEmoji: '🎨',
      isPrivate: false,
      isJoined: false,
      recentActivity: '19 new posts today'
    }
  ];

  const filteredGroups = groups.filter(group => {
    const matchesCategory = activeCategory === 'all' || group.category === activeCategory;
    const matchesSearch = group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          group.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const myGroups = groups.filter(g => g.isJoined);

  return (
    <div className="ngurra-page pt-24 pb-20 relative overflow-hidden">
      {/* Decorative halos */}
      <div className="ngurra-halo-pink" />
      <div className="ngurra-halo-purple" />

      <div className="container mx-auto px-4 relative">
        {/* Header */}
        <div className="max-w-4xl mx-auto mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold mb-2 text-slate-800">
                Community Groups
                <span className="ml-2">👥</span>
              </h1>
              <p className="text-slate-500">Find your community and connect with like-minded professionals</p>
            </div>
            
            <Link 
              href="/groups/create" 
              className="px-6 py-3 rounded-full font-medium hidden md:flex items-center gap-2 text-white transition-all hover:scale-[1.02]"
              style={{ 
                background: `linear-gradient(135deg, ${accentPink} 0%, ${accentPurple} 100%)`,
                boxShadow: '0 4px 12px rgba(233, 30, 140, 0.3)'
              }}
            >
              <span>➕</span> Create Group
            </Link>
          </div>

          {/* Search */}
          <div className="relative mb-6">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
            <input
              type="text"
              placeholder="Search groups..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-full bg-white border-2 border-slate-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-100 transition-all"
            />
          </div>

          {/* Categories */}
          <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide">
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className="flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all"
                style={
                  activeCategory === cat.id
                    ? { background: `linear-gradient(135deg, ${accentPink} 0%, ${accentPurple} 100%)`, color: 'white' }
                    : { background: 'white', border: '1px solid #E2E8F0', color: '#64748B' }
                }
              >
                <span className="mr-1">{cat.icon}</span>
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* My Groups Section */}
        {myGroups.length > 0 && activeCategory === 'all' && !searchQuery && (
          <div className="max-w-4xl mx-auto mb-8">
            <h2 className="text-xl font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <span style={{ color: accentPink }}>💎</span> My Groups
            </h2>
            <div className="grid md:grid-cols-3 gap-4">
              {myGroups.map(group => (
                <Link 
                  key={group.id} 
                  href={`/groups/${group.id}`}
                  className="bg-white border border-slate-200 rounded-xl p-4 hover:border-pink-300 transition-all group"
                  style={{ boxShadow: '0 4px 20px rgba(15, 23, 42, 0.06)' }}
                >
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl group-hover:scale-110 transition-transform"
                      style={{ background: 'linear-gradient(135deg, rgba(233, 30, 140, 0.15) 0%, rgba(139, 92, 246, 0.15) 100%)' }}
                    >
                      {group.coverEmoji}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-medium text-slate-800 truncate">{group.name}</h3>
                      <p className="text-sm" style={{ color: accentPink }}>{group.recentActivity}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Discover Groups */}
        <div className="max-w-4xl mx-auto">
          <h2 className="text-xl font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <span style={{ color: accentPurple }}>✨</span> 
            {activeCategory === 'all' ? 'Discover Groups' : categories.find(c => c.id === activeCategory)?.label}
          </h2>
          
          {filteredGroups.length === 0 ? (
            <div 
              className="bg-white border border-slate-200 rounded-xl p-12 text-center"
              style={{ boxShadow: '0 4px 20px rgba(15, 23, 42, 0.06)' }}
            >
              <span className="text-5xl mb-4 block">🔍</span>
              <h3 className="text-xl font-medium text-slate-800 mb-2">No groups found</h3>
              <p className="text-slate-500 mb-6">Try adjusting your search or browse different categories</p>
              <button 
                onClick={() => { setSearchQuery(''); setActiveCategory('all'); }}
                className="px-6 py-2 rounded-full text-sm text-white"
                style={{ background: `linear-gradient(135deg, ${accentPink} 0%, ${accentPurple} 100%)` }}
              >
                Clear Filters
              </button>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {filteredGroups.map(group => (
                <article 
                  key={group.id}
                  className="bg-white border border-slate-200 rounded-xl p-5 hover:border-pink-300 transition-all"
                  style={{ boxShadow: '0 4px 20px rgba(15, 23, 42, 0.06)' }}
                >
                  <div className="flex items-start gap-4">
                    <div 
                      className="w-16 h-16 rounded-xl flex items-center justify-center text-3xl flex-shrink-0"
                      style={{ background: 'linear-gradient(135deg, rgba(233, 30, 140, 0.15) 0%, rgba(139, 92, 246, 0.15) 100%)' }}
                    >
                      {group.coverEmoji}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-slate-800 truncate">{group.name}</h3>
                        {group.isPrivate && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-600">🔒 Private</span>
                        )}
                        {group.safetyMode && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-pink-100 text-pink-600">🛡️ Safe</span>
                        )}
                      </div>
                      
                      <p className="text-sm text-slate-500 line-clamp-2 mb-3">{group.description}</p>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-400">
                          👥 {group.memberCount.toLocaleString()} members
                        </span>
                        
                        {group.isJoined ? (
                          <Link 
                            href={`/groups/${group.id}`}
                            className="text-sm px-4 py-1.5 rounded-full bg-pink-100 hover:bg-pink-200 transition-colors"
                            style={{ color: accentPink }}
                          >
                            Open
                          </Link>
                        ) : (
                          <button 
                            className="text-sm px-4 py-1.5 rounded-full bg-purple-100 hover:bg-purple-200 transition-colors"
                            style={{ color: accentPurple }}
                          >
                            {group.isPrivate ? 'Request to Join' : 'Join'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>

        {/* Create Group CTA - Mobile */}
        <div className="fixed bottom-20 right-4 md:hidden z-40">
          <Link 
            href="/groups/create"
            className="w-14 h-14 rounded-full flex items-center justify-center shadow-lg text-2xl text-white"
            style={{ 
              background: `linear-gradient(135deg, ${accentPink} 0%, ${accentPurple} 100%)`,
              boxShadow: '0 4px 20px rgba(233, 30, 140, 0.4)'
            }}
          >
            ➕
          </Link>
        </div>
      </div>
    </div>
  );
}
