'use client';

import api from '@/lib/apiClient';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

/**
 * Client-side Courses page (search/filters)
 */
export default function CoursesClient({ initialCourses = [] }) {
    const [courses, setCourses] = useState(Array.isArray(initialCourses) ? initialCourses : []);
    const [loading, setLoading] = useState(!(Array.isArray(initialCourses) && initialCourses.length > 0));
    const [error, setError] = useState(null);
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState('all');
    const [provider, setProvider] = useState('all');

    const categories = [
        { value: 'all', label: 'All Categories' },
        { value: 'tech', label: 'Technology' },
        { value: 'business', label: 'Business' },
        { value: 'trades', label: 'Trades & Skills' },
        { value: 'health', label: 'Health & Safety' },
        { value: 'leadership', label: 'Leadership' },
    ];

    const providers = [
        { value: 'all', label: 'All Providers' },
        { value: 'tafe', label: 'TAFE' },
        { value: 'university', label: 'University' },
        { value: 'rto', label: 'RTOs' },
        { value: 'online', label: 'Online Platforms' },
    ];

    useEffect(() => {
        fetchCourses();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [category, provider]);

    async function fetchCourses() {
        setLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams();
            if (category !== 'all') params.append('category', category);
            if (provider !== 'all') params.append('provider', provider);
            if (search) params.append('q', search);

            // Try external search endpoint first, then fall back to standard /courses
            let res = await api(`/courses/external/search?${params.toString()}`);
            let nextCourses = res.ok ? (res.data?.courses || []) : [];

            // If external search returned empty or failed, try the main courses endpoint
            if (!res.ok || nextCourses.length === 0) {
                res = await api(`/courses?${params.toString()}`);
                if (res.ok) {
                    nextCourses = res.data?.courses || res.data || [];
                }
            }

            if (!res.ok) throw new Error(res.error || 'Failed to load courses');

            setCourses(Array.isArray(nextCourses) ? nextCourses : []);
        } catch (err) {
            setError('Showing demo courses (API unavailable).');
            setCourses(DEMO_COURSES);
        } finally {
            setLoading(false);
        }
    }

    const filteredCourses = useMemo(() => {
        const q = String(search || '').toLowerCase().trim();
        if (!q) return courses;

        return (Array.isArray(courses) ? courses : []).filter((course) => {
            const title = String(course?.title || course?.name || '');
            const description = String(course?.description || '');
            const providerName = String(course?.provider || course?.providerName || course?.provider?.name || '');
            return (
                title.toLowerCase().includes(q) ||
                providerName.toLowerCase().includes(q) ||
                description.toLowerCase().includes(q)
            );
        });
    }, [courses, search]);

    return (
        <div className="max-w-6xl mx-auto px-4 py-8">
            {/* Breadcrumb */}
            <nav className="mb-6 text-sm" aria-label="Breadcrumb">
                <ol className="flex items-center gap-2 text-slate-400">
                    <li><a href="/member/dashboard" className="hover:text-blue-400 transition-colors">Dashboard</a></li>
                    <li><span className="text-slate-600">/</span></li>
                    <li className="text-white">Courses</li>
                </ol>
            </nav>

            <div className="mb-8">
                <h1 className="text-3xl font-bold mb-2">Training Courses</h1>
                <p className="text-slate-300">
                    Discover courses from TAFE, universities, and registered training organisations
                </p>
            </div>

            {/* Search and Filters */}
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 mb-6">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1">
                        <input
                            type="text"
                            placeholder="Search courses..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg 
                                       focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                        />
                    </div>
                    <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg 
                                   focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    >
                        {categories.map((cat) => (
                            <option key={cat.value} value={cat.value}>{cat.label}</option>
                        ))}
                    </select>
                    <select
                        value={provider}
                        onChange={(e) => setProvider(e.target.value)}
                        className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg 
                                   focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    >
                        {providers.map((prov) => (
                            <option key={prov.value} value={prov.value}>{prov.label}</option>
                        ))}
                    </select>
                </div>
            </div>

            {error && (
                <div className="bg-red-900/50 border border-red-700 rounded-lg p-4 mb-6">
                    <p className="text-red-200">{error}</p>
                </div>
            )}

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="flex flex-col items-center gap-4">
                        <div className="animate-spin rounded-full h-10 w-10 border-4 border-slate-700 border-t-blue-500" />
                        <p className="text-slate-300 text-sm">Loading...</p>
                    </div>
                </div>
            ) : filteredCourses.length === 0 ? (
                <div className="text-center py-16">
                    <div className="text-6xl mb-4">📚</div>
                    <h3 className="text-xl font-semibold mb-2">No courses found</h3>
                    <p className="text-slate-400">Try adjusting your search or filters</p>
                </div>
            ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {filteredCourses.map((course) => (
                        <CourseCard key={course.id} course={course} />
                    ))}
                </div>
            )}
        </div>
    );
}

