'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '../Button';
import api from '@/lib/apiClient';
import { toCloudinaryAutoUrl } from '@/lib/cloudinary';
import OptimizedImage from '@/components/ui/OptimizedImage';

/**
 * SuccessStories - Community success stories and testimonials
 *
 * Features:
 * - Success story showcase
 * - Indigenous journey highlights
 * - Story submission
 * - Inspiration feed
 */

interface SuccessStory {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  author: {
    id: string;
    name: string;
    avatar?: string;
    role?: string;
    location?: string;
    isIndigenous: boolean;
    countryGroup?: string;
  };
  category:
    | 'career-transition'
    | 'first-job'
    | 'promotion'
    | 'entrepreneur'
    | 'education'
    | 'mentorship'
    | 'community';
  featuredImage?: string;
  publishedAt: string;
  likes: number;
  isLiked: boolean;
  views: number;
  comments: number;
  tags: string[];
  isFeatured: boolean;
  journey?: {
    from: string;
    to: string;
    duration: string;
  };
}

interface ApiStory {
  id?: string | number;
  title?: string;
  story?: string;
  content?: string;
  authorName?: string;
  role?: string;
  imageUrl?: string;
  viewCount?: number;
  isFeatured?: boolean;
  publishedAt?: string;
  category?: SuccessStory['category'];
}

interface ApiStoryComment {
  id?: string | number;
  content?: string;
  author?: { id?: string | number; name?: string; avatar?: string };
  authorId?: string | number;
  authorName?: string;
  createdAt?: string;
  likes?: number;
}

interface StoryComment {
  id: string;
  content: string;
  author: {
    id: string;
    name: string;
    avatar?: string;
    isIndigenous: boolean;
  };
  createdAt: string;
  likes: number;
  isLiked: boolean;
}

// API functions
type StoriesQueryParams = Record<string, string>;
// eslint-disable-next-line no-unused-vars
type StoryCommentSubmitHandler = (comment: string) => void;
// eslint-disable-next-line no-unused-vars
type StorySubmitHandler = (payload: FormData) => void;

