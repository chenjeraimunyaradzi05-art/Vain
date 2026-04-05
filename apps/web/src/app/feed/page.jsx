'use client';

import { API_BASE } from '@/lib/apiBase';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from '@/components/ui/OptimizedImage';
import { isCloudinaryPublicId } from '@/lib/cloudinary';
import useAuth from '../../hooks/useAuth';
import PostForm from './PostForm';

/**
 * Social Feed Page
 * Community-focused feed with feminine pink/purple theme
 */
export default function FeedPage() {
  // Theme colors
  const accentPink = '#E91E8C';
  const accentPurple = '#8B5CF6';

  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState('for-you');
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);

  // Fallback mock data for when API is unavailable
  const fallbackPosts = [
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
        '🎓 FREE TRAINING OPPORTUNITY 🎓\n\n12 fully-funded positions available for our Certificate IV in Mining Operations. Priority given to First Nations applicants.\n\n✅ No experience required\n✅ $800/week training allowance\n✅ Guaranteed job placement\n✅ Culturally safe environment\n\nApplications close Jan 31st. DM us or visit our profile.',
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
        "From a remote community in the Kimberley to coding at one of Australia's biggest tech companies. It took 4 years, countless rejections, and amazing mentors. \n\nTo anyone thinking it's too late or too hard—keep going. The path is there, even when you can't see it. 💎\n\n#FirstNationsInTech #CareerJourney",
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
        "🔧 Now Hiring: 45+ positions across WA & QLD\n\nWe're committed to 10% First Nations employment by 2025. Current openings include:\n\n• Heavy Diesel Mechanics\n• Process Operators\n• Graduate Engineers\n• Community Liaison Officers\n\nAll roles include cultural leave and connection to Country programs.",
      mediaUrl: 'https://images.unsplash.com/photo-1581093458791-9d15482442f6?w=800&h=500&fit=crop',
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
      authorTitle: 'Associate Professor @ UQ | Munanjahli & Yugambeh',
      trustLevel: 'verified',
      content:
        "Just finished supervising my 20th PhD student—and 15 of them are First Nations scholars. \n\nEducation is powerful, but it's even more powerful when we do it together, on our terms, with our knowledge systems valued. \n\nProud of every single one of you. 📚✨",
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
        "🔬 STEM Mentorship Program Open!\n\nWe're matching 50 First Nations students with scientists, engineers, and tech professionals for our 2025 mentorship program.\n\nMentees get:\n• Monthly 1:1 sessions\n• Conference attendance\n• Networking events\n• Career guidance\n\nMentors needed too! 🙋‍♀️",
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
        const apiBase = API_BASE;
        const endpoint =
          activeTab === 'for-you' || activeTab === 'following'
            ? `${apiBase}/feed?page=${pageNum}&limit=10`
            : `${apiBase}/feed/discover?page=${pageNum}&limit=10`;

        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const res = await fetch(endpoint, { headers });

        if (!res.ok) throw new Error('Failed to fetch');

        const data = await res.json();
        const apiPosts = (data.posts || []).map((p) => ({
          id: p.id,
          authorName: p.authorName || 'Community Member',
          authorAvatar:
            p.authorAvatar ||
            'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop',
          authorTitle: p.authorTitle || '',
          trustLevel: p.trustLevel || 'basic',
          content: p.content,
          mediaUrl: p.mediaUrls ? JSON.parse(p.mediaUrls)[0] : null,
          reactions: { like: p.likeCount || 0, love: 0, support: 0, celebrate: 0 },
          commentCount: p._count?.comments || p.commentCount || 0,
          shareCount: p.shareCount || 0,
          createdAt: formatTimeAgo(p.createdAt),
          isOrganization: p.isOrganization || false,
          isSponsored: p.isSponsored || false,
        }));

        if (append) {
          setPosts((prev) => [...prev, ...apiPosts]);
        } else {
          setPosts(apiPosts.length > 0 ? apiPosts : fallbackPosts);
        }
        setHasMore(data.hasMore !== false && apiPosts.length === 10);
      } catch (err) {
        console.error('Feed fetch error:', err);
        if (!append) setPosts(fallbackPosts);
      } finally {
        setLoading(false);
      }
    },
    [token, activeTab],
  );

  function formatTimeAgo(dateStr) {
    if (!dateStr) return 'Just now';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
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

  async function handleReaction(postId, type) {
    if (!token) return;
    try {
      const apiBase = API_BASE;
      await fetch(`${apiBase}/feed/posts/${postId}/reactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ type }),
      });
      // Optimistic update
      setPosts((prev) =>
        prev.map((p) => {
          if (p.id === postId) {
            return { ...p, reactions: { ...p.reactions, [type]: (p.reactions[type] || 0) + 1 } };
          }
          return p;
        }),
      );
    } catch (err) {
      console.error('Reaction error:', err);
    }
  }

  const handleNewPost = (post) => {
    // If API returned a fully formed post object, use it. Otherwise fall back to a local representation.
    const newPost = post?.id
      ? post
      : {
          id: Math.random().toString(36).substring(7),
          authorName: 'You',
          authorAvatar: '',
          authorTitle: '',
          trustLevel: 'verified',
          content: post.content,
          mediaUrl: post.media && post.media[0] ? post.media[0].preview : undefined,
          reactions: { like: 0, love: 0, support: 0, celebrate: 0 },
          commentCount: 0,
          shareCount: 0,
          createdAt: 'Just now',
        };

    setPosts((prev) => [newPost, ...prev]);
  };

  const reactionEmojis = {
    like: '👍',
    love: '❤️',
    support: '🤝',
    celebrate: '🎉',
    insightful: '💡',
    curious: '🤔',
  };

  const getTrustBadge = (level) => {
    const badges = {
      new: { icon: '🌱', color: accentPurple, label: 'New Member' },
      basic: { icon: '✓', color: '#64748B', label: 'Member' },
      established: { icon: '★', color: accentPink, label: 'Established' },
      trusted: { icon: '💎', color: accentPurple, label: 'Trusted' },
      verified: { icon: '✓', color: accentPink, label: 'Verified' },
    };
    return badges[level] || badges.new;
  };

  // Partner organizations for sidebar
  const partners = [
    { name: 'Rio Tinto', logo: '🏭', jobs: 23 },
    { name: 'Qantas', logo: '✈️', jobs: 12 },
    { name: 'Telstra', logo: '📱', jobs: 34 },
    { name: 'NAB', logo: '🏦', jobs: 18 },
  ];

  // Trending topics
  const trendingTopics = [
    { tag: '#FirstNationsInTech', posts: '2.4k' },
    { tag: '#IndigenousExcellence', posts: '1.8k' },
    { tag: '#DeadlyCareers', posts: '956' },
    { tag: '#CulturalStrength', posts: '734' },
  ];

  return (
    <div className="ngurra-page py-6 relative overflow-hidden">
      {/* Decorative halos */}
      <div className="ngurra-halo-pink" />
      <div className="ngurra-halo-purple" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Three Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Sidebar - Desktop */}
          <aside className="hidden lg:block lg:col-span-3">
            <div
              className="sticky top-20 space-y-4 rounded-xl p-4 bg-white border border-slate-200"
              style={{ boxShadow: '0 4px 20px rgba(15, 23, 42, 0.06)' }}
            >
              {/* Quick Actions */}
              <div>
                <h3 className="text-sm font-semibold mb-3" style={{ color: accentPink }}>
                  Quick Actions
                </h3>
                <div className="space-y-2">
                  <Link
                    href="/social-feed/new"
                    className="flex items-center gap-2 p-2 rounded-lg transition-colors text-slate-700 hover:bg-pink-50 hover:text-pink-600"
                  >
                    ✏️ Create Post
                  </Link>
                  <Link
                    href="/jobs"
                    className="flex items-center gap-2 p-2 rounded-lg transition-colors text-slate-700 hover:bg-pink-50 hover:text-pink-600"
                  >
                    💼 Browse Jobs
                  </Link>
                  <Link
                    href="/events"
                    className="flex items-center gap-2 p-2 rounded-lg transition-colors text-slate-700 hover:bg-pink-50 hover:text-pink-600"
                  >
                    📅 Upcoming Events
                  </Link>
                  <Link
                    href="/mentorship"
                    className="flex items-center gap-2 p-2 rounded-lg transition-colors text-slate-700 hover:bg-pink-50 hover:text-pink-600"
                  >
                    🤝 Find a Mentor
                  </Link>
                </div>
              </div>

              {/* Trending Topics */}
              <div className="pt-4 border-t border-slate-100">
                <h3 className="text-sm font-semibold mb-3" style={{ color: accentPurple }}>
                  Trending Topics
                </h3>
                <div className="space-y-2">
                  {trendingTopics.map((topic, i) => (
                    <Link
                      key={i}
                      href={`/search?q=${topic.tag}`}
                      className="flex items-center justify-between p-2 rounded-lg transition-colors text-slate-700 hover:bg-purple-50"
                    >
                      <span style={{ color: accentPink }}>{topic.tag}</span>
                      <span className="text-xs text-slate-400">{topic.posts} posts</span>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </aside>

          {/* Main Feed Column */}
          <main className="lg:col-span-6">
            {/* Header */}
            <div className="mb-6">
              <h1
                className="text-2xl font-bold mb-4 text-transparent bg-clip-text"
                style={{
                  backgroundImage: `linear-gradient(135deg, ${accentPink} 0%, ${accentPurple} 100%)`,
                }}
              >
                Community Feed ✨
              </h1>

              {/* Feed Tabs */}
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
                    className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
                    style={
                      activeTab === tab.id
                        ? {
                            background: `linear-gradient(135deg, ${accentPink} 0%, ${accentPurple} 100%)`,
                            color: 'white',
                            boxShadow: '0 4px 12px rgba(233, 30, 140, 0.3)',
                          }
                        : {
                            background: 'white',
                            border: '1px solid #E2E8F0',
                            color: '#64748B',
                          }
                    }
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Create Post Card */}
            <div
              className="rounded-xl p-4 mb-6 bg-white border border-slate-200"
              style={{ boxShadow: '0 4px 20px rgba(15, 23, 42, 0.06)' }}
            >
              <div className="flex gap-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{
                    background:
                      'linear-gradient(135deg, rgba(233, 30, 140, 0.15) 0%, rgba(139, 92, 246, 0.15) 100%)',
                  }}
                >
                  👤
                </div>
                <Link
                  href="/social-feed/new"
                  className="flex-1 p-3 rounded-lg text-left bg-slate-50 text-slate-400 hover:bg-pink-50 transition-colors"
                >
                  Share your story with the community...
                </Link>
              </div>
              <div className="flex gap-4 mt-3 pt-3 border-t border-slate-100">
                <button className="text-sm flex items-center gap-1" style={{ color: accentPink }}>
                  📷 Photo
                </button>
                <button className="text-sm flex items-center gap-1" style={{ color: accentPurple }}>
                  🎥 Video
                </button>
                <button className="text-sm flex items-center gap-1" style={{ color: accentPink }}>
                  📅 Event
                </button>
                <button className="text-sm flex items-center gap-1" style={{ color: accentPurple }}>
                  💼 Job
                </button>
              </div>
            </div>

            {/* New Post Form */}
            <PostForm onPost={handleNewPost} />

            {/* Posts Feed */}
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="w-12 h-12 rounded-full animate-spin border-4 border-pink-200 border-t-pink-500" />
              </div>
            ) : (
              <div className="space-y-6">
                {posts.map((post, index) => (
                  <article
                    key={post.id}
                    className="rounded-xl overflow-hidden transition-all bg-white border border-slate-200"
                    style={{ boxShadow: '0 4px 20px rgba(15, 23, 42, 0.06)' }}
                  >
                    {/* Sponsored Label */}
                    {post.isSponsored && (
                      <div
                        className="px-4 py-2 text-xs font-medium flex items-center gap-2 border-b border-slate-100"
                        style={{ color: accentPink }}
                      >
                        ✨ Sponsored · Partner Opportunity
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
                            cloudinary={isCloudinaryPublicId(post.authorAvatar)}
                            className="w-full h-full object-cover"
                            sizes="48px"
                            priority={index < 3}
                          />
                        </div>
                        {/* Trust Badge */}
                        <div
                          className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] text-white"
                          style={{ background: getTrustBadge(post.trustLevel).color }}
                          title={getTrustBadge(post.trustLevel).label}
                        >
                          {getTrustBadge(post.trustLevel).icon}
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-slate-800">{post.authorName}</h3>
                          {post.isOrganization && (
                            <span
                              className="text-xs px-2 py-0.5 rounded-full"
                              style={{
                                background: 'rgba(139, 92, 246, 0.15)',
                                color: accentPurple,
                              }}
                            >
                              Organization
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-slate-500">{post.authorTitle}</p>
                        <p className="text-xs mt-0.5 text-slate-400">{post.createdAt}</p>
                      </div>

                      <button className="p-2 rounded-lg transition-colors text-slate-400 hover:bg-slate-100">
                        •••
                      </button>
                    </div>

                    {/* Post Content */}
                    <div className="px-4 pb-4">
                      <p className="leading-relaxed whitespace-pre-line text-slate-700">
                        {post.content}
                      </p>
                    </div>

                    {/* Media */}
                    {post.mediaUrl && (
                      <div className="relative aspect-video overflow-hidden">
                        <Image
                          src={post.mediaUrl}
                          alt="Post media"
                          fill
                          cloudinary={isCloudinaryPublicId(post.mediaUrl)}
                          className="object-cover"
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 70vw, 60vw"
                          priority={index < 2}
                        />
                      </div>
                    )}

                    {/* Reactions Summary */}
                    <div className="px-4 py-3 flex items-center justify-between text-sm border-t border-slate-100 text-slate-500">
                      <div className="flex items-center gap-1">
                        {Object.entries(post.reactions)
                          .slice(0, 3)
                          .map(([type]) => (
                            <span key={type}>{reactionEmojis[type]}</span>
                          ))}
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

                    {/* Action Buttons */}
                    <div className="px-4 py-3 flex justify-around border-t border-slate-100">
                      <button
                        onClick={() => handleReaction(post.id, 'like')}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all text-slate-500 hover:bg-pink-50 hover:text-pink-600"
                      >
                        <span>👍</span>
                        <span className="hidden sm:inline text-sm">Like</span>
                      </button>
                      <Link
                        href={`/social-feed/${post.id}`}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all text-slate-500 hover:bg-purple-50 hover:text-purple-600"
                      >
                        <span>💬</span>
                        <span className="hidden sm:inline text-sm">Comment</span>
                      </Link>
                      <button className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all text-slate-500 hover:bg-pink-50 hover:text-pink-600">
                        <span>↗️</span>
                        <span className="hidden sm:inline text-sm">Share</span>
                      </button>
                      <button className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all text-slate-500 hover:bg-purple-50 hover:text-purple-600">
                        <span>🔖</span>
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
                      className="px-8 py-3 rounded-lg font-medium transition-all text-white hover:opacity-90"
                      style={{
                        background: `linear-gradient(135deg, ${accentPink} 0%, ${accentPurple} 100%)`,
                        boxShadow: '0 4px 12px rgba(233, 30, 140, 0.3)',
                      }}
                    >
                      Load More Posts ✨
                    </button>
                  </div>
                )}
              </div>
            )}
          </main>

          {/* Right Sidebar - Desktop */}
          <aside className="hidden lg:block lg:col-span-3">
            <div className="sticky top-20 space-y-4">
              {/* Partner Jobs Ad */}
              <div
                className="rounded-xl p-4 bg-white border border-slate-200"
                style={{ boxShadow: '0 4px 20px rgba(15, 23, 42, 0.06)' }}
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold" style={{ color: accentPink }}>
                    Partner Opportunities
                  </h3>
                  <span
                    className="text-[10px] px-2 py-0.5 rounded"
                    style={{ background: 'rgba(233, 30, 140, 0.15)', color: accentPink }}
                  >
                    AD
                  </span>
                </div>
                <div className="space-y-3">
                  {partners.map((partner, i) => (
                    <Link
                      key={i}
                      href="/jobs"
                      className="flex items-center justify-between p-2 rounded-lg transition-colors hover:bg-pink-50"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{partner.logo}</span>
                        <span className="text-slate-700">{partner.name}</span>
                      </div>
                      <span
                        className="text-xs px-2 py-0.5 rounded-full"
                        style={{ background: 'rgba(139, 92, 246, 0.15)', color: accentPurple }}
                      >
                        {partner.jobs} jobs
                      </span>
                    </Link>
                  ))}
                </div>
                <Link
                  href="/jobs"
                  className="block mt-3 text-center py-2 rounded-lg text-sm font-medium transition-all border hover:bg-pink-50"
                  style={{ borderColor: accentPink, color: accentPink }}
                >
                  View All Partner Jobs →
                </Link>
              </div>

              {/* Training Pathway Ad */}
              <div
                className="rounded-xl p-4 bg-white border border-slate-200"
                style={{ boxShadow: '0 4px 20px rgba(15, 23, 42, 0.06)' }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span
                    className="text-[10px] px-2 py-0.5 rounded"
                    style={{ background: 'rgba(139, 92, 246, 0.15)', color: accentPurple }}
                  >
                    SPONSORED
                  </span>
                </div>
                <h3 className="font-semibold mb-2" style={{ color: accentPurple }}>
                  Free TAFE Courses
                </h3>
                <p className="text-sm mb-3 text-slate-500">
                  Fully funded Certificate III & IV programs for First Nations students in Health,
                  IT, and Construction.
                </p>
                <Link
                  href="/courses"
                  className="block text-center py-2 rounded-lg text-sm font-medium text-white hover:opacity-90 transition-all"
                  style={{
                    background: `linear-gradient(135deg, ${accentPink} 0%, ${accentPurple} 100%)`,
                    boxShadow: '0 4px 12px rgba(233, 30, 140, 0.3)',
                  }}
                >
                  Learn More
                </Link>
              </div>

              {/* Community Stats */}
              <div
                className="rounded-xl p-4 bg-white border border-slate-200"
                style={{ boxShadow: '0 4px 20px rgba(15, 23, 42, 0.06)' }}
              >
                <h3 className="text-sm font-semibold mb-3" style={{ color: accentPink }}>
                  Community Impact
                </h3>
                <div className="grid grid-cols-2 gap-3 text-center">
                  <div>
                    <div className="text-xl font-bold" style={{ color: accentPink }}>
                      12.5K
                    </div>
                    <div className="text-[10px] text-slate-400">Jobs Filled</div>
                  </div>
                  <div>
                    <div className="text-xl font-bold" style={{ color: accentPurple }}>
                      8.2K
                    </div>
                    <div className="text-[10px] text-slate-400">Mentorships</div>
                  </div>
                  <div>
                    <div className="text-xl font-bold" style={{ color: accentPink }}>
                      $45M
                    </div>
                    <div className="text-[10px] text-slate-400">Wages Earned</div>
                  </div>
                  <div>
                    <div className="text-xl font-bold" style={{ color: accentPurple }}>
                      250+
                    </div>
                    <div className="text-[10px] text-slate-400">Partners</div>
                  </div>
                </div>
              </div>

              {/* Acknowledgment */}
              <div className="text-center py-3">
                <p className="text-[10px] text-slate-400">
                  <span style={{ color: accentPink }}>✦</span> We acknowledge Traditional Custodians{' '}
                  <span style={{ color: accentPurple }}>✦</span>
                </p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
