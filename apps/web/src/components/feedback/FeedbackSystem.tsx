'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '../Button';

/**
 * FeedbackSystem - Collect and manage user feedback
 * 
 * Features:
 * - Submit feedback with categories
 * - Feature requests with voting
 * - Bug reports
 * - General suggestions
 * - View feedback status and responses
 */

interface Feedback {
  id: string;
  type: FeedbackType;
  category: string;
  title: string;
  description: string;
  status: 'new' | 'reviewing' | 'planned' | 'in-progress' | 'completed' | 'declined';
  priority: 'low' | 'medium' | 'high';
  votes: number;
  hasVoted: boolean;
  createdAt: string;
  updatedAt: string;
  response?: {
    message: string;
    respondedAt: string;
    respondedBy: string;
  };
  attachments?: string[];
  isPublic: boolean;
}

type FeedbackType = 'bug' | 'feature' | 'improvement' | 'question' | 'other';

interface FeedbackStats {
  total: number;
  new: number;
  inProgress: number;
  completed: number;
  topVoted: number;
}

// API functions
const feedbackApi = {
  async getFeedback(filter?: string): Promise<{ feedback: Feedback[]; stats: FeedbackStats }> {
    const url = filter ? `/api/feedback?filter=${filter}` : '/api/feedback';
    const res = await fetch(url, { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch feedback');
    return res.json();
  },

  async getPublicFeedback(): Promise<{ feedback: Feedback[] }> {
    const res = await fetch('/api/feedback/public', { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch public feedback');
    return res.json();
  },

  async submitFeedback(data: Partial<Feedback>): Promise<Feedback> {
    const res = await fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to submit feedback');
    return res.json();
  },

  async updateFeedback(id: string, data: Partial<Feedback>): Promise<Feedback> {
    const res = await fetch(`/api/feedback/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update feedback');
    return res.json();
  },

  async deleteFeedback(id: string): Promise<void> {
    const res = await fetch(`/api/feedback/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Failed to delete feedback');
  },

  async voteFeedback(id: string): Promise<{ votes: number; hasVoted: boolean }> {
    const res = await fetch(`/api/feedback/${id}/vote`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Failed to vote');
    return res.json();
  },
};

// Type configurations
const feedbackTypes: { value: FeedbackType; label: string; icon: string; description: string; color: string }[] = [
  {
    value: 'bug',
    label: 'Bug Report',
    icon: '🐛',
    description: 'Something isn\'t working correctly',
    color: 'bg-red-100 text-red-700 border-red-200',
  },
  {
    value: 'feature',
    label: 'Feature Request',
    icon: '💡',
    description: 'Request a new feature',
    color: 'bg-purple-100 text-purple-700 border-purple-200',
  },
  {
    value: 'improvement',
    label: 'Improvement',
    icon: '✨',
    description: 'Suggest an enhancement to existing feature',
    color: 'bg-blue-100 text-blue-700 border-blue-200',
  },
  {
    value: 'question',
    label: 'Question',
    icon: '❓',
    description: 'Ask for help or clarification',
    color: 'bg-green-100 text-green-700 border-green-200',
  },
  {
    value: 'other',
    label: 'Other',
    icon: '📝',
    description: 'General feedback',
    color: 'bg-gray-100 text-gray-700 border-gray-200',
  },
];

const categoryOptions = [
  'Dashboard',
  'Job Search',
  'Profile',
  'Applications',
  'Messaging',
  'Learning',
  'Events',
  'Community',
  'Mobile App',
  'Accessibility',
  'Performance',
  'Other',
];

const statusConfig = {
  new: { label: 'New', color: 'bg-gray-100 text-gray-700', icon: '🆕' },
  reviewing: { label: 'Reviewing', color: 'bg-yellow-100 text-yellow-700', icon: '👀' },
  planned: { label: 'Planned', color: 'bg-blue-100 text-blue-700', icon: '📋' },
  'in-progress': { label: 'In Progress', color: 'bg-purple-100 text-purple-700', icon: '⚙️' },
  completed: { label: 'Completed', color: 'bg-green-100 text-green-700', icon: '✅' },
  declined: { label: 'Declined', color: 'bg-red-100 text-red-700', icon: '❌' },
};

// Feedback Card Component
function FeedbackCard({
  feedback,
  onVote,
  onClick,
  showActions = false,
  onEdit,
  onDelete,
}: {
  feedback: Feedback;
  onVote: () => void;
  onClick: () => void;
  showActions?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  const typeInfo = feedbackTypes.find(t => t.value === feedback.type);
  const status = statusConfig[feedback.status];

  return (
    <div
      className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 hover:border-blue-300 transition-colors cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-start gap-4">
        {/* Vote Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onVote();
          }}
          className={`flex flex-col items-center px-3 py-2 rounded-lg transition-colors ${
            feedback.hasVoted
              ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-500 hover:bg-blue-50 dark:hover:bg-blue-900/20'
          }`}
        >
          <svg className="w-5 h-5" fill={feedback.hasVoted ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          </svg>
          <span className="font-semibold text-sm">{feedback.votes}</span>
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`px-2 py-0.5 text-xs font-medium rounded-full border ${typeInfo?.color}`}>
                {typeInfo?.icon} {typeInfo?.label}
              </span>
              <span className="text-xs text-gray-500">{feedback.category}</span>
            </div>
            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${status.color}`}>
              {status.icon} {status.label}
            </span>
          </div>

          <h3 className="font-medium text-gray-900 dark:text-white mb-1">{feedback.title}</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{feedback.description}</p>

          <div className="flex items-center justify-between mt-3">
            <span className="text-xs text-gray-500">
              {new Date(feedback.createdAt).toLocaleDateString('en-AU')}
            </span>
            {feedback.response && (
              <span className="text-xs text-green-600 flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                Responded
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        {showActions && (
          <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={onEdit}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button
              onClick={onDelete}
              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Feedback Detail Modal
function FeedbackDetailModal({
  feedback,
  onClose,
  onVote,
}: {
  feedback: Feedback;
  onClose: () => void;
  onVote: () => void;
}) {
  const typeInfo = feedbackTypes.find(t => t.value === feedback.type);
  const status = statusConfig[feedback.status];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{typeInfo?.icon}</span>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`px-2 py-0.5 text-xs font-medium rounded-full border ${typeInfo?.color}`}>
                    {typeInfo?.label}
                  </span>
                  <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${status.color}`}>
                    {status.icon} {status.label}
                  </span>
                </div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">{feedback.title}</h2>
              </div>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Vote and Info */}
          <div className="flex items-center gap-4">
            <button
              onClick={onVote}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                feedback.hasVoted
                  ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30'
                  : 'bg-gray-100 text-gray-600 dark:bg-gray-700 hover:bg-blue-50'
              }`}
            >
              <svg className="w-5 h-5" fill={feedback.hasVoted ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
              {feedback.votes} votes
            </button>
            <span className="text-sm text-gray-500">
              Category: <strong>{feedback.category}</strong>
            </span>
            <span className="text-sm text-gray-500">
              {new Date(feedback.createdAt).toLocaleDateString('en-AU', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </span>
          </div>

          {/* Description */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description</h3>
            <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{feedback.description}</p>
          </div>

          {/* Attachments */}
          {feedback.attachments && feedback.attachments.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Attachments</h3>
              <div className="flex gap-2">
                {feedback.attachments.map((att, idx) => (
                  <a
                    key={idx}
                    href={att}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm text-blue-600 hover:underline"
                  >
                    Attachment {idx + 1}
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Response */}
          {feedback.response && (
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-green-600">💬</span>
                <h3 className="font-medium text-green-800 dark:text-green-300">Team Response</h3>
              </div>
              <p className="text-green-700 dark:text-green-400">{feedback.response.message}</p>
              <p className="text-xs text-green-600 mt-2">
                Responded by {feedback.response.respondedBy} on{' '}
                {new Date(feedback.response.respondedAt).toLocaleDateString('en-AU')}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Submit Feedback Modal
function SubmitFeedbackModal({
  feedback,
  onClose,
  onSubmit,
}: {
  feedback: Feedback | null;
  onClose: () => void;
  onSubmit: (data: Partial<Feedback>) => void;
}) {
  const [type, setType] = useState<FeedbackType>(feedback?.type || 'feature');
  const [category, setCategory] = useState(feedback?.category || '');
  const [title, setTitle] = useState(feedback?.title || '');
  const [description, setDescription] = useState(feedback?.description || '');
  const [isPublic, setIsPublic] = useState(feedback?.isPublic ?? true);
  const [priority, setPriority] = useState<Feedback['priority']>(feedback?.priority || 'medium');

  const handleSubmit = () => {
    if (!title || !description || !category) return;
    onSubmit({ type, category, title, description, isPublic, priority });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {feedback ? 'Edit Feedback' : 'Submit Feedback'}
            </h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              What type of feedback? *
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {feedbackTypes.map((ft) => (
                <button
                  key={ft.value}
                  onClick={() => setType(ft.value)}
                  className={`p-3 rounded-lg border-2 transition-colors text-left ${
                    type === ft.value
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                  }`}
                >
                  <span className="text-2xl">{ft.icon}</span>
                  <p className="font-medium text-gray-900 dark:text-white mt-1">{ft.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{ft.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Category *
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">Select category...</option>
              {categoryOptions.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Brief summary of your feedback"
              className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description *
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              placeholder={type === 'bug' 
                ? 'Please describe what happened, what you expected, and steps to reproduce...'
                : 'Please provide details about your feedback...'
              }
              className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          {/* Priority (for bugs) */}
          {type === 'bug' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Priority
              </label>
              <div className="flex gap-2">
                {['low', 'medium', 'high'].map((p) => (
                  <button
                    key={p}
                    onClick={() => setPriority(p as Feedback['priority'])}
                    className={`px-4 py-2 rounded-lg capitalize border transition-colors ${
                      priority === p
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Public Toggle */}
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <div>
              <p className="font-medium text-gray-900 dark:text-white">Make public</p>
              <p className="text-sm text-gray-500">Other users can see and vote on this feedback</p>
            </div>
            <button
              onClick={() => setIsPublic(!isPublic)}
              className={`w-12 h-6 rounded-full relative transition-colors ${
                isPublic ? 'bg-blue-500' : 'bg-gray-300'
              }`}
            >
              <span
                className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                  isPublic ? 'right-1' : 'left-1'
                }`}
              />
            </button>
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex gap-3 sticky bottom-0 bg-white dark:bg-gray-800">
          <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
          <Button onClick={handleSubmit} className="flex-1" disabled={!title || !description || !category}>
            {feedback ? 'Save Changes' : 'Submit Feedback'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// Main Component
export function FeedbackSystem() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'all' | 'my' | 'roadmap'>('all');
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [myFeedback, setMyFeedback] = useState<Feedback[]>([]);
  const [stats, setStats] = useState<FeedbackStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingFeedback, setEditingFeedback] = useState<Feedback | null>(null);
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);
  const [typeFilter, setTypeFilter] = useState<FeedbackType | 'all'>('all');
  const [sortBy, setSortBy] = useState<'votes' | 'recent'>('votes');

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [publicRes, myRes] = await Promise.all([
        feedbackApi.getPublicFeedback(),
        feedbackApi.getFeedback(),
      ]);
      setFeedback(publicRes.feedback);
      setMyFeedback(myRes.feedback);
      setStats(myRes.stats);
    } catch (error) {
      console.error('Failed to load feedback:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleVote = async (id: string) => {
    try {
      const result = await feedbackApi.voteFeedback(id);
      const updateFeedback = (f: Feedback) => 
        f.id === id ? { ...f, votes: result.votes, hasVoted: result.hasVoted } : f;
      setFeedback(feedback.map(updateFeedback));
      setMyFeedback(myFeedback.map(updateFeedback));
      if (selectedFeedback?.id === id) {
        setSelectedFeedback({ ...selectedFeedback, votes: result.votes, hasVoted: result.hasVoted });
      }
    } catch (error) {
      console.error('Failed to vote:', error);
    }
  };

  const handleSubmit = async (data: Partial<Feedback>) => {
    try {
      if (editingFeedback) {
        const updated = await feedbackApi.updateFeedback(editingFeedback.id, data);
        setMyFeedback(myFeedback.map(f => f.id === updated.id ? updated : f));
        if (data.isPublic) {
          setFeedback(feedback.map(f => f.id === updated.id ? updated : f));
        }
        setEditingFeedback(null);
      } else {
        const created = await feedbackApi.submitFeedback(data);
        setMyFeedback([created, ...myFeedback]);
        if (created.isPublic) {
          setFeedback([created, ...feedback]);
        }
        setShowModal(false);
      }
    } catch (error) {
      console.error('Failed to submit:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this feedback?')) return;
    try {
      await feedbackApi.deleteFeedback(id);
      setFeedback(feedback.filter(f => f.id !== id));
      setMyFeedback(myFeedback.filter(f => f.id !== id));
    } catch (error) {
      console.error('Failed to delete:', error);
    }
  };

  // Filter and sort feedback
  const displayedFeedback = (activeTab === 'my' ? myFeedback : feedback)
    .filter(f => typeFilter === 'all' || f.type === typeFilter)
    .sort((a, b) => {
      if (sortBy === 'votes') return b.votes - a.votes;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  // Roadmap items
  const roadmapItems = feedback.filter(f => ['planned', 'in-progress'].includes(f.status));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Feedback</h1>
          <p className="text-gray-500 mt-1">Help us improve Ngurra Pathways</p>
        </div>
        <Button onClick={() => setShowModal(true)}>
          <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Submit Feedback
        </Button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 text-center">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</div>
            <div className="text-sm text-gray-500">Total Feedback</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.new}</div>
            <div className="text-sm text-gray-500">New</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">{stats.inProgress}</div>
            <div className="text-sm text-gray-500">In Progress</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
            <div className="text-sm text-gray-500">Completed</div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b border-gray-200 dark:border-gray-700">
        {([
          { key: 'all', label: 'All Feedback' },
          { key: 'my', label: 'My Feedback' },
          { key: 'roadmap', label: 'Roadmap' },
        ] as const).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-3 font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      {activeTab !== 'roadmap' && (
        <div className="flex items-center justify-between gap-4 mb-6">
          <div className="flex gap-2">
            <button
              onClick={() => setTypeFilter('all')}
              className={`px-3 py-1.5 text-sm rounded-lg ${
                typeFilter === 'all'
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30'
                  : 'bg-gray-100 text-gray-600 dark:bg-gray-700'
              }`}
            >
              All
            </button>
            {feedbackTypes.slice(0, 4).map((type) => (
              <button
                key={type.value}
                onClick={() => setTypeFilter(type.value)}
                className={`px-3 py-1.5 text-sm rounded-lg flex items-center gap-1 ${
                  typeFilter === type.value
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30'
                    : 'bg-gray-100 text-gray-600 dark:bg-gray-700'
                }`}
              >
                {type.icon} {type.label}
              </button>
            ))}
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'votes' | 'recent')}
            className="px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
          >
            <option value="votes">Most Voted</option>
            <option value="recent">Most Recent</option>
          </select>
        </div>
      )}

      {/* Content */}
      {activeTab === 'roadmap' ? (
        <div className="space-y-4">
          {roadmapItems.length > 0 ? (
            <>
              {/* In Progress */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  ⚙️ In Progress
                </h3>
                <div className="space-y-3">
                  {roadmapItems
                    .filter(f => f.status === 'in-progress')
                    .map((item) => (
                      <FeedbackCard
                        key={item.id}
                        feedback={item}
                        onVote={() => handleVote(item.id)}
                        onClick={() => setSelectedFeedback(item)}
                      />
                    ))}
                </div>
              </div>

              {/* Planned */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  📋 Planned
                </h3>
                <div className="space-y-3">
                  {roadmapItems
                    .filter(f => f.status === 'planned')
                    .map((item) => (
                      <FeedbackCard
                        key={item.id}
                        feedback={item}
                        onVote={() => handleVote(item.id)}
                        onClick={() => setSelectedFeedback(item)}
                      />
                    ))}
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-16 bg-gray-50 dark:bg-gray-900 rounded-xl">
              <div className="text-6xl mb-4">📋</div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">No items on roadmap yet</h3>
              <p className="text-gray-500 mt-2">Planned features will appear here</p>
            </div>
          )}
        </div>
      ) : displayedFeedback.length > 0 ? (
        <div className="space-y-4">
          {displayedFeedback.map((item) => (
            <FeedbackCard
              key={item.id}
              feedback={item}
              onVote={() => handleVote(item.id)}
              onClick={() => setSelectedFeedback(item)}
              showActions={activeTab === 'my'}
              onEdit={() => setEditingFeedback(item)}
              onDelete={() => handleDelete(item.id)}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-gray-50 dark:bg-gray-900 rounded-xl">
          <div className="text-6xl mb-4">💡</div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">No feedback yet</h3>
          <p className="text-gray-500 mt-2 mb-6">Be the first to share your thoughts!</p>
          <Button onClick={() => setShowModal(true)}>Submit Feedback</Button>
        </div>
      )}

      {/* Modals */}
      {(showModal || editingFeedback) && (
        <SubmitFeedbackModal
          feedback={editingFeedback}
          onClose={() => {
            setShowModal(false);
            setEditingFeedback(null);
          }}
          onSubmit={handleSubmit}
        />
      )}

      {selectedFeedback && (
        <FeedbackDetailModal
          feedback={selectedFeedback}
          onClose={() => setSelectedFeedback(null)}
          onVote={() => handleVote(selectedFeedback.id)}
        />
      )}
    </div>
  );
}

export default FeedbackSystem;
