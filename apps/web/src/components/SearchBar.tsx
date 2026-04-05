'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Search, X, ArrowRight, Briefcase, Users, GraduationCap, Building2, Clock } from 'lucide-react';
import { useDebounce } from '../hooks/useUtils';

interface SearchResult {
  id: string;
  type: 'job' | 'company' | 'course' | 'mentor' | 'page';
  title: string;
  subtitle?: string;
  href: string;
  icon?: React.ReactNode;
}

interface SearchBarProps {
  placeholder?: string;
  variant?: 'default' | 'hero' | 'cosmic' | 'minimal';
  showSuggestions?: boolean;
  onSearch?: (query: string) => void;
  className?: string;
}

interface GlobalSearchProps extends SearchBarProps {
  isOpen: boolean;
  onClose: () => void;
}

// Suggested searches
const recentSearches = [
  'Indigenous ranger programs NT',
  'BHP traineeships Pilbara',
  'TAFE NSW fee-free courses',
  'CareerTrackers internships 2026',
];

// Popular searches
const popularSearches = [
  { query: 'Indigenous identified positions', count: 1840 },
  { query: 'FIFO entry level mining WA', count: 1265 },
  { query: 'RAP certified employers', count: 978 },
  { query: 'Government graduate programs 2026', count: 743 },
];

// Quick results
const quickResults: SearchResult[] = [
  { id: '1', type: 'job', title: 'Mobile Plant Operator (Entry Pathway)', subtitle: 'BHP • Pilbara, WA (FIFO)', href: '/jobs/mobile-plant-operator-bhp' },
  { id: '2', type: 'job', title: 'Customer Service Consultant', subtitle: 'Telstra • Sydney, NSW (Hybrid)', href: '/jobs/customer-service-consultant-telstra' },
  { id: '3', type: 'company', title: 'Rio Tinto', subtitle: 'Mining & Resources', href: '/employers/rio-tinto' },
  { id: '4', type: 'course', title: 'Certificate IV in Cyber Security', subtitle: 'TAFE Queensland • Online', href: '/courses/cert-iv-cyber-security' },
  { id: '5', type: 'mentor', title: 'Find a Mentor', subtitle: 'Browse mentors by industry', href: '/mentorship' },
];

function getResultIcon(type: SearchResult['type']) {
  switch (type) {
    case 'job':
      return <Briefcase className="w-4 h-4 text-blue-500" />;
    case 'company':
      return <Building2 className="w-4 h-4 text-purple-500" />;
    case 'course':
      return <GraduationCap className="w-4 h-4 text-green-500" />;
    case 'mentor':
      return <Users className="w-4 h-4 text-amber-500" />;
    default:
      return <Search className="w-4 h-4 text-gray-400" />;
  }
}

