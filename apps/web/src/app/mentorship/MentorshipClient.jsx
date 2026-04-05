'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ChevronRight,
  Heart,
  Search,
  Users,
  Star,
  MapPin,
  Award,
  ArrowRight,
  Loader2,
  Calendar,
  Clock,
  Sparkles,
  CheckCircle,
  Globe,
  Filter,
  X,
} from 'lucide-react';
import OptimizedImage from '@/components/ui/OptimizedImage';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

// Helper to check if URL is a Cloudinary public ID
function isCloudinaryPublicId(url) {
  if (!url) return false;
  return !url.startsWith('http') && !url.startsWith('/');
}

// Categories with updated styling
const categories = [
  { id: 'all', label: 'All Mentors', icon: '✨' },
  { id: 'Technology', label: 'Technology', icon: '💻' },
  { id: 'Business', label: 'Business', icon: '💼' },
  { id: 'Healthcare', label: 'Healthcare', icon: '🏥' },
  { id: 'Education', label: 'Education', icon: '🎓' },
  { id: 'Trades', label: 'Trades', icon: '🔧' },
  { id: 'Creative', label: 'Creative', icon: '🎨' },
  { id: 'Government', label: 'Government', icon: '🏛️' },
];

// Seed mentors — representative profiles at real Australian institutions
const seedMentors = [
  {
    id: '1',
    name: 'Marcia Langton',
    avatar: 'https://images.unsplash.com/photo-1594744803329-e58b31de8bf5?w=200&h=200&fit=crop',
    title: 'Senior Policy Advisor | Indigenous Business Australia',
    expertise: ['Leadership', 'Policy', 'Corporate Governance', 'Grant Writing'],
    industry: 'Government',
    location: 'Canberra, ACT',
    rating: 4.9,
    reviews: 47,
    sessions: 156,
    bio: '20+ years in Indigenous policy and economic development. Guiding the next generation of First Nations leaders into government and corporate sectors.',
    availability: ['Mon', 'Wed', 'Fri'],
    languages: ['English'],
    price: 'Free',
    verified: true,
  },
  {
    id: '2',
    name: 'Daniel Motlop',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop',
    title: 'Software Engineer | Atlassian',
    expertise: ['Software Development', 'Tech Careers', 'Resume Building', 'Coding Bootcamps'],
    industry: 'Technology',
    location: 'Sydney, NSW',
    rating: 4.8,
    reviews: 32,
    sessions: 89,
    bio: 'CareerTrackers alumnus turned full-stack engineer. Passionate about creating pathways for First Nations people in tech.',
    availability: ['Tue', 'Thu', 'Sat'],
    languages: ['English'],
    price: 'Free',
    verified: true,
  },
  {
    id: '3',
    name: 'Dr. Keyla James',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&h=200&fit=crop',
    title: 'Research Fellow | James Cook University',
    expertise: ['Academia', 'Research', 'PhD Supervision', 'Public Health'],
    industry: 'Education',
    location: 'Cairns, QLD',
    rating: 5.0,
    reviews: 58,
    sessions: 234,
    bio: 'Supervised 15+ First Nations PhD candidates. Specialising in Indigenous health research methodologies and community-led study design.',
    availability: ['Mon', 'Tue', 'Wed'],
    languages: ['English'],
    price: 'Free',
    verified: true,
  },
  {
    id: '4',
    name: 'Tyson Carmody',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop',
    title: 'Operations Supervisor | BHP',
    expertise: ['Mining', 'FIFO Lifestyle', 'Heavy Equipment', 'Workplace Safety'],
    industry: 'Mining & Resources',
    location: 'Perth, WA',
    rating: 4.7,
    reviews: 29,
    sessions: 67,
    bio: '15 years in Pilbara mining operations. Started as a trades assistant and now lead a crew of 40. Happy to guide you into resources careers.',
    availability: ['Wed', 'Fri', 'Sun'],
    languages: ['English'],
    price: 'Free',
    verified: true,
  },
  {
    id: '5',
    name: 'Elise Baird',
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200&h=200&fit=crop',
    title: 'Registered Nurse | Royal Darwin Hospital',
    expertise: ['Nursing', 'Midwifery', 'Healthcare Careers', 'TAFE Pathways'],
    industry: 'Healthcare',
    location: 'Darwin, NT',
    rating: 4.9,
    reviews: 41,
    sessions: 112,
    bio: 'Diploma of Nursing through TAFE SA, now working in acute care. Mentoring aspiring nurses and allied health workers across regional and remote areas.',
    availability: ['Tue', 'Thu', 'Sat'],
    languages: ['English'],
    price: 'Free',
    verified: true,
  },
  {
    id: '6',
    name: 'Nathan Maynard',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop',
    title: 'Founder & Director | Supply Nation Certified Business',
    expertise: ['Entrepreneurship', 'Business Development', 'Procurement', 'Grant Applications'],
    industry: 'Business',
    location: 'Brisbane, QLD',
    rating: 4.8,
    reviews: 36,
    sessions: 98,
    bio: 'Built a Supply Nation certified construction services business from the ground up. Helping First Nations entrepreneurs access procurement and funding opportunities.',
    availability: ['Mon', 'Thu'],
    languages: ['English'],
    price: 'Free',
    verified: true,
  },
];

