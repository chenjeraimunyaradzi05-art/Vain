'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/apiClient';
import { Button } from '@/components/ui/button';
import OptimizedImage from '@/components/ui/OptimizedImage';

// Theme colors
const accentPink = '#E91E8C';
const accentPurple = '#8B5CF6';

// Resource types
interface Resource {
  id: string;
  title: string;
  description: string;
  type: 'document' | 'video' | 'article' | 'template' | 'guide' | 'toolkit';
  category: string;
  thumbnailUrl?: string;
  url?: string;
  downloadUrl?: string;
  author?: {
    name: string;
    organization?: string;
  };
  tags: string[];
  rating?: number;
  ratingCount?: number;
  viewCount: number;
  downloadCount: number;
  fileSize?: number;
  duration?: number;
  isBookmarked?: boolean;
  isFeatured?: boolean;
  isIndigenousResource?: boolean;
  culturalContext?: string;
  createdAt: string;
  updatedAt: string;
}

// Helper function for Cloudinary URLs
function toCloudinaryAutoUrl(url: string): string {
  if (!url) return '';
  if (url.includes('cloudinary')) return url;
  return url;
}

// API functions
const resourcesApi = {
  async getResources(filters?: { category?: string; type?: string; search?: string }) {
    const params = new URLSearchParams();
    if (filters?.category) params.append('category', filters.category);
    if (filters?.type) params.append('type', filters.type);
    if (filters?.search) params.append('search', filters.search);

    const response = await api(`/resources?${params.toString()}`);
    if (!response.ok) return { resources: [] };
    return { resources: response.data?.resources || [] };
  },

  async getBookmarked() {
    const response = await api('/resources/bookmarked');
    if (!response.ok) return { resources: [] };
    return { resources: response.data?.resources || [] };
  },

  async bookmarkResource(id: string): Promise<void> {
    await api(`/resources/${id}/bookmark`, { method: 'POST' });
  },

  async unbookmarkResource(id: string): Promise<void> {
    await api(`/resources/${id}/bookmark`, { method: 'DELETE' });
  },

  async rateResource(id: string, rating: number): Promise<void> {
    await api(`/resources/${id}/rate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rating }),
    });
  },

  async trackDownload(id: string): Promise<void> {
    await api(`/resources/${id}/download`, { method: 'POST' });
  },
};

// Config objects
const typeConfig: Record<
  string,
  { icon: string; label: string; color: string; bg: string; text: string }
> = {
  document: {
    icon: '📄',
    label: 'Document',
    color: 'blue',
    bg: 'bg-blue-50',
    text: 'text-blue-600',
  },
  video: { icon: '🎥', label: 'Video', color: 'red', bg: 'bg-red-50', text: 'text-red-600' },
  article: {
    icon: '📰',
    label: 'Article',
    color: 'green',
    bg: 'bg-emerald-50',
    text: 'text-emerald-600',
  },
  template: {
    icon: '📋',
    label: 'Template',
    color: 'purple',
    bg: 'bg-purple-50',
    text: 'text-purple-600',
  },
  guide: {
    icon: '📖',
    label: 'Guide',
    color: 'orange',
    bg: 'bg-orange-50',
    text: 'text-orange-600',
  },
  toolkit: { icon: '🧰', label: 'Toolkit', color: 'teal', bg: 'bg-teal-50', text: 'text-teal-600' },
};

const categoryConfig: Record<string, { icon: string; label: string; description: string }> = {
  career: {
    icon: '💼',
    label: 'Career',
    description: 'Resume templates, interview tips, career planning',
  },
  education: {
    icon: '🎓',
    label: 'Education',
    description: 'Study guides, courses, certifications',
  },
  culture: {
    icon: '🎨',
    label: 'Culture',
    description: 'Indigenous knowledge, cultural practices, language resources',
  },
  business: {
    icon: '📊',
    label: 'Business',
    description: 'Business planning, grants, procurement',
  },
  health: {
    icon: '💚',
    label: 'Health & Wellbeing',
    description: 'Mental health, wellness, self-care',
  },
  community: {
    icon: '👥',
    label: 'Community',
    description: 'Community building, leadership, volunteering',
  },
  technology: {
    icon: '💻',
    label: 'Technology',
    description: 'Digital skills, software tutorials, tech careers',
  },
};

// Demo resources
const demoResources: Resource[] = [
  {
    id: '1',
    title: 'First Nations Career Planning Guide',
    description:
      'A comprehensive guide to planning your career journey, setting goals, and achieving success while staying connected to your cultural identity.',
    type: 'guide',
    category: 'career',
    thumbnailUrl: '',
    url: '#',
    downloadUrl: '#',
    author: { name: 'Career Services Team', organization: 'Ngurra Pathways' },
    tags: ['career', 'planning', 'goals', 'first nations'],
    rating: 4.8,
    ratingCount: 156,
    viewCount: 2345,
    downloadCount: 890,
    isBookmarked: false,
    isFeatured: true,
    isIndigenousResource: true,
    culturalContext:
      'This guide incorporates Traditional Custodian perspectives on career and community contribution.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '2',
    title: 'Resume Template for Career Changers',
    description:
      'Professional resume template designed for those transitioning careers. Highlights transferable skills and experience.',
    type: 'template',
    category: 'career',
    thumbnailUrl: '',
    downloadUrl: '#',
    author: { name: 'HR Professionals Network' },
    tags: ['resume', 'template', 'career change'],
    rating: 4.6,
    ratingCount: 234,
    viewCount: 5678,
    downloadCount: 2341,
    isBookmarked: true,
    isFeatured: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '3',
    title: 'Interview Preparation Video Series',
    description:
      'Learn how to ace your next job interview with tips from hiring managers and career coaches.',
    type: 'video',
    category: 'career',
    thumbnailUrl: '',
    url: '#',
    duration: 3600,
    author: { name: 'Interview Experts', organization: 'Career Academy' },
    tags: ['interview', 'preparation', 'video'],
    rating: 4.9,
    ratingCount: 567,
    viewCount: 12456,
    downloadCount: 0,
    isFeatured: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '4',
    title: 'Indigenous Business Startup Toolkit',
    description:
      'Everything you need to start and grow an Indigenous-owned business. Includes templates, checklists, and funding guides.',
    type: 'toolkit',
    category: 'business',
    thumbnailUrl: '',
    downloadUrl: '#',
    author: { name: 'Indigenous Business Network' },
    tags: ['business', 'startup', 'indigenous', 'toolkit'],
    rating: 4.7,
    ratingCount: 89,
    viewCount: 3456,
    downloadCount: 1234,
    isIndigenousResource: true,
    culturalContext:
      'Developed in consultation with Indigenous business owners and community leaders.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '5',
    title: 'Digital Skills for Beginners',
    description:
      'Build foundational digital literacy skills including email, document creation, and basic software use.',
    type: 'guide',
    category: 'technology',
    thumbnailUrl: '',
    url: '#',
    author: { name: 'Tech Education Team' },
    tags: ['digital skills', 'beginner', 'technology'],
    rating: 4.5,
    ratingCount: 123,
    viewCount: 4567,
    downloadCount: 890,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '6',
    title: 'Mental Health at Work Guide',
    description:
      'Practical strategies for maintaining mental wellbeing in the workplace. Includes self-care tips and support resources.',
    type: 'guide',
    category: 'health',
    thumbnailUrl: '',
    downloadUrl: '#',
    author: { name: 'Wellbeing Team', organization: 'Ngurra Pathways' },
    tags: ['mental health', 'wellbeing', 'workplace'],
    rating: 4.8,
    ratingCount: 201,
    viewCount: 6789,
    downloadCount: 2345,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

// Format helpers
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  const remainingMins = mins % 60;
  return `${hours}h ${remainingMins}m`;
}

// Star Rating Component
function StarRating({
  rating = 0,
  count,
  interactive = false,
  onRate,
}: {
  rating?: number;
  count?: number;
  interactive?: boolean;
  // eslint-disable-next-line no-unused-vars
  onRate?: (rating: number) => void;
}) {
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const displayRating = hoverRating !== null ? hoverRating : rating;

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={!interactive}
          onClick={() => interactive && onRate?.(star)}
          onMouseEnter={() => interactive && setHoverRating(star)}
          onMouseLeave={() => interactive && setHoverRating(null)}
          className={`${interactive ? 'cursor-pointer' : 'cursor-default'}`}
        >
          <svg
            className={`w-4 h-4 ${star <= displayRating ? 'text-amber-400 fill-current' : 'text-slate-300'}`}
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        </button>
      ))}
      {count !== undefined && <span className="text-xs text-slate-500 ml-1">({count})</span>}
    </div>
  );
}

// Resource Card Component
function ResourceCard({
  resource,
  onView,
  onBookmark,
  onDownload,
}: {
  resource: Resource;
  onView: () => void;
  onBookmark: () => void;
  onDownload: () => void;
}) {
  const typeInfo = typeConfig[resource.type] || typeConfig.document;
  const categoryInfo = categoryConfig[resource.category] || categoryConfig.career;

  return (
    <div
      className="bg-white rounded-2xl border border-slate-100 shadow-lg shadow-slate-200/50 overflow-hidden hover:shadow-xl hover:border-pink-200 transition-all duration-300 cursor-pointer group"
      onClick={onView}
    >
      {/* Thumbnail */}
      {resource.thumbnailUrl ? (
        <div className="relative h-40 bg-slate-100">
          <OptimizedImage
            src={toCloudinaryAutoUrl(resource.thumbnailUrl)}
            alt={resource.title}
            width={400}
            height={160}
            className="w-full h-full object-cover"
          />
          {resource.type === 'video' && resource.duration && (
            <span className="absolute bottom-2 right-2 px-2 py-1 bg-black/70 text-white text-xs rounded-lg font-medium">
              {formatDuration(resource.duration)}
            </span>
          )}
          {resource.isFeatured && (
            <span className="absolute top-3 left-3 px-3 py-1 bg-gradient-to-r from-amber-400 to-orange-500 text-white text-xs font-bold rounded-full shadow-lg">
              ⭐ Featured
            </span>
          )}
        </div>
      ) : (
        <div
          className="h-32 flex items-center justify-center relative"
          style={{ background: `linear-gradient(135deg, ${accentPink}10, ${accentPurple}10)` }}
        >
          <span className="text-5xl">{typeInfo.icon}</span>
          {resource.isFeatured && (
            <span className="absolute top-3 left-3 px-3 py-1 bg-gradient-to-r from-amber-400 to-orange-500 text-white text-xs font-bold rounded-full shadow-lg">
              ⭐ Featured
            </span>
          )}
        </div>
      )}

      <div className="p-5">
        {/* Type & Category */}
        <div className="flex items-center gap-2 mb-3">
          <span
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg ${typeInfo.bg} ${typeInfo.text}`}
          >
            {typeInfo.icon} {typeInfo.label}
          </span>
          <span className="text-xs text-slate-500 font-medium">
            {categoryInfo.icon} {categoryInfo.label}
          </span>
          {resource.isIndigenousResource && (
            <span
              className="px-2 py-1 text-xs bg-amber-100 text-amber-700 rounded-lg"
              title="Indigenous Resource"
            >
              🤝
            </span>
          )}
        </div>

        {/* Title */}
        <h3 className="font-bold text-slate-900 group-hover:text-pink-600 transition-colors line-clamp-2 mb-2">
          {resource.title}
        </h3>

        {/* Description */}
        <p className="text-sm text-slate-500 line-clamp-2 mb-3">{resource.description}</p>

        {/* Author */}
        {resource.author && (
          <p className="text-xs text-slate-400 mb-3">
            By {resource.author.name}
            {resource.author.organization && ` · ${resource.author.organization}`}
          </p>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          <div className="flex items-center gap-2">
            {resource.rating !== undefined && (
              <StarRating rating={resource.rating} count={resource.ratingCount} />
            )}
          </div>

          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={onBookmark}
              className={`p-2 rounded-lg transition-colors ${
                resource.isBookmarked
                  ? 'text-amber-500 bg-amber-50'
                  : 'text-slate-400 hover:text-amber-500 hover:bg-amber-50'
              }`}
              title={resource.isBookmarked ? 'Remove bookmark' : 'Bookmark'}
            >
              <svg
                className={`w-5 h-5 ${resource.isBookmarked ? 'fill-current' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                />
              </svg>
            </button>
            {resource.downloadUrl && (
              <button
                onClick={onDownload}
                className="p-2 rounded-lg text-slate-400 hover:text-pink-600 hover:bg-pink-50 transition-colors"
                title="Download"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Resource Detail Modal
function ResourceDetailModal({
  resource,
  onClose,
  onBookmark,
  onDownload,
  onRate,
}: {
  resource: Resource;
  onClose: () => void;
  onBookmark: () => void;
  onDownload: () => void;
  // eslint-disable-next-line no-unused-vars
  onRate: (rating: number) => void;
}) {
  const typeInfo = typeConfig[resource.type] || typeConfig.document;
  const categoryInfo = categoryConfig[resource.category] || categoryConfig.career;

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <span
              className={`px-3 py-1.5 text-sm font-semibold rounded-lg ${typeInfo.bg} ${typeInfo.text}`}
            >
              {typeInfo.icon} {typeInfo.label}
            </span>
            <span className="text-sm text-slate-500 font-medium">
              {categoryInfo.icon} {categoryInfo.label}
            </span>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-lg transition-colors">
            <svg
              className="w-5 h-5 text-slate-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Video Player */}
          {resource.type === 'video' && resource.url && (
            <div className="mb-6 aspect-video bg-black rounded-xl overflow-hidden">
              <video
                src={resource.url}
                controls
                className="w-full h-full"
                poster={resource.thumbnailUrl}
              />
            </div>
          )}

          {/* Thumbnail for non-video */}
          {resource.type !== 'video' && resource.thumbnailUrl && (
            <div className="mb-6 h-48 bg-slate-100 rounded-xl overflow-hidden">
              <OptimizedImage
                src={toCloudinaryAutoUrl(resource.thumbnailUrl)}
                alt={resource.title}
                width={600}
                height={192}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <h1 className="text-2xl font-bold text-slate-900 mb-3">{resource.title}</h1>

          {/* Author */}
          {resource.author && (
            <div className="flex items-center gap-2 mb-4 text-sm text-slate-500">
              <span>By {resource.author.name}</span>
              {resource.author.organization && (
                <>
                  <span>·</span>
                  <span>{resource.author.organization}</span>
                </>
              )}
            </div>
          )}

          {/* Stats */}
          <div className="flex flex-wrap items-center gap-4 mb-6 text-sm text-slate-500">
            <span className="flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                />
              </svg>
              {resource.viewCount.toLocaleString()} views
            </span>
            {resource.downloadCount > 0 && (
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
                {resource.downloadCount.toLocaleString()} downloads
              </span>
            )}
            {resource.fileSize && <span>{formatFileSize(resource.fileSize)}</span>}
            {resource.duration && <span>{formatDuration(resource.duration)}</span>}
          </div>

          {/* Cultural Context */}
          {resource.culturalContext && (
            <div className="p-4 bg-amber-50 rounded-xl border-l-4 border-amber-500 mb-6">
              <h3 className="font-semibold text-amber-900 mb-1 flex items-center gap-2">
                🤝 Cultural Context
              </h3>
              <p className="text-sm text-amber-800">{resource.culturalContext}</p>
            </div>
          )}

          {/* Description */}
          <div className="prose prose-slate max-w-none mb-6">
            {resource.description.split('\n').map((p, i) => (
              <p key={i} className="text-slate-600">
                {p}
              </p>
            ))}
          </div>

          {/* Tags */}
          {resource.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              {resource.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-sm font-medium"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Rating */}
          <div className="p-5 bg-slate-50 rounded-xl">
            <h3 className="font-semibold text-slate-900 mb-3">Rate this resource</h3>
            <StarRating
              rating={resource.rating}
              count={resource.ratingCount}
              interactive
              onRate={onRate}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-4">
          <div className="text-sm text-slate-500">
            Last updated: {new Date(resource.updatedAt).toLocaleDateString('en-AU')}
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={onBookmark}>
              <svg
                className={`w-4 h-4 mr-2 ${resource.isBookmarked ? 'fill-current text-amber-500' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                />
              </svg>
              {resource.isBookmarked ? 'Saved' : 'Save'}
            </Button>
            {resource.downloadUrl && (
              <Button
                onClick={onDownload}
                style={{
                  background: `linear-gradient(135deg, ${accentPink} 0%, ${accentPurple} 100%)`,
                }}
              >
                <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
                Download
              </Button>
            )}
            {resource.url && resource.type !== 'video' && (
              <Button onClick={() => window.open(resource.url, '_blank')}>View Resource</Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Main Component
export function ResourceLibrary() {
  // eslint-disable-next-line no-unused-vars
  const { user } = useAuth();

  const [resources, setResources] = useState<Resource[]>(demoResources);
  const [bookmarkedResources, setBookmarkedResources] = useState<Resource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
  const [view, setView] = useState<'browse' | 'saved'>('browse');
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<{ category?: string; type?: string }>({});

  const loadResources = useCallback(async () => {
    setIsLoading(true);

    const timeoutId = setTimeout(() => {
      setIsLoading(false);
    }, 12000);

    try {
      const [resourcesRes, bookmarkedRes] = await Promise.all([
        resourcesApi.getResources({
          ...filters,
          search: searchQuery || undefined,
        }),
        resourcesApi.getBookmarked(),
      ]);

      if (resourcesRes.resources?.length > 0) {
        setResources(resourcesRes.resources);
      }
      setBookmarkedResources(bookmarkedRes.resources || []);
    } catch (error) {
      console.error('Failed to load resources:', error);
    } finally {
      clearTimeout(timeoutId);
      setIsLoading(false);
    }
  }, [filters, searchQuery]);

  useEffect(() => {
    loadResources();
  }, [loadResources]);

  const handleBookmark = async (resource: Resource) => {
    try {
      if (resource.isBookmarked) {
        await resourcesApi.unbookmarkResource(resource.id);
      } else {
        await resourcesApi.bookmarkResource(resource.id);
      }
      setResources((prev) =>
        prev.map((r) => (r.id === resource.id ? { ...r, isBookmarked: !r.isBookmarked } : r)),
      );
      if (selectedResource?.id === resource.id) {
        setSelectedResource((prev) =>
          prev ? { ...prev, isBookmarked: !prev.isBookmarked } : null,
        );
      }
      await loadResources();
    } catch (error) {
      console.error('Failed to toggle bookmark:', error);
    }
  };

  const handleDownload = async (resource: Resource) => {
    if (resource.downloadUrl) {
      await resourcesApi.trackDownload(resource.id);
      window.open(resource.downloadUrl, '_blank');
    }
  };

  const handleRate = async (resource: Resource, rating: number) => {
    try {
      await resourcesApi.rateResource(resource.id, rating);
      setResources((prev) => prev.map((r) => (r.id === resource.id ? { ...r, rating } : r)));
    } catch (error) {
      console.error('Failed to rate resource:', error);
    }
  };

  const displayedResources = view === 'saved' ? bookmarkedResources : resources;
  const featuredResources = resources.filter((r) => r.isFeatured);

  if (isLoading) {
    return (
      <div className="ngurra-page flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-600 font-medium">Loading resources...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="ngurra-page">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="absolute top-0 left-1/4 w-96 h-96 rounded-full opacity-30"
            style={{
              background: `radial-gradient(circle, ${accentPink}30, transparent 70%)`,
              filter: 'blur(60px)',
            }}
          />
          <div
            className="absolute bottom-0 right-1/4 w-80 h-80 rounded-full opacity-20"
            style={{
              background: `radial-gradient(circle, ${accentPurple}30, transparent 70%)`,
              filter: 'blur(60px)',
            }}
          />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-12">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-sm mb-8">
            <Link href="/" className="text-slate-500 hover:text-pink-600 transition-colors">
              Home
            </Link>
            <svg
              className="w-4 h-4 text-slate-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <span className="text-pink-600 font-medium">Resources</span>
          </nav>

          {/* Header */}
          <div className="max-w-3xl mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-2xl bg-gradient-to-br from-pink-500 to-purple-600 shadow-lg shadow-pink-500/25">
                <svg
                  className="w-7 h-7 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                  />
                </svg>
              </div>
              <span className="px-4 py-1.5 rounded-full text-sm font-semibold bg-gradient-to-r from-pink-500/10 to-purple-500/10 text-pink-600 border border-pink-200">
                {resources.length} Resources
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4 tracking-tight">
              Resource Library
            </h1>
            <p className="text-lg text-slate-600 leading-relaxed">
              Career guides, templates, tutorials, and cultural resources to support your journey.
              Find what you need to succeed.
            </p>
          </div>

          {/* Search */}
          <div className="bg-white rounded-2xl p-6 shadow-xl shadow-slate-200/50 border border-slate-100">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="relative flex-1">
                <svg
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search resources..."
                  className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-slate-50 border-2 border-slate-200 focus:border-pink-400 focus:ring-4 focus:ring-pink-100 focus:bg-white text-slate-900 placeholder:text-slate-400 transition-all"
                />
              </div>

              {/* Filters */}
              <div className="flex gap-3">
                <select
                  value={filters.category || ''}
                  onChange={(e) =>
                    setFilters((prev) => ({ ...prev, category: e.target.value || undefined }))
                  }
                  className="px-4 py-3 rounded-xl bg-slate-50 border-2 border-slate-200 focus:border-pink-400 focus:ring-4 focus:ring-pink-100 text-slate-900 font-medium cursor-pointer transition-all min-w-[160px]"
                >
                  <option value="">All Categories</option>
                  {Object.entries(categoryConfig).map(([key, config]) => (
                    <option key={key} value={key}>
                      {config.icon} {config.label}
                    </option>
                  ))}
                </select>

                <select
                  value={filters.type || ''}
                  onChange={(e) =>
                    setFilters((prev) => ({ ...prev, type: e.target.value || undefined }))
                  }
                  className="px-4 py-3 rounded-xl bg-slate-50 border-2 border-slate-200 focus:border-pink-400 focus:ring-4 focus:ring-pink-100 text-slate-900 font-medium cursor-pointer transition-all min-w-[140px]"
                >
                  <option value="">All Types</option>
                  {Object.entries(typeConfig).map(([key, config]) => (
                    <option key={key} value={key}>
                      {config.icon} {config.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        {/* Tabs */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => setView('browse')}
            className={`px-5 py-2.5 rounded-xl font-semibold transition-all ${
              view === 'browse' ? 'bg-pink-100 text-pink-600' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Browse All
          </button>
          <button
            onClick={() => setView('saved')}
            className={`px-5 py-2.5 rounded-xl font-semibold transition-all ${
              view === 'saved' ? 'bg-pink-100 text-pink-600' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Saved ({bookmarkedResources.length})
          </button>
        </div>

        {/* Featured Resources */}
        {view === 'browse' &&
          !filters.category &&
          !filters.type &&
          !searchQuery &&
          featuredResources.length > 0 && (
            <section className="mb-12">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500">
                  <svg
                    className="w-5 h-5 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
                    />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-slate-900">Featured Resources</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {featuredResources.slice(0, 3).map((resource) => (
                  <ResourceCard
                    key={resource.id}
                    resource={resource}
                    onView={() => setSelectedResource(resource)}
                    onBookmark={() => handleBookmark(resource)}
                    onDownload={() => handleDownload(resource)}
                  />
                ))}
              </div>
            </section>
          )}

        {/* Category Quick Links */}
        {view === 'browse' && !filters.category && !searchQuery && (
          <section className="mb-12">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600">
                <svg
                  className="w-5 h-5 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-slate-900">Browse by Category</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(categoryConfig).map(([key, config]) => (
                <button
                  key={key}
                  onClick={() => setFilters((prev) => ({ ...prev, category: key }))}
                  className="p-5 bg-white rounded-2xl border border-slate-100 shadow-lg hover:shadow-xl hover:border-pink-200 transition-all text-left group"
                >
                  <span className="text-4xl mb-3 block">{config.icon}</span>
                  <h3 className="font-bold text-slate-900 group-hover:text-pink-600 transition-colors mb-1">
                    {config.label}
                  </h3>
                  <p className="text-xs text-slate-500 line-clamp-2">{config.description}</p>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Resources Grid */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600">
              <svg
                className="w-5 h-5 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-slate-900">
              {view === 'saved'
                ? 'Saved Resources'
                : filters.category
                  ? categoryConfig[filters.category]?.label
                  : 'All Resources'}
            </h2>
          </div>

          {displayedResources.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {displayedResources.map((resource) => (
                <ResourceCard
                  key={resource.id}
                  resource={resource}
                  onView={() => setSelectedResource(resource)}
                  onBookmark={() => handleBookmark(resource)}
                  onDownload={() => handleDownload(resource)}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-20 bg-white rounded-2xl border border-slate-200 shadow-lg">
              <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-slate-100 flex items-center justify-center">
                <span className="text-4xl">📚</span>
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">
                {view === 'saved' ? 'No saved resources' : 'No resources found'}
              </h3>
              <p className="text-slate-500 mb-6">
                {view === 'saved'
                  ? 'Save resources to access them later'
                  : 'Try adjusting your search or filters'}
              </p>
              {view !== 'saved' && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setFilters({});
                  }}
                  className="px-6 py-2.5 rounded-xl font-medium text-pink-600 bg-pink-50 hover:bg-pink-100 transition-colors"
                >
                  Clear all filters
                </button>
              )}
            </div>
          )}
        </section>
      </div>

      {/* Resource Detail Modal */}
      {selectedResource && (
        <ResourceDetailModal
          resource={selectedResource}
          onClose={() => setSelectedResource(null)}
          onBookmark={() => handleBookmark(selectedResource)}
          onDownload={() => handleDownload(selectedResource)}
          onRate={(rating) => handleRate(selectedResource, rating)}
        />
      )}
    </div>
  );
}

export default ResourceLibrary;