export function SearchBar({
  placeholder = 'Search jobs, companies, courses...',
  variant = 'default',
  showSuggestions = true,
  onSearch,
  className = '',
}: SearchBarProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const debouncedQuery = useDebounce(query, 300);

  // Simulate search results
  useEffect(() => {
    if (debouncedQuery.length < 2) {
      setResults([]);
      return;
    }

    setLoading(true);
    // Simulate API call
    const timer = setTimeout(() => {
      const filtered = quickResults.filter(r => 
        r.title.toLowerCase().includes(debouncedQuery.toLowerCase()) ||
        r.subtitle?.toLowerCase().includes(debouncedQuery.toLowerCase())
      );
      setResults(filtered);
      setLoading(false);
    }, 200);

    return () => clearTimeout(timer);
  }, [debouncedQuery]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsFocused(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      if (onSearch) {
        onSearch(query);
      } else {
        router.push(`/jobs?q=${encodeURIComponent(query)}`);
      }
      setIsFocused(false);
    }
  };

  const handleQuickSearch = (searchQuery: string) => {
    setQuery(searchQuery);
    if (onSearch) {
      onSearch(searchQuery);
    } else {
      router.push(`/jobs?q=${encodeURIComponent(searchQuery)}`);
    }
    setIsFocused(false);
  };

  const variantClasses = {
    default: {
      container: 'relative',
      input: 'w-full pl-10 pr-10 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
      dropdown: 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-xl',
    },
    hero: {
      container: 'relative',
      input: 'w-full pl-12 pr-12 py-4 rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-lg placeholder-gray-400 focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 shadow-lg',
      dropdown: 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-2xl',
    },
    cosmic: {
      container: 'relative',
      input: 'w-full pl-10 pr-10 py-2.5 rounded-lg border border-[#FFD700]/20 bg-white/5 text-white placeholder-gray-400 focus:ring-2 focus:ring-[#FFD700]/50 focus:border-[#FFD700]/50 backdrop-blur-sm',
      dropdown: 'bg-[#1A0F2E] border border-[#FFD700]/20 shadow-xl',
    },
    minimal: {
      container: 'relative',
      input: 'w-full pl-9 pr-8 py-2 rounded-lg border-0 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500',
      dropdown: 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-xl',
    },
  };

  const styles = variantClasses[variant];

  return (
    <div ref={containerRef} className={`${styles.container} ${className}`}>
      <form onSubmit={handleSubmit}>
        <div className="relative">
          <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 ${variant === 'hero' ? 'left-4' : ''}`} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setIsFocused(true)}
            placeholder={placeholder}
            className={styles.input}
            aria-label="Search"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className={`absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 ${variant === 'hero' ? 'right-4' : ''}`}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </form>

      {/* Dropdown */}
      {isFocused && showSuggestions && (
        <div className={`absolute z-50 w-full mt-2 rounded-xl overflow-hidden ${styles.dropdown}`}>
          {/* Loading state */}
          {loading && (
            <div className="p-4 text-center">
              <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto" />
            </div>
          )}

          {/* Search Results */}
          {!loading && results.length > 0 && (
            <div className="py-2">
              <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase">Results</div>
              {results.map((result) => (
                <Link
                  key={result.id}
                  href={result.href}
                  onClick={() => setIsFocused(false)}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  {getResultIcon(result.type)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {result.title}
                    </p>
                    {result.subtitle && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {result.subtitle}
                      </p>
                    )}
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-300" />
                </Link>
              ))}
            </div>
          )}

          {/* No query - show recent and popular */}
          {!loading && !query && (
            <>
              {/* Recent Searches */}
              <div className="py-2">
                <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase flex items-center gap-2">
                  <Clock className="w-3 h-3" />
                  Recent Searches
                </div>
                {recentSearches.map((search) => (
                  <button
                    key={search}
                    onClick={() => handleQuickSearch(search)}
                    className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-left"
                  >
                    <Clock className="w-4 h-4 text-gray-400" />
                    {search}
                  </button>
                ))}
              </div>

              {/* Popular Searches */}
              <div className="py-2 border-t border-gray-100 dark:border-gray-700">
                <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase">
                  Popular Searches
                </div>
                {popularSearches.map((item) => (
                  <button
                    key={item.query}
                    onClick={() => handleQuickSearch(item.query)}
                    className="w-full flex items-center justify-between gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-left"
                  >
                    <span className="flex items-center gap-3">
                      <Search className="w-4 h-4 text-gray-400" />
                      {item.query}
                    </span>
                    <span className="text-xs text-gray-400">{item.count.toLocaleString()}</span>
                  </button>
                ))}
              </div>
            </>
          )}

          {/* No results */}
          {!loading && query && results.length === 0 && (
            <div className="p-6 text-center">
              <Search className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No results for &quot;{query}&quot;</p>
              <button
                onClick={handleSubmit as any}
                className="mt-3 text-sm text-blue-500 hover:text-blue-600"
              >
                Search all jobs for &quot;{query}&quot;
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Global Search Modal
export function GlobalSearch({ isOpen, onClose }: GlobalSearchProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative max-w-2xl mx-auto mt-20 px-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden">
          <SearchBar
            variant="hero"
            placeholder="Search jobs, companies, courses, mentors..."
            className="border-b border-gray-100 dark:border-gray-700"
            onSearch={() => onClose()}
          />
          
          {/* Quick Links */}
          <div className="p-4 border-t border-gray-100 dark:border-gray-700">
            <div className="flex flex-wrap gap-2">
              <span className="text-xs text-gray-400">Quick links:</span>
              <Link href="/jobs" onClick={onClose} className="text-xs text-blue-500 hover:text-blue-600">
                Browse Jobs
              </Link>
              <Link href="/employers" onClick={onClose} className="text-xs text-blue-500 hover:text-blue-600">
                Companies
              </Link>
              <Link href="/courses" onClick={onClose} className="text-xs text-blue-500 hover:text-blue-600">
                Courses
              </Link>
              <Link href="/mentorship" onClick={onClose} className="text-xs text-blue-500 hover:text-blue-600">
                Mentorship
              </Link>
            </div>
          </div>
        </div>
        
        <p className="text-center text-xs text-gray-400 mt-4">
          Press <kbd className="px-2 py-1 bg-white/10 rounded">ESC</kbd> to close
        </p>
      </div>
    </div>
  );
}

export default SearchBar;
