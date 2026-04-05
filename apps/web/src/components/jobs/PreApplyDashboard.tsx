/**
 * Pre-Apply Dashboard Component
 * 
 * Shows users their job matches from the pre-apply queue with match scores.
 * Allows dismissing matches and applying to jobs.
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { toCloudinaryAutoUrl } from '@/lib/cloudinary';
import { getErrorMessage } from '@/lib/formatters';
import OptimizedImage from '@/components/ui/OptimizedImage';
import { 
  Briefcase, MapPin, DollarSign, Clock, X, ExternalLink,
  Loader2, CheckCircle, Sparkles, TrendingUp, AlertCircle, Bell
} from 'lucide-react';

interface PreApplyMatch {
  id: string;
  matchScore: number;
  notifiedAt: string | null;
  job: {
    id: string;
    title: string;
    location: string;
    employment: string;
    salaryLow: number | null;
    salaryHigh: number | null;
    company: string;
    logo: string | null;
    postedAt: string;
  };
}

interface Props {
  apiBase?: string;
  token?: string;
  limit?: number;
}

function formatSalary(low: number | null, high: number | null): string {
  if (!low && !high) return 'Salary not specified';
  if (low && high) return `$${(low / 1000).toFixed(0)}k - $${(high / 1000).toFixed(0)}k`;
  if (low) return `From $${(low / 1000).toFixed(0)}k`;
  if (high) return `Up to $${(high / 1000).toFixed(0)}k`;
  return '';
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return date.toLocaleDateString();
}

function getMatchColor(score: number): string {
  if (score >= 80) return 'text-green-400';
  if (score >= 60) return 'text-emerald-400';
  if (score >= 40) return 'text-yellow-400';
  return 'text-orange-400';
}

function getMatchBgColor(score: number): string {
  if (score >= 80) return 'bg-green-900/30 border-green-700';
  if (score >= 60) return 'bg-emerald-900/30 border-emerald-700';
  if (score >= 40) return 'bg-yellow-900/30 border-yellow-700';
  return 'bg-orange-900/30 border-orange-700';
}

function MatchScoreBadge({ score }: { score: number }) {
  return (
    <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${getMatchBgColor(score)} border`}>
      <TrendingUp className={`w-4 h-4 ${getMatchColor(score)}`} />
      <span className={getMatchColor(score)}>{score}% Match</span>
    </div>
  );
}

export default function PreApplyDashboard({ apiBase = '', token, limit = 10 }: Props) {
  const [matches, setMatches] = useState<PreApplyMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dismissing, setDismissing] = useState<string | null>(null);
  const [applying, setApplying] = useState<string | null>(null);

  const loadMatches = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch(`${apiBase}/api/pre-apply/matches?limit=${limit}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: 'include',
      });

      if (!res.ok) {
        throw new Error('Failed to load matches');
      }

      const data = await res.json();
      setMatches(data.matches || []);
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to load matches'));
    } finally {
      setLoading(false);
    }
  }, [apiBase, token, limit]);

  useEffect(() => {
    loadMatches();
  }, [loadMatches]);

  const dismissMatch = async (jobId: string) => {
    try {
      setDismissing(jobId);

      const res = await fetch(`${apiBase}/api/pre-apply/${jobId}/dismiss`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: 'include',
      });

      if (!res.ok) {
        throw new Error('Failed to dismiss match');
      }

      setMatches(prev => prev.filter(m => m.job.id !== jobId));
    } catch (err: unknown) {
      console.error('Dismiss error:', err);
    } finally {
      setDismissing(null);
    }
  };

  const markAsApplied = async (jobId: string) => {
    try {
      setApplying(jobId);

      const res = await fetch(`${apiBase}/api/pre-apply/${jobId}/applied`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: 'include',
      });

      if (!res.ok) {
        throw new Error('Failed to mark as applied');
      }

      setMatches(prev => prev.filter(m => m.job.id !== jobId));
    } catch (err: unknown) {
      console.error('Mark applied error:', err);
    } finally {
      setApplying(null);
    }
  };

  if (loading) {
    return (
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-8">
        <div className="flex flex-col items-center justify-center py-8">
          <Loader2 className="w-8 h-8 animate-spin text-green-500 mb-4" />
          <p className="text-slate-400">Finding your best matches...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-8">
        <div className="flex flex-col items-center justify-center py-8">
          <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
          <p className="text-red-300 mb-4">{error}</p>
          <button
            onClick={loadMatches}
            className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-8">
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-16 h-16 rounded-full bg-slate-700 flex items-center justify-center mb-4">
            <Bell className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">No Pre-Apply Matches Yet</h3>
          <p className="text-slate-400 max-w-md mb-6">
            When employers post jobs that match your profile, you'll see them here first.
            Make sure you've enabled Pre-Apply in your settings to get priority notifications.
          </p>
          <Link
            href="/member/settings"
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-500 transition-colors"
          >
            Update Pre-Apply Settings
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-amber-400" />
            Your Pre-Apply Matches
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            Jobs matched to your profile before they go public
          </p>
        </div>
        <span className="px-3 py-1 bg-slate-700 rounded-full text-sm text-slate-300">
          {matches.length} {matches.length === 1 ? 'match' : 'matches'}
        </span>
      </div>

      {/* Match Cards */}
      <div className="space-y-4">
        {matches.map((match) => (
          <div
            key={match.id}
            className="bg-slate-800 rounded-xl border border-slate-700 p-5 hover:border-slate-600 transition-colors"
          >
            <div className="flex items-start justify-between gap-4">
              {/* Job Info */}
              <div className="flex-1">
                <div className="flex items-start gap-4">
                  {/* Company Logo */}
                  <div className="w-12 h-12 rounded-lg bg-slate-700 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {match.job.logo ? (
                      <OptimizedImage src={toCloudinaryAutoUrl(match.job.logo)} alt={match.job.company} width={48} height={48} className="w-full h-full object-cover" />
                    ) : (
                      <Briefcase className="w-6 h-6 text-slate-400" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="text-lg font-semibold text-white truncate">
                        {match.job.title}
                      </h3>
                      <MatchScoreBadge score={match.matchScore} />
                    </div>

                    <p className="text-slate-400 mt-1">{match.job.company}</p>

                    <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-slate-400">
                      {match.job.location && (
                        <span className="flex items-center gap-1.5">
                          <MapPin className="w-4 h-4" />
                          {match.job.location}
                        </span>
                      )}
                      {match.job.employment && (
                        <span className="flex items-center gap-1.5">
                          <Briefcase className="w-4 h-4" />
                          {match.job.employment.replace('_', ' ')}
                        </span>
                      )}
                      <span className="flex items-center gap-1.5">
                        <DollarSign className="w-4 h-4" />
                        {formatSalary(match.job.salaryLow, match.job.salaryHigh)}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-4 h-4" />
                        {formatDate(match.job.postedAt)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => dismissMatch(match.job.id)}
                  disabled={dismissing === match.job.id}
                  className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
                  title="Not interested"
                >
                  {dismissing === match.job.id ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <X className="w-5 h-5" />
                  )}
                </button>

                <Link
                  href={`/jobs/${match.job.id}`}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors text-sm"
                >
                  <ExternalLink className="w-4 h-4" />
                  View
                </Link>

                <button
                  onClick={() => markAsApplied(match.job.id)}
                  disabled={applying === match.job.id}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-500 transition-colors text-sm disabled:opacity-50"
                >
                  {applying === match.job.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle className="w-4 h-4" />
                  )}
                  Applied
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Load More / Refresh */}
      <div className="flex justify-center pt-4">
        <button
          onClick={loadMatches}
          className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
        >
          Refresh Matches
        </button>
      </div>
    </div>
  );
}