function CourseCard({ course }) {
    const title = String(course?.title || course?.name || 'Untitled Course');
    const duration = String(course?.duration || (course?.durationWeeks ? `${course.durationWeeks} weeks` : 'Varies'));
    const format = String(course?.format || course?.qualification || 'On-campus');
    const rating = course?.rating || 4.5;
    const enrollments = course?.enrollments || 0;

    const providerName = String(course?.provider || course?.providerName || course?.provider?.name || 'Provider');

    const rawPriceInCents = typeof course?.priceInCents === 'number' ? course.priceInCents : null;
    const rawPrice = typeof course?.price === 'number' ? course.price : null;
    const isExternalWeeks = typeof course?.durationWeeks === 'number';

    const priceLabel = (() => {
        if (course?.isFree) return '✓ Free';
        if (rawPriceInCents === 0 || rawPrice === 0) return '✓ Free';

        if (typeof rawPriceInCents === 'number') {
            const dollars = rawPriceInCents / 100;
            return `$${dollars.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        }

        if (typeof rawPrice !== 'number') return 'Paid';

        // External catalogue mocks often send dollars with durationWeeks.
        if (isExternalWeeks) {
            return `$${rawPrice.toLocaleString()}`;
        }

        // Many internal/demo payloads use cents in `price`.
        if (rawPrice >= 1000) {
            const dollars = rawPrice / 100;
            return `$${dollars.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        }

        return `$${rawPrice.toLocaleString()}`;
    })();

    return (
        <Link
            href={`/courses/${course?.id}`}
            className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden hover:border-slate-700 transition-colors group"
        >
            {/* Provider Badge */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                <span className="text-sm text-slate-400">{providerName}</span>
                {course?.culturallyRelevant && (
                    <span className="px-2 py-0.5 bg-amber-900 text-amber-300 text-xs rounded-full">
                        🔸 Culturally Relevant
                    </span>
                )}
            </div>

            <div className="p-4">
                <h3 className="font-semibold mb-2 group-hover:text-blue-400 transition-colors line-clamp-2">
                    {title}
                </h3>
                <p className="text-sm text-slate-400 mb-4 line-clamp-2">
                    {course?.description || 'No description available'}
                </p>

                {/* Meta Info */}
                <div className="flex flex-wrap gap-2 mb-4">
                    <span className="px-2 py-1 bg-slate-800 text-slate-300 text-xs rounded">
                        ⏱️ {duration}
                    </span>
                    <span className="px-2 py-1 bg-slate-800 text-slate-300 text-xs rounded">
                        📍 {format}
                    </span>
                    <span
                        className={`px-2 py-1 text-xs rounded ${course?.isFree ? 'bg-green-900 text-green-300' : 'bg-slate-800 text-slate-300'}`}
                    >
                        {priceLabel}
                    </span>
                </div>

                {/* Stats */}
                <div className="flex items-center justify-between text-sm text-slate-400">
                    <span>⭐ {rating}</span>
                    <span>{enrollments > 0 ? `${Number(enrollments).toLocaleString()} enrolled` : ''}</span>
                </div>
            </div>
        </Link>
    );
}

const DEMO_COURSES = [
    {
        id: '1',
        title: 'Certificate III in Information Technology',
        provider: 'TAFE NSW',
        providerType: 'tafe',
        category: 'tech',
        duration: '12 months',
        format: 'Blended',
        price: 0,
        isFree: true,
        description: 'Learn foundational IT skills including networking, security, and support.',
        rating: 4.7,
        enrollments: 1250,
        culturallyRelevant: true,
    },
    {
        id: '2',
        title: 'Project Management Fundamentals',
        provider: 'LinkedIn Learning',
        providerType: 'online',
        category: 'business',
        duration: '6 weeks',
        format: 'Online',
        price: 2999,
        isFree: false,
        description: 'Master project management principles and methodologies.',
        rating: 4.5,
        enrollments: 8500,
        culturallyRelevant: false,
    },
    {
        id: '3',
        title: 'White Card Training',
        provider: 'SafeWork Australia',
        providerType: 'rto',
        category: 'health',
        duration: '1 day',
        format: 'In-person',
        price: 9900,
        isFree: false,
        description: 'General construction induction for working safely on construction sites.',
        rating: 4.8,
        enrollments: 15000,
        culturallyRelevant: false,
    },
    {
        id: '4',
        title: 'Indigenous Business Leadership Program',
        provider: 'First Nations Foundation',
        providerType: 'rto',
        category: 'leadership',
        duration: '3 months',
        format: 'Blended',
        price: 0,
        isFree: true,
        description: 'Develop leadership skills grounded in Indigenous values and business acumen.',
        rating: 4.9,
        enrollments: 450,
        culturallyRelevant: true,
    },
    {
        id: '5',
        title: 'Certificate IV in Plumbing',
        provider: 'TAFE QLD',
        providerType: 'tafe',
        category: 'trades',
        duration: '2 years',
        format: 'Apprenticeship',
        price: 0,
        isFree: true,
        description: 'Complete plumbing qualification through hands-on apprenticeship.',
        rating: 4.6,
        enrollments: 890,
        culturallyRelevant: false,
    },
];
