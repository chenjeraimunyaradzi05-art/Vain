"use client";
import { useEffect, useMemo, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import useAuth from '../../../hooks/useAuth';
import { useNotifications } from '../../../components/notifications/NotificationProvider';
import api from '@/lib/apiClient';
import { API_BASE } from '@/lib/apiBase';
import { getAccessToken } from '@/lib/tokenStore';

export default function CompanyAnalytics() {
  const { isAuthenticated } = useAuth();
  const { showNotification } = useNotifications();
  const [analytics, setAnalytics] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [impactMetrics, setImpactMetrics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('30d');
  const [selectedJobId, setSelectedJobId] = useState(null);
  const [jobTrend, setJobTrend] = useState([]);
  const [trendLoading, setTrendLoading] = useState(false);
  const [trendError, setTrendError] = useState(null);
  const [seriesVisibility, setSeriesVisibility] = useState({
    views: true,
    applications: true,
    clicks: true,
    searchImpressions: true,
    recommendationImpressions: true,
  });

  useEffect(() => {
    async function load() {
      if (!isAuthenticated) return setLoading(false);
      setLoading(true);
      try {
        // Try employer dashboard endpoint first (for tests), then fall back
        let analyticsRes = await api(`/analytics/employer/dashboard?period=${period}`);
        if (!analyticsRes.ok) {
          analyticsRes = await api(`/analytics/company?period=${period}`);
        }

        const [subRes, jobsRes, impactRes] = await Promise.all([
          api('/subscriptions/v2/me'),
          api('/analytics/employer/jobs').catch(() => null),
          api('/analytics/impact').catch(() => null),
        ]);

        if (analyticsRes.ok) setAnalytics(analyticsRes.data);
        if (subRes.ok) setSubscription(subRes.data?.subscription);
        if (jobsRes?.ok) setJobs(jobsRes.data?.jobs || []);
        if (impactRes?.ok) setImpactMetrics(impactRes.data?.metrics || []);
      } catch (err) {
        console.error('Failed to load analytics');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [isAuthenticated, period]);

  const stats = useMemo(() => {
    const totalViews = analytics?.totalViews || analytics?.totalJobs || 0;
    const totalApplications = analytics?.totalApplications || 0;
    const totalInterviews = analytics?.totalInterviews || analytics?.activeJobs || 0;
    const totalHires = analytics?.totalHires || analytics?.hiredCount || 0;
    const avgTimeToHire = Number.isFinite(analytics?.avgTimeToHire) ? analytics?.avgTimeToHire : null;
    const conversionRate = totalViews > 0 ? Math.round((totalApplications / totalViews) * 100) : 0;
    const statusCounts = analytics?.applicationsByStatus || {};
    const statusTotal = Object.values(statusCounts).reduce((sum, count) => sum + (Number(count) || 0), 0);
    const topJobs = Array.isArray(jobs)
      ? [...jobs].sort((a, b) => (b.applications || 0) - (a.applications || 0)).slice(0, 5)
      : [];

    return {
      totalViews,
      totalApplications,
      totalInterviews,
      totalHires,
      avgTimeToHire,
      conversionRate,
      statusCounts,
      statusTotal,
      topJobs,
    };
  }, [analytics, jobs]);

  const periodDays = useMemo(() => {
    const parsed = parseInt(period, 10);
    return Number.isFinite(parsed) ? parsed : 30;
  }, [period]);

  useEffect(() => {
    if (!selectedJobId && jobs.length > 0) {
      setSelectedJobId(jobs[0].id);
    }
  }, [jobs, selectedJobId]);

  useEffect(() => {
    async function loadTrend() {
      if (!selectedJobId) return;
      setTrendLoading(true);
      setTrendError(null);
      try {
        const res = await api(`/job-performance/${selectedJobId}?days=${periodDays}`);
        if (!res.ok) throw new Error('Failed to fetch job performance');
        setJobTrend(res.data?.trendData || []);
      } catch (err) {
        setTrendError(err.message || 'Failed to load trend data');
        setJobTrend([]);
      } finally {
        setTrendLoading(false);
      }
    }
    loadTrend();
  }, [selectedJobId, periodDays]);

  const hasClicks = jobTrend.some((point) => Number(point?.clicks || 0) > 0);
  const hasSearchImpressions = jobTrend.some((point) => Number(point?.searchImpressions || 0) > 0);
  const hasRecommendationImpressions = jobTrend.some(
    (point) => Number(point?.recommendationImpressions || 0) > 0
  );

  const toggleSeries = (key) => {
    setSeriesVisibility((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Check if analytics access is allowed
  const hasAnalyticsAccess = subscription?.limits?.analytics ?? false;

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto py-12 px-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-800 rounded w-48"></div>
          <div className="grid grid-cols-4 gap-4">
            <div className="h-24 bg-slate-800 rounded"></div>
            <div className="h-24 bg-slate-800 rounded"></div>
            <div className="h-24 bg-slate-800 rounded"></div>
            <div className="h-24 bg-slate-800 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!hasAnalyticsAccess && subscription?.tier === 'FREE') {
    return (
      <div className="max-w-5xl mx-auto py-12 px-4">
        <a href="/company/dashboard" className="text-blue-300 hover:text-blue-200 text-sm mb-4 inline-block">← Dashboard</a>
        <div className="bg-gradient-to-br from-blue-950/40 to-slate-900/40 border border-blue-900/40 rounded-xl p-8 text-center">
          <div className="text-5xl mb-4">📊</div>
          <h2 className="text-2xl font-bold mb-2">Analytics Dashboard</h2>
          <p className="text-slate-300 mb-6 max-w-lg mx-auto">
            Unlock detailed hiring analytics, application funnels, and performance metrics 
            with a paid subscription plan.
          </p>
          <a href="/company/billing" className="inline-block px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-500 transition">
            Upgrade to Starter
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-12 px-4">
      {/* Breadcrumb */}
      <nav className="mb-6 text-sm" aria-label="Breadcrumb">
        <ol className="flex items-center gap-2 text-slate-400">
          <li><a href="/company/dashboard" className="hover:text-blue-400 transition-colors">Dashboard</a></li>
          <li><span className="text-slate-600">/</span></li>
          <li className="text-white">Analytics</li>
        </ol>
      </nav>
      
      <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6 mb-8">
        <div className="absolute -top-16 -right-16 h-48 w-48 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-48 w-48 rounded-full bg-purple-500/10 blur-3xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm text-slate-400">Company Analytics</p>
            <h1 className="text-2xl font-bold text-white">Analytics Dashboard</h1>
            <p className="text-sm text-slate-400 mt-1">
              Track hiring velocity, funnel health, and Indigenous impact at a glance.
            </p>
          </div>
          <div className="flex gap-2">
            {['7d', '30d', '90d'].map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 text-sm rounded-full transition border ${
                  period === p
                    ? 'bg-blue-600/90 text-white border-blue-500'
                    : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800'
                }`}
              >
                {p === '7d' ? '7 Days' : p === '30d' ? '30 Days' : '90 Days'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Subscription Status */}
      {subscription && (
        <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-xl mb-8 flex flex-wrap justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{subscription.tier === 'FREE' ? '🆓' : subscription.tier === 'RAP' ? '🏆' : '⭐'}</span>
            <div>
              <span className="text-xs text-slate-400">Current Plan</span>
              <div className="font-semibold text-blue-300 text-lg">{subscription.tier}</div>
            </div>
          </div>
          <div className="text-sm text-slate-300">
            <span className="text-slate-500">Active jobs</span>
            <span className="ml-2 font-semibold text-white">
              {subscription.activeJobs || 0} / {subscription.limits?.maxJobs === -1 ? '∞' : subscription.limits?.maxJobs}
            </span>
          </div>
          <div className="flex gap-2 items-center">
            {subscription.tier !== 'RAP' && subscription.tier !== 'ENTERPRISE' && (
              <a href="/company/billing" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-500">
                Upgrade
              </a>
            )}
          </div>
        </div>
      )}

      {/* Per-Job Trends */}
      <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-lg mb-8">
              <h3 className="text-lg font-semibold mb-4">Per-Job Trends</h3>
              <label className="text-xs text-slate-400">Select job</label>
              <select
                value={selectedJobId || ''}
                onChange={(e) => setSelectedJobId(e.target.value)}
                className="mt-2 w-full bg-slate-950 border border-slate-700 text-slate-200 text-sm rounded-lg px-3 py-2"
              >
                {jobs.map((job) => (
                  <option key={job.id} value={job.id}>
                    {job.title}
                  </option>
                ))}
              </select>

              <div className="mt-4 flex flex-wrap gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => toggleSeries('views')}
                  className={`px-2 py-1 rounded border ${seriesVisibility.views ? 'border-blue-500 text-blue-300' : 'border-slate-700 text-slate-500'}`}
                >
                  Views
                </button>
                <button
                  type="button"
                  onClick={() => toggleSeries('applications')}
                  className={`px-2 py-1 rounded border ${seriesVisibility.applications ? 'border-emerald-500 text-emerald-300' : 'border-slate-700 text-slate-500'}`}
                >
                  Applications
                </button>
                {hasClicks && (
                  <button
                    type="button"
                    onClick={() => toggleSeries('clicks')}
                    className={`px-2 py-1 rounded border ${seriesVisibility.clicks ? 'border-amber-500 text-amber-300' : 'border-slate-700 text-slate-500'}`}
                  >
                    Clicks
                  </button>
                )}
                {hasSearchImpressions && (
                  <button
                    type="button"
                    onClick={() => toggleSeries('searchImpressions')}
                    className={`px-2 py-1 rounded border ${seriesVisibility.searchImpressions ? 'border-purple-500 text-purple-300' : 'border-slate-700 text-slate-500'}`}
                  >
                    Search Impressions
                  </button>
                )}
                {hasRecommendationImpressions && (
                  <button
                    type="button"
                    onClick={() => toggleSeries('recommendationImpressions')}
                    className={`px-2 py-1 rounded border ${seriesVisibility.recommendationImpressions ? 'border-pink-500 text-pink-300' : 'border-slate-700 text-slate-500'}`}
                  >
                    Recommendation Impressions
                  </button>
                )}
              </div>

              <div className="mt-4 h-56">
                {trendLoading ? (
                  <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                    Loading trend…
                  </div>
                ) : trendError ? (
                  <div className="h-full flex items-center justify-center text-red-300 text-sm">
                    {trendError}
                  </div>
                ) : jobTrend.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-slate-500 text-sm">
                    No trend data yet.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={jobTrend} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                      <XAxis dataKey="date" stroke="#94a3b8" tick={{ fontSize: 10 }} />
                      <YAxis stroke="#94a3b8" tick={{ fontSize: 10 }} />
                      <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1e293b' }} />
                      {seriesVisibility.views && (
                        <Line type="monotone" dataKey="views" stroke="#3b82f6" strokeWidth={2} dot={false} />
                      )}
                      {seriesVisibility.applications && (
                        <Line type="monotone" dataKey="applications" stroke="#22c55e" strokeWidth={2} dot={false} />
                      )}
                      {hasClicks && seriesVisibility.clicks && (
                        <Line type="monotone" dataKey="clicks" stroke="#f59e0b" strokeWidth={2} dot={false} />
                      )}
                      {hasSearchImpressions && seriesVisibility.searchImpressions && (
                        <Line type="monotone" dataKey="searchImpressions" stroke="#a855f7" strokeWidth={2} dot={false} />
                      )}
                      {hasRecommendationImpressions && seriesVisibility.recommendationImpressions && (
                        <Line type="monotone" dataKey="recommendationImpressions" stroke="#ec4899" strokeWidth={2} dot={false} />
                      )}
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
              <div className="mt-3 text-xs text-slate-500 flex items-center justify-between">
                <span>
                  Views (blue) · Applications (green)
                  {hasClicks && ' · Clicks (orange)'}
                  {hasSearchImpressions && ' · Search Impressions (purple)'}
                  {hasRecommendationImpressions && ' · Recommendation Impressions (pink)'}
                </span>
                <span>{periodDays} day window</span>
              </div>
      </div>

      {/* Export company CTA events (if user has analytics access) */}
      {hasAnalyticsAccess && (
        <button
          onClick={async () => {
            try {
              const token = getAccessToken();
              if (!token) {
                showNotification({ message: 'Session expired. Please sign in again.', variant: 'error' });
                return;
              }
              const res = await fetch(`${API_BASE}/analytics/company/cta-export?days=30`, {
                headers: { Authorization: `Bearer ${token}` },
              });
              if (!res.ok) throw new Error('Export failed');
              const blob = await res.blob();
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `company-cta-events-${new Date().toISOString().split('T')[0]}.csv`;
              document.body.appendChild(a);
              a.click();
              a.remove();
              URL.revokeObjectURL(url);
            } catch (err) {
              console.error(err);
              showNotification({ message: 'Export failed', variant: 'error' });
            }
          }}
          className="px-4 py-2 border border-slate-700 text-slate-200 rounded-lg text-sm hover:bg-slate-800 mb-8"
        >
          Export CTA CSV
        </button>
      )}

      {/* Stats Grid */}
      {analytics && (
        <div className="grid gap-4 md:grid-cols-5 mb-6">
          <StatCard
            label="Total Views"
            value={stats.totalViews}
            accent="text-blue-400"
            change={analytics.viewsChange}
          />
          <StatCard
            label="Applications"
            value={stats.totalApplications}
            accent="text-emerald-400"
            change={analytics.applicationsChange}
          />
          <StatCard
            label="Interviews"
            value={stats.totalInterviews}
            accent="text-purple-400"
          />
          <StatCard
            label="Hired"
            value={stats.totalHires}
            accent="text-amber-400"
          />
          <StatCard
            label="Avg Time to Hire"
            value={stats.avgTimeToHire === null ? '—' : `${stats.avgTimeToHire}d`}
            accent="text-cyan-400"
          />
        </div>
      )}

      {/* Quick Insights */}
      {analytics && (
        <div className="grid gap-4 lg:grid-cols-3 mb-8">
          <InsightCard
            title="Conversion Rate"
            value={`${stats.conversionRate}%`}
            subtitle="Applications per view"
            barValue={stats.conversionRate}
            barColor="bg-blue-500"
          />
          <InsightCard
            title="Interview Ratio"
            value={stats.totalApplications > 0 ? `${Math.round((stats.totalInterviews / stats.totalApplications) * 100)}%` : '0%'}
            subtitle="Interviews per application"
            barValue={stats.totalApplications > 0 ? Math.round((stats.totalInterviews / stats.totalApplications) * 100) : 0}
            barColor="bg-purple-500"
          />
          <InsightCard
            title="Hire Rate"
            value={stats.totalApplications > 0 ? `${Math.round((stats.totalHires / stats.totalApplications) * 100)}%` : '0%'}
            subtitle="Hires per application"
            barValue={stats.totalApplications > 0 ? Math.round((stats.totalHires / stats.totalApplications) * 100) : 0}
            barColor="bg-emerald-500"
          />
        </div>
      )}

      {/* Indigenous Employment Impact */}
      {(analytics?.indigenousHires !== undefined || analytics?.rapProgress !== undefined || impactMetrics.length > 0) && (
        <div className="bg-gradient-to-br from-amber-950/40 to-slate-900/40 border border-amber-900/40 p-6 rounded-lg mb-8">
          <h3 className="text-lg font-semibold mb-4 text-amber-200">🌟 Indigenous Employment Impact</h3>
          <div className="grid gap-4 md:grid-cols-3 mb-6">
            <div className="bg-slate-900/60 p-4 rounded text-center">
              <div className="text-3xl font-bold text-amber-400">{analytics?.indigenousHires || 0}</div>
              <div className="text-sm text-slate-300">Indigenous Candidates Hired</div>
            </div>
            <div className="bg-slate-900/60 p-4 rounded text-center">
              <div className="text-3xl font-bold text-amber-400">{analytics?.indigenousHireRate || 0}%</div>
              <div className="text-sm text-slate-300">Indigenous Hire Rate</div>
            </div>
            <div className="bg-slate-900/60 p-4 rounded text-center">
              <div className="text-3xl font-bold text-amber-400">{analytics?.rapProgress || 0}%</div>
              <div className="text-sm text-slate-300">RAP Target Progress</div>
            </div>
          </div>
          
          {/* Additional Impact Metrics from DB */}
          {impactMetrics.length > 0 && (
            <div className="border-t border-amber-900/30 pt-4">
              <h4 className="text-sm font-medium text-slate-400 mb-3">Platform Impact Metrics</h4>
              <div className="grid gap-3 md:grid-cols-4">
                {impactMetrics.slice(0, 4).map((metric) => (
                  <div key={metric.id} className="bg-slate-900/40 border border-slate-700 p-3 rounded">
                    <div className="text-xl font-bold text-amber-300">{metric.value?.toLocaleString() || 0}</div>
                    <div className="text-xs text-slate-400">{metric.metric?.replace(/_/g, ' ')}</div>
                    <div className="text-xs text-slate-500 mt-1">{metric.period}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Job Performance */}
      {jobs && jobs.length > 0 && (
        <div className="grid gap-6 lg:grid-cols-3 mb-8">
          <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-lg lg:col-span-2">
            <h3 className="text-lg font-semibold mb-4">Job Performance</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left py-2 px-3 text-slate-400 font-medium">Job Title</th>
                    <th className="text-left py-2 px-3 text-slate-400 font-medium">Location</th>
                    <th className="text-right py-2 px-3 text-slate-400 font-medium">Views</th>
                    <th className="text-right py-2 px-3 text-slate-400 font-medium">Applications</th>
                    <th className="text-right py-2 px-3 text-slate-400 font-medium">Apply Rate</th>
                    <th className="text-center py-2 px-3 text-slate-400 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((job) => (
                    <tr key={job.id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                      <td className="py-3 px-3 font-medium">
                        <div className="text-white">{job.title}</div>
                        <div className="text-xs text-slate-500">{job.department || 'Role'}</div>
                      </td>
                      <td className="py-3 px-3 text-slate-300">{job.location}</td>
                      <td className="py-3 px-3 text-right text-slate-300">{job.views?.toLocaleString() || 0}</td>
                      <td className="py-3 px-3 text-right text-slate-300">{job.applications || 0}</td>
                      <td className="py-3 px-3 text-right text-slate-300">{job.applyRate || 0}%</td>
                      <td className="py-3 px-3 text-center">
                        <span className={`px-2 py-1 rounded text-xs ${
                          job.status === 'active' ? 'bg-green-900/40 text-green-300' : 'bg-slate-700 text-slate-300'
                        }`}>
                          {job.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-lg">
            <h3 className="text-lg font-semibold mb-4">Top Jobs</h3>
            <div className="space-y-4">
              {stats.topJobs.map((job) => {
                const applyRate = job.views ? Math.round(((job.applications || 0) / job.views) * 100) : 0;
                return (
                  <div key={job.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-200 truncate max-w-[70%]">{job.title}</span>
                      <span className="text-xs text-slate-400">{applyRate}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                      <div className="h-full bg-emerald-500" style={{ width: `${applyRate}%` }} />
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>{job.views || 0} views</span>
                      <span>{job.applications || 0} applications</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Applications by Status */}
      {stats.statusCounts && Object.keys(stats.statusCounts).length > 0 && (
        <div className="bg-slate-900/40 border border-slate-800 p-6 rounded mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Applications by Status</h3>
            <span className="text-xs text-slate-500">Total {stats.statusTotal}</span>
          </div>
          <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-6">
            {Object.entries(stats.statusCounts).map(([status, count]) => (
              <div key={status} className="bg-slate-950/40 border border-slate-700 p-3 rounded text-center">
                <div className="text-xl font-bold text-slate-100">{count}</div>
                <div className="text-xs text-slate-400 capitalize">{status.replace(/_/g, ' ').toLowerCase()}</div>
                <div className="mt-2 h-1 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-blue-500"
                    style={{ width: `${stats.statusTotal ? Math.round((Number(count) / stats.statusTotal) * 100) : 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Hiring Funnel Visualization */}
      {analytics && (
        <div className="bg-slate-900/40 border border-slate-800 p-6 rounded">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Hiring Funnel</h3>
            <span className="text-xs text-slate-500">Conversion focus</span>
          </div>
          <div className="space-y-3">
            <FunnelBar label="Applications" value={analytics.totalApplications} max={analytics.totalApplications} color="bg-blue-600" />
            <FunnelBar label="Reviewed" value={analytics.applicationsByStatus?.REVIEWED || 0} max={analytics.totalApplications} color="bg-indigo-600" />
            <FunnelBar label="Shortlisted" value={analytics.applicationsByStatus?.SHORTLISTED || 0} max={analytics.totalApplications} color="bg-purple-600" />
            <FunnelBar label="Interviewed" value={analytics.applicationsByStatus?.INTERVIEW_SCHEDULED || 0} max={analytics.totalApplications} color="bg-yellow-500" />
            <FunnelBar label="Hired" value={analytics.applicationsByStatus?.HIRED || 0} max={analytics.totalApplications} color="bg-green-600" />
          </div>
        </div>
      )}
    </div>
  );
}

function FunnelBar({ label, value, max, color }) {
  const percent = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-4">
      <div className="w-24 text-sm text-slate-300">{label}</div>
      <div className="flex-1 bg-slate-800 rounded h-6 relative overflow-hidden">
        <div className={`${color} h-full transition-all`} style={{ width: `${percent}%` }}></div>
      </div>
      <div className="w-16 text-sm text-slate-400 text-right">{value} ({percent}%)</div>
    </div>
  );
}

function StatCard({ label, value, accent, change }) {
  return (
    <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl text-center">
      <div className={`text-3xl font-bold ${accent}`}>{Number.isFinite(value) ? value.toLocaleString?.() ?? value : value}</div>
      <div className="text-sm text-slate-300">{label}</div>
      {typeof change === 'number' && (
        <div className={`text-xs mt-1 ${change > 0 ? 'text-green-400' : change < 0 ? 'text-red-400' : 'text-slate-400'}`}>
          {change > 0 ? '+' : ''}{change}%
        </div>
      )}
    </div>
  );
}

function InsightCard({ title, value, subtitle, barValue, barColor }) {
  return (
    <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-slate-500">{title}</p>
          <div className="text-2xl font-semibold text-white">{value}</div>
        </div>
        <span className="text-xs text-slate-400">{subtitle}</span>
      </div>
      <div className="mt-3 h-2 rounded-full bg-slate-800 overflow-hidden">
        <div className={`h-full ${barColor}`} style={{ width: `${Math.min(Math.max(barValue, 0), 100)}%` }} />
      </div>
    </div>
  );
}
