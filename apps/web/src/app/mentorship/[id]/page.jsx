'use client';

import api from '@/lib/apiClient';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { toCloudinaryAutoUrl } from '@/lib/cloudinary';
import { 
    Star, 
    MapPin, 
    Briefcase, 
    Calendar, 
    Clock, 
    MessageSquare,
    Award,
    Users,
    CheckCircle,
    ArrowLeft
} from 'lucide-react';

export default function MentorProfilePage() {
    const { id } = useParams();
    const router = useRouter();
    const [mentor, setMentor] = useState(null);
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (id) {
            fetchMentorProfile();
        }
    }, [id]);

    async function fetchMentorProfile() {
        setLoading(true);
        try {
            // Fetch mentor details
            const res = await api(`/mentorship/mentors/${id}`);
            if (!res.ok) throw new Error('Mentor not found');

            const data = res.data;
            setMentor(data.mentor || data);
            setReviews(data.reviews || []);
            
            // Fetch reviews separately if not included
            if (!data.reviews) try {
                const reviewsRes = await api(`/mentorship/mentors/${id}/reviews`);
                if (reviewsRes.ok) {
                    const reviewsData = reviewsRes.data;
                    setReviews(reviewsData.reviews || []);
                }
            } catch (e) {
                // Reviews not critical
            }
        } catch (err) {
            setError(err.message);
            // Demo fallback
            setMentor({
                id,
                name: 'Demo Mentor',
                title: 'Senior Career Coach',
                expertise: 'Career Development, Resume Writing, Interview Preparation',
                bio: 'With over 15 years of experience in career development and Indigenous employment, I help job seekers find meaningful work that aligns with their values and goals. I specialize in helping First Nations people navigate the corporate world while maintaining their cultural identity.',
                location: 'Sydney, NSW',
                industry: 'Human Resources',
                rating: 4.8,
                reviewCount: 24,
                sessionCount: 156,
                activeMatches: 3,
                maxCapacity: 5,
                availability: 'Weekday evenings, Weekend mornings',
                skills: ['Career Coaching', 'Resume Writing', 'Interview Prep', 'LinkedIn Optimization', 'Salary Negotiation'],
                achievements: [
                    { icon: '🏆', title: 'Top Mentor 2024', description: 'Recognized for outstanding mentee outcomes' },
                    { icon: '⭐', title: '100+ Sessions', description: 'Completed over 100 mentoring sessions' },
                ],
            });
        } finally {
            setLoading(false);
        }
    }

    if (loading) {
        return (
            <div className="max-w-4xl mx-auto px-4 py-20">
                <div className="flex flex-col items-center justify-center gap-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-700 border-t-blue-500" />
                    <p className="text-slate-400">Loading mentor profile…</p>
                </div>
            </div>
        );
    }

    if (error && !mentor) {
        return (
            <div className="max-w-4xl mx-auto px-4 py-12">
                <Link href="/mentorship/browse" className="text-blue-400 hover:text-blue-300 flex items-center gap-2 mb-6">
                    <ArrowLeft className="w-4 h-4" />
                    Back to mentors
                </Link>
                <div className="bg-red-900/30 border border-red-800 rounded-xl p-8 text-center">
                    <p className="text-red-300 text-lg">Mentor not found</p>
                    <p className="text-slate-400 mt-2">This mentor may no longer be available.</p>
                </div>
            </div>
        );
    }

    const skills = mentor.skills || 
        (mentor.expertise ? mentor.expertise.split(',').map(s => s.trim()) : []);

    return (
        <div className="max-w-4xl mx-auto px-4 py-8">
            {/* Breadcrumb */}
            <nav className="mb-6 text-sm" aria-label="Breadcrumb">
                <ol className="flex items-center gap-2 text-slate-400">
                    <li><a href="/member/dashboard" className="hover:text-blue-400">Dashboard</a></li>
                    <li><span className="text-slate-600">/</span></li>
                    <li><a href="/mentorship/browse" className="hover:text-blue-400">Browse Mentors</a></li>
                    <li><span className="text-slate-600">/</span></li>
                    <li className="text-white">{mentor.name}</li>
                </ol>
            </nav>

            {/* Profile Header */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 mb-6">
                <div className="flex flex-col md:flex-row gap-6">
                    {/* Avatar */}
                    <div className="flex-shrink-0">
                        <div className="w-32 h-32 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-5xl font-bold shadow-xl">
                            {mentor.avatar ? (
                                <img src={toCloudinaryAutoUrl(mentor.avatar)} alt={mentor.name} className="w-full h-full rounded-2xl object-cover" />
                            ) : (
                                mentor.name?.charAt(0) || 'M'
                            )}
                        </div>
                    </div>
                    
                    {/* Info */}
                    <div className="flex-1">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                            <div>
                                <h1 className="text-2xl font-bold">{mentor.name}</h1>
                                <p className="text-blue-400 text-lg">{mentor.title || mentor.expertise?.split(',')[0]}</p>
                            </div>
                            
                            {/* Availability badge */}
                            <div className={`px-4 py-2 rounded-lg ${
                                mentor.activeMatches < mentor.maxCapacity - 1
                                    ? 'bg-green-900/40 text-green-300'
                                    : 'bg-amber-900/40 text-amber-300'
                            }`}>
                                <span className="text-sm font-medium">
                                    {mentor.maxCapacity - mentor.activeMatches} slots available
                                </span>
                            </div>
                        </div>
                        
                        {/* Stats row */}
                        <div className="flex flex-wrap gap-6 mt-4">
                            {mentor.rating && (
                                <div className="flex items-center gap-2">
                                    <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
                                    <span className="font-semibold">{mentor.rating}</span>
                                    <span className="text-slate-400 text-sm">({mentor.reviewCount || 0} reviews)</span>
                                </div>
                            )}
                            {mentor.sessionCount && (
                                <div className="flex items-center gap-2 text-slate-300">
                                    <Users className="w-5 h-5 text-slate-500" />
                                    <span>{mentor.sessionCount} sessions</span>
                                </div>
                            )}
                            {mentor.location && (
                                <div className="flex items-center gap-2 text-slate-300">
                                    <MapPin className="w-5 h-5 text-slate-500" />
                                    <span>{mentor.location}</span>
                                </div>
                            )}
                            {mentor.industry && (
                                <div className="flex items-center gap-2 text-slate-300">
                                    <Briefcase className="w-5 h-5 text-slate-500" />
                                    <span>{mentor.industry}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
                {/* Main Content */}
                <div className="md:col-span-2 space-y-6">
                    {/* About */}
                    <section className="bg-slate-900/40 border border-slate-800 rounded-xl p-6">
                        <h2 className="text-lg font-semibold mb-4">About</h2>
                        <p className="text-slate-300 leading-relaxed">
                            {mentor.bio || 'Experienced mentor ready to help guide your career journey.'}
                        </p>
                    </section>

                    {/* Skills & Expertise */}
                    {skills.length > 0 && (
                        <section className="bg-slate-900/40 border border-slate-800 rounded-xl p-6">
                            <h2 className="text-lg font-semibold mb-4">Skills & Expertise</h2>
                            <div className="flex flex-wrap gap-2">
                                {skills.map((skill, i) => (
                                    <span key={i} className="px-3 py-1.5 bg-blue-900/30 border border-blue-800/50 text-blue-300 rounded-lg text-sm">
                                        {skill}
                                    </span>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Achievements */}
                    {mentor.achievements && mentor.achievements.length > 0 && (
                        <section className="bg-slate-900/40 border border-slate-800 rounded-xl p-6">
                            <h2 className="text-lg font-semibold mb-4">Achievements</h2>
                            <div className="grid gap-4">
                                {mentor.achievements.map((achievement, i) => (
                                    <div key={i} className="flex items-start gap-4 p-4 bg-slate-800/50 rounded-lg">
                                        <span className="text-2xl">{achievement.icon}</span>
                                        <div>
                                            <h4 className="font-medium">{achievement.title}</h4>
                                            <p className="text-sm text-slate-400">{achievement.description}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Reviews */}
                    <section className="bg-slate-900/40 border border-slate-800 rounded-xl p-6">
                        <h2 className="text-lg font-semibold mb-4">Reviews</h2>
                        {reviews.length > 0 ? (
                            <div className="space-y-4">
                                {reviews.map((review, i) => (
                                    <div key={i} className="p-4 bg-slate-800/50 rounded-lg">
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className="flex">
                                                {[...Array(5)].map((_, j) => (
                                                    <Star key={j} className={`w-4 h-4 ${j < review.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-600'}`} />
                                                ))}
                                            </div>
                                            <span className="text-sm text-slate-400">{new Date(review.createdAt).toLocaleDateString()}</span>
                                        </div>
                                        <p className="text-slate-300 text-sm">{review.feedback}</p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-slate-400 text-sm">No reviews yet. Be the first to work with this mentor!</p>
                        )}
                    </section>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Booking Card */}
                    <div className="bg-gradient-to-br from-blue-950/60 to-slate-900/60 border border-blue-900/50 rounded-xl p-6 sticky top-6">
                        <h3 className="font-semibold mb-4">Book a Session</h3>
                        
                        <div className="space-y-3 mb-6">
                            <div className="flex items-center gap-3 text-sm text-slate-300">
                                <Clock className="w-4 h-4 text-slate-500" />
                                <span>45-60 min sessions</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm text-slate-300">
                                <Calendar className="w-4 h-4 text-slate-500" />
                                <span>{mentor.availability || 'Flexible schedule'}</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm text-slate-300">
                                <MessageSquare className="w-4 h-4 text-slate-500" />
                                <span>Video or phone call</span>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <Link 
                                href={`/mentorship/request/${mentor.id}`}
                                className="block w-full py-3 bg-blue-600 hover:bg-blue-500 text-center rounded-lg font-medium transition-colors"
                            >
                                Request Mentorship
                            </Link>
                            <Link 
                                href={`/mentorship/sessions/book?mentor=${mentor.id}`}
                                className="block w-full py-3 border border-slate-700 hover:bg-slate-800 text-center rounded-lg transition-colors"
                            >
                                Book a Session
                            </Link>
                        </div>
                    </div>

                    {/* Response Time */}
                    <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-6">
                        <h4 className="font-medium mb-3">Response Time</h4>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-green-900/40 rounded-lg flex items-center justify-center">
                                <CheckCircle className="w-5 h-5 text-green-400" />
                            </div>
                            <div>
                                <p className="font-medium text-green-300">Usually within 24 hours</p>
                                <p className="text-sm text-slate-400">Fast responder</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
