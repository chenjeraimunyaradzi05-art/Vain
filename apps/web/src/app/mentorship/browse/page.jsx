'use client';

import api from '@/lib/apiClient';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Search, Filter, Star, MapPin, Briefcase, Users, Sparkles } from 'lucide-react';
import { toCloudinaryAutoUrl } from '@/lib/cloudinary';

const INDUSTRIES = [
    { value: '', label: 'All Industries' },
    { value: 'technology', label: 'Technology & IT' },
    { value: 'healthcare', label: 'Healthcare' },
    { value: 'construction', label: 'Construction & Trades' },
    { value: 'education', label: 'Education & Training' },
    { value: 'government', label: 'Government & Public Sector' },
    { value: 'hospitality', label: 'Hospitality & Tourism' },
    { value: 'finance', label: 'Finance & Banking' },
    { value: 'retail', label: 'Retail & Sales' },
];

const LOCATIONS = [
    { value: '', label: 'All Locations' },
    { value: 'nsw', label: 'New South Wales' },
    { value: 'vic', label: 'Victoria' },
    { value: 'qld', label: 'Queensland' },
    { value: 'wa', label: 'Western Australia' },
    { value: 'sa', label: 'South Australia' },
    { value: 'nt', label: 'Northern Territory' },
    { value: 'tas', label: 'Tasmania' },
    { value: 'act', label: 'ACT' },
    { value: 'remote', label: 'Remote / Online Only' },
];

/**
 * Mentorship Browse Page - Browse available mentors
 * /mentorship/browse
 */
