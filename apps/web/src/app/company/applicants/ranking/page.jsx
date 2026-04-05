"use client";

import { API_BASE } from '@/lib/apiBase';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  Brain, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  Star, 
  Users,
  Filter,
  RefreshCw,
  ChevronRight,
  Award,
  MessageSquare,
  Calendar,
  MapPin,
  Briefcase,
  Target,
  ArrowUpDown,
  Search,
  X
} from 'lucide-react';
import useAuth from '../../../../hooks/useAuth';
import { toCloudinaryAutoUrl } from '@/lib/cloudinary';

const TIERS = {
  EXCELLENT: { label: 'Excellent Match', color: 'bg-emerald-500', textColor: 'text-emerald-400' },
  GOOD: { label: 'Good Match', color: 'bg-blue-500', textColor: 'text-blue-400' },
  POTENTIAL: { label: 'Potential', color: 'bg-amber-500', textColor: 'text-amber-400' },
  DEVELOPING: { label: 'Developing', color: 'bg-orange-500', textColor: 'text-orange-400' },
  NOT_READY: { label: 'Not Ready', color: 'bg-slate-500', textColor: 'text-slate-400' }
};

function CandidateSkeleton() {
  return (
    <div className="bg-slate-800/80 rounded-xl p-4 animate-pulse">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-slate-700" />
          <div>
            <div className="h-4 w-32 bg-slate-700 rounded mb-2" />
            <div className="h-3 w-24 bg-slate-700 rounded" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-12 h-12 rounded-full bg-slate-700" />
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <div className="h-6 w-16 bg-slate-700 rounded" />
        <div className="h-6 w-20 bg-slate-700 rounded" />
        <div className="h-6 w-14 bg-slate-700 rounded" />
      </div>
      <div className="mt-4 grid grid-cols-4 gap-2">
        <div className="h-10 bg-slate-700 rounded" />
        <div className="h-10 bg-slate-700 rounded" />
        <div className="h-10 bg-slate-700 rounded" />
        <div className="h-10 bg-slate-700 rounded" />
      </div>
    </div>
  );
}

function ScoreBadge({ score, tier }) {
  const tierInfo = TIERS[tier] || TIERS.NOT_READY;
  return (
    <div className="flex items-center gap-2">
      <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold ${tierInfo.color}`}>
        {score}
      </div>
      <span className={`text-sm font-medium ${tierInfo.textColor}`}>{tierInfo.label}</span>
    </div>
  );
}

function FlagBadge({ flag, type }) {
  const isRed = type === 'red';
  return (
    <div className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs ${
      isRed ? 'bg-red-900/50 text-red-300' : 'bg-emerald-900/50 text-emerald-300'
    }`}>
      {isRed ? <AlertTriangle className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
      {flag.label}
    </div>
  );
}

