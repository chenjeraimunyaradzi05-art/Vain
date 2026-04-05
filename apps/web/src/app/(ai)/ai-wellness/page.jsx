"use client";
import { API_BASE } from '@/lib/apiBase';
import { useState } from 'react';
import { Leaf, ArrowLeft, Heart, Brain, Wine, Dumbbell, Sparkles, AlertCircle, BookOpen, Clock, Phone, ExternalLink, Users, User } from 'lucide-react';
import useAuth from '../../../hooks/useAuth';

const WELLNESS_AREAS = [
    { value: 'mental', label: 'Mental / Crisis', icon: Brain, color: 'text-purple-400' },
    { value: 'alcohol', label: 'Alcohol / Drugs', icon: Wine, color: 'text-amber-400' },
    { value: 'fitness', label: 'Fitness', icon: Dumbbell, color: 'text-green-400' },
    { value: 'general', label: 'General Wellbeing', icon: Heart, color: 'text-pink-400' },
];

export default function AiWellnessPage() {
    const { token, user } = useAuth();
    const [area, setArea] = useState('mental');
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    async function check() {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`${API_BASE}/ai/wellness`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: token ? `Bearer ${token}` : '' }, body: JSON.stringify({ userId: user?.id, area }) });
            const j = await res.json();
            if (!res.ok) throw new Error(j?.error || 'Request failed');
            setResult(j);
        } catch (e) {
            setError(e.message || 'Failed to get wellness suggestions');
        } finally {
            setLoading(false);
        }
    }

    const selectedArea = WELLNESS_AREAS.find(a => a.value === area);
    const isCrisisArea = area === 'mental';

    return (
        <div className="max-w-3xl mx-auto py-12 px-4" data-testid="ai-wellness-page">
            <a href="/ai" className="inline-flex items-center gap-2 text-blue-300 hover:text-blue-200 text-sm mb-6">
                <ArrowLeft className="w-4 h-4" /> AI Hub
            </a>

            <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-green-600/20 rounded-lg">
                    <Leaf className="w-6 h-6 text-green-400" />
                </div>
                <h1 className="text-2xl font-bold">AI Wellness Coach</h1>
            </div>
            <p className="mb-6 text-slate-400">Personalised wellness suggestions and short course recommendations with culturally-aware guidance.</p>

            {/* Crisis Hotline Banner (always visible for mental health area) */}
            {isCrisisArea && (
                <div className="mb-6 p-4 bg-red-950/40 border border-red-700/60 rounded-lg" data-testid="crisis-banner">
                    <div className="flex items-start gap-3">
                        <Phone className="w-6 h-6 text-red-400 flex-shrink-0 mt-1" />
                        <div>
                            <h3 className="font-semibold text-red-200 mb-1">Need immediate support?</h3>
                            <p className="text-sm text-red-100/80 mb-2">
                                If you or someone you know is in crisis, please reach out for help now.
                            </p>
                            <div className="flex flex-wrap gap-3">
                                <a href="tel:131114" className="inline-flex items-center gap-2 px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-500">
                                    <Phone className="w-4 h-4" /> Lifeline: 13 11 14
                                </a>
                                <a href="tel:139276" className="inline-flex items-center gap-2 px-3 py-1.5 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-500">
                                    <Phone className="w-4 h-4" /> 13YARN: 13 92 76
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="bg-slate-900/40 border border-slate-800 rounded-lg p-4 space-y-4">
                <div>
                    <label className="block text-sm text-slate-300 mb-2">Select wellness area</label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {WELLNESS_AREAS.map(({ value, label, icon: Icon, color }) => (
                            <button
                                key={value}
                                onClick={() => setArea(value)}
                                data-testid={`wellness-area-${value}`}
                                className={`p-3 rounded-lg border text-left transition-all ${
                                    area === value 
                                        ? 'border-green-500 bg-green-500/10' 
                                        : 'border-slate-700 hover:border-slate-600'
                                }`}
                            >
                                <Icon className={`w-5 h-5 mb-1 ${color}`} />
                                <span className="text-sm text-slate-200">{label}</span>
                            </button>
                        ))}
                    </div>
                </div>
                
                <div className="flex justify-end">
                    <button 
                        onClick={check} 
                        disabled={loading} 
                        data-testid="get-wellness-btn"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-green-500 text-slate-900 font-medium rounded-lg hover:bg-green-400 disabled:opacity-50 transition-colors"
                    >
                        {loading ? (
                            <><Sparkles className="w-4 h-4 animate-pulse" /> Getting suggestions…</>
                        ) : (
                            <><Leaf className="w-4 h-4" /> Get wellness suggestions</>
                        )}
                    </button>
                </div>
            </div>

            {error && (
                <div className="mt-4 flex items-center gap-2 text-red-200 bg-red-950/40 border border-red-900/60 p-3 rounded-lg" data-testid="wellness-error">
                    <AlertCircle className="w-5 h-5" /> {error}
                </div>
            )}

            {result && (
                <div className="mt-6 space-y-4" data-testid="wellness-results">
                    {/* Tips Section */}
                    <div className="bg-slate-900/40 border border-slate-800 p-4 rounded-lg" data-testid="wellness-tips">
                        <h3 className="font-semibold flex items-center gap-2 mb-3">
                            {selectedArea && <selectedArea.icon className={`w-5 h-5 ${selectedArea.color}`} />}
                            Wellness Tips
                        </h3>
                        <ul className="text-sm text-slate-300 space-y-2">
                            {result.tips && result.tips.map((t, i) => (
                                <li key={i} className="flex items-start gap-2">
                                    <span className="text-green-400 mt-1">•</span> {t}
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Community Resources Section */}
                    {result.communityResources && result.communityResources.length > 0 && (
                        <div className="bg-slate-900/40 border border-slate-800 p-4 rounded-lg" data-testid="community-resources">
                            <h3 className="font-semibold flex items-center gap-2 mb-3">
                                <Users className="w-5 h-5 text-cyan-400" /> Community Resources
                            </h3>
                            <div className="space-y-3">
                                {result.communityResources.map((resource, i) => (
                                    <div key={i} className="p-3 bg-slate-950/40 border border-slate-800 rounded-lg">
                                        <div className="flex items-start justify-between gap-2">
                                            <div>
                                                <div className="font-medium text-slate-100">{resource.name}</div>
                                                <div className="text-sm text-slate-400 mt-1">{resource.description}</div>
                                            </div>
                                            {resource.url && (
                                                <a 
                                                    href={resource.url} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer" 
                                                    className="text-blue-400 hover:text-blue-300 flex-shrink-0"
                                                    aria-label={`Visit ${resource.name}`}
                                                >
                                                    <ExternalLink className="w-4 h-4" />
                                                </a>
                                            )}
                                        </div>
                                        {resource.phone && (
                                            <a 
                                                href={`tel:${resource.phone.replace(/\s/g, '')}`} 
                                                className="inline-flex items-center gap-2 mt-2 text-sm text-green-400 hover:text-green-300"
                                            >
                                                <Phone className="w-3 h-3" /> {resource.phone}
                                            </a>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Elder Support Section */}
                    {result.elderSupport && result.elderSupport.available && (
                        <div className="bg-amber-950/30 border border-amber-700/40 p-4 rounded-lg" data-testid="elder-support">
                            <h3 className="font-semibold flex items-center gap-2 mb-2 text-amber-200">
                                <User className="w-5 h-5 text-amber-400" /> Connect with an Elder
                            </h3>
                            <p className="text-sm text-amber-100/80 mb-3">
                                {result.elderSupport.description}
                            </p>
                            <a 
                                href={result.elderSupport.requestPath}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-500 text-sm font-medium transition-colors"
                            >
                                <Users className="w-4 h-4" /> Browse Elder Network
                            </a>
                        </div>
                    )}

                    {/* Recommended Courses */}
                    {result.recommendedCourses && result.recommendedCourses.length > 0 && (
                        <div className="bg-slate-900/40 border border-slate-800 p-4 rounded-lg" data-testid="wellness-courses">
                            <h3 className="font-semibold flex items-center gap-2 mb-3">
                                <BookOpen className="w-5 h-5 text-blue-400" /> Recommended Courses
                            </h3>
                            <div className="space-y-2">
                                {result.recommendedCourses.map((c) => (
                                    <div key={c.id} className="flex items-center justify-between p-3 bg-slate-950/40 border border-slate-800 rounded-lg">
                                        <div className="font-medium text-slate-100">{c.title}</div>
                                        <div className="text-sm text-slate-400 flex items-center gap-1">
                                            <Clock className="w-3 h-3" /> {c.hours}h
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Disclaimer */}
                    <div className="p-3 bg-slate-800/30 border border-slate-700/50 rounded-lg text-xs text-slate-500" data-testid="wellness-disclaimer">
                        <strong>Important:</strong> This AI wellness coach provides general guidance only and is not a substitute for professional medical or mental health advice. 
                        If you are in crisis or need urgent help, please contact emergency services or a crisis hotline immediately.
                    </div>
                </div>
            )}
        </div>
    );
}
