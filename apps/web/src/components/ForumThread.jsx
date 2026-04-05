'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNotifications } from './notifications/NotificationProvider';
import api from '@/lib/apiClient';

/**
 * Forum Thread Component
 * Displays a forum thread with replies and supports posting new replies
 */
export default function ForumThread({ threadId }) {
    const { user, isAuthenticated } = useAuth();
    const { showNotification } = useNotifications();
    const [thread, setThread] = useState(null);
    const [replies, setReplies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [replyContent, setReplyContent] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);
    
    // Fetch thread and replies
    const fetchThread = useCallback(async () => {
        try {
            const { ok, data } = await api(`/forums/threads/${threadId}?page=${page}`);
            
            if (!ok) throw new Error('Thread not found');
            
            setThread(data.thread);
            
            if (page === 1) {
                setReplies(data.replies || []);
            } else {
                setReplies(prev => [...prev, ...(data.replies || [])]);
            }
            
            setHasMore(data.hasMore || false);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [threadId, page]);
    
    useEffect(() => {
        fetchThread();
    }, [fetchThread]);
    
    // Submit new reply
    const handleSubmitReply = async (e) => {
        e.preventDefault();
        if (!replyContent.trim()) return;
        
        setSubmitting(true);
        try {
            const { ok, data } = await api(`/forums/threads/${threadId}/replies`, {
                method: 'POST',
                body: { content: replyContent },
            });
            
            if (!ok) throw new Error('Failed to post reply');
            
            setReplies(prev => [...prev, data.reply]);
            setReplyContent('');
            
            // Update thread reply count
            setThread(prev => ({ ...prev, replyCount: (prev.replyCount || 0) + 1 }));
        } catch (err) {
            setError(err.message);
        } finally {
            setSubmitting(false);
        }
    };
    
    // Report content
    const handleReport = async (type, id, reason) => {
        try {
            await api('/forums/report', {
                method: 'POST',
                body: { contentType: type, contentId: id, reason },
            });
            showNotification({ message: 'Content reported. Thank you.', variant: 'success' });
        } catch (err) {
            console.error('Report error:', err);
        }
    };
    
    if (loading) {
        return (
            <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }
    
    if (error || !thread) {
        return (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {error || 'Thread not found'}
            </div>
        );
    }
    
    return (
        <div className="space-y-6">
            {/* Thread Header */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
                <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-primary font-semibold text-lg">
                            {thread.authorName?.charAt(0) || 'A'}
                        </span>
                    </div>
                    <div className="flex-1 min-w-0">
                        <h1 className="text-xl font-bold text-gray-900 mb-2">{thread.title}</h1>
                        <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                            <span>{thread.authorName || 'Anonymous'}</span>
                            <span>•</span>
                            <span>{new Date(thread.createdAt).toLocaleDateString()}</span>
                            <span>•</span>
                            <span>{thread.replyCount || 0} replies</span>
                            {thread.isPinned && (
                                <>
                                    <span>•</span>
                                    <span className="text-primary font-medium">📌 Pinned</span>
                                </>
                            )}
                        </div>
                        <div className="prose prose-sm max-w-none">
                            {thread.content.split('\n').map((para, idx) => (
                                <p key={idx}>{para}</p>
                            ))}
                        </div>
                        
                        {/* Thread Actions */}
                        {isAuthenticated && (
                            <div className="mt-4 flex items-center gap-4">
                                <button
                                    onClick={() => {
                                        const reason = prompt('Why are you reporting this?');
                                        if (reason) handleReport('thread', thread.id, reason);
                                    }}
                                    className="text-sm text-gray-500 hover:text-red-600"
                                >
                                    Report
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            
            {/* Replies */}
            <div className="space-y-4">
                <h2 className="text-lg font-semibold text-gray-900">
                    {replies.length} {replies.length === 1 ? 'Reply' : 'Replies'}
                </h2>
                
                {replies.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                        No replies yet. Be the first to respond!
                    </div>
                ) : (
                    <div className="space-y-4">
                        {replies.map((reply, idx) => (
                            <ReplyCard
                                key={reply.id}
                                reply={reply}
                                isFirst={idx === 0}
                                onReport={(reason) => handleReport('reply', reply.id, reason)}
                            />
                        ))}
                        
                        {hasMore && (
                            <button
                                onClick={() => setPage(p => p + 1)}
                                className="w-full py-3 text-center text-primary hover:bg-primary/5 rounded-lg"
                            >
                                Load more replies
                            </button>
                        )}
                    </div>
                )}
            </div>
            
            {/* Reply Form */}
            {isAuthenticated ? (
                <form onSubmit={handleSubmitReply} className="bg-white rounded-xl shadow-sm border p-6">
                    <h3 className="font-semibold text-gray-900 mb-4">Post a Reply</h3>
                    <textarea
                        value={replyContent}
                        onChange={(e) => setReplyContent(e.target.value)}
                        placeholder="Share your thoughts..."
                        rows={4}
                        className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                        required
                    />
                    <div className="mt-4 flex justify-end">
                        <button
                            type="submit"
                            disabled={submitting || !replyContent.trim()}
                            className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50"
                        >
                            {submitting ? 'Posting...' : 'Post Reply'}
                        </button>
                    </div>
                </form>
            ) : (
                <div className="bg-gray-50 rounded-xl border p-6 text-center">
                    <p className="text-gray-600">Sign-in is disabled.</p>
                </div>
            )}
        </div>
    );
}

/**
 * Individual reply card
 */
function ReplyCard({ reply, isFirst, onReport }) {
    const [showReportForm, setShowReportForm] = useState(false);
    
    return (
        <div className={`bg-white rounded-lg border p-4 ${isFirst ? 'border-primary/30' : ''}`}>
            <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-gray-600 font-medium">
                        {reply.authorName?.charAt(0) || 'A'}
                    </span>
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="font-medium text-gray-900">
                            {reply.authorName || 'Anonymous'}
                        </span>
                        {reply.authorBadge && (
                            <span className="text-xs bg-ochre-100 text-ochre-700 px-2 py-0.5 rounded">
                                {reply.authorBadge}
                            </span>
                        )}
                        <span className="text-sm text-gray-500">
                            {new Date(reply.createdAt).toLocaleDateString()}
                        </span>
                    </div>
                    <div className="text-gray-700">
                        {reply.content.split('\n').map((para, idx) => (
                            <p key={idx} className="mb-2 last:mb-0">{para}</p>
                        ))}
                    </div>
                    
                    {/* Reply Actions */}
                    <div className="mt-3 flex items-center gap-4 text-sm">
                        <button
                            onClick={() => setShowReportForm(!showReportForm)}
                            className="text-gray-500 hover:text-red-600"
                        >
                            Report
                        </button>
                    </div>
                    
                    {/* Report Form */}
                    {showReportForm && (
                        <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                            <select
                                className="w-full border rounded px-3 py-2 text-sm mb-2"
                                onChange={(e) => {
                                    if (e.target.value) {
                                        onReport(e.target.value);
                                        setShowReportForm(false);
                                    }
                                }}
                            >
                                <option value="">Select a reason...</option>
                                <option value="spam">Spam or advertising</option>
                                <option value="harassment">Harassment or bullying</option>
                                <option value="inappropriate">Inappropriate content</option>
                                <option value="misinformation">Misinformation</option>
                                <option value="other">Other</option>
                            </select>
                            <button
                                onClick={() => setShowReportForm(false)}
                                className="text-sm text-gray-500 hover:text-gray-700"
                            >
                                Cancel
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

/**
 * Forum thread list component
 */
export function ForumThreadList({ categorySlug }) {
    const [threads, setThreads] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    useEffect(() => {
        const fetchThreads = async () => {
            try {
                const url = categorySlug
                    ? `/forums/categories/${categorySlug}/threads`
                    : `/forums/threads/recent`;
                    
                const { ok, data } = await api(url);
                if (!ok) throw new Error('Failed to load threads');
                
                setThreads(data.threads || []);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        
        fetchThreads();
    }, [categorySlug]);
    
    if (loading) {
        return <div className="animate-pulse space-y-4">
            {[1, 2, 3].map(i => (
                <div key={i} className="h-24 bg-gray-100 rounded-lg"></div>
            ))}
        </div>;
    }
    
    if (error) {
        return <div className="text-red-600">{error}</div>;
    }
    
    return (
        <div className="space-y-4">
            {threads.map((thread) => (
                <a
                    key={thread.id}
                    href={`/community/forums/thread/${thread.id}`}
                    className="block bg-white rounded-lg border p-4 hover:shadow-md transition-shadow"
                >
                    <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <span className="text-primary font-medium">
                                {thread.authorName?.charAt(0) || 'A'}
                            </span>
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                                {thread.isPinned && <span className="text-primary">📌</span>}
                                <h3 className="font-semibold text-gray-900 line-clamp-1">
                                    {thread.title}
                                </h3>
                            </div>
                            <p className="text-gray-600 text-sm line-clamp-2 mt-1">
                                {thread.content}
                            </p>
                            <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                                <span>{thread.authorName}</span>
                                <span>•</span>
                                <span>{new Date(thread.createdAt).toLocaleDateString()}</span>
                                <span>•</span>
                                <span>{thread.replyCount || 0} replies</span>
                            </div>
                        </div>
                    </div>
                </a>
            ))}
            
            {threads.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                    No threads yet. Start a new discussion!
                </div>
            )}
        </div>
    );
}

/**
 * Create new thread form
 */
export function CreateThreadForm({ categoryId, onSuccess }) {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);
    
    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setError(null);
        
        try {
            const { ok, data, error: apiError } = await api('/forums/threads', {
                method: 'POST',
                body: { categoryId, title, content },
            });
            
            if (!ok) {
                throw new Error(apiError || 'Failed to create thread');
            }
            
            onSuccess?.(data.thread);
        } catch (err) {
            setError(err.message);
        } finally {
            setSubmitting(false);
        }
    };
    
    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                    {error}
                </div>
            )}
            
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                    maxLength={200}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="What's your question or topic?"
                />
            </div>
            
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
                <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    required
                    rows={6}
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                    placeholder="Share more details..."
                />
            </div>
            
            <div className="flex justify-end">
                <button
                    type="submit"
                    disabled={submitting || !title.trim() || !content.trim()}
                    className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50"
                >
                    {submitting ? 'Posting...' : 'Create Thread'}
                </button>
            </div>
        </form>
    );
}
