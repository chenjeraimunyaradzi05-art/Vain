'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Briefcase, Users, Eye, Plus, FileText, Settings, CreditCard, Building, Search, TrendingUp, Clock, CheckCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/apiClient';
import { getErrorMessage } from '@/lib/formatters';
// @ts-ignore
import AnnouncementsBanner from '@/components/AnnouncementsBanner';
// @ts-ignore
import SubscriptionBadge from '@/components/SubscriptionBadge';
import CandidateFunnel, { FunnelData } from '@/components/analytics/CandidateFunnel';

interface CompanyProfile {
  id: string;
  companyName: string;
  industry: string;
  logoUrl?: string;
  description?: string;
}

interface Job {
  id: string;
  title: string;
  status: string;
  _count?: {
    applications: number;
  };
}

interface Stats {
  activeJobs: number;
  totalApplications: number;
  totalViews: number;
}

export default function CompanyDashboard() {
  const { isAuthenticated, user, isLoading: authLoading } = useAuth();
  const [profile, setProfile] = useState<CompanyProfile | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [stats, setStats] = useState<Stats>({ activeJobs: 0, totalApplications: 0, totalViews: 0 });
  const [funnelData, setFunnelData] = useState<FunnelData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading) {
      if (isAuthenticated) {
        load();
      } else {
        setLoading(false);
        // Optionally redirect here if not handled by middleware
      }
    }
  }, [isAuthenticated, authLoading]);

  async function load() {
    setLoading(true);
    try {
      const [profileRes, jobsRes] = await Promise.all([
        api<{ profile: CompanyProfile }>('/company/profile'),
        api<{ jobs: Job[] }>('/company/jobs'),
      ]);

      if (profileRes.ok && profileRes.data) {
        setProfile(profileRes.data.profile);
      }

      if (jobsRes.ok && jobsRes.data) {
        const jobsData = jobsRes.data.jobs || [];
        setJobs(jobsData);
        
        // Calculate stats
        const activeJobs = jobsData.filter(j => j.status !== 'ARCHIVED').length; // Assuming status field exists or logic
        const totalApplications = jobsData.reduce((acc, job) => acc + (job._count?.applications || 0), 0);
        
        setStats({
          activeJobs,
          totalApplications,
          totalViews: 450, // Placeholder from AnalyticsService in future
        });

        // Mock Funnel Data for Visualization (Sprint 1)
        // Real implementation will aggregate from /api/analytics
        setFunnelData([
            { stage: 'Views', count: 450, fill: '#3B82F6' },
            { stage: 'Applications', count: totalApplications || 45, fill: '#8B5CF6' },
            { stage: 'Interview', count: Math.floor((totalApplications || 45) * 0.4), fill: '#EC4899' },
            { stage: 'Offer', count: Math.floor((totalApplications || 45) * 0.1), fill: '#10B981' },
            { stage: 'Hired', count: Math.floor((totalApplications || 45) * 0.05), fill: '#F59E0B' },
        ]);
      }

    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to load dashboard'));
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-3 py-12 min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-slate-700 border-t-blue-500" />
        <span className="text-slate-400">Loading dashboard...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto py-12 px-4">
        <div className="text-red-200 bg-red-950/40 border border-red-900/60 p-3 rounded">{error}</div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-12 px-4">
      <AnnouncementsBanner />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">
            {profile?.companyName || 'Company Dashboard'}
          </h1>
          <div className="flex items-center gap-3 text-slate-400">
            <Building className="w-4 h-4" />
            <span>{profile?.industry || 'Industry not set'}</span>
            <span className="text-slate-600">•</span>
            <SubscriptionBadge />
          </div>
        </div>
        <div className="flex gap-3">
          <Link 
            href="/company/jobs/new" 
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Post a Job
          </Link>
          <Link 
            href="/company/settings" 
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <Settings className="w-4 h-4" />
            Settings
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Briefcase className="w-6 h-6 text-blue-400" />
            </div>
            <span className="text-xs font-medium text-slate-400 bg-slate-800 px-2 py-1 rounded">Active</span>
          </div>
          <div className="text-3xl font-bold text-white mb-1">{stats.activeJobs}</div>
          <div className="text-sm text-slate-400">Active Job Listings</div>
        </div>

        <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-purple-500/10 rounded-lg">
              <Users className="w-6 h-6 text-purple-400" />
            </div>
            <span className="text-xs font-medium text-slate-400 bg-slate-800 px-2 py-1 rounded">Total</span>
          </div>
          <div className="text-3xl font-bold text-white mb-1">{stats.totalApplications}</div>
          <div className="text-sm text-slate-400">Total Applications</div>
        </div>

        <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-emerald-500/10 rounded-lg">
              <Eye className="w-6 h-6 text-emerald-400" />
            </div>
            <span className="text-xs font-medium text-emerald-400 bg-emerald-900/20 px-2 py-1 rounded">+12%</span>
          </div>
          <div className="text-3xl font-bold text-white mb-1">{stats.totalViews}</div>
          <div className="text-sm text-slate-400">Profile Views</div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Recent Jobs & Analytics */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Candidate Funnel Chart */}
          <div>
             <CandidateFunnel data={funnelData} title="Candidate Pipeline Overview" />
          </div>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white">Recent Jobs</h2>
            <Link href="/company/jobs" className="text-sm text-blue-400 hover:text-blue-300">View all</Link>
          </div>

          <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden">
            {jobs.length > 0 ? (
              <div className="divide-y divide-slate-800">
                {jobs.slice(0, 5).map((job) => (
                  <div key={job.id} className="p-4 hover:bg-slate-800/50 transition-colors flex items-center justify-between">
                    <div>
                      <Link href={`/company/jobs/${job.id}`} className="font-medium text-white hover:text-blue-400 transition-colors block mb-1">
                        {job.title}
                      </Link>
                      <div className="flex items-center gap-4 text-sm text-slate-400">
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {job._count?.applications || 0} applicants
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Posted recently
                        </span>
                      </div>
                    </div>
                    <Link 
                      href={`/company/jobs/${job.id}`}
                      className="px-3 py-1.5 text-sm border border-slate-700 rounded-lg hover:bg-slate-800 text-slate-300"
                    >
                      Manage
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-800 mb-4">
                  <Briefcase className="w-6 h-6 text-slate-400" />
                </div>
                <h3 className="text-lg font-medium text-white mb-2">No jobs posted yet</h3>
                <p className="text-slate-400 mb-6 max-w-sm mx-auto">
                  Get started by posting your first job listing to reach thousands of candidates.
                </p>
                <Link 
                  href="/company/jobs/new" 
                  className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Post a Job
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Quick Actions</h2>
            <div className="space-y-2">
              <Link href="/company/search" className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition-colors">
                <Search className="w-5 h-5 text-slate-500" />
                <span>Search Candidates</span>
              </Link>
              <Link href="/company/billing" className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition-colors">
                <CreditCard className="w-5 h-5 text-slate-500" />
                <span>Manage Subscription</span>
              </Link>
              <Link href="/company/analytics" className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition-colors">
                <TrendingUp className="w-5 h-5 text-slate-500" />
                <span>View Analytics</span>
              </Link>
            </div>
          </div>

          {/* Profile Completion */}
          <div className="bg-gradient-to-br from-indigo-900/20 to-slate-900/50 border border-indigo-500/20 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Profile Status</h2>
              <span className="text-sm font-medium text-indigo-400">85%</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-2 mb-4">
              <div className="bg-indigo-500 h-2 rounded-full" style={{ width: '85%' }}></div>
            </div>
            <p className="text-sm text-slate-400 mb-4">
              Complete your company profile to attract more candidates.
            </p>
            <Link href="/company/profile" className="text-sm text-indigo-400 hover:text-indigo-300 font-medium">
              Update Profile &rarr;
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
