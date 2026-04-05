"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import useAuth from '../../../hooks/useAuth';
import api from '@/lib/apiClient';
const NATIONS = ['Yuggera', 'Gubbi Gubbi', 'Bundjalung', 'Dharawal', 'Noongar', 'Yorta Yorta'];
export default function MemberSetupPage() {
    const { user, isAuthenticated, isLoading } = useAuth();
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [phone, setPhone] = useState('');
    const [mobNation, setMobNation] = useState('');
    const [skillLevel, setSkillLevel] = useState('Beginner');
    const [careerInterest, setCareerInterest] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    useEffect(() => {
        // Load draft
        const draft = typeof window !== 'undefined' ? localStorage.getItem('ngurra_member_setup') : null;
        if (draft) {
            try {
                const parsed = JSON.parse(draft);
                setPhone(parsed.phone || '');
                setMobNation(parsed.mobNation || '');
                setSkillLevel(parsed.skillLevel || 'Beginner');
                setCareerInterest(parsed.careerInterest || '');
            }
            catch (e) {
                // ignore
            }
        }
    }, []);
    useEffect(() => {
        // redirect if not logged in (wait for auth check to complete)
        if (!isLoading && !isAuthenticated) {
          router.push('/');
        }
    }, [isAuthenticated, isLoading, router]);
    function saveDraft() {
        const payload = { phone, mobNation, skillLevel, careerInterest };
        localStorage.setItem('ngurra_member_setup', JSON.stringify(payload));
    }
    async function submit() {
        setError(null);
        setLoading(true);
        try {
            const { ok, data, error: apiError } = await api('/member/profile', {
                method: 'POST',
                body: { phone, mobNation, skillLevel, careerInterest },
            });
            if (!ok)
                throw new Error(apiError || 'Failed to save profile');
            // clear draft and go to dashboard
            localStorage.removeItem('ngurra_member_setup');
            router.push('/member/dashboard');
        }
        catch (err) {
            setError(err.message || 'Submit failed');
        }
        finally {
            setLoading(false);
        }
    }
    return (<div className="max-w-3xl mx-auto py-12">
      <a href="/member/dashboard" className="text-blue-300 hover:text-blue-200 text-sm mb-4 inline-block">← Dashboard</a>
      <h2 className="text-2xl font-bold mb-2">Member profile setup</h2>
      
      {/* Progress bar */}
      <div className="mb-6">
        <div className="flex justify-between text-xs text-slate-400 mb-1">
          <span>Step {step} of 5</span>
          <span>{Math.round((step / 5) * 100)}%</span>
        </div>
        <div className="w-full bg-slate-800 rounded-full h-2">
          <div className="bg-blue-600 h-2 rounded-full transition-all duration-300" style={{ width: `${(step / 5) * 100}%` }} />
        </div>
      </div>

      <div className="bg-slate-900/40 border border-slate-800 p-6 rounded">
        {error && <div className="text-red-200 bg-red-950/40 border border-red-900/60 p-2 rounded mb-4">{error}</div>}

        {step === 1 && (<div>
            <label className="block">
              <span className="text-sm text-slate-200">Phone</span>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="e.g. 0412 345 678" className="w-full mt-1 border border-slate-700 bg-slate-950/40 px-3 py-2 rounded text-slate-100 placeholder:text-slate-500"/>
            </label>
          </div>)}

        {step === 2 && (<div>
            <label className="block">
              <span className="text-sm text-slate-200">Mob / Nation</span>
              <select value={mobNation} onChange={(e) => setMobNation(e.target.value)} className="w-full mt-1 border border-slate-700 bg-slate-950/40 px-3 py-2 rounded text-slate-100">
                <option value="">— Select —</option>
                {NATIONS.map((n) => (<option key={n} value={n}>{n}</option>))}
              </select>
            </label>
          </div>)}

        {step === 3 && (<div>
            <span className="text-sm text-slate-200">Skill level</span>
            <div className="mt-2 flex gap-3">
              {['Beginner', 'Intermediate', 'Advanced'].map((s) => (<label key={s} className={`px-3 py-2 border border-slate-700 rounded cursor-pointer ${skillLevel === s ? 'bg-blue-600 text-white' : 'hover:bg-slate-900'}`}>
                  <input type="radio" name="skill" value={s} checked={skillLevel === s} onChange={() => setSkillLevel(s)} className="hidden"/>
                  {s}
                </label>))}
            </div>
          </div>)}

        {step === 4 && (<div>
            <label className="block">
              <span className="text-sm text-slate-200">Career interests</span>
              <textarea value={careerInterest} onChange={(e) => setCareerInterest(e.target.value)} placeholder="e.g. Mining, Healthcare, Trades, Community Services…" className="w-full mt-1 border border-slate-700 bg-slate-950/40 px-3 py-2 rounded h-28 text-slate-100 placeholder:text-slate-500"/>
            </label>
          </div>)}

        {step === 5 && (<div>
            <h3 className="text-lg font-semibold mb-2">Review</h3>
            <dl className="grid grid-cols-1 gap-2 text-sm text-slate-200">
              <div>
                <dt className="font-medium">Phone</dt>
                <dd>{phone || '—'}</dd>
              </div>
              <div>
                <dt className="font-medium">Mob / Nation</dt>
                <dd>{mobNation || '—'}</dd>
              </div>
              <div>
                <dt className="font-medium">Skill level</dt>
                <dd>{skillLevel}</dd>
              </div>
              <div>
                <dt className="font-medium">Career interest</dt>
                <dd>{careerInterest || '—'}</dd>
              </div>
            </dl>
          </div>)}

        <div className="mt-6 flex justify-between items-center">
          <div className="flex gap-2">
            <button disabled={step === 1} onClick={() => setStep((s) => Math.max(1, s - 1))} className="px-3 py-2 border rounded disabled:opacity-50">
              Back
            </button>

            <button onClick={() => { saveDraft(); setStep((s) => Math.min(5, s + 1)); }} className="px-3 py-2 bg-slate-800 rounded hover:bg-slate-700">
              Next
            </button>
          </div>

          <div className="flex gap-2 items-center">
            <button onClick={saveDraft} className="text-sm text-slate-300 hover:text-white">Save draft</button>

            {step === 5 ? (<button disabled={loading} onClick={submit} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-500">
                {loading ? 'Saving...' : 'Confirm & Save'}
              </button>) : null}
          </div>
        </div>
      </div>
    </div>);
}
