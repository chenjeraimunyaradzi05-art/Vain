'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '../Button';
import api from '@/lib/apiClient';
import { toCloudinaryAutoUrl } from '@/lib/cloudinary';
import OptimizedImage from '@/components/ui/OptimizedImage';

/**
 * CommunityForums - Discussion forums and community conversations
 * 
 * Features:
 * - Forum categories
 * - Thread creation and replies
 * - Upvoting and reactions
 * - Moderation tools
 */

interface ForumCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  threadCount: number;
  postCount: number;
  lastPost?: {
    title: string;
    author: string;
    date: string;
  };
  isIndigenous: boolean;
}

interface Thread {
  id: string;
  categoryId: string;
  title: string;
  content: string;
  author: {
    id: string;
    name: string;
    avatar?: string;
    role?: string;
    isIndigenous: boolean;
  };
  createdAt: string;
  updatedAt: string;
  replyCount: number;
  viewCount: number;
  upvotes: number;
  isUpvoted: boolean;
  isPinned: boolean;
  isLocked: boolean;
  tags: string[];
  lastReply?: {
    author: string;
    date: string;
  };
}

interface Reply {
  id: string;
  threadId: string;
  content: string;
  author: {
    id: string;
    name: string;
    avatar?: string;
    role?: string;
    isIndigenous: boolean;
  };
  createdAt: string;
  upvotes: number;
  isUpvoted: boolean;
  isAcceptedAnswer: boolean;
  parentId?: string;
  replies?: Reply[];
}

// API functions
const forumsApi = {
  async getCategories(): Promise<ForumCategory[]> {
    const response = await api('/forums/categories');
    if (!response.ok) return [];
    
    const data = response.data;
    const categories = data?.categories ?? data;
    return (Array.isArray(categories) ? categories : []).map((c: any) => ({
      id: String(c.id),
      name: c.name,
      description: c.description || '',
      icon: c.icon || '💬',
      threadCount: c.threadCount ?? 0,
      postCount: c.postCount ?? 0,
      lastPost: c.lastPost,
      isIndigenous: !!c.isIndigenous,
    }));
  },

  async getThreads(categoryId: string, params: any): Promise<{ threads: Thread[]; total: number }> {
    const query = new URLSearchParams({ categoryId, ...params });
    const response = await api(`/forums/threads?${query.toString()}`);
    if (!response.ok) return { threads: [], total: 0 };

    const data = response.data;
    const threads = (data?.threads || []).map((t: any) => ({
      id: String(t.id),
      categoryId: String(t.categoryId),
      title: t.title,
      content: t.content,
      author: {
        id: String(t.authorId ?? 'user'),
        name: 'Community Member',
        avatar: undefined,
        role: undefined,
        isIndigenous: false,
      },
      createdAt: new Date(t.createdAt).toISOString(),
      updatedAt: new Date(t.updatedAt).toISOString(),
      replyCount: t._count?.replies ?? 0,
      viewCount: t.viewCount ?? 0,
      upvotes: 0,
      isUpvoted: false,
      isPinned: !!t.isPinned,
      isLocked: !!t.isClosed,
      tags: [],
      lastReply: undefined,
    }));
    return { threads, total: data?.pagination?.total ?? threads.length };
  },

  async getThread(threadId: string): Promise<Thread> {
    const response = await api(`/forums/threads/${threadId}`);
    if (!response.ok || !response.data) throw new Error('Failed to load thread');

    const t = response.data?.thread ?? response.data;
    return {
      id: String(t.id),
      categoryId: String(t.categoryId),
      title: t.title,
      content: t.content,
      author: {
        id: String(t.authorId ?? 'user'),
        name: 'Community Member',
        avatar: undefined,
        role: undefined,
        isIndigenous: false,
      },
      createdAt: new Date(t.createdAt).toISOString(),
      updatedAt: new Date(t.updatedAt).toISOString(),
      replyCount: Array.isArray(t.replies) ? t.replies.length : 0,
      viewCount: t.viewCount ?? 0,
      upvotes: 0,
      isUpvoted: false,
      isPinned: !!t.isPinned,
      isLocked: !!t.isClosed,
      tags: [],
      lastReply: undefined,
    };
  },

  async createThread(data: { categoryId: string; title: string; content: string; tags: string[] }): Promise<Thread> {
    const response = await api('/forums/threads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok || !response.data) throw new Error('Failed to create thread');
    
    const t = response.data?.thread ?? response.data;
    return {
      id: String(t.id),
      categoryId: String(t.categoryId),
      title: t.title,
      content: t.content,
      author: {
        id: String(t.authorId ?? 'user'),
        name: 'Community Member',
        avatar: undefined,
        role: undefined,
        isIndigenous: false,
      },
      createdAt: new Date(t.createdAt ?? Date.now()).toISOString(),
      updatedAt: new Date(t.updatedAt ?? Date.now()).toISOString(),
      replyCount: 0,
      viewCount: 0,
      upvotes: 0,
      isUpvoted: false,
      isPinned: false,
      isLocked: false,
      tags: data.tags || [],
      lastReply: undefined,
    };
  },

  async getReplies(threadId: string): Promise<Reply[]> {
    const response = await api(`/forums/threads/${threadId}/replies`);
    if (!response.ok) return [];
    
    const replies = response.data?.replies ?? response.data;
    return (Array.isArray(replies) ? replies : []).map((r: any) => ({
      id: String(r.id),
      threadId: String(r.threadId),
      content: r.content,
      author: {
        id: String(r.authorId ?? 'user'),
        name: 'Community Member',
        avatar: undefined,
        role: undefined,
        isIndigenous: false,
      },
      createdAt: new Date(r.createdAt).toISOString(),
      upvotes: 0,
      isUpvoted: false,
      isAcceptedAnswer: false,
      parentId: undefined,
      replies: undefined,
    }));
  },

  async createReply(threadId: string, data: { content: string; parentId?: string }): Promise<Reply> {
    const response = await api(`/forums/threads/${threadId}/replies`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: data.content }),
    });
    if (!response.ok || !response.data) throw new Error('Failed to create reply');
    
    const r = response.data?.reply ?? response.data;
    return {
      id: String(r.id),
      threadId: String(r.threadId),
      content: r.content,
      author: {
        id: String(r.authorId ?? 'user'),
        name: 'Community Member',
        avatar: undefined,
        role: undefined,
        isIndigenous: false,
      },
      createdAt: new Date(r.createdAt ?? Date.now()).toISOString(),
      upvotes: 0,
      isUpvoted: false,
      isAcceptedAnswer: false,
      parentId: undefined,
      replies: undefined,
    };
  },

  async upvoteThread(threadId: string): Promise<void> {
    await api(`/forums/threads/${threadId}/upvote`, { method: 'POST' });
  },

  async upvoteReply(replyId: string): Promise<void> {
    await api(`/forums/replies/${replyId}/upvote`, { method: 'POST' });
  },
};

