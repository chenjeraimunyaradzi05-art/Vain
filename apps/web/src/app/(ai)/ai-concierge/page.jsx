"use client";
import { API_BASE } from '@/lib/apiBase';
import { useState } from 'react';
import { MessageSquare, ArrowLeft, Send, Sparkles, AlertCircle } from 'lucide-react';
import useAuth from '@/hooks/useAuth';

export default function AiConciergePage() {
    const { token, user } = useAuth();
    const [ctx, setCtx] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);

    async function call() {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/ai/concierge`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: token ? `Bearer ${token}` : '' }, body: JSON.stringify({ userId: user?.id, context: ctx }) });
            const j = await res.json();
            setResult(j);
        }
        catch (e) {
            setResult({ error: 'failed' });
        }
        finally {
            setLoading(false);
        }
    }

    return (
        <div className="max-w-3xl mx-auto py-12 px-4">
            <a href="/ai" className="inline-flex items-center gap-2 text-blue-300 hover:text-blue-200 text-sm mb-6">
                <ArrowLeft className="w-4 h-4" /> AI Hub
            </a>

            <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-indigo-600/20 rounded-lg">
                    <MessageSquare className="w-6 h-6 text-indigo-400" />
                </div>
                <h1 className="text-2xl font-bold">AI Concierge</h1>
            </div>
            <p className="mb-6 text-slate-400">A proactive assistant that suggests relevant next steps and resources for your role.</p>

            <div className="bg-slate-900/40 border border-slate-800 rounded-lg p-4">
                <textarea 
                    value={ctx} 
                    onChange={(e) => setCtx(e.target.value)} 
                    className="w-full p-3 border border-slate-700 bg-slate-950/40 rounded-lg text-slate-100 placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none min-h-[100px]" 
                    placeholder="Enter a short context or ask a question..."
                />
                <div className="mt-3 flex justify-end">
                    <button 
                        onClick={call} 
                        disabled={loading}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 disabled:opacity-50 transition-colors"
                    >
                        {loading ? (
                            <><Sparkles className="w-4 h-4 animate-pulse" /> Thinking…</>
                        ) : (
                            <><Send className="w-4 h-4" /> Ask AI Concierge</>
                        )}
                    </button>
                </div>
            </div>

            {result && (
                <div className="mt-6 bg-slate-900/40 border border-slate-800 p-4 rounded-lg">
                    {result.error ? (
                        <div className="flex items-center gap-2 text-red-200">
                            <AlertCircle className="w-5 h-5" /> Request failed — please try again.
                        </div>
                    ) : (
                        <>
                            {result.text && <p className="text-slate-100 mb-3">{result.text}</p>}
                            {result.suggestions && result.suggestions.length > 0 && (
                                <div className="space-y-2">
                                    <h4 className="text-sm font-medium text-slate-300">Suggestions:</h4>
                                    <ul className="list-disc pl-6 text-sm text-slate-200 space-y-1">
                                        {result.suggestions.map((s, i) => <li key={i}>{s}</li>)}
                                    </ul>
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
