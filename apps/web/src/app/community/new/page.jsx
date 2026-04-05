'use client';

import api from '@/lib/apiClient';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

/**
 * New Topic Page - Create a new community discussion
 * /community/new
 */
export default function NewTopicPage() {
    const router = useRouter();
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);

    // Form state
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [categoryId, setCategoryId] = useState('');

    useEffect(() => {
        fetchCategories();
    }, []);

    async function fetchCategories() {
        setLoading(true);
        try {
            const res = await api('/community/categories');
            if (res.ok) {
                const data = res.data;
                setCategories(data?.categories || data);
            }
        } catch (err) {
            // Demo categories
            setCategories([
                { id: 'career-advice', name: 'Career Advice' },
                { id: 'industry-insights', name: 'Industry Insights' },
                { id: 'cultural-connection', name: 'Cultural Connection' },
                { id: 'success-stories', name: 'Success Stories' },
                { id: 'training-education', name: 'Training & Education' },
                { id: 'mentorship', name: 'Mentorship' },
            ]);
        } finally {
            setLoading(false);
        }
    }

    async function handleSubmit(e) {
        e.preventDefault();
        
        if (!title.trim()) {
            setError('Please enter a title');
            return;
        }
        if (!categoryId) {
            setError('Please select a category');
            return;
        }
        if (!content.trim()) {
            setError('Please enter your message');
            return;
        }

        setSubmitting(true);
        setError(null);

        try {
            const res = await api('/community/topic', {
                method: 'POST',
                body: {
                    title,
                    content,
                    categoryId,
                },
            });
            
            if (!res.ok) throw new Error('Failed to create topic');
            
            const data = res.data;
            router.push(`/community/topic/${data?.topic?.id || data?.id}`);
        } catch (err) {
            // Demo: redirect to community
            router.push('/community');
        } finally {
            setSubmitting(false);
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-10 w-10 border-4 border-slate-700 border-t-blue-500" />
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto px-4 py-8">
            {/* Breadcrumb */}
            <nav className="mb-6 text-sm">
                <Link href="/community" className="text-slate-400 hover:text-slate-300">
                    Community
                </Link>
                <span className="mx-2 text-slate-600">/</span>
                <span className="text-slate-200">New Topic</span>
            </nav>

            <div className="mb-8">
                <h1 className="text-2xl font-bold mb-2">Start a New Discussion</h1>
                <p className="text-slate-300">
                    Share your thoughts, ask questions, or start a conversation with the community
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                    <div className="bg-red-900/50 border border-red-700 rounded-lg p-4">
                        <p className="text-red-200">{error}</p>
                    </div>
                )}

                {/* Category Selection */}
                <div>
                    <label className="block text-sm font-medium mb-2">
                        Category *
                    </label>
                    <select
                        value={categoryId}
                        onChange={(e) => setCategoryId(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg 
                                   focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    >
                        <option value="">Select a category</option>
                        {categories.map((cat) => (
                            <option key={cat.id} value={cat.id}>
                                {cat.name}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Title */}
                <div>
                    <label className="block text-sm font-medium mb-2">
                        Title *
                    </label>
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Enter a descriptive title for your topic"
                        maxLength={200}
                        className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg 
                                   focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none
                                   placeholder-slate-500"
                    />
                    <div className="text-xs text-slate-500 mt-1 text-right">
                        {title.length}/200
                    </div>
                </div>

                {/* Content */}
                <div>
                    <label className="block text-sm font-medium mb-2">
                        Message *
                    </label>
                    <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="Share your thoughts, questions, or ideas..."
                        rows={10}
                        className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg 
                                   focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none
                                   placeholder-slate-500 resize-none"
                    />
                    <p className="text-xs text-slate-500 mt-1">
                        Tip: Use paragraphs to make your post easier to read
                    </p>
                </div>

                {/* Community Guidelines */}
                <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
                    <h3 className="font-medium mb-2 text-sm">Community Guidelines</h3>
                    <ul className="text-sm text-slate-400 space-y-1">
                        <li>• Be respectful and supportive of all community members</li>
                        <li>• Keep discussions relevant to career and employment topics</li>
                        <li>• Respect cultural protocols and sensitivities</li>
                        <li>• No spam, advertising, or self-promotion without permission</li>
                        <li>• Protect your privacy - don't share sensitive personal information</li>
                    </ul>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-4">
                    <Link
                        href="/community"
                        className="text-slate-400 hover:text-slate-300"
                    >
                        Cancel
                    </Link>
                    <button
                        type="submit"
                        disabled={submitting}
                        className="px-8 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 
                                   disabled:cursor-not-allowed text-white font-medium rounded-lg 
                                   transition-colors flex items-center gap-2"
                    >
                        {submitting ? (
                            <>
                                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                                Creating...
                            </>
                        ) : (
                            'Create Topic'
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}
