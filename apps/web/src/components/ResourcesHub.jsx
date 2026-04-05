'use client';

/**
 * Resources Hub Component
 * Learning resources, guides, and educational content
 */

import { useState, useEffect, useCallback } from 'react';
import { API_BASE } from '@/lib/apiBase';
import useAuth from '@/hooks/useAuth';
import {
  BookOpen,
  Video,
  FileText,
  Download,
  ExternalLink,
  Bookmark,
  BookmarkCheck,
  Search,
  Filter,
  Play,
  Headphones,
  GraduationCap,
  Clock,
  Eye,
  Star,
  ChevronRight,
  Loader2,
  FolderOpen
} from 'lucide-react';

const API_URL = API_BASE;

// Resource type configuration
const RESOURCE_TYPES = {
  article: { icon: FileText, color: 'text-blue-400', bg: 'bg-blue-900/30', label: 'Article' },
  video: { icon: Video, color: 'text-red-400', bg: 'bg-red-900/30', label: 'Video' },
  guide: { icon: BookOpen, color: 'text-green-400', bg: 'bg-green-900/30', label: 'Guide' },
  template: { icon: Download, color: 'text-purple-400', bg: 'bg-purple-900/30', label: 'Template' },
  webinar: { icon: Play, color: 'text-yellow-400', bg: 'bg-yellow-900/30', label: 'Webinar' },
  podcast: { icon: Headphones, color: 'text-orange-400', bg: 'bg-orange-900/30', label: 'Podcast' },
  course: { icon: GraduationCap, color: 'text-cyan-400', bg: 'bg-cyan-900/30', label: 'Course' },
  other: { icon: FolderOpen, color: 'text-slate-400', bg: 'bg-slate-700/30', label: 'Resource' },
};

const CATEGORIES = [
  { id: 'all', label: 'All Resources' },
  { id: 'resume', label: 'Resume Help' },
  { id: 'interview', label: 'Interview Tips' },
  { id: 'career', label: 'Career Development' },
  { id: 'cultural', label: 'Cultural Resources' },
  { id: 'training', label: 'Training' },
  { id: 'business', label: 'Business Skills' },
];

// Mock resources for demo
const MOCK_RESOURCES = [
  {
    id: '1',
    title: 'How to Write a Standout Resume',
    description: 'Learn the essential elements of crafting a resume that gets noticed by employers. Covers formatting, keywords, and common mistakes to avoid.',
    type: 'guide',
    category: 'resume',
    duration: '10 min read',
    viewCount: 1234,
    featured: true,
    url: '#',
  },
  {
    id: '2',
    title: 'Interview Preparation Masterclass',
    description: 'Comprehensive video series covering common interview questions, body language tips, and strategies to present yourself confidently.',
    type: 'video',
    category: 'interview',
    duration: '45 mins',
    viewCount: 856,
    featured: true,
    url: '#',
  },
  {
    id: '3',
    title: 'Cultural Safety in the Workplace',
    description: 'Understanding and promoting cultural safety in Australian workplaces. Essential reading for both employers and employees.',
    type: 'article',
    category: 'cultural',
    duration: '8 min read',
    viewCount: 654,
    featured: false,
    url: '#',
  },
  {
    id: '4',
    title: 'Cover Letter Template Pack',
    description: 'Professional cover letter templates with examples for various industries. Easily customizable to match your experience.',
    type: 'template',
    category: 'resume',
    duration: 'Download',
    viewCount: 432,
    featured: false,
    url: '#',
  },
  {
    id: '5',
    title: 'Career Pathways in Healthcare',
    description: 'Explore diverse career opportunities in the healthcare sector. Includes training pathways and certification requirements.',
    type: 'course',
    category: 'career',
    duration: '2 hours',
    viewCount: 321,
    featured: false,
    url: '#',
  },
  {
    id: '6',
    title: 'Networking Tips for Job Seekers',
    description: 'Build professional connections that can help advance your career. Practical strategies for introverts and extroverts alike.',
    type: 'podcast',
    category: 'career',
    duration: '25 mins',
    viewCount: 289,
    featured: false,
    url: '#',
  },
  {
    id: '7',
    title: 'Understanding Superannuation',
    description: 'A beginner-friendly guide to superannuation in Australia. Learn about contributions, investment options, and retirement planning.',
    type: 'article',
    category: 'business',
    duration: '12 min read',
    viewCount: 187,
    featured: false,
    url: '#',
  },
  {
    id: '8',
    title: 'Indigenous Business Success Stories',
    description: 'Inspiring stories of successful Indigenous entrepreneurs. Learn from their journeys, challenges, and strategies for growth.',
    type: 'video',
    category: 'cultural',
    duration: '35 mins',
    viewCount: 445,
    featured: true,
    url: '#',
  },
];

