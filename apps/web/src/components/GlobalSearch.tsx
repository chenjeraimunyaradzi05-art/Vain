'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import DOMPurify from 'isomorphic-dompurify';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { Button } from './Button';
import { toCloudinaryAutoUrl } from '@/lib/cloudinary';
import OptimizedImage from '@/components/ui/OptimizedImage';

/**
 * GlobalSearch - Advanced search with faceted filters
 * 
 * Features:
 * - Global search across jobs, courses, mentors, posts, stories
 * - Faceted filters (type, category, location, etc.)
 * - Search suggestions and autocomplete
 * - Saved searches
 * - Recent searches
 * - Keyboard navigation
 */

type SearchResultType = 'job' | 'course' | 'mentor' | 'post' | 'story' | 'resource';

interface SearchResult {
  id: string;
  type: SearchResultType;
  title: string;
  description?: string;
  imageUrl?: string;
  url: string;
  metadata: Record<string, string>;
  score?: number;
  highlights?: { field: string; snippet: string }[];
}

interface SearchFacet {
  key: string;
  label: string;
  options: { value: string; label: string; count: number }[];
}

interface SearchSuggestion {
  text: string;
  type: 'query' | 'category' | 'recent' | 'trending';
}

interface SavedSearch {
  id: string;
  query: string;
  filters: Record<string, string[]>;
  createdAt: string;
  alertEnabled: boolean;
}

interface SearchResponse {
  results: SearchResult[];
  facets: SearchFacet[];
  total: number;
  page: number;
  pageSize: number;
  suggestions?: SearchSuggestion[];
}

