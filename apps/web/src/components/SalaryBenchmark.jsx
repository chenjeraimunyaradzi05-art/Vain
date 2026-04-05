'use client';

/**
 * Salary Benchmark Component
 * 
 * Salary comparison and negotiation tools with Australian market data
 */

import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/apiClient';
import useAuth from '@/hooks/useAuth';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  MapPin,
  Briefcase,
  GraduationCap,
  Info,
  ChevronDown,
  ChevronUp,
  Loader2,
  Download,
  Lightbulb,
  Target,
  Scale,
  Star,
  Building2,
  Clock,
  Users,
  CheckCircle2
} from 'lucide-react';

// Australian states/territories
const LOCATIONS = [
  { value: 'nsw-sydney', label: 'Sydney, NSW' },
  { value: 'nsw-regional', label: 'Regional NSW' },
  { value: 'vic-melbourne', label: 'Melbourne, VIC' },
  { value: 'vic-regional', label: 'Regional VIC' },
  { value: 'qld-brisbane', label: 'Brisbane, QLD' },
  { value: 'qld-regional', label: 'Regional QLD' },
  { value: 'wa-perth', label: 'Perth, WA' },
  { value: 'wa-regional', label: 'Regional WA' },
  { value: 'sa-adelaide', label: 'Adelaide, SA' },
  { value: 'tas-hobart', label: 'Hobart, TAS' },
  { value: 'act-canberra', label: 'Canberra, ACT' },
  { value: 'nt-darwin', label: 'Darwin, NT' },
  { value: 'remote', label: 'Remote Australia' }
];

// Experience levels
const EXPERIENCE_LEVELS = [
  { value: 'entry', label: 'Entry Level (0-2 years)' },
  { value: 'junior', label: 'Junior (2-4 years)' },
  { value: 'mid', label: 'Mid-Level (4-7 years)' },
  { value: 'senior', label: 'Senior (7-10 years)' },
  { value: 'lead', label: 'Lead/Principal (10+ years)' },
  { value: 'executive', label: 'Executive/Director' }
];

function formatCurrency(value) {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
}

