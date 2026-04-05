'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

/**
 * Create Group Page
 * Create new community groups
 */
export default function CreateGroupPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    privacy: 'public',
    rules: '',
    tags: ''
  });

  const categories = [
    { id: 'industry', label: 'Industry/Profession', icon: '💼', description: 'Connect with people in your field' },
    { id: 'role', label: 'Job Role', icon: '👔', description: 'Share experiences in similar roles' },
    { id: 'life-stage', label: 'Life Stage', icon: '🌱', description: 'Career changers, graduates, parents returning to work' },
    { id: 'location', label: 'Location-Based', icon: '📍', description: 'Connect with people in your region' },
    { id: 'interest', label: 'Interest/Hobby', icon: '⭐', description: 'Share passions outside of work' }
  ];

  const privacyOptions = [
    { id: 'public', label: 'Public', icon: '🌍', description: 'Anyone can see and join' },
    { id: 'private', label: 'Private', icon: '🔒', description: 'Members must request to join' },
    { id: 'hidden', label: 'Hidden', icon: '👁️', description: 'Only members can see the group' }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.category) return;
    
    setIsSubmitting(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    router.push('/groups');
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen pt-24 pb-20">
      {/* Celestial Background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a1a] via-[#151530] to-[#1a1a2e]" />
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,215,0,0.15) 1px, transparent 0)',
          backgroundSize: '50px 50px'
        }} />
      </div>

      <div className="container mx-auto px-4 max-w-2xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/groups" className="p-2 rounded-full hover:bg-white/10 transition-colors text-white">
            ← 
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">Create a Group</h1>
            <p className="text-white/60">Build a community around shared interests</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Group Name */}
          <div className="royal-card p-6">
            <label className="block text-white font-medium mb-2">Group Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="e.g., Tech Professionals Network"
              maxLength={100}
              className="w-full px-4 py-3 bg-black/30 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-gold/50"
            />
            <p className="text-white/40 text-sm mt-2">{100 - formData.name.length} characters remaining</p>
          </div>

          {/* Category */}
          <div className="royal-card p-6">
            <label className="block text-white font-medium mb-4">Category *</label>
            <div className="grid grid-cols-1 gap-3">
              {categories.map(cat => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => handleChange('category', cat.id)}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    formData.category === cat.id
                      ? 'border-gold bg-gold/10'
                      : 'border-white/10 hover:border-white/30'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{cat.icon}</span>
                    <div>
                      <p className="font-medium text-white">{cat.label}</p>
                      <p className="text-sm text-white/60">{cat.description}</p>
                    </div>
                    {formData.category === cat.id && (
                      <span className="ml-auto text-gold">✓</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div className="royal-card p-6">
            <label className="block text-white font-medium mb-2">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="What is this group about? Who should join?"
              rows={4}
              maxLength={500}
              className="w-full px-4 py-3 bg-black/30 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-gold/50 resize-none"
            />
            <p className="text-white/40 text-sm mt-2">{500 - formData.description.length} characters remaining</p>
          </div>

          {/* Privacy */}
          <div className="royal-card p-6">
            <label className="block text-white font-medium mb-4">Privacy</label>
            <div className="space-y-3">
              {privacyOptions.map(option => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => handleChange('privacy', option.id)}
                  className={`w-full p-4 rounded-xl border text-left transition-all flex items-center gap-3 ${
                    formData.privacy === option.id
                      ? 'border-gold bg-gold/10'
                      : 'border-white/10 hover:border-white/30'
                  }`}
                >
                  <span className="text-2xl">{option.icon}</span>
                  <div>
                    <p className="font-medium text-white">{option.label}</p>
                    <p className="text-sm text-white/60">{option.description}</p>
                  </div>
                  {formData.privacy === option.id && (
                    <span className="ml-auto text-gold">✓</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Group Rules */}
          <div className="royal-card p-6">
            <label className="block text-white font-medium mb-2">Group Rules (Optional)</label>
            <textarea
              value={formData.rules}
              onChange={(e) => handleChange('rules', e.target.value)}
              placeholder="Enter rules for your community (one per line)"
              rows={4}
              className="w-full px-4 py-3 bg-black/30 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-gold/50 resize-none"
            />
            <p className="text-white/40 text-sm mt-2">Clear rules help maintain a safe and respectful community</p>
          </div>

          {/* Tags */}
          <div className="royal-card p-6">
            <label className="block text-white font-medium mb-2">Tags (Optional)</label>
            <input
              type="text"
              value={formData.tags}
              onChange={(e) => handleChange('tags', e.target.value)}
              placeholder="tech, careers, mentoring (comma separated)"
              className="w-full px-4 py-3 bg-black/30 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-gold/50"
            />
            <p className="text-white/40 text-sm mt-2">Help people discover your group</p>
          </div>

          {/* Guidelines */}
          <div className="p-4 rounded-xl bg-purple-royal/10 border border-purple-royal/20">
            <h3 className="font-medium text-purple-royal mb-2 flex items-center gap-2">
              <span>📋</span> Community Guidelines
            </h3>
            <ul className="text-sm text-white/70 space-y-1">
              <li>• All groups must follow our community guidelines</li>
              <li>• Safety features are available for all groups</li>
              <li>• Moderators are responsible for content moderation</li>
              <li>• Groups promoting discrimination will be removed</li>
            </ul>
          </div>

          {/* Submit Button */}
          <div className="flex gap-4">
            <Link
              href="/groups"
              className="flex-1 px-6 py-3 rounded-full text-center font-medium bg-white/10 text-white hover:bg-white/20 transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isSubmitting || !formData.name || !formData.category}
              className={`flex-1 px-6 py-3 rounded-full font-medium transition-all ${
                isSubmitting || !formData.name || !formData.category
                  ? 'bg-white/10 text-white/40 cursor-not-allowed'
                  : 'btn-cta-royal'
              }`}
            >
              {isSubmitting ? '✨ Creating...' : 'Create Group ✨'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