// API functions
const searchApi = {
  async search(params: {
    query: string;
    type?: SearchResultType;
    filters?: Record<string, string[]>;
    page?: number;
    pageSize?: number;
  }): Promise<SearchResponse> {
    const searchParams = new URLSearchParams();
    searchParams.set('q', params.query);
    if (params.type) searchParams.set('type', params.type);
    if (params.page) searchParams.set('page', params.page.toString());
    if (params.pageSize) searchParams.set('pageSize', params.pageSize.toString());
    if (params.filters) {
      Object.entries(params.filters).forEach(([key, values]) => {
        values.forEach(v => searchParams.append(`filter[${key}]`, v));
      });
    }
    const res = await fetch(`/api/search?${searchParams}`, { credentials: 'include' });
    if (!res.ok) throw new Error('Search failed');
    return res.json();
  },

  async getSuggestions(query: string): Promise<{ suggestions: SearchSuggestion[] }> {
    const res = await fetch(`/api/search/suggestions?q=${encodeURIComponent(query)}`, { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to get suggestions');
    return res.json();
  },

  async getRecentSearches(): Promise<{ searches: string[] }> {
    const res = await fetch('/api/search/recent', { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to get recent searches');
    return res.json();
  },

  async saveSearch(data: { query: string; filters: Record<string, string[]>; alertEnabled?: boolean }): Promise<SavedSearch> {
    const res = await fetch('/api/search/saved', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to save search');
    return res.json();
  },

  async getSavedSearches(): Promise<{ searches: SavedSearch[] }> {
    const res = await fetch('/api/search/saved', { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to get saved searches');
    return res.json();
  },

  async deleteSavedSearch(id: string): Promise<void> {
    const res = await fetch(`/api/search/saved/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Failed to delete saved search');
  },

  async getTrendingSearches(): Promise<{ searches: string[] }> {
    const res = await fetch('/api/search/trending', { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to get trending');
    return res.json();
  },
};

// Result type config
const resultTypeConfig: Record<SearchResultType, {
  label: string;
  icon: React.ReactNode;
  color: string;
}> = {
  job: {
    label: 'Job',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
    color: 'blue',
  },
  course: {
    label: 'Course',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    ),
    color: 'green',
  },
  mentor: {
    label: 'Mentor',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
    color: 'purple',
  },
  post: {
    label: 'Post',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
      </svg>
    ),
    color: 'amber',
  },
  story: {
    label: 'Story',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
      </svg>
    ),
    color: 'pink',
  },
  resource: {
    label: 'Resource',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    color: 'teal',
  },
};

// Search Result Card
function SearchResultCard({ result, onClick }: { result: SearchResult; onClick: () => void }) {
  const config = resultTypeConfig[result.type];
  
  return (
    <div
      onClick={onClick}
      className="p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl
        hover:shadow-md hover:border-blue-300 dark:hover:border-blue-600 cursor-pointer transition-all"
    >
      <div className="flex gap-4">
        {/* Image */}
        {result.imageUrl && (
          <div className="w-16 h-16 rounded-lg bg-gray-100 dark:bg-gray-700 overflow-hidden flex-shrink-0">
            <OptimizedImage src={toCloudinaryAutoUrl(result.imageUrl)} alt={result.title || ''} width={64} height={64} className="w-full h-full object-cover" />
          </div>
        )}
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Type badge */}
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full
            bg-${config.color}-100 text-${config.color}-700 dark:bg-${config.color}-900/30 dark:text-${config.color}-400`}>
            {config.icon}
            {config.label}
          </span>
          
          {/* Title */}
          <h3 className="mt-1 font-semibold text-gray-900 dark:text-white truncate">
            {result.title}
          </h3>
          
          {/* Description */}
          {result.description && (
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
              {result.description}
            </p>
          )}
          
          {/* Highlights */}
          {result.highlights && result.highlights.length > 0 && (
            <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              <span className="font-medium">Matches:</span>
              {' '}
              <span 
                dangerouslySetInnerHTML={{ 
                  __html: DOMPurify.sanitize(
                    result.highlights[0].snippet.replace(
                      /<em>/g, '<mark class="bg-yellow-200 dark:bg-yellow-800 rounded">'
                    ).replace(/<\/em>/g, '</mark>'),
                    { ALLOWED_TAGS: ['mark'], ALLOWED_ATTR: ['class'] }
                  )
                }} 
              />
            </div>
          )}
          
          {/* Metadata */}
          {Object.keys(result.metadata).length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {Object.entries(result.metadata).slice(0, 3).map(([key, value]) => (
                <span 
                  key={key}
                  className="text-xs text-gray-400 dark:text-gray-500"
                >
                  {value}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Facet Filter Component
function FacetFilter({ 
  facet, 
  selected, 
  onChange 
}: { 
  facet: SearchFacet;
  selected: string[];
  onChange: (values: string[]) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const maxVisible = 5;
  
  const visibleOptions = showAll ? facet.options : facet.options.slice(0, maxVisible);
  const hasMore = facet.options.length > maxVisible;

  const toggleValue = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter(v => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  return (
    <div className="border-b border-gray-200 dark:border-gray-700 pb-4 mb-4 last:border-0 last:pb-0 last:mb-0">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between text-left"
      >
        <span className="font-medium text-gray-900 dark:text-white">{facet.label}</span>
        <svg 
          className={`w-4 h-4 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      
      {expanded && (
        <div className="mt-3 space-y-2">
          {visibleOptions.map((option) => (
            <label 
              key={option.value}
              className="flex items-center gap-2 cursor-pointer group"
            >
              <input
                type="checkbox"
                checked={selected.includes(option.value)}
                onChange={() => toggleValue(option.value)}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="flex-1 text-sm text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white">
                {option.label}
              </span>
              <span className="text-xs text-gray-400">{option.count}</span>
            </label>
          ))}
          
          {hasMore && (
            <button
              onClick={() => setShowAll(!showAll)}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              {showAll ? 'Show less' : `Show ${facet.options.length - maxVisible} more`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// Suggestion Dropdown
function SuggestionDropdown({ 
  suggestions, 
  onSelect,
  onClose,
  highlightIndex,
}: { 
  suggestions: SearchSuggestion[];
  onSelect: (suggestion: SearchSuggestion) => void;
  onClose: () => void;
  highlightIndex: number;
}) {
  const suggestionTypeIcons: Record<string, React.ReactNode> = {
    query: (
      <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    ),
    recent: (
      <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    trending: (
      <svg className="w-4 h-4 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
      </svg>
    ),
    category: (
      <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
      </svg>
    ),
  };

  return (
    <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 
      dark:border-gray-700 shadow-xl overflow-hidden z-50">
      {suggestions.map((suggestion, index) => (
        <button
          key={`${suggestion.type}-${suggestion.text}`}
          onClick={() => onSelect(suggestion)}
          className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-750
            ${index === highlightIndex ? 'bg-gray-50 dark:bg-gray-750' : ''}`}
        >
          {suggestionTypeIcons[suggestion.type]}
          <span className="text-gray-900 dark:text-white">{suggestion.text}</span>
          {suggestion.type === 'trending' && (
            <span className="ml-auto text-xs text-orange-500 font-medium">Trending</span>
          )}
        </button>
      ))}
    </div>
  );
}

// Main Global Search Component
export function GlobalSearch({ embedded = false }: { embedded?: boolean }) {
  const { user } = useAuth();
  const router = useRouter();
  const searchInputRef = useRef<HTMLInputElement>(null);

  // State
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedType, setSelectedType] = useState<SearchResultType | undefined>();
  const [filters, setFilters] = useState<Record<string, string[]>>({});
  const [results, setResults] = useState<SearchResult[]>([]);
  const [facets, setFacets] = useState<SearchFacet[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  
  // Suggestions
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  
  // Saved searches
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [showSavedSearches, setShowSavedSearches] = useState(false);

  // Debounce query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Fetch suggestions
  useEffect(() => {
    if (debouncedQuery.length >= 2) {
      searchApi.getSuggestions(debouncedQuery)
        .then(data => setSuggestions(data.suggestions))
        .catch(() => setSuggestions([]));
    } else {
      setSuggestions([]);
    }
  }, [debouncedQuery]);

  // Load saved and recent searches
  useEffect(() => {
    if (user) {
      searchApi.getSavedSearches()
        .then(data => setSavedSearches(data.searches))
        .catch(() => {});
      searchApi.getRecentSearches()
        .then(data => setRecentSearches(data.searches))
        .catch(() => {});
    }
  }, [user]);

  // Execute search
  const executeSearch = useCallback(async (resetPage = true) => {
    if (!query.trim()) return;
    
    setIsLoading(true);
    setHasSearched(true);
    setShowSuggestions(false);
    
    try {
      const data = await searchApi.search({
        query: query.trim(),
        type: selectedType,
        filters,
        page: resetPage ? 1 : page,
        pageSize,
      });
      
      setResults(data.results);
      setFacets(data.facets);
      setTotal(data.total);
      if (resetPage) setPage(1);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsLoading(false);
    }
  }, [query, selectedType, filters, page, pageSize]);

  // Handle search on enter or button click
  const handleSearch = () => {
    executeSearch(true);
  };

  // Handle suggestion select
  const handleSuggestionSelect = (suggestion: SearchSuggestion) => {
    setQuery(suggestion.text);
    setShowSuggestions(false);
    // Immediate search after selecting suggestion
    setTimeout(() => executeSearch(true), 100);
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (highlightIndex >= 0 && suggestions[highlightIndex]) {
        handleSuggestionSelect(suggestions[highlightIndex]);
      } else {
        handleSearch();
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIndex(prev => Math.min(prev + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIndex(prev => Math.max(prev - 1, -1));
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  // Filter change handler
  const handleFilterChange = (facetKey: string, values: string[]) => {
    setFilters(prev => ({
      ...prev,
      [facetKey]: values,
    }));
  };

  // Clear all filters
  const clearFilters = () => {
    setFilters({});
    setSelectedType(undefined);
  };

  // Save current search
  const handleSaveSearch = async () => {
    if (!query.trim()) return;
    try {
      const saved = await searchApi.saveSearch({ query, filters });
      setSavedSearches(prev => [saved, ...prev]);
    } catch (error) {
      console.error('Failed to save search:', error);
    }
  };

  // Load saved search
  const loadSavedSearch = (saved: SavedSearch) => {
    setQuery(saved.query);
    setFilters(saved.filters);
    setShowSavedSearches(false);
    setTimeout(() => executeSearch(true), 100);
  };

  // Navigate to result
  const handleResultClick = (result: SearchResult) => {
    router.push(result.url);
  };

  // Active filter count
  const activeFilterCount = useMemo(() => {
    return Object.values(filters).reduce((acc, v) => acc + v.length, 0) + (selectedType ? 1 : 0);
  }, [filters, selectedType]);

  // Total pages
  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className={embedded ? '' : 'max-w-6xl mx-auto px-4 py-8'}>
      {/* Header */}
      {!embedded && (
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Search</h1>
          <p className="mt-2 text-gray-500 dark:text-gray-400">
            Find jobs, courses, mentors, and more
          </p>
        </div>
      )}

      {/* Search Bar */}
      <div className="relative mb-6">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <input
              ref={searchInputRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setShowSuggestions(true);
                setHighlightIndex(-1);
              }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              onKeyDown={handleKeyDown}
              placeholder="Search for jobs, courses, mentors..."
              className="w-full px-4 py-3 pl-12 border border-gray-200 dark:border-gray-700 rounded-xl
                bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <svg 
              className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            
            {/* Suggestions dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <SuggestionDropdown
                suggestions={suggestions}
                onSelect={handleSuggestionSelect}
                onClose={() => setShowSuggestions(false)}
                highlightIndex={highlightIndex}
              />
            )}
          </div>
          
          <Button onClick={handleSearch} disabled={isLoading || !query.trim()}>
            {isLoading ? 'Searching...' : 'Search'}
          </Button>
          
          {user && (
            <Button variant="outline" onClick={() => setShowSavedSearches(true)}>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
            </Button>
          )}
        </div>

        {/* Type filter tabs */}
        <div className="flex flex-wrap gap-2 mt-4">
          <button
            onClick={() => setSelectedType(undefined)}
            className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
              !selectedType
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
            }`}
          >
            All
          </button>
          {Object.entries(resultTypeConfig).map(([type, config]) => (
            <button
              key={type}
              onClick={() => setSelectedType(type as SearchResultType)}
              className={`px-3 py-1.5 text-sm rounded-full flex items-center gap-1.5 transition-colors ${
                selectedType === type
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
              }`}
            >
              {config.icon}
              {config.label}s
            </button>
          ))}
        </div>
      </div>

      {/* Main content area */}
      {hasSearched ? (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Filters sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 sticky top-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900 dark:text-white">Filters</h3>
                {activeFilterCount > 0 && (
                  <button
                    onClick={clearFilters}
                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Clear all ({activeFilterCount})
                  </button>
                )}
              </div>
              
              {facets.map((facet) => (
                <FacetFilter
                  key={facet.key}
                  facet={facet}
                  selected={filters[facet.key] || []}
                  onChange={(values) => handleFilterChange(facet.key, values)}
                />
              ))}
              
              {facets.length === 0 && (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No filters available
                </p>
              )}
            </div>
          </div>
          
          {/* Results */}
          <div className="lg:col-span-3">
            {/* Results header */}
            <div className="flex items-center justify-between mb-4">
              <p className="text-gray-600 dark:text-gray-400">
                {total} result{total !== 1 ? 's' : ''} for "{query}"
              </p>
              {user && query && (
                <button
                  onClick={handleSaveSearch}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                  </svg>
                  Save search
                </button>
              )}
            </div>
            
            {/* Results list */}
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="animate-pulse bg-gray-100 dark:bg-gray-700 rounded-xl h-32" />
                ))}
              </div>
            ) : results.length > 0 ? (
              <>
                <div className="space-y-4">
                  {results.map((result) => (
                    <SearchResultCard
                      key={`${result.type}-${result.id}`}
                      result={result}
                      onClick={() => handleResultClick(result)}
                    />
                  ))}
                </div>
                
                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-8">
                    <button
                      onClick={() => { setPage(p => p - 1); executeSearch(false); }}
                      disabled={page === 1}
                      className="px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <span className="text-gray-600 dark:text-gray-400">
                      Page {page} of {totalPages}
                    </span>
                    <button
                      onClick={() => { setPage(p => p + 1); executeSearch(false); }}
                      disabled={page === totalPages}
                      className="px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-16">
                <div className="text-6xl mb-4">🔍</div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  No results found
                </h3>
                <p className="mt-2 text-gray-500 dark:text-gray-400">
                  Try adjusting your search or filters
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        // Pre-search state
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Recent searches */}
          {recentSearches.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Recent Searches</h3>
              <div className="space-y-2">
                {recentSearches.map((search, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setQuery(search);
                      setTimeout(() => executeSearch(true), 100);
                    }}
                    className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-750 text-left"
                  >
                    <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-gray-700 dark:text-gray-300">{search}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {/* Popular categories */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Popular Categories</h3>
            <div className="flex flex-wrap gap-2">
              {['Engineering', 'Healthcare', 'Education', 'Arts & Culture', 'Business', 'Technology'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => {
                    setQuery(cat);
                    setTimeout(() => executeSearch(true), 100);
                  }}
                  className="px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300
                    hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400"
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Saved Searches Modal */}
      {showSavedSearches && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-lg w-full mx-4 max-h-[80vh] overflow-hidden">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 dark:text-white">Saved Searches</h3>
              <button 
                onClick={() => setShowSavedSearches(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-96">
              {savedSearches.length > 0 ? (
                <div className="space-y-2">
                  {savedSearches.map((saved) => (
                    <div 
                      key={saved.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-750"
                    >
                      <button 
                        onClick={() => loadSavedSearch(saved)}
                        className="flex-1 text-left"
                      >
                        <p className="font-medium text-gray-900 dark:text-white">{saved.query}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(saved.createdAt).toLocaleDateString()}
                        </p>
                      </button>
                      <button
                        onClick={async () => {
                          await searchApi.deleteSavedSearch(saved.id);
                          setSavedSearches(prev => prev.filter(s => s.id !== saved.id));
                        }}
                        className="p-1 text-gray-400 hover:text-red-500"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-500 py-8">
                  No saved searches yet
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Compact search bar for header
export function SearchBar() {
  const router = useRouter();
  const [query, setQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query)}`);
    }
  };

  return (
    <form onSubmit={handleSearch} className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search..."
        className="w-64 px-4 py-2 pl-10 text-sm border border-gray-200 dark:border-gray-700 rounded-full
          bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white
          focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white dark:focus:bg-gray-700"
      />
      <svg 
        className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
        fill="none" 
        viewBox="0 0 24 24" 
        stroke="currentColor"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    </form>
  );
}

export default GlobalSearch;
