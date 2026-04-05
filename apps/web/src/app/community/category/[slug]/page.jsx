'use client';

import api from '@/lib/apiClient';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

/**
 * Community Category Page - Browse topics in a category
 * /community/category/[slug]
 */
export default function CommunityCategoryPage() {
    const params = useParams();
    const slug = params.slug;

    const [category, setCategory] = useState(null);
    const [topics, setTopics] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!slug) return;
        fetchCategory();
    }, [slug]);

    async function fetchCategory() {
        setLoading(true);
        setError(null);
        try {
            const res = await api(`/community/category/${slug}`);
            if (!res.ok) throw new Error('Failed to load category');

            const data = res.data;
            setCategory(data?.category || null);
            setTopics(data?.topics || []);
        } catch (e) {
            setCategory({ slug, name: 'Category' });
            setTopics([]);
        } finally {
            setLoading(false);
        }
    }

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
                <div className="animate-spin rounded-full h-10 w-10 border-4 border-slate-700 border-t-blue-500" />
                <span className="text-slate-400">Loading category...</span>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto px-4 py-8">
            {/* Breadcrumb */}
            <nav className="mb-6 text-sm" aria-label="Breadcrumb">
                <ol className="flex items-center gap-2 text-slate-400">
                    <li><Link href="/" className="hover:text-blue-400 transition-colors">Home</Link></li>
                    <li><span className="text-slate-600">/</span></li>
                    <li><Link href="/community" className="hover:text-blue-400 transition-colors">Community</Link></li>
                    <li><span className="text-slate-600">/</span></li>
                    <li><Link href="/community/forums" className="hover:text-blue-400 transition-colors">Forums</Link></li>
                    <li><span className="text-slate-600">/</span></li>
                    <li className="text-white">{category?.name || 'Category'}</li>
                </ol>
            </nav>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold mb-2">{category?.name || 'Category'}</h1>
                    {category?.description && (
                        <p className="text-slate-300">{category.description}</p>
                    )}
                </div>
                <Link
                    href="/community/new"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900"
                >
                    New Topic
                </Link>
            </div>

            {error && (
                <div className="bg-red-900/50 border border-red-700 rounded-lg p-4 mb-6">
                    <p className="text-red-200">{error}</p>
                </div>
            )}

            {topics.length === 0 ? (
                <div className="bg-slate-900/40 border border-slate-800 rounded-lg p-8 text-center text-slate-400">
                    No topics yet. Start the first discussion.
                </div>
            ) : (
                <div className="space-y-3">
                    {topics.map((topic) => (
                        <Link
                            key={topic.id}
                            href={`/community/topic/${topic.id}`}
                            className="block bg-slate-900/40 border border-slate-800 rounded-lg p-4 hover:border-slate-700 transition-colors"
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        {topic.isPinned && (
                                            <span className="px-2 py-0.5 bg-amber-900 text-amber-300 text-xs rounded">📌 Pinned</span>
                                        )}
                                        {topic.isLocked && (
                                            <span className="px-2 py-0.5 bg-slate-700 text-slate-300 text-xs rounded">🔒 Locked</span>
                                        )}
                                    </div>
                                    <h3 className="font-medium mb-1">{topic.title}</h3>
                                    <p className="text-sm text-slate-400">
                                        by {topic.author || 'Community Member'} • {new Date(topic.createdAt).toLocaleDateString()}
                                    </p>
                                </div>
                                <div className="text-sm text-slate-400 shrink-0">
                                    {(topic.replies ?? topic.replyCount ?? 0)} {(topic.replies ?? topic.replyCount ?? 0) === 1 ? 'reply' : 'replies'}
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
