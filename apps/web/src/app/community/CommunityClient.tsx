'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Space_Grotesk } from 'next/font/google';
import {
  ChevronRight,
  MessageCircle,
  Users,
  TrendingUp,
  Award,
  Search,
  Plus,
  ArrowRight,
  Clock,
  Eye,
  MessageSquare,
  Pin,
  Lock,
  Loader2,
  Sparkles,
  Briefcase,
  BookOpen,
  Heart,
  Rocket,
  Leaf,
} from 'lucide-react';
import api from '@/lib/apiClient';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-space-grotesk',
});

// Theme colors
const colors = {
  pink: '#E91E8C',
  purple: '#8B5CF6',
  emerald: '#10B981',
  amber: '#F59E0B',
  sky: '#0EA5E9',
  cyan: '#06B6D4',
};

interface Category {
  id: string;
  name: string;
  slug?: string;
  description: string;
  icon: string;
  color: string;
  topicCount: number;
  postCount: number;
}

interface Topic {
  id: string;
  title: string;
  author: string;
  authorAvatar?: string;
  categoryName: string;
  categorySlug?: string;
  createdAt: string;
  replyCount: number;
  viewCount: number;
  isPinned: boolean;
  isLocked: boolean;
  lastReply?: { author: string; time: string };
}

interface SuccessStory {
  id: string;
  name: string;
  role: string;
  story: string;
  avatar: string;
}

interface CommunityClientProps {
  initialCategories?: Category[];
  initialTopics?: Topic[];
}

const categoryIcons: Record<string, React.ReactNode> = {
  'career-advice': <Briefcase className="w-6 h-6" />,
  'networking': <Users className="w-6 h-6" />,
  'training-education': <BookOpen className="w-6 h-6" />,
  'success-stories': <Award className="w-6 h-6" />,
  'business-entrepreneurship': <Rocket className="w-6 h-6" />,
  'culture-identity': <Leaf className="w-6 h-6" />,
  'mentorship': <Heart className="w-6 h-6" />,
  'cultural-connection': <Sparkles className="w-6 h-6" />,
  'industry-insights': <TrendingUp className="w-6 h-6" />,
};

const successStories: SuccessStory[] = [
  {
    id: '1',
    name: 'Sarah M.',
    role: 'Site Supervisor at BuildCo',
    story: 'Started as a trainee through Ngurra Pathways. The mentorship program helped me navigate the construction industry.',
    avatar: '👩🏽',
  },
  {
    id: '2',
    name: 'James T.',
    role: 'IT Support Specialist',
    story: 'The TAFE course recommendations matched perfectly with my skills. Landed my dream job within 3 months.',
    avatar: '👨🏿',
  },
  {
    id: '3',
    name: 'Emily W.',
    role: 'Business Development Manager',
    story: 'Connected with an amazing mentor who guided me through my career transition. Forever grateful!',
    avatar: '👩🏼',
  },
];

