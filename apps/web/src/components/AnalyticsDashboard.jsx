'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/apiClient';

/**
 * Analytics Dashboard for Employers
 * Shows job performance, candidate engagement, and hiring metrics
 */
export default function AnalyticsDashboard({ companyId }) {
    const [analytics, setAnalytics] = useState(null);
    const [jobAnalytics, setJobAnalytics] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [dateRange, setDateRange] = useState('30d');
    const [selectedJobId, setSelectedJobId] = useState(null);
    
    // Fetch dashboard analytics
    const fetchAnalytics = useCallback(async () => {
        try {
            // Parse date range
            const days = parseInt(dateRange);
            const endDate = new Date();
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);
            
            const params = new URLSearchParams({
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString(),
            });
            
            const { ok, data } = await api(`/analytics/employer/dashboard?${params}`);
            
            if (!ok) throw new Error('Failed to fetch analytics');
            
            setAnalytics(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [dateRange]);
    
    // Fetch per-job analytics
    const fetchJobAnalytics = useCallback(async () => {
        try {
            const { ok, data } = await api('/analytics/employer/jobs');
            
            if (!ok) throw new Error('Failed to fetch job analytics');
            
            setJobAnalytics(data.jobs || []);
        } catch (err) {
            console.error('Failed to fetch job analytics:', err);
        }
    }, []);
    
    useEffect(() => {
        fetchAnalytics();
        fetchJobAnalytics();
    }, [fetchAnalytics, fetchJobAnalytics]);
    
    // Export analytics
    const handleExport = async (format) => {
        try {
            const days = parseInt(dateRange);
            const endDate = new Date();
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);
            
            const params = new URLSearchParams({
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString(),
                format,
            });
            
            const { ok, data } = await api(`/analytics/employer/export?${params}`);
            
            if (!ok) throw new Error('Export failed');
            
            // Download the file - data should contain a download URL or base64
            if (data.downloadUrl) {
                const a = document.createElement('a');
                a.href = data.downloadUrl;
                a.download = `analytics-${dateRange}.${format}`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
            }
        } catch (err) {
            setError(err.message);
        }
    };
    
    if (loading) {
        return (
            <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }
    
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h2>
                <div className="flex items-center gap-4">
                    <select
                        value={dateRange}
                        onChange={(e) => setDateRange(e.target.value)}
                        className="border border-gray-300 rounded-lg px-3 py-2 bg-white"
                    >
                        <option value="7d">Last 7 days</option>
                        <option value="30d">Last 30 days</option>
                        <option value="90d">Last 90 days</option>
                    </select>
                    <div className="flex gap-2">
                        <button
                            onClick={() => handleExport('csv')}
                            className="px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
                        >
                            Export CSV
                        </button>
                        <button
                            onClick={() => handleExport('pdf')}
                            className="px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
                        >
                            Export PDF
                        </button>
                    </div>
                </div>
            </div>
            
            {/* Error Alert */}
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                    {error}
                </div>
            )}
            
            {/* Key Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <MetricCard
                    label="Total Views"
                    value={analytics?.totalViews || 0}
                    change={analytics?.viewsChange}
                    icon={
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                    }
                />
                <MetricCard
                    label="Applications"
                    value={analytics?.totalApplications || 0}
                    change={analytics?.applicationsChange}
                    icon={
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                    }
                />
                <MetricCard
                    label="Interviews"
                    value={analytics?.totalInterviews || 0}
                    change={analytics?.interviewsChange}
                    icon={
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                    }
                />
                <MetricCard
                    label="Hires"
                    value={analytics?.totalHires || 0}
                    change={analytics?.hiresChange}
                    highlight
                    icon={
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    }
                />
            </div>
            
            {/* Conversion Funnel */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Hiring Funnel</h3>
                <div className="flex items-center justify-between gap-4">
                    <FunnelStage
                        label="Views"
                        value={analytics?.totalViews || 0}
                        percentage={100}
                    />
                    <FunnelArrow />
                    <FunnelStage
                        label="Applications"
                        value={analytics?.totalApplications || 0}
                        percentage={analytics?.viewToApplyRate || 0}
                    />
                    <FunnelArrow />
                    <FunnelStage
                        label="Shortlisted"
                        value={analytics?.totalShortlisted || 0}
                        percentage={analytics?.applyToShortlistRate || 0}
                    />
                    <FunnelArrow />
                    <FunnelStage
                        label="Interviewed"
                        value={analytics?.totalInterviews || 0}
                        percentage={analytics?.shortlistToInterviewRate || 0}
                    />
                    <FunnelArrow />
                    <FunnelStage
                        label="Hired"
                        value={analytics?.totalHires || 0}
                        percentage={analytics?.interviewToHireRate || 0}
                        highlight
                    />
                </div>
            </div>
            
            {/* Indigenous Hiring Impact */}
            <div className="bg-gradient-to-r from-ochre-50 to-ochre-100 rounded-xl border border-ochre-200 p-6">
                <h3 className="text-lg font-semibold text-ochre-900 mb-4">
                    Indigenous Employment Impact
                </h3>
                <div className="grid grid-cols-3 gap-6">
                    <div>
                        <p className="text-3xl font-bold text-ochre-900">
                            {analytics?.indigenousHires || 0}
                        </p>
                        <p className="text-ochre-700">Indigenous Candidates Hired</p>
                    </div>
                    <div>
                        <p className="text-3xl font-bold text-ochre-900">
                            {analytics?.indigenousHireRate?.toFixed(1) || 0}%
                        </p>
                        <p className="text-ochre-700">Indigenous Hire Rate</p>
                    </div>
                    <div>
                        <p className="text-3xl font-bold text-ochre-900">
                            {analytics?.rapProgress?.toFixed(1) || 0}%
                        </p>
                        <p className="text-ochre-700">RAP Target Progress</p>
                    </div>
                </div>
            </div>
            
            {/* Job Performance Table */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Job Performance</h3>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b">
                                <th className="text-left py-3 px-4 text-gray-600 font-medium">Job Title</th>
                                <th className="text-right py-3 px-4 text-gray-600 font-medium">Views</th>
                                <th className="text-right py-3 px-4 text-gray-600 font-medium">Applications</th>
                                <th className="text-right py-3 px-4 text-gray-600 font-medium">Apply Rate</th>
                                <th className="text-right py-3 px-4 text-gray-600 font-medium">Avg. Time to Apply</th>
                                <th className="text-right py-3 px-4 text-gray-600 font-medium">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {jobAnalytics.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="py-8 text-center text-gray-500">
                                        No job data available
                                    </td>
                                </tr>
                            ) : (
                                jobAnalytics.map((job) => (
                                    <tr key={job.id} className="border-b last:border-0 hover:bg-gray-50">
                                        <td className="py-3 px-4">
                                            <p className="font-medium text-gray-900">{job.title}</p>
                                            <p className="text-sm text-gray-500">{job.location}</p>
                                        </td>
                                        <td className="text-right py-3 px-4">
                                            {job.views?.toLocaleString() || 0}
                                        </td>
                                        <td className="text-right py-3 px-4">
                                            {job.applications?.toLocaleString() || 0}
                                        </td>
                                        <td className="text-right py-3 px-4">
                                            <span className={`${
                                                (job.applyRate || 0) > 5 
                                                    ? 'text-green-600' 
                                                    : 'text-gray-600'
                                            }`}>
                                                {(job.applyRate || 0).toFixed(1)}%
                                            </span>
                                        </td>
                                        <td className="text-right py-3 px-4 text-gray-600">
                                            {job.avgTimeToApply || '—'}
                                        </td>
                                        <td className="text-right py-3 px-4">
                                            <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                                                job.status === 'active'
                                                    ? 'bg-green-100 text-green-700'
                                                    : job.status === 'closed'
                                                    ? 'bg-gray-100 text-gray-700'
                                                    : 'bg-yellow-100 text-yellow-700'
                                            }`}>
                                                {job.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            
            {/* Source Breakdown */}
            <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl shadow-sm border p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        Application Sources
                    </h3>
                    <div className="space-y-4">
                        {(analytics?.sources || []).map((source) => (
                            <div key={source.name} className="flex items-center gap-4">
                                <div className="flex-1">
                                    <div className="flex justify-between mb-1">
                                        <span className="text-gray-700">{source.name}</span>
                                        <span className="text-gray-600">{source.count}</span>
                                    </div>
                                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-primary rounded-full"
                                            style={{ width: `${source.percentage}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                        {(!analytics?.sources || analytics.sources.length === 0) && (
                            <p className="text-gray-500 text-center py-4">No source data available</p>
                        )}
                    </div>
                </div>
                
                <div className="bg-white rounded-xl shadow-sm border p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        Top Locations
                    </h3>
                    <div className="space-y-4">
                        {(analytics?.topLocations || []).map((location) => (
                            <div key={location.name} className="flex items-center gap-4">
                                <div className="flex-1">
                                    <div className="flex justify-between mb-1">
                                        <span className="text-gray-700">{location.name}</span>
                                        <span className="text-gray-600">{location.count} candidates</span>
                                    </div>
                                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-secondary rounded-full"
                                            style={{ width: `${location.percentage}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                        {(!analytics?.topLocations || analytics.topLocations.length === 0) && (
                            <p className="text-gray-500 text-center py-4">No location data available</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

/**
 * Metric card component
 */
function MetricCard({ label, value, change, icon, highlight }) {
    const isPositive = change > 0;
    const isNegative = change < 0;
    
    return (
        <div className={`rounded-xl p-5 ${
            highlight ? 'bg-primary/10 border border-primary/20' : 'bg-white shadow-sm border'
        }`}>
            <div className="flex items-start justify-between">
                <div className="text-gray-400">{icon}</div>
                {change !== undefined && (
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                        isPositive ? 'bg-green-100 text-green-700' :
                        isNegative ? 'bg-red-100 text-red-700' :
                        'bg-gray-100 text-gray-600'
                    }`}>
                        {isPositive && '+'}{change}%
                    </span>
                )}
            </div>
            <p className="text-2xl font-bold text-gray-900 mt-3">
                {value.toLocaleString()}
            </p>
            <p className="text-gray-600 text-sm mt-1">{label}</p>
        </div>
    );
}

/**
 * Funnel stage component
 */
function FunnelStage({ label, value, percentage, highlight }) {
    return (
        <div className={`text-center flex-1 p-4 rounded-lg ${
            highlight ? 'bg-primary/10' : 'bg-gray-50'
        }`}>
            <p className={`text-2xl font-bold ${highlight ? 'text-primary' : 'text-gray-900'}`}>
                {value.toLocaleString()}
            </p>
            <p className="text-gray-600 text-sm">{label}</p>
            {percentage !== 100 && (
                <p className="text-xs text-gray-500 mt-1">{percentage.toFixed(1)}%</p>
            )}
        </div>
    );
}

/**
 * Arrow between funnel stages
 */
function FunnelArrow() {
    return (
        <svg className="w-6 h-6 text-gray-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
    );
}
