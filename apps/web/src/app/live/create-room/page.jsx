'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import useAuth from '../../../hooks/useAuth';
import api from '@/lib/apiClient';

/**
 * Create Audio Room Page
 * Set up a new audio room with topics and settings
 */
export default function CreateRoomPage() {
  const router = useRouter();
  const { token, isAuthenticated, isLoading: authLoading, user } = useAuth();
  
  // Theme colors
  const accentPink = '#E91E8C';
  const accentPurple = '#8B5CF6';

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    topics: [],
    scheduledFor: '',
    isScheduled: false,
    maxSpeakers: 10,
    allowHandRaise: true,
    recordRoom: false,
    visibility: 'public'
  });
  const [topicInput, setTopicInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const suggestedTopics = [
    'Career', 'Tech', 'Business', 'Mentorship', 'Culture', 
    'Community', 'Education', 'Jobs', 'Networking', 'Health',
    'Finance', 'Startup', 'Leadership', 'Interview Tips'
  ];

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const addTopic = (topic) => {
    const cleanTopic = topic.trim();
    if (cleanTopic && formData.topics.length < 5 && !formData.topics.includes(cleanTopic)) {
      setFormData(prev => ({
        ...prev,
        topics: [...prev.topics, cleanTopic]
      }));
      setTopicInput('');
    }
  };

  const removeTopic = (topic) => {
    setFormData(prev => ({
      ...prev,
      topics: prev.topics.filter(t => t !== topic)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      router.push('/');
      return;
    }

    if (!formData.title.trim()) {
      setError('Please enter a room title');
      return;
    }

    if (formData.topics.length === 0) {
      setError('Please add at least one topic');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payload = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        topics: formData.topics,
        settings: {
          maxSpeakers: parseInt(formData.maxSpeakers),
          allowHandRaise: formData.allowHandRaise,
          recordRoom: formData.recordRoom,
          visibility: formData.visibility
        }
      };

      if (formData.isScheduled && formData.scheduledFor) {
        payload.scheduledFor = new Date(formData.scheduledFor).toISOString();
      }

      const res = await api('/live/audio-rooms', {
        method: 'POST',
        body: payload
      });

      if (res.ok && res.data?.room) {
        // If scheduled, go to live page, otherwise go directly to room
        if (formData.isScheduled) {
          router.push('/live?tab=scheduled');
        } else {
          router.push(`/live/room/${res.data.room.id}`);
        }
      } else {
        setError(res.error || 'Failed to create room. Please try again.');
      }
    } catch (err) {
      console.error('Error creating room:', err);
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
          <div className="text-6xl mb-4">🎙️</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Sign In Required</h2>
          <p className="text-gray-600 mb-6">You need to be signed in to start an audio room.</p>
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
            <h1 className="text-2xl font-bold text-gray-900">Start an Audio Room</h1>
            <p className="text-gray-600">Host a conversation with your community</p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Room Details</h2>
            
            {/* Title */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Room Title *
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                placeholder="What's the conversation about?"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                maxLength={80}
              />
              <p className="text-xs text-gray-500 mt-1">{formData.title.length}/80 characters</p>
            </div>

            {/* Description */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description (optional)
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Give listeners an idea of what to expect..."
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                maxLength={300}
              />
              <p className="text-xs text-gray-500 mt-1">{formData.description.length}/300 characters</p>
            </div>

            {/* Topics */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Topics * (select 1-5)
              </label>
              
              {/* Selected Topics */}
              {formData.topics.length > 0 && (
                <div className="flex gap-2 mb-3 flex-wrap">
                  {formData.topics.map((topic, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1.5 bg-purple-100 text-purple-700 rounded-full text-sm flex items-center gap-1"
                    >
                      {topic}
                      <button type="button" onClick={() => removeTopic(topic)} className="hover:text-purple-900 ml-1">×</button>
                    </span>
                  ))}
                </div>
              )}

              {/* Suggested Topics */}
              <div className="flex flex-wrap gap-2 mb-3">
                {suggestedTopics
                  .filter(t => !formData.topics.includes(t))
                  .slice(0, 10)
                  .map((topic, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => addTopic(topic)}
                      disabled={formData.topics.length >= 5}
                      className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-full text-sm hover:bg-gray-200 disabled:opacity-50 transition-colors"
                    >
                      + {topic}
                    </button>
                  ))}
              </div>

              {/* Custom Topic Input */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={topicInput}
                  onChange={(e) => setTopicInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTopic(topicInput))}
                  placeholder="Add custom topic"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  maxLength={30}
                />
                <button
                  type="button"
                  onClick={() => addTopic(topicInput)}
                  disabled={formData.topics.length >= 5 || !topicInput.trim()}
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
                <span className="text-2xl block mb-1">🎙️</span>
                <span className="font-medium">Start Now</span>
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

          {/* Room Settings */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Room Settings</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Maximum Speakers
                </label>
                <select
                  name="maxSpeakers"
                  value={formData.maxSpeakers}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value={5}>5 speakers</option>
                  <option value={10}>10 speakers</option>
                  <option value={15}>15 speakers</option>
                  <option value={20}>20 speakers</option>
                </select>
              </div>

              <label className="flex items-center justify-between">
                <div>
                  <span className="font-medium text-gray-900">Hand Raise</span>
                  <p className="text-sm text-gray-500">Allow listeners to request to speak</p>
                </div>
                <input
                  type="checkbox"
                  name="allowHandRaise"
                  checked={formData.allowHandRaise}
                  onChange={handleInputChange}
                  className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
                />
              </label>

              <label className="flex items-center justify-between">
                <div>
                  <span className="font-medium text-gray-900">Record Room</span>
                  <p className="text-sm text-gray-500">Save a recording for later (speakers will be notified)</p>
                </div>
                <input
                  type="checkbox"
                  name="recordRoom"
                  checked={formData.recordRoom}
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
                  <option value="public">🌍 Public - Anyone can join</option>
                  <option value="connections">👥 Connections Only</option>
                  <option value="invite">🔒 Invite Only</option>
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
              disabled={loading || !formData.title.trim() || formData.topics.length === 0}
              className="flex-1 py-3 rounded-lg text-white font-medium disabled:opacity-50 transition-all hover:shadow-lg"
              style={{ background: `linear-gradient(135deg, ${accentPink}, ${accentPurple})` }}
            >
              {loading ? 'Creating...' : formData.isScheduled ? 'Schedule Room' : 'Start Room'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