export default function CommunityClient({ initialCategories = [], initialTopics = [] }: CommunityClientProps) {
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [recentTopics, setRecentTopics] = useState<Topic[]>(initialTopics);
  const [loading, setLoading] = useState(initialCategories.length === 0);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchCommunityData = useCallback(async () => {
    try {
      const [catRes, topicsRes] = await Promise.all([
        api('/community/categories'),
        api('/community/topics/recent?limit=5'),
      ]);

      if (catRes.ok && 'data' in catRes && catRes.data?.categories?.length > 0) {
        setCategories(catRes.data.categories);
      }
      if (topicsRes.ok && 'data' in topicsRes && topicsRes.data?.topics?.length > 0) {
        setRecentTopics(topicsRes.data.topics);
      }
    } catch (err) {
      console.error('Error fetching community data:', err);
      setError('Unable to load community data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initialCategories.length === 0) {
      fetchCommunityData();
    }
  }, [initialCategories.length, fetchCommunityData]);

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;

    return date.toLocaleDateString('en-AU', { month: 'short', day: 'numeric' });
  };

  const getCategoryColor = (color: string) => {
    const colorMap: Record<string, { gradient: string; bg: string; border: string }> = {
      blue: { gradient: `linear-gradient(135deg, ${colors.sky} 0%, #0284C7 100%)`, bg: 'rgba(14, 165, 233, 0.15)', border: 'rgba(14, 165, 233, 0.3)' },
      purple: { gradient: `linear-gradient(135deg, ${colors.purple} 0%, #7C3AED 100%)`, bg: 'rgba(139, 92, 246, 0.15)', border: 'rgba(139, 92, 246, 0.3)' },
      amber: { gradient: `linear-gradient(135deg, ${colors.amber} 0%, #D97706 100%)`, bg: 'rgba(245, 158, 11, 0.15)', border: 'rgba(245, 158, 11, 0.3)' },
      green: { gradient: `linear-gradient(135deg, ${colors.emerald} 0%, #059669 100%)`, bg: 'rgba(16, 185, 129, 0.15)', border: 'rgba(16, 185, 129, 0.3)' },
      cyan: { gradient: `linear-gradient(135deg, ${colors.cyan} 0%, #0891B2 100%)`, bg: 'rgba(6, 182, 212, 0.15)', border: 'rgba(6, 182, 212, 0.3)' },
      pink: { gradient: `linear-gradient(135deg, ${colors.pink} 0%, #BE185D 100%)`, bg: 'rgba(233, 30, 140, 0.15)', border: 'rgba(233, 30, 140, 0.3)' },
    };
    return colorMap[color] || colorMap.purple;
  };

  const filteredTopics = recentTopics.filter(
    (topic) =>
      topic.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      topic.author.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className={`${spaceGrotesk.className} ngurra-page flex items-center justify-center`}>
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-pink-500" />
          <p className="text-gray-400 font-medium">Loading community...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`${spaceGrotesk.className} ngurra-page`}>
      {/* Decorative patterns */}
      <div
        className="fixed inset-0 opacity-10 pointer-events-none"
        style={{
          backgroundImage: `
            radial-gradient(circle at 20% 30%, #FFD700 1.5px, transparent 1.5px),
            radial-gradient(circle at 80% 70%, #50C878 1.5px, transparent 1.5px),
            radial-gradient(circle at 50% 50%, #E85B8A 1px, transparent 1px)
          `,
          backgroundSize: '80px 80px',
        }}
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pt-24">
        {/* Header Section */}
        <div className="mb-10">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-8">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center"
                  style={{ background: `linear-gradient(135deg, ${colors.pink} 0%, ${colors.purple} 100%)` }}
                >
                  <Users className="w-7 h-7 text-white" />
                </div>
                <span
                  className="px-4 py-1.5 rounded-full text-sm font-semibold"
                  style={{
                    background: `linear-gradient(135deg, ${colors.pink}20 0%, ${colors.purple}20 100%)`,
                    color: colors.pink,
                    border: `1px solid ${colors.pink}50`,
                  }}
                >
                  Community Forums
                </span>
              </div>
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
                Connect & Share
              </h1>
              <p className="text-lg text-gray-400 max-w-2xl">
                Join conversations, share experiences, and learn from the Ngurra Pathways community.
                Your voice matters here.
              </p>
            </div>

            <Link
              href="/community/new"
              className="flex items-center gap-2 px-6 py-3 rounded-full text-white font-semibold transition-all hover:scale-[1.02] hover:shadow-lg shrink-0"
              style={{
                background: `linear-gradient(135deg, ${colors.pink} 0%, ${colors.purple} 100%)`,
                boxShadow: '0 4px 20px rgba(233, 30, 140, 0.3)',
              }}
            >
              <Plus className="w-5 h-5" />
              Start New Topic
            </Link>
          </div>

          {/* Search */}
          <div className="relative max-w-2xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search discussions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-4 rounded-2xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500/50 transition-all"
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(10px)',
              }}
            />
          </div>
        </div>

        {error && (
          <div
            className="rounded-2xl p-4 mb-8"
            style={{ background: 'rgba(245, 158, 11, 0.15)', border: '1px solid rgba(245, 158, 11, 0.3)' }}
          >
            <p className="text-amber-400 text-sm">{error}</p>
          </div>
        )}

        {/* Success Stories */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: `linear-gradient(135deg, ${colors.amber} 0%, #D97706 100%)` }}
              >
                <Award className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white">Success Stories</h2>
            </div>
            <Link
              href="/community/stories"
              className="flex items-center gap-1 text-sm font-semibold text-pink-400 hover:text-pink-300 transition-colors"
            >
              View All <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {successStories.map((story) => (
              <div
                key={story.id}
                className="rounded-2xl p-6 transition-all hover:scale-[1.02]"
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  backdropFilter: 'blur(10px)',
                }}
              >
                <div className="flex items-center gap-4 mb-4">
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl"
                    style={{ background: `linear-gradient(135deg, ${colors.pink}20 0%, ${colors.purple}20 100%)` }}
                  >
                    {story.avatar}
                  </div>
                  <div>
                    <h3 className="font-bold text-white">{story.name}</h3>
                    <p className="text-sm text-pink-400 font-medium">{story.role}</p>
                  </div>
                </div>
                <p className="text-gray-400 text-sm leading-relaxed italic">
                  &ldquo;{story.story}&rdquo;
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Quick Links */}
        <div className="grid md:grid-cols-2 gap-4 mb-12">
          <Link
            href="/community/leaderboard"
            className="group rounded-2xl p-6 transition-all hover:scale-[1.02]"
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(10px)',
            }}
          >
            <div className="flex items-center gap-4">
              <span className="text-4xl">🏆</span>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-white group-hover:text-pink-400 transition-colors">
                  Employer Leaderboard
                </h3>
                <p className="text-gray-400 text-sm">
                  Discover top employers leading Indigenous employment initiatives
                </p>
              </div>
              <ArrowRight className="w-5 h-5 text-gray-500 group-hover:text-pink-400 group-hover:translate-x-1 transition-all" />
            </div>
          </Link>

          <Link
            href="/community/advisory"
            className="group rounded-2xl p-6 transition-all hover:scale-[1.02]"
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(10px)',
            }}
          >
            <div className="flex items-center gap-4">
              <span className="text-4xl">⚖️</span>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-white group-hover:text-purple-400 transition-colors">
                  Community Advisory Council
                </h3>
                <p className="text-gray-400 text-sm">
                  Meet our First Nations council members guiding platform decisions
                </p>
              </div>
              <ArrowRight className="w-5 h-5 text-gray-500 group-hover:text-purple-400 group-hover:translate-x-1 transition-all" />
            </div>
          </Link>
        </div>

        {/* Categories Grid */}
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: `linear-gradient(135deg, ${colors.purple} 0%, #7C3AED 100%)` }}
            >
              <MessageCircle className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white">Categories</h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map((category) => {
              const colorStyle = getCategoryColor(category.color);
              const slug = category.slug || category.id;
              const IconComponent = categoryIcons[slug] || <MessageSquare className="w-6 h-6" />;
              
              return (
                <Link
                  key={category.id}
                  href={`/community/category/${slug}`}
                  className="group rounded-2xl p-5 transition-all hover:scale-[1.02]"
                  style={{
                    background: colorStyle.bg,
                    border: `1px solid ${colorStyle.border}`,
                  }}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-white shrink-0"
                      style={{ background: colorStyle.gradient }}
                    >
                      {IconComponent}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-white mb-1 group-hover:text-pink-400 transition-colors">
                        {category.name}
                      </h3>
                      <p className="text-sm text-gray-400 mb-3 line-clamp-2">
                        {category.description}
                      </p>
                      <div className="flex items-center gap-4 text-xs font-semibold">
                        <span className="text-pink-400">{category.topicCount} topics</span>
                        <span className="text-gray-500">{category.postCount} posts</span>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Recent Discussions */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: `linear-gradient(135deg, ${colors.emerald} 0%, #059669 100%)` }}
              >
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white">Recent Discussions</h2>
            </div>
            <Link
              href="/community/all"
              className="flex items-center gap-1 text-sm font-semibold text-pink-400 hover:text-pink-300 transition-colors"
            >
              View All <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div
            className="rounded-2xl overflow-hidden"
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(10px)',
            }}
          >
            {filteredTopics.length === 0 ? (
              <div className="p-12 text-center">
                <div
                  className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center"
                  style={{ background: 'rgba(139, 92, 246, 0.2)' }}
                >
                  <MessageSquare className="w-8 h-8 text-purple-400" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">No discussions found</h3>
                <p className="text-gray-400 mb-6">Be the first to start a conversation!</p>
                <Link
                  href="/community/new"
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium text-white"
                  style={{ background: `linear-gradient(135deg, ${colors.pink} 0%, ${colors.purple} 100%)` }}
                >
                  <Plus className="w-4 h-4" />
                  Start New Topic
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-white/10">
                {filteredTopics.map((topic) => (
                  <Link
                    key={topic.id}
                    href={`/community/topic/${topic.id}`}
                    className="flex items-center gap-4 p-5 hover:bg-white/5 transition-colors group"
                  >
                    {/* Author Avatar */}
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold shrink-0"
                      style={{ background: `linear-gradient(135deg, ${colors.pink}20 0%, ${colors.purple}20 100%)` }}
                    >
                      {topic.authorAvatar || topic.author?.charAt(0) || '?'}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {topic.isPinned && <Pin className="w-4 h-4 text-pink-500" />}
                        {topic.isLocked && <Lock className="w-4 h-4 text-gray-500" />}
                        <h3 className="font-semibold text-white truncate group-hover:text-pink-400 transition-colors">
                          {topic.title}
                        </h3>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500">
                        <span
                          className="px-2 py-0.5 rounded-full text-xs font-semibold"
                          style={{ background: 'rgba(139, 92, 246, 0.2)', color: colors.purple }}
                        >
                          {topic.categoryName}
                        </span>
                        <span className="flex items-center gap-1">
                          by <span className="font-medium text-gray-300">{topic.author}</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {getTimeAgo(topic.createdAt)}
                        </span>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="hidden sm:flex items-center gap-6 text-sm text-gray-500">
                      <div className="flex items-center gap-1.5">
                        <MessageSquare className="w-4 h-4" />
                        <span className="font-medium text-gray-300">{topic.replyCount}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Eye className="w-4 h-4" />
                        <span className="font-medium text-gray-300">{topic.viewCount}</span>
                      </div>
                    </div>

                    {/* Arrow */}
                    <ChevronRight className="w-5 h-5 text-gray-500 group-hover:text-pink-400 group-hover:translate-x-1 transition-all" />
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* CTA Banner */}
        <section>
          <div
            className="relative overflow-hidden rounded-3xl p-8 md:p-12"
            style={{ background: `linear-gradient(135deg, ${colors.pink} 0%, ${colors.purple} 100%)` }}
          >
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-white/10 -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-white/10 translate-y-1/2 -translate-x-1/2" />
            </div>

            <div className="relative flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="text-center md:text-left">
                <h3 className="text-2xl md:text-3xl font-bold text-white mb-2">
                  Have something to share?
                </h3>
                <p className="text-white/80 text-lg">
                  Your experiences and insights can help others on their journey.
                </p>
              </div>
              <Link
                href="/community/new"
                className="flex items-center gap-2 px-8 py-4 bg-white rounded-xl font-bold text-pink-600 hover:bg-pink-50 transition-colors shadow-lg"
              >
                <MessageCircle className="w-5 h-5" />
                Start Discussion
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
