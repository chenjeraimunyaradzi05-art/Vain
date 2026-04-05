'use client';

import { API_BASE } from '@/lib/apiBase';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import useAuth from '../../../hooks/useAuth';
import { 
  Bookmark, 
  MapPin, 
  Building2, 
  Briefcase, 
  Clock, 
  Trash2,
  ExternalLink,
  Search
} from 'lucide-react';

const API_URL = API_BASE;

export default function SavedJobsPage() {
  const { token } = useAuth();
  const [savedJobs, setSavedJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [removing, setRemoving] = useState(null);

  useEffect(() => {
    if (token) {
      loadSavedJobs();
    }
  }, [token]);

  async function loadSavedJobs() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/member/saved-jobs`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        throw new Error('Failed to load saved jobs');
      }

      const data = await res.json();
      setSavedJobs(data.savedJobs || []);
    } catch (err) {
      // Demo data for development
      setSavedJobs([
        {
          id: '1',
          jobId: 'job-1',
          savedAt: new Date().toISOString(),
          job: {
            id: 'job-1',
            title: 'Community Engagement Officer',
            company: { companyName: 'First Nations Health' },
            location: 'Sydney, NSW',
            employmentType: 'FULL_TIME',
            salaryMin: 65000,
            salaryMax: 80000,
            closingDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          }
        },
        {
          id: '2',
          jobId: 'job-2',
          savedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          job: {
            id: 'job-2',
            title: 'Project Coordinator',
            company: { companyName: 'Indigenous Business Australia' },
            location: 'Melbourne, VIC',
            employmentType: 'CONTRACT',
            salaryMin: 70000,
            salaryMax: 85000,
            closingDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
          }
        }
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function removeSavedJob(savedJobId) {
    setRemoving(savedJobId);
    try {
      const res = await fetch(`${API_URL}/member/saved-jobs/${savedJobId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        setSavedJobs(prev => prev.filter(j => j.id !== savedJobId));
      }
    } catch (err) {
      console.error('Failed to remove saved job:', err);
    } finally {
      setRemoving(null);
    }
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

  function formatSalary(min, max) {
    if (!min && !max) return null;
    const format = (n) => `$${(n / 1000).toFixed(0)}k`;
    if (min && max) return `${format(min)} - ${format(max)}`;
    if (min) return `From ${format(min)}`;
    return `Up to ${format(max)}`;
  }

  function daysUntilClosing(closingDate) {
    if (!closingDate) return null;
    const days = Math.ceil((new Date(closingDate) - new Date()) / (1000 * 60 * 60 * 24));
    if (days < 0) return 'Closed';
    if (days === 0) return 'Closes today';
    if (days === 1) return 'Closes tomorrow';
    return `${days} days left`;
  }

  if (!token) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <Bookmark className="w-16 h-16 mx-auto text-slate-500 mb-4" />
        <h1 className="text-2xl font-bold mb-4">Saved Jobs</h1>
        <p className="text-slate-400 mb-6">Sign in to view and manage your saved jobs.</p>
        <Link
          href="/signin?returnTo=/member/saved-jobs"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium transition-colors"
        >
          Sign In
          <ExternalLink className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <nav className="mb-6 text-sm" aria-label="Breadcrumb">
        <ol className="flex items-center gap-2 text-slate-400">
          <li><Link href="/" className="hover:text-blue-400 transition-colors">Home</Link></li>
          <li><span className="text-slate-600">/</span></li>
          <li><Link href="/member/dashboard" className="hover:text-blue-400 transition-colors">Dashboard</Link></li>
          <li><span className="text-slate-600">/</span></li>
          <li className="text-white">Saved Jobs</li>
        </ol>
      </nav>

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600/20 rounded-lg">
            <Bookmark className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Saved Jobs</h1>
            <p className="text-slate-400 text-sm">{savedJobs.length} job{savedJobs.length !== 1 ? 's' : ''} saved</p>
          </div>
        </div>
        <Link 
          href="/jobs" 
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
        >
          <Search className="w-4 h-4" />
          Browse Jobs
        </Link>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-slate-700 border-t-blue-500" />
        </div>
      ) : savedJobs.length === 0 ? (
        <div className="text-center py-16 bg-slate-800/50 border border-slate-700 rounded-xl">
          <Bookmark className="w-12 h-12 mx-auto text-slate-500 mb-4" />
          <h2 className="text-lg font-semibold mb-2">No saved jobs yet</h2>
          <p className="text-slate-400 mb-6">Save jobs you're interested in to view them later</p>
          <Link 
            href="/jobs" 
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-lg font-medium transition-colors"
          >
            Browse Jobs
            <ExternalLink className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {savedJobs.map((saved) => {
            const job = saved.job;
            const closing = daysUntilClosing(job.closingDate);
            const isUrgent = closing && (closing === 'Closes today' || closing === 'Closes tomorrow');

            return (
              <div 
                key={saved.id}
                className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 hover:border-slate-600 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <Link 
                      href={`/jobs/${job.id}`}
                      className="text-lg font-semibold hover:text-blue-400 transition-colors"
                    >
                      {job.title}
                    </Link>
                    
                    <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-slate-400">
                      <span className="flex items-center gap-1">
                        <Building2 className="w-4 h-4" />
                        {job.company?.companyName}
                      </span>
                      {job.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          {job.location}
                        </span>
                      )}
                      {job.employmentType && (
                        <span className="flex items-center gap-1">
                          <Briefcase className="w-4 h-4" />
                          {formatEmploymentType(job.employmentType)}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-3 mt-3">
                      {formatSalary(job.salaryMin, job.salaryMax) && (
                        <span className="px-2 py-1 bg-green-900/30 text-green-400 text-xs rounded-full">
                          {formatSalary(job.salaryMin, job.salaryMax)}
                        </span>
                      )}
                      {closing && (
                        <span className={`flex items-center gap-1 px-2 py-1 text-xs rounded-full ${
                          isUrgent 
                            ? 'bg-red-900/30 text-red-400' 
                            : closing === 'Closed'
                              ? 'bg-slate-700 text-slate-400'
                              : 'bg-blue-900/30 text-blue-400'
                        }`}>
                          <Clock className="w-3 h-3" />
                          {closing}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Link
                      href={`/jobs/${job.id}`}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg font-medium transition-colors"
                    >
                      View Job
                    </Link>
                    <button
                      type="button"
                      onClick={() => removeSavedJob(saved.id)}
                      disabled={removing === saved.id}
                      className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
                      title="Remove from saved"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-slate-700 text-xs text-slate-500">
                  Saved {new Date(saved.savedAt).toLocaleDateString('en-AU', { 
                    day: 'numeric', 
                    month: 'short',
                    year: 'numeric'
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
