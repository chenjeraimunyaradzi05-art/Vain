'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '../Button';
import { toCloudinaryAutoUrl } from '@/lib/cloudinary';
import OptimizedImage from '@/components/ui/OptimizedImage';

/**
 * StoriesFeed - Indigenous stories and community narratives
 * 
 * Features:
 * - Browse community stories
 * - Share your own story
 * - Cultural stories and knowledge
 * - Story categories and filtering
 * - Like, comment, and share
 * - Audio stories
 */

interface Story {
  id: string;
  author: {
    id: string;
    name: string;
    avatar?: string;
    role?: string;
    isVerified?: boolean;
  };
  title: string;
  content: string;
  excerpt?: string;
  type: 'text' | 'audio' | 'video';
  category: 'personal' | 'cultural' | 'career' | 'community' | 'dreaming' | 'elder-wisdom';
  mediaUrl?: string;
  thumbnailUrl?: string;
  duration?: number; // for audio/video
  tags: string[];
  region?: string;
  language?: string;
  isPublic: boolean;
  culturalNote?: string;
  likes: number;
  comments: number;
  shares: number;
  isLiked: boolean;
  isBookmarked: boolean;
  createdAt: string;
}

interface Comment {
  id: string;
  author: {
    id: string;
    name: string;
    avatar?: string;
  };
  content: string;
  createdAt: string;
  likes: number;
  isLiked: boolean;
  replies?: Comment[];
}