export default function MentorshipBrowsePage() {
    const [mentors, setMentors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [industryFilter, setIndustryFilter] = useState('');
    const [locationFilter, setLocationFilter] = useState('');
    const [useRecommendations, setUseRecommendations] = useState(false);
    const [showFilters, setShowFilters] = useState(false);

    useEffect(() => {
        fetchMentors();
    }, [industryFilter, locationFilter, useRecommendations]);

    async function fetchMentors() {
        setLoading(true);
        try {
            let endpoint = '/mentorship/available';
            if (useRecommendations) {
                endpoint = '/mentorship/recommendations';
                if (industryFilter || locationFilter) {
                    const params = new URLSearchParams();
                    if (industryFilter) params.set('industry', industryFilter);
                    if (locationFilter) params.set('location', locationFilter);
                    endpoint += `?${params.toString()}`;
                }
            }

            let res = await api(endpoint);
            if (!res.ok && useRecommendations) {
                // If personalized endpoint requires auth, fall back to public list.
                res = await api('/mentorship/available');
            }

            if (!res.ok) throw new Error(res.error || 'Failed to load mentors');

            const data = res.data;
            setMentors(data?.mentors || []);
        } catch (err) {
            setError(err.message);
            // Demo data fallback
            setMentors([
                { id: '1', name: 'Test Mentor', expertise: 'Career coaching, Resume writing', bio: 'Experienced mentor', availableSlots: 5, matchScore: 85 },
                { id: '2', name: 'Cultural Mentor', expertise: 'Cultural guidance, Community connections', bio: 'Elder providing cultural mentorship', availableSlots: 3, matchScore: 78 },
            ]);
        } finally {
            setLoading(false);
        }
    }

    const filteredMentors = mentors.filter(mentor => {
        const matchesSearch = !searchTerm || 
            mentor.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            mentor.bio?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            mentor.expertise?.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesSearch;
    });

    if (loading) {
        return (
            <div className="max-w-6xl mx-auto px-4 py-20">
                <div className="flex flex-col items-center justify-center gap-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-700 border-t-blue-500" />
                    <p className="text-slate-400">Finding mentors for you…</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto px-4 py-8">
            {/* Breadcrumb */}
            <nav className="mb-6 text-sm" aria-label="Breadcrumb">
                <ol className="flex items-center gap-2 text-slate-400">
                    <li><a href="/member/dashboard" className="hover:text-blue-400 transition-colors">Dashboard</a></li>
                    <li><span className="text-slate-600">/</span></li>
                    <li><a href="/mentorship" className="hover:text-blue-400 transition-colors">Mentorship</a></li>
                    <li><span className="text-slate-600">/</span></li>
                    <li className="text-white">Browse Mentors</li>
                </ol>
            </nav>

            <div className="mb-8">
                <h1 className="text-3xl font-bold mb-2">Find a Mentor</h1>
                <p className="text-slate-400">Connect with experienced mentors who can guide your career journey</p>
                <div className="mt-4">
                    <Link href="/mentors/alumni" className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-500 transition-colors">
                        <Star className="w-4 h-4" /> Browse Alumni Mentors
                    </Link>
                </div>
            </div>

            {/* Search and Filter Bar */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 mb-6">
                <div className="flex flex-col lg:flex-row gap-4">
                    {/* Search Input */}
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                        <input
                            type="text"
                            placeholder="Search by name, expertise, or bio..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        />
                    </div>
                    
                    {/* Filter Toggle (Mobile) */}
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className="lg:hidden flex items-center gap-2 px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg"
                    >
                        <Filter className="w-5 h-5" />
                        Filters
                    </button>
                    
                    {/* Filters (Desktop always visible, Mobile toggleable) */}
                    <div className={`flex flex-col sm:flex-row gap-3 ${showFilters ? 'block' : 'hidden lg:flex'}`}>
                        <select
                            value={industryFilter}
                            onChange={(e) => setIndustryFilter(e.target.value)}
                            className="px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:border-blue-500"
                        >
                            {INDUSTRIES.map(ind => (
                                <option key={ind.value} value={ind.value}>{ind.label}</option>
                            ))}
                        </select>
                        
                        <select
                            value={locationFilter}
                            onChange={(e) => setLocationFilter(e.target.value)}
                            className="px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:border-blue-500"
                        >
                            {LOCATIONS.map(loc => (
                                <option key={loc.value} value={loc.value}>{loc.label}</option>
                            ))}
                        </select>
                    </div>
                </div>
                
                {/* Personalized toggle */}
                <div className="mt-4 pt-4 border-t border-slate-800 flex items-center justify-between">
                    <label className="flex items-center gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={useRecommendations}
                            onChange={(e) => setUseRecommendations(e.target.checked)}
                            className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-blue-600 focus:ring-blue-500 focus:ring-offset-slate-900"
                        />
                        <span className="flex items-center gap-2 text-sm text-slate-300">
                            <Sparkles className="w-4 h-4 text-amber-400" />
                            Show personalized recommendations
                        </span>
                    </label>
                    <span className="text-sm text-slate-500">{filteredMentors.length} mentor{filteredMentors.length !== 1 ? 's' : ''} found</span>
                </div>
            </div>

            {error && (
                <div className="bg-red-900/50 border border-red-700 rounded-lg p-4 mb-6">
                    <p className="text-red-200">{error}</p>
                </div>
            )}

            {/* Mentor Grid */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {filteredMentors.map((mentor) => (
                    <MentorCard key={mentor.id} mentor={mentor} showMatchScore={useRecommendations} />
                ))}
            </div>

            {filteredMentors.length === 0 && !error && (
                <div className="text-center py-12">
                    <div className="text-4xl mb-4">🔍</div>
                    <p className="text-slate-400">No mentors found matching your criteria</p>
                </div>
            )}
        </div>
    );
}

function MentorCard({ mentor, showMatchScore = false }) {
    // Parse profile skills if available
    const skills = mentor.profile?.skills 
        ? (typeof mentor.profile.skills === 'string' 
            ? mentor.profile.skills.split(',').map(s => s.trim()).slice(0, 3) 
            : mentor.profile.skills.slice(0, 3))
        : mentor.expertise
        ? mentor.expertise.split(',').map(s => s.trim()).slice(0, 3)
        : [];

    const matchScoreColor = mentor.matchScore >= 80 ? 'text-green-400' : 
                            mentor.matchScore >= 60 ? 'text-amber-400' : 'text-slate-400';

    return (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 hover:border-blue-600 hover:shadow-lg hover:shadow-blue-900/20 transition-all duration-200" data-testid="mentor-card">
            {/* Match Score Badge */}
            {showMatchScore && mentor.matchScore && (
                <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold mb-3 ${
                    mentor.matchScore >= 80 ? 'bg-green-900/40 text-green-300' :
                    mentor.matchScore >= 60 ? 'bg-amber-900/40 text-amber-300' :
                    'bg-slate-800 text-slate-400'
                }`}>
                    <Sparkles className="w-3 h-3" />
                    {mentor.matchScore}% match
                </div>
            )}
            
            <div className="flex items-start gap-4 mb-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-2xl font-bold shadow-lg">
                    {mentor.avatar ? (
                        <img src={toCloudinaryAutoUrl(mentor.avatar)} alt={mentor.name} className="w-full h-full rounded-full object-cover" />
                    ) : (
                        mentor.name?.charAt(0) || 'M'
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold truncate">{mentor.name}</h3>
                    <p className="text-sm text-blue-400 truncate" data-testid="mentor-expertise">{mentor.expertise || mentor.title}</p>
                    {mentor.rating && (
                        <div className="flex items-center gap-1 mt-1">
                            <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                            <span className="text-xs text-slate-300">{parseFloat(mentor.rating).toFixed(1)}</span>
                            <span className="text-xs text-slate-500">({mentor.sessionCount || mentor.ratingCount || 0} reviews)</span>
                        </div>
                    )}
                </div>
            </div>
            
            <p className="text-slate-400 text-sm mb-3 line-clamp-2">{mentor.bio || mentor.profile?.bio || 'Experienced professional mentor ready to guide your career journey.'}</p>
            
            {/* Skills tags */}
            {skills.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                    {skills.map((skill, i) => (
                        <span key={i} className="px-2 py-1 bg-slate-800 rounded text-xs text-slate-300">
                            {skill}
                        </span>
                    ))}
                </div>
            )}

            {/* Availability indicator */}
            <div className="bg-slate-800/50 rounded-lg p-3 mb-4">
                <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Availability</span>
                    <span className={`font-medium ${
                        (mentor.maxCapacity - mentor.activeMatches) > 3 ? 'text-green-400' : 
                        (mentor.maxCapacity - mentor.activeMatches) > 1 ? 'text-amber-400' : 'text-red-400'
                    }`}>
                        {mentor.maxCapacity - mentor.activeMatches} of {mentor.maxCapacity} slots open
                    </span>
                </div>
                <div className="h-1.5 bg-slate-700 rounded-full mt-2 overflow-hidden">
                    <div 
                        className={`h-full rounded-full transition-all ${
                            (mentor.maxCapacity - mentor.activeMatches) > 3 ? 'bg-green-500' : 
                            (mentor.maxCapacity - mentor.activeMatches) > 1 ? 'bg-amber-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${((mentor.maxCapacity - mentor.activeMatches) / mentor.maxCapacity) * 100}%` }}
                    />
                </div>
            </div>
            
            <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                <span className="inline-flex items-center gap-1.5 text-xs text-slate-400">
                    <span className={`w-2 h-2 rounded-full ${mentor.availableSlots > 0 || mentor.activeMatches < mentor.maxCapacity ? 'bg-green-500' : 'bg-slate-500'}`}></span>
                    {mentor.availability || mentor.profile?.availability || 'Flexible schedule'}
                </span>
                <div className="flex gap-2">
                    <Link
                        href={`/mentorship/${mentor.id}`}
                        className="px-3 py-2 border border-slate-700 hover:bg-slate-800 rounded-lg text-sm transition-colors"
                    >
                        View Profile
                    </Link>
                    <Link
                        href={`/mentorship/request/${mentor.id}`}
                        className="px-3 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900"
                    >
                        Request
                    </Link>
                </div>
            </div>
        </div>
    );
}
