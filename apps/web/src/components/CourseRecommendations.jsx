'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/apiClient';

/**
 * Course Recommendations Component
 * Shows recommended courses based on job requirements or user skills gap
 */
export default function CourseRecommendations({ jobId, userId, limit = 6 }) {
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    const fetchRecommendations = useCallback(async () => {
        try {
            const url = jobId
                ? `/courses/recommendations/job/${jobId}`
                : '/courses/recommendations/me';
            
            const { ok, data } = await api(url);
            
            if (!ok) throw new Error('Failed to fetch recommendations');
            
            setCourses((data.courses || []).slice(0, limit));
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [jobId, limit]);
    
    useEffect(() => {
        fetchRecommendations();
    }, [fetchRecommendations]);
    
    if (loading) {
        return (
            <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
        );
    }
    
    if (error) {
        return (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                Unable to load course recommendations
            </div>
        );
    }
    
    if (courses.length === 0) {
        return (
            <div className="text-center py-8 text-gray-500">
                <svg className="w-12 h-12 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                <p>No course recommendations available</p>
            </div>
        );
    }
    
    return (
        <div className="space-y-4">
            <h3 className="font-semibold text-gray-900">Recommended Courses</h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {courses.map((course) => (
                    <CourseCard key={course.id} course={course} />
                ))}
            </div>
            <div className="text-center">
                <a
                    href="/courses"
                    className="text-primary hover:underline text-sm"
                >
                    View all courses →
                </a>
            </div>
        </div>
    );
}

/**
 * Individual course card component
 */
function CourseCard({ course }) {
    const [enrolling, setEnrolling] = useState(false);
    
    const handleEnrol = async () => {
        setEnrolling(true);
        try {
            const { ok, data } = await api('/course-payments/enrol', {
                method: 'POST',
                body: { courseId: course.id },
            });
            
            if (ok && data.checkoutUrl) {
                window.location.href = data.checkoutUrl;
            } else if (ok && data.success) {
                // Free course - enrolled directly
                window.location.href = `/courses/${course.id}/enrolled`;
            }
        } catch (err) {
            console.error('Enrolment error:', err);
        } finally {
            setEnrolling(false);
        }
    };
    
    return (
        <div className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-2">
                <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                    {course.provider}
                </span>
                {course.relevanceScore !== undefined && (
                    <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                        course.relevanceScore >= 80 ? 'bg-green-100 text-green-700' :
                        course.relevanceScore >= 50 ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-600'
                    }`}>
                        {course.relevanceScore}% match
                    </span>
                )}
            </div>
            
            <h4 className="font-medium text-gray-900 mb-1 line-clamp-2">
                {course.name}
            </h4>
            
            {course.qualification && (
                <p className="text-xs text-gray-500 mb-2">{course.qualification}</p>
            )}
            
            {/* Matched Skills */}
            {course.matchedSkills && course.matchedSkills.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                    {course.matchedSkills.slice(0, 3).map((skill, idx) => (
                        <span
                            key={idx}
                            className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded"
                        >
                            {skill}
                        </span>
                    ))}
                    {course.matchedSkills.length > 3 && (
                        <span className="text-xs text-gray-500">
                            +{course.matchedSkills.length - 3} more
                        </span>
                    )}
                </div>
            )}
            
            {/* Course Details */}
            <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
                {course.durationWeeks && (
                    <span className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {course.durationWeeks} weeks
                    </span>
                )}
                {course.deliveryMode && (
                    <span>{course.deliveryMode}</span>
                )}
            </div>
            
            {/* Price & CTA */}
            <div className="flex items-center justify-between pt-3 border-t">
                <div>
                    {course.price ? (
                        <span className="font-bold text-gray-900">${course.price.toLocaleString()}</span>
                    ) : (
                        <span className="font-bold text-green-600">Free</span>
                    )}
                </div>
                <button
                    onClick={handleEnrol}
                    disabled={enrolling}
                    className="px-3 py-1.5 text-sm bg-primary text-white rounded hover:bg-primary-dark disabled:opacity-50"
                >
                    {enrolling ? 'Loading...' : course.price ? 'Enrol Now' : 'Start Free'}
                </button>
            </div>
        </div>
    );
}

/**
 * Compact course recommendation list for sidebars
 */
export function CourseRecommendationsList({ jobId, limit = 3 }) {
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    
    useEffect(() => {
        const fetchCourses = async () => {
            try {
                const url = jobId 
                    ? `/courses/recommendations/job/${jobId}`
                    : `/courses/recommendations/me`;
                    
                const { ok, data } = await api(url);
                
                if (ok) {
                    setCourses((data.courses || []).slice(0, limit));
                }
            } catch (err) {
                console.error('Failed to fetch courses:', err);
            } finally {
                setLoading(false);
            }
        };
        
        fetchCourses();
    }, [jobId, limit]);
    
    if (loading || courses.length === 0) {
        return null;
    }
    
    return (
        <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-700">Suggested Courses</h4>
            <ul className="space-y-2">
                {courses.map((course) => (
                    <li key={course.id}>
                        <a
                            href={`/courses/${course.id}`}
                            className="flex items-center gap-2 text-sm hover:text-primary"
                        >
                            <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                            </svg>
                            <span className="line-clamp-1">{course.name}</span>
                        </a>
                    </li>
                ))}
            </ul>
        </div>
    );
}
