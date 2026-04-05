'use client';

import { API_BASE } from '@/lib/apiBase';
import { useState, useEffect, useCallback } from 'react';
import useAuth from '../../../hooks/useAuth';
import Link from 'next/link';
import { toCloudinaryAutoUrl } from '@/lib/cloudinary';
import {
  Users,
  Star,
  Award,
  BookOpen,
  Briefcase,
  Heart,
  ChevronRight,
  Filter,
  Search,
  Loader2,
  AlertCircle,
  User,
  MessageCircle,
  Target,
} from 'lucide-react';
import { useNotifications } from '../../../components/notifications/NotificationProvider';

export default function AlumniMentorsPage() {
  const { token } = useAuth();
  const apiUrl = API_BASE;
  const [mentors, setMentors] = useState([]);
  const [matchedMentors, setMatchedMentors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [view, setView] = useState('featured'); // 'featured' | 'matched'
  const [stats, setStats] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    industry: '',
    challenges: '',
  });
  const [showFilters, setShowFilters] = useState(false);

  const fetchFeaturedMentors = useCallback(async () => {
    try {
      const res = await fetch(`${apiUrl}/alumni-mentors/featured`);
      if (!res.ok) throw new Error('Failed to fetch mentors');
      const data = await res.json();
      setMentors(data.data || []);
    } catch (err) {
      setError(err.message);
    }
  }, [apiUrl]);

  const fetchMatchedMentors = useCallback(async () => {
    if (!token) return;
    
    try {
      const params = new URLSearchParams();
      if (filters.industry) params.append('industry', filters.industry);
      if (filters.challenges) params.append('challenges', filters.challenges);
      
      const res = await fetch(
        `${apiUrl}/alumni-mentors/matching?${params}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) throw new Error('Failed to fetch matches');
      const data = await res.json();
      setMatchedMentors(data.data || []);
    } catch (err) {
      console.error('Match error:', err);
    }
  }, [apiUrl, token, filters]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`${apiUrl}/alumni-mentors/stats/overview`);
      if (!res.ok) throw new Error('Failed to fetch stats');
      const data = await res.json();
      setStats(data.data);
    } catch (err) {
      console.error('Stats error:', err);
    }
  }, [apiUrl]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([fetchFeaturedMentors(), fetchStats()]);
      setLoading(false);
    };
    load();
  }, [fetchFeaturedMentors, fetchStats]);

  useEffect(() => {
    if (token && view === 'matched') {
      fetchMatchedMentors();
    }
  }, [token, view, fetchMatchedMentors]);

  const displayedMentors = view === 'matched' ? matchedMentors : mentors;
  const filteredMentors = searchQuery
    ? displayedMentors.filter(m =>
        m.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.expertise?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.successStory?.title?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : displayedMentors;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="bg-gradient-to-r from-amber-600 to-orange-500 rounded-2xl p-8 text-white mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-white/20 rounded-xl">
              <Award className="w-8 h-8" />
            </div>
            <h1 className="text-3xl font-bold">Alumni Mentors</h1>
          </div>
          <p className="text-lg text-white/90 max-w-2xl mb-6">
            Connect with community members who have walked the path before you. 
            Our alumni mentors have achieved career success and are ready to share their journey.
          </p>
          
          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
              <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
                <p className="text-2xl font-bold">{stats.alumniMentors}</p>
                <p className="text-white/80 text-sm">Alumni Mentors</p>
              </div>
              <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
                <p className="text-2xl font-bold">{stats.totalSessions}</p>
                <p className="text-white/80 text-sm">Sessions Completed</p>
              </div>
              <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
                <p className="text-2xl font-bold">⭐ {stats.averageRating}</p>
                <p className="text-white/80 text-sm">Average Rating</p>
              </div>
              <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
                <p className="text-2xl font-bold">{stats.successRate}</p>
                <p className="text-white/80 text-sm">Success Rate</p>
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
            <AlertCircle className="w-5 h-5" />
            {error}
          </div>
        )}

        {/* Toolbar */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setView('featured')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                view === 'featured'
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Users className="w-4 h-4 inline-block mr-2" />
              Featured
            </button>
            {token && (
              <button
                onClick={() => setView('matched')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  view === 'matched'
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Target className="w-4 h-4 inline-block mr-2" />
                My Matches
              </button>
            )}
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search mentors..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2 border rounded-lg transition-colors ${
                showFilters ? 'bg-amber-50 border-amber-200' : 'hover:bg-gray-50'
              }`}
            >
              <Filter className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="bg-gray-50 rounded-xl p-4 mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Industry</label>
              <select
                value={filters.industry}
                onChange={(e) => setFilters({ ...filters, industry: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500"
              >
                <option value="">All Industries</option>
                <option value="technology">Technology</option>
                <option value="healthcare">Healthcare</option>
                <option value="education">Education</option>
                <option value="arts">Arts & Culture</option>
                <option value="business">Business</option>
                <option value="trades">Trades & Construction</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Challenges Overcome</label>
              <select
                value={filters.challenges}
                onChange={(e) => setFilters({ ...filters, challenges: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500"
              >
                <option value="">All Challenges</option>
                <option value="career_change">Career Change</option>
                <option value="remote_regional">Remote/Regional Area</option>
                <option value="returning_work">Returning to Work</option>
                <option value="first_job">First Job</option>
                <option value="skills_gap">Skills Gap</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => {
                  setFilters({ industry: '', challenges: '' });
                  setSearchQuery('');
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 underline text-sm"
              >
                Clear filters
              </button>
            </div>
          </div>
        )}

        {/* Mentors Grid */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
          </div>
        ) : filteredMentors.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border">
            <Users className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-700 mb-2">No mentors found</h3>
            <p className="text-gray-500">
              {view === 'matched'
                ? 'Complete your profile to get personalized mentor matches'
                : 'Try adjusting your search or filters'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredMentors.map((mentor) => (
              <MentorCard key={mentor.id} mentor={mentor} />
            ))}
          </div>
        )}

        {/* CTA Section */}
        {!token && (
          <div className="mt-12 bg-gradient-to-r from-gray-800 to-gray-900 rounded-2xl p-8 text-white text-center">
            <h2 className="text-2xl font-bold mb-3">Ready to find your mentor?</h2>
            <p className="text-gray-300 mb-6 max-w-xl mx-auto">
              Sign in to request mentorship, track matches, and join alumni circles.
            </p>
            <Link
              href="/signin?returnTo=/mentors/alumni"
              className="inline-flex items-center justify-center rounded-lg px-5 py-2.5 bg-pink-600 hover:bg-pink-500 font-semibold transition-colors"
            >
              Sign In
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

function MentorCard({ mentor }) {
  const [requesting, setRequesting] = useState(false);
  const { token } = useAuth();
  const { showNotification } = useNotifications();
  const apiUrl = API_BASE;

  const handleRequest = async () => {
    if (!token) return;
    
    setRequesting(true);
    try {
      const res = await fetch(
        `${apiUrl}/alumni-mentors/${mentor.id}/request`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ message: 'I would love to connect with you!' }),
        }
      );
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Request failed');
      }
      
      showNotification({ message: 'Request sent! The mentor will respond soon.', variant: 'success' });
    } catch (err) {
      showNotification({ message: 'Error: ' + err.message, variant: 'error' });
    } finally {
      setRequesting(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border shadow-sm overflow-hidden hover:shadow-md transition-shadow">
      {/* Header with badges */}
      <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 border-b">
        <div className="flex items-start gap-3">
          <div className="w-16 h-16 bg-amber-200 rounded-full flex items-center justify-center">
            {mentor.avatarUrl ? (
              <img src={toCloudinaryAutoUrl(mentor.avatarUrl)} alt="" className="w-full h-full rounded-full object-cover" />
            ) : (
              <User className="w-8 h-8 text-amber-700" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 truncate">{mentor.name}</h3>
            <p className="text-sm text-gray-600 truncate">{mentor.expertise}</p>
            <div className="flex items-center gap-2 mt-2">
              {mentor.badges?.map((badge, i) => (
                <span
                  key={i}
                  className="px-2 py-0.5 text-xs bg-amber-100 text-amber-700 rounded-full"
                >
                  {badge}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Success Story Preview */}
      {mentor.successStory && (
        <div className="p-4 border-b">
          <div className="flex items-center gap-2 text-amber-600 mb-2">
            <BookOpen className="w-4 h-4" />
            <span className="text-sm font-medium">Success Story</span>
          </div>
          <h4 className="font-medium text-gray-800 mb-1">{mentor.successStory.title}</h4>
          <p className="text-sm text-gray-600 line-clamp-2">{mentor.successStory.snippet}</p>
        </div>
      )}

      {/* Stats */}
      <div className="p-4 grid grid-cols-3 gap-4 border-b text-center">
        <div>
          <p className="text-lg font-semibold text-gray-800 flex items-center justify-center gap-1">
            <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
            {mentor.rating || '4.5'}
          </p>
          <p className="text-xs text-gray-500">Rating</p>
        </div>
        <div>
          <p className="text-lg font-semibold text-gray-800">{mentor.ratingCount || 0}</p>
          <p className="text-xs text-gray-500">Sessions</p>
        </div>
        <div>
          <p className="text-lg font-semibold text-gray-800">
            {mentor.stats?.available !== false ? (
              <span className="text-green-600">Open</span>
            ) : (
              <span className="text-red-600">Full</span>
            )}
          </p>
          <p className="text-xs text-gray-500">Availability</p>
        </div>
      </div>

      {/* Match Score (for matched view) */}
      {mentor.matchScore && (
        <div className="px-4 py-3 bg-green-50 border-b">
          <div className="flex items-center justify-between">
            <span className="text-sm text-green-700 font-medium">Match Score</span>
            <span className="text-lg font-bold text-green-700">{mentor.matchScore}%</span>
          </div>
          <div className="w-full bg-green-200 rounded-full h-2 mt-2">
            <div
              className="bg-green-600 h-2 rounded-full"
              style={{ width: `${mentor.matchScore}%` }}
            />
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="p-4 flex gap-2">
        <Link
          href={`/mentors/${mentor.id}`}
          className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-center text-sm font-medium"
        >
          View Profile
        </Link>
        {token && mentor.stats?.available !== false && (
          <button
            onClick={handleRequest}
            disabled={requesting}
            className="flex-1 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {requesting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Heart className="w-4 h-4" />
                Request
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
