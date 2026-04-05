'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import Image from '@/components/ui/OptimizedImage';
import { isCloudinaryPublicId } from '@/lib/cloudinary';
import api from '@/lib/apiClient';

/**
 * Success Stories Gallery Component
 * Displays and allows submission of community success stories
 */
export default function SuccessStories({ showSubmitForm = false }) {
    const { user } = useAuth();
    const [stories, setStories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showForm, setShowForm] = useState(false);
    
    // Fetch published stories
    const fetchStories = useCallback(async () => {
        try {
            const { ok, data } = await api('/stories?status=published&limit=12');
            
            if (!ok) throw new Error('Failed to fetch stories');
            
            setStories(data.stories || []);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);
    
    useEffect(() => {
        fetchStories();
    }, [fetchStories]);
    
    if (loading) {
        return (
            <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }
    
    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Success Stories</h2>
                    <p className="text-gray-600 mt-1">
                        Celebrating achievements from our community
                    </p>
                </div>
                {showSubmitForm && user && (
                    <button
                        onClick={() => setShowForm(!showForm)}
                        className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark"
                    >
                        {showForm ? 'Cancel' : 'Share Your Story'}
                    </button>
                )}
            </div>
            
            {/* Error Alert */}
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                    {error}
                </div>
            )}
            
            {/* Submit Form */}
            {showForm && (
                <StorySubmitForm 
                    onSuccess={() => {
                        setShowForm(false);
                        fetchStories();
                    }}
                />
            )}
            
            {/* Stories Grid */}
            {stories.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-xl">
                    <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                    </svg>
                    <p className="text-gray-500">No stories published yet.</p>
                    {showSubmitForm && user && (
                        <button
                            onClick={() => setShowForm(true)}
                            className="mt-4 px-4 py-2 text-primary hover:underline"
                        >
                            Be the first to share your story!
                        </button>
                    )}
                </div>
            ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {stories.map((story) => (
                        <StoryCard key={story.id} story={story} />
                    ))}
                </div>
            )}
        </div>
    );
}

/**
 * Individual story card
 */
function StoryCard({ story }) {
    return (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden hover:shadow-md transition-shadow">
            {story.imageUrl && (
                <div className="relative h-48 bg-gray-100">
                    <Image
                        src={story.imageUrl}
                        alt={story.title}
                        fill
                            cloudinary={isCloudinaryPublicId(story.imageUrl)}
                        className="object-cover"
                    />
                </div>
            )}
            <div className="p-5">
                {story.category && (
                    <span className="inline-flex px-2 py-1 text-xs font-medium bg-ochre-100 text-ochre-700 rounded-full mb-3">
                        {story.category}
                    </span>
                )}
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{story.title}</h3>
                <p className="text-gray-600 text-sm line-clamp-3">{story.summary}</p>
                
                {/* Author info */}
                <div className="mt-4 pt-4 border-t flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-primary font-semibold">
                            {story.authorName?.charAt(0) || 'A'}
                        </span>
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-900">
                            {story.authorName || 'Community Member'}
                        </p>
                        {story.location && (
                            <p className="text-xs text-gray-500">{story.location}</p>
                        )}
                    </div>
                </div>
                
                {/* Read more link */}
                <a
                    href={`/stories/${story.id}`}
                    className="mt-4 inline-flex items-center text-primary hover:underline text-sm"
                >
                    Read full story
                    <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                </a>
            </div>
        </div>
    );
}

/**
 * Story submission form
 */