// API functions
const storiesApi = {
  async getStories(params?: { 
    category?: string; 
    region?: string;
    featured?: boolean;
  }): Promise<{ stories: Story[] }> {
    const searchParams = new URLSearchParams();
    if (params?.category) searchParams.set('category', params.category);
    if (params?.region) searchParams.set('region', params.region);
    if (params?.featured) searchParams.set('featured', 'true');
    const res = await fetch(`/api/stories?${searchParams}`, { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch stories');
    return res.json();
  },

  async getStory(id: string): Promise<Story> {
    const res = await fetch(`/api/stories/${id}`, { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch story');
    return res.json();
  },

  async getComments(storyId: string): Promise<{ comments: Comment[] }> {
    const res = await fetch(`/api/stories/${storyId}/comments`, { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch comments');
    return res.json();
  },

  async likeStory(id: string): Promise<void> {
    const res = await fetch(`/api/stories/${id}/like`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Failed to like story');
  },

  async unlikeStory(id: string): Promise<void> {
    const res = await fetch(`/api/stories/${id}/like`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Failed to unlike story');
  },

  async bookmarkStory(id: string): Promise<void> {
    const res = await fetch(`/api/stories/${id}/bookmark`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Failed to bookmark story');
  },

  async addComment(storyId: string, content: string): Promise<Comment> {
    const res = await fetch(`/api/stories/${storyId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ content }),
    });
    if (!res.ok) throw new Error('Failed to add comment');
    return res.json();
  },

  async createStory(data: {
    title: string;
    content: string;
    type: string;
    category: string;
    tags: string[];
    isPublic: boolean;
  }): Promise<Story> {
    const res = await fetch('/api/stories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to create story');
    return res.json();
  },
};

// Category config
const categoryConfig: Record<string, { label: string; icon: string; color: string; description: string }> = {
  personal: { label: 'Personal Journey', icon: '🌟', color: 'blue', description: 'Share your personal experiences and growth' },
  cultural: { label: 'Cultural Heritage', icon: '🎨', color: 'purple', description: 'Stories preserving cultural knowledge' },
  career: { label: 'Career Path', icon: '💼', color: 'green', description: 'Professional journeys and insights' },
  community: { label: 'Community', icon: '🤝', color: 'orange', description: 'Stories from our community' },
  dreaming: { label: 'Dreaming Stories', icon: '🌙', color: 'indigo', description: 'Traditional Dreaming narratives' },
  'elder-wisdom': { label: 'Elder Wisdom', icon: '🙏', color: 'amber', description: 'Wisdom shared by our Elders' },
};

// Format time
function formatTimeAgo(date: string): string {
  const d = new Date(date);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
}

// Format duration for audio/video
function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Story Card Component
function StoryCard({
  story,
  onLike,
  onBookmark,
  onViewFull,
}: {
  story: Story;
  onLike: () => void;
  onBookmark: () => void;
  onViewFull: () => void;
}) {
  const category = categoryConfig[story.category] || categoryConfig.personal;
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  const toggleAudio = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  return (
    <article className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-lg transition-shadow">
      {/* Media */}
      {story.type === 'video' && story.thumbnailUrl && (
        <div className="relative aspect-video bg-gray-900 cursor-pointer group" onClick={onViewFull}>
          <OptimizedImage
            src={toCloudinaryAutoUrl(story.thumbnailUrl)}
            alt={`${story.title} video thumbnail`}
            width={1280}
            height={720}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="w-16 h-16 bg-white/90 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-900 ml-1" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </div>
          {story.duration && (
            <span className="absolute bottom-2 right-2 px-2 py-1 bg-black/70 text-white text-xs rounded">
              {formatDuration(story.duration)}
            </span>
          )}
        </div>
      )}

      {story.type === 'audio' && (
        <div className="p-4 bg-gradient-to-r from-purple-500 to-indigo-600">
          <audio ref={audioRef} src={story.mediaUrl} />
          <div className="flex items-center gap-4">
            <button
              onClick={toggleAudio}
              className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-purple-600 hover:scale-105 transition-transform"
            >
              {isPlaying ? (
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                </svg>
              ) : (
                <svg className="w-6 h-6 ml-1" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>
            <div className="flex-1">
              <div className="h-1 bg-white/30 rounded-full">
                <div className="h-full w-0 bg-white rounded-full transition-all" />
              </div>
            </div>
            {story.duration && (
              <span className="text-white text-sm">{formatDuration(story.duration)}</span>
            )}
          </div>
        </div>
      )}

      <div className="p-4">
        {/* Author */}
        <div className="flex items-center gap-3 mb-3">
          {story.author.avatar ? (
            <OptimizedImage
              src={toCloudinaryAutoUrl(story.author.avatar)}
              alt={`${story.author.name} avatar`}
              width={40}
              height={40}
              className="w-10 h-10 rounded-full"
            />
          ) : (
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400 font-medium">
              {story.author.name.charAt(0)}
            </div>
          )}
          <div className="flex-1">
            <div className="flex items-center gap-1">
              <span className="font-medium text-gray-900 dark:text-white">{story.author.name}</span>
              {story.author.isVerified && (
                <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              {story.author.role && <span>{story.author.role}</span>}
              <span>·</span>
              <span>{formatTimeAgo(story.createdAt)}</span>
            </div>
          </div>
          <span className={`px-2 py-1 text-xs font-medium rounded-full bg-${category.color}-100 dark:bg-${category.color}-900/30 text-${category.color}-700 dark:text-${category.color}-400`}>
            {category.icon} {category.label}
          </span>
        </div>

        {/* Content */}
        <h3 
          className="font-semibold text-gray-900 dark:text-white text-lg mb-2 cursor-pointer hover:text-blue-600"
          onClick={onViewFull}
        >
          {story.title}
        </h3>
        <p className="text-gray-600 dark:text-gray-400 line-clamp-3">
          {story.excerpt || story.content}
        </p>

        {/* Cultural Note */}
        {story.culturalNote && (
          <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border-l-4 border-amber-500">
            <p className="text-sm text-amber-800 dark:text-amber-300">
              <strong>Cultural Note:</strong> {story.culturalNote}
            </p>
          </div>
        )}

        {/* Tags */}
        {story.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {story.tags.map((tag) => (
              <span key={tag} className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Region/Language */}
        {(story.region || story.language) && (
          <div className="flex items-center gap-3 mt-3 text-xs text-gray-500">
            {story.region && (
              <span className="flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                </svg>
                {story.region}
              </span>
            )}
            {story.language && (
              <span className="flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                </svg>
                {story.language}
              </span>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-4">
            <button
              onClick={onLike}
              className={`flex items-center gap-1 ${
                story.isLiked ? 'text-red-500' : 'text-gray-500 hover:text-red-500'
              }`}
            >
              <svg className={`w-5 h-5 ${story.isLiked ? 'fill-current' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              <span className="text-sm">{story.likes}</span>
            </button>
            <button className="flex items-center gap-1 text-gray-500 hover:text-blue-500">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <span className="text-sm">{story.comments}</span>
            </button>
            <button className="flex items-center gap-1 text-gray-500 hover:text-green-500">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              <span className="text-sm">{story.shares}</span>
            </button>
          </div>
          <button
            onClick={onBookmark}
            className={story.isBookmarked ? 'text-yellow-500' : 'text-gray-400 hover:text-yellow-500'}
          >
            <svg className={`w-5 h-5 ${story.isBookmarked ? 'fill-current' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
          </button>
        </div>
      </div>
    </article>
  );
}

// Story Detail Modal
function StoryDetailModal({
  story,
  onClose,
  onLike,
}: {
  story: Story;
  onClose: () => void;
  onLike: () => void;
}) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isLoadingComments, setIsLoadingComments] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const category = categoryConfig[story.category] || categoryConfig.personal;

  useEffect(() => {
    async function loadComments() {
      try {
        const { comments: data } = await storiesApi.getComments(story.id);
        setComments(data);
      } catch (error) {
        console.error('Failed to load comments:', error);
      } finally {
        setIsLoadingComments(false);
      }
    }
    loadComments();
  }, [story.id]);

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    setIsSubmitting(true);
    try {
      const comment = await storiesApi.addComment(story.id, newComment);
      setComments(prev => [comment, ...prev]);
      setNewComment('');
    } catch (error) {
      console.error('Failed to add comment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {story.author.avatar ? (
              <OptimizedImage
                src={toCloudinaryAutoUrl(story.author.avatar)}
                alt={`${story.author.name} avatar`}
                width={40}
                height={40}
                className="w-10 h-10 rounded-full"
              />
            ) : (
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-medium">
                {story.author.name.charAt(0)}
              </div>
            )}
            <div>
              <p className="font-medium text-gray-900 dark:text-white">{story.author.name}</p>
              <p className="text-xs text-gray-500">{formatTimeAgo(story.createdAt)}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <span className={`inline-flex items-center gap-1 px-3 py-1 text-sm font-medium rounded-full bg-${category.color}-100 dark:bg-${category.color}-900/30 text-${category.color}-700 dark:text-${category.color}-400 mb-4`}>
            {category.icon} {category.label}
          </span>

          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">{story.title}</h1>

          {/* Video Player */}
          {story.type === 'video' && story.mediaUrl && (
            <video
              src={story.mediaUrl}
              controls
              className="w-full rounded-xl mb-4"
              poster={story.thumbnailUrl}
            />
          )}

          {/* Audio Player */}
          {story.type === 'audio' && story.mediaUrl && (
            <div className="p-4 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-xl mb-4">
              <audio src={story.mediaUrl} controls className="w-full" />
            </div>
          )}

          {/* Cultural Note */}
          {story.culturalNote && (
            <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border-l-4 border-amber-500 mb-4">
              <p className="text-sm text-amber-800 dark:text-amber-300">
                <strong>Cultural Note:</strong> {story.culturalNote}
              </p>
            </div>
          )}

          {/* Story Content */}
          <div className="prose dark:prose-invert max-w-none">
            {story.content.split('\n').map((paragraph, i) => (
              <p key={i}>{paragraph}</p>
            ))}
          </div>

          {/* Tags */}
          {story.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-6">
              {story.tags.map((tag) => (
                <span key={tag} className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full">
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Comments Section */}
          <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
              Comments ({comments.length})
            </h3>

            {/* Add Comment */}
            <div className="flex gap-3 mb-6">
              <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center text-gray-400">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div className="flex-1">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Share your thoughts..."
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg
                    bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
                />
                <div className="flex justify-end mt-2">
                  <Button size="sm" onClick={handleAddComment} disabled={!newComment.trim() || isSubmitting}>
                    {isSubmitting ? 'Posting...' : 'Post Comment'}
                  </Button>
                </div>
              </div>
            </div>

            {/* Comments List */}
            {isLoadingComments ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto" />
              </div>
            ) : comments.length > 0 ? (
              <div className="space-y-4">
                {comments.map((comment) => (
                  <div key={comment.id} className="flex gap-3">
                    {comment.author.avatar ? (
                      <OptimizedImage
                        src={toCloudinaryAutoUrl(comment.author.avatar)}
                        alt={`${comment.author.name} avatar`}
                        width={40}
                        height={40}
                        className="w-10 h-10 rounded-full"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center text-gray-600 dark:text-gray-400 font-medium text-sm">
                        {comment.author.name.charAt(0)}
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900 dark:text-white text-sm">
                            {comment.author.name}
                          </span>
                          <span className="text-xs text-gray-400">{formatTimeAgo(comment.createdAt)}</span>
                        </div>
                        <p className="text-gray-700 dark:text-gray-300 text-sm mt-1">{comment.content}</p>
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                        <button className="hover:text-blue-500">Like ({comment.likes})</button>
                        <button className="hover:text-blue-500">Reply</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-500 py-4">No comments yet. Be the first to comment!</p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onLike}
              className={`flex items-center gap-1 ${
                story.isLiked ? 'text-red-500' : 'text-gray-500 hover:text-red-500'
              }`}
            >
              <svg className={`w-6 h-6 ${story.isLiked ? 'fill-current' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              <span>{story.likes}</span>
            </button>
            <span className="text-gray-500">{story.comments} comments</span>
            <span className="text-gray-500">{story.shares} shares</span>
          </div>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  );
}

// Main Component
export function StoriesFeed() {
  const { user } = useAuth();
  const [stories, setStories] = useState<Story[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);

  const loadStories = useCallback(async () => {
    setIsLoading(true);
    try {
      const { stories: data } = await storiesApi.getStories({
        category: selectedCategory !== 'all' ? selectedCategory : undefined,
      });
      setStories(data);
    } catch (error) {
      console.error('Failed to load stories:', error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedCategory]);

  useEffect(() => {
    loadStories();
  }, [loadStories]);

  const handleLike = async (story: Story) => {
    try {
      if (story.isLiked) {
        await storiesApi.unlikeStory(story.id);
      } else {
        await storiesApi.likeStory(story.id);
      }
      setStories(prev => prev.map(s => 
        s.id === story.id 
          ? { ...s, isLiked: !s.isLiked, likes: s.isLiked ? s.likes - 1 : s.likes + 1 }
          : s
      ));
      if (selectedStory?.id === story.id) {
        setSelectedStory(prev => prev ? {
          ...prev,
          isLiked: !prev.isLiked,
          likes: prev.isLiked ? prev.likes - 1 : prev.likes + 1,
        } : null);
      }
    } catch (error) {
      console.error('Failed to toggle like:', error);
    }
  };

  const handleBookmark = async (story: Story) => {
    try {
      await storiesApi.bookmarkStory(story.id);
      setStories(prev => prev.map(s => 
        s.id === story.id ? { ...s, isBookmarked: !s.isBookmarked } : s
      ));
    } catch (error) {
      console.error('Failed to bookmark:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Stories</h1>
        <p className="mt-2 text-gray-500 dark:text-gray-400">
          Discover stories from our community
        </p>
      </div>

      {/* Category Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setSelectedCategory('all')}
          className={`px-4 py-2 rounded-full font-medium transition-colors ${
            selectedCategory === 'all'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
          }`}
        >
          All Stories
        </button>
        {Object.entries(categoryConfig).map(([key, config]) => (
          <button
            key={key}
            onClick={() => setSelectedCategory(key)}
            className={`px-4 py-2 rounded-full font-medium flex items-center gap-1 transition-colors ${
              selectedCategory === key
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
            }`}
          >
            {config.icon} {config.label}
          </button>
        ))}
      </div>

      {/* Stories Feed */}
      {stories.length > 0 ? (
        <div className="space-y-6">
          {stories.map((story) => (
            <StoryCard
              key={story.id}
              story={story}
              onLike={() => handleLike(story)}
              onBookmark={() => handleBookmark(story)}
              onViewFull={() => setSelectedStory(story)}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <div className="text-6xl mb-4">📖</div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">No stories found</h3>
          <p className="text-gray-500 mt-2">Be the first to share a story in this category</p>
          <Button className="mt-4">Share Your Story</Button>
        </div>
      )}

      {/* Story Detail Modal */}
      {selectedStory && (
        <StoryDetailModal
          story={selectedStory}
          onClose={() => setSelectedStory(null)}
          onLike={() => handleLike(selectedStory)}
        />
      )}
    </div>
  );
}

export default StoriesFeed;
