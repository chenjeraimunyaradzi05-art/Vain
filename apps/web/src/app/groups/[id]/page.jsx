'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

/**
 * Group Detail Page
 * View group info, members, and posts
 */
export default function GroupDetailPage() {
  const params = useParams();
  const [activeTab, setActiveTab] = useState('feed');
  const [isMember, setIsMember] = useState(false);
  const [showMembers, setShowMembers] = useState(false);

  // Mock group data
  const group = {
    id: params.id,
    name: 'First Nations Tech Careers',
    category: 'industry',
    description: 'A supportive community for First Nations people pursuing careers in technology. Share resources, job opportunities, and support each other on your tech journey.',
    memberCount: 1247,
    postCount: 342,
    coverImage: null,
    isPrivate: false,
    moderators: ['admin1', 'admin2'],
    rules: [
      'Be respectful and supportive',
      'No spam or self-promotion without approval',
      'Keep discussions relevant to tech careers',
      'Protect confidential information',
      'Report inappropriate content'
    ],
    features: ['Job sharing allowed', 'Events enabled', 'Mentorship matching'],
    createdAt: '2024-03-15',
    tags: ['technology', 'careers', 'first-nations', 'coding', 'IT']
  };

  const tabs = [
    { id: 'feed', label: 'Feed', icon: '📰' },
    { id: 'about', label: 'About', icon: 'ℹ️' },
    { id: 'events', label: 'Events', icon: '📅' },
    { id: 'members', label: 'Members', icon: '👥' },
    { id: 'media', label: 'Media', icon: '🖼️' }
  ];

  const mockPosts = [
    {
      id: 1,
      author: { name: 'Sarah M.', avatar: '👩🏽' },
      content: 'Just landed my first software developer role! Thank you everyone in this community for the support and advice. The mock interviews were incredibly helpful! 🎉',
      likes: 89,
      comments: 23,
      time: '2 hours ago',
      isPinned: true
    },
    {
      id: 2,
      author: { name: 'Tech Corp AU', avatar: '🏢', isOrg: true },
      content: '[JOB] We\'re hiring junior developers! Aboriginal and Torres Strait Islander applicants encouraged. Remote-friendly, great mentorship program.',
      likes: 156,
      comments: 45,
      time: '5 hours ago'
    },
    {
      id: 3,
      author: { name: 'James K.', avatar: '👨🏿' },
      content: 'Anyone else doing the AWS certification? Would love to form a study group. Drop a comment if interested!',
      likes: 34,
      comments: 18,
      time: '1 day ago'
    }
  ];

  const mockEvents = [
    { id: 1, title: 'Tech Career Workshop', date: 'Mar 25, 2025', attendees: 45, isOnline: true },
    { id: 2, title: 'Monthly Networking Meet', date: 'Mar 28, 2025', attendees: 32, isOnline: false },
    { id: 3, title: 'Resume Review Session', date: 'Apr 2, 2025', attendees: 28, isOnline: true }
  ];

  const mockMembers = [
    { id: 1, name: 'Elder Mary T.', role: 'Moderator', avatar: '👩🏽', trustLevel: 'verified' },
    { id: 2, name: 'James K.', role: 'Member', avatar: '👨🏿', trustLevel: 'trusted' },
    { id: 3, name: 'Sarah M.', role: 'Member', avatar: '👩🏽', trustLevel: 'established' },
    { id: 4, name: 'David W.', role: 'Member', avatar: '👨🏽', trustLevel: 'basic' }
  ];

  const trustBadges = {
    verified: { color: 'text-emerald', label: '✓ Verified' },
    trusted: { color: 'text-gold', label: '⭐ Trusted' },
    established: { color: 'text-purple-royal', label: '💎 Established' },
    basic: { color: 'text-white/60', label: '' }
  };

  return (
    <div className="min-h-screen pt-20 pb-20">
      {/* Celestial Background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a1a] via-[#151530] to-[#1a1a2e]" />
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,215,0,0.15) 1px, transparent 0)',
          backgroundSize: '50px 50px'
        }} />
      </div>

      {/* Cover Image */}
      <div className="h-48 md:h-64 bg-gradient-to-r from-purple-royal via-pink-blush/30 to-emerald relative overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-8xl opacity-30">💻</span>
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        
        {/* Back Button */}
        <Link 
          href="/groups" 
          className="absolute top-4 left-4 p-2 rounded-full bg-black/30 backdrop-blur-sm text-white hover:bg-black/50 transition-colors"
        >
          ←
        </Link>
      </div>

      {/* Group Header */}
      <div className="container mx-auto px-4 max-w-4xl -mt-16 relative z-10">
        <div className="royal-card p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-start gap-4">
            {/* Group Icon */}
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-royal to-pink-blush flex items-center justify-center text-4xl -mt-12 border-4 border-[#1a1a2e]">
              💻
            </div>
            
            {/* Group Info */}
            <div className="flex-1">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-white mb-1">{group.name}</h1>
                  <p className="text-white/60">
                    <span className="capitalize">{group.category}</span> • {group.memberCount.toLocaleString()} members • {group.postCount} posts
                  </p>
                </div>
                
                {/* Join Button */}
                <button
                  onClick={() => setIsMember(!isMember)}
                  className={`px-6 py-2 rounded-full font-medium transition-all ${
                    isMember
                      ? 'bg-white/10 border border-white/20 text-white'
                      : 'btn-cta-royal'
                  }`}
                >
                  {isMember ? '✓ Joined' : 'Join Group'}
                </button>
              </div>
              
              {/* Description */}
              <p className="text-white/80 mt-4">{group.description}</p>
              
              {/* Tags */}
              <div className="flex flex-wrap gap-2 mt-4">
                {group.tags.map(tag => (
                  <span 
                    key={tag}
                    className="px-3 py-1 rounded-full text-xs bg-white/5 border border-white/10 text-white/70"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 overflow-x-auto pb-4 mb-6 scrollbar-hide">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-gold to-rose-gold text-black'
                  : 'bg-black/30 border border-white/10 text-white/70 hover:text-white hover:border-white/30'
              }`}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-4">
            {activeTab === 'feed' && (
              <>
                {/* Create Post */}
                {isMember && (
                  <Link href="/social-feed/new" className="block">
                    <div className="royal-card p-4 hover:border-gold/30 transition-colors cursor-pointer">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-royal/30 to-pink-blush/30 flex items-center justify-center">
                          👤
                        </div>
                        <div className="flex-1 bg-white/5 rounded-full px-4 py-2 text-white/40">
                          Share something with the group...
                        </div>
                      </div>
                    </div>
                  </Link>
                )}
                
                {/* Posts */}
                {mockPosts.map(post => (
                  <div key={post.id} className="royal-card p-4">
                    {post.isPinned && (
                      <div className="flex items-center gap-2 text-gold text-sm mb-3 pb-3 border-b border-white/10">
                        <span>📌</span> Pinned Post
                      </div>
                    )}
                    
                    <div className="flex items-start gap-3">
                      <div className="text-3xl">{post.author.avatar}</div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-white">{post.author.name}</span>
                          {post.author.isOrg && (
                            <span className="px-2 py-0.5 rounded text-xs bg-purple-royal/30 text-purple-royal">Org</span>
                          )}
                          <span className="text-white/40 text-sm">{post.time}</span>
                        </div>
                        <p className="text-white/80 mt-2">{post.content}</p>
                        
                        {/* Actions */}
                        <div className="flex items-center gap-4 mt-4 pt-3 border-t border-white/10">
                          <button className="flex items-center gap-2 text-white/60 hover:text-gold transition-colors">
                            <span>❤️</span> {post.likes}
                          </button>
                          <button className="flex items-center gap-2 text-white/60 hover:text-light-blue transition-colors">
                            <span>💬</span> {post.comments}
                          </button>
                          <button className="flex items-center gap-2 text-white/60 hover:text-emerald transition-colors">
                            <span>↗️</span> Share
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )}

            {activeTab === 'about' && (
              <div className="royal-card p-6 space-y-6">
                <div>
                  <h3 className="font-semibold text-white mb-3">About This Group</h3>
                  <p className="text-white/70">{group.description}</p>
                </div>
                
                <div>
                  <h3 className="font-semibold text-white mb-3">Community Rules</h3>
                  <ol className="list-decimal list-inside space-y-2 text-white/70">
                    {group.rules.map((rule, i) => (
                      <li key={i}>{rule}</li>
                    ))}
                  </ol>
                </div>
                
                <div>
                  <h3 className="font-semibold text-white mb-3">Features</h3>
                  <div className="flex flex-wrap gap-2">
                    {group.features.map(feature => (
                      <span key={feature} className="px-3 py-1 rounded-full text-sm bg-emerald/20 text-emerald">
                        ✓ {feature}
                      </span>
                    ))}
                  </div>
                </div>
                
                <div className="text-sm text-white/40">
                  Created {new Date(group.createdAt).toLocaleDateString()}
                </div>
              </div>
            )}

            {activeTab === 'events' && (
              <div className="space-y-4">
                {mockEvents.map(event => (
                  <div key={event.id} className="royal-card p-4 hover:border-gold/30 transition-colors cursor-pointer">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-purple-royal/30 to-pink-blush/30 flex items-center justify-center text-2xl">
                        📅
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-white">{event.title}</h3>
                        <p className="text-white/60 text-sm">{event.date}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-white/40 text-sm">👥 {event.attendees} going</span>
                          <span className={`text-sm ${event.isOnline ? 'text-emerald' : 'text-gold'}`}>
                            {event.isOnline ? '🌐 Online' : '📍 In-person'}
                          </span>
                        </div>
                      </div>
                      <button className="px-4 py-2 rounded-full text-sm bg-white/10 text-white hover:bg-white/20 transition-colors">
                        Interested
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'members' && (
              <div className="space-y-4">
                {mockMembers.map(member => (
                  <div key={member.id} className="royal-card p-4 flex items-center gap-4">
                    <div className="text-3xl">{member.avatar}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-white">{member.name}</span>
                        {member.trustLevel !== 'basic' && (
                          <span className={`text-sm ${trustBadges[member.trustLevel].color}`}>
                            {trustBadges[member.trustLevel].label}
                          </span>
                        )}
                      </div>
                      <p className="text-white/60 text-sm">{member.role}</p>
                    </div>
                    <button className="px-4 py-2 rounded-full text-sm bg-white/10 text-white hover:bg-white/20 transition-colors">
                      Connect
                    </button>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'media' && (
              <div className="royal-card p-6">
                <div className="grid grid-cols-3 gap-2">
                  {[1,2,3,4,5,6,7,8,9].map(i => (
                    <div key={i} className="aspect-square rounded-lg bg-white/5 flex items-center justify-center">
                      <span className="text-white/20">🖼️</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Quick Stats */}
            <div className="royal-card p-4">
              <h3 className="font-semibold text-white mb-4">Activity</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-gold">{group.memberCount}</p>
                  <p className="text-sm text-white/60">Members</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-emerald">{group.postCount}</p>
                  <p className="text-sm text-white/60">Posts</p>
                </div>
              </div>
            </div>

            {/* Moderators */}
            <div className="royal-card p-4">
              <h3 className="font-semibold text-white mb-4">Moderators</h3>
              <div className="space-y-3">
                {mockMembers.filter(m => m.role === 'Moderator').map(mod => (
                  <div key={mod.id} className="flex items-center gap-3">
                    <span className="text-2xl">{mod.avatar}</span>
                    <div>
                      <p className="font-medium text-white text-sm">{mod.name}</p>
                      <p className="text-emerald text-xs">✓ Verified</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Related Groups */}
            <div className="royal-card p-4">
              <h3 className="font-semibold text-white mb-4">Related Groups</h3>
              <div className="space-y-3">
                {['Tech Professionals', 'Career Changers', 'Remote Workers'].map(name => (
                  <Link key={name} href="/groups" className="flex items-center gap-3 hover:bg-white/5 -mx-2 px-2 py-1 rounded transition-colors">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-royal/30 to-pink-blush/30 flex items-center justify-center">
                      👥
                    </div>
                    <div>
                      <p className="font-medium text-white text-sm">{name}</p>
                      <p className="text-white/40 text-xs">500+ members</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
