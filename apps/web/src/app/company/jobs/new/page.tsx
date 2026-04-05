'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Briefcase, MapPin, DollarSign, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/apiClient';
import { getErrorMessage } from '@/lib/formatters';

interface Subscription {
  tier: string;
  limits: {
    maxJobs: number;
  };
  activeJobs: number;
  canPostMore: boolean;
}

export default function NewJobPage() {
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [employment, setEmployment] = useState('FULL_TIME');
  const [salaryLow, setSalaryLow] = useState('');
  const [salaryHigh, setSalaryHigh] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [checkingLimit, setCheckingLimit] = useState(true);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated) checkSubscription();
  }, [isAuthenticated]);

  async function checkSubscription() {
    try {
      const res = await api<{ subscription: Subscription }>('/subscriptions/v2/me');
      if (res.ok && res.data) {
        setSubscription(res.data.subscription);
      }
    } catch (err) {
      console.error('Failed to check subscription:', err);
    } finally {
      setCheckingLimit(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    
    if (!title || !description) {
      setError('Title and description are required');
      return;
    }

    setLoading(true);
    try {
      const body = {
        title,
        description,
        location,
        employment,
        salaryLow: salaryLow ? Number(salaryLow) : undefined,
        salaryHigh: salaryHigh ? Number(salaryHigh) : undefined,
      };

      const res = await api('/company/jobs', {
        method: 'POST',
        body,
      });

      if (res.ok) {
        router.push('/company/jobs');
      } else {
        // Handle specific errors if needed
        if (res.status === 403) {
           setError('Job limit reached. Please upgrade your plan.');
        } else {
           setError(res.error || 'Failed to create job');
        }
      }
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Create failed'));
    } finally {
      setLoading(false);
    }
  }

  if (checkingLimit) {
    return (
      <div className="flex items-center justify-center py-12 min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-slate-700 border-t-blue-500" />
      </div>
    );
  }

  const canPostMore = subscription?.canPostMore !== false;
  const activeJobs = subscription?.activeJobs ?? 0;
  const maxJobs = subscription?.limits?.maxJobs ?? 1;

  return (
    <div className="max-w-3xl mx-auto py-12 px-4">
      <Link href="/company/jobs" className="flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Back to Jobs
      </Link>
      
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-white">Post a New Job</h1>
        {subscription && (
          <div className="text-right">
            <div className="text-sm text-slate-400">Plan Usage</div>
            <div className="font-medium text-white">
              {activeJobs} / {maxJobs === -1 ? '∞' : maxJobs} jobs
            </div>
          </div>
        )}
      </div>

      {!canPostMore && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-6 mb-8 flex items-start gap-4">
          <AlertCircle className="w-6 h-6 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-lg font-semibold text-amber-500 mb-1">Limit Reached</h3>
            <p className="text-slate-300 mb-4">
              You have reached the maximum number of active jobs for your current plan. 
              Please upgrade your subscription to post more jobs.
            </p>
            <Link href="/company/billing" className="text-amber-400 hover:text-amber-300 font-medium underline">
              Upgrade Plan
            </Link>
          </div>
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-6">
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-lg flex items-center gap-3">
            <AlertCircle className="w-5 h-5" />
            {error}
          </div>
        )}

        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Job Title *</label>
            <div className="relative">
              <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2.5 pl-10 pr-4 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="e.g. Senior Software Engineer"
                disabled={!canPostMore || loading}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Location</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2.5 pl-10 pr-4 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="e.g. Sydney, NSW (Remote)"
                disabled={!canPostMore || loading}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Employment Type</label>
              <select
                value={employment}
                onChange={(e) => setEmployment(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2.5 px-4 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                disabled={!canPostMore || loading}
              >
                <option value="FULL_TIME">Full Time</option>
                <option value="PART_TIME">Part Time</option>
                <option value="CONTRACT">Contract</option>
                <option value="CASUAL">Casual</option>
                <option value="APPRENTICESHIP">Apprenticeship</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Salary Range (Annual)</label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="number"
                    value={salaryLow}
                    onChange={(e) => setSalaryLow(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2.5 pl-9 pr-4 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="Min"
                    disabled={!canPostMore || loading}
                  />
                </div>
                <span className="text-slate-500">-</span>
                <div className="relative flex-1">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="number"
                    value={salaryHigh}
                    onChange={(e) => setSalaryHigh(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2.5 pl-9 pr-4 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="Max"
                    disabled={!canPostMore || loading}
                  />
                </div>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Description *</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg py-3 px-4 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all min-h-[200px]"
              placeholder="Describe the role, responsibilities, and requirements..."
              disabled={!canPostMore || loading}
              required
            />
            <p className="text-xs text-slate-500 mt-2">Markdown formatting is supported.</p>
          </div>
        </div>

        <div className="flex justify-end gap-4">
          <Link 
            href="/company/jobs"
            className="px-6 py-2.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={!canPostMore || loading}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Posting...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                Post Job
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
