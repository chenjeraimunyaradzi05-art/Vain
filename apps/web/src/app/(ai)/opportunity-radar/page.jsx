"use client";
import { API_BASE } from '@/lib/apiBase';
import { useState } from 'react';
import { Radar, ArrowLeft, Search, AlertCircle, Briefcase, Lightbulb, MapPin } from 'lucide-react';

export default function OpportunityRadarPage() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    async function load() {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`${API_BASE}/ai/opportunity-radar`);
            const j = await res.json();
            if (!res.ok) throw new Error(j?.error || 'Request failed');
            setData(j);
        } catch (e) {
            setError(e.message || 'Failed to scan for opportunities');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="max-w-5xl mx-auto py-12 px-4">
            <a href="/ai" className="inline-flex items-center gap-2 text-blue-300 hover:text-blue-200 text-sm mb-6">
                <ArrowLeft className="w-4 h-4" /> AI Hub
            </a>

            <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-blue-600/20 rounded-lg">
                    <Radar className="w-6 h-6 text-blue-400" />
                </div>
                <h1 className="text-2xl font-bold">Opportunity Radar</h1>
            </div>
            <p className="mb-6 text-slate-400">Proactive job and opportunity matching for your profile and community.</p>

            <button 
                onClick={load} 
                disabled={loading} 
                className="inline-flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 disabled:opacity-50 transition-colors"
            >
                {loading ? (
                    <><Search className="w-4 h-4 animate-pulse" /> Scanning…</>
                ) : (
                    <><Search className="w-4 h-4" /> Scan for opportunities</>
                )}
            </button>

            {error && (
                <div className="mt-4 flex items-center gap-2 text-red-200 bg-red-950/40 border border-red-900/60 p-3 rounded-lg">
                    <AlertCircle className="w-5 h-5" /> {error}
                </div>
            )}

            {data && (
                <div className="mt-6 space-y-6">
                    {/* Hints Section */}
                    <div className="bg-slate-900/40 border border-slate-800 p-4 rounded-lg">
                        <h3 className="font-semibold flex items-center gap-2 mb-3">
                            <Lightbulb className="w-5 h-5 text-yellow-400" /> Hints & Suggestions
                        </h3>
                        <ul className="text-sm text-slate-300 space-y-2">
                            {(data.hints || []).map((h, i) => (
                                <li key={i} className="flex items-start gap-2">
                                    <span className="text-yellow-400 mt-1">•</span> {h}
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Jobs Section */}
                    <div className="bg-slate-900/40 border border-slate-800 p-4 rounded-lg">
                        <h3 className="font-semibold flex items-center gap-2 mb-3">
                            <Briefcase className="w-5 h-5 text-blue-400" /> Recent Job Matches
                        </h3>
                        <div className="space-y-3">
                            {(data.jobs || []).map((j) => (
                                <div key={j.id} className="flex items-center justify-between p-3 bg-slate-950/40 border border-slate-800 rounded-lg">
                                    <div>
                                        <div className="font-medium text-slate-100">{j.title}</div>
                                        <div className="text-sm text-slate-400 flex items-center gap-1">
                                            <MapPin className="w-3 h-3" /> {j.location}
                                        </div>
                                    </div>
                                    <a 
                                        href={`/jobs/${j.id}`} 
                                        className="text-sm text-blue-300 hover:text-blue-200"
                                    >
                                        View →
                                    </a>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