function StorySubmitForm({ onSuccess }) {
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [formData, setFormData] = useState({
        title: '',
        summary: '',
        content: '',
        category: '',
        location: '',
        consentToPublish: false,
    });
    
    const categories = [
        'Career Success',
        'Education Achievement',
        'Business/Entrepreneurship',
        'Community Leadership',
        'Personal Growth',
        'Training Completion',
        'Other',
    ];
    
    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value,
        }));
    };
    
    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!formData.consentToPublish) {
            setError('Please confirm consent to publish');
            return;
        }
        
        setSubmitting(true);
        setError(null);
        
        try {
            const { ok, error: apiError } = await api('/stories', {
                method: 'POST',
                body: formData,
            });
            
            if (!ok) {
                throw new Error(apiError || 'Failed to submit story');
            }
            
            onSuccess?.();
        } catch (err) {
            setError(err.message);
        } finally {
            setSubmitting(false);
        }
    };
    
    return (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border p-6 space-y-6">
            <h3 className="text-lg font-semibold text-gray-900">Share Your Success Story</h3>
            <p className="text-gray-600 text-sm">
                Your story can inspire others in our community. Share your journey!
            </p>
            
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                    {error}
                </div>
            )}
            
            <div className="grid md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Story Title *
                    </label>
                    <input
                        type="text"
                        name="title"
                        value={formData.title}
                        onChange={handleChange}
                        required
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="Give your story a title"
                    />
                </div>
                
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Category
                    </label>
                    <select
                        name="category"
                        value={formData.category}
                        onChange={handleChange}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                        <option value="">Select a category</option>
                        {categories.map((cat) => (
                            <option key={cat} value={cat}>{cat}</option>
                        ))}
                    </select>
                </div>
                
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Location
                    </label>
                    <input
                        type="text"
                        name="location"
                        value={formData.location}
                        onChange={handleChange}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="e.g., Sydney, NSW"
                    />
                </div>
            </div>
            
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Short Summary *
                </label>
                <textarea
                    name="summary"
                    value={formData.summary}
                    onChange={handleChange}
                    required
                    rows={2}
                    maxLength={280}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="A brief summary of your story (max 280 characters)"
                />
                <p className="text-xs text-gray-500 mt-1">
                    {formData.summary.length}/280 characters
                </p>
            </div>
            
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Your Full Story *
                </label>
                <textarea
                    name="content"
                    value={formData.content}
                    onChange={handleChange}
                    required
                    rows={8}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Share your journey, challenges, and achievements..."
                />
            </div>
            
            <div className="flex items-start gap-3">
                <input
                    type="checkbox"
                    name="consentToPublish"
                    id="consentToPublish"
                    checked={formData.consentToPublish}
                    onChange={handleChange}
                    className="mt-1"
                />
                <label htmlFor="consentToPublish" className="text-sm text-gray-600">
                    I consent to having my story published on the Ngurra platform. I understand it will 
                    be reviewed before publication and may be edited for clarity. I confirm all 
                    information is accurate and I have the right to share this story.
                </label>
            </div>
            
            <div className="flex justify-end gap-3">
                <button
                    type="submit"
                    disabled={submitting}
                    className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {submitting ? 'Submitting...' : 'Submit Story'}
                </button>
            </div>
        </form>
    );
}

/**
 * Featured story hero component (for homepage)
 */
export function FeaturedStory({ story }) {
    if (!story) return null;
    
    return (
        <div className="bg-gradient-to-r from-ochre-50 to-ochre-100 rounded-2xl overflow-hidden">
            <div className="grid md:grid-cols-2 gap-8 p-8">
                <div className="flex flex-col justify-center">
                    <span className="inline-flex px-3 py-1 text-sm font-medium bg-ochre-200 text-ochre-800 rounded-full w-fit mb-4">
                        Featured Story
                    </span>
                    <h2 className="text-2xl md:text-3xl font-bold text-ochre-900 mb-4">
                        {story.title}
                    </h2>
                    <p className="text-ochre-700 mb-6">{story.summary}</p>
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-12 h-12 rounded-full bg-ochre-200 flex items-center justify-center">
                            <span className="text-ochre-800 font-semibold text-lg">
                                {story.authorName?.charAt(0) || 'A'}
                            </span>
                        </div>
                        <div>
                            <p className="font-medium text-ochre-900">{story.authorName}</p>
                            <p className="text-sm text-ochre-600">{story.location}</p>
                        </div>
                    </div>
                    <a
                        href={`/stories/${story.id}`}
                        className="inline-flex items-center px-6 py-3 bg-ochre-600 text-white rounded-lg hover:bg-ochre-700 w-fit"
                    >
                        Read Full Story
                        <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </a>
                </div>
                {story.imageUrl && (
                    <div className="relative h-64 md:h-auto rounded-xl overflow-hidden">
                        <Image
                            src={story.imageUrl}
                            alt={story.title}
                            fill
                            cloudinary={isCloudinaryPublicId(story.imageUrl)}
                            className="object-cover"
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