function CandidateCard({ applicant, onSelect, isSelected }) {
  const { candidate, score, tier, breakdown, greenFlags, redFlags, skillsAnalysis } = applicant;

  return (
    <div 
      onClick={() => onSelect(applicant)}
      className={`bg-slate-800/80 rounded-xl p-4 cursor-pointer transition-all hover:bg-slate-700/80 border-2 ${
        isSelected ? 'border-amber-500' : 'border-transparent'
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          {candidate.avatar ? (
            <img src={toCloudinaryAutoUrl(candidate.avatar)} alt="" className="w-12 h-12 rounded-full object-cover" />
          ) : (
            <div className="w-12 h-12 rounded-full bg-slate-600 flex items-center justify-center text-lg font-bold">
              {candidate.name?.[0] || '?'}
            </div>
          )}
          <div>
            <h3 className="font-semibold text-white">{candidate.name}</h3>
            <div className="flex items-center gap-2 text-sm text-slate-400">
              {candidate.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {candidate.location}
                </span>
              )}
              {candidate.yearsExperience && (
                <span className="flex items-center gap-1">
                  <Briefcase className="w-3 h-3" />
                  {candidate.yearsExperience}y exp
                </span>
              )}
            </div>
          </div>
        </div>
        <ScoreBadge score={score} tier={tier} />
      </div>

      {/* Score Breakdown */}
      <div className="mt-4 grid grid-cols-5 gap-2 text-center">
        {Object.entries(breakdown).map(([key, value]) => (
          <div key={key} className="bg-slate-700/50 rounded p-2">
            <div className="text-xs text-slate-400 capitalize">{key}</div>
            <div className="font-semibold text-white">{value}</div>
          </div>
        ))}
      </div>

      {/* Skills Analysis */}
      {skillsAnalysis?.matchedRequired?.length > 0 && (
        <div className="mt-3">
          <div className="text-xs text-slate-400 mb-1">Matched Skills</div>
          <div className="flex flex-wrap gap-1">
            {skillsAnalysis.matchedRequired.map((skill, i) => (
              <span key={i} className="px-2 py-0.5 bg-emerald-900/50 text-emerald-300 rounded text-xs">
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}

      {skillsAnalysis?.missingRequired?.length > 0 && (
        <div className="mt-2">
          <div className="text-xs text-slate-400 mb-1">Missing Skills</div>
          <div className="flex flex-wrap gap-1">
            {skillsAnalysis.missingRequired.map((skill, i) => (
              <span key={i} className="px-2 py-0.5 bg-red-900/50 text-red-300 rounded text-xs">
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Flags */}
      {(greenFlags?.length > 0 || redFlags?.length > 0) && (
        <div className="mt-3 flex flex-wrap gap-1">
          {greenFlags?.map((flag, i) => (
            <FlagBadge key={`green-${i}`} flag={flag} type="green" />
          ))}
          {redFlags?.map((flag, i) => (
            <FlagBadge key={`red-${i}`} flag={flag} type="red" />
          ))}
        </div>
      )}

      {/* Applied date */}
      <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
        <span>Applied: {new Date(applicant.appliedAt).toLocaleDateString()}</span>
        <span className={`px-2 py-0.5 rounded ${
          applicant.status === 'SHORTLISTED' ? 'bg-amber-900/50 text-amber-300' :
          applicant.status === 'INTERVIEW' ? 'bg-blue-900/50 text-blue-300' :
          'bg-slate-700 text-slate-300'
        }`}>
          {applicant.status}
        </span>
      </div>
    </div>
  );
}

function InsightCard({ insight }) {
  const icons = {
    positive: <CheckCircle2 className="w-5 h-5 text-emerald-400" />,
    warning: <AlertTriangle className="w-5 h-5 text-amber-400" />,
    info: <Target className="w-5 h-5 text-blue-400" />,
    suggestion: <Brain className="w-5 h-5 text-purple-400" />
  };

  return (
    <div className="bg-slate-800/60 rounded-lg p-4 flex gap-3">
      {icons[insight.type] || icons.info}
      <div>
        <h4 className="font-medium text-white">{insight.title}</h4>
        <p className="text-sm text-slate-300">{insight.message}</p>
      </div>
    </div>
  );
}

export default function CandidateRankingPage() {
  const { token } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [selectedJobId, setSelectedJobId] = useState(null);
  const [rankedApplicants, setRankedApplicants] = useState([]);
  const [stats, setStats] = useState(null);
  const [insights, setInsights] = useState([]);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filterTier, setFilterTier] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [banner, setBanner] = useState(null);

  const apiBase = API_BASE;

  // Fetch company jobs
  useEffect(() => {
    if (!token) return;

    async function fetchJobs() {
      try {
        const res = await fetch(`${apiBase}/company/jobs`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setJobs(data.jobs || []);
          if (data.jobs?.length > 0 && !selectedJobId) {
            setSelectedJobId(data.jobs[0].id);
          }
          if (!data.jobs?.length) {
            setSelectedJobId(null);
          }
        } else {
          const data = await res.json().catch(() => ({}));
          setBanner({ type: 'error', message: data?.error || 'Failed to load jobs' });
        }
      } catch (err) {
        console.error('Failed to fetch jobs:', err);
        setBanner({ type: 'error', message: 'Failed to load jobs' });
      }
    }

    fetchJobs();
  }, [apiBase, token, selectedJobId]);

  // Fetch ranked applicants when job selected
  useEffect(() => {
    if (!token || !selectedJobId) {
      setLoading(false);
      return;
    }

    async function fetchRanking() {
      setLoading(true);
      try {
        const params = new URLSearchParams({ limit: '50' });
        if (filterTier) params.set('tier', filterTier);

        const [rankedRes, insightsRes] = await Promise.all([
          fetch(`${apiBase}/candidate-matching/jobs/${selectedJobId}/ranked?${params}`, {
            headers: { Authorization: `Bearer ${token}` }
          }),
          fetch(`${apiBase}/candidate-matching/jobs/${selectedJobId}/insights`, {
            headers: { Authorization: `Bearer ${token}` }
          })
        ]);

        if (rankedRes.ok) {
          const data = await rankedRes.json();
          setRankedApplicants(data.applicants || []);
        } else {
          const data = await rankedRes.json().catch(() => ({}));
          setRankedApplicants([]);
          setBanner({ type: 'error', message: data?.error || 'Failed to load ranked applicants' });
        }

        if (insightsRes.ok) {
          const data = await insightsRes.json();
          setStats(data.stats);
          setInsights(data.insights || []);
        } else {
          setStats(null);
          setInsights([]);
        }
      } catch (err) {
        console.error('Failed to fetch ranking:', err);
        setBanner({ type: 'error', message: 'Failed to load candidate ranking' });
      } finally {
        setLoading(false);
      }
    }

    fetchRanking();
  }, [apiBase, token, selectedJobId, filterTier]);

  // Filter by search
  const filteredApplicants = rankedApplicants.filter(a => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      a.candidate.name?.toLowerCase().includes(q) ||
      a.candidate.location?.toLowerCase().includes(q) ||
      a.skillsAnalysis?.matchedRequired?.some(s => s.toLowerCase().includes(q))
    );
  });

  // Handle shortlist action
  async function handleBulkShortlist() {
    if (!token || !selectedJobId) return;

    try {
      const res = await fetch(`${apiBase}/candidate-matching/jobs/${selectedJobId}/shortlist`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ minScore: 70, tier: 'EXCELLENT', maxCount: 10 })
      });

      if (res.ok) {
        const data = await res.json();
        setBanner({ type: 'success', message: data.message || `Shortlisted ${data.shortlisted} candidates.` });
        // Refresh the list
        setFilterTier(null);
      } else {
        const data = await res.json().catch(() => ({}));
        setBanner({ type: 'error', message: data?.error || 'Shortlist failed' });
      }
    } catch (err) {
      console.error('Shortlist error:', err);
      setBanner({ type: 'error', message: 'Shortlist failed' });
    }
  }

  const applicantActionsHrefBase = selectedCandidate && selectedJobId
    ? `/company/jobs/${selectedJobId}/applicants?focus=${encodeURIComponent(selectedCandidate.applicationId)}`
    : null;

  if (!token) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Please sign in</h1>
          <p className="text-amber-300 mb-6">Sign in to access AI candidate ranking tools.</p>
          <Link
            href="/signin?returnTo=/company/applicants/ranking"
            className="inline-flex items-center justify-center rounded-lg px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-colors"
          >
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-900/50 to-blue-900/50 border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center gap-2 text-sm text-slate-400 mb-2">
            <Link href="/company/dashboard" className="hover:text-white">Dashboard</Link>
            <ChevronRight className="w-4 h-4" />
            <span>AI Candidate Ranking</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">AI Candidate Ranking</h1>
              <p className="text-slate-300">Smart matching powered by skills, experience, and cultural fit</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {banner && (
          <div className={`mb-4 rounded-lg border px-4 py-3 flex items-start justify-between gap-4 ${
            banner.type === 'success'
              ? 'bg-emerald-900/20 border-emerald-800 text-emerald-200'
              : 'bg-red-900/20 border-red-800 text-red-200'
          }`}>
            <div className="text-sm">{banner.message}</div>
            <button onClick={() => setBanner(null)} className="text-slate-300 hover:text-white">✕</button>
          </div>
        )}

        {/* Job Selector & Controls */}
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm text-slate-400 mb-1">Select Job</label>
            <select
              value={selectedJobId || ''}
              onChange={(e) => setSelectedJobId(e.target.value)}
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white"
            >
              <option value="">Choose a job...</option>
              {jobs.map(job => (
                <option key={job.id} value={job.id}>{job.title}</option>
              ))}
            </select>
          </div>

          <div className="flex items-end gap-2">
            <div>
              <label className="block text-sm text-slate-400 mb-1">Filter by Tier</label>
              <select
                value={filterTier || ''}
                onChange={(e) => setFilterTier(e.target.value || null)}
                className="bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white"
              >
                <option value="">All Tiers</option>
                {Object.entries(TIERS).map(([key, { label }]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>

            <div className="relative">
              <input
                type="text"
                placeholder="Search candidates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-slate-800 border border-slate-600 rounded-lg pl-10 pr-4 py-2 text-white w-64"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                >
                  <X className="w-4 h-4 text-slate-400 hover:text-white" />
                </button>
              )}
            </div>

            <button
              onClick={handleBulkShortlist}
              disabled={!selectedJobId}
              className="bg-amber-600 hover:bg-amber-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
            >
              <Star className="w-4 h-4" />
              Auto-Shortlist Top
            </button>
          </div>
        </div>

        {/* Stats Overview */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <div className="bg-slate-800/80 rounded-xl p-4 text-center">
              <Users className="w-6 h-6 text-slate-400 mx-auto mb-2" />
              <div className="text-2xl font-bold">{stats.total}</div>
              <div className="text-xs text-slate-400">Total Applicants</div>
            </div>
            {Object.entries(stats.byTier).map(([tier, count]) => (
              <div key={tier} className="bg-slate-800/80 rounded-xl p-4 text-center">
                <div className={`w-6 h-6 rounded-full mx-auto mb-2 ${TIERS[tier]?.color || 'bg-slate-500'}`} />
                <div className="text-2xl font-bold">{count}</div>
                <div className="text-xs text-slate-400">{TIERS[tier]?.label || tier}</div>
              </div>
            ))}
          </div>
        )}

        {/* Insights */}
        {insights.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Brain className="w-5 h-5 text-purple-400" />
              AI Insights
            </h2>
            <div className="grid md:grid-cols-2 gap-3">
              {insights.map((insight, i) => (
                <InsightCard key={i} insight={insight} />
              ))}
            </div>
          </div>
        )}

        {/* Candidate List */}
        <div className="grid lg:grid-cols-2 gap-4">
          {loading ? (
            <>
              <CandidateSkeleton />
              <CandidateSkeleton />
              <CandidateSkeleton />
              <CandidateSkeleton />
            </>
          ) : filteredApplicants.length === 0 ? (
            <div className="col-span-2 text-center py-12 bg-slate-800/50 rounded-xl">
              <Users className="w-12 h-12 text-slate-500 mx-auto mb-3" />
              <h3 className="text-lg font-semibold mb-1">No Applicants Found</h3>
              <p className="text-slate-400">
                {selectedJobId
                  ? 'No candidates match the current filters.'
                  : 'Select a job to view ranked candidates.'}
              </p>
            </div>
          ) : (
            filteredApplicants.map((applicant) => (
              <CandidateCard
                key={applicant.applicationId}
                applicant={applicant}
                onSelect={setSelectedCandidate}
                isSelected={selectedCandidate?.applicationId === applicant.applicationId}
              />
            ))
          )}
        </div>

        {/* Selected Candidate Detail Panel */}
        {selectedCandidate && (
          <div className="fixed bottom-0 left-0 right-0 bg-slate-800 border-t border-slate-700 p-4">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
              <div className="flex items-center gap-4">
                <ScoreBadge score={selectedCandidate.score} tier={selectedCandidate.tier} />
                <div>
                  <h3 className="font-semibold">{selectedCandidate.candidate.name}</h3>
                  <p className="text-sm text-slate-400">{selectedCandidate.candidate.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href={applicantActionsHrefBase || `/company/jobs/${selectedJobId}/applicants`}
                  className="bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                >
                  View in Applicants
                  <ChevronRight className="w-4 h-4" />
                </Link>
                <Link
                  href={applicantActionsHrefBase ? `${applicantActionsHrefBase}&action=schedule` : `/company/jobs/${selectedJobId}/applicants`}
                  className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                >
                  <Calendar className="w-4 h-4" />
                  Schedule Interview
                </Link>
                <Link
                  href={applicantActionsHrefBase ? `${applicantActionsHrefBase}&action=messages` : `/company/jobs/${selectedJobId}/applicants`}
                  className="bg-emerald-600 hover:bg-emerald-500 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                >
                  <MessageSquare className="w-4 h-4" />
                  Message
                </Link>
                <button
                  onClick={() => setSelectedCandidate(null)}
                  className="text-slate-400 hover:text-white p-2"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
