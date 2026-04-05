"use client";
import { API_BASE } from '@/lib/apiBase';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import useAuth from '../../../../hooks/useAuth';
import DOMPurify from 'isomorphic-dompurify';
export default function JobDetailsSEO() {
    const params = useParams();
    const id = params?.id;
    const slug = params?.slug;
    const { user, token } = useAuth();
    const [job, setJob] = useState(null);
    const [loading, setLoading] = useState(true);
    const [files, setFiles] = useState([]);
    const [selectedResume, setSelectedResume] = useState(null);
    const [cover, setCover] = useState('');
    const [message, setMessage] = useState(null);
    useEffect(() => {
        async function load() {
            setLoading(true);
            try {
                const res = await fetch(`${API_BASE}/jobs/${id}`);
                const json = await res.json();
                if (res.ok)
                    setJob(json.job);
                if (token) {
                    try {
                        const f = await fetch(`${API_BASE}/uploads/me`, { headers: { Authorization: `Bearer ${token}` } });
                        if (f.ok) {
                            const fj = await f.json();
                            setFiles(fj.files || []);
                        }
                    }
                    catch (e) {
                        // ignore
                    }
                }
            }
            catch (e) {
                // ignore
            }
            finally {
                setLoading(false);
            }
        }
        load();
    }, [id, token]);
    async function apply() {
        setMessage(null);
        if (!token)
            return setMessage('Please login to apply');
        try {
            const res = await fetch(`${API_BASE}/jobs/${id}/apply`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ resumeId: selectedResume, coverLetter: cover }) });
            const json = await res.json();
            if (!res.ok)
                throw new Error(json?.error || JSON.stringify(json));
            setMessage('Application submitted — good luck');
        }
        catch (err) {
            setMessage(err.message || 'Apply failed');
        }
    }
    if (loading)
        return <div className="max-w-4xl mx-auto py-12 text-slate-300">Loading job details…</div>;
    if (!job)
        return (<div className="max-w-4xl mx-auto py-12">
          <a href="/jobs" className="text-blue-300 hover:text-blue-200 text-sm mb-4 inline-block">← All jobs</a>
          <div className="text-slate-300 bg-slate-900/40 border border-slate-800 p-6 rounded">Job not found or may have been removed.</div>
        </div>);
    return (<div className="max-w-4xl mx-auto py-12">
      <a href="/jobs" className="text-blue-300 hover:text-blue-200 text-sm mb-4 inline-block">← All jobs</a>
      <h2 className="text-2xl font-bold mb-2">{job.title}</h2>
            <div className="text-sm text-slate-300 mb-4">{job.location ?? '—'} • {job.employment ?? '—'}</div>

                        {user?.userType === 'MEMBER' && (
                            <div className="mb-4">
                                <a
                                    href={`/jobs/${id}/skills-gap`}
                                    className="inline-block px-4 py-2 rounded-lg border border-blue-700 bg-blue-900/20 hover:bg-blue-900/40 transition-colors text-sm"
                                >
                                    View skills gap
                                </a>
                            </div>
                        )}

            <div className="bg-slate-900/40 border border-slate-800 p-6 rounded text-sm text-slate-100">
        <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(job.description || '') }}/>
        <hr className="my-4"/>
                <div className="mb-4 text-slate-300">Posted: {new Date(job.postedAt).toLocaleString()}</div>

        <section className="mt-6">
          <h3 className="font-semibold mb-2">Apply for this job</h3>
                    {!user ? (<div className="text-sm text-slate-200">Sign in with a Member account to apply for this role.</div>) : user.userType !== 'MEMBER' ? (<div className="text-sm text-slate-200">Only Member accounts can apply. Create a Member account to apply.</div>) : (<div className="space-y-3">
              <div>
                                <label className="block text-sm text-slate-200">Select a resume</label>
                                <select value={selectedResume ?? ''} onChange={(e) => setSelectedResume(e.target.value)} className="w-full mt-1 border border-slate-700 bg-slate-950/40 px-3 py-2 rounded text-slate-100">
                  <option value="">— choose —</option>
                  {files.map((f) => <option key={f.id} value={f.id}>{f.filename}</option>)}
                </select>
              </div>

                            <label className="block"><span className="text-sm text-slate-200">Cover letter (optional)</span>
                                <textarea value={cover} onChange={(e) => setCover(e.target.value)} placeholder="Introduce yourself and explain why you're interested in this role…" className="w-full mt-1 border border-slate-700 bg-slate-950/40 px-3 py-2 rounded h-28 text-slate-100 placeholder:text-slate-500"/></label>

              <div className="flex justify-between items-center">
                                <div className="text-sm text-slate-300">You may upload a resume via your Member Dashboard / Resume</div>
                                <button onClick={apply} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-500">Apply now</button>
              </div>
                            {message && <div className="text-sm text-slate-200 mt-2">{message}</div>}
            </div>)}
        </section>
      </div>
    </div>);
}
