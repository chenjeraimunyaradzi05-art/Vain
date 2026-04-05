"use client";
import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import useAiCooldown from '../../../hooks/useAiCooldown';
import { useNotifications } from '../../../components/notifications/NotificationProvider';
import useAuth from '../../../hooks/useAuth';
import api from '@/lib/apiClient';

/* Feminine theme accents */
const accentPink = '#E91E8C';
const accentPurple = '#8B5CF6';

function toMessage(err) {
    if (!err)
        return '';
    if (typeof err === 'string')
        return err;
    if (err instanceof Error)
        return err.message || 'Error';
    try {
        return JSON.stringify(err);
    }
    catch {
        return String(err);
    }
}

function toApiErrorMessage(value) {
    if (!value)
        return 'Request failed';
    if (typeof value === 'string')
        return value;
    if (value && typeof value === 'object') {
        if (Array.isArray(value.formErrors) && value.formErrors.length > 0)
            return value.formErrors.join(', ');
        if (value.fieldErrors && typeof value.fieldErrors === 'object') {
            const parts = [];
            for (const [k, v] of Object.entries(value.fieldErrors)) {
                if (Array.isArray(v) && v.length > 0)
                    parts.push(`${k}: ${v.join(', ')}`);
            }
            if (parts.length > 0)
                return parts.join(' • ');
        }
    }
    return toMessage(value);
}
function TafeSetupInner() {
    const router = useRouter();
    const { user, isAuthenticated, isLoading: authLoading } = useAuth();
    const [institutionName, setInstitutionName] = useState('');
    const [institutionType, setInstitutionType] = useState('TAFE');
    const [courses, setCourses] = useState('');
    const [address, setAddress] = useState('');
    const [phone, setPhone] = useState('');
    const [msg, setMsg] = useState(null);
    const [loading, setLoading] = useState(false);
    const [suggestions, setSuggestions] = useState([]);
    const [aiSource, setAiSource] = useState(null);
    const [isCached, setIsCached] = useState(false);
    const { isCooling, remainingMs, startCooldown, totalMs, percent, justEnded } = useAiCooldown('concierge', user?.id);
    const { showNotification } = useNotifications();
    const shownRef = useRef(false);
    
    // Redirect if not authenticated
    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            router.push('/');
        }
    }, [authLoading, isAuthenticated, router]);
    
    useEffect(() => {
        if (justEnded && !shownRef.current) {
            shownRef.current = true;
            showNotification({ id: `ai-cooldown-${user?.id || 'anon'}`, message: 'AI suggestions are ready — try again for fresh tips.', autoHideMs: 3000, variant: 'info' });
            const t = setTimeout(() => { shownRef.current = false; }, 3500);
            return () => clearTimeout(t);
        }
        return undefined;
    }, [justEnded, showNotification, user?.id]);
    async function getSuggestions() {
        setLoading(true);
        setMsg(null);
        try {
            const ctx = `Institution: ${institutionName}\nCourses: ${courses}`;
            const { ok, data, status } = await api('/ai/concierge', { method: 'POST', body: { userId: user?.id, context: ctx } });
            if (status === 429) {
                startCooldown(60000);
                setMsg('You are making requests too quickly — try again in a minute.');
                setLoading(false);
                return;
            }
            if (data && data.source)
                setAiSource(data.source);
            setIsCached(String(data?.source || '').toLowerCase() === 'cache');
            if (data && data.suggestions)
                setSuggestions(data.suggestions);
            if (data && data.text && (!data.suggestions || data.suggestions.length === 0))
                setSuggestions([data.text]);
        }
        catch (e) {
            setMsg('Failed to fetch suggestions');
            showNotification({ id: `ai-error-${user?.id || 'anon'}`, message: 'Failed to fetch AI suggestions — please try again.', variant: 'error', autoHideMs: 5000, action: { label: 'Retry', onAction: () => { setMsg(null); getSuggestions(); } } });
        }
        finally {
            setLoading(false);
        }
    }
    async function save() {
        setLoading(true);
        setMsg(null);
        try {
            const { ok, data, error: apiError } = await api('/tafe/profile', { method: 'POST', body: { institutionName, institutionType, courses, address, phone } });
            if (!ok)
                throw new Error(toApiErrorMessage(apiError) || 'Save failed');
            setMsg('Saved');
            showNotification({ id: `tafe-save-${user?.id || 'anon'}`, message: 'TAFE profile saved', variant: 'success', autoHideMs: 3500 });
            getSuggestions();
        }
        catch (e) {
            setMsg(toMessage(e) || 'Save failed');
        }
        finally {
            setLoading(false);
        }
    }
    return (<div className="min-h-screen">
      {/* === HERO SECTION === */}
      <section className="relative overflow-hidden py-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-pink-50/40 to-purple-50/40 dark:from-slate-900 dark:to-slate-800">
        <div className="ngurra-halo-pink" />
        <div className="ngurra-halo-purple" />

        <div className="relative max-w-3xl mx-auto">
          {/* Breadcrumb */}
          <nav className="mb-6 text-sm" aria-label="Breadcrumb">
            <ol className="flex items-center gap-2">
              <li><Link href="/tafe/dashboard" className="text-pink-600 hover:text-pink-700 transition-colors">TAFE Dashboard</Link></li>
              <li><span className="text-slate-400">/</span></li>
              <li className="text-slate-700 font-medium">Setup</li>
            </ol>
          </nav>
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-pink-600 mb-2">Configuration</p>
          <h2 className="text-4xl md:text-5xl font-bold text-slate-900 leading-tight">TAFE / Institution Profile Setup</h2>
        </div>
      </section>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-lg space-y-4" style={{ boxShadow: '0 24px 60px rgba(15, 23, 42, 0.08)' }}>
          <label className="block"><div className="text-xs font-semibold uppercase tracking-[0.15em] text-pink-600 mb-2">Institution name</div><input value={institutionName} onChange={(e) => setInstitutionName(e.target.value)} placeholder="e.g. TAFE Queensland" className="w-full border-2 border-slate-200 bg-white p-3 rounded-lg text-slate-900 placeholder:text-slate-400 focus:border-pink-500 focus:ring-2 focus:ring-pink-100 transition"/></label>
          <label className="block"><div className="text-xs font-semibold uppercase tracking-[0.15em] text-pink-600 mb-2">Institution type</div><input value={institutionType} onChange={(e) => setInstitutionType(e.target.value)} placeholder="e.g. TAFE, University, RTO" className="w-full border-2 border-slate-200 bg-white p-3 rounded-lg text-slate-900 placeholder:text-slate-400 focus:border-pink-500 focus:ring-2 focus:ring-pink-100 transition"/></label>
          <label className="block"><div className="text-xs font-semibold uppercase tracking-[0.15em] text-pink-600 mb-2">Courses (comma separated)</div><input value={courses} onChange={(e) => setCourses(e.target.value)} placeholder="e.g. Cert III Automotive, Diploma Nursing" className="w-full border-2 border-slate-200 bg-white p-3 rounded-lg text-slate-900 placeholder:text-slate-400 focus:border-pink-500 focus:ring-2 focus:ring-pink-100 transition"/></label>
          <label className="block"><div className="text-xs font-semibold uppercase tracking-[0.15em] text-pink-600 mb-2">Address</div><input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Street address" className="w-full border-2 border-slate-200 bg-white p-3 rounded-lg text-slate-900 placeholder:text-slate-400 focus:border-pink-500 focus:ring-2 focus:ring-pink-100 transition"/></label>
          <label className="block"><div className="text-xs font-semibold uppercase tracking-[0.15em] text-pink-600 mb-2">Phone</div><input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="e.g. 07 1234 5678" className="w-full border-2 border-slate-200 bg-white p-3 rounded-lg text-slate-900 placeholder:text-slate-400 focus:border-pink-500 focus:ring-2 focus:ring-pink-100 transition"/></label>

        <div className="flex flex-wrap gap-3 pt-2">
          <button onClick={save} className="px-6 py-3 rounded-lg text-white font-semibold transition-all hover:-translate-y-0.5" style={{ background: 'linear-gradient(135deg, #E91E8C 0%, #8B5CF6 100%)' }} disabled={loading}>{loading ? 'Saving...' : 'Save profile'}</button>
          <button onClick={getSuggestions} className="px-6 py-3 border-2 rounded-lg font-semibold transition-all hover:bg-pink-50" style={{ borderColor: accentPink, color: accentPink }} disabled={loading || isCooling}>{loading ? 'Thinking...' : isCooling ? `Cooldown ${Math.ceil(remainingMs / 1000)}s` : 'Get AiConcierge tips'}</button>
        </div>

        {msg && <div className="text-sm text-slate-600 p-3 rounded-lg bg-slate-50">{msg}</div>}

        {isCooling && totalMs && totalMs > 0 && (<div className="mt-2">
                        <div className="relative w-full bg-slate-800 rounded h-2 overflow-hidden" role="progressbar" aria-label="AI cooldown progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}>
              <div className="bg-indigo-500 h-2 transition-all duration-300 ease-linear motion-reduce:transition-none" style={{ width: `${percent}%` }}/>
              {percent >= 80 && (<div data-testid="ai-cooldown-pulse" className="absolute -top-3 h-6 w-6 rounded-full opacity-60 -translate-x-1/2 bg-yellow-400 animate-ping motion-reduce:animate-none pointer-events-none" style={{ left: `${percent}%` }} aria-hidden="true"/>)}
                            <div data-testid="ai-cooldown-indicator" className={`absolute -top-2 h-4 w-4 rounded-full border-2 transform -translate-x-1/2 animate-pulse motion-reduce:animate-none ${percent >= 80 ? 'bg-yellow-400 border-yellow-600' : 'bg-slate-950 border-indigo-300'}`} style={{ left: `${percent}%` }} aria-hidden="true"/>
            </div>
                        <div className="text-xs text-slate-400 mt-1">Cooling down — {Math.ceil(remainingMs / 1000)}s remaining<span className="sr-only">; {percent}% complete</span></div>
            <div role="status" aria-live="polite" data-testid="ai-cooldown-live" className="sr-only">{justEnded ? 'AI suggestions are ready — you can request updated tips now.' : ''}</div>
            {/* Visible toast handled by global NotificationProvider when the cooldown finishes */}
          </div>)}

                {suggestions.length > 0 && (<div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-slate-900">Suggestions from AiConcierge</h4>
              <div className="flex items-center gap-2 text-xs">
                                {aiSource && ['ai', 'openai', 'prototype', 'ai'].includes(String(aiSource).toLowerCase()) && (<span className="inline-block bg-purple-100 text-purple-700 px-2 py-1 rounded-full font-semibold">AI-powered</span>)}
                                {isCached && (<span className="inline-block bg-slate-200 text-slate-600 px-2 py-1 rounded-full font-semibold">Cached result</span>)}
              </div>
            </div>
            <ul className="list-disc pl-6 mt-2 text-slate-600">{suggestions.map((s, i) => <li key={i}>{s}</li>)}</ul>
            <div className="mt-3 flex gap-2">
                            <button onClick={getSuggestions} disabled={isCooling || loading} className="px-4 py-2 border-2 rounded-lg text-sm font-semibold transition-all hover:bg-pink-50" style={{ borderColor: accentPink, color: accentPink }}>Retry suggestions</button>
            </div>
          </div>)}
      </div>
      </div>
    </div>);
}
export default TafeSetupInner;