// Category Card
function CategoryCard({
  category,
  onClick,
}: {
  category: ForumCategory;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 hover:shadow-md transition-all cursor-pointer"
    >
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-2xl">
          {category.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-gray-900 dark:text-white">{category.name}</h3>
            {category.isIndigenous && (
              <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-xs">
                🌏 Indigenous
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-1 line-clamp-2">{category.description}</p>
          <div className="flex items-center gap-4 mt-3 text-sm text-gray-400">
            <span>💬 {category.threadCount} threads</span>
            <span>📝 {category.postCount} posts</span>
          </div>
        </div>
      </div>
      {category.lastPost && (
        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
          <p className="text-sm text-gray-500">
            Latest: <span className="text-gray-700 dark:text-gray-300">{category.lastPost.title}</span>
            <span className="text-gray-400"> by {category.lastPost.author}</span>
          </p>
        </div>
      )}
    </div>
  );
}

// Thread Row
function ThreadRow({
  thread,
  onClick,
  onUpvote,
}: {
  thread: Thread;
  onClick: () => void;
  onUpvote: () => void;
}) {
  const createdAt = new Date(thread.createdAt);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 hover:shadow-md transition-all">
      <div className="flex items-start gap-4">
        {/* Upvote */}
        <div className="flex flex-col items-center">
          <button
            onClick={(e) => { e.stopPropagation(); onUpvote(); }}
            className={`p-2 rounded-lg transition-colors ${
              thread.isUpvoted
                ? 'bg-blue-100 text-blue-600'
                : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400'
            }`}
          >
            ▲
          </button>
          <span className={`text-sm font-medium ${thread.isUpvoted ? 'text-blue-600' : 'text-gray-500'}`}>
            {thread.upvotes}
          </span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            {thread.isPinned && (
              <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded text-xs">📌 Pinned</span>
            )}
            {thread.isLocked && (
              <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">🔒 Locked</span>
            )}
          </div>
          
          <h3
            onClick={onClick}
            className="font-semibold text-gray-900 dark:text-white hover:text-blue-600 cursor-pointer"
          >
            {thread.title}
          </h3>
          
          <p className="text-sm text-gray-500 mt-1 line-clamp-2">{thread.content}</p>
          
          {/* Tags */}
          {thread.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {thread.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded text-xs"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Meta */}
          <div className="flex items-center gap-4 mt-3 text-sm text-gray-400">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden">
                {thread.author.avatar ? (
                  <OptimizedImage
                    src={toCloudinaryAutoUrl(thread.author.avatar)}
                    alt={`${thread.author.name} avatar`}
                    width={24}
                    height={24}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-xs">{thread.author.name[0]}</span>
                )}
              </div>
              <span>{thread.author.name}</span>
              {thread.author.isIndigenous && <span>🌏</span>}
            </div>
            <span>•</span>
            <span>{createdAt.toLocaleDateString('en-AU')}</span>
            <span>•</span>
            <span>💬 {thread.replyCount}</span>
            <span>👁️ {thread.viewCount}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Reply Component
function ReplyComponent({
  reply,
  onUpvote,
  onReply,
}: {
  reply: Reply;
  onUpvote: () => void;
  onReply: () => void;
}) {
  const createdAt = new Date(reply.createdAt);

  return (
    <div className={`p-4 ${reply.isAcceptedAnswer ? 'bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500' : ''}`}>
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden flex-shrink-0">
          {reply.author.avatar ? (
            <OptimizedImage
              src={toCloudinaryAutoUrl(reply.author.avatar)}
              alt={`${reply.author.name} avatar`}
              width={32}
              height={32}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-sm">{reply.author.name[0]}</span>
          )}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-gray-900 dark:text-white">{reply.author.name}</span>
            {reply.author.isIndigenous && <span>🌏</span>}
            {reply.author.role && (
              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">{reply.author.role}</span>
            )}
            {reply.isAcceptedAnswer && (
              <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs">✓ Accepted Answer</span>
            )}
            <span className="text-sm text-gray-400">
              {createdAt.toLocaleDateString('en-AU')}
            </span>
          </div>
          <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{reply.content}</p>
          <div className="flex items-center gap-4 mt-2">
            <button
              onClick={onUpvote}
              className={`flex items-center gap-1 text-sm ${
                reply.isUpvoted ? 'text-blue-600' : 'text-gray-400 hover:text-blue-600'
              }`}
            >
              ▲ {reply.upvotes}
            </button>
            <button
              onClick={onReply}
              className="text-sm text-gray-400 hover:text-blue-600"
            >
              Reply
            </button>
          </div>
        </div>
      </div>
      
      {/* Nested replies */}
      {reply.replies && reply.replies.length > 0 && (
        <div className="ml-8 mt-4 space-y-4 border-l-2 border-gray-200 dark:border-gray-700 pl-4">
          {reply.replies.map((nestedReply) => (
            <ReplyComponent
              key={nestedReply.id}
              reply={nestedReply}
              onUpvote={() => {}}
              onReply={() => {}}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Thread Detail View
function ThreadDetailView({
  thread,
  replies,
  onBack,
  onUpvoteThread,
  onUpvoteReply,
  onPostReply,
}: {
  thread: Thread;
  replies: Reply[];
  onBack: () => void;
  onUpvoteThread: () => void;
  onUpvoteReply: (replyId: string) => void;
  onPostReply: (content: string, parentId?: string) => void;
}) {
  const [replyContent, setReplyContent] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);

  const handleSubmitReply = () => {
    if (!replyContent.trim()) return;
    onPostReply(replyContent, replyingTo || undefined);
    setReplyContent('');
    setReplyingTo(null);
  };

  return (
    <div>
      {/* Back button */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-6"
      >
        ← Back to threads
      </button>

      {/* Thread */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <div className="flex items-start gap-4">
          <div className="flex flex-col items-center">
            <button
              onClick={onUpvoteThread}
              className={`p-2 rounded-lg transition-colors ${
                thread.isUpvoted
                  ? 'bg-blue-100 text-blue-600'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400'
              }`}
            >
              ▲
            </button>
            <span className={`text-lg font-medium ${thread.isUpvoted ? 'text-blue-600' : 'text-gray-500'}`}>
              {thread.upvotes}
            </span>
          </div>

          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{thread.title}</h1>
            
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden">
                {thread.author.avatar ? (
                  <OptimizedImage
                    src={toCloudinaryAutoUrl(thread.author.avatar)}
                    alt={`${thread.author.name} avatar`}
                    width={32}
                    height={32}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span>{thread.author.name[0]}</span>
                )}
              </div>
              <span className="font-medium text-gray-900 dark:text-white">{thread.author.name}</span>
              {thread.author.isIndigenous && <span>🌏</span>}
              <span className="text-gray-400">•</span>
              <span className="text-gray-500">{new Date(thread.createdAt).toLocaleDateString('en-AU')}</span>
            </div>

            <div className="prose dark:prose-invert max-w-none">
              <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{thread.content}</p>
            </div>

            {thread.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4">
                {thread.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded text-sm"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Reply Form */}
      {!thread.isLocked && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
            {replyingTo ? 'Reply to comment' : 'Post a Reply'}
          </h3>
          <textarea
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            placeholder="Share your thoughts..."
            rows={4}
            className="w-full px-4 py-3 border rounded-lg dark:bg-gray-900 dark:border-gray-600 mb-4"
          />
          <div className="flex justify-end gap-2">
            {replyingTo && (
              <Button variant="outline" onClick={() => setReplyingTo(null)}>
                Cancel
              </Button>
            )}
            <Button onClick={handleSubmitReply} disabled={!replyContent.trim()}>
              Post Reply
            </Button>
          </div>
        </div>
      )}

      {/* Replies */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-white">
            {replies.length} Replies
          </h3>
        </div>
        <div className="divide-y divide-gray-100 dark:divide-gray-700">
          {replies.map((reply) => (
            <ReplyComponent
              key={reply.id}
              reply={reply}
              onUpvote={() => onUpvoteReply(reply.id)}
              onReply={() => setReplyingTo(reply.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// Create Thread Modal
function CreateThreadModal({
  isOpen,
  categoryId,
  onClose,
  onCreate,
}: {
  isOpen: boolean;
  categoryId: string;
  onClose: () => void;
  onCreate: (data: { title: string; content: string; tags: string[] }) => void;
}) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tagsInput, setTagsInput] = useState('');

  if (!isOpen) return null;

  const handleSubmit = () => {
    const tags = tagsInput.split(',').map(t => t.trim()).filter(Boolean);
    onCreate({ title, content, tags });
    setTitle('');
    setContent('');
    setTagsInput('');
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Create New Thread</h2>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What's your question or topic?"
              className="w-full px-4 py-2 border rounded-lg dark:bg-gray-900 dark:border-gray-600"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Content
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Provide more details..."
              rows={6}
              className="w-full px-4 py-3 border rounded-lg dark:bg-gray-900 dark:border-gray-600"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Tags (comma-separated)
            </label>
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="career, advice, technology"
              className="w-full px-4 py-2 border rounded-lg dark:bg-gray-900 dark:border-gray-600"
            />
          </div>
        </div>
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!title.trim() || !content.trim()}>
            Create Thread
          </Button>
        </div>
      </div>
    </div>
  );
}

// Main Component
export function CommunityForums() {
  const { user } = useAuth();
  const [categories, setCategories] = useState<ForumCategory[]>([]);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<ForumCategory | null>(null);
  const [selectedThread, setSelectedThread] = useState<Thread | null>(null);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [sortBy, setSortBy] = useState<'latest' | 'popular' | 'unanswered'>('latest');

  const loadCategories = useCallback(async () => {
    try {
      const data = await forumsApi.getCategories();
      setCategories(data);
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  }, []);

  const loadThreads = useCallback(async (categoryId: string) => {
    setIsLoading(true);
    try {
      const { threads: data } = await forumsApi.getThreads(categoryId, { sort: sortBy });
      setThreads(data);
    } catch (error) {
      console.error('Failed to load threads:', error);
    } finally {
      setIsLoading(false);
    }
  }, [sortBy]);

  const loadThread = useCallback(async (threadId: string) => {
    try {
      const [thread, threadReplies] = await Promise.all([
        forumsApi.getThread(threadId),
        forumsApi.getReplies(threadId),
      ]);
      setSelectedThread(thread);
      setReplies(threadReplies);
    } catch (error) {
      console.error('Failed to load thread:', error);
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    if (selectedCategory) {
      loadThreads(selectedCategory.id);
    }
  }, [selectedCategory, loadThreads]);

  const handleCreateThread = async (data: { title: string; content: string; tags: string[] }) => {
    if (!selectedCategory) return;
    try {
      await forumsApi.createThread({
        categoryId: selectedCategory.id,
        ...data,
      });
      setShowCreateModal(false);
      loadThreads(selectedCategory.id);
    } catch (error) {
      console.error('Failed to create thread:', error);
    }
  };

  const handleUpvoteThread = async (threadId: string) => {
    try {
      await forumsApi.upvoteThread(threadId);
      if (selectedThread?.id === threadId) {
        setSelectedThread({
          ...selectedThread,
          isUpvoted: !selectedThread.isUpvoted,
          upvotes: selectedThread.isUpvoted ? selectedThread.upvotes - 1 : selectedThread.upvotes + 1,
        });
      }
      if (selectedCategory) loadThreads(selectedCategory.id);
    } catch (error) {
      console.error('Failed to upvote:', error);
    }
  };

  const handleUpvoteReply = async (replyId: string) => {
    try {
      await forumsApi.upvoteReply(replyId);
      setReplies(replies.map(r =>
        r.id === replyId
          ? { ...r, isUpvoted: !r.isUpvoted, upvotes: r.isUpvoted ? r.upvotes - 1 : r.upvotes + 1 }
          : r
      ));
    } catch (error) {
      console.error('Failed to upvote:', error);
    }
  };

  const handlePostReply = async (content: string, parentId?: string) => {
    if (!selectedThread) return;
    try {
      await forumsApi.createReply(selectedThread.id, { content, parentId });
      loadThread(selectedThread.id);
    } catch (error) {
      console.error('Failed to post reply:', error);
    }
  };

  // Thread detail view
  if (selectedThread) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <ThreadDetailView
          thread={selectedThread}
          replies={replies}
          onBack={() => setSelectedThread(null)}
          onUpvoteThread={() => handleUpvoteThread(selectedThread.id)}
          onUpvoteReply={handleUpvoteReply}
          onPostReply={handlePostReply}
        />
      </div>
    );
  }

  // Category threads view
  if (selectedCategory) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <button
          onClick={() => setSelectedCategory(null)}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-6"
        >
          ← Back to categories
        </button>

        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{selectedCategory.icon}</span>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{selectedCategory.name}</h1>
              <p className="text-gray-500">{selectedCategory.description}</p>
            </div>
          </div>
          <Button onClick={() => setShowCreateModal(true)}>
            ✏️ New Thread
          </Button>
        </div>

        {/* Sort options */}
        <div className="flex gap-2 mb-6">
          {(['latest', 'popular', 'unanswered'] as const).map((sort) => (
            <button
              key={sort}
              onClick={() => setSortBy(sort)}
              className={`px-4 py-2 rounded-lg capitalize ${
                sortBy === sort
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30'
                  : 'text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              {sort}
            </button>
          ))}
        </div>

        {/* Threads */}
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
          </div>
        ) : threads.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
            <div className="text-6xl mb-4">💬</div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              No threads yet
            </h3>
            <p className="text-gray-500 mb-4">Be the first to start a discussion!</p>
            <Button onClick={() => setShowCreateModal(true)}>Create Thread</Button>
          </div>
        ) : (
          <div className="space-y-4">
            {threads.map((thread) => (
              <ThreadRow
                key={thread.id}
                thread={thread}
                onClick={() => loadThread(thread.id)}
                onUpvote={() => handleUpvoteThread(thread.id)}
              />
            ))}
          </div>
        )}

        <CreateThreadModal
          isOpen={showCreateModal}
          categoryId={selectedCategory.id}
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateThread}
        />
      </div>
    );
  }

  // Categories view
  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Community Forums</h1>
        <p className="text-gray-500 mt-1">Join discussions, ask questions, and share knowledge</p>
      </div>

      {isLoading && categories.length === 0 ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {categories.map((category) => (
            <CategoryCard
              key={category.id}
              category={category}
              onClick={() => setSelectedCategory(category)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default CommunityForums;
