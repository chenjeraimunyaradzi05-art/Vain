'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from '@/components/ui/OptimizedImage';
import { isCloudinaryPublicId } from '@/lib/cloudinary';
import { Space_Grotesk } from 'next/font/google';
import { 
  Bookmark, ArrowLeft, Heart, MessageCircle, Share2,
  MoreHorizontal, Filter, Search, Briefcase, FileText, Calendar
} from 'lucide-react';

const spaceGrotesk = Space_Grotesk({ 
  subsets: ['latin'], 
  weight: ['400', '500', '700'],
  variable: '--font-space-grotesk'
});

interface SavedItem {
  id: string;
  type: 'post' | 'job' | 'article' | 'event';
  title: string;
  description: string;
  author: string;
  authorAvatar: string;
  savedAt: string;
  imageUrl?: string;
}

export default function BookmarksPage() {
  const [activeTab, setActiveTab] = useState<'all' | 'posts' | 'jobs' | 'articles' | 'events'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [savedItems, setSavedItems] = useState<SavedItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Theme colors
  const accentPink = '#E91E8C';
  const accentPurple = '#8B5CF6';

  const mockSavedItems: SavedItem[] = [
    {
      id: '1',
      type: 'post',
      title: 'From a remote community to coding at Atlassian',
      description: 'It took 4 years, countless rejections, and amazing mentors. To anyone thinking it\'s too late or too hard—keep going.',
      author: 'Jarrah Williams',
      authorAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop',
      savedAt: '2 days ago',
      imageUrl: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800&h=500&fit=crop'
    },
    {
      id: '2',
      type: 'job',
      title: 'Graduate Software Engineer',
      description: 'BHP is looking for passionate First Nations graduates to join our technology team. Full training provided.',
      author: 'BHP',
      authorAvatar: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=100&h=100&fit=crop',
      savedAt: '3 days ago'
    },
    {
      id: '3',
      type: 'article',
      title: 'Building Culturally Safe Workplaces',
      description: 'A comprehensive guide to understanding and implementing cultural safety in Australian workplaces.',
      author: 'Dr. Chelsea Bond',
      authorAvatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&h=100&fit=crop',
      savedAt: '5 days ago'
    },
    {
      id: '4',
      type: 'event',
      title: 'Indigenous Tech Meetup - Sydney',
      description: 'Monthly gathering of First Nations tech professionals and allies. Networking, talks, and community.',
      author: 'Community Events',
      authorAvatar: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=100&h=100&fit=crop',
      savedAt: '1 week ago',
      imageUrl: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&h=500&fit=crop'
    },
    {
      id: '5',
      type: 'post',
      title: 'STEM Mentorship Program is now open!',
      description: 'We\'re matching 50 First Nations students with scientists and tech professionals for 2026.',
      author: 'Deadly Science',
      authorAvatar: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=100&h=100&fit=crop',
      savedAt: '1 week ago'
    }
  ];

  useEffect(() => {
    // Simulate API fetch
    setTimeout(() => {
      setSavedItems(mockSavedItems);
      setLoading(false);
    }, 500);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredItems = savedItems.filter(item => {
    const matchesTab = activeTab === 'all' || item.type === activeTab.slice(0, -1);
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'post': return <FileText className="w-4 h-4" />;
      case 'job': return <Briefcase className="w-4 h-4" />;
      case 'article': return <FileText className="w-4 h-4" />;
      case 'event': return <Calendar className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'post': return 'text-pink-500 bg-pink-100';
      case 'job': return 'text-purple-500 bg-purple-100';
      case 'article': return 'text-pink-500 bg-pink-100';
      case 'event': return 'text-purple-500 bg-purple-100';
      default: return 'text-slate-400 bg-slate-100';
    }
  };

  const handleRemove = (id: string) => {
    setSavedItems(prev => prev.filter(item => item.id !== id));
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
              <Bookmark className="w-6 h-6" style={{ color: accentPink }} />
              Saved Posts
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              {savedItems.length} items saved
            </p>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search saved items..."
              className="w-full bg-white text-slate-800 placeholder-slate-400 rounded-lg pl-10 pr-4 py-3 border-2 border-slate-200 focus:outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-100 transition-all"
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 flex-wrap mb-6">
          {[
            { id: 'all', label: 'All', count: savedItems.length },
            { id: 'posts', label: 'Posts', count: savedItems.filter(i => i.type === 'post').length },
            { id: 'jobs', label: 'Jobs', count: savedItems.filter(i => i.type === 'job').length },
            { id: 'articles', label: 'Articles', count: savedItems.filter(i => i.type === 'article').length },
            { id: 'events', label: 'Events', count: savedItems.filter(i => i.type === 'event').length },
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

        {/* Saved Items List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-12 h-12 rounded-full border-4 border-pink-200 border-t-pink-500 animate-spin" />
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-20">
            <Bookmark className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-800 mb-2">No saved items</h3>
            <p className="text-slate-500 mb-6">
              {searchQuery ? 'No items match your search' : 'Start saving posts, jobs, and articles to access them later'}
            </p>
            <Link 
              href="/social-feed"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-white font-medium transition-all hover:scale-[1.02]"
              style={{ 
                background: `linear-gradient(135deg, ${accentPink} 0%, ${accentPurple} 100%)`,
                boxShadow: '0 4px 12px rgba(233, 30, 140, 0.3)'
              }}
            >
              Browse Feed
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredItems.map((item) => (
              <article 
                key={item.id}
                className="rounded-xl overflow-hidden bg-white border border-slate-200 hover:border-pink-300 transition-colors"
                style={{ boxShadow: '0 4px 20px rgba(15, 23, 42, 0.06)' }}
              >
                <div className="p-4">
                  <div className="flex items-start gap-4">
                    {/* Thumbnail or Avatar */}
                    {item.imageUrl ? (
                      <div className="w-24 h-24 rounded-lg overflow-hidden shrink-0 hidden sm:block">
                        <Image
                          src={item.imageUrl}
                          alt={item.title}
                          width={96}
                          height={96}
                          cloudinary={isCloudinaryPublicId(item.imageUrl || '')}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded-full overflow-hidden shrink-0">
                        <Image
                          src={item.authorAvatar}
                          alt={item.author}
                          width={48}
                          height={48}
                          cloudinary={isCloudinaryPublicId(item.authorAvatar || '')}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    
                    <div className="flex-1 min-w-0">
                      {/* Type Badge */}
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ${getTypeColor(item.type)}`}>
                          {getTypeIcon(item.type)}
                          {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
                        </span>
                        <span className="text-xs text-slate-400">Saved {item.savedAt}</span>
                      </div>
                      
                      {/* Title */}
                      <h3 className="font-semibold text-slate-800 mb-1 line-clamp-1">{item.title}</h3>
                      
                      {/* Description */}
                      <p className="text-sm text-slate-500 mb-2 line-clamp-2">{item.description}</p>
                      
                      {/* Author */}
                      <div className="flex items-center gap-2 text-sm text-slate-400">
                        <span>by {item.author}</span>
                      </div>
                    </div>
                    
                    {/* Actions */}
                    <div className="flex items-start gap-2 shrink-0">
                      <button 
                        onClick={() => handleRemove(item.id)}
                        className="p-2 rounded-lg hover:bg-pink-50 transition-colors"
                        style={{ color: accentPink }}
                        title="Remove from saved"
                      >
                        <Bookmark className="w-5 h-5 fill-current" />
                      </button>
                      <button className="p-2 rounded-lg text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors">
                        <MoreHorizontal className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
