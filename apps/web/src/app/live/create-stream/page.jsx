'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import useAuth from '../../../hooks/useAuth';
import api from '@/lib/apiClient';

/**
 * Create Live Stream Page
 * Set up a new live stream with title, description, and settings
 */
export default function CreateStreamPage() {
  const router = useRouter();
  const { token, isAuthenticated, isLoading: authLoading, user } = useAuth();
  
  // Theme colors
  const accentPink = '#E91E8C';
  const accentPurple = '#8B5CF6';

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'general',
    tags: [],
    scheduledFor: '',
    isScheduled: false,
    allowChat: true,
    allowQuestions: true,
    allowReactions: true,
    maxCoHosts: 3,
    visibility: 'public'
  });
  const [tagInput, setTagInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const categories = [
    { id: 'general', label: '💬 General', description: 'General discussion and updates' },
    { id: 'career', label: '💼 Career Development', description: 'Job search, interviews, and career growth' },
    { id: 'tech', label: '💻 Tech & Development', description: 'Coding, software, and technology' },
    { id: 'business', label: '🏢 Business', description: 'Entrepreneurship and business advice' },
    { id: 'education', label: '📚 Education', description: 'Learning, courses, and training' },
    { id: 'culture', label: '🌏 Culture & Community', description: 'Cultural events and community building' },
    { id: 'mentorship', label: '🤝 Mentorship', description: 'Mentor sessions and guidance' },
    { id: 'jobs', label: '📋 Job Opportunities', description: 'Job postings and hiring events' }
  ];

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const addTag = () => {
    if (tagInput.trim() && formData.tags.length < 5 && !formData.tags.includes(tagInput.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()]
      }));
      setTagInput('');
    }
  };

  const removeTag = (tag) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      router.push('/');
      return;
    }

    if (!formData.title.trim()) {
      setError('Please enter a stream title');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payload = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        category: formData.category,
        tags: formData.tags,
        settings: {
          allowChat: formData.allowChat,
          allowQuestions: formData.allowQuestions,
          allowReactions: formData.allowReactions,
          maxCoHosts: formData.maxCoHosts,
          visibility: formData.visibility
        }
      };

      if (formData.isScheduled && formData.scheduledFor) {
        payload.scheduledFor = new Date(formData.scheduledFor).toISOString();
      }

      const res = await api('/live/streams', {
        method: 'POST',
        body: payload
      });

      if (res.ok && res.data?.stream) {
        // If scheduled, go to live page, otherwise go to studio
        if (formData.isScheduled) {
          router.push('/live?tab=scheduled');
        } else {
          router.push(`/live/studio/${res.data.stream.id}`);
        }
      } else {
        setError(res.error || 'Failed to create stream. Please try again.');
      }
    } catch (err) {
      console.error('Error creating stream:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Redirect to login if not authenticated
  if (!authLoading && !isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 py-12 px-4">
        <div className="max-w-lg mx-auto text-center">
          <div className="text-6xl mb-4">📺</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Sign In Required</h2>
          <p className="text-gray-600 mb-6">You need to be signed in to start a live stream.</p>
          <Link
            href="/"
            className="inline-block px-6 py-3 rounded-lg text-white font-medium"
            style={{ background: `linear-gradient(135deg, ${accentPink}, ${accentPurple})` }}
          >
            Sign In to Continue
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/live" className="text-gray-600 hover:text-gray-900">
            ← Back
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Start a Live Stream</h1>
            <p className="text-gray-600">Share your knowledge with the community</p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Stream Details</h2>
            
            {/* Title */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Stream Title *
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                placeholder="What's your stream about?"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                maxLength={100}
              />
              <p className="text-xs text-gray-500 mt-1">{formData.title.length}/100 characters</p>
            </div>

            {/* Description */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Tell viewers what they'll learn or experience..."
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                maxLength={500}
              />
              <p className="text-xs text-gray-500 mt-1">{formData.description.length}/500 characters</p>
            </div>

            {/* Category */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <div className="grid grid-cols-2 gap-2">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, category: cat.id }))}
                    className={`p-3 rounded-lg text-left transition-all ${
                      formData.category === cat.id
                        ? 'bg-purple-100 border-2 border-purple-500'
                        : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
                    }`}
                  >
                    <span className="font-medium">{cat.label}</span>
                    <p className="text-xs text-gray-500 mt-0.5">{cat.description}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tags (up to 5)
              </label>
              <div className="flex gap-2 mb-2 flex-wrap">
                {formData.tags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm flex items-center gap-1"
                  >
                    #{tag}
                    <button type="button" onClick={() => removeTag(tag)} className="hover:text-purple-900">×</button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                  placeholder="Add a tag"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  maxLength={20}
                />
                <button
                  type="button"
                  onClick={addTag}
                  disabled={formData.tags.length >= 5}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50"
                >
                  Add
                </button>
              </div>
            </div>
          </div>

          {/* Schedule Option */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">When</h2>
            
            <div className="flex items-center gap-4 mb-4">
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, isScheduled: false }))}
                className={`flex-1 p-4 rounded-lg text-center transition-all ${
                  !formData.isScheduled
                    ? 'bg-purple-100 border-2 border-purple-500'
                    : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
                }`}
              >
                <span className="text-2xl block mb-1">🔴</span>
                <span className="font-medium">Go Live Now</span>
              </button>
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, isScheduled: true }))}
                className={`flex-1 p-4 rounded-lg text-center transition-all ${
                  formData.isScheduled
                    ? 'bg-purple-100 border-2 border-purple-500'
                    : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
                }`}
              >
                <span className="text-2xl block mb-1">📅</span>
                <span className="font-medium">Schedule for Later</span>
              </button>
            </div>

            {formData.isScheduled && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Scheduled Date & Time
                </label>
                <input
                  type="datetime-local"
                  name="scheduledFor"
                  value={formData.scheduledFor}
                  onChange={handleInputChange}
                  min={new Date().toISOString().slice(0, 16)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
            )}
          </div>

          {/* Stream Settings */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Stream Settings</h2>
            
            <div className="space-y-4">
              <label className="flex items-center justify-between">
                <div>
                  <span className="font-medium text-gray-900">Live Chat</span>
                  <p className="text-sm text-gray-500">Allow viewers to send messages</p>
                </div>
                <input
                  type="checkbox"
                  name="allowChat"
                  checked={formData.allowChat}
                  onChange={handleInputChange}
                  className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
                />
              </label>

              <label className="flex items-center justify-between">
                <div>
                  <span className="font-medium text-gray-900">Q&A</span>
                  <p className="text-sm text-gray-500">Allow viewers to submit questions</p>
                </div>
                <input
                  type="checkbox"
                  name="allowQuestions"
                  checked={formData.allowQuestions}
                  onChange={handleInputChange}
                  className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
                />
              </label>

              <label className="flex items-center justify-between">
                <div>
                  <span className="font-medium text-gray-900">Reactions</span>
                  <p className="text-sm text-gray-500">Allow emoji reactions during stream</p>
                </div>
                <input
                  type="checkbox"
                  name="allowReactions"
                  checked={formData.allowReactions}
                  onChange={handleInputChange}
                  className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
                />
              </label>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Visibility
                </label>
                <select
                  name="visibility"
                  value={formData.visibility}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="public">🌍 Public - Anyone can watch</option>
                  <option value="connections">👥 Connections Only</option>
                  <option value="unlisted">🔗 Unlisted - Only with link</option>
                </select>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Submit Button */}
          <div className="flex gap-4">
            <Link
              href="/live"
              className="flex-1 py-3 text-center border-2 border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading || !formData.title.trim()}
              className="flex-1 py-3 rounded-lg text-white font-medium disabled:opacity-50 transition-all hover:shadow-lg"
              style={{ background: `linear-gradient(135deg, ${accentPink}, ${accentPurple})` }}
            >
              {loading ? 'Creating...' : formData.isScheduled ? 'Schedule Stream' : 'Go Live'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
