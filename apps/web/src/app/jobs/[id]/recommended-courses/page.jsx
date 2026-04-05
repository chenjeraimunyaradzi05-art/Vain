'use client';

import api from '@/lib/apiClient';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

/**
 * Job Recommended Courses Page - Courses that help qualify for a specific job
 * /jobs/[id]/recommended-courses
 */
export default function JobRecommendedCoursesPage() {
    const params = useParams();
    const jobId = params.id;

    const [job, setJob] = useState(null);
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchJobAndCourses();
    }, [jobId]);

    async function fetchJobAndCourses() {
        setLoading(true);
        setError(null);
        try {
            // Fetch job details
            const jobRes = await api(`/jobs/${jobId}`);
            if (!jobRes.ok) throw new Error(jobRes.error || 'Failed to load job');
            const jobData = jobRes.data;
            setJob(jobData.job || jobData);

            // Fetch recommended courses - try job-specific endpoint first (for tests)
            let coursesRes = await api(`/courses/recommendations/job/${jobId}`);
            if (!coursesRes.ok) {
                coursesRes = await api(`/courses/recommendations?jobId=${encodeURIComponent(jobId)}`);
            }
            if (coursesRes.ok) {
                const coursesData = coursesRes.data;
                setCourses(coursesData.courses || coursesData);
            }
        } catch (err) {
            setError('Showing demo recommendations (API unavailable).');
            // Demo data
            setJob({
                title: 'Construction Laborer',
                company: 'BuildRight Australia',
                location: 'Sydney, NSW',
                requirements: [
                    'White Card required',
                    'Able to work safely on a construction site',
                    'Good communication and teamwork',
                ],
            });
            setCourses([
                {
                    id: '3',
                    title: 'White Card Training',
                    provider: 'SafeWork Australia',
                    duration: '1 day',
                    format: 'In-person',
                    isFree: false,
                    price: 9900,
                    relevance: 97,
                    skillsGained: ['Construction Safety', 'Worksite induction'],
                    matchedRequirements: ['White Card required'],
                },
                {
                    id: '1',
                    title: 'Construction Safety Basics',
                    provider: 'TAFE NSW',
                    duration: '2 days',
                    format: 'In-person',
                    isFree: false,
                    price: 14900,
                    relevance: 85,
                    skillsGained: ['PPE', 'Hazard awareness'],
                    matchedRequirements: ['Able to work safely on a construction site'],
                },
                {
                    id: '6',
                    title: 'Manual Handling & Site Readiness',
                    provider: 'Skill Set Training',
                    duration: '1 day',
                    format: 'In-person',
                    isFree: false,
                    price: 8900,
                    relevance: 80,
                    skillsGained: ['Manual handling', 'Worksite readiness'],
                    matchedRequirements: ['Good communication and teamwork'],
                },
            ]);
        } finally {
            setLoading(false);
        }
    }

    if (loading) {
        return (
            <div className="max-w-4xl mx-auto px-4 py-20">
                <div className="flex flex-col items-center justify-center gap-4">
                    <div className="animate-spin rounded-full h-10 w-10 border-4 border-slate-700 border-t-blue-500" />
                    <p className="text-slate-400">Finding recommended courses…</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto px-4 py-8">
            {/* Breadcrumb */}
            <nav className="mb-6 text-sm" aria-label="Breadcrumb">
                <ol className="flex items-center gap-2 text-slate-400">
                    <li><Link href="/jobs" className="hover:text-blue-400 transition-colors">Jobs</Link></li>
                    <li><span className="text-slate-600">/</span></li>
                    <li><Link href={`/jobs/${jobId}`} className="hover:text-blue-400 transition-colors">{job?.title || 'Job'}</Link></li>
                    <li><span className="text-slate-600">/</span></li>
                    <li className="text-white">Recommended Courses</li>
                </ol>
            </nav>

            <div className="mb-8">
                <h1 className="text-3xl font-bold mb-2">Recommended Training</h1>
                <p className="text-slate-300">
                    Courses that will help you qualify for <strong>{job?.title}</strong>
                    {(() => {
                        const companyName = job?.company?.companyName || job?.company || job?.companyName;
                        return companyName ? ` at ${companyName}` : '';
                    })()}
                </p>
            </div>

            {error && (
                <div className="bg-red-900/50 border border-red-700 rounded-lg p-4 mb-6">
                    <p className="text-red-200">{error}</p>
                </div>
            )}

            {/* Job Requirements Summary */}
            {job?.requirements && job.requirements.length > 0 && (
                <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 mb-8">
                    <h2 className="font-semibold mb-3">Job Requirements</h2>
                    <ul className="space-y-2">
                        {job.requirements.map((req, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-sm">
                                <span className="text-slate-400">•</span>
                                <span className="text-slate-300">{req}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Recommended Courses */}
            {courses.length === 0 ? (
                <div className="text-center py-16">
                    <div className="text-6xl mb-4">🎓</div>
                    <h3 className="text-xl font-semibold mb-2">No recommendations yet</h3>
                    <p className="text-slate-400 mb-6">
                        We're working on finding the best courses for this role
                    </p>
                    <Link
                        href="/courses"
                        className="inline-block px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
                    >
                        Browse All Courses
                    </Link>
                </div>
            ) : (
                <div className="space-y-6">
                    {courses.map((course, index) => (
                        <RecommendedCourseCard 
                            key={course.id} 
                            course={course} 
                            rank={index + 1}
                        />
                    ))}
                </div>
            )}

            {/* Back to Job */}
            <div className="mt-8 pt-8 border-t border-slate-800">
                <Link
                    href={`/jobs/${jobId}`}
                    className="text-blue-400 hover:text-blue-300"
                >
                    ← Back to Job
                </Link>
            </div>
        </div>
    );
}

function RecommendedCourseCard({ course, rank }) {
    // Handle both naming conventions
    const title = course.title || course.name || 'Untitled Course';
    const relevance = course.relevance ?? course.relevanceScore ?? 0;
    const matchedSkills = course.skillsGained || course.matchedSkills || [];
    const duration = course.duration || (course.durationWeeks ? `${course.durationWeeks} weeks` : 'Varies');
    const format = course.format || 'Online';
    const providerName = course.provider || course.providerName || course.provider?.name || 'Provider';

    const priceInCents = typeof course.priceInCents === 'number'
        ? course.priceInCents
        : typeof course.price === 'number'
            ? course.price
            : null;
    const priceLabel = course.isFree || !priceInCents || priceInCents === 0
        ? '✓ Free'
        : new Intl.NumberFormat(undefined, { style: 'currency', currency: 'AUD' }).format(priceInCents / 100);
    
    return (
        <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
            <div className="p-4">
                <div className="flex items-start gap-4">
                    {/* Rank Badge */}
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                        rank === 1 ? 'bg-yellow-500 text-yellow-900' :
                        rank === 2 ? 'bg-slate-400 text-slate-900' :
                        rank === 3 ? 'bg-amber-700 text-amber-100' :
                        'bg-slate-700 text-slate-300'
                    }`}>
                        #{rank}
                    </div>

                    <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                            <Link 
                                href={`/courses/${course.id}`}
                                className="font-semibold hover:text-blue-400 transition-colors"
                            >
                                {title}
                            </Link>
                            <span className="px-2 py-0.5 bg-blue-900 text-blue-300 text-xs rounded-full">
                                {relevance}% match
                            </span>
                        </div>
                        <div className="text-sm text-slate-400 mb-3">{providerName}</div>

                        {/* Skills Gained */}
                        {matchedSkills.length > 0 && (
                            <div className="mb-3">
                                <div className="text-xs text-slate-400 mb-1">Skills you'll gain:</div>
                                <div className="flex flex-wrap gap-1">
                                    {matchedSkills.map((skill, idx) => (
                                        <span 
                                            key={idx}
                                            className="px-2 py-0.5 bg-slate-800 text-slate-300 text-xs rounded"
                                        >
                                            {skill}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Meta Info */}
                        <div className="flex flex-wrap gap-3 text-sm">
                            <span className="text-slate-400">⏱️ {duration}</span>
                            <span className="text-slate-400">📍 {format}</span>
                            <span className={course.isFree ? 'text-green-400' : 'text-slate-400'}>
                                {priceLabel}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="px-4 py-3 border-t border-slate-800 flex items-center justify-end gap-3">
                <Link
                    href={`/courses/${course.id}`}
                    className="text-sm text-slate-400 hover:text-slate-300"
                >
                    View Details
                </Link>
                <Link
                    href={`/courses/${course.id}/enroll`}
                    className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg transition-colors"
                >
                    Enroll Now
                </Link>
            </div>
        </div>
    );
}
