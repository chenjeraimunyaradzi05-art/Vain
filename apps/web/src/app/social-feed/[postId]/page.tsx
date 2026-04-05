'use client';

import api from '@/lib/apiClient';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from '@/components/ui/OptimizedImage';
import { isCloudinaryPublicId } from '@/lib/cloudinary';
import { Space_Grotesk } from 'next/font/google';
import { 
  ArrowLeft, Heart, MessageCircle, Share2, Bookmark, 
  MoreHorizontal, Send, Sparkles
} from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';

const spaceGrotesk = Space_Grotesk({ 
  subsets: ['latin'], 
  weight: ['400', '500', '700'],
  variable: '--font-space-grotesk'
});

interface ApiMediaItem { url?: string }
interface ApiComment {
  id?: string | number;
  authorName?: string;
  authorAvatar?: string | null;
  content?: string;
  createdAt?: string;
  likeCount?: number;
}
interface ApiPost {
  id?: string | number;
  content?: unknown;
  createdAt?: string;
  authorName?: string;
  authorAvatar?: string | null;
  authorTitle?: string;
  trustLevel?: string;
  likes?: number;
  likedByUser?: boolean;
  media?: unknown;
  isOrganization?: boolean;
  isSponsored?: boolean;
  comments?: ApiComment[];
  reactionCounts?: Record<string, number>;
  reactions?: Record<string, number>;
  likeCount?: number;
  commentCount?: number;
  _count?: { comments?: number };
  shareCount?: number;
}

interface Comment {
  id: string;
  authorName: string;
  authorAvatar?: string | null;
  content: string;
  createdAt: string;
  likes: number;
}

interface Post {
  id: string;
  authorName: string;
  authorAvatar?: string | null;
  authorTitle: string;
  trustLevel: string;
  content: string;
  mediaUrl?: string | null;
  reactions: { [key: string]: number };
  commentCount: number;
  shareCount: number;
  createdAt: string;
  isOrganization?: boolean;
  isSponsored?: boolean;
  comments: Comment[];
}

