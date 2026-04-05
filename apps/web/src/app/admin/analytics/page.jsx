"use client";
import { API_BASE } from '@/lib/apiBase';
import { useEffect, useState } from 'react';
import useAuth from '../../../hooks/useAuth';

export default function AnalyticsDashboard() {
  const { token, user } = useAuth();
  const [overview, setOverview] = useState(null);
  const [outcomes, setOutcomes] = useState(null);
  const [adminOverview, setAdminOverview] = useState(null);
  const [retention, setRetention] = useState(null);
  const [jobFunnel, setJobFunnel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function load() {
      if (!token) return setLoading(false);
      setLoading(true);
      try {
        const api = API_BASE;
        const [overviewRes, outcomesRes, adminOverviewRes, retentionRes, jobFunnelRes] = await Promise.all([
          fetch(`${api}/analytics/overview`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${api}/analytics/outcomes`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${api}/analytics-dashboard/admin/overview`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${api}/analytics-dashboard/admin/user-retention`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${api}/analytics-dashboard/admin/job-funnel`, { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        
        if (overviewRes.ok) setOverview(await overviewRes.json());
        if (outcomesRes.ok) setOutcomes(await outcomesRes.json());
        if (adminOverviewRes.ok) setAdminOverview(await adminOverviewRes.json());
        if (retentionRes.ok) setRetention(await retentionRes.json());
        if (jobFunnelRes.ok) setJobFunnel(await jobFunnelRes.json());
      } catch (err) {
        setError('Failed to load analytics');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [token]);

  if (loading) return <div className="max-w-6xl mx-auto py-12 text-slate-300">Loading analytics…</div>;
  if (error) return <div className="max-w-6xl mx-auto py-12 text-red-200">{error}</div>;

  return (
    <div className="max-w-6xl mx-auto py-12">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Platform Analytics</h2>
        <div className="flex items-center gap-2">
          <a href="/admin/analytics/impact" className="px-4 py-2 border border-slate-700 rounded hover:bg-slate-900 text-sm">
            📈 Impact Dashboard
          </a>
          <a href="/admin/email-templates" className="px-4 py-2 border border-slate-700 rounded hover:bg-slate-900 text-sm">
            🛠️ Email Templates
          </a>
        </div>
      </div>
      
      {/* Overview Stats */}
      {overview && (
        <div className="grid gap-4 md:grid-cols-4 mb-8">
          <StatCard label="Total Members" value={overview.overview?.totalMembers || 0} icon="👥" />
          <StatCard label="Total Companies" value={overview.overview?.totalCompanies || 0} icon="🏢" />
          <StatCard label="Active Jobs" value={overview.overview?.activeJobs || 0} icon="💼" />
          <StatCard label="Placement Rate" value={`${overview.overview?.placementRate || 0}%`} icon="🎯" color="green" />
        </div>
      )}

      {/* Recent Activity */}
      {overview?.recent30Days && (
        <div className="bg-slate-900/40 border border-slate-800 p-6 rounded mb-8">
          <h3 className="text-lg font-semibold mb-4">Last 30 Days</h3>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-400">{overview.recent30Days.newMembers}</div>
              <div className="text-sm text-slate-300">New members</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-400">{overview.recent30Days.jobs}</div>
              <div className="text-sm text-slate-300">Jobs posted</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-400">{overview.recent30Days.applications}</div>
              <div className="text-sm text-slate-300">Applications</div>
            </div>
          </div>
        </div>
      )}

      {/* Admin KPI Overview */}
      {adminOverview && (
        <div className="bg-slate-900/40 border border-slate-800 p-6 rounded mb-8">
          <h3 className="text-lg font-semibold mb-4">Platform KPI Overview</h3>
          <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
            <StatCard label="Total Users" value={adminOverview.users?.total || 0} icon="🧑🏽‍💻" />
            <StatCard label="Users This Month" value={adminOverview.users?.thisMonth || 0} icon="📈" />
            <StatCard label="Active Jobs" value={adminOverview.jobs?.active || 0} icon="💼" />
            <StatCard label="Applications" value={adminOverview.applications?.total || 0} icon="📨" />
            <StatCard label="Placements" value={adminOverview.placements?.total || 0} icon="✅" />
            <StatCard label="Mentor Sessions" value={adminOverview.mentorship?.totalSessions || 0} icon="🤝" />
          </div>
        </div>
      )}

      {/* Retention Cohorts */}
      {retention?.retentionData && (
        <div className="bg-slate-900/40 border border-slate-800 p-6 rounded mb-8">
          <h3 className="text-lg font-semibold mb-4">Retention Cohorts</h3>
          <div className="grid gap-3 md:grid-cols-5">
            {retention.retentionData.map((cohort) => (
              <div key={cohort.cohort} className="bg-slate-950/40 border border-slate-800 p-4 rounded text-center">
                <div className="text-sm text-slate-400">{cohort.cohort}</div>
                <div className="text-2xl font-bold text-slate-100 mt-1">{cohort.rate}%</div>
                <div className="text-xs text-slate-500 mt-1">{cohort.retained}/{cohort.registered}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Job Funnel */}
      {jobFunnel?.funnel && (
        <div className="bg-slate-900/40 border border-slate-800 p-6 rounded mb-8">
          <h3 className="text-lg font-semibold mb-4">Job Application Funnel</h3>
          <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-6">
            {jobFunnel.funnel.map((stage) => (
              <div key={stage.stage} className="bg-slate-950/40 border border-slate-800 p-4 rounded text-center">
                <div className="text-xs text-slate-400">{stage.stage}</div>
                <div className="text-2xl font-bold text-slate-100 mt-1">{stage.count}</div>
              </div>
            ))}
          </div>
          {Number.isFinite(jobFunnel.rejected) && (
            <p className="text-xs text-slate-500 mt-3">Rejected: {jobFunnel.rejected}</p>
          )}
        </div>
      )}

      {/* Outcome Tracking / Retention */}
      {outcomes && (
        <div className="bg-slate-900/40 border border-slate-800 p-6 rounded">
          <h3 className="text-lg font-semibold mb-4">Employment Outcomes</h3>
          <p className="text-sm text-slate-300 mb-4">Track placements and retention for Closing the Gap reporting.</p>
          
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
            <OutcomeCard milestone="Hired" count={outcomes.totalHired || 0} icon="✅" />
            <OutcomeCard milestone="1 Month Retention" count={outcomes.milestones?.MONTH_1 || 0} rate={outcomes.retentionRates?.month1} />
            <OutcomeCard milestone="3 Month Retention" count={outcomes.milestones?.MONTH_3 || 0} rate={outcomes.retentionRates?.month3} />
            <OutcomeCard milestone="12 Month Retention" count={outcomes.milestones?.MONTH_12 || 0} rate={outcomes.retentionRates?.month12} />
          </div>

          {/* Retention Progress Bar */}
          <div className="mt-4">
            <div className="text-sm text-slate-400 mb-2">Retention Funnel</div>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-slate-800 rounded h-6 relative overflow-hidden">
                <div className="bg-green-600 h-full transition-all" style={{ width: '100%' }}></div>
                <span className="absolute inset-0 flex items-center justify-center text-xs font-medium">Hired ({outcomes.totalHired})</span>
              </div>
              <div className="flex-1 bg-slate-800 rounded h-6 relative overflow-hidden">
                <div className="bg-blue-600 h-full transition-all" style={{ width: `${outcomes.retentionRates?.month1 || 0}%` }}></div>
                <span className="absolute inset-0 flex items-center justify-center text-xs font-medium">1 Mo ({outcomes.retentionRates?.month1 || 0}%)</span>
              </div>
              <div className="flex-1 bg-slate-800 rounded h-6 relative overflow-hidden">
                <div className="bg-purple-600 h-full transition-all" style={{ width: `${outcomes.retentionRates?.month3 || 0}%` }}></div>
                <span className="absolute inset-0 flex items-center justify-center text-xs font-medium">3 Mo ({outcomes.retentionRates?.month3 || 0}%)</span>
              </div>
              <div className="flex-1 bg-slate-800 rounded h-6 relative overflow-hidden">
                <div className="bg-yellow-600 h-full transition-all" style={{ width: `${outcomes.retentionRates?.month12 || 0}%` }}></div>
                <span className="absolute inset-0 flex items-center justify-center text-xs font-medium">12 Mo ({outcomes.retentionRates?.month12 || 0}%)</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, icon, color = 'blue' }) {
  const colors = {
    blue: 'text-blue-400',
    green: 'text-green-400',
    purple: 'text-purple-400',
  };
  return (
    <div className="bg-slate-900/40 border border-slate-800 p-4 rounded">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xl">{icon}</span>
        <span className="text-sm text-slate-400">{label}</span>
      </div>
      <div className={`text-2xl font-bold ${colors[color]}`}>{value}</div>
    </div>
  );
}

function OutcomeCard({ milestone, count, rate, icon = '📊' }) {
  return (
    <div className="bg-slate-950/40 border border-slate-700 p-4 rounded text-center">
      <div className="text-xl mb-1">{icon}</div>
      <div className="text-2xl font-bold text-slate-100">{count}</div>
      <div className="text-sm text-slate-400">{milestone}</div>
      {rate !== undefined && <div className="text-xs text-slate-500 mt-1">{rate}% retention</div>}
    </div>
  );
}