// Upcoming circles
const upcomingCircles = [
  {
    id: '1',
    title: 'Breaking into Tech',
    mentor: 'Sarah Mitchell',
    date: 'This Thursday, 5pm',
    spots: 4,
    icon: '💻',
  },
  {
    id: '2',
    title: 'Indigenous Business 101',
    mentor: 'James Kamilaroi',
    date: 'Next Monday, 6pm',
    spots: 6,
    icon: '💼',
  },
  {
    id: '3',
    title: 'Healthcare Career Paths',
    mentor: 'Dr. Emily Noongar',
    date: 'Saturday, 10am',
    spots: 3,
    icon: '🏥',
  },
];

// Image component wrapper
function Image({ src, alt, width, height, className, cloudinary, sizes }) {
  if (cloudinary) {
    return (
      <OptimizedImage
        src={src}
        alt={alt}
        width={width}
        height={height}
        className={className}
        sizes={sizes}
      />
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} width={width} height={height} className={className} />;
}

export default function MentorshipClient({ initialMentors, hasPrefetched }) {
  const [featuredMentors, setFeaturedMentors] = useState(
    hasPrefetched ? initialMentors : seedMentors,
  );
  const [loading, setLoading] = useState(!hasPrefetched);
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMentor, setSelectedMentor] = useState(null);
  const [bookingStep, setBookingStep] = useState(0);
  const [bookingData, setBookingData] = useState({ date: '', time: '', message: '' });
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  const defaultAvatar =
    'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop';

  useEffect(() => {
    if (hasPrefetched) return;
    fetchFeaturedMentors();
  }, [hasPrefetched]);

  async function fetchFeaturedMentors() {
    try {
      const res = await fetch(`${API_URL}/mentorship/top-mentors?limit=6`);
      if (res.ok) {
        const data = await res.json();
        if (data.mentors && data.mentors.length > 0) {
          const normalizedMentors = data.mentors.map((m) => ({
            id: m.id,
            name: m.name || 'Mentor',
            avatar: m.avatar || defaultAvatar,
            title: m.title || m.expertise || 'Professional Mentor',
            expertise: Array.isArray(m.expertise)
              ? m.expertise
              : m.expertise
                ? [m.expertise]
                : ['Mentorship'],
            industry: m.industry || 'Business',
            location: m.location || 'Australia',
            rating: parseFloat(m.rating) || 4.5,
            reviews: m.reviews || m.sessionCount || 0,
            sessions: m.sessionCount || 0,
            bio: m.bio || 'Experienced mentor ready to help.',
            availability: m.availability || ['Mon', 'Wed', 'Fri'],
            languages: m.languages || ['English'],
            price: m.price || 'Free',
            verified: m.verified !== undefined ? m.verified : true,
          }));
          setFeaturedMentors(normalizedMentors);
        }
      }
    } catch (err) {
      console.error('Failed to fetch featured mentors:', err);
    } finally {
      setLoading(false);
    }
  }

  const filteredMentors = featuredMentors.filter((mentor) => {
    const matchesCategory = activeCategory === 'all' || mentor.industry === activeCategory;
    const matchesSearch =
      !searchQuery ||
      mentor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      mentor.expertise?.some((e) => e.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const handleBookSession = (mentor) => {
    setSelectedMentor(mentor);
    setBookingStep(1);
  };

  const handleConfirmBooking = () => {
    setBookingStep(3);
    setTimeout(() => {
      setSelectedMentor(null);
      setBookingStep(0);
      setBookingData({ date: '', time: '', message: '' });
    }, 3000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-purple-600 dark:text-purple-400" />
          <p className="text-slate-600 dark:text-slate-400 font-medium">Loading mentors...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        {/* Background decoration */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-purple-100 dark:bg-purple-900/20 opacity-50 blur-3xl" />
          <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-amber-100 dark:bg-amber-900/20 opacity-40 blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-12">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-sm mb-8">
            <Link
              href="/"
              className="text-slate-500 dark:text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
            >
              Home
            </Link>
            <ChevronRight className="w-4 h-4 text-slate-400" />
            <span className="text-purple-600 dark:text-purple-400 font-medium">Mentorship</span>
          </nav>

          {/* Hero Content */}
          <div className="max-w-4xl">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm mb-6 bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-800">
              <Heart className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <span className="text-purple-700 dark:text-purple-300 font-semibold">
                First Nations Mentorship Program
              </span>
            </div>

            <h1 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight">
              <span className="text-slate-900 dark:text-white">Connect with Mentors Who </span>
              <span className="bg-gradient-to-r from-purple-600 to-amber-500 bg-clip-text text-transparent">
                Understand Your Journey
              </span>
            </h1>

            <p className="text-lg text-slate-600 dark:text-slate-300 mb-8 leading-relaxed max-w-2xl">
              Get guidance from experienced First Nations professionals who share your background
              and can help you navigate your career path with cultural understanding.
            </p>

            {/* Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { value: '150+', label: 'Active Mentors', color: 'purple' },
                { value: '2,500+', label: 'Sessions Completed', color: 'indigo' },
                { value: '4.9★', label: 'Average Rating', color: 'amber' },
                { value: '85%', label: 'Career Advancement', color: 'emerald' },
              ].map((stat, i) => (
                <div
                  key={i}
                  className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm"
                >
                  <div
                    className={`text-3xl font-bold ${
                      stat.color === 'purple'
                        ? 'text-purple-600 dark:text-purple-400'
                        : stat.color === 'indigo'
                          ? 'text-indigo-600 dark:text-indigo-400'
                          : stat.color === 'amber'
                            ? 'text-amber-500'
                            : 'text-emerald-500'
                    }`}
                  >
                    {stat.value}
                  </div>
                  <div className="text-sm text-slate-500 dark:text-slate-400">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Search Bar */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search mentors by name, expertise, or industry..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-purple-500 focus:ring-2 focus:ring-purple-100 dark:focus:ring-purple-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 transition-all"
              />
            </div>
            <button
              onClick={() => setShowMobileFilters(!showMobileFilters)}
              className="md:hidden flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
            >
              <Filter className="w-5 h-5" />
              Filters
            </button>
          </div>

          {/* Category Pills - Desktop */}
          <div className="hidden md:flex flex-wrap gap-2 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  activeCategory === cat.id
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-purple-50 dark:hover:bg-slate-700'
                }`}
              >
                <span>{cat.icon}</span>
                {cat.label}
              </button>
            ))}
          </div>

          {/* Mobile Filters */}
          {showMobileFilters && (
            <div className="md:hidden mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => {
                      setActiveCategory(cat.id);
                      setShowMobileFilters(false);
                    }}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      activeCategory === cat.id
                        ? 'bg-purple-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    <span>{cat.icon}</span>
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Sidebar */}
          <aside className="hidden lg:block lg:col-span-3">
            <div className="space-y-6 sticky top-24">
              {/* How It Works */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
                <h3 className="text-xs font-semibold uppercase tracking-[0.25em] text-purple-600 dark:text-purple-400 mb-4">
                  How It Works
                </h3>
                <div className="space-y-4">
                  {[
                    { step: '1', title: 'Find', desc: 'Browse by industry', icon: '🔍' },
                    { step: '2', title: 'Book', desc: '45-60min sessions', icon: '📅' },
                    { step: '3', title: 'Grow', desc: 'Build relationships', icon: '🚀' },
                  ].map((item) => (
                    <div key={item.step} className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center text-lg flex-shrink-0">
                        {item.icon}
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-900 dark:text-white text-sm">
                          {item.title}
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Become a Mentor CTA */}
              <div className="bg-gradient-to-br from-purple-600 to-indigo-700 rounded-2xl p-6 text-white">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-5 h-5 text-amber-300" />
                  <h3 className="font-bold">Share Your Experience</h3>
                </div>
                <p className="text-sm text-purple-100 mb-4">
                  Help the next generation by becoming a mentor.
                </p>
                <Link
                  href="/mentor/signup"
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-bold bg-white text-purple-700 hover:bg-purple-50 transition-colors"
                >
                  <Heart className="w-4 h-4" />
                  Become a Mentor
                </Link>
              </div>

              {/* Success Story */}
              <div className="bg-amber-50 dark:bg-amber-900/20 rounded-2xl p-6 border border-amber-200 dark:border-amber-800/50">
                <div className="flex items-center gap-2 mb-3">
                  <Award className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                    Success Story
                  </h3>
                </div>
                <blockquote className="text-sm italic text-slate-700 dark:text-slate-300 mb-3 leading-relaxed">
                  &quot;My mentor Jarrah helped me land my first tech job. From a remote community
                  to Google in 18 months!&quot;
                </blockquote>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  — Kirra M., Software Engineer
                </p>
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <main className="lg:col-span-6">
            {/* Mentors Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                  {activeCategory === 'all' ? 'Featured Mentors' : `${activeCategory} Mentors`}
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  {filteredMentors.length} mentors available
                </p>
              </div>
            </div>

            {/* Mentors Grid */}
            <div className="space-y-4">
              {filteredMentors.map((mentor) => (
                <div
                  key={mentor.id}
                  className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md hover:border-purple-300 dark:hover:border-purple-700 transition-all duration-300"
                >
                  <div className="flex flex-col sm:flex-row gap-5">
                    {/* Avatar */}
                    <div className="relative flex-shrink-0">
                      <Image
                        src={mentor.avatar || defaultAvatar}
                        alt={mentor.name || 'Mentor'}
                        width={80}
                        height={80}
                        cloudinary={isCloudinaryPublicId(mentor.avatar)}
                        className="w-20 h-20 rounded-2xl object-cover border-2 border-slate-200 dark:border-slate-700"
                        sizes="80px"
                      />
                      {mentor.verified && (
                        <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center shadow-lg">
                          <CheckCircle className="w-4 h-4 text-white" />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-2">
                        <div>
                          <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                            {mentor.name}
                          </h3>
                          <p className="text-sm text-slate-500 dark:text-slate-400">
                            {mentor.title}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
                            <Star className="w-4 h-4 fill-current" />
                            <span className="font-semibold text-sm">{mentor.rating}</span>
                          </span>
                          <span className="text-xs text-slate-400">({mentor.reviews} reviews)</span>
                        </div>
                      </div>

                      {/* Expertise Tags */}
                      <div className="flex flex-wrap gap-2 mb-3">
                        {mentor.expertise?.slice(0, 3).map((skill, i) => (
                          <span
                            key={i}
                            className="text-xs px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>

                      <p className="text-sm text-slate-600 dark:text-slate-300 mb-4 line-clamp-2 leading-relaxed">
                        {mentor.bio}
                      </p>

                      {/* Footer */}
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5" />
                            {mentor.location}
                          </span>
                          <span className="flex items-center gap-1">
                            <Globe className="w-3.5 h-3.5" />
                            {mentor.languages?.join(', ')}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 font-semibold">
                            {mentor.price}
                          </span>
                        </div>
                        <button
                          onClick={() => handleBookSession(mentor)}
                          className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-purple-600 hover:bg-purple-700 transition-all shadow-sm hover:shadow-md"
                        >
                          <Calendar className="w-4 h-4" />
                          Book Session
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {filteredMentors.length === 0 && (
                <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                    <span className="text-3xl">🔍</span>
                  </div>
                  <h3 className="font-semibold text-slate-900 dark:text-white mb-2">
                    No mentors found
                  </h3>
                  <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">
                    Try adjusting your filters
                  </p>
                  <button
                    onClick={() => {
                      setActiveCategory('all');
                      setSearchQuery('');
                    }}
                    className="text-sm font-semibold text-purple-600 dark:text-purple-400 hover:text-purple-700"
                  >
                    Clear filters
                  </button>
                </div>
              )}
            </div>

            {/* View All Link */}
            <div className="text-center mt-8">
              <Link
                href="/mentorship/browse"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-purple-300 dark:hover:border-purple-700 hover:bg-purple-50 dark:hover:bg-slate-800 shadow-sm"
              >
                View All 150+ Mentors
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </main>

          {/* Right Sidebar */}
          <aside className="lg:col-span-3">
            <div className="space-y-6 sticky top-24">
              {/* Mentorship Circles */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <Users className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  <h3 className="font-bold text-slate-900 dark:text-white">Group Mentorship</h3>
                </div>
                <div className="space-y-3">
                  {upcomingCircles.map((circle) => (
                    <div
                      key={circle.id}
                      className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 hover:border-purple-300 dark:hover:border-purple-700 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-lg flex-shrink-0">
                          {circle.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-slate-900 dark:text-white text-sm truncate">
                            {circle.title}
                          </h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                            with {circle.mentor}
                          </p>
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-1 text-xs text-purple-600 dark:text-purple-400 font-medium">
                              <Clock className="w-3 h-3" />
                              {circle.date}
                            </span>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 font-semibold">
                              {circle.spots} spots
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <Link
                  href="/mentorship/circles"
                  className="flex items-center justify-center gap-1 mt-4 py-2.5 rounded-xl text-sm font-semibold text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors"
                >
                  View All Circles
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>

              {/* Sponsored Card */}
              <div className="rounded-2xl p-6 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border border-emerald-200 dark:border-emerald-800/50">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] px-2 py-1 rounded bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400 font-bold uppercase tracking-wide">
                    Sponsored
                  </span>
                </div>
                <h3 className="font-bold text-emerald-900 dark:text-emerald-100 mb-2">
                  CareerTrackers Program
                </h3>
                <p className="text-sm text-emerald-800 dark:text-emerald-200 mb-4 leading-relaxed">
                  Paid internships with Australia&apos;s top companies. Mentorship included.
                  Applications now open for 2025.
                </p>
                <Link
                  href="/partners/careertrackers"
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                >
                  Apply Now
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>

              {/* Mobile: How It Works & CTA */}
              <div className="lg:hidden space-y-6">
                {/* How It Works */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
                  <h3 className="text-xs font-semibold uppercase tracking-[0.25em] text-purple-600 dark:text-purple-400 mb-4">
                    How It Works
                  </h3>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    {[
                      { step: '1', title: 'Find', icon: '🔍' },
                      { step: '2', title: 'Book', icon: '📅' },
                      { step: '3', title: 'Grow', icon: '🚀' },
                    ].map((item) => (
                      <div key={item.step}>
                        <div className="w-12 h-12 rounded-xl bg-purple-50 dark:bg-purple-900/30 mx-auto mb-2 flex items-center justify-center text-xl">
                          {item.icon}
                        </div>
                        <h4 className="font-semibold text-slate-900 dark:text-white text-sm">
                          {item.title}
                        </h4>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Success Story */}
                <div className="bg-amber-50 dark:bg-amber-900/20 rounded-2xl p-6 border border-amber-200 dark:border-amber-800/50">
                  <div className="flex items-center gap-2 mb-3">
                    <Award className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                      Success Story
                    </h3>
                  </div>
                  <blockquote className="text-sm italic text-slate-700 dark:text-slate-300 mb-3">
                    &quot;My mentor helped me land my first tech job!&quot;
                  </blockquote>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    — Kirra M., Software Engineer
                  </p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* CTA Banner */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="relative overflow-hidden rounded-3xl p-8 md:p-12 bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-white/10 -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-white/10 translate-y-1/2 -translate-x-1/2" />
          </div>

          <div className="relative flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="text-center md:text-left">
              <h3 className="text-2xl md:text-3xl font-bold text-white mb-2">
                Ready to give back?
              </h3>
              <p className="text-purple-100 text-lg">
                Share your experience and help guide the next generation of Indigenous
                professionals.
              </p>
            </div>
            <Link
              href="/mentor/signup"
              className="flex items-center gap-2 px-8 py-4 bg-white rounded-xl font-bold text-purple-700 hover:bg-purple-50 transition-colors shadow-lg"
            >
              <Heart className="w-5 h-5" />
              Become a Mentor
            </Link>
          </div>
        </div>
      </section>

      {/* Booking Modal */}
      {selectedMentor && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
          onClick={() => {
            setSelectedMentor(null);
            setBookingStep(0);
          }}
        >
          <div
            className="w-full max-w-md rounded-2xl p-6 bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-700"
            onClick={(e) => e.stopPropagation()}
          >
            {bookingStep === 1 && (
              <>
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <Image
                      src={selectedMentor.avatar || defaultAvatar}
                      alt={selectedMentor.name || 'Mentor'}
                      width={56}
                      height={56}
                      cloudinary={isCloudinaryPublicId(selectedMentor.avatar)}
                      className="w-14 h-14 rounded-2xl object-cover border-2 border-slate-200 dark:border-slate-700"
                    />
                    <div>
                      <h3 className="font-bold text-slate-900 dark:text-white">
                        {selectedMentor.name}
                      </h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        {selectedMentor.title}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedMentor(null);
                      setBookingStep(0);
                    }}
                    className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <h4 className="font-bold text-slate-900 dark:text-white mb-4">Book a Session</h4>

                <div className="space-y-4 mb-6">
                  <div>
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">
                      Preferred Date
                    </label>
                    <input
                      type="date"
                      value={bookingData.date}
                      onChange={(e) => setBookingData({ ...bookingData, date: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:border-purple-500 focus:ring-2 focus:ring-purple-100 dark:focus:ring-purple-900"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">
                      Preferred Time
                    </label>
                    <select
                      value={bookingData.time}
                      onChange={(e) => setBookingData({ ...bookingData, time: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:border-purple-500 focus:ring-2 focus:ring-purple-100 dark:focus:ring-purple-900"
                    >
                      <option value="">Select a time</option>
                      <option value="09:00">9:00 AM</option>
                      <option value="10:00">10:00 AM</option>
                      <option value="11:00">11:00 AM</option>
                      <option value="14:00">2:00 PM</option>
                      <option value="15:00">3:00 PM</option>
                      <option value="16:00">4:00 PM</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">
                      What would you like to discuss?
                    </label>
                    <textarea
                      value={bookingData.message}
                      onChange={(e) => setBookingData({ ...bookingData, message: e.target.value })}
                      rows={3}
                      placeholder="Introduce yourself and share your goals..."
                      className="w-full px-4 py-3 rounded-xl text-sm resize-none bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-100 dark:focus:ring-purple-900"
                    />
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setSelectedMentor(null);
                      setBookingStep(0);
                    }}
                    className="flex-1 py-3 rounded-xl text-sm font-semibold border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => setBookingStep(2)}
                    disabled={!bookingData.date || !bookingData.time}
                    className="flex-1 py-3 rounded-xl text-sm font-bold text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Continue
                  </button>
                </div>
              </>
            )}

            {bookingStep === 2 && (
              <>
                <div className="flex items-center justify-between mb-6">
                  <h4 className="font-bold text-slate-900 dark:text-white">Confirm Booking</h4>
                  <button
                    onClick={() => {
                      setSelectedMentor(null);
                      setBookingStep(0);
                    }}
                    className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="rounded-xl p-5 mb-6 bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800">
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-slate-400">Mentor</span>
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {selectedMentor.name}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-slate-400">Date</span>
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {new Date(bookingData.date).toLocaleDateString('en-AU', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-slate-400">Time</span>
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {bookingData.time}
                      </span>
                    </div>
                    <div className="flex justify-between pt-3 border-t border-purple-200 dark:border-purple-700">
                      <span className="text-slate-500 dark:text-slate-400">Price</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">Free</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setBookingStep(1)}
                    className="flex-1 py-3 rounded-xl text-sm font-semibold border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleConfirmBooking}
                    className="flex-1 py-3 rounded-xl text-sm font-bold text-white bg-purple-600 hover:bg-purple-700"
                  >
                    Confirm Booking
                  </button>
                </div>
              </>
            )}

            {bookingStep === 3 && (
              <div className="text-center py-8">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                  <CheckCircle className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
                </div>
                <h4 className="font-bold text-xl mb-2 text-emerald-600 dark:text-emerald-400">
                  Booking Confirmed!
                </h4>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  You&apos;ll receive a confirmation email with the meeting link shortly.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
