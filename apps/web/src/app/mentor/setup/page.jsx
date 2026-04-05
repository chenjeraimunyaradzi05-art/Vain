"use client";
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import useAiCooldown from '../../../hooks/useAiCooldown';
import { useNotifications } from '../../../components/notifications/NotificationProvider';
import useAuth from '../../../hooks/useAuth';
import api from '@/lib/apiClient';

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
    // zod flatten often comes back as { fieldErrors, formErrors }
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
function MentorSetupInner() {
    const router = useRouter();
    const { user, isAuthenticated, isLoading: authLoading } = useAuth();
    const [phone, setPhone] = useState('');
    const [expertise, setExpertise] = useState('');
    const [bio, setBio] = useState('');
    const [loading, setLoading] = useState(false);
    const [msg, setMsg] = useState(null);
    const [suggestions, setSuggestions] = useState([]);
    const [aiSource, setAiSource] = useState(null);
    const [isCached, setIsCached] = useState(false);
    const { isCooling, remainingMs, startCooldown, totalMs, percent, justEnded } = useAiCooldown('concierge', user?.id);
    const { showNotification } = useNotifications();
    const toastShownRef = useRef(false);
    
    // Redirect if not authenticated
    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            router.push('/');
        }
    }, [authLoading, isAuthenticated, router]);
    
    useEffect(() => {
        if (justEnded && !toastShownRef.current) {
            toastShownRef.current = true;
            showNotification({ id: `ai-cooldown-${user?.id || 'anon'}`, message: 'AI suggestions are ready — try again for fresh tips.', autoHideMs: 3000, variant: 'info' });
            // allow next cooldown to show after a short delay
            const t = setTimeout(() => { toastShownRef.current = false; }, 3500);
            return () => clearTimeout(t);
        }
        return undefined;
    }, [justEnded, showNotification, user?.id]);
    async function getSuggestions() {
        setLoading(true);
        setMsg(null);
        try {
            const ctx = `Expertise: ${expertise}\nBio: ${bio}`;
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
            const payload = {
                phone: phone.trim() ? phone.trim() : undefined,
                expertise: expertise.trim() ? expertise.trim() : undefined,
                bio: bio.trim() ? bio.trim() : undefined,
            };
            const { ok, data, error: apiError } = await api('/mentor/profile', { method: 'POST', body: payload });
            if (!ok)
                throw new Error(toApiErrorMessage(apiError) || 'Save failed');
            setMsg('Profile saved');
            showNotification({ id: `mentor-save-${user?.id || 'anon'}`, message: 'Mentor profile saved', variant: 'success', autoHideMs: 3500 });
            getSuggestions();
        }
        catch (e) {
            setMsg(toMessage(e) || 'Save failed');
        }
        finally {
            setLoading(false);
        }
    }
    return (<div className="max-w-2xl mx-auto py-12 px-4">
      {/* Breadcrumb */}
      <nav className="mb-6 text-sm" aria-label="Breadcrumb">
        <ol className="flex items-center gap-2 text-slate-400">
          <li><a href="/mentor/dashboard" className="hover:text-blue-400 transition-colors">Mentor Dashboard</a></li>
          <li><span className="text-slate-600">/</span></li>
          <li className="text-white">Setup</li>
        </ol>
      </nav>
      <h2 className="text-2xl font-bold mb-4">Mentor Profile Setup</h2>
            <div className="bg-slate-900/40 border border-slate-800 p-6 rounded space-y-4">
                <label className="block"><div className="text-sm text-slate-200">Phone</div><input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="e.g. 0412 345 678" className="w-full border border-slate-700 bg-slate-950/40 p-2 rounded text-slate-100 placeholder:text-slate-500"/></label>
                <label className="block"><div className="text-sm text-slate-200">Expertise (comma separated)</div><input value={expertise} onChange={(e) => setExpertise(e.target.value)} placeholder="e.g. Career guidance, Cultural knowledge, Trade skills" className="w-full border border-slate-700 bg-slate-950/40 p-2 rounded text-slate-100 placeholder:text-slate-500"/></label>
                <label className="block"><div className="text-sm text-slate-200">Short bio</div><textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Tell us about yourself and your experience…" className="w-full border border-slate-700 bg-slate-950/40 p-2 rounded text-slate-100 placeholder:text-slate-500"/></label>

        <div className="flex flex-wrap gap-2">
                    <button onClick={save} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900 transition-colors" disabled={loading}>{loading ? 'Saving...' : 'Save profile'}</button>
                    <button onClick={getSuggestions} className="px-4 py-2 border border-slate-700 rounded hover:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 focus:ring-offset-slate-900 transition-colors" disabled={loading || isCooling}>{loading ? 'Thinking...' : isCooling ? `Cooldown ${Math.ceil(remainingMs / 1000)}s` : 'Get AiConcierge tips'}</button>
        </div>

                {msg && <div className="text-sm text-slate-200">{msg}</div>}

        {isCooling && totalMs && totalMs > 0 && (<div className="mt-2">
                        <div className="relative w-full bg-slate-800 rounded h-2 overflow-hidden" role="progressbar" aria-label="AI cooldown progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}>
              <div className="bg-indigo-500 h-2 transition-all duration-300 ease-linear motion-reduce:transition-none" style={{ width: `${percent}%` }}/>
              {percent >= 80 && (<div data-testid="ai-cooldown-pulse" className="absolute -top-3 h-6 w-6 rounded-full opacity-60 -translate-x-1/2 bg-yellow-400 animate-ping motion-reduce:animate-none pointer-events-none" style={{ left: `${percent}%` }} aria-hidden="true"/>)}
              <div data-testid="ai-cooldown-indicator" className={`absolute -top-2 h-4 w-4 rounded-full border-2 transform -translate-x-1/2 animate-pulse motion-reduce:animate-none ${percent >= 80 ? 'bg-yellow-400 border-yellow-600' : 'bg-slate-950 border-indigo-300'}`} style={{ left: `${percent}%` }} aria-hidden="true"/>
            </div>
                        <div className="text-xs text-slate-400 mt-1">Cooling down — {Math.ceil(remainingMs / 1000)}s remaining<span className="sr-only">; {percent}% complete</span></div>
            {/* Announce cooldown completion to screen readers briefly when it finishes */}
            <div role="status" aria-live="polite" data-testid="ai-cooldown-live" className="sr-only">{justEnded ? 'AI suggestions are ready — you can request updated tips now.' : ''}</div>
            {/* Visible toast handled by global NotificationProvider when the cooldown finishes */}
          </div>)}

                {suggestions.length > 0 && (<div className="mt-4 bg-slate-950/30 border border-slate-800 p-3 rounded">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold">Suggestions from AiConcierge</h4>
              <div className="flex items-center gap-2 text-xs">
                {aiSource && ['ai', 'openai', 'prototype', 'ai'].includes(String(aiSource).toLowerCase()) && (<span className="inline-block bg-indigo-500/20 text-indigo-200 px-2 py-1 rounded">AI-powered</span>)}
                                {isCached && (<span className="inline-block bg-slate-800 text-slate-200 px-2 py-1 rounded">Cached result</span>)}
              </div>
            </div>
            <ul className="list-disc pl-6 mt-2">{suggestions.map((s, i) => <li key={i}>{s}</li>)}</ul>
            <div className="mt-3 flex gap-2">
                            <button onClick={getSuggestions} disabled={isCooling || loading} className="px-3 py-1 border border-slate-700 rounded text-sm hover:bg-slate-900">Retry suggestions</button>
            </div>
          </div>)}
      </div>
    </div>);
}
export default MentorSetupInner;
