'use client';

import api from '@/lib/apiClient';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function SubmitStoryPage() {
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [story, setStory] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [consentGiven, setConsentGiven] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    if (!title.trim() || !story.trim()) {
      setError('Please fill in title and story.');
      return;
    }
    if (!consentGiven) {
      setError('Please confirm consent to publish.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api('/stories', {
        method: 'POST',
        body: {
          title,
          story,
          content: story,
          authorName: authorName || null,
          isAnonymous: !authorName,
          consentGiven,
        },
      });

      if (!res.ok) {
        throw new Error(res.data?.error || res.error || 'Failed to submit story');
      }

      router.push('/community/stories');
    } catch (e) {
      setError(e.message || 'Failed to submit story');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <nav className="mb-6 text-sm" aria-label="Breadcrumb">
        <ol className="flex items-center gap-2 text-slate-400">
          <li><Link href="/" className="hover:text-blue-400 transition-colors">Home</Link></li>
          <li><span className="text-slate-600">/</span></li>
          <li><Link href="/community" className="hover:text-blue-400 transition-colors">Community</Link></li>
          <li><span className="text-slate-600">/</span></li>
          <li><Link href="/community/stories" className="hover:text-blue-400 transition-colors">Success Stories</Link></li>
          <li><span className="text-slate-600">/</span></li>
          <li className="text-white">Submit</li>
        </ol>
      </nav>

      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Share Your Success Story</h1>
        <p className="text-slate-300">Your story can inspire others in the community.</p>
      </div>

      {error && (
        <div className="bg-red-900/50 border border-red-700 rounded-lg p-4 mb-6">
          <p className="text-red-200">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium mb-2">Your Name (optional)</label>
          <input
            value={authorName}
            onChange={(e) => setAuthorName(e.target.value)}
            className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg outline-none"
            placeholder="Leave blank to post as Community Member"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Title *</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg outline-none"
            maxLength={200}
            placeholder="What’s your story about?"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Story *</label>
          <textarea
            value={story}
            onChange={(e) => setStory(e.target.value)}
            rows={10}
            className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg outline-none resize-none"
            placeholder="Share what you achieved and how you got there…"
          />
        </div>

        <label className="flex items-start gap-3 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={consentGiven}
            onChange={(e) => setConsentGiven(e.target.checked)}
            className="mt-1"
          />
          <span>I consent to publishing this story on the platform.</span>
        </label>

        <div className="flex items-center justify-between pt-2">
          <Link href="/community/stories" className="text-slate-400 hover:text-slate-300">
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white rounded-lg"
          >
            {submitting ? 'Submitting…' : 'Submit Story'}
          </button>
        </div>
      </form>
    </div>
  );
}
