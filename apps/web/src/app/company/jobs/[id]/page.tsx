'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Briefcase, MapPin, Users, Eye, Clock, Edit, FileText, Star, MoreHorizontal } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/apiClient';
import { getErrorMessage } from '@/lib/formatters';

interface Job {
  id: string;
  title: string;
  description: string;
  location?: string;
  employment?: string;
  salaryLow?: number;
  salaryHigh?: number;
  isActive: boolean;
  createdAt: string;
  viewCount: number;
  _count?: {
    applications: number;
  };
}

export default function JobDashboard() {
  const { isAuthenticated } = useAuth();
  const params = useParams();
  const id = params?.id as string;

  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await api<{ job: Job }>(`/company/jobs/${id}`);
      if (res.ok && res.data) {
        setJob(res.data.job);
      } else {
        setError('Job not found');
      }
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to load job'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (isAuthenticated && id) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-slate-700 border-t-blue-500" />
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="max-w-6xl mx-auto py-12 px-4">
        <div className="text-red-200 bg-red-950/40 border border-red-900/60 p-3 rounded">{error || 'Job not found'}</div>
        <Link href="/company/jobs" className="text-blue-400 hover:text-blue-300 mt-4 inline-block">
          &larr; Back to Jobs
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-12 px-4">
      <Link href="/company/jobs" className="flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Back to Jobs
      </Link>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold text-white">{job.title}</h1>
            <span className={`px-2 py-0.5 text-xs rounded-full border ${
              job.isActive 
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                : 'bg-slate-700/50 text-slate-400 border-slate-600'
            }`}>
              {job.isActive ? 'Active' : 'Closed'}
            </span>
          </div>
          <div className="flex items-center gap-4 text-slate-400 text-sm">
            {job.location && (
              <span className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                {job.location}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Briefcase className="w-4 h-4" />
              {job.employment || 'Full Time'}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              Posted {new Date(job.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>
        <div className="flex gap-3">
          <Link 
            href={`/company/jobs/${id}/edit`}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <Edit className="w-4 h-4" />
            Edit Job
          </Link>
          <Link 
            href={`/company/jobs/${id}/feature`}
            className="flex items-center gap-2 bg-amber-600/10 hover:bg-amber-600/20 text-amber-500 border border-amber-600/20 px-4 py-2 rounded-lg transition-colors"
          >
            <Star className="w-4 h-4" />
            Promote
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Link href={`/company/jobs/${id}/applicants`} className="bg-slate-900/50 border border-slate-800 p-6 rounded-xl hover:bg-slate-800/50 transition-colors group">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-blue-500/10 rounded-lg group-hover:bg-blue-500/20 transition-colors">
              <Users className="w-6 h-6 text-blue-400" />
            </div>
            <span className="text-xs font-medium text-blue-400 bg-blue-900/20 px-2 py-1 rounded">View All</span>
          </div>
          <div className="text-3xl font-bold text-white mb-1">{job._count?.applications || 0}</div>
          <div className="text-sm text-slate-400">Total Applications</div>
        </Link>

        <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-emerald-500/10 rounded-lg">
              <Eye className="w-6 h-6 text-emerald-400" />
            </div>
          </div>
          <div className="text-3xl font-bold text-white mb-1">{job.viewCount || 0}</div>
          <div className="text-sm text-slate-400">Job Views</div>
        </div>

        <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-purple-500/10 rounded-lg">
              <FileText className="w-6 h-6 text-purple-400" />
            </div>
          </div>
          <div className="text-3xl font-bold text-white mb-1">
            {job.salaryLow && job.salaryHigh 
              ? `$${(job.salaryLow/1000).toFixed(0)}k - $${(job.salaryHigh/1000).toFixed(0)}k`
              : 'Not set'}
          </div>
          <div className="text-sm text-slate-400">Salary Range</div>
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Description</h2>
            <div className="prose prose-invert max-w-none text-slate-300">
              <div className="whitespace-pre-wrap">{job.description}</div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Quick Actions</h2>
            <div className="space-y-2">
              <Link 
                href={`/company/jobs/${id}/applicants`}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
              >
                <span className="flex items-center gap-3">
                  <Users className="w-5 h-5 text-slate-500" />
                  Review Applicants
                </span>
                <span className="bg-slate-800 text-slate-400 text-xs px-2 py-1 rounded-full">
                  {job._count?.applications || 0}
                </span>
              </Link>
              <Link 
                href={`/company/jobs/${id}/edit`}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
              >
                <Edit className="w-5 h-5 text-slate-500" />
                <span>Edit Job Details</span>
              </Link>
              <button className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition-colors text-left">
                <MoreHorizontal className="w-5 h-5 text-slate-500" />
                <span>More Options</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
