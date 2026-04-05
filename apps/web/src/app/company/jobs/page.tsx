'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Briefcase, Plus, Users, Clock, Search, Filter, MoreVertical, Trash2, Eye, EyeOff, Edit } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/apiClient';
import { getErrorMessage } from '@/lib/formatters';
// @ts-ignore
import SubscriptionBadge from '@/components/SubscriptionBadge';

interface Job {
  id: string;
  title: string;
  status: string; // 'OPEN' | 'CLOSED' | 'ARCHIVED' | 'DRAFT'
  isActive: boolean; // Legacy field, mapped to status in UI if needed
  location?: string;
  employment?: string;
  createdAt: string;
  expiresAt?: string;
  _count?: {
    applications: number;
  };
}

interface Subscription {
  tier: string;
  limits: {
    maxJobs: number;
  };
  activeJobs: number;
}

export default function CompanyJobsList() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('ALL'); // ALL, OPEN, CLOSED, DRAFT

  useEffect(() => {
    if (!authLoading) {
      if (isAuthenticated) {
        load();
      } else {
        setLoading(false);
      }
    }
  }, [isAuthenticated, authLoading]);

  async function load() {
    setLoading(true);
    try {
      const [jobsRes, subRes] = await Promise.all([
        api<{ jobs: Job[] }>('/company/jobs'),
        api<{ subscription: Subscription }>('/subscriptions/v2/me'),
      ]);

      if (jobsRes.ok && jobsRes.data) {
        setJobs(jobsRes.data.jobs);
      }

      if (subRes.ok && subRes.data) {
        setSubscription(subRes.data.subscription);
      }
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to load jobs'));
    } finally {
      setLoading(false);
    }
  }

  async function toggleStatus(job: Job) {
    // Toggle between OPEN and CLOSED (or isActive true/false)
    const newStatus = job.isActive ? false : true; // Legacy logic
    // Or if using status enum:
    // const newStatus = job.status === 'OPEN' ? 'CLOSED' : 'OPEN';
    
    try {
      const res = await api(`/company/jobs/${job.id}`, {
        method: 'PATCH',
        body: { isActive: newStatus }, // Sending isActive as per legacy/schema
      });

      if (res.ok) {
        setJobs(jobs.map(j => j.id === job.id ? { ...j, isActive: newStatus, status: newStatus ? 'OPEN' : 'CLOSED' } : j));
      }
    } catch (err: unknown) {
      alert('Failed to update status: ' + getErrorMessage(err));
    }
  }

  async function deleteJob(id: string) {
    if (!confirm('Are you sure you want to delete this job? This cannot be undone.')) return;

    try {
      const res = await api(`/company/jobs/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setJobs(jobs.filter(j => j.id !== id));
      }
    } catch (err: unknown) {
      alert('Failed to delete job: ' + getErrorMessage(err));
    }
  }

  const filteredJobs = jobs.filter(job => {
    if (filter === 'ALL') return true;
    if (filter === 'OPEN') return job.isActive;
    if (filter === 'CLOSED') return !job.isActive;
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-slate-700 border-t-blue-500" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-12 px-4">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Job Listings</h1>
          <p className="text-slate-400">Manage your open positions and applications.</p>
        </div>
        <Link 
          href="/company/jobs/new" 
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Post a Job
        </Link>
      </div>

      {/* Filters & Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="md:col-span-3 bg-slate-900/50 border border-slate-800 p-4 rounded-xl flex items-center gap-4">
          <div className="flex items-center gap-2 text-slate-400 border-r border-slate-800 pr-4">
            <Filter className="w-4 h-4" />
            <span className="text-sm font-medium">Filter:</span>
          </div>
          <div className="flex gap-2">
            {['ALL', 'OPEN', 'CLOSED'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                  filter === f 
                    ? 'bg-blue-600 text-white' 
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                {f.charAt(0) + f.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
          <span className="text-slate-400 text-sm">Active Jobs</span>
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold text-white">
              {subscription?.activeJobs || 0}
              <span className="text-slate-500 text-sm font-normal">
                / {subscription?.limits?.maxJobs === -1 ? '∞' : subscription?.limits?.maxJobs || 1}
              </span>
            </span>
          </div>
        </div>
      </div>

      {/* Jobs List */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden">
        {filteredJobs.length > 0 ? (
          <div className="divide-y divide-slate-800">
            {filteredJobs.map((job) => (
              <div key={job.id} className="p-6 hover:bg-slate-800/30 transition-colors">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Link href={`/company/jobs/${job.id}`} className="text-lg font-semibold text-white hover:text-blue-400 transition-colors">
                        {job.title}
                      </Link>
                      <span className={`px-2 py-0.5 text-xs rounded-full border ${
                        job.isActive 
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                          : 'bg-slate-700/50 text-slate-400 border-slate-600'
                      }`}>
                        {job.isActive ? 'Active' : 'Closed'}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-slate-400">
                      {job.location && (
                        <span className="flex items-center gap-1">
                          <Briefcase className="w-3 h-3" />
                          {job.location}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {job._count?.applications || 0} applicants
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Posted {new Date(job.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Link 
                      href={`/company/jobs/${job.id}/edit`}
                      className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                      title="Edit Job"
                    >
                      <Edit className="w-4 h-4" />
                    </Link>
                    <button
                      onClick={() => toggleStatus(job)}
                      className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                      title={job.isActive ? "Close Job" : "Reopen Job"}
                    >
                      {job.isActive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => deleteJob(job.id)}
                      className="p-2 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-lg transition-colors"
                      title="Delete Job"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <Link 
                      href={`/company/jobs/${job.id}`}
                      className="ml-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium rounded-lg transition-colors"
                    >
                      Manage
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-800 mb-4">
              <Search className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-xl font-medium text-white mb-2">No jobs found</h3>
            <p className="text-slate-400 mb-6">
              {filter !== 'ALL' 
                ? `You don't have any ${filter.toLowerCase()} jobs.` 
                : "You haven't posted any jobs yet."}
            </p>
            {filter === 'ALL' && (
              <Link 
                href="/company/jobs/new" 
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors"
              >
                <Plus className="w-5 h-5" />
                Post Your First Job
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