function SalaryRangeChart({ data }) {
  if (!data) return null;
  
  const { min, median, max, percentile25, percentile75 } = data;
  const range = max - min;
  
  const getPosition = (value) => ((value - min) / range) * 100;
  
  return (
    <div className="bg-slate-800/50 rounded-xl p-6">
      <h4 className="text-lg font-semibold text-white mb-6">Salary Distribution</h4>
      
      <div className="relative h-16 mb-8">
        {/* Background bar */}
        <div className="absolute inset-0 h-3 top-1/2 -translate-y-1/2 bg-slate-700 rounded-full" />
        
        {/* Interquartile range */}
        <div
          className="absolute h-3 top-1/2 -translate-y-1/2 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full"
          style={{
            left: `${getPosition(percentile25)}%`,
            width: `${getPosition(percentile75) - getPosition(percentile25)}%`
          }}
        />
        
        {/* Min marker */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-3 h-6 bg-slate-600 rounded"
          style={{ left: '0%', transform: 'translateX(-50%) translateY(-50%)' }}
        />
        
        {/* Max marker */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-3 h-6 bg-slate-600 rounded"
          style={{ left: '100%', transform: 'translateX(-50%) translateY(-50%)' }}
        />
        
        {/* Median marker */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-4 h-10 bg-yellow-500 rounded-full border-2 border-yellow-400"
          style={{ left: `${getPosition(median)}%`, transform: 'translateX(-50%) translateY(-50%)' }}
        />
      </div>
      
      {/* Labels */}
      <div className="grid grid-cols-5 text-center text-sm">
        <div>
          <div className="text-slate-500">Min</div>
          <div className="font-semibold text-slate-300">{formatCurrency(min)}</div>
        </div>
        <div>
          <div className="text-slate-500">25th %</div>
          <div className="font-semibold text-slate-300">{formatCurrency(percentile25)}</div>
        </div>
        <div>
          <div className="text-yellow-500">Median</div>
          <div className="font-bold text-yellow-400">{formatCurrency(median)}</div>
        </div>
        <div>
          <div className="text-slate-500">75th %</div>
          <div className="font-semibold text-slate-300">{formatCurrency(percentile75)}</div>
        </div>
        <div>
          <div className="text-slate-500">Max</div>
          <div className="font-semibold text-slate-300">{formatCurrency(max)}</div>
        </div>
      </div>
    </div>
  );
}

function ComparisonCard({ label, value, comparison, icon: Icon }) {
  const isPositive = comparison >= 0;
  
  return (
    <div className="bg-slate-800/50 rounded-xl p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-lg bg-purple-600/20 flex items-center justify-center">
          <Icon className="w-5 h-5 text-purple-400" />
        </div>
        {comparison !== undefined && (
          <div className={`flex items-center gap-1 text-sm ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
            {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            {Math.abs(comparison)}%
          </div>
        )}
      </div>
      <div className="text-sm text-slate-400 mb-1">{label}</div>
      <div className="text-2xl font-bold text-white">{formatCurrency(value)}</div>
    </div>
  );
}

function NegotiationTip({ tip }) {
  const [expanded, setExpanded] = useState(false);
  
  return (
    <div className="bg-slate-800/50 rounded-lg border border-slate-700 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-700/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-yellow-600/20 flex items-center justify-center">
            <Lightbulb className="w-4 h-4 text-yellow-400" />
          </div>
          <span className="font-medium text-white">{tip.title}</span>
        </div>
        {expanded ? (
          <ChevronUp className="w-5 h-5 text-slate-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-slate-400" />
        )}
      </button>
      
      {expanded && (
        <div className="px-4 pb-4 pt-0">
          <p className="text-slate-300 mb-3">{tip.content}</p>
          
          {tip.phrases && (
            <div className="bg-slate-900/50 rounded-lg p-4">
              <div className="text-xs font-medium text-slate-400 uppercase mb-2">
                What to say
              </div>
              <ul className="space-y-2">
                {tip.phrases.map((phrase, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-emerald-300">
                    <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>"{phrase}"</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function FactorsList({ factors }) {
  if (!factors || factors.length === 0) return null;
  
  return (
    <div className="bg-slate-800/50 rounded-xl p-6">
      <h4 className="text-lg font-semibold text-white mb-4">Factors Affecting Salary</h4>
      <div className="space-y-3">
        {factors.map((factor, idx) => (
          <div key={idx} className="flex items-center justify-between">
            <span className="text-slate-300">{factor.name}</span>
            <div className="flex items-center gap-2">
              <div className="w-24 h-2 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    factor.impact === 'high' ? 'bg-purple-500 w-full' :
                    factor.impact === 'medium' ? 'bg-blue-500 w-2/3' :
                    'bg-slate-500 w-1/3'
                  }`}
                />
              </div>
              <span className={`text-xs capitalize ${
                factor.impact === 'high' ? 'text-purple-400' :
                factor.impact === 'medium' ? 'text-blue-400' :
                'text-slate-500'
              }`}>
                {factor.impact}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function SalaryBenchmark() {
  const { isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(false);
  const [benchmarkData, setBenchmarkData] = useState(null);
  const [activeTab, setActiveTab] = useState('benchmark');
  
  // Form state
  const [jobTitle, setJobTitle] = useState('');
  const [location, setLocation] = useState('nsw-sydney');
  const [experience, setExperience] = useState('mid');
  const [skills, setSkills] = useState([]);
  const [skillInput, setSkillInput] = useState('');
  const [industryCode, setIndustryCode] = useState('');
  
  // Negotiation tips
  const [tips, setTips] = useState([]);
  const [loadingTips, setLoadingTips] = useState(false);

  const fetchBenchmark = async () => {
    if (!jobTitle.trim()) return;
    
    setLoading(true);
    try {
      const params = new URLSearchParams({
        jobTitle: jobTitle.trim(),
        location,
        experienceLevel: experience
      });
      
      if (skills.length > 0) {
        params.append('skills', skills.join(','));
      }
      
      if (industryCode) {
        params.append('industryCode', industryCode);
      }
      
      const { ok, data } = await api(`/salary-benchmark/search?${params}`);
      
      if (ok) {
        setBenchmarkData(data);
      }
    } catch (error) {
      console.error('Failed to fetch benchmark:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchNegotiationTips = useCallback(async () => {
    setLoadingTips(true);
    try {
      const { ok, data } = await api('/salary-benchmark/negotiation-tips');
      
      if (ok) {
        setTips(data.tips || []);
      }
    } catch (error) {
      console.error('Failed to fetch tips:', error);
      // Fallback tips
      setTips([
        {
          title: 'Research Before Negotiating',
          content: 'Know the market rate for your role in your location. Use this tool and other resources to understand what similar positions pay.',
          phrases: [
            "Based on my research, the market rate for this role is between $X and $Y.",
            "I've found that similar positions in this area typically pay around $X."
          ]
        },
        {
          title: 'Highlight Your Unique Value',
          content: 'Focus on what makes you different - your skills, experience, certifications, and cultural knowledge that benefit the organisation.',
          phrases: [
            "My experience with [specific skill] has helped me achieve [specific result].",
            "I bring unique cultural competency that would benefit your Indigenous engagement goals."
          ]
        },
        {
          title: 'Consider the Full Package',
          content: 'Salary is just one part of compensation. Consider flexibility, professional development, cultural leave, and other benefits.',
          phrases: [
            "In addition to salary, I'm also interested in discussing professional development opportunities.",
            "Flexibility for cultural responsibilities is important to me."
          ]
        },
        {
          title: 'Practice Your Pitch',
          content: 'Rehearse your negotiation points beforehand. Be confident but respectful. Know your minimum acceptable offer.',
          phrases: [
            "Thank you for the offer. I'm excited about the role, and I'd like to discuss the compensation.",
            "Based on my qualifications and the market data, I was expecting a salary closer to $X."
          ]
        }
      ]);
    } finally {
      setLoadingTips(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (activeTab === 'tips') {
      fetchNegotiationTips();
    }
  }, [activeTab, fetchNegotiationTips]);

  const handleAddSkill = (e) => {
    if (e.key === 'Enter' && skillInput.trim()) {
      e.preventDefault();
      if (!skills.includes(skillInput.trim())) {
        setSkills([...skills, skillInput.trim()]);
      }
      setSkillInput('');
    }
  };

  const handleRemoveSkill = (skill) => {
    setSkills(skills.filter(s => s !== skill));
  };

  const handleExportReport = async () => {
    if (!benchmarkData) return;
    
    try {
      const { ok, data: blob } = await api('/salary-benchmark/export', {
        method: 'POST',
        body: {
          jobTitle,
          location,
          experience,
          skills,
          benchmarkData
        },
        responseType: 'blob'
      });
      
      if (ok && blob) {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `salary-benchmark-${jobTitle.replace(/\s+/g, '-')}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Failed to export report:', error);
    }
  };

  return (
    <div className="bg-slate-900 min-h-screen py-8 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Salary Benchmark</h1>
          <p className="text-slate-400">Compare salaries and prepare for negotiations with Australian market data</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-8 border-b border-slate-800">
          <button
            onClick={() => setActiveTab('benchmark')}
            className={`px-4 py-3 font-medium transition-colors relative ${
              activeTab === 'benchmark' ? 'text-purple-400' : 'text-slate-400 hover:text-white'
            }`}
          >
            Benchmark Tool
            {activeTab === 'benchmark' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-500" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('tips')}
            className={`px-4 py-3 font-medium transition-colors relative ${
              activeTab === 'tips' ? 'text-purple-400' : 'text-slate-400 hover:text-white'
            }`}
          >
            Negotiation Tips
            {activeTab === 'tips' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-500" />
            )}
          </button>
        </div>

        {activeTab === 'benchmark' && (
          <div className="space-y-8">
            {/* Search Form */}
            <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
              <h3 className="text-lg font-semibold text-white mb-4">Find Salary Data</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Job Title
                  </label>
                  <div className="relative">
                    <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="text"
                      value={jobTitle}
                      onChange={(e) => setJobTitle(e.target.value)}
                      placeholder="e.g., Software Developer"
                      className="w-full bg-slate-700 border border-slate-600 rounded-lg pl-10 pr-4 py-3 text-white placeholder-slate-400"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Location
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <select
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="w-full bg-slate-700 border border-slate-600 rounded-lg pl-10 pr-4 py-3 text-white appearance-none"
                    >
                      {LOCATIONS.map(loc => (
                        <option key={loc.value} value={loc.value}>{loc.label}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Experience Level
                  </label>
                  <div className="relative">
                    <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <select
                      value={experience}
                      onChange={(e) => setExperience(e.target.value)}
                      className="w-full bg-slate-700 border border-slate-600 rounded-lg pl-10 pr-4 py-3 text-white appearance-none"
                    >
                      {EXPERIENCE_LEVELS.map(exp => (
                        <option key={exp.value} value={exp.value}>{exp.label}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Skills (optional)
                  </label>
                  <input
                    type="text"
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    onKeyDown={handleAddSkill}
                    placeholder="Press Enter to add skills"
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-slate-400"
                  />
                </div>
              </div>
              
              {skills.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {skills.map((skill, idx) => (
                    <span
                      key={idx}
                      className="flex items-center gap-1 bg-purple-600/30 text-purple-300 px-3 py-1 rounded-full text-sm"
                    >
                      {skill}
                      <button
                        onClick={() => handleRemoveSkill(skill)}
                        className="text-purple-400 hover:text-purple-200"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
              
              <button
                onClick={fetchBenchmark}
                disabled={loading || !jobTitle.trim()}
                className="bg-purple-600 hover:bg-purple-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg transition-colors flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <DollarSign className="w-5 h-5" />
                    Get Salary Data
                  </>
                )}
              </button>
            </div>

            {/* Results */}
            {benchmarkData && (
              <div className="space-y-6">
                {/* Quick Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <ComparisonCard
                    label="Median Salary"
                    value={benchmarkData.salary.median}
                    icon={DollarSign}
                  />
                  <ComparisonCard
                    label="Average Salary"
                    value={benchmarkData.salary.average}
                    comparison={benchmarkData.comparisons?.nationalAverage}
                    icon={Scale}
                  />
                  <ComparisonCard
                    label="Location Adjusted"
                    value={benchmarkData.salary.locationAdjusted}
                    comparison={benchmarkData.comparisons?.locationFactor}
                    icon={MapPin}
                  />
                  <ComparisonCard
                    label="Growth Rate"
                    value={benchmarkData.salary.median * 1.05}
                    comparison={5}
                    icon={TrendingUp}
                  />
                </div>

                {/* Chart */}
                <SalaryRangeChart data={benchmarkData.salary} />

                {/* Industry Context */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-slate-800/50 rounded-xl p-6">
                    <h4 className="text-lg font-semibold text-white mb-4">Market Insights</h4>
                    <div className="space-y-4">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-blue-600/20 flex items-center justify-center">
                          <Users className="w-5 h-5 text-blue-400" />
                        </div>
                        <div>
                          <div className="text-sm text-slate-400">Sample Size</div>
                          <div className="font-semibold text-white">{benchmarkData.metadata?.sampleSize || 'N/A'} responses</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-green-600/20 flex items-center justify-center">
                          <Building2 className="w-5 h-5 text-green-400" />
                        </div>
                        <div>
                          <div className="text-sm text-slate-400">Industry</div>
                          <div className="font-semibold text-white">{benchmarkData.metadata?.industry || 'All Industries'}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-yellow-600/20 flex items-center justify-center">
                          <Clock className="w-5 h-5 text-yellow-400" />
                        </div>
                        <div>
                          <div className="text-sm text-slate-400">Data Updated</div>
                          <div className="font-semibold text-white">{benchmarkData.metadata?.lastUpdated || 'Recently'}</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <FactorsList factors={benchmarkData.factors} />
                </div>

                {/* Export Button */}
                <div className="flex justify-end">
                  <button
                    onClick={handleExportReport}
                    className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
                  >
                    <Download className="w-5 h-5" />
                    Export Report
                  </button>
                </div>

                {/* Disclaimer */}
                <div className="flex items-start gap-3 bg-slate-800/30 rounded-lg p-4">
                  <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-slate-400">
                    Salary data is based on aggregated market research and may not reflect all individual circumstances. 
                    Factors such as company size, specific skills, and negotiation can significantly impact actual offers.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'tips' && (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-purple-900/30 to-indigo-900/30 rounded-xl p-6 border border-purple-800/30">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-xl bg-yellow-600/20 flex items-center justify-center">
                  <Star className="w-6 h-6 text-yellow-400" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-white">Negotiation Strategies</h3>
                  <p className="text-slate-400">Tips and phrases to help you negotiate with confidence</p>
                </div>
              </div>
            </div>

            {loadingTips ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
              </div>
            ) : (
              <div className="space-y-4">
                {tips.map((tip, idx) => (
                  <NegotiationTip key={idx} tip={tip} />
                ))}
              </div>
            )}

            {/* Cultural Considerations */}
            <div className="bg-amber-900/20 border border-amber-800/30 rounded-xl p-6">
              <h4 className="text-lg font-semibold text-amber-300 mb-3">Cultural Considerations</h4>
              <p className="text-amber-200/80 mb-4">
                When negotiating, consider discussing cultural leave provisions, flexibility for Sorry Business, 
                and professional development opportunities that align with your career goals and cultural responsibilities.
              </p>
              <ul className="space-y-2 text-sm text-amber-200/60">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0 text-amber-500" />
                  Many employers offer Cultural Leave for NAIDOC Week and community events
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0 text-amber-500" />
                  Ask about Indigenous mentoring or networking opportunities
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0 text-amber-500" />
                  Inquire about the organisation's Reconciliation Action Plan (RAP)
                </li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
