'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from '@/components/ui/OptimizedImage';
import { isCloudinaryPublicId } from '@/lib/cloudinary';
import { Space_Grotesk } from 'next/font/google';
import { 
  Users, ArrowLeft, UserPlus, UserMinus, Search, 
  Building2, Briefcase, MapPin, MoreHorizontal
} from 'lucide-react';

const spaceGrotesk = Space_Grotesk({ 
  subsets: ['latin'], 
  weight: ['400', '500', '700'],
  variable: '--font-space-grotesk'
});

interface FollowedEntity {
  id: string;
  type: 'person' | 'organization' | 'topic';
  name: string;
  avatar: string;
  description: string;
  followersCount: number;
  postsCount: number;
  isFollowing: boolean;
  location?: string;
}

export default function FollowingPage() {
  const [activeTab, setActiveTab] = useState<'all' | 'people' | 'organizations' | 'topics'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [following, setFollowing] = useState<FollowedEntity[]>([]);
  const [loading, setLoading] = useState(true);

  const mockFollowing: FollowedEntity[] = [
    {
      id: '1',
      type: 'person',
      name: 'Dr. Chelsea Bond',
      avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&h=100&fit=crop',
      description: 'Associate Professor @ UQ | Munanjahli & Yugambeh | Championing First Nations excellence in academia',
      followersCount: 12500,
      postsCount: 234,
      isFollowing: true,
      location: 'Brisbane, QLD'
    },
    {
      id: '2',
      type: 'organization',
      name: 'Deadly Science',
      avatar: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=100&h=100&fit=crop',
      description: 'STEM Education Organization providing resources and mentorship to First Nations students',
      followersCount: 8900,
      postsCount: 156,
      isFollowing: true
    },
    {
      id: '3',
      type: 'person',
      name: 'Jarrah Williams',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop',
      description: 'Software Developer @ Atlassian | Kimberley proud | Mentoring in tech',
      followersCount: 4200,
      postsCount: 89,
      isFollowing: true,
      location: 'Sydney, NSW'
    },
    {
      id: '4',
      type: 'organization',
      name: 'BHP Indigenous Employment',
      avatar: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=100&h=100&fit=crop',
      description: 'Committed to 10% First Nations employment. Creating pathways in mining and resources.',
      followersCount: 15600,
      postsCount: 312,
      isFollowing: true
    },
    {
      id: '5',
      type: 'topic',
      name: '#FirstNationsInTech',
      avatar: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=100&h=100&fit=crop',
      description: 'Community of First Nations professionals in technology, sharing stories and opportunities',
      followersCount: 5400,
      postsCount: 1890,
      isFollowing: true
    },
    {
      id: '6',
      type: 'person',
      name: 'Aunty Marcia Langton',
      avatar: 'https://images.unsplash.com/photo-1594744803329-e58b31de8bf5?w=100&h=100&fit=crop',
      description: 'Cultural Elder & Community Leader | Advocating for Indigenous rights and employment',
      followersCount: 28000,
      postsCount: 567,
      isFollowing: true,
      location: 'Melbourne, VIC'
    },
    {
      id: '7',
      type: 'organization',
      name: 'First Nations Mining Academy',
      avatar: 'https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=100&h=100&fit=crop',
      description: 'Training and employment pathways for First Nations peoples in the mining sector',
      followersCount: 3200,
      postsCount: 78,
      isFollowing: true
    },
    {
      id: '8',
      type: 'topic',
      name: '#DeadlyCareers',
      avatar: 'https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=100&h=100&fit=crop',
      description: 'Celebrating career achievements and sharing opportunities for First Nations communities',
      followersCount: 3800,
      postsCount: 945,
      isFollowing: true
    }
  ];

  useEffect(() => {
    setTimeout(() => {
      setFollowing(mockFollowing);
      setLoading(false);
    }, 500);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleUnfollow = (id: string) => {
    setFollowing(prev => prev.map(item => 
      item.id === id ? { ...item, isFollowing: false } : item
    ));
  };

  const handleFollow = (id: string) => {
    setFollowing(prev => prev.map(item => 
      item.id === id ? { ...item, isFollowing: true } : item
    ));
  };

  const filteredFollowing = following.filter(item => {
    const matchesTab = activeTab === 'all' || 
      (activeTab === 'people' && item.type === 'person') ||
      (activeTab === 'organizations' && item.type === 'organization') ||
      (activeTab === 'topics' && item.type === 'topic');
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'person': return 'text-pink-500 bg-pink-100';
      case 'organization': return 'text-purple-500 bg-purple-100';
      case 'topic': return 'text-pink-500 bg-pink-100';
      default: return 'text-slate-400 bg-slate-100';
    }
  };

  // Theme colors
  const accentPink = '#E91E8C';
  const accentPurple = '#8B5CF6';

  const formatCount = (count: number) => {
    if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
    return count.toString();
  };

  return (
    <div className={`${spaceGrotesk.className} ngurra-page relative overflow-hidden`}>
      {/* Decorative halos */}
      <div className="ngurra-halo-pink" />
      <div className="ngurra-halo-purple" />

      <div className="relative max-w-4xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link 
            href="/"
            className="p-2 rounded-lg bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-pink-600 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Users className="w-6 h-6" style={{ color: accentPink }} />
              Following
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              {following.filter(f => f.isFollowing).length} people, organizations, and topics you follow
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search who you follow..."
            className="w-full bg-white text-slate-800 placeholder-slate-400 rounded-lg pl-10 pr-4 py-3 border-2 border-slate-200 focus:outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-100 transition-all"
          />
        </div>

        {/* Tabs */}
        <div className="flex gap-2 flex-wrap mb-6">
          {[
            { id: 'all', label: 'All', count: following.length },
            { id: 'people', label: 'People', count: following.filter(i => i.type === 'person').length },
            { id: 'organizations', label: 'Organizations', count: following.filter(i => i.type === 'organization').length },
            { id: 'topics', label: 'Topics', count: following.filter(i => i.type === 'topic').length },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2"
              style={
                activeTab === tab.id 
                  ? { background: `linear-gradient(135deg, ${accentPink} 0%, ${accentPurple} 100%)`, color: 'white' }
                  : { background: 'white', border: '1px solid #E2E8F0', color: '#64748B' }
              }
            >
              {tab.label}
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                activeTab === tab.id ? 'bg-white/20' : 'bg-slate-100'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Following List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-12 h-12 rounded-full border-4 border-pink-200 border-t-pink-500 animate-spin" />
          </div>
        ) : filteredFollowing.length === 0 ? (
          <div className="text-center py-20">
            <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-800 mb-2">No results found</h3>
            <p className="text-slate-500 mb-6">
              {searchQuery ? 'Try a different search term' : 'You\'re not following anyone yet'}
            </p>
            <Link 
              href="/connections/find"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-white font-medium transition-all hover:scale-[1.02]"
              style={{ 
                background: `linear-gradient(135deg, ${accentPink} 0%, ${accentPurple} 100%)`,
                boxShadow: '0 4px 12px rgba(233, 30, 140, 0.3)'
              }}
            >
              <UserPlus className="w-5 h-5" />
              Find People to Follow
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredFollowing.map((item) => (
              <article 
                key={item.id}
                className="rounded-xl overflow-hidden bg-white border border-slate-200 hover:border-pink-300 transition-colors p-4"
                style={{ boxShadow: '0 4px 20px rgba(15, 23, 42, 0.06)' }}
              >
                <div className="flex items-start gap-4">
                  {/* Avatar */}
                  <Link href={item.type === 'topic' ? `/search?q=${item.name}` : `/profile/${item.id}`}>
                    <div className="w-14 h-14 rounded-full overflow-hidden shrink-0">
                      <Image
                        src={item.avatar}
                        alt={item.name}
                        width={56}
                        height={56}
                        cloudinary={isCloudinaryPublicId(item.avatar)}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </Link>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <Link 
                        href={item.type === 'topic' ? `/search?q=${item.name}` : `/profile/${item.id}`}
                        className="font-semibold text-slate-800 hover:text-pink-600 transition-colors"
                      >
                        {item.name}
                      </Link>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${getTypeColor(item.type)}`}>
                        {item.type === 'person' ? 'Person' : item.type === 'organization' ? 'Organization' : 'Topic'}
                      </span>
                    </div>
                    
                    {item.location && (
                      <div className="flex items-center gap-1 text-xs text-slate-400 mb-1">
                        <MapPin className="w-3 h-3" />
                        {item.location}
                      </div>
                    )}
                    
                    <p className="text-sm text-slate-500 mb-2 line-clamp-2">{item.description}</p>
                    
                    <div className="flex items-center gap-4 text-xs text-slate-400">
                      <span>{formatCount(item.followersCount)} followers</span>
                      <span>{formatCount(item.postsCount)} posts</span>
                    </div>
                  </div>
                  
                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {item.isFollowing ? (
                      <button 
                        onClick={() => handleUnfollow(item.id)}
                        className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors flex items-center gap-2"
                      >
                        <UserMinus className="w-4 h-4" />
                        <span className="hidden sm:inline">Unfollow</span>
                      </button>
                    ) : (
                      <button 
                        onClick={() => handleFollow(item.id)}
                        className="px-4 py-2 rounded-lg text-white text-sm font-medium transition-all flex items-center gap-2"
                        style={{ background: `linear-gradient(135deg, ${accentPink} 0%, ${accentPurple} 100%)` }}
                      >
                        <UserPlus className="w-4 h-4" />
                        <span className="hidden sm:inline">Follow</span>
                      </button>
                    )}
                    <button className="p-2 rounded-lg text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors">
                      <MoreHorizontal className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        {/* Suggestions */}
        <div 
          className="mt-8 rounded-xl bg-white border border-slate-200 p-6"
          style={{ boxShadow: '0 4px 20px rgba(15, 23, 42, 0.06)' }}
        >
          <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <UserPlus className="w-5 h-5" style={{ color: accentPink }} />
            Suggested for You
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { name: 'Rio Tinto Careers', type: 'Organization', avatar: '🏭' },
              { name: 'TAFE Queensland', type: 'Organization', avatar: '🎓' },
              { name: '#IndigenousExcellence', type: 'Topic', avatar: '✨' },
              { name: 'Sarah Mitchell', type: 'Person', avatar: '👩' },
            ].map((suggestion, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-10 h-10 rounded-full flex items-center justify-center text-lg"
                    style={{ background: 'linear-gradient(135deg, rgba(233, 30, 140, 0.15) 0%, rgba(139, 92, 246, 0.15) 100%)' }}
                  >
                    {suggestion.avatar}
                  </div>
                  <div>
                    <div className="font-medium text-slate-800 text-sm">{suggestion.name}</div>
                    <div className="text-xs text-slate-400">{suggestion.type}</div>
                  </div>
                </div>
                <button 
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                  style={{ background: 'rgba(233, 30, 140, 0.1)', color: accentPink }}
                >
                  Follow
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
