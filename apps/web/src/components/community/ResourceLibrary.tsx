'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '../Button';
import api from '@/lib/apiClient';
import { toCloudinaryAutoUrl } from '@/lib/cloudinary';
import OptimizedImage from '@/components/ui/OptimizedImage';

/**
 * ResourceLibrary - Educational resources and learning materials
 * 
 * Features:
 * - Resource categories
 * - Search and filtering
 * - Bookmarks and downloads
 * - Indigenous-specific resources
 */

interface Resource {
  id: string;
  title: string;
  description: string;
  type: 'article' | 'video' | 'pdf' | 'course' | 'template' | 'toolkit' | 'webinar' | 'ebook';
  category: string;
  author: {
    id: string;
    name: string;
    avatar?: string;
  };
  thumbnail?: string;
  url: string;
  downloadUrl?: string;
  duration?: string;
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

type ResourceQueryParams = Record<string, string>;

interface ResourceCategory {
  id: string;
  name: string;
  icon: string;
  count: number;
}

interface ResourceFilters {
  query: string;
  category: string;
  types: string[];
  indigenousOnly: boolean;
  freeOnly: boolean;
  bookmarkedOnly: boolean;
  sort: string;
}

// API functions
const resourcesApi = {
  async getResources(params: ResourceQueryParams): Promise<{ resources: Resource[]; total: number }> {
    const query = new URLSearchParams(params);
    const response = await api(`/resources?${query.toString()}`);
    if (!response.ok) return { resources: [], total: 0 };
    return response.data;
  },

  async getResource(id: string): Promise<Resource> {
    const response = await api(`/resources/${id}`);
    if (!response.ok) throw new Error(response.error || 'Failed to get resource');
    return response.data;
  },

  async getCategories(): Promise<ResourceCategory[]> {
    const response = await api('/resources/categories');
    return response.ok ? (response.data || []) : [];
  },

  async bookmark(resourceId: string): Promise<void> {
    await api(`/resources/${resourceId}/bookmark`, { method: 'POST' });
  },

  async unbookmark(resourceId: string): Promise<void> {
    await api(`/resources/${resourceId}/bookmark`, { method: 'DELETE' });
  },

  async rateResource(resourceId: string, rating: number): Promise<void> {
    await api(`/resources/${resourceId}/rate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rating }),
    });
  },

  async trackDownload(resourceId: string): Promise<void> {
    await api(`/resources/${resourceId}/download`, { method: 'POST' });
  },

  async getBookmarked(): Promise<Resource[]> {
    const response = await api('/resources/bookmarked');
    return response.ok ? (response.data || []) : [];
  },
};

const RESOURCE_TYPES: { type: Resource['type']; label: string; icon: string }[] = [
  { type: 'article', label: 'Article', icon: '📄' },
  { type: 'video', label: 'Video', icon: '🎬' },
  { type: 'pdf', label: 'PDF', icon: '📑' },
  { type: 'course', label: 'Course', icon: '📚' },
  { type: 'template', label: 'Template', icon: '📋' },
  { type: 'toolkit', label: 'Toolkit', icon: '🧰' },
  { type: 'webinar', label: 'Webinar', icon: '🎥' },
  { type: 'ebook', label: 'E-Book', icon: '📖' },
];

// Star Rating Component
function StarRating({
  rating,
  onRate,
  readonly = false,
}: {
  rating: number;
  onRate?: (rating: number) => void;
  readonly?: boolean;
}) {
  const [hovered, setHovered] = useState(0);

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          disabled={readonly}
          onMouseEnter={() => !readonly && setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          onClick={() => onRate?.(star)}
          className={`text-lg ${readonly ? '' : 'cursor-pointer hover:scale-110 transition-transform'}`}
        >
          {(hovered || rating) >= star ? '⭐' : '☆'}
        </button>
      ))}
    </div>
  );
}

// Resource Card
function ResourceCard({
  resource,
  onBookmark,
  onClick,
}: {
  resource: Resource;
  onBookmark: () => void;
  onClick: () => void;
}) {
  const typeInfo = RESOURCE_TYPES.find(t => t.type === resource.type);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-lg transition-all group">
      {/* Thumbnail */}
      <div className="relative h-40 bg-gradient-to-br from-blue-500 to-purple-500">
        {resource.thumbnail && (
          <OptimizedImage
            src={toCloudinaryAutoUrl(resource.thumbnail)}
            alt={`${resource.title} thumbnail`}
            width={1200}
            height={160}
            className="w-full h-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <button
            onClick={onClick}
            className="px-4 py-2 bg-white rounded-lg font-medium text-gray-900 hover:bg-gray-100"
          >
            View Resource
          </button>
        </div>
        <div className="absolute top-3 left-3 flex gap-2">
          <span className="px-2 py-1 bg-white/90 rounded text-xs font-medium flex items-center gap-1">
            {typeInfo?.icon} {typeInfo?.label}
          </span>
          {resource.isIndigenous && (
            <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded text-xs font-medium">
              🌏 Indigenous
            </span>
          )}
        </div>
        {resource.isPremium && (
          <span className="absolute top-3 right-3 px-2 py-1 bg-yellow-400 text-yellow-900 rounded text-xs font-medium">
            ⭐ Premium
          </span>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); onBookmark(); }}
          className={`absolute bottom-3 right-3 w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
            resource.isBookmarked
              ? 'bg-blue-500 text-white'
              : 'bg-white/90 text-gray-600 hover:bg-white'
          }`}
        >
          {resource.isBookmarked ? '🔖' : '📑'}
        </button>
      </div>

      {/* Content */}
      <div className="p-5">
        <h3
          onClick={onClick}
          className="font-semibold text-gray-900 dark:text-white mb-2 cursor-pointer hover:text-blue-600 line-clamp-2"
        >
          {resource.title}
        </h3>
        <p className="text-sm text-gray-500 mb-3 line-clamp-2">{resource.description}</p>

        {/* Meta */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden">
              {resource.author.avatar ? (
                <OptimizedImage
                  src={toCloudinaryAutoUrl(resource.author.avatar)}
                  alt={`${resource.author.name} avatar`}
                  width={24}
                  height={24}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-xs">{resource.author.name[0]}</span>
              )}
            </div>
            <span className="text-sm text-gray-500">{resource.author.name}</span>
          </div>
          {resource.duration && (
            <span className="text-sm text-gray-400">{resource.duration}</span>
          )}
          {resource.readTime && (
            <span className="text-sm text-gray-400">{resource.readTime} min read</span>
          )}
        </div>

        {/* Rating & Stats */}
        <div className="flex items-center justify-between text-sm text-gray-400">
          <div className="flex items-center gap-1">
            <span className="text-yellow-500">⭐</span>
            <span>{resource.rating.toFixed(1)}</span>
            <span>({resource.ratingCount})</span>
          </div>
          <div className="flex items-center gap-3">
            <span>👁️ {resource.views}</span>
            {resource.downloadUrl && <span>⬇️ {resource.downloads}</span>}
          </div>
        </div>

        {/* Tags */}
        {resource.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {resource.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded text-xs"
              >
                {tag}
              </span>
            ))}
            {resource.tags.length > 3 && (
              <span className="text-xs text-gray-400">+{resource.tags.length - 3}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Resource Detail Modal
function ResourceDetailModal({
  resource,
  isOpen,
  onClose,
  onBookmark,
  onRate,
  onDownload,
}: {
  resource: Resource | null;
  isOpen: boolean;
  onClose: () => void;
  onBookmark: () => void;
  onRate: (rating: number) => void;
  onDownload: () => void;
}) {
  if (!isOpen || !resource) return null;

  const typeInfo = RESOURCE_TYPES.find(t => t.type === resource.type);
  const publishedDate = new Date(resource.publishedAt);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="relative h-56 bg-gradient-to-br from-blue-500 to-purple-500">
          {resource.thumbnail && (
            <OptimizedImage
              src={toCloudinaryAutoUrl(resource.thumbnail)}
              alt={`${resource.title} thumbnail`}
              width={1200}
              height={224}
              className="w-full h-full object-cover"
            />
          )}
          <div className="absolute inset-0 bg-black/30" />
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 bg-white/20 backdrop-blur rounded-full flex items-center justify-center text-white hover:bg-white/30"
          >
            ✕
          </button>
          <div className="absolute bottom-4 left-4 right-4">
            <div className="flex gap-2 mb-2">
              <span className="px-2 py-1 bg-white/90 rounded text-sm font-medium">
                {typeInfo?.icon} {typeInfo?.label}
              </span>
              {resource.isIndigenous && (
                <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded text-sm">
                  🌏 Indigenous Resource
                </span>
              )}
              {resource.isPremium && (
                <span className="px-2 py-1 bg-yellow-400 text-yellow-900 rounded text-sm">
                  ⭐ Premium
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
            {resource.title}
          </h2>

          {/* Author & Date */}
          <div className="flex items-center gap-4 mb-4">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden">
                {resource.author.avatar ? (
                  <OptimizedImage
                    src={toCloudinaryAutoUrl(resource.author.avatar)}
                    alt={`${resource.author.name} avatar`}
                    width={40}
                    height={40}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span>{resource.author.name[0]}</span>
                )}
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">{resource.author.name}</p>
                <p className="text-sm text-gray-500">
                  {publishedDate.toLocaleDateString('en-AU', { month: 'long', day: 'numeric', year: 'numeric' })}
                </p>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="prose dark:prose-invert max-w-none mb-6">
            <p className="text-gray-600 dark:text-gray-400">{resource.description}</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4 mb-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{resource.views}</p>
              <p className="text-sm text-gray-500">Views</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{resource.downloads}</p>
              <p className="text-sm text-gray-500">Downloads</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{resource.rating.toFixed(1)}</p>
              <p className="text-sm text-gray-500">Rating</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{resource.ratingCount}</p>
              <p className="text-sm text-gray-500">Reviews</p>
            </div>
          </div>

          {/* Rate */}
          <div className="mb-6">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Rate this resource</p>
            <StarRating rating={0} onRate={onRate} />
          </div>

          {/* Tags */}
          {resource.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              {resource.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full text-sm"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button className="flex-1" onClick={() => window.open(resource.url, '_blank')}>
              📖 View Resource
            </Button>
            {resource.downloadUrl && (
              <Button variant="outline" onClick={onDownload}>
                ⬇️ Download
              </Button>
            )}
            <Button
              variant={resource.isBookmarked ? 'primary' : 'outline'}
              onClick={onBookmark}
            >
              {resource.isBookmarked ? '🔖 Bookmarked' : '📑 Bookmark'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Filters Sidebar
function FiltersSidebar({
  categories,
  filters,
  onChange,
  onClear,
}: {
  categories: ResourceCategory[];
  filters: ResourceFilters;
  onChange: (filters: ResourceFilters) => void;
  onClear: () => void;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
      <div className="flex items-center justify-between mb-4">
        {/* ... */}
      </div>
      {/* ... */}
    </div>
  );
}

// Main Component
export function ResourceLibrary() {
  const { user } = useAuth();
  const [resources, setResources] = useState<Resource[]>([]);
  const [categories, setCategories] = useState<ResourceCategory[]>([]);
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<ResourceFilters>({
    query: '',
    category: '',
    types: [] as string[],
    indigenousOnly: false,
    freeOnly: false,
    bookmarkedOnly: false,
    sort: 'latest',
  });
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const loadResources = useCallback(async () => {
    setIsLoading(true);
    try {
      const { resources: data, total: totalCount } = await resourcesApi.getResources({
        page: String(page),
        limit: '12',
        query: filters.query,
        category: filters.category,
        types: filters.types.join(','),
        indigenousOnly: String(filters.indigenousOnly),
        freeOnly: String(filters.freeOnly),
        bookmarkedOnly: String(filters.bookmarkedOnly),
        sort: filters.sort,
      });
      setResources(data);
      setTotal(totalCount);
    } catch (error) {
      console.error('Failed to load resources:', error);
    } finally {
      setIsLoading(false);
    }
  }, [filters, page]);

  const loadCategories = useCallback(async () => {
    try {
      const data = await resourcesApi.getCategories();
      setCategories(data);
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    loadResources();
  }, [loadResources]);

  const handleBookmark = async (resourceId: string) => {
    const resource = resources.find(r => r.id === resourceId);
    if (!resource) return;

    try {
      if (resource.isBookmarked) {
        await resourcesApi.unbookmark(resourceId);
      } else {
        await resourcesApi.bookmark(resourceId);
      }
      setResources(resources.map(r =>
        r.id === resourceId ? { ...r, isBookmarked: !r.isBookmarked } : r
      ));
      if (selectedResource?.id === resourceId) {
        setSelectedResource({ ...selectedResource, isBookmarked: !selectedResource.isBookmarked });
      }
    } catch (error) {
      console.error('Failed to toggle bookmark:', error);
    }
  };

  const handleRate = async (resourceId: string, rating: number) => {
    try {
      await resourcesApi.rateResource(resourceId, rating);
      loadResources();
    } catch (error) {
      console.error('Failed to rate:', error);
    }
  };

  const handleDownload = async (resource: Resource) => {
    if (!resource.downloadUrl) return;
    await resourcesApi.trackDownload(resource.id);
    window.open(resource.downloadUrl, '_blank');
  };

  const clearFilters = () => {
    setFilters({
      query: '',
      category: '',
      types: [],
      indigenousOnly: false,
      freeOnly: false,
      bookmarkedOnly: false,
      sort: 'latest',
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Resource Library</h1>
        <p className="text-gray-500 mt-1">Explore educational resources, templates, and learning materials</p>
      </div>

      {/* Search Bar */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 mb-6">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
            <input
              type="text"
              value={filters.query}
              onChange={(e) => setFilters({ ...filters, query: e.target.value })}
              placeholder="Search resources..."
              className="w-full pl-10 pr-4 py-2 border rounded-lg dark:bg-gray-900 dark:border-gray-600"
            />
          </div>
          <select
            value={filters.sort}
            onChange={(e) => setFilters({ ...filters, sort: e.target.value })}
            className="px-4 py-2 border rounded-lg dark:bg-gray-900 dark:border-gray-600"
          >
            <option value="latest">Latest</option>
            <option value="popular">Most Popular</option>
            <option value="rating">Top Rated</option>
            <option value="downloads">Most Downloaded</option>
          </select>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Sidebar */}
        <div className="w-64 flex-shrink-0 hidden lg:block">
          <FiltersSidebar
            categories={categories}
            filters={filters}
            onChange={setFilters}
            onClear={clearFilters}
          />
        </div>

        {/* Main Content */}
        <div className="flex-1">
          {/* Results count */}
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-500">
              Showing {resources.length} of {total} resources
            </p>
          </div>

          {/* Resources Grid */}
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
            </div>
          ) : resources.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
              <div className="text-6xl mb-4">📚</div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                No resources found
              </h3>
              <p className="text-gray-500 mb-4">Try adjusting your filters or search terms</p>
              <Button onClick={clearFilters}>Clear Filters</Button>
            </div>
          ) : (
            <>
              <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
                {resources.map((resource) => (
                  <ResourceCard
                    key={resource.id}
                    resource={resource}
                    onBookmark={() => handleBookmark(resource.id)}
                    onClick={() => setSelectedResource(resource)}
                  />
                ))}
              </div>

              {/* Pagination */}
              {total > 12 && (
                <div className="flex items-center justify-center gap-2 mt-8">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === 1}
                    onClick={() => setPage(page - 1)}
                  >
                    Previous
                  </Button>
                  <span className="px-4 py-2 text-sm text-gray-500">
                    Page {page} of {Math.ceil(total / 12)}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= Math.ceil(total / 12)}
                    onClick={() => setPage(page + 1)}
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Resource Detail Modal */}
      <ResourceDetailModal
        resource={selectedResource}
        isOpen={!!selectedResource}
        onClose={() => setSelectedResource(null)}
        onBookmark={() => selectedResource && handleBookmark(selectedResource.id)}
        onRate={(rating) => selectedResource && handleRate(selectedResource.id, rating)}
        onDownload={() => selectedResource && handleDownload(selectedResource)}
      />
    </div>
  );
}

export default ResourceLibrary;
