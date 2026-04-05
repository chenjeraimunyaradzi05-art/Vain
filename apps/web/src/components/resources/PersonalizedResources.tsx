/**
 * Personalized Resources Component
 * 
 * Shows educational resources based on user's foundation preferences
 * (business, finance, investing, etc.)
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { 
  BookOpen, ExternalLink, Star, Eye, Download, Clock, Bookmark,
  Loader2, AlertCircle, Sparkles, TrendingUp, GraduationCap, PlayCircle
} from 'lucide-react';
import { getErrorMessage } from '@/lib/formatters';
import { toCloudinaryAutoUrl } from '@/lib/cloudinary';
import OptimizedImage from '@/components/ui/OptimizedImage';

interface Resource {
  id: string;
  title: string;
  description: string;
  type: 'article' | 'video' | 'guide' | 'course' | 'tool' | 'ebook';
  category: string;
  author: {
    id: string;
    name: string;
    avatar?: string;
  };
  thumbnail?: string;
  url: string;
  downloadUrl?: string;
  duration?: number;
  readTime?: number;
  publishedAt: string;
  views: number;
  downloads: number;
  rating: number;
  ratingCount: number;
  isBookmarked: boolean;
  isPremium: boolean;
  isIndigenous: boolean;
  tags: string[];
}

interface Props {
  apiBase?: string;
  token?: string;
  limit?: number;
  showHeader?: boolean;
}

function getTypeIcon(type: string) {
  switch (type) {
    case 'video': return PlayCircle;
    case 'course': return GraduationCap;
    case 'ebook': return BookOpen;
    default: return BookOpen;
  }
}

function getTypeColor(type: string): string {
  switch (type) {
    case 'video': return 'bg-red-900/30 text-red-400 border-red-700';
    case 'course': return 'bg-purple-900/30 text-purple-400 border-purple-700';
    case 'guide': return 'bg-blue-900/30 text-blue-400 border-blue-700';
    case 'ebook': return 'bg-emerald-900/30 text-emerald-400 border-emerald-700';
    case 'tool': return 'bg-amber-900/30 text-amber-400 border-amber-700';
    default: return 'bg-slate-700/50 text-slate-400 border-slate-600';
  }
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-AU', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric' 
  });
}

function ResourceCard({ resource, onBookmark }: { resource: Resource; onBookmark: (id: string) => void }) {
  const TypeIcon = getTypeIcon(resource.type);

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden hover:border-slate-600 transition-all group">
      {/* Thumbnail */}
      {resource.thumbnail ? (
        <div className="h-40 bg-slate-700 overflow-hidden">
          <OptimizedImage 
            src={toCloudinaryAutoUrl(resource.thumbnail)} 
            alt={resource.title} 
            width={400}
            height={160}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </div>
      ) : (
        <div className="h-40 bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center">
          <TypeIcon className="w-12 h-12 text-slate-500" />
        </div>
      )}

      <div className="p-5">
        {/* Type Badge & Category */}
        <div className="flex items-center gap-2 mb-3">
          <span className={`px-2 py-0.5 text-xs font-medium rounded-full border ${getTypeColor(resource.type)}`}>
            {resource.type.charAt(0).toUpperCase() + resource.type.slice(1)}
          </span>
          <span className="text-xs text-slate-500">{resource.category}</span>
          {resource.isIndigenous && (
            <span className="text-xs">🪃</span>
          )}
        </div>

        {/* Title */}
        <h3 className="font-semibold text-white mb-2 line-clamp-2 group-hover:text-green-400 transition-colors">
          {resource.title}
        </h3>

        {/* Description */}
        <p className="text-sm text-slate-400 mb-4 line-clamp-2">
          {resource.description}
        </p>

        {/* Stats */}
        <div className="flex items-center gap-4 text-xs text-slate-500 mb-4">
          {resource.rating > 0 && (
            <span className="flex items-center gap-1">
              <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              {resource.rating.toFixed(1)}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Eye className="w-3.5 h-3.5" />
            {resource.views.toLocaleString()}
          </span>
          {resource.downloads > 0 && (
            <span className="flex items-center gap-1">
              <Download className="w-3.5 h-3.5" />
              {resource.downloads.toLocaleString()}
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <div className="text-xs text-slate-500">
            By {resource.author.name}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onBookmark(resource.id)}
              className={`p-2 rounded-lg transition-colors ${
                resource.isBookmarked 
                  ? 'bg-amber-900/30 text-amber-400' 
                  : 'bg-slate-700 text-slate-400 hover:text-white'
              }`}
            >
              <Bookmark className={`w-4 h-4 ${resource.isBookmarked ? 'fill-current' : ''}`} />
            </button>
            <Link
              href={resource.url || `/resources/${resource.id}`}
              target={resource.url?.startsWith('http') ? '_blank' : undefined}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-500 transition-colors text-sm"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              View
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PersonalizedResources({ apiBase = '', token, limit = 12, showHeader = true }: Props) {
  const [resources, setResources] = useState<Resource[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadResources = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch(`${apiBase}/api/resources/personalized/for-me?limit=${limit}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: 'include',
      });

      if (!res.ok) {
        throw new Error('Failed to load resources');
      }

      const data = await res.json();
      setResources(data.resources || []);
      setCategories(data.categories || []);
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to load resources'));
    } finally {
      setLoading(false);
    }
  }, [apiBase, token, limit]);

  useEffect(() => {
    loadResources();
  }, [loadResources]);

  const handleBookmark = async (resourceId: string) => {
    try {
      const resource = resources.find(r => r.id === resourceId);
      if (!resource) return;

      const method = resource.isBookmarked ? 'DELETE' : 'POST';
      await fetch(`${apiBase}/api/resources/${resourceId}/bookmark`, {
        method,
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: 'include',
      });

      setResources(prev => prev.map(r => 
        r.id === resourceId ? { ...r, isBookmarked: !r.isBookmarked } : r
      ));
    } catch (err) {
      console.error('Bookmark error:', err);
    }
  };

  if (loading) {
    return (
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-8">
        <div className="flex flex-col items-center justify-center py-8">
          <Loader2 className="w-8 h-8 animate-spin text-green-500 mb-4" />
          <p className="text-slate-400">Loading your personalized resources...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-8">
        <div className="flex flex-col items-center justify-center py-8">
          <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
          <p className="text-red-300 mb-4">{error}</p>
          <button
            onClick={loadResources}
            className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (resources.length === 0) {
    return (
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-8">
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-16 h-16 rounded-full bg-slate-700 flex items-center justify-center mb-4">
            <BookOpen className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">No Resources Yet</h3>
          <p className="text-slate-400 max-w-md mb-6">
            Update your interests in settings to get personalized resource recommendations.
          </p>
          <Link
            href="/member/settings"
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-500 transition-colors"
          >
            Update Interests
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {showHeader && (
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-purple-400" />
              Recommended For You
            </h2>
            <p className="text-slate-400 text-sm mt-1">
              Based on your interests: {categories.slice(0, 3).join(', ')}
              {categories.length > 3 && ` +${categories.length - 3} more`}
            </p>
          </div>
          <Link
            href="/resources"
            className="text-sm text-green-400 hover:text-green-300 transition-colors"
          >
            Browse All →
          </Link>
        </div>
      )}

      {/* Resource Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {resources.map(resource => (
          <ResourceCard 
            key={resource.id} 
            resource={resource} 
            onBookmark={handleBookmark}
          />
        ))}
      </div>

      {/* See More */}
      <div className="flex justify-center pt-4">
        <Link
          href="/resources"
          className="px-6 py-2 border border-slate-600 text-slate-300 rounded-lg hover:bg-slate-800 hover:border-slate-500 transition-colors"
        >
          Explore All Resources
        </Link>
      </div>
    </div>
  );
}