const storiesApi = {
  async getStories(
    params: StoriesQueryParams,
  ): Promise<{ stories: SuccessStory[]; total: number }> {
    const query = new URLSearchParams(params);
    const response = await api(`/stories?${query.toString()}`);
    if (!response.ok) return { stories: [], total: 0 };

    const data = response.data as
      | { stories?: ApiStory[]; pagination?: { total?: number } }
      | ApiStory[];
    const rawStories = Array.isArray((data as { stories?: ApiStory[] }).stories)
      ? ((data as { stories?: ApiStory[] }).stories ?? [])
      : Array.isArray(data)
        ? (data as ApiStory[])
        : [];
    const stories = rawStories.map((s) => {
      const text = s.story || s.content || '';
      const excerpt = (text || '').slice(0, 140) + ((text || '').length > 140 ? '…' : '');
      return {
        ...s,
        id: String(s.id),
        title: s.title || 'Untitled',
        excerpt,
        content: text,
        author: {
          id: 'author',
          name: s.authorName || 'Community Member',
          avatar: undefined,
          role: s.role || undefined,
          location: undefined,
          isIndigenous: false,
          countryGroup: undefined,
        },
        category: (s.category || params?.category || 'community') as SuccessStory['category'],
        featuredImage: s.imageUrl || undefined,
        publishedAt: (s.publishedAt ? new Date(s.publishedAt) : new Date()).toISOString(),
        likes: 0,
        isLiked: false,
        views: s.viewCount ?? 0,
        comments: 0,
        tags: [],
        isFeatured: !!s.isFeatured,
        journey: undefined,
      } as SuccessStory;
    });
    return {
      stories,
      total: (data as { pagination?: { total?: number } })?.pagination?.total ?? stories.length,
    };
  },

  async getStory(id: string): Promise<SuccessStory> {
    const response = await api(`/stories/${id}`);
    if (!response.ok || !response.data) throw new Error('Failed to load story');
    const data = response.data;
    const s = (data as { story?: ApiStory })?.story ?? (data as ApiStory);
    const text = s.story || s.content || '';
    const excerpt = (text || '').slice(0, 140) + ((text || '').length > 140 ? '…' : '');
    return {
      id: String(s.id),
      title: s.title || 'Untitled',
      excerpt,
      content: text,
      author: {
        id: 'author',
        name: s.authorName || 'Community Member',
        avatar: undefined,
        role: s.role || undefined,
        location: undefined,
        isIndigenous: false,
        countryGroup: undefined,
      },
      category: (s.category || 'community') as SuccessStory['category'],
      featuredImage: s.imageUrl || undefined,
      publishedAt: (s.publishedAt ? new Date(s.publishedAt) : new Date()).toISOString(),
      likes: 0,
      isLiked: false,
      views: s.viewCount ?? 0,
      comments: 0,
      tags: [],
      isFeatured: !!s.isFeatured,
      journey: undefined,
    };
  },

  async likeStory(storyId: string): Promise<void> {
    await api(`/stories/${storyId}/like`, { method: 'POST' });
  },

  async unlikeStory(storyId: string): Promise<void> {
    await api(`/stories/${storyId}/like`, { method: 'DELETE' });
  },

  async getComments(storyId: string): Promise<StoryComment[]> {
    const response = await api(`/stories/${storyId}/comments`);
    if (!response.ok) return [];

    const comments = response.data?.comments ?? response.data;
    return (Array.isArray(comments) ? comments : []).map((c: ApiStoryComment) => ({
      id: String(c.id ?? crypto.randomUUID()),
      content: c.content || '',
      author: {
        id: String(c.author?.id ?? c.authorId ?? 'author'),
        name: c.author?.name || c.authorName || 'Community Member',
        avatar: c.author?.avatar,
        isIndigenous: false,
      },
      createdAt: new Date(c.createdAt || Date.now()).toISOString(),
      likes: c.likes ?? 0,
      isLiked: false,
    }));
  },

  async postComment(storyId: string, content: string): Promise<StoryComment> {
    const response = await api(`/stories/${storyId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    });
    if (!response.ok || !response.data) throw new Error('Failed to post comment');

    const c =
      (response.data as { comment?: ApiStoryComment })?.comment ??
      (response.data as ApiStoryComment);
    return {
      id: String(c.id ?? crypto.randomUUID()),
      content: c.content || '',
      author: {
        id: String(c.authorId ?? c.author?.id ?? 'author'),
        name: c.authorName || c.author?.name || 'Community Member',
        avatar: c.author?.avatar,
        isIndigenous: false,
      },
      createdAt: new Date(c.createdAt ?? Date.now()).toISOString(),
      likes: c.likes ?? 0,
      isLiked: false,
    };
  },

  async submitStory(data: FormData): Promise<SuccessStory> {
    const raw = Object.fromEntries(data.entries());
    const title = String(raw.title || '').trim();
    const content = String(raw.content || '').trim();
    const story = content;
    const consentGiven = true;
    const created = await api('/stories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        story,
        content,
        consentGiven,
        isAnonymous: false,
      }),
    });
    if (!created.ok || !created.data) throw new Error('Failed to submit story');
    const s = (created.data as { story?: ApiStory })?.story ?? (created.data as ApiStory);
    const text = s.story || s.content || '';
    const excerpt = (text || '').slice(0, 140) + ((text || '').length > 140 ? '…' : '');
    return {
      id: String(s.id),
      title: s.title || title || 'Untitled',
      excerpt,
      content: text,
      author: {
        id: 'author',
        name: s.authorName || 'Community Member',
        avatar: undefined,
        role: s.role || undefined,
        location: undefined,
        isIndigenous: false,
        countryGroup: undefined,
      },
      category: 'community',
      featuredImage: s.imageUrl || undefined,
      publishedAt: (s.publishedAt ? new Date(s.publishedAt) : new Date()).toISOString(),
      likes: 0,
      isLiked: false,
      views: s.viewCount ?? 0,
      comments: 0,
      tags: [],
      isFeatured: !!s.isFeatured,
      journey: undefined,
    };
  },

  async getFeatured(): Promise<SuccessStory[]> {
    const data = await storiesApi.getStories({ featured: 'true', limit: '1', page: '1' });
    return data.stories;
  },
};

const STORY_CATEGORIES: { value: SuccessStory['category']; label: string; icon: string }[] = [
  { value: 'career-transition', label: 'Career Transition', icon: '🔄' },
  { value: 'first-job', label: 'First Job', icon: '🎉' },
  { value: 'promotion', label: 'Promotion', icon: '📈' },
  { value: 'entrepreneur', label: 'Entrepreneur', icon: '🚀' },
  { value: 'education', label: 'Education', icon: '🎓' },
  { value: 'mentorship', label: 'Mentorship', icon: '🤝' },
  { value: 'community', label: 'Community Impact', icon: '🌏' },
];

// Featured Story Hero
function FeaturedStoryHero({ story, onRead }: { story: SuccessStory; onRead: () => void }) {
  return (
    <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-blue-600 to-purple-600 text-white mb-8">
      <div className="absolute inset-0">
        {story.featuredImage && (
          <OptimizedImage
            src={toCloudinaryAutoUrl(story.featuredImage)}
            alt={`${story.title} featured image`}
            fill
            sizes="100vw"
            className="w-full h-full object-cover opacity-30"
          />
        )}
      </div>
      <div className="relative p-8 md:p-12">
        <div className="flex items-center gap-2 mb-4">
          <span className="px-3 py-1 bg-white/20 rounded-full text-sm">✨ Featured Story</span>
          {story.author.isIndigenous && (
            <span className="px-3 py-1 bg-amber-400/30 rounded-full text-sm">
              🌏 Indigenous Journey
            </span>
          )}
        </div>

        <h2 className="text-3xl md:text-4xl font-bold mb-4">{story.title}</h2>
        <p className="text-lg text-white/80 mb-6 max-w-2xl">{story.excerpt}</p>

        {story.journey && (
          <div className="inline-flex items-center gap-4 mb-6 p-4 bg-white/10 rounded-lg">
            <div className="text-center">
              <p className="text-sm text-white/60">From</p>
              <p className="font-medium">{story.journey.from}</p>
            </div>
            <span className="text-2xl">→</span>
            <div className="text-center">
              <p className="text-sm text-white/60">To</p>
              <p className="font-medium">{story.journey.to}</p>
            </div>
            <div className="border-l border-white/20 pl-4 ml-2">
              <p className="text-sm text-white/60">Journey</p>
              <p className="font-medium">{story.journey.duration}</p>
            </div>
          </div>
        )}

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="relative w-12 h-12 rounded-full bg-white/20 flex items-center justify-center overflow-hidden">
              {story.author.avatar ? (
                <OptimizedImage
                  src={toCloudinaryAutoUrl(story.author.avatar)}
                  alt={`${story.author.name} avatar`}
                  fill
                  sizes="48px"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-xl">{story.author.name[0]}</span>
              )}
            </div>
            <div>
              <p className="font-medium">{story.author.name}</p>
              <p className="text-sm text-white/60">
                {story.author.location}
                {story.author.countryGroup && ` • ${story.author.countryGroup}`}
              </p>
            </div>
          </div>
          <Button className="ml-auto bg-white text-blue-600 hover:bg-white/90" onClick={onRead}>
            Read Full Story
          </Button>
        </div>
      </div>
    </div>
  );
}

// Story Card
function StoryCard({
  story,
  onRead,
  onLike,
}: {
  story: SuccessStory;
  onRead: () => void;
  onLike: () => void;
}) {
  const categoryInfo = STORY_CATEGORIES.find((c) => c.value === story.category);
  const publishedDate = new Date(story.publishedAt);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-lg transition-all">
      {/* Image */}
      <div className="relative h-48 bg-gradient-to-br from-blue-500 to-purple-500">
        {story.featuredImage && (
          <OptimizedImage
            src={toCloudinaryAutoUrl(story.featuredImage)}
            alt={`${story.title} featured image`}
            fill
            sizes="(min-width: 1024px) 384px, (min-width: 768px) 50vw, 100vw"
            className="w-full h-full object-cover"
          />
        )}
        <div className="absolute top-3 left-3 flex gap-2">
          <span className="px-2 py-1 bg-white/90 rounded text-xs font-medium">
            {categoryInfo?.icon} {categoryInfo?.label}
          </span>
        </div>
        {story.author.isIndigenous && (
          <span className="absolute top-3 right-3 px-2 py-1 bg-amber-100 text-amber-700 rounded text-xs font-medium">
            🌏 Indigenous
          </span>
        )}
      </div>

      {/* Content */}
      <div className="p-5">
        <h3
          onClick={onRead}
          className="font-semibold text-gray-900 dark:text-white mb-2 cursor-pointer hover:text-blue-600 line-clamp-2"
        >
          {story.title}
        </h3>
        <p className="text-sm text-gray-500 mb-4 line-clamp-3">{story.excerpt}</p>

        {/* Journey Preview */}
        {story.journey && (
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-4 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <span>{story.journey.from}</span>
            <span>→</span>
            <span className="font-medium text-gray-900 dark:text-white">{story.journey.to}</span>
          </div>
        )}

        {/* Author */}
        <div className="flex items-center gap-3 mb-4">
          <div className="relative w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden">
            {story.author.avatar ? (
              <OptimizedImage
                src={toCloudinaryAutoUrl(story.author.avatar)}
                alt={`${story.author.name} avatar`}
                fill
                sizes="32px"
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-sm">{story.author.name[0]}</span>
            )}
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">{story.author.name}</p>
            <p className="text-xs text-gray-500">{publishedDate.toLocaleDateString('en-AU')}</p>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center justify-between text-sm text-gray-400">
          <button
            onClick={onLike}
            className={`flex items-center gap-1 ${story.isLiked ? 'text-red-500' : 'hover:text-red-500'}`}
          >
            {story.isLiked ? '❤️' : '🤍'} {story.likes}
          </button>
          <span>👁️ {story.views}</span>
          <span>💬 {story.comments}</span>
        </div>
      </div>
    </div>
  );
}

// Story Detail Modal
function StoryDetailModal({
  story,
  comments,
  isOpen,
  onClose,
  onLike,
  onPostComment,
}: {
  story: SuccessStory | null;
  comments: StoryComment[];
  isOpen: boolean;
  onClose: () => void;
  onLike: () => void;
  onPostComment: StoryCommentSubmitHandler;
}) {
  const [commentText, setCommentText] = useState('');

  if (!isOpen || !story) return null;

  const categoryInfo = STORY_CATEGORIES.find((c) => c.value === story.category);
  const publishedDate = new Date(story.publishedAt);

  const handleSubmitComment = () => {
    if (!commentText.trim()) return;
    onPostComment(commentText);
    setCommentText('');
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header Image */}
        <div className="relative h-64 bg-gradient-to-br from-blue-500 to-purple-500">
          {story.featuredImage && (
            <OptimizedImage
              src={toCloudinaryAutoUrl(story.featuredImage)}
              alt={`${story.title} featured image`}
              fill
              sizes="(min-width: 1024px) 768px, 100vw"
              className="w-full h-full object-cover"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 bg-white/20 backdrop-blur rounded-full flex items-center justify-center text-white hover:bg-white/30"
          >
            ✕
          </button>
          <div className="absolute bottom-4 left-4 right-4">
            <div className="flex gap-2 mb-2">
              <span className="px-2 py-1 bg-white/90 rounded text-sm font-medium">
                {categoryInfo?.icon} {categoryInfo?.label}
              </span>
              {story.author.isIndigenous && (
                <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded text-sm">
                  🌏 Indigenous Journey
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">{story.title}</h1>

          {/* Author */}
          <div className="flex items-center gap-4 mb-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <div className="relative w-14 h-14 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden">
              {story.author.avatar ? (
                <OptimizedImage
                  src={toCloudinaryAutoUrl(story.author.avatar)}
                  alt={`${story.author.name} avatar`}
                  fill
                  sizes="56px"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-xl">{story.author.name[0]}</span>
              )}
            </div>
            <div>
              <p className="font-medium text-gray-900 dark:text-white">{story.author.name}</p>
              {story.author.role && <p className="text-sm text-gray-500">{story.author.role}</p>}
              <p className="text-sm text-gray-500">
                {story.author.location}
                {story.author.countryGroup && ` • ${story.author.countryGroup} Country`}
              </p>
            </div>
          </div>

          {/* Journey */}
          {story.journey && (
            <div className="flex items-center justify-center gap-6 mb-6 p-6 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl">
              <div className="text-center">
                <p className="text-sm text-gray-500 mb-1">From</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {story.journey.from}
                </p>
              </div>
              <div className="text-3xl">→</div>
              <div className="text-center">
                <p className="text-sm text-gray-500 mb-1">To</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {story.journey.to}
                </p>
              </div>
              <div className="border-l border-gray-300 dark:border-gray-600 pl-6">
                <p className="text-sm text-gray-500 mb-1">Duration</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {story.journey.duration}
                </p>
              </div>
            </div>
          )}

          {/* Story Content */}
          <div className="prose dark:prose-invert max-w-none mb-6">
            <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{story.content}</p>
          </div>

          {/* Tags */}
          {story.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              {story.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full text-sm"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={onLike}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                story.isLiked
                  ? 'bg-red-50 text-red-600 dark:bg-red-900/20'
                  : 'bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-600 dark:bg-gray-700'
              }`}
            >
              {story.isLiked ? '❤️' : '🤍'} {story.likes} Likes
            </button>
            <span className="text-gray-500">👁️ {story.views} views</span>
            <span className="text-sm text-gray-400">
              {publishedDate.toLocaleDateString('en-AU', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </span>
          </div>

          {/* Comments */}
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
              Comments ({comments.length})
            </h3>

            {/* Comment Form */}
            <div className="flex gap-3 mb-6">
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Share your thoughts..."
                rows={2}
                className="flex-1 px-4 py-2 border rounded-lg dark:bg-gray-900 dark:border-gray-600"
              />
              <Button onClick={handleSubmitComment} disabled={!commentText.trim()}>
                Post
              </Button>
            </div>

            {/* Comments List */}
            <div className="space-y-4">
              {comments.map((comment) => (
                <div key={comment.id} className="flex gap-3">
                  <div className="relative w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {comment.author.avatar ? (
                      <OptimizedImage
                        src={toCloudinaryAutoUrl(comment.author.avatar)}
                        alt={`${comment.author.name} avatar`}
                        fill
                        sizes="32px"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-sm">{comment.author.name[0]}</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 dark:text-white">
                        {comment.author.name}
                      </span>
                      {comment.author.isIndigenous && <span>🌏</span>}
                      <span className="text-xs text-gray-400">
                        {new Date(comment.createdAt).toLocaleDateString('en-AU')}
                      </span>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">{comment.content}</p>
                    <button className="text-sm text-gray-400 mt-1 hover:text-red-500">
                      {comment.isLiked ? '❤️' : '🤍'} {comment.likes}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Submit Story Modal
function SubmitStoryModal({
  isOpen,
  onClose,
  onSubmit,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: StorySubmitHandler;
}) {
  const [title, setTitle] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<SuccessStory['category']>('career-transition');
  const [journeyFrom, setJourneyFrom] = useState('');
  const [journeyTo, setJourneyTo] = useState('');
  const [journeyDuration, setJourneyDuration] = useState('');
  const [tags, setTags] = useState('');

  if (!isOpen) return null;

  const handleSubmit = () => {
    const formData = new FormData();
    formData.append('title', title);
    formData.append('excerpt', excerpt);
    formData.append('content', content);
    formData.append('category', category);
    if (journeyFrom && journeyTo) {
      formData.append(
        'journey',
        JSON.stringify({
          from: journeyFrom,
          to: journeyTo,
          duration: journeyDuration,
        }),
      );
    }
    formData.append('tags', tags);
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Share Your Success Story
          </h2>
          <p className="text-sm text-gray-500 mt-1">Inspire others with your journey</p>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="A compelling title for your story"
              className="w-full px-4 py-2 border rounded-lg dark:bg-gray-900 dark:border-gray-600"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Category *
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as SuccessStory['category'])}
              className="w-full px-4 py-2 border rounded-lg dark:bg-gray-900 dark:border-gray-600"
            >
              {STORY_CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.icon} {cat.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Short Excerpt *
            </label>
            <textarea
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              placeholder="A brief summary of your story (shown on cards)"
              rows={2}
              className="w-full px-4 py-2 border rounded-lg dark:bg-gray-900 dark:border-gray-600"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Your Story *
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Tell us about your journey, challenges, and achievements..."
              rows={8}
              className="w-full px-4 py-2 border rounded-lg dark:bg-gray-900 dark:border-gray-600"
            />
          </div>

          {/* Journey */}
          <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Your Journey (Optional)
            </p>
            <div className="grid grid-cols-3 gap-3">
              <input
                type="text"
                value={journeyFrom}
                onChange={(e) => setJourneyFrom(e.target.value)}
                placeholder="From (e.g., Student)"
                className="px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-600"
              />
              <input
                type="text"
                value={journeyTo}
                onChange={(e) => setJourneyTo(e.target.value)}
                placeholder="To (e.g., Software Engineer)"
                className="px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-600"
              />
              <input
                type="text"
                value={journeyDuration}
                onChange={(e) => setJourneyDuration(e.target.value)}
                placeholder="Duration (e.g., 2 years)"
                className="px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Tags (comma-separated)
            </label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="technology, career-change, mentorship"
              className="w-full px-4 py-2 border rounded-lg dark:bg-gray-900 dark:border-gray-600"
            />
          </div>
        </div>
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!title.trim() || !excerpt.trim() || !content.trim()}
          >
            Submit Story
          </Button>
        </div>
      </div>
    </div>
  );
}

// Main Component
export function SuccessStories() {
  useAuth();
  const [stories, setStories] = useState<SuccessStory[]>([]);
  const [featuredStory, setFeaturedStory] = useState<SuccessStory | null>(null);
  const [selectedStory, setSelectedStory] = useState<SuccessStory | null>(null);
  const [comments, setComments] = useState<StoryComment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [filters, setFilters] = useState({
    category: '',
    indigenousOnly: false,
    sort: 'latest',
  });

  const loadStories = useCallback(async () => {
    setIsLoading(true);
    try {
      const [storiesData, featured] = await Promise.all([
        storiesApi.getStories({
          category: filters.category,
          indigenousOnly: String(filters.indigenousOnly),
          sort: filters.sort,
        }),
        storiesApi.getFeatured(),
      ]);
      setStories(storiesData.stories);
      if (featured.length > 0) {
        setFeaturedStory(featured[0]);
      }
    } catch (error) {
      console.error('Failed to load stories:', error);
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadStories();
  }, [loadStories]);

  const loadComments = async (storyId: string) => {
    try {
      const data = await storiesApi.getComments(storyId);
      setComments(data);
    } catch (error) {
      console.error('Failed to load comments:', error);
    }
  };

  const handleViewStory = async (story: SuccessStory) => {
    setSelectedStory(story);
    loadComments(story.id);
  };

  const handleLike = async (storyId: string) => {
    const story =
      stories.find((s) => s.id === storyId) ||
      (storyId === featuredStory?.id ? featuredStory : null);
    if (!story) return;

    try {
      if (story.isLiked) {
        await storiesApi.unlikeStory(storyId);
      } else {
        await storiesApi.likeStory(storyId);
      }
      loadStories();
      if (selectedStory?.id === storyId) {
        setSelectedStory({
          ...selectedStory,
          isLiked: !selectedStory.isLiked,
          likes: selectedStory.isLiked ? selectedStory.likes - 1 : selectedStory.likes + 1,
        });
      }
    } catch (error) {
      console.error('Failed to toggle like:', error);
    }
  };

  const handlePostComment = async (content: string) => {
    if (!selectedStory) return;
    try {
      await storiesApi.postComment(selectedStory.id, content);
      loadComments(selectedStory.id);
    } catch (error) {
      console.error('Failed to post comment:', error);
    }
  };

  const handleSubmitStory = async (data: FormData) => {
    try {
      await storiesApi.submitStory(data);
      setShowSubmitModal(false);
      loadStories();
    } catch (error) {
      console.error('Failed to submit story:', error);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Success Stories</h1>
          <p className="text-gray-500 mt-1">Be inspired by journeys from our community</p>
        </div>
        <Button onClick={() => setShowSubmitModal(true)}>✏️ Share Your Story</Button>
      </div>

      {/* Featured Story */}
      {featuredStory && (
        <FeaturedStoryHero story={featuredStory} onRead={() => handleViewStory(featuredStory)} />
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
        <select
          value={filters.category}
          onChange={(e) => setFilters({ ...filters, category: e.target.value })}
          className="px-4 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-600"
        >
          <option value="">All Categories</option>
          {STORY_CATEGORIES.map((cat) => (
            <option key={cat.value} value={cat.value}>
              {cat.icon} {cat.label}
            </option>
          ))}
        </select>

        <label className="flex items-center gap-2 px-4 py-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg cursor-pointer">
          <input
            type="checkbox"
            checked={filters.indigenousOnly}
            onChange={(e) => setFilters({ ...filters, indigenousOnly: e.target.checked })}
            className="rounded"
          />
          <span className="text-sm">🌏 Indigenous Journeys</span>
        </label>

        <select
          value={filters.sort}
          onChange={(e) => setFilters({ ...filters, sort: e.target.value })}
          className="px-4 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-600"
        >
          <option value="latest">Latest</option>
          <option value="popular">Most Popular</option>
          <option value="views">Most Viewed</option>
        </select>
      </div>

      {/* Stories Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
        </div>
      ) : stories.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
          <div className="text-6xl mb-4">📖</div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            No stories yet
          </h3>
          <p className="text-gray-500 mb-4">Be the first to share your success story!</p>
          <Button onClick={() => setShowSubmitModal(true)}>Share Your Story</Button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {stories.map((story) => (
            <StoryCard
              key={story.id}
              story={story}
              onRead={() => handleViewStory(story)}
              onLike={() => handleLike(story.id)}
            />
          ))}
        </div>
      )}

      {/* Story Detail Modal */}
      <StoryDetailModal
        story={selectedStory}
        comments={comments}
        isOpen={!!selectedStory}
        onClose={() => setSelectedStory(null)}
        onLike={() => selectedStory && handleLike(selectedStory.id)}
        onPostComment={handlePostComment}
      />

      {/* Submit Story Modal */}
      <SubmitStoryModal
        isOpen={showSubmitModal}
        onClose={() => setShowSubmitModal(false)}
        onSubmit={handleSubmitStory}
      />
    </div>
  );
}

export default SuccessStories;
