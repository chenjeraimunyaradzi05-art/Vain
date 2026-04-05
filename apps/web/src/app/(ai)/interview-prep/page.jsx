"use client";

import { API_BASE } from '@/lib/apiBase';
import { useMemo, useState } from 'react';
import { ArrowLeft, Sparkles, MessageSquare, ClipboardList, AlertCircle } from 'lucide-react';
import useAuth from '../../../hooks/useAuth';

export default function InterviewPrepCoachPage() {
    const { token, user } = useAuth();

    const apiBase = useMemo(
        () => API_BASE,
        []
    );

    const [jobTitle, setJobTitle] = useState('');
    const [jobDescription, setJobDescription] = useState('');
    const [question, setQuestion] = useState('');
    const [answer, setAnswer] = useState('');

    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    async function run() {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`${apiBase}/ai/interview-prep`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: token ? `Bearer ${token}` : '',
                },
                body: JSON.stringify({
                    userId: user?.id,
                    jobTitle,
                    jobDescription,
                    question,
                    answer,
                }),
            });
            const json = await res.json();
            if (!res.ok) {
                throw new Error(json?.error || 'Request failed');
            }
            setResult(json);
        } catch (e) {
            setError(e?.message || 'Failed to generate interview prep');
        } finally {
            setLoading(false);
        }
    }

    const questions = result?.result?.questions || [];
    const feedback = result?.result?.feedback || null;
    const improvements = result?.result?.suggestedImprovements || [];

    return (
        <div className="max-w-3xl mx-auto py-12 px-4">
            <a href="/ai" className="inline-flex items-center gap-2 text-blue-300 hover:text-blue-200 text-sm mb-6">
                <ArrowLeft className="w-4 h-4" /> AI Hub
            </a>

            <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-blue-600/20 rounded-lg">
                    <MessageSquare className="w-6 h-6 text-blue-400" />
                </div>
                <h1 className="text-2xl font-bold">Interview Prep Coach</h1>
            </div>
            <p className="mb-6 text-slate-400">
                Generate likely interview questions for a role, and get strengths-based feedback on your answer.
            </p>

            <div className="bg-slate-900/40 border border-slate-800 rounded-lg p-4 space-y-4">
                <div>
                    <label className="block text-sm text-slate-300 mb-2">Job title</label>
                    <input
                        value={jobTitle}
                        onChange={(e) => setJobTitle(e.target.value)}
                        placeholder="e.g. Trainee Civil Construction"
                        className="w-full bg-slate-950/40 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 placeholder:text-slate-500"
                    />
                </div>

                <div>
                    <label className="block text-sm text-slate-300 mb-2">Job description (optional)</label>
                    <textarea
                        value={jobDescription}
                        onChange={(e) => setJobDescription(e.target.value)}
                        placeholder="Paste the job ad or key responsibilities…"
                        rows={5}
                        className="w-full bg-slate-950/40 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 placeholder:text-slate-500"
                    />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                    <div>
                        <label className="block text-sm text-slate-300 mb-2">Practice question (optional)</label>
                        <input
                            value={question}
                            onChange={(e) => setQuestion(e.target.value)}
                            placeholder="e.g. Tell me about a time you solved a problem"
                            className="w-full bg-slate-950/40 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 placeholder:text-slate-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm text-slate-300 mb-2">Your answer (optional)</label>
                        <input
                            value={answer}
                            onChange={(e) => setAnswer(e.target.value)}
                            placeholder="Type a short answer to get feedback"
                            className="w-full bg-slate-950/40 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 placeholder:text-slate-500"
                        />
                    </div>
                </div>

                <div className="flex justify-end">
                    <button
                        onClick={run}
                        disabled={loading}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 disabled:opacity-50 transition-colors"
                    >
                        {loading ? (
                            <><Sparkles className="w-4 h-4 animate-pulse" /> Generating…</>
                        ) : (
                            <><ClipboardList className="w-4 h-4" /> Generate prep</>
                        )}
                    </button>
                </div>
            </div>

            {error && (
                <div className="mt-4 flex items-center gap-2 text-red-200 bg-red-950/40 border border-red-900/60 p-3 rounded-lg">
                    <AlertCircle className="w-5 h-5" /> {error}
                </div>
            )}

            {result && (
                <div className="mt-6 space-y-4" data-testid="interview-prep-result">
                    {questions.length > 0 && (
                        <div className="bg-slate-900/40 border border-slate-800 p-4 rounded-lg">
                            <h3 className="font-semibold mb-3">Likely interview questions</h3>
                            <ul className="text-sm text-slate-300 space-y-2">
                                {questions.map((t, i) => (
                                    <li key={i} className="flex items-start gap-2">
                                        <span className="text-blue-400 mt-1">•</span> {t}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {feedback && (
                        <div className="bg-slate-900/40 border border-slate-800 p-4 rounded-lg">
                            <h3 className="font-semibold mb-2">Feedback on your answer</h3>
                            <div className="text-sm text-slate-300">{feedback}</div>
                        </div>
                    )}

                    {improvements.length > 0 && (
                        <div className="bg-slate-900/40 border border-slate-800 p-4 rounded-lg">
                            <h3 className="font-semibold mb-3">Suggested improvements</h3>
                            <ul className="text-sm text-slate-300 space-y-2">
                                {improvements.map((t, i) => (
                                    <li key={i} className="flex items-start gap-2">
                                        <span className="text-blue-400 mt-1">•</span> {t}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {result?.result?.disclaimer && (
                        <div className="text-xs text-slate-500">
                            {result.result.disclaimer}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
