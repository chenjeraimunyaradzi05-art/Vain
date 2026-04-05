'use client';

import api from '@/lib/apiClient';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

/**
 * Community Topic Detail Page - View topic and replies
 * /community/topic/[id]
 */
export default function TopicDetailPage() {
    const params = useParams();
    const topicId = params.id;

    const [topic, setTopic] = useState(null);
    const [replies, setReplies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [replyText, setReplyText] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchTopic();
    }, [topicId]);

    async function fetchTopic() {
        setLoading(true);
        try {
            const res = await api(`/community/topic/${topicId}`);
            if (!res.ok) throw new Error('Failed to load topic');
            
            const data = res.data;
            setTopic(data?.topic || data);
            setReplies(data?.replies || []);
        } catch (err) {
            // Demo data
            setTopic({
                id: topicId,
                title: 'Tips for navigating corporate workplaces as a First Nations person',
                content: `I've been working in corporate environments for about 5 years now and wanted to share some insights that have helped me along the way.

First, find your allies early. There are usually people who genuinely want to support diversity and inclusion - connect with them.

Second, don't feel like you need to be the "spokesperson" for all Indigenous issues. It's okay to set boundaries about what you're comfortable discussing.

Third, if your workplace has an Indigenous employee network or RAP committee, consider getting involved. It can be a great way to influence positive change.

What tips would you add? I'd love to hear from others who've navigated similar experiences.`,
                author: 'Sarah M.',
                authorTitle: 'Senior Project Manager',
                createdAt: '2025-01-22T10:30:00Z',
                category: 'career-advice',
                categoryName: 'Career Advice',
                viewCount: 456,
                isPinned: true,
                isLocked: false,
            });
            setReplies([
                {
                    id: '1',
                    content: 'Great tips, Sarah! I completely agree about finding allies. In my experience, having a mentor who understood cultural obligations was invaluable.',
                    author: 'Michael T.',
                    authorTitle: 'Software Engineer',
                    createdAt: '2025-01-22T11:15:00Z',
                    likes: 12,
                    isLiked: false,
                },
                {
                    id: '2',
                    content: 'The boundary-setting point is so important. I used to feel pressure to educate everyone about Indigenous culture, but it\'s not our job to do that unpaid emotional labour.',
                    author: 'Emily W.',
                    authorTitle: 'HR Specialist',
                    createdAt: '2025-01-22T14:30:00Z',
                    likes: 8,
                    isLiked: true,
                },
                {
                    id: '3',
                    content: 'I\'d add: negotiate for cultural leave if your company doesn\'t already offer it. Many employers are open to it, they just haven\'t thought about it.',
                    author: 'James D.',
                    authorTitle: 'Account Manager',
                    createdAt: '2025-01-23T09:00:00Z',
                    likes: 15,
                    isLiked: false,
                },
            ]);
        } finally {
            setLoading(false);
        }
    }

    async function handleSubmitReply(e) {
        e.preventDefault();
        if (!replyText.trim()) return;

        setSubmitting(true);
        try {
            const res = await api(`/community/topic/${topicId}/reply`, {
                method: 'POST',
                body: { content: replyText },
            });
            
            if (!res.ok) throw new Error('Failed to post reply');
            
            const data = res.data;
            setReplies((prev) => [...prev, data?.reply || data]);
            setReplyText('');
        } catch (err) {
            // Demo: add reply locally
            setReplies(prev => [...prev, {
                id: String(Date.now()),
                content: replyText,
                author: 'You',
                authorTitle: 'Member',
                createdAt: new Date().toISOString(),
                likes: 0,
                isLiked: false,
            }]);
            setReplyText('');
        } finally {
            setSubmitting(false);
        }
    }

    if (loading) {
        return (
            <div className="max-w-4xl mx-auto px-4 py-8">
                {/* Breadcrumb skeleton */}
                <nav className="mb-6 text-sm" aria-label="Breadcrumb">
                    <ol className="flex items-center gap-2 text-slate-400">
                        <li><span className="bg-slate-700 rounded w-24 h-4 inline-block animate-pulse"></span></li>
                        <li><span className="text-slate-600">/</span></li>
                        <li><span className="bg-slate-700 rounded w-28 h-4 inline-block animate-pulse"></span></li>
                    </ol>
                </nav>
                
                {/* Topic skeleton */}
                <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 mb-8 animate-pulse">
                    <div className="h-7 bg-slate-700 rounded w-3/4 mb-4"></div>
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-12 h-12 bg-slate-700 rounded-full"></div>
                        <div>
                            <div className="h-4 bg-slate-700 rounded w-32 mb-2"></div>
                            <div className="h-3 bg-slate-800 rounded w-48"></div>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <div className="h-4 bg-slate-800 rounded w-full"></div>
                        <div className="h-4 bg-slate-800 rounded w-full"></div>
                        <div className="h-4 bg-slate-800 rounded w-3/4"></div>
                    </div>
                </div>

                {/* Replies skeleton */}
                <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="bg-slate-900 border border-slate-800 rounded-lg p-4 animate-pulse">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-10 h-10 bg-slate-700 rounded-full"></div>
                                <div className="h-4 bg-slate-700 rounded w-24"></div>
                            </div>
                            <div className="h-4 bg-slate-800 rounded w-full mb-2"></div>
                            <div className="h-4 bg-slate-800 rounded w-2/3"></div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (!topic) {
        return (
            <div className="max-w-4xl mx-auto px-4 py-16 text-center">
                <h1 className="text-2xl font-bold mb-4">Topic not found</h1>
                <Link href="/community" className="text-blue-400 hover:text-blue-300">
                    ← Back to Community
                </Link>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto px-4 py-8">
            {/* Breadcrumb */}
            <nav className="mb-6 text-sm">
                <Link href="/community" className="text-slate-400 hover:text-slate-300">
                    Community
                </Link>
                <span className="mx-2 text-slate-600">/</span>
                <Link 
                    href={`/community/category/${topic.category}`} 
                    className="text-slate-400 hover:text-slate-300"
                >
                    {topic.categoryName}
                </Link>
            </nav>

            {error && (
                <div className="bg-red-900/50 border border-red-700 rounded-lg p-4 mb-6">
                    <p className="text-red-200">{error}</p>
                </div>
            )}

            {/* Topic */}
            <article className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden mb-8">
                <div className="p-6">
                    <div className="flex items-center gap-2 mb-4">
                        {topic.isPinned && (
                            <span className="px-2 py-0.5 bg-amber-900 text-amber-300 text-xs rounded">
                                📌 Pinned
                            </span>
                        )}
                        {topic.isLocked && (
                            <span className="px-2 py-0.5 bg-slate-700 text-slate-300 text-xs rounded">
                                🔒 Locked
                            </span>
                        )}
                    </div>

                    <h1 className="text-2xl font-bold mb-4">{topic.title}</h1>

                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center font-bold">
                            {topic.author?.charAt(0) || '?'}
                        </div>
                        <div>
                            <div className="font-medium">{topic.author}</div>
                            <div className="text-sm text-slate-400">
                                {(topic.authorTitle ? `${topic.authorTitle} • ` : '')}{new Date(topic.createdAt).toLocaleDateString('en-AU', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric',
                                })}
                            </div>
                        </div>
                    </div>

                    <div className="prose prose-invert max-w-none">
                        {topic.content.split('\n\n').map((para, idx) => (
                            <p key={idx} className="mb-4 text-slate-300 leading-relaxed">
                                {para}
                            </p>
                        ))}
                    </div>
                </div>

                <div className="px-6 py-3 border-t border-slate-800 flex items-center justify-between text-sm text-slate-400">
                    <span>{topic.viewCount} views</span>
                    <div className="flex items-center gap-4">
                        <button className="hover:text-blue-400">Share</button>
                        <button className="hover:text-blue-400">Report</button>
                    </div>
                </div>
            </article>

            {/* Replies */}
            <section className="mb-8">
                <h2 className="text-xl font-semibold mb-4">
                    {replies.length} {replies.length === 1 ? 'Reply' : 'Replies'}
                </h2>

                {replies.length === 0 ? (
                    <div className="bg-slate-900 border border-slate-800 rounded-lg p-8 text-center text-slate-400">
                        No replies yet. Be the first to respond!
                    </div>
                ) : (
                    <div className="space-y-4">
                        {replies.map((reply) => (
                            <ReplyCard key={reply.id} reply={reply} />
                        ))}
                    </div>
                )}
            </section>

            {/* Reply Form */}
            {!topic.isLocked && (
                <section className="bg-slate-900 border border-slate-800 rounded-lg p-6">
                    <h3 className="font-semibold mb-4">Add a Reply</h3>
                    <form onSubmit={handleSubmitReply}>
                        <textarea
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            placeholder="Share your thoughts..."
                            rows={4}
                            className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg 
                                       focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none
                                       placeholder-slate-500 resize-none mb-4"
                        />
                        <div className="flex items-center justify-between">
                            <p className="text-xs text-slate-500">
                                Please be respectful and follow community guidelines
                            </p>
                            <button
                                type="submit"
                                disabled={submitting || !replyText.trim()}
                                className="px-6 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 
                                           disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                            >
                                {submitting ? 'Posting...' : 'Post Reply'}
                            </button>
                        </div>
                    </form>
                </section>
            )}

            {topic.isLocked && (
                <div className="bg-slate-800 rounded-lg p-4 text-center text-slate-400">
                    🔒 This topic is locked. No new replies can be added.
                </div>
            )}
        </div>
    );
}

function ReplyCard({ reply }) {
    const [likes, setLikes] = useState(reply.likes ?? 0);
    const [isLiked, setIsLiked] = useState(Boolean(reply.isLiked));

    function handleLike() {
        if (isLiked) {
            setLikes(prev => prev - 1);
        } else {
            setLikes(prev => prev + 1);
        }
        setIsLiked(!isLiked);
    }

    return (
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
            <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-teal-600 rounded-full flex items-center justify-center text-sm font-bold shrink-0">
                    {(reply.author || 'Community Member').charAt(0)}
                </div>
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="font-medium">{reply.author || 'Community Member'}</span>
                        {reply.authorTitle && <span className="text-sm text-slate-500">{reply.authorTitle}</span>}
                        <span className="text-sm text-slate-500">•</span>
                        <span className="text-sm text-slate-500">
                            {new Date(reply.createdAt).toLocaleDateString('en-AU', {
                                month: 'short',
                                day: 'numeric',
                            })}
                        </span>
                    </div>
                    <p className="text-slate-300 leading-relaxed mb-3">{reply.content}</p>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={handleLike}
                            className={`flex items-center gap-1 text-sm transition-colors ${
                                isLiked ? 'text-red-400' : 'text-slate-400 hover:text-red-400'
                            }`}
                        >
                            {isLiked ? '❤️' : '🤍'} {likes}
                        </button>
                        <button className="text-sm text-slate-400 hover:text-blue-400">
                            Reply
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
