'use client';

import api from '@/lib/apiClient';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from '@/components/ui/OptimizedImage';
import { isCloudinaryPublicId } from '@/lib/cloudinary';
import { Space_Grotesk } from 'next/font/google';
import {
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  MoreHorizontal,
  Image as ImageIcon,
  Video,
  Calendar,
  Briefcase,
  Sparkles,
  TrendingUp,
  Users,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

interface ApiFeedPost {
  id?: string | number;
  authorName?: string;
  authorAvatar?: string | null;
  authorTitle?: string;
  trustLevel?: string;
  content?: unknown;
  createdAt?: string;
  media?: unknown;
  mediaUrl?: string | null;
  mediaUrls?: (string | null)[] | string | null;
  reactionCounts?: Record<string, number>;
  reactions?: Record<string, number>;
  likeCount?: number;
  commentCount?: number;
  shareCount?: number;
  isOrganization?: boolean;
  isSponsored?: boolean;
}

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-space-grotesk',
});

export default function SocialFeedPage() {
  const { user, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState('for-you');
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);

  interface Post {
    id: string;
    authorName: string;
    authorAvatar: string;
    authorTitle: string;
    trustLevel: string;
    content: string;
    mediaUrl?: string;
    reactions: { [key: string]: number };
    commentCount: number;
    shareCount: number;
    createdAt: string;
    isOrganization?: boolean;
    isSponsored?: boolean;
  }

  // Fallback mock data
  const fallbackPosts: Post[] = [
    {
      id: '1',
      authorName: 'Aunty Marcia Langton',
      authorAvatar:
        'https://images.unsplash.com/photo-1594744803329-e58b31de8bf5?w=100&h=100&fit=crop',
      authorTitle: 'Cultural Elder & Community Leader',
      trustLevel: 'verified',
      content:
        'Today we gathered at Uluru for the annual Tjukurpa ceremony. Watching our young ones learn the ancient stories fills my heart with hope. Remember: your culture is your strength on any career path. 🌏✨',
      mediaUrl: 'https://images.unsplash.com/photo-1529108190281-9a4f620bc2d8?w=800&h=500&fit=crop',
      reactions: { like: 342, love: 189, support: 78, celebrate: 156 },
      commentCount: 67,
      shareCount: 45,
      createdAt: '2 hours ago',
    },
    {
      id: '2',
      authorName: 'First Nations Mining Academy',
      authorAvatar:
        'https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=100&h=100&fit=crop',
      authorTitle: 'Training Organization',
      trustLevel: 'verified',
      isOrganization: true,
      isSponsored: true,
      content:
        '🎓 FREE TRAINING OPPORTUNITY 🎓\n\n12 fully-funded positions available for our Certificate IV in Mining Operations.\n\n✅ No experience required\n✅ $800/week training allowance\n✅ Guaranteed job placement\n\nApplications close Jan 31st.',
      mediaUrl: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&h=500&fit=crop',
      reactions: { like: 523, love: 89, celebrate: 234, support: 145 },
      commentCount: 156,
      shareCount: 312,
      createdAt: '4 hours ago',
    },
    {
      id: '3',
      authorName: 'Jarrah Williams',
      authorAvatar:
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop',
      authorTitle: 'Software Developer @ Atlassian',
      trustLevel: 'trusted',
      content:
        "From a remote community in the Kimberley to coding at one of Australia's biggest tech companies. It took 4 years, countless rejections, and amazing mentors.\n\nTo anyone thinking it's too late or too hard—keep going. 💎\n\n#FirstNationsInTech #CareerJourney",
      mediaUrl: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800&h=500&fit=crop',
      reactions: { like: 891, love: 423, support: 267, celebrate: 345 },
      commentCount: 234,
      shareCount: 189,
      createdAt: '6 hours ago',
    },
    {
      id: '4',
      authorName: 'BHP Indigenous Employment',
      authorAvatar:
        'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=100&h=100&fit=crop',
      authorTitle: 'Mining & Resources',
      trustLevel: 'verified',
      isOrganization: true,
      isSponsored: true,
      content:
        "🔧 Now Hiring: 45+ positions across WA & QLD\n\nWe're committed to 10% First Nations employment by 2025.\n\n• Heavy Diesel Mechanics\n• Process Operators\n• Graduate Engineers\n• Community Liaison Officers\n\nAll roles include cultural leave.",
      reactions: { like: 445, celebrate: 178, support: 89 },
      commentCount: 89,
      shareCount: 234,
      createdAt: '8 hours ago',
    },
    {
      id: '5',
      authorName: 'Dr. Chelsea Bond',
      authorAvatar:
        'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&h=100&fit=crop',
      authorTitle: 'Associate Professor @ UQ',
      trustLevel: 'verified',
      content:
        "Just finished supervising my 20th PhD student—and 15 of them are First Nations scholars.\n\nEducation is powerful, but it's even more powerful when we do it together, on our terms, with our knowledge systems valued. 📚✨",
      reactions: { like: 1234, love: 567, celebrate: 389, support: 234 },
      commentCount: 178,
      shareCount: 267,
      createdAt: '10 hours ago',
    },
    {
      id: '6',
      authorName: 'Deadly Science',
      authorAvatar:
        'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=100&h=100&fit=crop',
      authorTitle: 'STEM Education Organization',
      trustLevel: 'verified',
      isOrganization: true,
      content:
        "🔬 STEM Mentorship Program Open!\n\nWe're matching 50 First Nations students with scientists and tech professionals.\n\nMentees get:\n• Monthly 1:1 sessions\n• Conference attendance\n• Networking events\n• Career guidance\n\nMentors needed too! 🙋‍♀️",
      mediaUrl: 'https://images.unsplash.com/photo-1581093450021-4a7360e9a6b5?w=800&h=500&fit=crop',
      reactions: { like: 678, love: 234, celebrate: 145 },
      commentCount: 89,
      shareCount: 156,
      createdAt: '12 hours ago',
    },
  ];

  const fetchPosts = useCallback(
    async (pageNum = 1, append = false) => {
      if (!append) setLoading(true);
      try {
        const tabParam = activeTab !== 'for-you' ? `&tab=${activeTab}` : '';
        const endpoint = `/social-feed?page=${pageNum}&limit=10${tabParam}`;
        const res = await api(endpoint);

        if (!res.ok) throw new Error('Failed to fetch');

        const container = res.data as { posts?: ApiFeedPost[]; hasMore?: boolean } | ApiFeedPost[];
        const postsArray: ApiFeedPost[] = Array.isArray(
          (container as { posts?: ApiFeedPost[] }).posts,
        )
          ? ((container as { posts?: ApiFeedPost[] }).posts ?? [])
          : Array.isArray(container)
            ? (container as ApiFeedPost[])
            : [];

        const apiPosts: Post[] = postsArray.map((p) => {
          const mediaUrl = (() => {
            if (typeof p.mediaUrl === 'string' && p.mediaUrl.length > 0) return p.mediaUrl;
            if (Array.isArray(p.mediaUrls) && typeof p.mediaUrls[0] === 'string')
              return p.mediaUrls[0] || undefined;
            if (typeof p.mediaUrls === 'string' && p.mediaUrls.length > 0) {
              try {
                const parsed = JSON.parse(p.mediaUrls);
                if (Array.isArray(parsed) && typeof parsed[0] === 'string') return parsed[0];
              } catch {
                return p.mediaUrls || undefined;
              }
            }
            return undefined;
          })();

          return {
            id: String(p.id ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`),
            authorName: p.authorName || 'Community Member',
            authorAvatar:
              p.authorAvatar ||
              'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop',
            authorTitle: p.authorTitle || '',
            trustLevel: p.trustLevel || 'basic',
            content: typeof p.content === 'string' ? p.content : '',
            mediaUrl,
            reactions: p.reactionCounts || p.reactions || { like: p.likeCount || 0 },
            commentCount: p.commentCount ?? 0,
            shareCount: p.shareCount ?? 0,
            createdAt: formatTimeAgo(p.createdAt),
            isOrganization: p.isOrganization,
            isSponsored: p.isSponsored,
          };
        });

        setPosts((prev) => (append ? [...prev, ...apiPosts] : apiPosts));
        const hasMoreFlag = Array.isArray(container)
          ? apiPosts.length >= 10
          : Boolean((container as { hasMore?: boolean }).hasMore ?? apiPosts.length >= 10);
        setHasMore(hasMoreFlag);
      } catch {
        if (!append) setPosts(fallbackPosts);
      } finally {
        setLoading(false);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [activeTab],
  );

  function formatTimeAgo(dateStr: string | undefined) {
    if (!dateStr) return 'Just now';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  }

  useEffect(() => {
    setPage(1);
    fetchPosts(1, false);
  }, [activeTab, fetchPosts]);

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchPosts(nextPage, true);
  };

  const handleReaction = async (postId: string, type: string) => {
    if (!isAuthenticated) return;

    // Optimistic update
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id !== postId) return p;
        return { ...p, reactions: { ...p.reactions, [type]: (p.reactions[type] || 0) + 1 } };
      }),
    );

    const res = await api(`/social-feed/posts/${postId}/react`, {
      method: 'POST',
      body: { type },
    });

    if (!res.ok) {
      // Roll back optimistic update
      setPosts((prev) =>
        prev.map((p) => {
          if (p.id !== postId) return p;
          return {
            ...p,
            reactions: { ...p.reactions, [type]: Math.max(0, (p.reactions[type] || 0) - 1) },
          };
        }),
      );
    }
  };

  const getTrustBadge = (level: string) => {
    const badges: { [key: string]: { icon: string; color: string; label: string } } = {
      new: { icon: '🌱', color: '#6B4C9A', label: 'New Member' },
      basic: { icon: '✓', color: '#87CEEB', label: 'Member' },
      established: { icon: '★', color: '#E85B8A', label: 'Established' },
      trusted: { icon: '💎', color: '#50C878', label: 'Trusted' },
      verified: { icon: '✓', color: '#FFD700', label: 'Verified' },
    };
    return badges[level] || badges.new;
  };

  const trendingTopics = [
    { tag: '#FirstNationsInTech', posts: '2.4k' },
    { tag: '#IndigenousExcellence', posts: '1.8k' },
    { tag: '#DeadlyCareers', posts: '956' },
    { tag: '#CulturalStrength', posts: '734' },
  ];

  const partners = [
    { name: 'Rio Tinto', logo: '🏭', jobs: 23 },
    { name: 'Qantas', logo: '✈️', jobs: 12 },
    { name: 'Telstra', logo: '📱', jobs: 34 },
    { name: 'NAB', logo: '🏦', jobs: 18 },
  ];

  return (
    <div className={`${spaceGrotesk.className} ngurra-page`}>
      {/* Decorative halos */}
      <div className="ngurra-halos">
        <div className="ngurra-halo-pink" />
        <div className="ngurra-halo-purple" />
      </div>
      {/* Dot pattern overlay */}
      <div
        className="fixed inset-0 opacity-[0.04] dark:opacity-10 pointer-events-none"
        style={{
          backgroundImage: `
            radial-gradient(circle at 20% 30%, #FFD700 1.5px, transparent 1.5px),
            radial-gradient(circle at 80% 70%, #50C878 1.5px, transparent 1.5px),
            radial-gradient(circle at 50% 50%, #E85B8A 1px, transparent 1px)
          `,
          backgroundSize: '80px 80px',
        }}
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Three Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Sidebar */}
          <aside className="hidden lg:block lg:col-span-3">
            <div className="sticky top-20 space-y-4">
              {/* Quick Actions */}
              <div className="rounded-xl p-4 bg-white dark:bg-white/5 backdrop-blur-md border border-gray-200 dark:border-white/10 shadow-sm dark:shadow-none">
                <h3 className="text-sm font-semibold mb-3 text-emerald-600 dark:text-emerald-400">
                  Quick Actions
                </h3>
                <div className="space-y-1">
                  <Link
                    href="/social-feed/new"
                    className="flex items-center gap-2 p-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                  >
                    <Sparkles className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                    Create Post
                  </Link>
                  <Link
                    href="/jobs"
                    className="flex items-center gap-2 p-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                  >
                    <Briefcase className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                    Browse Jobs
                  </Link>
                  <Link
                    href="/events"
                    className="flex items-center gap-2 p-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                  >
                    <Calendar className="w-4 h-4 text-pink-500 dark:text-pink-400" />
                    Upcoming Events
                  </Link>
                  <Link
                    href="/mentorship"
                    className="flex items-center gap-2 p-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                  >
                    <Users className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
                    Find a Mentor
                  </Link>
                </div>
              </div>

              {/* Trending Topics */}
              <div className="rounded-xl p-4 bg-white dark:bg-white/5 backdrop-blur-md border border-gray-200 dark:border-white/10 shadow-sm dark:shadow-none">
                <h3 className="text-sm font-semibold mb-3 text-amber-600 dark:text-amber-400">
                  Trending Topics
                </h3>
                <div className="space-y-2">
                  {trendingTopics.map((topic, i) => (
                    <Link
                      key={i}
                      href={`/search?q=${topic.tag}`}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                    >
                      <span className="text-sky-600 dark:text-sky-400 text-sm">{topic.tag}</span>
                      <span className="text-xs text-gray-500">{topic.posts}</span>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </aside>

          {/* Main Feed */}
          <main className="lg:col-span-6">
            {/* Stories Row */}
            <div className="mb-6 -mx-4 px-4 overflow-x-auto scrollbar-hide">
              <div className="flex gap-3 pb-2">
                {/* Add Story */}
                <Link href="/social-feed/new" className="flex flex-col items-center gap-1 shrink-0">
                  <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-brand-500/30 to-purple-600/30 flex items-center justify-center border-2 border-dashed border-gray-400 dark:border-white/30">
                    <svg
                      className="w-6 h-6 text-gray-600 dark:text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 4v16m8-8H4"
                      />
                    </svg>
                  </div>
                  <span className="text-[10px] text-gray-500 dark:text-gray-400">Your Story</span>
                </Link>
                {/* Sample Stories */}
                {[
                  {
                    name: 'Sarah',
                    avatar:
                      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop',
                    hasNew: true,
                  },
                  {
                    name: 'Jarrah',
                    avatar:
                      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop',
                    hasNew: true,
                  },
                  {
                    name: 'BHP',
                    avatar:
                      'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=100&h=100&fit=crop',
                    hasNew: true,
                  },
                  {
                    name: 'Chelsea',
                    avatar:
                      'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&h=100&fit=crop',
                    hasNew: false,
                  },
                  {
                    name: 'Deadly Sci',
                    avatar:
                      'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=100&h=100&fit=crop',
                    hasNew: true,
                  },
                  {
                    name: 'Emma',
                    avatar:
                      'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop',
                    hasNew: false,
                  },
                ].map((story, i) => (
                  <button key={i} className="flex flex-col items-center gap-1 shrink-0">
                    <div
                      className={`relative w-16 h-16 rounded-full p-0.5 ${story.hasNew ? 'bg-gradient-to-r from-amber-500 via-pink-500 to-purple-500' : 'bg-white/20'}`}
                    >
                      <Image
                        src={story.avatar}
                        alt={story.name}
                        width={64}
                        height={64}
                        cloudinary={isCloudinaryPublicId(story.avatar || '')}
                        className="w-full h-full rounded-full object-cover border-2 border-white dark:border-[#1A0F2E]"
                      />
                    </div>
                    <span className="text-[10px] text-gray-500 dark:text-gray-400 truncate w-16 text-center">
                      {story.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Header */}
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-amber-600 dark:text-amber-400 mb-4 flex items-center gap-2">
                <Sparkles className="w-6 h-6" />
                Community Feed
              </h1>

              {/* Tabs */}
              <div className="flex gap-2 flex-wrap">
                {[
                  { id: 'for-you', label: 'For You' },
                  { id: 'following', label: 'Following' },
                  { id: 'jobs', label: 'Jobs' },
                  { id: 'stories', label: 'Stories' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      activeTab === tab.id
                        ? 'bg-gradient-to-r from-emerald-600 to-emerald-500 text-white'
                        : 'bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Create Post Card */}
            {isAuthenticated ? (
              <div className="rounded-xl p-4 mb-6 bg-white dark:bg-white/5 backdrop-blur-md border border-gray-200 dark:border-white/10 shadow-sm dark:shadow-none">
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center text-white font-bold">
                    {user?.profile?.firstName?.[0] || user?.email?.[0] || 'U'}
                  </div>
                  <Link
                    href="/social-feed/new"
                    className="flex-1 p-3 rounded-lg bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10 transition-colors text-left"
                  >
                    Share your story with the community...
                  </Link>
                </div>
                <div className="flex gap-4 mt-3 pt-3 border-t border-gray-200 dark:border-white/10">
                  <button className="text-sm flex items-center gap-1 text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 dark:hover:text-emerald-300">
                    <ImageIcon className="w-4 h-4" /> Photo
                  </button>
                  <button className="text-sm flex items-center gap-1 text-sky-600 dark:text-sky-400 hover:text-sky-500 dark:hover:text-sky-300">
                    <Video className="w-4 h-4" /> Video
                  </button>
                  <button className="text-sm flex items-center gap-1 text-pink-600 dark:text-pink-400 hover:text-pink-500 dark:hover:text-pink-300">
                    <Calendar className="w-4 h-4" /> Event
                  </button>
                  <button className="text-sm flex items-center gap-1 text-amber-600 dark:text-amber-400 hover:text-amber-500 dark:hover:text-amber-300">
                    <Briefcase className="w-4 h-4" /> Job
                  </button>
                </div>
              </div>
            ) : (
              <div className="rounded-xl p-4 mb-6 bg-white dark:bg-white/5 backdrop-blur-md border border-gray-200 dark:border-white/10 shadow-sm dark:shadow-none text-center">
                <p className="text-gray-600 dark:text-gray-400 mb-2">
                  Join the community to share your story
                </p>
                <a
                  href="/signin?returnTo=/social-feed"
                  className="inline-block px-5 py-2 rounded-lg font-medium bg-gradient-to-r from-emerald-600 to-emerald-500 text-white hover:from-emerald-500 hover:to-emerald-400 transition-all text-sm"
                >
                  Sign In
                </a>
              </div>
            )}

            {/* Posts */}
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="w-12 h-12 rounded-full border-4 border-gray-200 dark:border-white/20 border-t-amber-500 dark:border-t-amber-400 animate-spin" />
              </div>
            ) : (
              <div className="space-y-6">
                {posts.map((post) => (
                  <article
                    key={post.id}
                    className={`rounded-xl overflow-hidden ${
                      post.isSponsored
                        ? 'bg-gradient-to-br from-amber-900/20 to-transparent border border-amber-500/30'
                        : 'bg-white dark:bg-white/5 backdrop-blur-md border border-gray-200 dark:border-white/10 shadow-sm dark:shadow-none'
                    }`}
                  >
                    {/* Sponsored Label */}
                    {post.isSponsored && (
                      <div className="px-4 py-2 text-xs font-medium text-amber-600 dark:text-amber-400 border-b border-amber-300/30 dark:border-amber-500/20 flex items-center gap-2">
                        <Sparkles className="w-3 h-3" />
                        Sponsored · Partner Opportunity
                      </div>
                    )}

                    {/* Post Header */}
                    <div className="p-4 flex items-start gap-3">
                      <div className="relative">
                        <div
                          className="w-12 h-12 rounded-full overflow-hidden"
                          style={{ border: `2px solid ${getTrustBadge(post.trustLevel).color}` }}
                        >
                          <Image
                            src={post.authorAvatar}
                            alt={post.authorName}
                            width={48}
                            height={48}
                            cloudinary={isCloudinaryPublicId(post.authorAvatar || '')}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div
                          className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px]"
                          style={{
                            background: getTrustBadge(post.trustLevel).color,
                            color: '#1A0F2E',
                          }}
                          title={getTrustBadge(post.trustLevel).label}
                        >
                          {getTrustBadge(post.trustLevel).icon}
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-gray-900 dark:text-white">
                            {post.authorName}
                          </h3>
                          {post.isOrganization && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400">
                              Organization
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {post.authorTitle}
                        </p>
                        <p className="text-xs text-gray-400 dark:text-gray-500">{post.createdAt}</p>
                      </div>

                      <button className="p-2 rounded-lg text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5">
                        <MoreHorizontal className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Content */}
                    <div className="px-4 pb-4">
                      <p className="text-gray-800 dark:text-gray-200 whitespace-pre-line leading-relaxed">
                        {post.content}
                      </p>
                    </div>

                    {/* Media */}
                    {post.mediaUrl && (
                      <div className="relative aspect-video">
                        <Image
                          src={post.mediaUrl}
                          alt="Post media"
                          fill
                          cloudinary={isCloudinaryPublicId(post.mediaUrl || '')}
                          className="object-cover"
                        />
                      </div>
                    )}

                    {/* Reactions Summary */}
                    <div className="px-4 py-3 flex items-center justify-between text-sm text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-white/10">
                      <div className="flex items-center gap-1">
                        <span>👍</span>
                        <span>❤️</span>
                        <span>🎉</span>
                        <span className="ml-1">
                          {Object.values(post.reactions)
                            .reduce((a, b) => a + b, 0)
                            .toLocaleString()}
                        </span>
                      </div>
                      <div className="flex gap-4">
                        <span>{post.commentCount} comments</span>
                        <span>{post.shareCount} shares</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="px-4 py-3 flex justify-around border-t border-gray-200 dark:border-white/10">
                      <button
                        onClick={() => handleReaction(post.id, 'like')}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
                      >
                        <Heart className="w-5 h-5" />
                        <span className="hidden sm:inline text-sm">Like</span>
                      </button>
                      <Link
                        href={`/social-feed/${post.id}`}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
                      >
                        <MessageCircle className="w-5 h-5" />
                        <span className="hidden sm:inline text-sm">Comment</span>
                      </Link>
                      <button className="flex items-center gap-2 px-4 py-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-amber-600 dark:hover:text-amber-400 transition-colors">
                        <Share2 className="w-5 h-5" />
                        <span className="hidden sm:inline text-sm">Share</span>
                      </button>
                      <button className="flex items-center gap-2 px-4 py-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-amber-600 dark:hover:text-amber-400 transition-colors">
                        <Bookmark className="w-5 h-5" />
                        <span className="hidden sm:inline text-sm">Save</span>
                      </button>
                    </div>
                  </article>
                ))}

                {/* Load More */}
                {hasMore && (
                  <div className="text-center py-8">
                    <button
                      onClick={loadMore}
                      className="px-8 py-3 rounded-lg font-medium bg-gradient-to-r from-emerald-600 to-emerald-500 text-white hover:from-emerald-500 hover:to-emerald-400 transition-all"
                    >
                      Load More Posts
                    </button>
                  </div>
                )}
              </div>
            )}
          </main>

          {/* Right Sidebar */}
          <aside className="hidden lg:block lg:col-span-3">
            <div className="sticky top-20 space-y-4">
              {/* Partner Opportunities */}
              <div className="rounded-xl p-4 bg-white dark:bg-white/5 backdrop-blur-md border border-amber-300/40 dark:border-amber-500/30 shadow-sm dark:shadow-none">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-amber-600 dark:text-amber-400">
                    Partner Opportunities
                  </h3>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400">
                    AD
                  </span>
                </div>
                <div className="space-y-2">
                  {partners.map((partner, i) => (
                    <Link
                      key={i}
                      href="/jobs"
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{partner.logo}</span>
                        <span className="text-gray-900 dark:text-white text-sm">
                          {partner.name}
                        </span>
                      </div>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400">
                        {partner.jobs} jobs
                      </span>
                    </Link>
                  ))}
                </div>
                <Link
                  href="/jobs"
                  className="flex items-center justify-center gap-1 mt-3 py-2 rounded-lg text-sm font-medium border border-amber-400/50 dark:border-amber-500/40 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-500/10 transition-colors"
                >
                  View All Jobs <ChevronRight className="w-4 h-4" />
                </Link>
              </div>

              {/* Community Stats */}
              <div className="rounded-xl p-4 bg-white dark:bg-white/5 backdrop-blur-md border border-gray-200 dark:border-white/10 shadow-sm dark:shadow-none">
                <h3 className="text-sm font-semibold mb-3 text-sky-600 dark:text-sky-400 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Community Impact
                </h3>
                <div className="grid grid-cols-2 gap-3 text-center">
                  <div className="bg-gray-50 dark:bg-white/5 rounded-lg p-2">
                    <div className="text-lg font-bold text-amber-600 dark:text-amber-400">
                      12.5K
                    </div>
                    <div className="text-[10px] text-gray-500">Jobs Filled</div>
                  </div>
                  <div className="bg-gray-50 dark:bg-white/5 rounded-lg p-2">
                    <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                      8.2K
                    </div>
                    <div className="text-[10px] text-gray-500">Mentorships</div>
                  </div>
                  <div className="bg-gray-50 dark:bg-white/5 rounded-lg p-2">
                    <div className="text-lg font-bold text-pink-600 dark:text-pink-400">$45M</div>
                    <div className="text-[10px] text-gray-500">Wages Earned</div>
                  </div>
                  <div className="bg-gray-50 dark:bg-white/5 rounded-lg p-2">
                    <div className="text-lg font-bold text-sky-600 dark:text-sky-400">250+</div>
                    <div className="text-[10px] text-gray-500">Partners</div>
                  </div>
                </div>
              </div>

              {/* Acknowledgment */}
              <div className="text-center py-3">
                <p className="text-[10px] text-gray-500">
                  <span className="text-amber-500 dark:text-amber-400">✦</span> We acknowledge
                  Traditional Custodians{' '}
                  <span className="text-emerald-500 dark:text-emerald-400">✦</span>
                </p>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 lg:hidden bg-gradient-to-t from-white to-white/95 dark:from-[#1A0F2E] dark:to-[#1A0F2E]/95 backdrop-blur-lg border-t border-gray-200 dark:border-white/10 z-50">
        <div className="flex justify-around items-center py-2 px-4">
          <Link
            href="/"
            className="flex flex-col items-center gap-1 p-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              />
            </svg>
            <span className="text-[10px]">Home</span>
          </Link>
          <Link
            href="/social-feed"
            className="flex flex-col items-center gap-1 p-2 text-amber-600 dark:text-amber-400 transition-colors"
          >
            <Sparkles className="w-6 h-6" />
            <span className="text-[10px]">Feed</span>
          </Link>
          <Link href="/social-feed/new" className="flex flex-col items-center gap-1 p-2 -mt-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-r from-emerald-600 to-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/30">
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
            </div>
          </Link>
          <Link
            href="/jobs"
            className="flex flex-col items-center gap-1 p-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <Briefcase className="w-6 h-6" />
            <span className="text-[10px]">Jobs</span>
          </Link>
          <Link
            href="/profile"
            className="flex flex-col items-center gap-1 p-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <Users className="w-6 h-6" />
            <span className="text-[10px]">Profile</span>
          </Link>
        </div>
      </nav>

      {/* Spacer for mobile bottom nav */}
      <div className="h-20 lg:hidden" />
    </div>
  );
}
