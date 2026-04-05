'use client';

/**
 * Job Analytics Dashboard
 * 
 * Displays insights about job applications, matches, and market trends
 * for job seekers.
 */

import { useState, useEffect } from 'react';
import {
  Briefcase,
  TrendingUp,
  TrendingDown,
  Eye,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  BarChart3,
  PieChart,
  Calendar,
  MapPin,
  DollarSign,
  Users,
  Sparkles,
} from 'lucide-react';
import api from '@/lib/apiClient';

interface ApplicationStats {
  total: number;
  pending: number;
  reviewing: number;
  interviewing: number;
  offered: number;
  rejected: number;
  withdrawn: number;
}

interface Analytics {
  applications: ApplicationStats;
  profileViews: number;
  profileViewsTrend: number;
  savedByEmployers: number;
  matchScore: number;
  weeklyActivity: { date: string; applications: number; views: number }[];
  topMatchingIndustries: { name: string; count: number; percentage: number }[];
  applicationOutcomes: { status: string; count: number; color: string }[];
  salaryInsights: {
    averageApplied: number;
    marketAverage: number;
    highestPosted: number;
  };
  locationBreakdown: { location: string; count: number }[];
  suggestedSkills: { skill: string; demandScore: number; hasSkill: boolean }[];
}

export default function JobAnalytics() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'quarter'>('month');

  useEffect(() => {
    async function loadAnalytics() {
      try {
        const { ok, data } = await api<Analytics>(`/jobs/analytics?range=${timeRange}`);
        if (ok && data) {
          setAnalytics(data);
        }
      } catch (err) {
        console.error('Failed to load analytics:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadAnalytics();
  }, [timeRange]);

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-slate-700 rounded-xl" />
          ))}
        </div>
        <div className="h-64 bg-slate-700 rounded-xl" />
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="text-center py-12 text-slate-400">
        <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>Unable to load analytics</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Time Range Selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Your Job Search Analytics</h2>
        <div className="flex gap-2">
          {(['week', 'month', 'quarter'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                timeRange === range
                  ? 'bg-purple-600 text-white'
                  : 'bg-slate-700 text-slate-400 hover:text-white'
              }`}
            >
              {range === 'week' ? 'Week' : range === 'month' ? 'Month' : 'Quarter'}
            </button>
          ))}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          icon={<FileText className="w-5 h-5 text-blue-400" />}
          label="Applications Sent"
          value={analytics.applications.total}
          subtitle="Total this period"
        />
        <MetricCard
          icon={<Eye className="w-5 h-5 text-green-400" />}
          label="Profile Views"
          value={analytics.profileViews}
          trend={analytics.profileViewsTrend}
        />
        <MetricCard
          icon={<Users className="w-5 h-5 text-purple-400" />}
          label="Saved by Employers"
          value={analytics.savedByEmployers}
          subtitle="Employers interested"
        />
        <MetricCard
          icon={<Sparkles className="w-5 h-5 text-yellow-400" />}
          label="Match Score"
          value={`${analytics.matchScore}%`}
          subtitle="Profile completeness"
        />
      </div>

      {/* Application Status Pipeline */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Briefcase className="w-5 h-5 text-purple-400" />
          Application Pipeline
        </h3>
        <div className="flex items-center justify-between gap-2 overflow-x-auto pb-2">
          <PipelineStage
            label="Pending"
            count={analytics.applications.pending}
            color="bg-slate-500"
            icon={<Clock className="w-4 h-4" />}
          />
          <PipelineArrow />
          <PipelineStage
            label="Reviewing"
            count={analytics.applications.reviewing}
            color="bg-blue-500"
            icon={<Eye className="w-4 h-4" />}
          />
          <PipelineArrow />
          <PipelineStage
            label="Interviewing"
            count={analytics.applications.interviewing}
            color="bg-purple-500"
            icon={<Users className="w-4 h-4" />}
          />
          <PipelineArrow />
          <PipelineStage
            label="Offered"
            count={analytics.applications.offered}
            color="bg-green-500"
            icon={<CheckCircle className="w-4 h-4" />}
          />
        </div>
        <div className="flex gap-4 mt-4 text-sm">
          <span className="text-slate-400">
            Rejected: <span className="text-red-400">{analytics.applications.rejected}</span>
          </span>
          <span className="text-slate-400">
            Withdrawn: <span className="text-yellow-400">{analytics.applications.withdrawn}</span>
          </span>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Industry Breakdown */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <PieChart className="w-5 h-5 text-purple-400" />
            Top Matching Industries
          </h3>
          <div className="space-y-3">
            {analytics.topMatchingIndustries.map((industry, i) => (
              <div key={industry.name}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-300">{industry.name}</span>
                  <span className="text-slate-400">{industry.count} jobs</span>
                </div>
                <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-500 to-purple-400 rounded-full transition-all"
                    style={{ width: `${industry.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Salary Insights */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-green-400" />
            Salary Insights
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
              <div>
                <p className="text-sm text-slate-400">Your Average Applied Salary</p>
                <p className="text-xl font-bold text-white">
                  ${analytics.salaryInsights.averageApplied.toLocaleString()}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-400 opacity-50" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-slate-700/50 rounded-lg">
                <p className="text-xs text-slate-400">Market Average</p>
                <p className="text-lg font-semibold text-white">
                  ${analytics.salaryInsights.marketAverage.toLocaleString()}
                </p>
              </div>
              <div className="p-3 bg-slate-700/50 rounded-lg">
                <p className="text-xs text-slate-400">Highest Posted</p>
                <p className="text-lg font-semibold text-white">
                  ${analytics.salaryInsights.highestPosted.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Location Breakdown */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <MapPin className="w-5 h-5 text-red-400" />
          Applications by Location
        </h3>
        <div className="flex flex-wrap gap-2">
          {analytics.locationBreakdown.map((loc) => (
            <div
              key={loc.location}
              className="px-3 py-2 bg-slate-700/50 rounded-lg flex items-center gap-2"
            >
              <MapPin className="w-4 h-4 text-slate-400" />
              <span className="text-white">{loc.location}</span>
              <span className="text-xs bg-slate-600 px-2 py-0.5 rounded-full text-slate-300">
                {loc.count}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Suggested Skills */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-yellow-400" />
          Skills in Demand
        </h3>
        <p className="text-sm text-slate-400 mb-4">
          Based on jobs you've applied to and market trends
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {analytics.suggestedSkills.map((skill) => (
            <div
              key={skill.skill}
              className={`p-3 rounded-lg border transition-colors ${
                skill.hasSkill
                  ? 'bg-green-900/30 border-green-700'
                  : 'bg-slate-700/50 border-slate-600'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-white">{skill.skill}</span>
                {skill.hasSkill && (
                  <CheckCircle className="w-4 h-4 text-green-400" />
                )}
              </div>
              <div className="flex items-center gap-1">
                <div className="flex-1 h-1.5 bg-slate-600 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      skill.hasSkill ? 'bg-green-500' : 'bg-yellow-500'
                    }`}
                    style={{ width: `${skill.demandScore}%` }}
                  />
                </div>
                <span className="text-xs text-slate-400">{skill.demandScore}%</span>
              </div>
              {!skill.hasSkill && (
                <p className="text-xs text-yellow-400 mt-1">Add to profile</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  subtitle,
  trend,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subtitle?: string;
  trend?: number;
}) {
  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
      <div className="flex items-center justify-between mb-2">
        {icon}
        {trend !== undefined && (
          <span
            className={`text-xs flex items-center gap-0.5 ${
              trend >= 0 ? 'text-green-400' : 'text-red-400'
            }`}
          >
            {trend >= 0 ? (
              <TrendingUp className="w-3 h-3" />
            ) : (
              <TrendingDown className="w-3 h-3" />
            )}
            {Math.abs(trend)}%
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-xs text-slate-400 mt-1">{subtitle || label}</p>
    </div>
  );
}

function PipelineStage({
  label,
  count,
  color,
  icon,
}: {
  label: string;
  count: number;
  color: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center min-w-[80px]">
      <div className={`w-12 h-12 rounded-full ${color} flex items-center justify-center text-white`}>
        {icon}
      </div>
      <p className="text-lg font-bold text-white mt-2">{count}</p>
      <p className="text-xs text-slate-400">{label}</p>
    </div>
  );
}

function PipelineArrow() {
  return (
    <div className="flex-shrink-0 text-slate-600">
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </div>
  );
}