export default function PostDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

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

  function pickFirstMediaUrl(raw: unknown): string | null {
    if (!raw) return null;
    if (typeof raw === 'string') {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0 && (parsed[0] as ApiMediaItem)?.url) {
          return (parsed[0] as ApiMediaItem).url || null;
        }
      } catch {
        return null;
      }
    }
    if (Array.isArray(raw)) {
      const first = raw[0] as ApiMediaItem | string;
      if (typeof first === 'string') return first;
      if (first?.url) return first.url;
    }
    return null;
  }

  function mapApiPostToUi(apiPost: ApiPost): Post {
    const content = typeof apiPost?.content === 'string' ? apiPost.content : '';
    return {
      id: String(apiPost?.id ?? params.postId),
      authorName: apiPost?.authorName || 'Community Member',
      authorAvatar: apiPost?.authorAvatar ?? null,
      authorTitle: apiPost?.authorTitle || '',
      trustLevel: apiPost?.trustLevel || 'basic',
      content,
      mediaUrl: pickFirstMediaUrl(apiPost?.media) || null,
      reactions: apiPost?.reactionCounts || apiPost?.reactions || { like: apiPost?.likeCount || 0 },
      commentCount: apiPost?.commentCount ?? apiPost?._count?.comments ?? 0,
      shareCount: apiPost?.shareCount ?? 0,
      createdAt: formatTimeAgo(apiPost?.createdAt),
      isOrganization: !!apiPost?.isOrganization,
      isSponsored: !!apiPost?.isSponsored,
      comments: Array.isArray(apiPost?.comments)
        ? apiPost.comments.map((c: ApiComment) => ({
            id: String(c?.id ?? ''),
            authorName: c?.authorName || 'Community Member',
            authorAvatar: c?.authorAvatar ?? null,
            content: c?.content || '',
            createdAt: formatTimeAgo(c?.createdAt),
            likes: c?.likeCount || 0,
          }))
        : [],
    };
  }

  // Fallback post data — references real programs and organisations
  const mockPost: Post = {
    id: params.postId as string,
    authorName: 'Community Member',
    authorAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop',
    authorTitle: 'Software Engineer at Atlassian',
    trustLevel: 'trusted',
    content: 'Started my career through a CareerTrackers internship while studying at UTS. Four years later, I\'m building products at one of Australia\'s biggest tech companies.\n\nTo anyone thinking it\'s too late or too hard — keep going. The path is there, even when you can\'t see it. 💎\n\n#FirstNationsInTech #CareerTrackers #CareerJourney',
    mediaUrl: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800&h=500&fit=crop',
    reactions: { like: 891, love: 423, support: 267, celebrate: 345 },
    commentCount: 234,
    shareCount: 189,
    createdAt: '6 hours ago',
    comments: [
      {
        id: '1',
        authorName: 'Community Member',
        authorAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop',
        content: 'This is so inspiring! I\'m currently studying IT at TAFE Queensland and sometimes wonder if I\'ll make it. Thank you for sharing! 🙏',
        createdAt: '2 hours ago',
        likes: 45
      },
      {
        id: '2',
        authorName: 'Community Member',
        authorAvatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop',
        content: 'You\'re an inspiration to so many of us. The path you\'ve carved makes it easier for those coming behind. 💪',
        createdAt: '3 hours ago',
        likes: 67
      },
      {
        id: '3',
        authorName: 'Community Member',
        authorAvatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop',
        content: 'Would love to hear more about the CareerTrackers program and how you found your mentors. I\'m looking for guidance in tech!',
        createdAt: '4 hours ago',
        likes: 23
      },
      {
        id: '4',
        authorName: 'Community Member',
        authorAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop',
        content: 'We were in the same CareerTrackers cohort back in 2022! So proud to see how far you\'ve come. Keep shining! ✨',
        createdAt: '5 hours ago',
        likes: 89
      }
    ]
  };

  useEffect(() => {
    const fetchPost = async () => {
      try {
        const postId = String((params as any)?.postId ?? '');
        const res = await api(`/social-feed/posts/${postId}`);
        if (!res.ok) {
          setPost(mockPost);
          return;
        }

        const apiPost = (res.data as { post?: ApiPost })?.post ?? (res.data as ApiPost);
        const mapped = mapApiPostToUi(apiPost);

        // Optionally hydrate comments from the dedicated endpoint
        try {
          const commentsRes = await api(`/social-feed/posts/${postId}/comments`);
          if (commentsRes.ok) {
            const commentsData = commentsRes.data as { comments?: ApiComment[]; total?: number };
            const comments = Array.isArray(commentsData?.comments) ? commentsData.comments : [];
            mapped.comments = comments.map((c: ApiComment) => ({
              id: String(c?.id ?? ''),
              authorName: c?.authorName || 'Community Member',
              authorAvatar: c?.authorAvatar ?? null,
              content: c?.content || '',
              createdAt: formatTimeAgo(c?.createdAt),
              likes: c?.likeCount || 0,
            }));
            if (typeof commentsData?.total === 'number') {
              mapped.commentCount = commentsData.total;
            }
          }
        } catch {
          // ignore; keep mapped.comments
        }

        setPost(mapped);
      } catch {
        setPost(mockPost);
      } finally {
        setLoading(false);
      }
    };
    fetchPost();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.postId]);

  const handleSubmitComment = async () => {
    if (!newComment.trim()) return;
    
    setSubmittingComment(true);
    try {
      // Optimistic update
      const tempId = Date.now().toString();
      const contentToSubmit = newComment;
      const newCommentObj: Comment = {
        id: tempId,
        authorName: user?.profile?.firstName ? `${user.profile.firstName} ${user.profile.lastName || ''}`.trim() : 'You',
        authorAvatar: user?.profile?.avatar || null,
        content: contentToSubmit,
        createdAt: 'Just now',
        likes: 0
      };
      
      setPost(prev => prev ? {
        ...prev,
        comments: [newCommentObj, ...prev.comments],
        commentCount: prev.commentCount + 1
      } : null);
      
      setNewComment('');
      
      // API call
      const postId = String((params as any)?.postId ?? '');
      const res = await api(`/social-feed/posts/${postId}/comments`, {
        method: 'POST',
        body: { content: contentToSubmit },
      });

      if (!res.ok) {
        // Roll back optimistic update
        setPost(prev => prev ? {
          ...prev,
          comments: prev.comments.filter(c => c.id !== tempId),
          commentCount: Math.max(0, prev.commentCount - 1)
        } : null);
        return;
      }

      const serverComment = (res.data as { comment?: ApiComment })?.comment;
      if (serverComment?.id) {
        setPost(prev => prev ? {
          ...prev,
          comments: prev.comments.map(c => c.id === tempId ? {
            id: String(serverComment.id),
            authorName: serverComment.authorName || c.authorName,
            authorAvatar: serverComment.authorAvatar ?? c.authorAvatar,
            content: serverComment.content || c.content,
            createdAt: formatTimeAgo(serverComment.createdAt),
            likes: serverComment.likeCount || 0,
          } : c),
        } : null);
      }
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleReaction = async (type: string) => {
    // Optimistic update
    setPost(prev => prev ? {
      ...prev,
      reactions: { ...prev.reactions, [type]: (prev.reactions[type] || 0) + 1 }
    } : null);

    const postId = String((params as any)?.postId ?? '');
    const res = await api(`/social-feed/posts/${postId}/react`, {
      method: 'POST',
      body: { type },
    });

    if (!res.ok) {
      // Roll back
      setPost(prev => prev ? {
        ...prev,
        reactions: { ...prev.reactions, [type]: Math.max(0, (prev.reactions[type] || 0) - 1) }
      } : null);
    }
  };

  const getTrustBadge = (level: string) => {
    const badges: { [key: string]: { icon: string; color: string; label: string } } = {
      new: { icon: '🌱', color: '#6B4C9A', label: 'New Member' },
      basic: { icon: '✓', color: '#87CEEB', label: 'Member' },
      established: { icon: '★', color: '#E85B8A', label: 'Established' },
      trusted: { icon: '💎', color: '#50C878', label: 'Trusted' },
      verified: { icon: '✓', color: '#FFD700', label: 'Verified' }
    };
    return badges[level] || badges.new;
  };

  if (loading) {
    return (
      <div className={`${spaceGrotesk.className} ngurra-page flex items-center justify-center`}>
        <div className="w-12 h-12 rounded-full border-4 border-slate-200 dark:border-white/20 border-t-purple-500 dark:border-t-amber-400 animate-spin" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className={`${spaceGrotesk.className} ngurra-page flex items-center justify-center`}>
        <div className="text-center">
          <h1 className="ngurra-h1 text-2xl mb-4">Post not found</h1>
          <Link href="/social-feed" className="ngurra-link">
            Back to feed
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={`${spaceGrotesk.className} ngurra-page`}>
      {/* Dot pattern overlay */}
      <div 
        className="fixed inset-0 opacity-[0.04] dark:opacity-10 pointer-events-none"
        style={{
          backgroundImage: `
            radial-gradient(circle at 20% 30%, #FFD700 1.5px, transparent 1.5px),
            radial-gradient(circle at 80% 70%, #50C878 1.5px, transparent 1.5px),
            radial-gradient(circle at 50% 50%, #E85B8A 1px, transparent 1px)
          `,
          backgroundSize: '80px 80px'
        }}
      />

      <div className="relative max-w-2xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button 
            onClick={() => router.back()}
            className="p-2 rounded-lg bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Post</h1>
        </div>

        {/* Post */}
        <article className="rounded-xl overflow-hidden bg-white dark:bg-white/5 backdrop-blur-md border border-gray-200 dark:border-white/10 shadow-sm dark:shadow-none mb-6">
          {/* Post Header */}
          <div className="p-4 flex items-start gap-3">
            <div className="relative">
              <div 
                className="w-12 h-12 rounded-full overflow-hidden"
                style={{ border: `2px solid ${getTrustBadge(post.trustLevel).color}` }}
              >
                {post.authorAvatar ? (
                  <Image
                    src={post.authorAvatar}
                    alt={post.authorName}
                    width={48}
                    height={48}
                    cloudinary={isCloudinaryPublicId(post.authorAvatar || '')}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-100 dark:bg-white/10 flex items-center justify-center text-gray-700 dark:text-white font-semibold">
                    {(post.authorName || 'C')[0]}
                  </div>
                )}
              </div>
              <div 
                className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px]"
                style={{ background: getTrustBadge(post.trustLevel).color, color: '#1A0F2E' }}
              >
                {getTrustBadge(post.trustLevel).icon}
              </div>
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-gray-900 dark:text-white">{post.authorName}</h3>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{post.authorTitle}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500">{post.createdAt}</p>
            </div>
            
            <button className="p-2 rounded-lg text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5">
              <MoreHorizontal className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="px-4 pb-4">
            <p className="text-gray-800 dark:text-gray-200 whitespace-pre-line leading-relaxed text-lg">{post.content}</p>
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
                {Object.values(post.reactions).reduce((a, b) => a + b, 0).toLocaleString()}
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
              onClick={() => handleReaction('like')}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
            >
              <Heart className="w-5 h-5" />
              <span className="text-sm">Like</span>
            </button>
            <button className="flex items-center gap-2 px-4 py-2 rounded-lg text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-white/5">
              <MessageCircle className="w-5 h-5" />
              <span className="text-sm">Comment</span>
            </button>
            <button className="flex items-center gap-2 px-4 py-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-amber-600 dark:hover:text-amber-400 transition-colors">
              <Share2 className="w-5 h-5" />
              <span className="text-sm">Share</span>
            </button>
            <button className="flex items-center gap-2 px-4 py-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-amber-600 dark:hover:text-amber-400 transition-colors">
              <Bookmark className="w-5 h-5" />
              <span className="text-sm">Save</span>
            </button>
          </div>
        </article>

        {/* Comment Input */}
        {isAuthenticated ? (
          <div className="rounded-xl bg-white dark:bg-white/5 backdrop-blur-md border border-gray-200 dark:border-white/10 shadow-sm dark:shadow-none p-4 mb-6">
            <div className="flex gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center text-white font-bold shrink-0">
                {user?.profile?.firstName?.[0] || user?.email?.[0] || 'U'}
              </div>
              <div className="flex-1 flex gap-2">
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSubmitComment()}
                  placeholder="Write a comment..."
                  className="flex-1 bg-gray-100 dark:bg-white/5 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 rounded-lg px-4 py-2 border border-gray-200 dark:border-white/10 focus:outline-none focus:border-amber-500/50"
                />
                <button
                  onClick={handleSubmitComment}
                  disabled={!newComment.trim() || submittingComment}
                  className="p-2 rounded-lg bg-gradient-to-r from-emerald-600 to-emerald-500 text-white hover:from-emerald-500 hover:to-emerald-400 transition-all disabled:opacity-50"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-xl bg-white dark:bg-white/5 backdrop-blur-md border border-gray-200 dark:border-white/10 shadow-sm dark:shadow-none p-4 mb-6 text-center">
            <p className="text-gray-600 dark:text-gray-400 text-sm mb-2">Sign in to join the conversation</p>
            <a href={`/signin?returnTo=/social-feed/${params.postId}`} className="inline-block px-4 py-1.5 rounded-lg text-sm font-medium bg-gradient-to-r from-emerald-600 to-emerald-500 text-white hover:from-emerald-500 hover:to-emerald-400 transition-all">
              Sign In
            </a>
          </div>
        )}

        {/* Comments */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-amber-500 dark:text-amber-400" />
            Comments ({post.comments.length})
          </h2>
          
          {post.comments.length === 0 && (
            <p className="text-gray-500 dark:text-gray-400 text-sm text-center py-6">No comments yet. Be the first to share your thoughts!</p>
          )}
          {post.comments.map((comment) => (
            <div 
              key={comment.id}
              className="rounded-xl bg-white dark:bg-white/5 backdrop-blur-md border border-gray-200 dark:border-white/10 shadow-sm dark:shadow-none p-4"
            >
              <div className="flex gap-3">
                <div className="w-10 h-10 rounded-full overflow-hidden shrink-0">
                  {comment.authorAvatar ? (
                    <Image
                      src={comment.authorAvatar}
                      alt={comment.authorName}
                      width={40}
                      height={40}
                      cloudinary={isCloudinaryPublicId(comment.authorAvatar || '')}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-100 dark:bg-white/10 flex items-center justify-center text-gray-700 dark:text-white font-semibold">
                      {(comment.authorName || 'C')[0]}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-gray-900 dark:text-white text-sm">{comment.authorName}</span>
                    <span className="text-xs text-gray-500">{comment.createdAt}</span>
                  </div>
                  <p className="text-gray-700 dark:text-gray-300 text-sm">{comment.content}</p>
                  <div className="flex items-center gap-4 mt-2">
                    <button className="text-xs text-gray-500 hover:text-amber-600 dark:hover:text-amber-400 flex items-center gap-1">
                      <Heart className="w-3 h-3" /> {comment.likes}
                    </button>
                    <button className="text-xs text-gray-500 hover:text-amber-600 dark:hover:text-amber-400">Reply</button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