function ResourceCard({ resource, isBookmarked, onBookmark }) {
  const type = RESOURCE_TYPES[resource.type] || RESOURCE_TYPES.other;
  const TypeIcon = type.icon;

  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 hover:border-slate-600/50 transition-all group">
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className={`p-3 rounded-lg ${type.bg} flex-shrink-0`}>
          <TypeIcon className={`w-6 h-6 ${type.color}`} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-white group-hover:text-purple-400 transition-colors">
              {resource.title}
            </h3>
            <button
              onClick={(e) => {
                e.preventDefault();
                onBookmark(resource.id);
              }}
              className="p-1 hover:bg-slate-700 rounded transition-colors flex-shrink-0"
              title={isBookmarked ? 'Remove bookmark' : 'Bookmark'}
            >
              {isBookmarked ? (
                <BookmarkCheck className="w-5 h-5 text-purple-400" />
              ) : (
                <Bookmark className="w-5 h-5 text-slate-400 hover:text-white" />
              )}
            </button>
          </div>

          <p className="text-sm text-slate-400 mt-1 line-clamp-2">
            {resource.description}
          </p>

          <div className="flex flex-wrap items-center gap-3 mt-3">
            {/* Type badge */}
            <span className={`text-xs px-2 py-1 rounded ${type.bg} ${type.color}`}>
              {type.label}
            </span>

            {/* Duration */}
            {resource.duration && (
              <span className="flex items-center gap-1 text-xs text-slate-400">
                <Clock className="w-3 h-3" />
                {resource.duration}
              </span>
            )}

            {/* Views */}
            {resource.viewCount > 0 && (
              <span className="flex items-center gap-1 text-xs text-slate-400">
                <Eye className="w-3 h-3" />
                {resource.viewCount.toLocaleString()}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Action button */}
      <div className="mt-4 pt-4 border-t border-slate-700/50">
        <a
          href={resource.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full bg-slate-700/50 hover:bg-slate-600/50 text-white py-2 rounded-lg transition-colors text-sm"
        >
          {resource.type === 'template' ? (
            <>
              <Download className="w-4 h-4" />
              Download
            </>
          ) : resource.type === 'video' || resource.type === 'webinar' ? (
            <>
              <Play className="w-4 h-4" />
              Watch Now
            </>
          ) : resource.type === 'podcast' ? (
            <>
              <Headphones className="w-4 h-4" />
              Listen
            </>
          ) : (
            <>
              <ExternalLink className="w-4 h-4" />
              View Resource
            </>
          )}
        </a>
      </div>
    </div>
  );
}

function FeaturedCard({ resource, onBookmark, isBookmarked }) {
  const type = RESOURCE_TYPES[resource.type] || RESOURCE_TYPES.other;
  const TypeIcon = type.icon;

  return (
    <div className="relative bg-gradient-to-br from-purple-900/40 to-slate-800/60 border border-purple-700/30 rounded-xl p-6 hover:border-purple-600/50 transition-all group min-w-[320px]">
      {/* Featured badge */}
      <div className="absolute top-4 right-4 flex items-center gap-1 bg-purple-600/80 text-white px-2 py-1 rounded text-xs">
        <Star className="w-3 h-3" />
        Featured
      </div>

      {/* Type icon */}
      <div className={`inline-flex p-3 rounded-lg ${type.bg} mb-4`}>
        <TypeIcon className={`w-6 h-6 ${type.color}`} />
      </div>

      <h3 className="font-bold text-white text-lg mb-2 group-hover:text-purple-400 transition-colors">
        {resource.title}
      </h3>

      <p className="text-sm text-slate-400 line-clamp-2 mb-4">
        {resource.description}
      </p>

      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-400">{resource.duration}</span>
        <a
          href={resource.url}
          className="flex items-center gap-1 text-purple-400 hover:text-purple-300 text-sm font-medium"
        >
          Start Learning <ChevronRight className="w-4 h-4" />
        </a>
      </div>
    </div>
  );
}

export default function ResourcesHub() {
  const { token } = useAuth();
  const [resources, setResources] = useState([]);
  const [bookmarks, setBookmarks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedType, setSelectedType] = useState('all');

  const fetchResources = useCallback(async () => {
    try {
      // In production, fetch from API
      // const res = await fetch(`${API_URL}/resources`, {
      //   headers: { Authorization: `Bearer ${token}` },
      // });
      // const data = await res.json();
      
      // Using mock data for now
      setResources(MOCK_RESOURCES);
    } catch (err) {
      console.error('Failed to fetch resources:', err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchResources();
  }, [fetchResources]);

  const handleBookmark = (resourceId) => {
    setBookmarks(prev =>
      prev.includes(resourceId)
        ? prev.filter(id => id !== resourceId)
        : [...prev, resourceId]
    );
  };

  // Filter resources
  const filteredResources = resources.filter(r => {
    const matchesCategory = selectedCategory === 'all' || r.category === selectedCategory;
    const matchesType = selectedType === 'all' || r.type === selectedType;
    const matchesSearch = !searchQuery ||
      r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesType && matchesSearch;
  });

  const featuredResources = resources.filter(r => r.featured);
  const bookmarkedResources = resources.filter(r => bookmarks.includes(r.id));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <GraduationCap className="w-6 h-6 text-purple-400" />
          Learning Resources
        </h2>
        <p className="text-slate-400 text-sm mt-1">
          Guides, templates, and training to boost your career
        </p>
      </div>

      {/* Search and filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search resources..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-800/50 border border-slate-700/50 rounded-lg py-2 pl-10 pr-4 text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-600/50"
          />
        </div>

        {/* Type filter */}
        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          className="bg-slate-800/50 border border-slate-700/50 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-600/50"
        >
          <option value="all">All Types</option>
          {Object.entries(RESOURCE_TYPES).map(([key, config]) => (
            <option key={key} value={key}>{config.label}</option>
          ))}
        </select>
      </div>

      {/* Category tabs */}
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-4 py-2 text-sm rounded-lg transition-colors ${
              selectedCategory === cat.id
                ? 'bg-purple-600 text-white'
                : 'bg-slate-800/50 text-slate-400 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Featured resources */}
      {featuredResources.length > 0 && selectedCategory === 'all' && !searchQuery && (
        <div>
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Star className="w-5 h-5 text-yellow-400" />
            Featured Resources
          </h3>
          <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4">
            {featuredResources.map((resource) => (
              <FeaturedCard
                key={resource.id}
                resource={resource}
                isBookmarked={bookmarks.includes(resource.id)}
                onBookmark={handleBookmark}
              />
            ))}
          </div>
        </div>
      )}

      {/* Bookmarked resources */}
      {bookmarkedResources.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <BookmarkCheck className="w-5 h-5 text-purple-400" />
            Saved Resources ({bookmarkedResources.length})
          </h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {bookmarkedResources.map((resource) => (
              <ResourceCard
                key={resource.id}
                resource={resource}
                isBookmarked={true}
                onBookmark={handleBookmark}
              />
            ))}
          </div>
        </div>
      )}

      {/* All resources */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">
          {searchQuery ? 'Search Results' : 'All Resources'}
          <span className="text-slate-400 font-normal ml-2">
            ({filteredResources.length})
          </span>
        </h3>

        {filteredResources.length === 0 ? (
          <div className="text-center py-12 bg-slate-800/30 rounded-xl">
            <FolderOpen className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400 mb-4">No resources found</p>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-purple-400 hover:text-purple-300 text-sm"
              >
                Clear search
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredResources.map((resource) => (
              <ResourceCard
                key={resource.id}
                resource={resource}
                isBookmarked={bookmarks.includes(resource.id)}
                onBookmark={handleBookmark}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
