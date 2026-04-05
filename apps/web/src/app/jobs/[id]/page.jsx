"use client";
import { API_BASE } from '@/lib/apiBase';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { MapPin, Briefcase, Building2, Globe, DollarSign, Calendar, CheckCircle, Star } from 'lucide-react';
import useAuth from '../../../hooks/useAuth';
import DOMPurify from 'isomorphic-dompurify';

function formatSalary(low, high) {
    if (!low && !high) return null;
    const format = (n) => `$${n.toLocaleString()}`;
    if (low && high) return `${format(low)} - ${format(high)} p.a.`;
    if (low) return `From ${format(low)} p.a.`;
    return `Up to ${format(high)} p.a.`;
}

function formatEmploymentType(type) {
    const types = {
        FULL_TIME: 'Full Time',
        PART_TIME: 'Part Time',
        CONTRACT: 'Contract',
        CASUAL: 'Casual',
        APPRENTICESHIP: 'Apprenticeship',
    };
    return types[type] || type;
}

export default function JobDetails() {
    const params = useParams();
    const id = params?.id;
    const { user, token } = useAuth();
    const [job, setJob] = useState(null);
    const [loading, setLoading] = useState(true);
    const [files, setFiles] = useState([]);
    const [selectedResume, setSelectedResume] = useState(null);
    const [cover, setCover] = useState('');
    const [message, setMessage] = useState(null);
    const [applying, setApplying] = useState(false);

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
            return setMessage({ type: 'error', text: 'Please login to apply' });
        try {
            setApplying(true);
            const res = await fetch(`${API_BASE}/jobs/${id}/apply`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ resumeId: selectedResume, coverLetter: cover }) });
            const json = await res.json();
            if (!res.ok)
                throw new Error(json?.error || JSON.stringify(json));
            setMessage({ type: 'success', text: 'Application submitted successfully! Good luck.' });
        }
        catch (err) {
            setMessage({ type: 'error', text: err.message || 'Apply failed' });
        }
        finally {
            setApplying(false);
        }
    }

    if (loading)
        return <div className="max-w-4xl mx-auto py-12 px-4 text-slate-300">Loading job details…</div>;

    if (!job)
        return (<div className="max-w-4xl mx-auto py-12 px-4">
          <Link href="/jobs" className="text-blue-300 hover:text-blue-200 text-sm mb-4 inline-block">← All jobs</Link>
          <div className="text-slate-300 bg-slate-900/40 border border-slate-800 p-6 rounded">Job not found or may have been removed.</div>
        </div>);

    return (<div className="max-w-4xl mx-auto py-12 px-4">
      <Link href="/jobs" className="text-blue-300 hover:text-blue-200 text-sm mb-4 inline-block">← All jobs</Link>
      
      {/* Job Header */}
      <div className={`rounded-lg p-6 mb-6 ${
        job.isFeatured 
          ? 'bg-gradient-to-r from-amber-950/30 to-slate-900/40 border border-amber-800/50' 
          : 'bg-slate-900/40 border border-slate-800'
      }`}>
        {/* Featured Badge */}
        {job.isFeatured && (
          <div className="flex items-center gap-1.5 text-amber-400 text-xs font-semibold mb-3">
            <Star className="w-4 h-4 fill-amber-400" />
            FEATURED OPPORTUNITY
          </div>
        )}
        <h1 className="text-2xl font-bold mb-3">{job.title}</h1>
        
        {/* Company Info */}
        {job.company && (
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-slate-500" />
              <span className="font-medium">{job.company.companyName}</span>
            </div>
            {job.company.isVerified && (
              <span className="flex items-center gap-1 text-xs px-2 py-1 bg-blue-900/40 text-blue-300 rounded-full">
                <CheckCircle className="w-3 h-3" />
                Verified Employer
              </span>
            )}
            {job.isRAPPartner && (
              <span className="flex items-center gap-1 text-xs px-2 py-1 bg-amber-900/40 text-amber-300 rounded-full">
                🤝 RAP Partner
              </span>
            )}
          </div>
        )}
        
        {/* Job Meta */}
        <div className="flex flex-wrap gap-4 text-sm text-slate-300">
          {job.location && (
            <span className="flex items-center gap-1">
              <MapPin className="w-4 h-4 text-slate-500" />
              {job.location}
            </span>
          )}
          {job.employment && (
            <span className="flex items-center gap-1">
              <Briefcase className="w-4 h-4 text-slate-500" />
              {formatEmploymentType(job.employment)}
            </span>
          )}
          {formatSalary(job.salaryLow, job.salaryHigh) && (
            <span className="flex items-center gap-1 text-green-400 font-medium">
              <DollarSign className="w-4 h-4" />
              {formatSalary(job.salaryLow, job.salaryHigh)}
            </span>
          )}
          {job.postedAt && (
            <span className="flex items-center gap-1 text-slate-400">
              <Calendar className="w-4 h-4" />
              Posted {new Date(job.postedAt).toLocaleDateString()}
            </span>
          )}
        </div>
        
        {/* Company Website */}
        {job.company?.website && (
          <div className="mt-4 pt-4 border-t border-slate-800">
            <a 
              href={job.company.website} 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300"
            >
              <Globe className="w-4 h-4" />
              Visit company website
            </a>
          </div>
        )}
      </div>

      {/* Job Description */}
      <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-lg mb-6">
        <h2 className="text-lg font-semibold mb-4">About this role</h2>
        <div className="prose prose-invert prose-sm max-w-none text-slate-200" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(job.description || '') }}/>
      </div>

      {/* Skills Gap CTA */}
      {user?.userType === 'MEMBER' && (
        <div className="bg-slate-900/40 border border-slate-800 p-4 rounded-lg mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="font-semibold text-slate-100">See your skills gap</div>
            <div className="text-sm text-slate-400">Compare your skills against this role and find training to close the gap.</div>
          </div>
          <Link
            href={`/jobs/${id}/skills-gap`}
            className="inline-flex items-center justify-center px-4 py-2 rounded-lg border border-blue-700 bg-blue-900/20 hover:bg-blue-900/40 transition-colors"
          >
            View skills gap
          </Link>
        </div>
      )}

      {/* About Company */}
      {job.company?.description && (
        <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-lg mb-6">
          <h2 className="text-lg font-semibold mb-4">About {job.company.companyName}</h2>
          <p className="text-sm text-slate-300">{job.company.description}</p>
          {(job.company.city || job.company.state) && (
            <p className="text-sm text-slate-400 mt-2">
              <MapPin className="w-4 h-4 inline mr-1" />
              {[job.company.city, job.company.state].filter(Boolean).join(', ')}
            </p>
          )}
        </div>
      )}

      {/* Apply Section */}
      <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-lg">
        <h2 className="text-lg font-semibold mb-4">Apply for this position</h2>
        
        {message && (
          <div className={`mb-4 p-3 rounded text-sm ${
            message.type === 'success' 
              ? 'bg-green-900/40 text-green-200 border border-green-900/60' 
              : 'bg-red-900/40 text-red-200 border border-red-900/60'
          }`}>
            {message.text}
          </div>
        )}
        
        {!user ? (
          <div className="text-sm text-slate-300">
            Applications are currently unavailable while authentication is being rebuilt.
          </div>
        ) : user.userType !== 'MEMBER' ? (
          <div className="text-sm text-slate-300">
            Only Member accounts can apply for jobs. Please create a Member account to apply.
          </div>
        ) : message?.type === 'success' ? (
          <div className="text-center py-4">
            <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
            <p className="text-green-200">Your application has been submitted!</p>
            <Link href="/member/dashboard" className="text-blue-400 hover:underline text-sm mt-2 inline-block">
              View your applications →
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-slate-200 mb-1">Select a resume</label>
              <select 
                value={selectedResume ?? ''} 
                onChange={(e) => setSelectedResume(e.target.value)} 
                className="w-full border border-slate-700 bg-slate-950/40 px-3 py-2 rounded text-slate-100"
              >
                <option value="">— Choose a resume —</option>
                {files.map((f) => <option key={f.id} value={f.id}>{f.filename}</option>)}
              </select>
              {files.length === 0 && (
                <p className="text-xs text-slate-400 mt-1">
                  No resumes found. <Link href="/member/dashboard" className="text-blue-400 underline">Upload one</Link> first.
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm text-slate-200 mb-1">Cover letter (optional)</label>
              <textarea 
                value={cover} 
                onChange={(e) => setCover(e.target.value)} 
                placeholder="Tell the employer why you're a great fit for this role…"
                className="w-full border border-slate-700 bg-slate-950/40 px-3 py-2 rounded h-32 text-slate-100 placeholder:text-slate-500"
              />
            </div>

            <div className="flex justify-end">
              <button 
                onClick={apply} 
                disabled={applying}
                className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-500 disabled:opacity-50"
              >
                {applying ? 'Submitting…' : 'Submit Application'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>);
}
