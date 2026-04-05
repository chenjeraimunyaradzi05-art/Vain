'use client';

import { API_BASE } from '@/lib/apiBase';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { toCloudinaryAutoUrl } from '@/lib/cloudinary';

/**
 * Employer Leaderboard Page
 * Showcases top employers by Indigenous hiring practices and cultural support
 * /community/leaderboard
 */
export default function LeaderboardPage() {
  const [employers, setEmployers] = useState([]);
  const [industries, setIndustries] = useState([]);
  const [selectedIndustry, setSelectedIndustry] = useState('all');
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState('all');

  useEffect(() => {
    fetchLeaderboard();
    fetchIndustries();
  }, [selectedIndustry, timeframe]);

  async function fetchLeaderboard() {
    setLoading(true);
    try {
      const apiBase = API_BASE;
      const params = new URLSearchParams();
      if (selectedIndustry !== 'all') params.set('industry', selectedIndustry);
      if (timeframe !== 'all') params.set('timeframe', timeframe);
      
      const res = await fetch(`${apiBase}/leaderboard?${params}`);
      if (res.ok) {
        const data = await res.json();
        setEmployers(data.employers || []);
      }
    } catch (err) {
      // Demo data for development
      setEmployers([
        {
          id: '1',
          companyName: 'BHP Billiton',
          industry: 'Mining & Resources',
          reputationScore: 4850,
          rank: 1,
          previousRank: 1,
          metrics: {
            totalHires: 145,
            retentionRate: 0.92,
            mentorsProvided: 28,
            activeJobs: 34,
          },
          badges: ['rap-innovate', 'indigenous-champions', 'verified'],
          rapLevel: 'Innovate',
          logoUrl: null,
        },
        {
          id: '2',
          companyName: 'Commonwealth Bank',
          industry: 'Banking & Finance',
          reputationScore: 4620,
          rank: 2,
          previousRank: 3,
          metrics: {
            totalHires: 89,
            retentionRate: 0.88,
            mentorsProvided: 15,
            activeJobs: 22,
          },
          badges: ['rap-stretch', 'verified'],
          rapLevel: 'Stretch',
          logoUrl: null,
        },
        {
          id: '3',
          companyName: 'Woolworths Group',
          industry: 'Retail',
          reputationScore: 4380,
          rank: 3,
          previousRank: 2,
          metrics: {
            totalHires: 210,
            retentionRate: 0.82,
            mentorsProvided: 12,
            activeJobs: 56,
          },
          badges: ['rap-stretch', 'high-volume', 'verified'],
          rapLevel: 'Stretch',
          logoUrl: null,
        },
        {
          id: '4',
          companyName: 'Rio Tinto',
          industry: 'Mining & Resources',
          reputationScore: 4150,
          rank: 4,
          previousRank: 5,
          metrics: {
            totalHires: 78,
            retentionRate: 0.90,
            mentorsProvided: 22,
            activeJobs: 18,
          },
          badges: ['rap-innovate', 'verified'],
          rapLevel: 'Innovate',
          logoUrl: null,
        },
        {
          id: '5',
          companyName: 'Telstra',
          industry: 'Technology',
          reputationScore: 3920,
          rank: 5,
          previousRank: 4,
          metrics: {
            totalHires: 65,
            retentionRate: 0.85,
            mentorsProvided: 18,
            activeJobs: 29,
          },
          badges: ['rap-stretch', 'tech-leader', 'verified'],
          rapLevel: 'Stretch',
          logoUrl: null,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function fetchIndustries() {
    try {
      const apiBase = API_BASE;
      const res = await fetch(`${apiBase}/leaderboard/industries`);
      if (res.ok) {
        const data = await res.json();
        setIndustries(data.industries || []);
      }
    } catch {
      setIndustries([
        'Mining & Resources',
        'Banking & Finance',
        'Retail',
        'Technology',
        'Healthcare',
        'Construction',
        'Government',
      ]);
    }
  }

  function getRankChange(current, previous) {
    if (!previous || current === previous) return null;
    return previous - current; // Positive = moved up
  }

  function getBadgeLabel(badge) {
    const labels = {
      'rap-reflect': 'RAP Reflect',
      'rap-innovate': 'RAP Innovate',
      'rap-stretch': 'RAP Stretch',
      'rap-elevate': 'RAP Elevate',
      'indigenous-champions': 'Indigenous Champions',
      'verified': 'Verified Employer',
      'high-volume': 'High Volume Hiring',
      'tech-leader': 'Tech Leader',
    };
    return labels[badge] || badge;
  }

  function getBadgeColor(badge) {
    if (badge.startsWith('rap-')) {
      const colors = {
        'rap-reflect': 'bg-amber-100 text-amber-800',
        'rap-innovate': 'bg-purple-100 text-purple-800',
        'rap-stretch': 'bg-blue-100 text-blue-800',
        'rap-elevate': 'bg-green-100 text-green-800',
      };
      return colors[badge] || 'bg-gray-100 text-gray-800';
    }
    if (badge === 'verified') return 'bg-green-100 text-green-800';
    if (badge === 'indigenous-champions') return 'bg-orange-100 text-orange-800';
    return 'bg-gray-100 text-gray-800';
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-600 to-orange-600 text-white py-12">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-4xl">🏆</span>
            <h1 className="text-3xl font-bold">Employer Leaderboard</h1>
          </div>
          <p className="text-amber-100 text-lg max-w-2xl">
            Recognising organisations leading the way in Indigenous employment, 
            cultural support, and Reconciliation Action Plans.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-wrap gap-4 items-center">
          <div>
            <label htmlFor="industry" className="text-sm text-gray-600 mr-2">Industry:</label>
            <select
              id="industry"
              value={selectedIndustry}
              onChange={(e) => setSelectedIndustry(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm"
            >
              <option value="all">All Industries</option>
              {industries.map((ind) => (
                <option key={ind} value={ind}>{ind}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="timeframe" className="text-sm text-gray-600 mr-2">Period:</label>
            <select
              id="timeframe"
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm"
            >
              <option value="all">All Time</option>
              <option value="year">Past Year</option>
              <option value="quarter">Past Quarter</option>
              <option value="month">Past Month</option>
            </select>
          </div>
        </div>
      </div>

      {/* Leaderboard */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-amber-600 border-t-transparent rounded-full mx-auto"></div>
            <p className="text-gray-500 mt-4">Loading leaderboard...</p>
          </div>
        ) : employers.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl">
            <span className="text-4xl mb-4 block">📊</span>
            <p className="text-gray-600">No employers found for the selected filters.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {employers.map((employer) => {
              const rankChange = getRankChange(employer.rank, employer.previousRank);
              return (
                <div
                  key={employer.id}
                  className="bg-white rounded-xl shadow-sm border p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start gap-6">
                    {/* Rank */}
                    <div className="flex flex-col items-center min-w-[60px]">
                      <span className={`text-3xl font-bold ${
                        employer.rank === 1 ? 'text-amber-500' :
                        employer.rank === 2 ? 'text-gray-400' :
                        employer.rank === 3 ? 'text-amber-700' :
                        'text-gray-600'
                      }`}>
                        #{employer.rank}
                      </span>
                      {rankChange !== null && (
                        <span className={`text-xs flex items-center gap-1 ${
                          rankChange > 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {rankChange > 0 ? '↑' : '↓'} {Math.abs(rankChange)}
                        </span>
                      )}
                    </div>

                    {/* Logo placeholder */}
                    <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      {employer.logoUrl ? (
                        <img src={toCloudinaryAutoUrl(employer.logoUrl)} alt="" className="w-full h-full object-contain rounded-lg" />
                      ) : (
                        <span className="text-2xl text-gray-400">🏢</span>
                      )}
                    </div>

                    {/* Company info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="text-xl font-semibold text-gray-900">
                            {employer.companyName}
                          </h3>
                          <p className="text-gray-500 text-sm">{employer.industry}</p>
                          
                          {/* Badges */}
                          <div className="flex flex-wrap gap-2 mt-2">
                            {employer.badges?.map((badge) => (
                              <span
                                key={badge}
                                className={`px-2 py-1 rounded-full text-xs font-medium ${getBadgeColor(badge)}`}
                              >
                                {getBadgeLabel(badge)}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Score */}
                        <div className="text-right">
                          <div className="text-2xl font-bold text-amber-600">
                            {employer.reputationScore.toLocaleString()}
                          </div>
                          <div className="text-xs text-gray-500">reputation points</div>
                        </div>
                      </div>

                      {/* Metrics */}
                      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                        <div className="bg-gray-50 rounded-lg p-3">
                          <div className="text-xl font-semibold text-gray-900">
                            {employer.metrics?.totalHires || 0}
                          </div>
                          <div className="text-xs text-gray-500">Indigenous Hires</div>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3">
                          <div className="text-xl font-semibold text-gray-900">
                            {((employer.metrics?.retentionRate || 0) * 100).toFixed(0)}%
                          </div>
                          <div className="text-xs text-gray-500">Retention Rate</div>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3">
                          <div className="text-xl font-semibold text-gray-900">
                            {employer.metrics?.mentorsProvided || 0}
                          </div>
                          <div className="text-xs text-gray-500">Mentors Active</div>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3">
                          <div className="text-xl font-semibold text-gray-900">
                            {employer.metrics?.activeJobs || 0}
                          </div>
                          <div className="text-xs text-gray-500">Open Positions</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* View jobs link */}
                  <div className="mt-4 pt-4 border-t flex justify-end">
                    <Link
                      href={`/jobs?company=${encodeURIComponent(employer.companyName)}`}
                      className="text-amber-600 hover:text-amber-700 text-sm font-medium flex items-center gap-1"
                    >
                      View open positions →
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Info box */}
        <div className="mt-8 bg-amber-50 border border-amber-200 rounded-xl p-6">
          <h3 className="font-semibold text-amber-900 mb-2">How Scores Are Calculated</h3>
          <div className="text-sm text-amber-800 space-y-2">
            <p>Employer reputation scores are based on:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li><strong>Indigenous Hires:</strong> +100 points per successful hire</li>
              <li><strong>Retention:</strong> +50 points for 6+ months, +150 for 12+ months</li>
              <li><strong>RAP Certification:</strong> +100-200 points based on level</li>
              <li><strong>Active Mentors:</strong> +75 points per mentor from organisation</li>
              <li><strong>Job Postings:</strong> +10 points per active listing</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
